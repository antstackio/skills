---
name: perf-audit
description: >
  Autonomously audits and optimizes Next.js applications for performance. Use this skill
  whenever a user wants to improve Lighthouse scores, reduce bundle size, fix Core Web
  Vitals (LCP, CLS, TBT, FCP, TTFB), or optimize a slow Next.js app. Also trigger when
  the user mentions moment.js, lodash bloat, unoptimized images, slow SSR pages, or wants
  to convert SSR to ISR/SSG. Runs against the production build for accurate scores.
license: MIT
metadata:
  author: antstackio
  version: '1.0.0'
---

# perf-audit

You are an autonomous Next.js performance optimization agent. When invoked, you:

1. Run Lighthouse against the project's **production build** (`next build` + `next start`) to get accurate Core Web Vitals — not the dev server, which skips tree-shaking and scores 20–30 pts lower.
2. Analyze the bundle for heavyweight dependencies (moment.js, full lodash, unoptimized images, SSR pages with static data).
3. Apply AST-based code transforms to fix each issue found.
4. Rebuild and re-audit to measure the real improvement.
5. Print a formatted before/after report.

## Invocation

```bash
# Groq (free, recommended)
perf-agent-groq --project <path> --prod

# Anthropic Claude
perf-agent --project <path> --prod

# No AI (deterministic pipeline)
npx tsx src/pipeline-runner.ts --project <path> --prod
```

## Flags

| Flag | Effect |
|------|--------|
| `--prod` | Runs `next build` + `next start` before auditing. Always use this. |
| `--dry-run` | Preview transforms without writing files. |
| `--device mobile\|desktop` | Device emulation (default: mobile). |
| `--url <url>` | Audit a staging URL directly, skip local server. |

## Transforms Applied

| Transform | Savings | What it does |
|-----------|---------|--------------|
| `replaceMomentWithDayjs` | ~298 KB | Replaces moment.js with Day.js |
| `optimizeLodashImports` | up to 80% | Per-function lodash imports |
| `convertImgToNextImage` | LCP | `<img>` → Next.js `<Image>` with lazy-load |
| `convertSSRToISR` | TTFB | Adds `revalidate` to SSR pages |
| `convertSSRToSSG` | TTFB | Fully-static SSR → `getStaticProps` |
| `addDynamicImports` | JS parse | Code-splits heavy components |
| `addImageOptimization` | LCP | Adds `priority` to above-fold images |

## Output

At the end of every run, the agent prints:

```
╔══════════════════════════════════════════════════════════════╗
║  📊  Performance Report                                      ║
╠══════════════════════════════════════════════════════════════╣
║  Mode    : Production  (next build + next start)             ║
║  Device  : mobile  |  Throttling: simulated3G                ║
╠══════════════════════════════════════════════════════════════╣
║  Score   : 26  →  52  (+26)  🎉                              ║
╠══════════════════════════════════════════════════════════════╣
║  Metric          Before      After       Δ                   ║
║  LCP             11.10s      3.50s    -7.60s ✅              ║
║  CLS              0.355      0.228    -0.127 ✅              ║
║  TBT             1312ms     1236ms      -76ms ✅              ║
║  FCP              5.45s      4.10s    -1.35s ✅              ║
║  TTFB             290ms      195ms      -95ms ✅              ║
╠══════════════════════════════════════════════════════════════╣
║  Transforms applied: 27   skipped: 0   iterations: 12        ║
╚══════════════════════════════════════════════════════════════╝
```

## Environment

```bash
export GROQ_API_KEY=gsk_...    # https://console.groq.com (free)
# or
export ANTHROPIC_API_KEY=sk-ant-...
```

## Security

- **Never commit API keys.** `GROQ_API_KEY` and `ANTHROPIC_API_KEY` must be set as environment variables only — never hardcoded in files.
- **Dry-run first on unfamiliar codebases.** Use `--dry-run` to preview all transforms before writing to disk.
- **Production builds modify files.** The `--prod` flag (without `--dry-run`) writes code changes directly. Always have a clean git state before running so you can `git diff` and revert if needed.
- API keys are only sent to `api.groq.com` or `api.anthropic.com` — no other external services.

## Source Code

Full implementation at: https://github.com/PrasadBhat4/Frontend_performance_agent

```bash
git clone https://github.com/PrasadBhat4/Frontend_performance_agent
cd Frontend_performance_agent
npm install && npm run build
npm link   # makes perf-agent-groq available globally
```

## MCP Server (Claude Desktop)

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "perf-audit": {
      "command": "node",
      "args": ["path/to/Frontend_performance_agent/dist/server.js"]
    }
  }
}
```

Then say: *"Audit the performance of my Next.js app in production mode"*
