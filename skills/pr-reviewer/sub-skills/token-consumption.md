# Sub-Skill: Token Consumption Tracking

## File patterns
Applies to: all reviews (post-review step, not per-file).

---

## Token Estimation

**Rule:** 1 token ≈ 4 bytes. This is a rough estimate — code and non-English text may vary ±20%.

### Input tokens

| Source | How to estimate |
|---|---|
| PR diff | `wc -c < /tmp/pr-review/diff.txt` ÷ 4 |
| PR metadata | `wc -c < /tmp/pr-review/metadata.json` ÷ 4 |
| PR template | `wc -c < /tmp/pr-review/pr-template.md` ÷ 4 |
| Existing comments | `wc -c < /tmp/pr-review/comments.txt` ÷ 4 |
| SKILL.md | `wc -c < SKILL.md` ÷ 4 (relative to skill directory) |
| Review checklist | `wc -c < checklists/review-template.md` ÷ 4 |
| Loaded sub-skills | Sum `wc -c` of each loaded sub-skill file ÷ 4 |
| Source files read | Sum `wc -c` of each source file read during review ÷ 4 |

### Output tokens

| Source | How to estimate |
|---|---|
| Review payload | `wc -c < /tmp/pr-review/payload.json` ÷ 4 |
| Conversation summary | ~200 tokens |

### Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|---|---|---|
| Claude Sonnet 4.6 | $3 | $15 |
| Claude Opus 4.6 | $15 | $75 |

---

## Calculation

Run after review analysis is complete, before posting:

```bash
DIFF_BYTES=$(wc -c < /tmp/pr-review/diff.txt 2>/dev/null || echo 0)
META_BYTES=$(wc -c < /tmp/pr-review/metadata.json 2>/dev/null || echo 0)
TMPL_BYTES=$(wc -c < /tmp/pr-review/pr-template.md 2>/dev/null || echo 0)
COMMENTS_BYTES=$(wc -c < /tmp/pr-review/comments.txt 2>/dev/null || echo 0)
```

For skill files (SKILL.md, checklist, loaded sub-skills), sum their byte counts from the skill directory. Sum all input bytes, divide by 4 for total input tokens. Do the same for output.

---

## Severity Thresholds

- ℹ️ Info: Total < 50,000 tokens — normal review
- 🟡 Warning: Total 50,000–150,000 tokens — large review, consider splitting the PR
- 🔴 Critical: Total > 150,000 tokens — strongly recommend splitting
