---
name: style-guide
description: >
  Generates an interactive, self-contained HTML style guide from design tokens JSON and an
  optional assets folder. Produces a single style-guide.html with four tabs — Colors,
  Typography, Assets (if files exist), UI Elements — that works by double-clicking with no
  server, no build step, and no external dependencies except Google Fonts.
---

# Style Guide Architect

## Output
A **single `style-guide.html`** that opens by double-clicking. All CSS and JS inline. Only
allowed external URL: Google Fonts `@import`.

## Input

### Design Tokens JSON
```json
{
  "variables": {
    "color-primary-color": { "value": "rgba(r,g,b,a)" },
    "color-primary-gradient": { "value": "radial-gradient(...)" }
  },
  "textStyles": {
    "h-1": { "cssProperty": { "font-size": "32px", "font-family": "Geist", "font-weight": 700 } }
  }
}
```

### Assets (optional)
Scan `assets/` for `.svg`, `.png`, `.jpg`. If absent or empty — **omit the Assets tab entirely** (both button and panel).

---

## Global Rules

1. **Chrome is black/white/Roboto only.** Brand colors appear only inside preview boxes.
2. **Load brand fonts** via Google Fonts `@import` at the top of `<style>`.
3. **No emojis anywhere.**
4. **Every element card** = pill heading + preview box + `<pre>` CSS block + Copy CSS button.
5. **All JS in one `<script>` block** at the bottom of `<body>`. Never split or use DOMContentLoaded.
6. **Substitute every `{placeholder}`** — never emit a literal `{primary}` in the output.

---

## Page Structure

```
<header class="sg-header">           sticky, z-index:100, bg:#fff, border-bottom
  <div class="sg-header-inner">      max-width:900px, margin:0 auto, padding:20px 40px 0
    <div class="sg-header-top">      flex-column, align-items:center, text-align:center
      <span class="sg-title">        18px 700 #111
  <nav class="sg-tabs">              flex, justify-content:center
    <button class="sg-tab active" data-tab="colors">
    <button class="sg-tab" data-tab="typography">
    <button class="sg-tab" data-tab="assets">   ← only if assets exist
    <button class="sg-tab" data-tab="ui">

<div class="sg-body">                max-width:900px, margin:0 auto, padding:40px 40px 80px
  <div class="sg-panel active" id="tab-colors">
  <div class="sg-panel" id="tab-typography">
  <div class="sg-panel" id="tab-assets">        ← only if assets exist
  <div class="sg-panel" id="tab-ui">
    <div style="display:flex;gap:0;">
      <nav class="ui-sidebar">       width:160px, sticky top:var(--header-h,88px)
      <div class="ui-content">       flex:1, padding-left:40px
        <div class="ui-section" id="ui-buttons">
        <div class="ui-section" id="ui-input">
        <div class="ui-section" id="ui-card">
        <div class="ui-section" id="ui-badges">
        <div class="ui-section" id="ui-alerts">
```

**All `.ui-section` divs are `display:block` always — never hidden. Sidebar scrolls to them; it does not toggle visibility.**

