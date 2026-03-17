#!/usr/bin/env node
/**
 * pipeline-runner.ts
 * Runs the full performance optimization pipeline WITHOUT any LLM / API key.
 * All decisions are made deterministically based on analysis results.
 */

import { analyzeBundle } from './tools/bundleAnalyzer.js';
import { runLighthouse, startLocalServer, startProdServer, checkUrlAccessibility } from './tools/lighthouseRunner.js';
import { scanDataFetching } from './tools/dataFetchingScanner.js';
import { applyCodeTransform, TransformType } from './tools/codeTransformer.js';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { execSync } from 'child_process';
import os from 'os';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface Args {
  project: string;
  url?: string;
  dryRun: boolean;
  prod: boolean;
  device: 'mobile' | 'desktop';
  throttling: 'simulated3G' | 'simulated4G' | 'none';
}

async function parseArgs(): Promise<Args> {
  const argv = process.argv.slice(2);
  const result: Args = {
    project: '',
    dryRun: false,
    prod: false,
    device: 'mobile',
    throttling: 'simulated3G',
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--project': case '-p': result.project = argv[++i]; break;
      case '--url':     case '-u': result.url     = argv[++i]; break;
      case '--dry-run':            result.dryRun  = true;      break;
      case '--prod':               result.prod    = true;      break;
      case '--device':             result.device  = argv[++i] as 'mobile' | 'desktop'; break;
      case '--throttling':         result.throttling = argv[++i] as Args['throttling']; break;
      case '--help': case '-h':    printHelp(); process.exit(0);
    }
  }

  // if no project given, run interactive prompt
  if (!result.project) {
    result.project = await promptForProject();
    result.device = await promptForDevice();
    result.prod = await promptForServerMode();
    result.dryRun = await promptForMode();
  }
  return result;
}

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

  const answer = await ask('Which folder to audit? (enter number or full path): ');
  const num = parseInt(answer);
  let folder = '';

  if (!isNaN(num) && num >= 1 && num <= folders.length) {
    folder = path.join(workDir, folders[num - 1]);
  } else if (answer.startsWith('/') || answer.startsWith('~')) {
    folder = answer.replace(/^~/, os.homedir());
  } else {
    folder = path.join(workDir, answer);
  }

  // Auto-detect Next.js root inside folder
  console.log(`\n🔍 Looking for Next.js app inside ${folder}...`);
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
      const pick = await ask('   Which one? (enter number): ');
      const idx = parseInt(pick) - 1;
      return path.dirname(found[idx] ?? found[0]);
    }
  } catch {
    return folder;
  }
}

async function promptForDevice(): Promise<'mobile' | 'desktop'> {
  const ans = await ask('\n📱 Device to test? [mobile/desktop] (default: mobile): ');
  return ans.toLowerCase() === 'desktop' ? 'desktop' : 'mobile';
}

async function promptForServerMode(): Promise<boolean> {
  const ans = await ask('\n🏗️  Server mode? [dev/prod] (prod = accurate scores, takes longer for build): ');
  return ans.toLowerCase() === 'prod';
}

async function promptForMode(): Promise<boolean> {
  const ans = await ask('\n🔧 Changes? [preview/apply] (default: preview, no files changed): ');
  return ans.toLowerCase() !== 'apply';
}

function printHelp() {
  console.log(`
pipeline-runner — Next.js performance optimizer (no API key required)

Usage:
  npx tsx src/pipeline-runner.ts --project <path> [options]

Options:
  --project, -p  <path>            Next.js project root  (required)
  --url,     -u  <url>             Lighthouse target URL  (default: starts local server)
  --dry-run                        Preview changes, don't write files
  --prod                           Run "next build" + "next start" for accurate scores
  --device       mobile|desktop    (default: mobile)
  --throttling   simulated3G|simulated4G|none  (default: simulated3G)
  --help, -h

Server modes:
  (default)  "next dev"   — fast startup, lower scores (dev bundles are unoptimised)
  --prod     "next build" + "next start" — accurate production Lighthouse scores

Examples:
  npx tsx src/pipeline-runner.ts --project ./my-app --dry-run
  npx tsx src/pipeline-runner.ts --project ./my-app --prod
  npx tsx src/pipeline-runner.ts --project ./my-app --url http://localhost:3000
`);
}

// ---------------------------------------------------------------------------
// Deterministic optimization rules (replaces LLM decision-making)
// ---------------------------------------------------------------------------

interface TransformJob { file: string; type: TransformType; reason: string }

