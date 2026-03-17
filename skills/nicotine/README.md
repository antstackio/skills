# Nicotine

> A smarter way to compact your Claude Code session — so the context that survives is the context that matters.

---

## The Problem

When a session gets long, `/compact` kicks in and summarizes everything automatically. It works, but Claude decides what to keep. Important decisions, user feedback, and half-finished tasks can quietly vanish.

## How Nicotine Fixes It

Nicotine runs a guided workflow before compaction, putting you in control of what gets carried forward.

**The 5 steps:**

1. **Extract** — Nicotine scans the full conversation and pulls out the important stuff: bugs fixed, decisions made, feedback you gave, files changed, and anything left unfinished.
2. **Review** — It presents a numbered list and asks which items to include. You reply with `all`, specific numbers like `1,3,5`, or add anything it missed.
3. **Summarize** — A lean, structured summary is generated from your approved items (target: under 600 tokens).
4. **Replace** — The summary is saved, `/compact` is triggered automatically, and once it finishes, the session JSONL is overwritten with your curated summary instead of Claude's auto-generated one.
5. **Continue** — The conversation resumes with exactly the context you chose.

---

## Prerequisites

Nicotine uses `osascript` to type `/compact` into your terminal automatically. For this to work, your terminal needs Accessibility permission:

> **System Settings → Privacy & Security → Accessibility → enable your terminal app**

Without this, the automatic trigger won't fire.

---

## Usage

```
/nicotine
```

Follow the prompts. That's it.

---

## Does It Actually Help? Yes — Here's the Data

These numbers come from real `/context` stats, comparing two sessions side by side.

### Without `/nicotine`

| | Tokens | % of 200k |
|---|---|---|
| Before compact | 161k | 81% |
| After compact | 33k | 17% |
| — of which: messages | 13.3k | 6.7% |

Claude's auto-compact took the session from 161k down to 33k — an 80% reduction. But the message history went from 134.4k to just 13.3k, retaining roughly **10% of the original conversation**, chosen by the auto-compactor.

### With `/nicotine`

| | Tokens | % of 200k |
|---|---|---|
| Before compact | 112k | 56% |
| After compact | 32k | 16% |
| — of which: messages | 11.9k | 6.0% |

The end result is nearly the same size (~32k tokens). But those 11.9k of messages aren't a lossy auto-summary — they're the items **you reviewed and approved**, structured to resume the session exactly where you left off.

### The Bottom Line

Both approaches produce a similarly-sized compacted session. The difference is what fills it:

- **Without `/nicotine`** — Claude picks what to keep, heuristically, with no guarantee the important stuff survives.
- **With `/nicotine`** — You pick what to keep. Goals, bugs, decisions, feedback, and next steps — all present, because you put them there.

---

## Under the Hood

Nicotine auto-installs a Stop hook on every run, so it works on any machine without manual setup.

- **Stage 1** — After `/nicotine` finishes, the hook detects a trigger file, clears it, and uses `osascript` to type `/compact` + Enter into your terminal.
- **Stage 2** — After `/compact` completes, the hook overwrites the session JSONL with your curated summary and deletes all temp files.

Everything cleans up after itself automatically.