### Pill heading (used everywhere)
```html
<div class="color-cat-heading">
  <span class="color-cat-pill">label</span>
  <span class="color-cat-sub">subtitle</span>
</div>
```
Black pill (#111 bg, white text, monospace 10px uppercase, 999px radius). Sub in #888 monospace 11px.

---

## Tab 1 — Colors

No sidebar. Three pill-headed sections stacked.

**Categorize:**
- **Core** / Brand Colors → tokens: `primary-color`, `secondary-color`, `dark-color`, `bg-color`
- **Supportive** / Brand Supportive → tokens: `gradient`, `surface`, `border`, `light-*`
- **Generic** / UI Colors → tokens: `success`, `danger`, `warning`, `info`, `white`, `black`

**Color card:** swatch (96px tall) + token name + hex + rgba + copy buttons.
- Solid alpha=1: `<div class="color-swatch" style="background:rgba(...)">` with `border-bottom:1px solid #e2e2e2`
- Semi-transparent: add class `has-alpha` with checkerboard `::before` + inner `.color-swatch-fill`
- Gradient: background is the gradient value directly
- Buttons: `HEX` copies hex, `RGBA` copies rgba string, gradients get `Copy CSS`

---

## Tab 2 — Typography

One `<div class="type-row">` per text style, stacked. Do not group.

Each row:
1. Pill heading: role name + `Font / Xpx / Weight` subtitle
2. Preview box (bg:#f7f7f7, border, border-radius:6px, padding:20px): live text rendered in the actual font/size/weight. Headings → "The quick brown fox", body → "The quick brown fox jumps over the lazy dog."
3. `<pre class="css-pre">` with the font properties + absolute-positioned Copy CSS button

---

## Tab 3 — Assets

Reference each file using a **relative path** — never embed as base64, never use `file://`. The `style-guide.html` sits next to the `assets/` folder, so paths are `assets/filename.ext`.

- **Preview:** use `<img src="assets/filename.ext" alt="filename">` for all file types (SVG, PNG, JPG).
- **Download:** use `<a href="assets/filename.ext" download="filename.ext">Download SVG</a>` (or PNG / JPG). Plain anchor — no JS needed.

**Do NOT convert between formats.** Each file gets exactly one download button matching its original format. No `svgToPng`, no canvas, no base64.

Asset card layout: checkerboard preview box (160px tall, flex center, `background-image: repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%)`) + filename + file type label + download `<a>` button styled as `.btn-dl`.

Example card:
```html
<div class="asset-card">
  <div class="asset-preview">
    <img src="assets/Logo_dark.svg" alt="Logo_dark" />
  </div>
  <div class="asset-info">
    <div class="asset-name">Logo_dark</div>
    <div class="asset-type">SVG</div>
    <div class="asset-btns">
      <a class="btn-dl" href="assets/Logo_dark.svg" download="Logo_dark.svg">Download SVG</a>
    </div>
  </div>
</div>
```

---

## Tab 4 — UI Elements

### Token substitution

| Placeholder | Token |
|---|---|
| `{primary}` | `color-primary-color` |
| `{secondary}` | `color-secondary-color` |
| `{dark}` | `color-dark-color` |
| `{danger}` | `color-danger-color` |
| `{success}` | `color-success-color` |
| `{warning}` | `color-warning-color` |
| `{gradient}` | `color-primary-gradient` |
| `{primary-15}` | primary with alpha 0.15 |
| `{mono-font}` | first monospace font-family in textStyles, else `monospace` |

### Buttons (10 cards)

| Pill | Key CSS |
|---|---|
| `btn-primary` | `bg:{primary}; color:#fff; padding:9px 20px; border-radius:6px; border:none; font-weight:700` |
| `btn-secondary` | `bg:{secondary}; color:{dark}; padding:9px 20px; border-radius:6px; border:none; font-weight:700` |
| `btn-ghost` | `bg:transparent; color:{primary}; border:1.5px solid {primary}; padding:9px 20px; border-radius:6px; font-weight:700` |
| `btn-danger` | `bg:{danger}; color:#fff; padding:9px 20px; border-radius:6px; border:none; font-weight:700` |
| `btn-icon-filled` | 40×40, `bg:{primary}`, color:#fff, border:none, border-radius:8px, inline-flex center — show search + plus icons |
| `btn-icon-ghost` | 40×40, transparent, `border:1.5px solid {primary}`, color:{primary} — show edit + close icons |
| `btn-icon-subtle` | 40×40, `bg:rgba(0,0,0,0.06)`, color:{dark}, border:none — show search + plus icons |
| `btn-icon-text-primary` | inline-flex + gap:8px + padding:9px 20px, `bg:{primary}`, color:#fff, font-weight:700 — "Search" + "Add New" |
| `btn-icon-text-ghost` | same layout, transparent, `border:1.5px solid {primary}`, color:{primary} |
| `btn-icon-text-subtle` | same layout, `bg:rgba(0,0,0,0.06)`, color:{dark} |

Use inline SVG for icons (`stroke="currentColor"`, 16×16): search (circle+line), plus (two lines), close (two diagonal lines), edit (pencil path).

### Form Elements (4 cards)

**input:** Show default (border:1px solid rgba(0,0,0,0.35)) and focused state (border:{primary}, box-shadow:0 0 0 3px {primary-15}, outline:none).

**textarea:** Single state. resize:vertical, line-height:1.5.

**checkbox:** 3 states — unchecked / checked / disabled (opacity:0.4). Custom box via hidden `<input class="sg-check">` + `<span class="sg-check-box">`.
- **HTML order is critical:** `<input class="sg-check">` must be the **immediate preceding sibling** of `<span class="sg-check-box">` — the CSS uses the `+` adjacent sibling selector.
- Checked state: `background:{primary}; border-color:{primary}` + checkmark `::after` (5×9px, rotate 45deg).

**toggle:** 3 states — off / on / disabled. Hidden `<input class="sg-toggle-input">` + `<span class="sg-toggle-track"><span class="sg-toggle-thumb">`.
- **HTML order is critical:** `<input>` must come **before** `<span class="sg-toggle-track">` — CSS uses `~` general sibling selector.
- Checked: track `background:{primary}`; thumb `transform:translateX(18px)`.

### Card (1 card)

Full-width card (max-width:360px): gradient header (`background:{gradient}`, font-family:{mono-font}, font-weight:700, color:{dark}), body with supporting text (muted), action button (`bg:{primary}`).

### Badges (6 cards)

All: `border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; padding:4px 10px; font-family:monospace`

| Pill | Background | Color |
|---|---|---|
| `badge-primary` | {primary} 12% opacity | {primary} |
| `badge-secondary` | {secondary} 20% opacity | dark shade of secondary |
| `badge-success` | {success} 12% opacity | dark shade of success |
| `badge-danger` | {danger} 10% opacity | dark shade of danger |
| `badge-warning` | {warning} 15% opacity | dark shade of warning |
| `badge-dark` | {dark} solid | #ffffff |

### Alerts (3 cards)

All: `border-left:3px solid; border-radius:6px; padding:10px 14px; font-size:13px; line-height:1.5`

| Pill | Text | Background | Border/color |
|---|---|---|---|
| `alert-success` | "Operation completed successfully." | {success} 8% | {success} solid; dark success text |
| `alert-danger` | "Something went wrong." | {danger} 7% | {danger} solid; dark danger text |
| `alert-warning` | "This action cannot be undone." | {warning} 10% | {warning} solid; dark warning text |

---

## JavaScript (single `<script>` block)

1. **`copyText(text, btn)`** — try `navigator.clipboard.writeText`, fall back to textarea + `execCommand('copy')`. Show "Copied!" for 1500ms then restore original label. Both `copyText` and `fallbackCopy` must be at global scope.

2. **Tab switching** — `.sg-tab` click: remove `active` from all tabs and panels, add to clicked tab and matching `#tab-{dataset.tab}` panel.

4. **UI sidebar** — click scrolls to `#target` with `scrollIntoView({behavior:'smooth',block:'start'})`. `IntersectionObserver` with `rootMargin:'-20% 0px -70% 0px'` highlights active sidebar item on scroll.

5. **Header height** — on load: `document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px')`.

---

## Verification Checklist

- [ ] Single HTML file, Google Fonts only external dependency
- [ ] No emojis; page chrome is black/white/Roboto
- [ ] Colors: 3 sections (Core / Supportive / Generic), gradient swatches, checkerboard for alpha
- [ ] Typography: live preview + Copy CSS per style
- [ ] Assets tab omitted if no files; assets referenced as `assets/filename.ext` relative paths (no base64, no data URIs, no file:// paths); each asset previewed with `<img>`; one download anchor per file matching its original format; no format conversion
- [ ] UI sidebar: exactly 5 items, all sections always visible, active tracks scroll
- [ ] Buttons: exactly 10 cards; Form Elements: exactly 4 cards with all states
- [ ] Checkbox/Toggle: HTML order critical for CSS sibling selectors
- [ ] Card: gradient header + body + action button
- [ ] Badges: exactly 6; Alerts: exactly 3
- [ ] `--header-h` variable used for sidebar sticky offset
