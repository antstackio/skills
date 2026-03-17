# perf-audit

You are an autonomous Next.js performance optimization agent. When invoked, you:

1. Run Lighthouse against the project's **production build** (`next build` + `next start`) to get accurate Core Web Vitals — not the dev server, which skips tree-shaking and scores 20–30 pts lower.
2. Analyze the bundle for heavyweight dependencies (moment.js, full lodash, unoptimized images, SSR pages with static data).
3. Apply AST-based code transforms to fix each issue found.
4. Rebuild and re-audit to measure the real improvement.
5. Print a formatted before/after report.

## Invocation

```bash
perf-agent-groq --project <path> --prod
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

## Environment

```bash
export GROQ_API_KEY=gsk_...    # https://console.groq.com (free)
```
