import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages.js';
import { analyzeBundle } from './tools/bundleAnalyzer.js';
import {
  runLighthouse,
  startLocalServer,
  checkUrlAccessibility,
} from './tools/lighthouseRunner.js';
import { scanDataFetching } from './tools/dataFetchingScanner.js';
import { applyCodeTransform, TransformType } from './tools/codeTransformer.js';
import type {
  BundleAnalysis,
  LighthouseAnalysis,
  DataFetchingAnalysis,
  CodeTransformResult,
  AgentOptions,
  AgentResult,
  PerformanceScores,
} from './types/index.js';

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const AGENT_SYSTEM_PROMPT = `You are an autonomous frontend performance optimization agent for Next.js applications.

## Workflow (follow every step in order)

### Step 1 – Bundle Analysis
Call analyzeBundle to identify:
- Heavy dependencies (moment.js ~300kb, lodash ~150kb, etc.) with replacement suggestions
- Duplicate packages bundled multiple times
- Tree-shaking opportunities

### Step 2 – Performance Baseline
1. Call checkUrl to see if the app URL is accessible
2. If not accessible, call startDevServer to spin it up
3. Call runLighthouse with the target URL, device: "mobile", throttling: "simulated3G"
4. Record: performanceScore, LCP, CLS, TBT, FCP, TTI, Speed Index, TTFB

### Step 3 – Data Fetching Analysis
Call scanDataFetching to find:
- SSR pages that can be converted to ISR or SSG
- Missing caching opportunities

### Step 4 – Apply Optimizations (ordered by impact)

**High impact – apply first:**
- replaceMomentWithDayjs  → ~298 kb savings
- optimizeLodashImports   → up to 80% lodash reduction

**Medium impact:**
- convertImgToNextImage   → automatic image optimization + lazy loading
- convertSSRToISR         → reduces server load, improves TTFB
- addDynamicImports       → code splitting for heavy components

**Lower impact:**
- addImageOptimization    → priority prop on above-fold images
- convertSSRToSSG         → for fully static pages

For each applicable file, call applyCodeTransform.
When dryRun is false, apply changes directly.
When dryRun is true, pass dryRun: true in options (preview only).

### Step 5 – Verify Improvements
After all transformations, re-run runLighthouse with the same settings.
Compare before/after scores.

### Step 6 – Generate Report
Call generatePerformanceReport with all collected data, the list of applied changes, and before/after scores.

## Rules
- Apply optimizations to EVERY relevant file discovered, not just the first
- If a transformation fails, log the reason and continue with others
- Always include before/after score comparison in the report
- Track every transformation attempt (success AND failure)`;

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const AGENT_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'analyzeBundle',
    description:
      'Analyzes Next.js bundle size, identifying heavy dependencies, duplicate packages, and tree-shaking opportunities.',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectPath: {
          type: 'string',
          description: 'Absolute path to the Next.js project root',
        },
      },
      required: ['projectPath'],
    },
  },
  {
    name: 'checkUrl',
    description: 'Returns whether a URL is currently accessible (server is running).',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'URL to check, e.g. http://localhost:3000' },
      },
      required: ['url'],
    },
  },
  {
    name: 'startDevServer',
    description: 'Starts the Next.js dev server and returns the URL when ready.',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectPath: {
          type: 'string',
          description: 'Absolute path to the Next.js project root',
        },
      },
      required: ['projectPath'],
    },
  },
  {
    name: 'runLighthouse',
    description:
      'Runs a Lighthouse performance audit and returns Core Web Vitals (LCP, CLS, TBT, FCP, TTI, Speed Index, TTFB) plus optimization opportunities.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'URL to audit, e.g. http://localhost:3000' },
        options: {
          type: 'object',
          properties: {
            device: {
              type: 'string',
              enum: ['mobile', 'desktop'],
              description: 'Device emulation type',
            },
            throttling: {
              type: 'string',
              enum: ['simulated3G', 'simulated4G', 'none'],
              description: 'Network throttling preset',
            },
          },
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'scanDataFetching',
    description:
      'Scans Next.js pages for data-fetching patterns and identifies pages that could switch to faster methods (SSR → ISR or SSG).',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectPath: {
          type: 'string',
          description: 'Absolute path to the Next.js project root',
        },
        pagesPath: {
          type: 'string',
          description: 'Relative path to pages directory (default: src/pages)',
        },
      },
      required: ['projectPath'],
    },
  },
  {
    name: 'applyCodeTransform',
    description:
      'Applies a single performance-optimizing code transformation to a file using AST codemods.',
    input_schema: {
      type: 'object' as const,
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
          description: 'The transformation to apply',
        },
        filePath: {
          type: 'string',
          description: 'Absolute path to the file to transform',
        },
        options: {
          type: 'object',
          properties: {
            dryRun: {
              type: 'boolean',
              description: 'Preview changes without writing to disk',
            },
            backup: {
              type: 'boolean',
              description: 'Create a .backup file before writing',
            },
          },
        },
      },
      required: ['transformType', 'filePath'],
    },
  },
  {
    name: 'generatePerformanceReport',
    description: 'Builds the final optimisation report with all analysis data and applied changes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        bundleData: { type: 'object', description: 'Result from analyzeBundle' },
        lighthouseData: { type: 'object', description: 'Baseline Lighthouse result' },
        dataFetchingData: { type: 'object', description: 'Result from scanDataFetching' },
        appliedChanges: {
          type: 'array',
          items: { type: 'string' },
          description: 'Human-readable list of applied optimisations',
        },
        beforeScore: { type: 'number', description: 'Performance score before optimisations' },
        afterScore: { type: 'number', description: 'Performance score after optimisations' },
      },
      required: ['bundleData', 'lighthouseData'],
    },
  },
];

