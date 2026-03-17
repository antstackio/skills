# vibe-safeguard 

**Background intelligence layer for serious vibe coders.**

Adaptive. Non-blocking. Overload-aware. Built for real product development with AI tools.

---

## What this is

vibe-safeguard is not a prompt template. Not a checklist. Not a rules engine.

It's a **context-aware system** that wraps around your entire AI coding session — reading what you're building, how complex it is, and whether the current approach will overload — then acting accordingly.

It runs silently. Surfaces only what you need. Gets out of the way when you're in flow.

Works with: **Claude, Cursor, Copilot, ChatGPT, Lovable, Replit, Framer, n8n**, or any AI coding tool.

---

## Quick Start

```
vibeguide build a SaaS dashboard with user auth and data tables
```

```
vibelight build a landing page for my AI tool
```

```
vibedebug
```

```
vibecheck
```

---

## The 5 modes

### 🔵 INTERCEPT — Before you build

Runs once. Checks your idea silently. Asks only what's missing (max 1–2 questions). Maps the architecture automatically based on your project type. Moves on.

No interrogation. No checklist. Just structure.

### 🟡 WRAP — Before your prompt leaves

Formats your prompt with the right structure for any AI coding tool.

- Token budget check (targets 400–700 tokens depending on complexity)
- Vague phrases compressed to specific constraints
- Every prompt ends with token estimate: `lean / moderate / heavy`
- If heavy: offers compressed version automatically
- If too large: splits into Stage 1 → 2 → 3 automatically
- Suggests the best tool for your build type

### 🔀 MODE HANDOFF — The clean boundary

After WRAP, **everything stops.** You choose:

```
What's next?
1. Use this prompt in Cursor / Lovable / Replit (recommended)
2. Build here — step-by-step mode
```

This is the fix for context overload. The system hands off cleanly and waits. No auto-continuation. No stacked modes.

### 🟢 LIGHT BUILD MODE — Step-by-step inside Claude

Activated by:
- Choosing "Build here" at the handoff
- Typing `vibelight [idea]`
- **Auto-trigger** when overload signals are detected (see below)

In this mode:
- Heavy guardrails suspended
- Structure awareness stays on
- Micro UX layer stays on (high-impact checks only)
- One component per response
- Waits for confirmation before each step

```
✓ Scaffold created. Ready for the first component?
✓ Input form done. Ready for the API call?
✓ Results display done. Ready for the final cleanup?
```

Never generates the full app in one response.

### 🟣 DECODE — Visual code understanding

Paste any code to get a **visual structural map** — not just a text explanation.

Labels are added directly into the code structure so non-coders can *see* what each part does:

```jsx
// ═══════════════════════════════════════════
// LAYOUT SHELL — wraps entire page
// ═══════════════════════════════════════════
<div className="container">

  // ─── HEADER — navigation + branding ──────
  <header>...</header>

  // ─── MAIN CONTENT ─────────────────────────
  <main>
    // ─── HERO — first thing user sees ───────
    <section className="hero">...</section>
  </main>

  // ─── PRIMARY CTA — main action button ─────
  <button>Get Started</button>

</div>
```

Plus: file tree map + 3–5 bullet plain-English summary of what each part does.

### 🔴 DEBUG — When something breaks

Say `error`, `not working`, `bug`, paste an error message, or type `vibedebug`.

1. Issue category identified (syntax / undefined / API / state / import / environment)
2. Plain-English explanation — what actually went wrong
3. Fix — corrected snippet or structured re-generation prompt
4. Optional: offer step-by-step rebuild if component is fundamentally broken

---

## Auto Light Mode Trigger

This is what makes v4 different from any previous version.

**vibe-safeguard detects overload before it happens** and offers to switch modes automatically — without waiting for a command.

Triggers automatically when:

| Signal | What it means |
|---|---|
| User says "stuck", "slow", "retry", "not loading" | Session is struggling |
| Request involves multi-screen app, SaaS, dashboard | Complexity is high |
| Same request made 2+ times | Loop detected |
| Prompt or output would exceed safe token size | Overload imminent |
| Generated code has 5+ components or 200+ lines | Response fragility risk |

When detected:

```
⚡ This might overload. Switch to step-by-step build mode?

Best for: large UI builds · slow responses · 4+ components
```

If yes → LIGHT BUILD MODE activates immediately.
If no → proceed once, no further warnings for this request.

---

## Token Intelligence

Every prompt is optimized before it leaves. No exceptions.

