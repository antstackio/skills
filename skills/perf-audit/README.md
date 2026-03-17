# perf-audit — Autonomous Next.js Performance Optimizer

> **One command. Real bundle. Accurate scores.**

`perf-audit` is a Claude skill that autonomously runs Lighthouse against your Next.js **production build**, finds performance issues, applies code transforms to fix them, and shows you a before/after report.

## Quick Start

```bash
npm install -g frontend-performance-agent
export GROQ_API_KEY=gsk_...          # free at console.groq.com

perf-agent-groq --prod               # interactive — picks your project & options
```

> **Always use `--prod`** — dev server skips tree-shaking, scoring 20–30 pts lower than real users see.

## What It Does

```
perf-agent-groq --prod
  │
  ├─ 1. analyzeBundle()         finds moment.js, lodash, raw <img>, SSR pages
  ├─ 2. next build + next start  production server on :3000
  ├─ 3. runLighthouse()          baseline Core Web Vitals
  ├─ 4. applyTransforms()        7 AST-based fixes written to disk
  ├─ 5. next build (again)       proves the bundle got smaller
  ├─ 6. runLighthouse()          after score
  └─ 7. printSummary()           ASCII box table
```

## Transforms

| Transform | What changes | Typical saving |
|-----------|-------------|---------------|
| `replaceMomentWithDayjs` | `moment` → `dayjs` | ~298 KB |
| `optimizeLodashImports` | `import _ from 'lodash'` → per-function | up to 80% |
| `convertImgToNextImage` | `<img>` → `<Image>` with lazy-load | LCP ↓ |
| `convertSSRToISR` | adds `revalidate` to SSR pages | TTFB ↓ |
| `convertSSRToSSG` | fully-static SSR → `getStaticProps` | TTFB ↓ |
| `addDynamicImports` | heavy components → `dynamic()` | JS parse ↓ |
| `addImageOptimization` | `priority` on above-fold image | LCP ↓ |

## Real Results

Tested on a ~40-page Next.js App Router site:

| Metric | Before | After | Δ |
|--------|--------|-------|---|
| **Score** | 26 | **52** | **+26 🎉** |
| LCP | 11.10s | 3.50s | -7.60s |
| CLS | 0.355 | 0.228 | -0.127 |
| TBT | 1312ms | 1236ms | -76ms |
| FCP | 5.45s | 4.10s | -1.35s |
| TTFB | 290ms | 195ms | -95ms |

## Setup Guide

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 18 | `node --version` |
| Chrome | any | Lighthouse uses it headlessly |
| GROQ_API_KEY | — | Free at [console.groq.com](https://console.groq.com) |

### Install

```bash
git clone https://github.com/antstackio/skills
cd skills/perf-audit

npm install
npm run build
```

### Configure API Key

```bash
export GROQ_API_KEY=gsk_...
# Add to ~/.zshrc or ~/.bashrc to persist
```

### Run

```bash
# Interactive — prompts for project, device, mode
perf-agent-groq --prod

# Non-interactive
perf-agent-groq --project ./my-next-app --prod --device mobile

# Dry-run (preview transforms only, no files written)
perf-agent-groq --project ./my-next-app --prod --dry-run
```

### Expected Output

```
🤖 Groq AI Agent starting...
   Model   : llama-3.3-70b-versatile
   Server  : Production (next build + next start)

🏗️  Running next build...
   ✓ Compiled successfully
✅ Production server ready at http://localhost:3000

  → runLighthouse(...)     Score: 26

  → applyCodeTransform(replaceMomentWithDayjs → customers/page.tsx)
     ✅ -298 KB bundle

  [... more transforms ...]

🏗️  Rebuilding...
✅ Production server ready at http://localhost:3000

  → runLighthouse(...)     Score: 52

╔══════════════════════════════════════════════════════════════╗
║  📊  Performance Report                                      ║
╠══════════════════════════════════════════════════════════════╣
║  Score   : 26  →  52  (+26)  🎉                              ║
╚══════════════════════════════════════════════════════════════╝
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `GROQ_API_KEY not set` | `export GROQ_API_KEY=gsk_...` |
| `next build failed` | Check your app builds locally first: `npm run build` |
| `Port 3000 already in use` | Kill it: `lsof -ti:3000 \| xargs kill` |
| `Chrome not found` | Install Chrome or set `CHROME_PATH` |
| Score didn't improve | Run with `--dry-run` first to verify transforms are found |

## CLI Reference

```
perf-agent-groq [options]

Options:
  --project <path>        Path to Next.js project (interactive if omitted)
  --prod                  Use production build (recommended)
  --dry-run               Preview transforms, don't write files
  --device <mobile|desktop>  Lighthouse device (default: mobile)
  --url <url>             Audit a URL directly, skip local server
  --throttling <preset>   simulated3G | desktopDense4G (default: simulated3G)
  --iterations <n>        Max agent iterations (default: 10)
```

## MCP Integration (Claude Desktop)

```json
{
  "mcpServers": {
    "perf-audit": {
      "command": "node",
      "args": ["/path/to/frontend-performance-agent/dist/server.js"]
    }
  }
}
```

Say: *"Audit the performance of my app in production mode and apply all fixes"*

## License

MIT — © AntStack