// ---------------------------------------------------------------------------
// Internal context tracked during a run
// ---------------------------------------------------------------------------

interface AgentContext {
  appliedTransformations: CodeTransformResult[];
  skippedTransformations: Array<{ type: string; filePath: string; reason: string }>;
  lighthouseRuns: LighthouseAnalysis[];
  bundleAnalysis?: BundleAnalysis;
  dataFetchingAnalysis?: DataFetchingAnalysis;
}

// ---------------------------------------------------------------------------
// Agent class
// ---------------------------------------------------------------------------

export class PerformanceAgent {
  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string, model = 'claude-opus-4-6') {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
    this.model = model;
  }

  async run(projectPath: string, options: AgentOptions = {}): Promise<AgentResult> {
    const {
      url,
      dryRun = false,
      device = 'mobile',
      throttling = 'simulated3G',
      maxIterations = 15,
      model = this.model,
      verbose = false,
    } = options;

    const startTime = Date.now();
    const ctx: AgentContext = {
      appliedTransformations: [],
      skippedTransformations: [],
      lighthouseRuns: [],
    };

    if (verbose) {
      console.log('\n🤖 Performance Agent starting...');
      console.log(`   Project : ${projectPath}`);
      if (url) console.log(`   URL     : ${url}`);
      console.log(`   Device  : ${device}  |  Throttling: ${throttling}`);
      console.log(`   Mode    : ${dryRun ? 'Dry Run (preview only)' : 'Apply Changes'}\n`);
    }

    const messages: MessageParam[] = [
      {
        role: 'user',
        content: buildUserMessage(projectPath, url, device, throttling, dryRun),
      },
    ];

    let iterations = 0;
    let finalReport = '';

    while (iterations < maxIterations) {
      iterations++;

      const response = await this.client.messages.create({
        model,
        max_tokens: 8096,
        system: AGENT_SYSTEM_PROMPT,
        tools: AGENT_TOOLS,
        messages,
      });

      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'end_turn') {
        for (const block of response.content) {
          if (block.type === 'text') finalReport = block.text;
        }
        break;
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults: ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          if (verbose) {
            const preview = JSON.stringify(block.input).slice(0, 120);
            console.log(`  → ${block.name}(${preview}${preview.length === 120 ? '…' : ''})`);
          }

          const result = await this.executeTool(
            block.name,
            block.input as Record<string, unknown>,
            ctx,
            dryRun,
          );

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          });
        }

        messages.push({ role: 'user', content: toolResults });
      }
    }

    const duration = Date.now() - startTime;
    const initialScores =
      ctx.lighthouseRuns[0] != null ? extractScores(ctx.lighthouseRuns[0]) : undefined;
    const finalScores =
      ctx.lighthouseRuns.length > 1
        ? extractScores(ctx.lighthouseRuns[ctx.lighthouseRuns.length - 1])
        : undefined;
    const improvement =
      initialScores != null && finalScores != null
        ? finalScores.performanceScore - initialScores.performanceScore
        : undefined;

    return {
      projectPath,
      url,
      initialScores,
      finalScores,
      improvement,
      appliedTransformations: ctx.appliedTransformations,
      skippedTransformations: ctx.skippedTransformations,
      bundleAnalysis: ctx.bundleAnalysis,
      dataFetchingAnalysis: ctx.dataFetchingAnalysis,
      report: finalReport,
      duration,
      iterations,
    };
  }

  // -------------------------------------------------------------------------
  // Tool execution dispatcher
  // -------------------------------------------------------------------------

  private async executeTool(
    name: string,
    input: Record<string, unknown>,
    ctx: AgentContext,
    dryRun: boolean,
  ): Promise<unknown> {
    try {
      switch (name) {
        case 'analyzeBundle': {
          const result = await analyzeBundle(input.projectPath as string);
          ctx.bundleAnalysis = result;
          return result;
        }

        case 'checkUrl': {
          const accessible = await checkUrlAccessibility(input.url as string);
          return { accessible, url: input.url };
        }

        case 'startDevServer': {
          const serverUrl = await startLocalServer(input.projectPath as string);
          return { url: serverUrl, success: true };
        }

        case 'runLighthouse': {
          const result = await runLighthouse(
            input.url as string,
            (input.options as Record<string, string>) ?? {},
          );
          ctx.lighthouseRuns.push(result);
          return result;
        }

        case 'scanDataFetching': {
          const result = await scanDataFetching(
            input.projectPath as string,
            input.pagesPath as string | undefined,
          );
          ctx.dataFetchingAnalysis = result;
          return result;
        }

        case 'applyCodeTransform': {
          const opts = (input.options as Record<string, unknown>) ?? {};
          // Agent-level dryRun takes precedence
          const effectiveDryRun = dryRun || (opts.dryRun as boolean | undefined) === true;
          const result = await applyCodeTransform(
            input.transformType as TransformType,
            input.filePath as string,
            { ...opts, dryRun: effectiveDryRun, backup: true },
          );
          if (result.success && !effectiveDryRun) {
            ctx.appliedTransformations.push(result);
          } else if (!result.success) {
            ctx.skippedTransformations.push({
              type: input.transformType as string,
              filePath: input.filePath as string,
              reason: result.error ?? 'Transform returned no changes',
            });
          }
          return result;
        }

        case 'generatePerformanceReport': {
          return buildMarkdownReport(input, ctx);
        }

        default:
          return { error: `Unknown tool: ${name}` };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Tool "${name}" failed: ${msg}`);
      return { error: msg, tool: name };
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildUserMessage(
  projectPath: string,
  url: string | undefined,
  device: string,
  throttling: string,
  dryRun: boolean,
): string {
  return `Analyze and optimize the Next.js project at: ${projectPath}

${url ? `URL for Lighthouse audit: ${url}` : 'No URL provided — start the dev server at http://localhost:3000 if needed for Lighthouse.'}
Device: ${device}
Throttling: ${throttling}
Dry run: ${dryRun}${dryRun ? ' (PREVIEW ONLY — do not write changes to disk)' : ' (APPLY changes to files)'}

Complete all 6 steps of the optimization workflow. Apply every relevant transformation found across all files.`;
}

function extractScores(analysis: LighthouseAnalysis): PerformanceScores {
  return {
    performanceScore: analysis.performanceScore,
    metrics: analysis.metrics,
  };
}

function buildMarkdownReport(
  input: Record<string, unknown>,
  ctx: AgentContext,
): string {
  const lines: string[] = [];
  lines.push('# 🚀 Frontend Performance Optimization Report\n');
  lines.push(`> Generated by **frontend-performance-agent** — ${new Date().toISOString()}\n`);

  // ----- Score comparison -----
  if (ctx.lighthouseRuns.length >= 2) {
    const before = ctx.lighthouseRuns[0];
    const after = ctx.lighthouseRuns[ctx.lighthouseRuns.length - 1];
    const delta = after.performanceScore - before.performanceScore;
    const sign = delta >= 0 ? '+' : '';

    lines.push('## Score Improvement\n');
    lines.push('| Metric | Before | After | Change |');
    lines.push('|--------|--------|-------|--------|');
    lines.push(`| Performance Score | ${before.performanceScore} | ${after.performanceScore} | **${sign}${delta}** |`);
    lines.push(`| LCP | ${(before.metrics.lcp / 1000).toFixed(2)}s | ${(after.metrics.lcp / 1000).toFixed(2)}s | ${((after.metrics.lcp - before.metrics.lcp) / 1000).toFixed(2)}s |`);
    lines.push(`| CLS | ${before.metrics.cls.toFixed(3)} | ${after.metrics.cls.toFixed(3)} | — |`);
    lines.push(`| TBT | ${before.metrics.tbt.toFixed(0)}ms | ${after.metrics.tbt.toFixed(0)}ms | ${(after.metrics.tbt - before.metrics.tbt).toFixed(0)}ms |`);
    lines.push(`| TTI | ${(before.metrics.tti / 1000).toFixed(2)}s | ${(after.metrics.tti / 1000).toFixed(2)}s | ${((after.metrics.tti - before.metrics.tti) / 1000).toFixed(2)}s |`);
    lines.push(`| Speed Index | ${(before.metrics.si / 1000).toFixed(2)}s | ${(after.metrics.si / 1000).toFixed(2)}s | ${((after.metrics.si - before.metrics.si) / 1000).toFixed(2)}s |`);
    lines.push(`| TTFB | ${before.metrics.ttfb.toFixed(0)}ms | ${after.metrics.ttfb.toFixed(0)}ms | ${(after.metrics.ttfb - before.metrics.ttfb).toFixed(0)}ms |`);
    lines.push('');

    if ((input.beforeScore !== undefined || input.afterScore !== undefined) === false) {
      lines.push(`**Overall: ${sign}${delta} points** ${delta >= 10 ? '🎉' : delta >= 0 ? '✅' : '⚠️'}\n`);
    }
  } else if (ctx.lighthouseRuns.length === 1) {
    const run = ctx.lighthouseRuns[0];
    lines.push('## Performance Baseline\n');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Performance Score | ${run.performanceScore}/100 |`);
    lines.push(`| LCP | ${(run.metrics.lcp / 1000).toFixed(2)}s |`);
    lines.push(`| CLS | ${run.metrics.cls.toFixed(3)} |`);
    lines.push(`| TBT | ${run.metrics.tbt.toFixed(0)}ms |`);
    lines.push(`| FCP | ${(run.metrics.fcp / 1000).toFixed(2)}s |`);
    lines.push(`| TTI | ${(run.metrics.tti / 1000).toFixed(2)}s |`);
    lines.push(`| Speed Index | ${(run.metrics.si / 1000).toFixed(2)}s |`);
    lines.push(`| TTFB | ${run.metrics.ttfb.toFixed(0)}ms |`);
    lines.push('');
  }

  // ----- Applied changes -----
  if (ctx.appliedTransformations.length > 0) {
    lines.push('## ✅ Applied Optimizations\n');
    ctx.appliedTransformations.forEach(t => {
      lines.push(`### ${t.transformType}`);
      lines.push(`File: \`${t.filePath}\``);
      t.changes.forEach(c => lines.push(`- ${c}`));
      lines.push('');
    });
  }

  // ----- Skipped -----
  if (ctx.skippedTransformations.length > 0) {
    lines.push('## ⏭️ Skipped Transformations\n');
    ctx.skippedTransformations.forEach(t => {
      lines.push(`- **${t.type}** in \`${t.filePath}\` — ${t.reason}`);
    });
    lines.push('');
  }

  // ----- Bundle analysis -----
  const bd = input.bundleData as BundleAnalysis | undefined;
  if (bd) {
    lines.push('## 📦 Bundle Analysis\n');
    lines.push(`Total bundle size: **${((bd.totalSize ?? 0) / 1024 / 1024).toFixed(2)} MB**\n`);
    if (bd.heavyDependencies?.length > 0) {
      lines.push('### Heavy Dependencies');
      bd.heavyDependencies.forEach((dep: { name: string; size: number; suggestedReplacement?: string }) => {
        lines.push(`- **${dep.name}** (${(dep.size / 1024).toFixed(0)} kb) → ${dep.suggestedReplacement ?? 'consider replacing'}`);
      });
      lines.push('');
    }
    if (bd.treeshakingOpportunities?.length > 0) {
      lines.push('### Tree-shaking Opportunities');
      bd.treeshakingOpportunities.forEach((opp: { library: string; currentImport: string; suggestedImport: string; estimatedSavings: number }) => {
        lines.push(`- **${opp.library}**: \`${opp.currentImport}\` → \`${opp.suggestedImport}\` (~${(opp.estimatedSavings / 1024).toFixed(0)} kb saved)`);
      });
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('*Generated by [frontend-performance-agent](https://www.npmjs.com/package/frontend-performance-agent)*');

  return lines.join('\n');
}