| Build type | Target | Hard limit |
|---|---|---|
| Simple (1 component) | < 400 tokens | 600 |
| Medium (2–4 components) | < 600 tokens | 800 |
| Complex (full app) | < 700 tokens | 1,000 |

If over limit:
```
⚠ High token usage. Want a compressed version?
```

If split needed → auto-stages:
```
Stage 1 → Architecture + file structure
Stage 2 → UI components
Stage 3 → Logic + data layer
```

---

## Tool Suggestions

After every prompt, one line:

| Project type | Suggested tool |
|---|---|
| UI-heavy / visual | Lovable, Framer |
| Full-stack app | Cursor |
| Logic / AI / scripts | Claude |
| Automation | n8n, Make |
| Quick prototype | Replit |

Always followed by: *"Use any tool you prefer — this is a suggestion."*

---

## Cognitive Design Layer

vibe-safeguard applies UX intelligence silently across all modes.

Active principles: Cognitive Load, Hick's Law, Von Restorff Effect, Occam's Razor, Visual Hierarchy, Fitts's Law.

Surfaces only when something critical is broken:
```
⚠ UX: [specific issue] — [principle] → [specific fix]
```

One line. One time. Never repeated.

---

## Manual Commands

| Command | What it does |
|---|---|
| `vibeguide [idea]` | Full guardrail: INTERCEPT → WRAP → handoff |
| `vibecheck` | Validate idea or last prompt |
| `vibeguard [idea]` | Alias for vibeguide |
| `vibelight [idea]` | Jump straight to LIGHT BUILD MODE |
| `vibedebug` | Activate DEBUG on current context |
| `skip guardrails` | Disable all checks for session |

---

## Loop Safety

Every check runs once. Hard rules:

- INTERCEPT questions → once per idea
- Architecture map → once per idea
- Token optimization → once per prompt
- Context bloat warning → once per session
- UX / cognitive notes → once per component
- Debug diagnosis → once per error
- Auto light offer → once per request

No mode stacks on top of another. After MODE HANDOFF, nothing runs until you respond.

---

## What changed from v3

| v3 | v4 |
|---|---|
| LIGHT MODE had UX fully off | Micro UX layer active in LIGHT MODE (Fitts, Hick, contrast, hierarchy) |
| Only user could trigger LIGHT MODE | AUTO LIGHT TRIGGER — detects overload, offers switch proactively |
| Code labeling was basic comments | Visual structural mapping inside JSX/HTML — non-coders can see the layout |
| Token check was passive | Token intelligence — proactively offers compressed version if heavy |
| No `vibedebug` command | `vibedebug` activates DEBUG on current context |
| No retry/stuck detection | Loop detection → auto-offer LIGHT MODE |
| No Occam's Razor or Cognitive Load layer | Cognitive design layer formalized |
| No complexity spike detection | Multi-screen / SaaS / dashboard → auto-trigger |

---

## Example session — SaaS dashboard

```
You:      vibeguide build a SaaS dashboard with user auth, data tables, user settings

INTERCEPT: Platform defined. Complexity: high (multi-screen, auth, dashboard).
           Architecture map → Interface / Logic / Data / AI layers. INTERCEPT closes.

AUTO LIGHT TRIGGER fires:
           "⚡ This might overload. Switch to step-by-step mode?
            Best for: large UI builds · slow responses · 4+ components"

You:      Yes

LIGHT BUILD MODE:
Step 1:   App scaffold + routing structure
          ✓ Done. Ready for auth screens?
You:      yes
Step 2:   Login + signup components
          ✓ Done. Ready for dashboard layout?
You:      yes
Step 3:   Dashboard shell + sidebar
          ✓ Done. Ready for data tables?
...

No freeze. No overload. Full app built step-by-step.
```

---

## Compatibility

- Claude (claude.ai, Claude Code, API)
- Any agent using the skills.sh ecosystem
- Manual: paste SKILL.md into a Project's custom instructions

---

## Files

```
vibe-safeguard/
├── SKILL.md                          — Agent intelligence instructions
├── README.md                         — This file
├── metadata.json                     — skills.sh registry
└── references/
    ├── prompt-templates.md           — Tool prompts + token compression table
    ├── architecture-patterns.md      — 7 app patterns with data flows
    └── ux-rules.md                   — UX rules + cognitive design reference
```

---

**Version:** 4.0.0
**Author:** Ranajoy Sharma
**Category:** vibe-coding · developer-tools · ai-workflows · agent-skills