function decideTransforms(
  bundleData: Awaited<ReturnType<typeof analyzeBundle>>,
  dataFetchingData: Awaited<ReturnType<typeof scanDataFetching>>,
  projectPath: string,
): TransformJob[] {
  const jobs: TransformJob[] = [];

  // --- Bundle-driven transforms ---
  for (const dep of bundleData.heavyDependencies ?? []) {
    if (dep.name === 'moment') {
      // find all files importing moment
      for (const f of dep.files ?? []) {
        jobs.push({ file: f, type: 'replaceMomentWithDayjs', reason: `moment.js (${(dep.size / 1024).toFixed(0)}kb) → dayjs (2kb)` });
      }
    }
    if (dep.name === 'lodash') {
      for (const f of dep.files ?? []) {
        jobs.push({ file: f, type: 'optimizeLodashImports', reason: `lodash default import → per-function imports` });
      }
    }
  }

  // --- Data-fetching transforms ---
  for (const page of dataFetchingData?.pages ?? []) {
    if (!page.autoFixable) continue;
    const absPath = path.isAbsolute(page.filePath)
      ? page.filePath
      : path.join(projectPath, page.filePath);

    if (page.recommendedMethod === 'ISR' && page.currentMethod === 'SSR') {
      jobs.push({ file: absPath, type: 'convertSSRToISR', reason: page.reasoning });
    }
    if (page.recommendedMethod === 'SSG' && page.currentMethod === 'SSR') {
      jobs.push({ file: absPath, type: 'convertSSRToSSG', reason: page.reasoning });
    }
  }

  return jobs;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function run() {
  const args = await parseArgs();
  const start = Date.now();

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   frontend-performance-agent  —  Pipeline Runner         ║');
  console.log('║   (no API key required)                                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`  Project   : ${args.project}`);
  if (args.url) console.log(`  URL       : ${args.url}`);
  console.log(`  Device    : ${args.device}  |  Throttling: ${args.throttling}`);
  console.log(`  Server    : ${args.prod ? 'Production (next build + next start)' : 'Dev (next dev)'}`);
  console.log(`  Mode      : ${args.dryRun ? 'Dry Run (preview only)' : 'Apply Changes'}\n`);

  // ── Step 1: Bundle analysis ──────────────────────────────────────────────
  console.log('📦 Step 1/5 — Analyzing bundle…');
  let bundleData;
  try {
    bundleData = await analyzeBundle(args.project);
    console.log(`   Total size : ${((bundleData.totalSize ?? 0) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heavy deps : ${bundleData.heavyDependencies?.length ?? 0}`);
  } catch (e) {
    console.warn(`   ⚠️  Bundle analysis failed: ${e}. Continuing…`);
    bundleData = { totalSize: 0, heavyDependencies: [], treeshakingOpportunities: [], chunks: [] };
  }

  // ── Step 2: Lighthouse baseline ──────────────────────────────────────────
  console.log('\n⚡ Step 2/5 — Running Lighthouse baseline…');
  let targetUrl = args.url ?? '';
  if (!targetUrl) {
    const running = await checkUrlAccessibility('http://localhost:3000');
    if (running) {
      targetUrl = 'http://localhost:3000';
      console.log('   Server already running at http://localhost:3000');
    } else if (args.prod) {
      console.log('   Building for production and starting next start…');
      try {
        targetUrl = await startProdServer(args.project);
      } catch (e) {
        console.warn(`   ⚠️  Production build/start failed: ${e}`);
        console.warn('   Skipping Lighthouse. Pass --url to provide a running URL.\n');
      }
    } else {
      console.log('   Starting dev server (next dev)…');
      try {
        targetUrl = await startLocalServer(args.project);
      } catch (e) {
        console.warn(`   ⚠️  Could not start dev server: ${e}`);
        console.warn('   Skipping Lighthouse. Pass --url or use --prod flag.\n');
      }
    }
  }

  let baselineScore: number | undefined;
  let baselineData: Awaited<ReturnType<typeof runLighthouse>> | undefined;

  if (targetUrl) {
    try {
      baselineData = await runLighthouse(targetUrl, { device: args.device, throttling: args.throttling });
      baselineScore = baselineData.performanceScore;
      console.log(`   Score      : ${baselineScore}/100`);
      console.log(`   LCP        : ${(baselineData.metrics.lcp / 1000).toFixed(2)}s`);
      console.log(`   CLS        : ${baselineData.metrics.cls.toFixed(3)}`);
      console.log(`   TBT        : ${baselineData.metrics.tbt.toFixed(0)}ms`);
      console.log(`   TTI        : ${(baselineData.metrics.tti / 1000).toFixed(2)}s`);
      console.log(`   TTFB       : ${baselineData.metrics.ttfb.toFixed(0)}ms`);
    } catch (e) {
      console.warn(`   ⚠️  Lighthouse failed: ${e}`);
    }
  }

  // ── Step 3: Data fetching scan ───────────────────────────────────────────
  console.log('\n🔄 Step 3/5 — Scanning data fetching patterns…');
  let dataFetchingData;
  try {
    dataFetchingData = await scanDataFetching(args.project);
    const optimizable = (dataFetchingData?.pages ?? []).filter(
      (p: any) => p.currentMethod !== p.recommendedMethod,
    );
    console.log(`   Total pages      : ${dataFetchingData?.summary?.totalPages ?? 0}`);
    console.log(`   Optimizable pages: ${optimizable.length}`);
  } catch (e) {
    console.warn(`   ⚠️  Data fetching scan failed: ${e}. Continuing…`);
    dataFetchingData = { pages: [], summary: { totalPages: 0 } };
  }

  // ── Step 4: Apply transforms ─────────────────────────────────────────────
  console.log('\n🔧 Step 4/5 — Applying optimizations…');
  const jobs = decideTransforms(bundleData, dataFetchingData, args.project);

  const applied: Array<{ type: string; file: string; reason: string }> = [];
  const skipped: Array<{ type: string; file: string; reason: string }> = [];

  if (jobs.length === 0) {
    console.log('   No auto-fixable issues found.');
  }

  for (const job of jobs) {
    console.log(`   → ${job.type} on ${path.basename(job.file)}`);
    try {
      const result = await applyCodeTransform(job.type, job.file, {
        dryRun: args.dryRun,
        backup: true,
      });
      if (result.success) {
        console.log(`     ✅ ${args.dryRun ? '[dry-run] would apply' : 'applied'} — ${job.reason}`);
        applied.push({ type: job.type, file: job.file, reason: job.reason });
      } else {
        console.log(`     ⏭️  skipped — ${result.error}`);
        skipped.push({ type: job.type, file: job.file, reason: result.error ?? 'no changes' });
      }
    } catch (e) {
      console.log(`     ❌ failed — ${e}`);
      skipped.push({ type: job.type, file: job.file, reason: String(e) });
    }
  }

  // ── Step 5: Verify with Lighthouse ──────────────────────────────────────
  let afterData: typeof baselineData | undefined;
  if (targetUrl && applied.length > 0 && !args.dryRun) {
    console.log('\n📊 Step 5/5 — Re-running Lighthouse to verify improvements…');

    // In prod mode we must rebuild so the new code is reflected in the bundle
    if (args.prod) {
      console.log('   Rebuilding for production to measure real bundle savings…');
      try {
        await startProdServer(args.project);
      } catch (e) {
        console.warn(`   ⚠️  Rebuild failed: ${e}. Scores may not reflect code changes.`);
      }
    }

    try {
      afterData = await runLighthouse(targetUrl, { device: args.device, throttling: args.throttling });
      console.log(`   Score      : ${afterData.performanceScore}/100`);
    } catch (e) {
      console.warn(`   ⚠️  Verification Lighthouse failed: ${e}`);
    }
  } else {
    console.log('\n📊 Step 5/5 — Skipping re-audit' + (args.dryRun ? ' (dry-run mode)' : ' (no changes applied)'));
  }

  // ── Report ───────────────────────────────────────────────────────────────
  const duration = ((Date.now() - start) / 1000).toFixed(1);

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  Results');
  console.log('══════════════════════════════════════════════════════════\n');

  if (baselineScore !== undefined) {
    console.log(`  Baseline score  : ${baselineScore}/100`);
  }
  if (afterData) {
    const delta = afterData.performanceScore - (baselineScore ?? 0);
    const sign = delta >= 0 ? '+' : '';
    console.log(`  Final score     : ${afterData.performanceScore}/100`);
    console.log(`  Improvement     : ${sign}${delta} points ${delta >= 10 ? '🎉' : delta >= 0 ? '✅' : '⚠️'}`);
  }

  console.log(`\n  Applied         : ${applied.length}`);
  applied.forEach(t => console.log(`    ✅ ${t.type} → ${path.basename(t.file)}`));

  console.log(`  Skipped         : ${skipped.length}`);
  skipped.forEach(t => console.log(`    ⏭️  ${t.type} → ${path.basename(t.file)}`));

  console.log(`\n  Duration        : ${duration}s`);

  if (baselineData) {
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  Core Web Vitals');
    console.log('══════════════════════════════════════════════════════════');
    const b = baselineData.metrics;
    const a = afterData?.metrics;
    const fmt = (val: number, unit: string, decimals = 0) =>
      unit === 's' ? `${(val / 1000).toFixed(2)}s` : `${val.toFixed(decimals)}${unit}`;

    const row = (label: string, before: number, after: number | undefined, unit: 's' | 'ms' | '', decimals = 0) => {
      const b = fmt(before, unit, decimals);
      const a = after !== undefined ? fmt(after, unit, decimals) : '—';
      console.log(`  ${label.padEnd(14)} ${b.padStart(8)}  →  ${a.padStart(8)}`);
    };

    console.log(`\n  Metric          Baseline     After`);
    row('LCP',  b.lcp,  a?.lcp,  's');
    row('CLS',  b.cls,  a?.cls,  '', 3);
    row('TBT',  b.tbt,  a?.tbt,  'ms');
    row('FCP',  b.fcp,  a?.fcp,  's');
    row('TTI',  b.tti,  a?.tti,  's');
    row('SI',   b.si,   a?.si,   's');
    row('TTFB', b.ttfb, a?.ttfb, 'ms');
  }

  console.log('\n');
}

run().catch(err => {
  console.error('\n❌ Pipeline failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
