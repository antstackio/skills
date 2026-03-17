#!/usr/bin/env node

import { PerformanceAgent } from './agent.js';
import type { AgentOptions } from './types/index.js';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  project?: string;
  url?: string;
  dryRun: boolean;
  device: 'mobile' | 'desktop';
  throttling: 'simulated3G' | 'simulated4G' | 'none';
  model: string;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const result: CliArgs = {
    dryRun: false,
    device: 'mobile',
    throttling: 'simulated3G',
    model: 'claude-opus-4-6',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--project':
      case '-p':
        result.project = args[++i];
        break;
      case '--url':
      case '-u':
        result.url = args[++i];
        break;
      case '--dry-run':
        result.dryRun = true;
        break;
      case '--device':
        result.device = args[++i] as 'mobile' | 'desktop';
        break;
      case '--throttling':
        result.throttling = args[++i] as 'simulated3G' | 'simulated4G' | 'none';
        break;
      case '--model':
        result.model = args[++i];
        break;
      case '--verbose':
      case '-v':
        result.verbose = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        // Treat bare first argument as project path
        if (!arg.startsWith('-') && result.project === undefined) {
          result.project = arg;
        }
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
frontend-performance-agent — autonomous Next.js performance optimizer

Usage:
  npx frontend-performance-agent [options]
  npx frontend-performance-agent --project ./my-app

Options:
  --project, -p  <path>     Path to Next.js project root          (required)
  --url,     -u  <url>      URL for Lighthouse audit              (default: starts dev server)
  --dry-run                 Preview changes without applying them
  --device       mobile|desktop  Device emulation                 (default: mobile)
  --throttling   simulated3G|simulated4G|none                     (default: simulated3G)
  --model        <model>    Claude model to use                   (default: claude-opus-4-6)
  --verbose, -v             Show detailed progress including tool calls
  --help,    -h             Show this help

Environment variables:
  ANTHROPIC_API_KEY         Required — your Anthropic API key

Examples:
  # Dry-run analysis (preview only)
  npx frontend-performance-agent --project ./my-next-app --dry-run

  # Full optimization with existing dev server
  npx frontend-performance-agent --project ./my-next-app --url http://localhost:3000

  # Desktop audit with no throttling
  npx frontend-performance-agent --project ./my-next-app --device desktop --throttling none

  # Verbose output to follow the agent's decisions
  npx frontend-performance-agent --project ./my-next-app --verbose
`);
}

function printBanner(): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        frontend-performance-agent  v0.2.0               ║');
  console.log('║   Autonomous Next.js Performance Optimizer               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
}

function printSummary(result: Awaited<ReturnType<PerformanceAgent['run']>>): void {
  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  Results');
  console.log('══════════════════════════════════════════════════════════');

  if (result.initialScores) {
    const score = result.initialScores.performanceScore;
    const label = score >= 90 ? '🟢 Good' : score >= 50 ? '🟡 Needs Improvement' : '🔴 Poor';
    console.log(`\n  Initial score : ${score}/100  ${label}`);
  }

  if (result.finalScores) {
    const score = result.finalScores.performanceScore;
    const label = score >= 90 ? '🟢 Good' : score >= 50 ? '🟡 Needs Improvement' : '🔴 Poor';
    console.log(`  Final score   : ${score}/100  ${label}`);

    if (result.improvement !== undefined) {
      const sign = result.improvement >= 0 ? '+' : '';
      const emoji = result.improvement >= 10 ? '🎉' : result.improvement >= 0 ? '✅' : '⚠️';
      console.log(`  Improvement   : ${sign}${result.improvement} points  ${emoji}`);
    }
  }

  console.log('');
  console.log(`  Optimizations applied : ${result.appliedTransformations.length}`);
  console.log(`  Optimizations skipped : ${result.skippedTransformations.length}`);
  console.log(`  Duration              : ${(result.duration / 1000).toFixed(1)}s`);
  console.log(`  Agent iterations      : ${result.iterations}`);
  console.log('');

  if (result.appliedTransformations.length > 0) {
    console.log('  Applied:');
    result.appliedTransformations.forEach(t => {
      console.log(`    ✅ ${t.transformType}  →  ${t.filePath}`);
    });
    console.log('');
  }

  if (result.skippedTransformations.length > 0) {
    console.log('  Skipped:');
    result.skippedTransformations.forEach(t => {
      console.log(`    ⏭️  ${t.type}  →  ${t.filePath}`);
    });
    console.log('');
  }

  if (result.report) {
    console.log('══════════════════════════════════════════════════════════');
    console.log('  Full Report');
    console.log('══════════════════════════════════════════════════════════');
    console.log('');
    console.log(result.report);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (!args.project) {
    console.error('Error: --project <path> is required\n');
    printHelp();
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    console.error('  Get your key at https://console.anthropic.com/');
    process.exit(1);
  }

  printBanner();

  console.log(`  Project   : ${args.project}`);
  if (args.url) console.log(`  URL       : ${args.url}`);
  console.log(`  Device    : ${args.device}`);
  console.log(`  Throttling: ${args.throttling}`);
  console.log(`  Mode      : ${args.dryRun ? 'Dry Run (preview only)' : 'Apply Changes'}`);
  console.log('');
  console.log('  Starting agent…');
  console.log('');

  const agentOptions: AgentOptions = {
    url: args.url,
    dryRun: args.dryRun,
    device: args.device,
    throttling: args.throttling,
    model: args.model,
    verbose: args.verbose,
  };

  const agent = new PerformanceAgent(process.env.ANTHROPIC_API_KEY, args.model);

  try {
    const result = await agent.run(args.project, agentOptions);
    printSummary(result);
  } catch (error) {
    console.error('\n❌ Agent failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
