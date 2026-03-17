---
name: perf-audit
description: Audit and optimize any Next.js application for performance. Use when the user wants to improve Lighthouse scores, reduce bundle size, fix Core Web Vitals (LCP, CLS, TBT, FCP, TTFB), or speed up a slow Next.js site.
license: MIT
metadata:
  author: PrasadBhat4
  version: "1.0.0"
---

# perf-audit

Autonomously audit and optimize a Next.js app for performance. Works on any AI assistant — follow the workflow below using whatever tools are available (shell commands, file edits, code analysis).

## Workflow

### 1. Build a production bundle
```bash
cd <project-path>
npm run build && npm run start &
```
Wait for the server at `http://localhost:3000`. **Do not skip this** — the dev server skips tree-shaking and scores 20–30 pts lower than production.

### 2. Run a Lighthouse baseline
```bash
npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-before.json \
  --preset=perf --emulated-form-factor=mobile --quiet
```
Extract: `categories.performance.score`, `audits.largest-contentful-paint`, `audits.total-blocking-time`, `audits.cumulative-layout-shift`, `audits.first-contentful-paint`, `audits.speed-index`, `audits.server-response-time`.

### 3. Analyze the bundle
Check `package.json` for heavy dependencies and scan source files:
- **moment.js** → replace with `dayjs` (saves ~298 KB)
- **lodash** full import → use per-function imports e.g. `import debounce from 'lodash/debounce'`
- Raw `<img>` tags → replace with Next.js `<Image>` (adds lazy-load + sizing)
- `getServerSideProps` with no request-time data → convert to ISR or SSG

### 4. Apply transforms
Edit files directly. Key patterns:

**moment → dayjs**
```diff
- import moment from 'moment'
+ import dayjs from 'dayjs'
- moment(date).format('YYYY-MM-DD')
+ dayjs(date).format('YYYY-MM-DD')
```

**lodash**
```diff
- import _ from 'lodash'
+ import debounce from 'lodash/debounce'
```

**img → Next.js Image**
```diff
- <img src={src} alt={alt} />
+ import Image from 'next/image'
+ <Image src={src} alt={alt} width={800} height={600} />
```

**SSR → ISR**
```diff
- export async function getServerSideProps() {
+ export async function getStaticProps() {
-   return { props: { ... } }
+   return { props: { ... }, revalidate: 60 }
  }
```

### 5. Rebuild and re-audit
```bash
npm run build && npm run start &
npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-after.json \
  --preset=perf --emulated-form-factor=mobile --quiet
```

### 6. Report results
Print a before/after table of: Score, LCP, CLS, TBT, FCP, TTFB. Show delta (+ or −) for each metric.

## Flags (when using the CLI shortcut)

| Flag | Effect |
|------|--------|
| `--prod` | Production build mode (always use) |
| `--dry-run` | Preview transforms without writing files |
| `--device mobile\|desktop` | Device emulation (default: mobile) |
| `--url <url>` | Audit a URL directly, skip local server |

```bash
# Optional CLI shortcut (requires Node ≥ 18 + GROQ_API_KEY)
npx frontend-performance-agent --prod
```

## Security

- Only modifies files the user explicitly owns. Use `--dry-run` to preview all changes before applying.
- Lighthouse runs locally in headless Chrome — no data sent externally.
- Never executes code from the analyzed project.
