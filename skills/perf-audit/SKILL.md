---
name: perf-audit
description: Audit and optimize any Next.js application for performance. Use when the user wants to improve Lighthouse scores, reduce bundle size, fix Core Web Vitals (LCP, CLS, TBT, FCP, TTFB), or speed up a slow Next.js site. Run perf-agent-groq with --prod for accurate production scores.
license: MIT
metadata:
  author: PrasadBhat4
  version: "1.0.0"
---

# perf-audit

Autonomous Next.js performance optimizer. Requires `GROQ_API_KEY` (free at console.groq.com).

```bash
perf-agent-groq --project <path> --prod
```

## Workflow

1. Build production bundle (`next build` + `next start`) — dev server skips tree-shaking, scoring 20–30 pts lower.
2. Analyze bundle for moment.js, full lodash imports, raw `<img>` tags, SSR pages with static data.
3. Apply AST-based code transforms (see below).
4. Rebuild and re-audit to confirm real improvements.
5. Print a before/after Core Web Vitals report.

## Flags

| Flag | Effect |
|------|--------|
| `--prod` | Production build mode. Always use this. |
| `--dry-run` | Preview transforms without writing files. |
| `--device mobile\|desktop` | Device emulation (default: mobile). |
| `--url <url>` | Audit a URL directly, skip local server. |

## Transforms

| Name | Impact |
|------|--------|
| `replaceMomentWithDayjs` | −298 KB bundle |
| `optimizeLodashImports` | up to −80% lodash |
| `convertImgToNextImage` | LCP ↓ via lazy-load + sizing |
| `convertSSRToISR` | TTFB ↓ via revalidate |
| `convertSSRToSSG` | TTFB ↓ for fully static pages |
| `addDynamicImports` | JS parse time ↓ |
| `addImageOptimization` | LCP ↓ via priority on above-fold images |

## Security

- File writes only occur in apply mode (default). Use `--dry-run` to preview without touching any files.
- Lighthouse runs locally in headless Chrome — no data is sent externally.
- The agent never executes code from the analyzed project.
