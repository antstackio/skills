# Style Guide Architect

A platform-agnostic skill for any LLM (Claude, Gemini, GPT, etc.) that converts design tokens and an assets folder into a fully interactive, self-contained `style-guide.html` file. Open it by double-clicking — no server, no build step, no dependencies.

[Watch demo](https://drive.google.com/file/d/1oAf5bovYfbYYYfRByqQzX227obLdcfSj/view?usp=sharing)

---

## Output

A single `style-guide.html` with four tabs:

| Tab | What it shows |
|---|---|
| **Colors** | Swatches categorized into Core / Supportive / Generic, each with copy HEX and RGBA buttons |
| **Typography** | Live preview of every text style with copyable CSS |
| **Assets** | Image previews with Download SVG and Download PNG buttons (omitted if no assets found) |
| **UI Elements** | Sticky sidebar + scrollable sections: Buttons, Form Elements, Card, Badges, Alerts |

Every element has a preview box and a Copy CSS button.

---

## Input Format

The skill accepts design tokens in two formats:

### Option A — CSS Custom Properties
```css
:root {
  --color-primary: rgba(255,123,34,1);
  --color-secondary: rgba(87,87,87,1);
  --color-gradient: linear-gradient(to bottom, rgba(255,239,221,1) 0%, rgba(126,101,72,0.5) 100%);
}
.text-style-heading-h1 {
  font-size: 64px;
  font-family: Nasalization;
  font-weight: 400;
  line-height: 75px;
}
```

### Option B — Design Tokens JSON
```json
{
  "variables": {
    "color-primary-color":    { "value": "rgba(10,10,10,1)" },
    "color-secondary-color":  { "value": "rgba(90,90,90,1)" },
    "color-primary-gradient": { "value": "linear-gradient(135deg, rgba(10,10,10,1) 0%, rgba(90,90,90,1) 100%)" }
  },
  "textStyles": {
    "h-1": {
      "cssProperty": {
        "font-size": "32px", "font-family": "Inter",
        "font-weight": 700, "font-style": "normal",
        "text-decoration": "none", "text-transform": "none"
      }
    }
  }
}
```

### Assets (optional)
The skill searches the **entire project** for `.svg`, `.png`, or `.jpg` files using glob patterns — it does not assume a fixed folder name or location. The first matching directory becomes the assets folder.

- SVGs are embedded as base64 data URLs so downloads work from `file://` without a server
- `style-guide.html` is written as a **sibling to the discovered assets folder**
- The Assets tab is omitted entirely if no image files are found anywhere in the project

---

## Usage

### With Claude Code
```
/style-guide <paste your tokens here>
```
Claude will search for assets, embed them, and write `style-guide.html` next to the assets folder.

### With any other LLM (Gemini, GPT, etc.)
1. Paste the contents of `SKILL.md` into the LLM's context
2. Provide your design tokens (CSS or JSON format)
3. Ask it to generate `style-guide.html`

---

## What the Output Includes

### Colors
- Tokens auto-categorized: **Core** (primary/secondary/brand), **Supportive** (materials, overlays, gradients, surfaces), **Generic** (neutral/white/black)
- Gradient tokens rendered as gradient swatches
- Semi-transparent tokens shown over a checkerboard background
- Copy HEX + Copy RGBA per swatch (gradients get Copy CSS)

### Typography
- Every text style rendered live in the actual font (loaded via Google Fonts where available)
- Pill label showing role + font/size/weight specs
- Copy CSS block per style

### Assets
- SVG: Download SVG (direct anchor) + Download PNG (canvas conversion)
- Tab is hidden entirely if no assets found in the project

### UI Elements (sticky sidebar navigation)
- **Buttons**: 10 variants — primary, secondary, ghost, danger, icon-only (3 styles), icon+text (3 styles)
- **Form Elements**: input, textarea, checkbox (3 states), toggle (3 states)
- **Card**: gradient header, body text, action button
- **Badges**: 6 variants (primary, secondary, success, danger, warning, dark)
- **Alerts**: 3 variants (success, danger, warning)

---

## Verification Checklist

- [ ] Page chrome is black/white/Roboto — no brand colors in UI
- [ ] Colors split into Core / Supportive / Generic
- [ ] Sidebar has exactly 5 items, all sections visible and scrollable
- [ ] Buttons section has exactly 10 cards
- [ ] Form Elements has exactly 4 cards with all states shown
- [ ] Every element has a working Copy CSS button
- [ ] Zero emojis anywhere
- [ ] `style-guide.html` written as sibling to the assets folder

---

## File Structure

```
your-project/
├── assets/               — discovered automatically (any folder with SVG/PNG/JPG)
│   ├── logo-light.svg
│   └── logo-dark.svg
└── style-guide.html      — generated here, sibling to assets folder

skills/style-guide/
├── SKILL.md              — full spec for any LLM to follow
├── README.md             — this file
└── metadata.json         — skill metadata
```
