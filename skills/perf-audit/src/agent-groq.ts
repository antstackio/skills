#!/usr/bin/env node
/**
 * agent-groq.ts
 * Full AI agent using Groq (free tier) instead of Anthropic.
 * Groq is OpenAI-compatible so tool calling works the same way.
 *
 * Free models: llama-3.3-70b-versatile, llama3-70b-8192, mixtral-8x7b-32768
 * Get a free key at https://console.groq.com
 */

import Groq from 'groq-sdk';
import { analyzeBundle } from './tools/bundleAnalyzer.js';
import { runLighthouse, startLocalServer, startProdServer, checkUrlAccessibility } from './tools/lighthouseRunner.js';
import { scanDataFetching } from './tools/dataFetchingScanner.js';
import { applyCodeTransform } from './tools/codeTransformer.js';
import type { TransformType } from './tools/codeTransformer.js';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { execSync } from 'child_process';
import os from 'os';

// Helper: list real source files in a project
function listProjectFiles(projectPath: string): string[] {
  try {
    const result = execSync(
      `find "${projectPath}" \\( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \\) \
       -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*" \
       -not -path "*/dist/*" -not -path "*/generated/*" 2>/dev/null`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentOptions {
  url?: string;
  dryRun?: boolean;
  device?: 'mobile' | 'desktop';
  throttling?: 'simulated3G' | 'simulated4G' | 'none';
  maxIterations?: number;
  model?: string;
  verbose?: boolean;
  prod?: boolean;  // build for production before auditing
}

// ---------------------------------------------------------------------------
// System prompt (same as Anthropic agent)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an autonomous frontend performance optimization agent for Next.js applications.

## Workflow (follow every step in order)

### Step 1 – Bundle Analysis
Call analyzeBundle to identify heavy dependencies and tree-shaking opportunities.

### Step 2 – Performance Baseline
1. Call checkUrl to see if the app URL is accessible
2. If not accessible:
   - If prod mode is requested → call startProdServer (runs next build + next start)
   - Otherwise → call startDevServer (runs next dev, faster to start)
3. Call runLighthouse with the target URL, device: "mobile", throttling: "simulated3G"
4. Record all Core Web Vitals: performanceScore, LCP, CLS, TBT, FCP, TTI, Speed Index, TTFB

NOTE: Production mode gives accurate scores because next build tree-shakes and minifies.
Dev mode is faster to start but scores will be lower (unoptimised bundles).

### Step 3 – Discover actual source files (MANDATORY)
Call listFiles(projectPath) to get the real list of source files.
- NEVER guess or construct file paths yourself
- Only use absolute paths returned by the listFiles tool
- You may call listFiles with a filter (e.g. "page") to narrow results

### Step 4 – Data Fetching Analysis
Call scanDataFetching to find SSR pages that can become ISR or SSG.

### Step 5 – Apply Optimizations (ordered by impact)
High impact first:
- replaceMomentWithDayjs  (~298kb savings)
- optimizeLodashImports   (up to 80% lodash reduction)

Medium impact:
- convertImgToNextImage   (automatic image optimization + lazy loading)
- convertSSRToISR         (reduces server load, improves TTFB)
- addDynamicImports       (code splitting for heavy components)

Lower impact:
- addImageOptimization    (priority prop on above-fold images)
- convertSSRToSSG         (for fully static pages)

IMPORTANT: Only call applyCodeTransform with file paths that actually exist in the project.
Use absolute paths from the bundle/data-fetching scan results. Never invent paths.

### Step 5 – Verify Improvements
Re-run runLighthouse after all transforms. Compare before/after scores.

### Step 6 – Generate Report
Summarise all findings, changes applied, and before/after score table in markdown.

## Rules
- Apply to EVERY relevant file, not just the first one found
- If a transformation fails, log the reason and continue with others
- Always include before/after score comparison in the final report`;

// ---------------------------------------------------------------------------
// Tool definitions (OpenAI/Groq format)
// ---------------------------------------------------------------------------

const TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'listFiles',
      description: 'Lists all actual source files (.tsx/.jsx/.ts/.js) in the project. ALWAYS call this before applyCodeTransform to get real file paths.',
      parameters: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'Absolute path to the Next.js project root' },
          filter: { type: 'string', description: 'Optional keyword to filter results e.g. "page" or "component"' },
        },
        required: ['projectPath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyzeBundle',
      description: 'Analyzes Next.js bundle size, identifying heavy dependencies and tree-shaking opportunities.',
      parameters: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'Absolute path to the Next.js project root' },
        },
        required: ['projectPath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'checkUrl',
      description: 'Returns whether a URL is currently accessible (server is running).',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to check, e.g. http://localhost:3000' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'startDevServer',
      description: 'Starts the Next.js dev server (next dev) and returns the URL when ready. Fast startup, but scores reflect unoptimised dev bundles.',
      parameters: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'Absolute path to the Next.js project root' },
        },
        required: ['projectPath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'startProdServer',
      description: 'Runs "next build" (full production build with tree-shaking + minification) then starts "next start". Use this when you want accurate Lighthouse scores that reflect real-world bundle sizes. Takes longer than startDevServer.',
      parameters: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'Absolute path to the Next.js project root' },
        },
        required: ['projectPath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'runLighthouse',
      description: 'Runs Lighthouse and returns Core Web Vitals (LCP, CLS, TBT, FCP, TTI, SI, TTFB).',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to audit, e.g. http://localhost:3000' },
          device: { type: 'string', enum: ['mobile', 'desktop'], description: 'Device emulation' },
          throttling: { type: 'string', enum: ['simulated3G', 'simulated4G', 'none'], description: 'Network throttling' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scanDataFetching',
      description: 'Scans Next.js pages for data-fetching patterns and flags SSR pages that could switch to ISR/SSG.',
      parameters: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'Absolute path to the Next.js project root' },
        },
        required: ['projectPath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'applyCodeTransform',
      description: 'Applies a performance-optimizing code transformation to a file using AST codemods.',
      parameters: {
        type: 'object',
        properties: {
          transformType: {
            type: 'string',
            enum: [
              'replaceMomentWithDayjs',
              'optimizeLodashImports',
              'convertImgToNextImage',
              'addDynamicImports',
              'convertSSRToISR',
              'convertSSRToSSG',
              'addImageOptimization',
            ],
          },
          filePath: { type: 'string', description: 'Absolute path to the file to transform' },
          dryRun: { type: 'boolean', description: 'Preview changes without writing to disk' },
        },
        required: ['transformType', 'filePath'],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

interface RunContext {
  lighthouseRuns: any[];
  appliedTransforms: any[];
  skippedTransforms: any[];
  bundleAnalysis?: any;
  dataFetchingAnalysis?: any;
}

async function executeTool(
  name: string,
  args: Record<string, any>,
  ctx: RunContext,
  dryRun: boolean,
  verbose: boolean,
): Promise<any> {
  try {
    switch (name) {
      case 'listFiles': {
        let files = listProjectFiles(args.projectPath);
        if (args.filter) {
          files = files.filter((f: string) => f.includes(args.filter));
        }
        // Cap to 50 to avoid blowing context window
        const truncated = files.length > 50;
        return { files: files.slice(0, 50), count: files.length, truncated };
      }
      case 'analyzeBundle': {
        const result = await analyzeBundle(args.projectPath);
        ctx.bundleAnalysis = result;
        return result;
      }
      case 'checkUrl': {
        const accessible = await checkUrlAccessibility(args.url);
        return { accessible, url: args.url };
      }
      case 'startDevServer': {
        const url = await startLocalServer(args.projectPath);
        return { url, success: true };
      }
      case 'startProdServer': {
        const url = await startProdServer(args.projectPath);
        return { url, success: true };
      }
      case 'runLighthouse': {
        const result = await runLighthouse(args.url, {
          device: args.device ?? 'mobile',
          throttling: args.throttling ?? 'simulated3G',
        });
        ctx.lighthouseRuns.push(result);
        return result;
      }
      case 'scanDataFetching': {
        const result = await scanDataFetching(args.projectPath);
        ctx.dataFetchingAnalysis = result;
        return result;
      }
      case 'applyCodeTransform': {
        const effectiveDryRun = dryRun || args.dryRun === true;
        const result = await applyCodeTransform(
          args.transformType as TransformType,
          args.filePath,
          { dryRun: effectiveDryRun, backup: true },
        );
        if (result.success && !effectiveDryRun) {
          ctx.appliedTransforms.push(result);
        } else if (!result.success) {
          ctx.skippedTransforms.push({ type: args.transformType, filePath: args.filePath, reason: result.error });
        }
        return result;
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (verbose) console.error(`  ❌ Tool "${name}" error: ${msg}`);
    return { error: msg, tool: name };
  }
}

// ---------------------------------------------------------------------------
// Groq AI Agent
// ---------------------------------------------------------------------------

export async function runGroqAgent(projectPath: string, options: AgentOptions = {}): Promise<void> {
  const {
    url,
    dryRun = false,
    device = 'mobile',
    throttling = 'simulated3G',
    maxIterations = 40,
    verbose = true,
    prod = false,
  } = options;
  let model = options.model ?? 'llama-3.3-70b-versatile';

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const ctx: RunContext = { lighthouseRuns: [], appliedTransforms: [], skippedTransforms: [] };

  console.log('\n🤖 Groq AI Agent starting...');
  console.log(`   Project : ${projectPath}`);
  console.log(`   Model   : ${model} (free tier)`);
  console.log(`   Device  : ${device}  |  Throttling: ${throttling}`);
  console.log(`   Server  : ${prod ? 'Production (next build + next start)' : 'Dev (next dev)'}`);
  console.log(`   Mode    : ${dryRun ? 'Dry Run (preview only)' : 'Apply Changes'}\n`);

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: buildUserMessage(projectPath, url, device, throttling, dryRun, prod),
    },
  ];

  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    if (verbose) console.log(`\n  [Iteration ${iterations}] Calling ${model}...`);

    let response: Awaited<ReturnType<typeof groq.chat.completions.create>>;
    try {
      response = await groq.chat.completions.create({
        model,
        max_tokens: 4096,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        tools: TOOLS,
        tool_choice: 'auto',
      });
    } catch (err: any) {
      // Detect tool_use_failed regardless of how the SDK surfaces the error:
      // - err.error.code (Groq SDK parsed inner object)
      // - err.message string contains 'tool_use_failed' (fallback)
      const isToolUseFailed = (e: any): boolean =>
        (e?.error?.code === 'tool_use_failed') ||
        (typeof e?.message === 'string' && e.message.includes('tool_use_failed'));

      const handleToolUseFailed = (e: any): boolean => {
        if (!isToolUseFailed(e)) return false;
        // Extract the report text — try the structured field first, then parse the message string
        let text: string = e?.error?.failed_generation ?? '';
        if (!text && typeof e?.message === 'string') {
          const m = e.message.match(/"failed_generation"\s*:\s*"([\s\S]+?)(?:"\s*[},])/);
          if (m) text = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
        if (text) {
          console.log('\n══════════════════════════════════════════════════════════');
          console.log('  Final Report (from model)');
          console.log('══════════════════════════════════════════════════════════\n');
          console.log(text);
        }
        return true;
      };

      if (handleToolUseFailed(err)) break;

      // Auto-fallback chain when rate limits hit
      const fallbacks = ['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.1-8b-instant'];
      const nextModel = fallbacks.find(m => m !== model);
      if ((err?.status === 429 || err?.status === 413) && nextModel) {
        console.log(`  ⚠️  Rate limit on ${model}, falling back to ${nextModel}...`);
        model = nextModel;
        try {
          response = await groq.chat.completions.create({
            model,
            max_tokens: 4096,
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
            tools: TOOLS,
            tool_choice: 'auto',
          });
        } catch (fallbackErr: any) {
          if (handleToolUseFailed(fallbackErr)) break;
          throw fallbackErr;
        }
      } else {
        throw err;
      }
    }

    const choice = response.choices[0];
    if (!choice) break;

    const assistantMsg = choice.message;
    messages.push(assistantMsg);

    // Done
    if (choice.finish_reason === 'stop') {
      if (assistantMsg.content) {
        console.log('\n══════════════════════════════════════════════════════════');
        console.log('  Final Report');
        console.log('══════════════════════════════════════════════════════════\n');
        console.log(assistantMsg.content);
      }
      break;
    }

    // Tool calls
    if (choice.finish_reason === 'tool_calls' && assistantMsg.tool_calls) {
      const toolResults: Groq.Chat.Completions.ChatCompletionToolMessageParam[] = [];

      for (const toolCall of assistantMsg.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, any> = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch {}

        if (verbose) {
          const preview = JSON.stringify(toolArgs).slice(0, 100);
          console.log(`  → ${toolName}(${preview}${preview.length === 100 ? '…' : ''})`);
        }

        const result = await executeTool(toolName, toolArgs, ctx, dryRun, verbose);

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result, null, 2),
        });
      }

      messages.push(...toolResults);
    }
  }

  // ─── Pretty Summary ───────────────────────────────────────────────────────
  printSummary(ctx, prod, dryRun, device, throttling, iterations);
}

function printSummary(
  ctx: RunContext,
  prod: boolean,
  dryRun: boolean,
  device: string,
  throttling: string,
  iterations: number,
) {
  const W = 62;
  const line  = '═'.repeat(W);
  const thin  = '─'.repeat(W);
  const pad   = (s: string, n: number) => s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
  const rpad  = (s: string, n: number) => s.length >= n ? s.slice(0, n) : ' '.repeat(n - s.length) + s;

  console.log(`\n╔${line}╗`);
  console.log(`║${pad('  📊  Performance Report', W)}║`);
  console.log(`╠${line}╣`);
  console.log(`║  Mode    : ${pad(prod ? 'Production  (next build + next start)' : 'Dev  (next dev — scores are lower)', W - 12)}║`);
  console.log(`║  Device  : ${pad(`${device}  |  Throttling: ${throttling}`, W - 12)}║`);
  console.log(`║  Changes : ${pad(dryRun ? 'Dry run (no files written)' : 'Applied to disk', W - 12)}║`);
  console.log(`╠${line}╣`);

  const hasBefore = ctx.lighthouseRuns.length >= 1;
  const hasAfter  = ctx.lighthouseRuns.length >= 2;
  const before    = hasBefore ? ctx.lighthouseRuns[0] : null;
  const after     = hasAfter  ? ctx.lighthouseRuns[ctx.lighthouseRuns.length - 1] : null;

  if (before) {
    // Score headline
    if (after) {
      const delta = after.performanceScore - before.performanceScore;
      const sign  = delta >= 0 ? '+' : '';
      const emoji = delta >= 15 ? '🎉' : delta >= 5 ? '✅' : delta >= 0 ? '➡️ ' : '⚠️ ';
      const scoreStr = `${before.performanceScore}  →  ${after.performanceScore}  (${sign}${delta})  ${emoji}`;
      console.log(`║  Score   : ${pad(scoreStr, W - 12)}║`);
    } else {
      console.log(`║  Score   : ${pad(`${before.performanceScore}/100  (baseline only)`, W - 12)}║`);
    }

    // Metrics table
    console.log(`╠${line}╣`);
    const COL = { label: 16, val: 12, delta: 10 };
    const hdr = `  ${pad('Metric', COL.label)}${rpad('Before', COL.val)}${rpad('After', COL.val)}${rpad('Δ', COL.delta)}`;
    console.log(`║${pad(hdr, W)}║`);
    console.log(`║  ${thin.slice(0, W - 2)}║`);

    type MetricRow = { label: string; before: number; after: number | undefined; fmt: (v: number) => string; lowerIsBetter: boolean };
    const bm = before.metrics;
    const am = after?.metrics;

    const ms  = (v: number) => `${Math.round(v)}ms`;
    const sec = (v: number) => `${(v / 1000).toFixed(2)}s`;
    const cls = (v: number) => v.toFixed(3);

    const rows: MetricRow[] = [
      { label: 'LCP',  before: bm.lcp,  after: am?.lcp,  fmt: sec,  lowerIsBetter: true  },
      { label: 'CLS',  before: bm.cls,  after: am?.cls,  fmt: cls,  lowerIsBetter: true  },
      { label: 'TBT',  before: bm.tbt,  after: am?.tbt,  fmt: ms,   lowerIsBetter: true  },
      { label: 'FCP',  before: bm.fcp,  after: am?.fcp,  fmt: sec,  lowerIsBetter: true  },
      { label: 'TTI',  before: bm.tti,  after: am?.tti,  fmt: sec,  lowerIsBetter: true  },
      { label: 'SI',   before: bm.si,   after: am?.si,   fmt: sec,  lowerIsBetter: true  },
      { label: 'TTFB', before: bm.ttfb, after: am?.ttfb, fmt: ms,   lowerIsBetter: true  },
    ];

    for (const r of rows) {
      const bStr = r.fmt(r.before);
      const aStr = r.after !== undefined ? r.fmt(r.after) : '—';
      let dStr = '—';
      let marker = '';
      if (r.after !== undefined) {
        const diff = r.after - r.before;
        const sign = diff >= 0 ? '+' : '';
        dStr = `${sign}${r.fmt(Math.abs(diff))}`;
        if (diff === 0)          { marker = '  '; }
        else if (r.lowerIsBetter && diff < 0) { marker = ' ✅'; }
        else if (r.lowerIsBetter && diff > 0) { marker = ' ⚠️'; }
        else if (!r.lowerIsBetter && diff > 0) { marker = ' ✅'; }
        else                     { marker = ' ⚠️'; }
      }
      const row = `  ${pad(r.label, COL.label)}${rpad(bStr, COL.val)}${rpad(aStr, COL.val)}${rpad(dStr + marker, COL.delta + 2)}`;
      console.log(`║${pad(row, W)}║`);
    }
  } else {
    console.log(`║  ${pad('No Lighthouse data collected.', W - 2)}║`);
  }

  // Transforms
  console.log(`╠${line}╣`);
  console.log(`║  ${pad(`Transforms applied: ${ctx.appliedTransforms.length}   skipped: ${ctx.skippedTransforms.length}   iterations: ${iterations}`, W - 2)}║`);
  if (ctx.appliedTransforms.length > 0) {
    console.log(`║  ${thin.slice(0, W - 2)}║`);
    for (const t of ctx.appliedTransforms) {
      const label = `✅  ${t.transformType}  →  ${path.basename(t.filePath)}`;
      console.log(`║    ${pad(label, W - 4)}║`);
    }
  }
  if (ctx.skippedTransforms.length > 0) {
    for (const t of ctx.skippedTransforms as any[]) {
      const label = `⏭️   ${t.type}  →  ${path.basename(t.filePath)}`;
      console.log(`║    ${pad(label, W - 4)}║`);
    }
  }

  console.log(`╚${line}╝\n`);
}

// ---------------------------------------------------------------------------
// Build the initial user message with real file paths pre-injected
// ---------------------------------------------------------------------------

function buildUserMessage(
  projectPath: string,
  url: string | undefined,
  device: string,
  throttling: string,
  dryRun: boolean,
  prod: boolean = false,
): string {
  // Pre-discover real source files so the model never has to guess
  const allFiles = listProjectFiles(projectPath);
  // Prioritise page/component files most relevant to transforms
  const pageFiles = allFiles.filter(f =>
    f.includes('/page.') || f.includes('/pages/') || f.includes('/components/')
  ).slice(0, 40);
  const otherFiles = allFiles
    .filter(f => !pageFiles.includes(f))
    .slice(0, 10);
  const relevantFiles = [...pageFiles, ...otherFiles];

  const serverInstruction = prod
    ? 'Server mode: PRODUCTION — call startProdServer (runs next build + next start). This gives accurate scores.'
    : 'Server mode: DEV — call startDevServer (runs next dev). Faster startup but scores reflect unoptimised dev bundles.';

  return `Analyze and optimize the Next.js project at: ${projectPath}

${url ? `URL for Lighthouse: ${url}` : `No URL provided — spin up a local server at http://localhost:3000.\n${serverInstruction}`}
Device: ${device} | Throttling: ${throttling}
Dry run: ${dryRun}${dryRun ? ' (PREVIEW ONLY — do not write files)' : ' (APPLY changes to files)'}

=== REAL SOURCE FILES (use ONLY these paths with applyCodeTransform) ===
${relevantFiles.join('\n')}
(Total files in project: ${allFiles.length})
=== END FILE LIST ===

CRITICAL RULES:
1. Only call applyCodeTransform with paths from the list above — never invent paths
2. If a transform is not applicable to a file, skip it and move to the next file
3. Check each file in the list for: <img> tags, moment.js imports, lodash default imports, SSR patterns

Steps: analyzeBundle → checkUrl/startDevServer → runLighthouse → scanDataFetching → applyCodeTransform on real files above → runLighthouse again → write final report with before/after score table.`;
}

// ---------------------------------------------------------------------------
// Interactive prompts (same UX as pipeline-runner)
// ---------------------------------------------------------------------------

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function promptForProject(): Promise<string> {
  const workDir = path.join(os.homedir(), 'Documents', 'work');
  let folders: string[] = [];
  try {
    folders = fs.readdirSync(workDir)
      .filter(f => fs.statSync(path.join(workDir, f)).isDirectory() && !f.startsWith('.'));
  } catch {}

  console.log('\n📁 Projects found in ~/Documents/work/:\n');
  folders.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log();

  const answer = await ask('Which folder to audit? (number or full path): ');
  const num = parseInt(answer);
  let folder = '';

  if (!isNaN(num) && num >= 1 && num <= folders.length) {
    folder = path.join(workDir, folders[num - 1]);
  } else if (answer.startsWith('/') || answer.startsWith('~')) {
    folder = answer.replace(/^~/, os.homedir());
  } else {
    folder = path.join(workDir, answer);
  }

  console.log(`\n🔍 Looking for Next.js app in ${folder}...`);
  try {
    const found = execSync(
      `find "${folder}" -name "next.config.*" -not -path "*/node_modules/*" -maxdepth 6 2>/dev/null`,
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);

    if (found.length === 0) {
      console.log('   No next.config.* found. Using folder as-is.');
      return folder;
    } else if (found.length === 1) {
      const root = path.dirname(found[0]);
      console.log(`   ✅ Found Next.js app at: ${root}`);
      return root;
    } else {
      console.log('\n   Multiple Next.js apps found:');
      found.forEach((f, i) => console.log(`     ${i + 1}. ${path.dirname(f)}`));
      const pick = await ask('   Which one? (number): ');
      const idx = parseInt(pick) - 1;
      return path.dirname(found[Math.max(0, idx)] ?? found[0]);
    }
  } catch {
    return folder;
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);

  // Check for API key
  if (!process.env.GROQ_API_KEY) {
    console.error('\n❌ GROQ_API_KEY is not set.');
    console.error('   Get a free key at https://console.groq.com');
    console.error('   Then: export GROQ_API_KEY=gsk_...\n');
    process.exit(1);
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   frontend-performance-agent  —  Groq AI Edition         ║');
  console.log('║   Powered by Llama 3.3 70B  (free tier)                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // Parse flags
  let project = '';
  let url: string | undefined;
  let dryRun = false;
  let prod = false;
  let device: 'mobile' | 'desktop' = 'mobile';
  let model = 'llama-3.3-70b-versatile';

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--project': case '-p': project = argv[++i] ?? ''; break;
      case '--url':     case '-u': url     = argv[++i];       break;
      case '--dry-run':            dryRun  = true;            break;
      case '--prod':               prod    = true;            break;
      case '--device':             device  = (argv[++i] ?? 'mobile') as 'mobile' | 'desktop'; break;
      case '--model':              model   = argv[++i] ?? model; break;
      case '--help': case '-h':
        console.log(`
Usage: perf-agent-groq [options]

Options:
  --project, -p  <path>      Next.js project root (prompted if omitted)
  --url,     -u  <url>       Lighthouse target URL
  --dry-run                  Preview only, don't write files
  --prod                     Run "next build" + "next start" before auditing (accurate scores)
  --device       mobile|desktop                       (default: mobile)
  --throttling   simulated3G|simulated4G|none         (default: simulated3G)
  --model        <model>     Groq model               (default: llama-3.3-70b-versatile)
  --help

Server modes:
  (default)  Uses "next dev"   — fast startup, lower Lighthouse scores (dev bundles)
  --prod     Uses "next build" + "next start" — accurate production scores, slower startup

Free models on Groq (https://console.groq.com):
  llama-3.3-70b-versatile                  ← recommended
  meta-llama/llama-4-scout-17b-16e-instruct
  llama-3.1-8b-instant                     ← fastest fallback

Environment:
  GROQ_API_KEY   Free key from https://console.groq.com
`);
        process.exit(0);
    }
  }

  // Interactive prompt if no project given
  if (!project) {
    project = await promptForProject();
    const dev = await ask('\n📱 Device? [mobile/desktop] (default: mobile): ');
    device = dev.toLowerCase() === 'desktop' ? 'desktop' : 'mobile';
    const serverMode = await ask('\n🏗️  Server mode? [dev/prod] (prod = accurate scores, slower): ');
    prod = serverMode.toLowerCase() === 'prod';
    const mode = await ask('\n🔧 Changes? [preview/apply] (default: preview): ');
    dryRun = mode.toLowerCase() !== 'apply';
  }

  await runGroqAgent(project, { url, dryRun, device, model, verbose: true, prod });
}

main().catch(err => {
  console.error('\n❌ Agent failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
