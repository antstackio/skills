# Sub-Skill: Token Consumption Tracking

## File patterns
Applies to: all reviews. This sub-skill runs as a post-review step, not per-file. It calculates and reports the total token consumption of the PR review process.

---

## Purpose

Track how many tokens the PR review consumed across all phases so the team can monitor cost and optimize review prompts over time.

---

## Token Estimation Rules

### Input tokens (what Claude reads)

Count approximate tokens for each input source. Use the rule of thumb: **1 token ≈ 4 characters** (English text/code).

| Source | How to estimate |
|---|---|
| PR diff (`diff.txt`) | `wc -c /tmp/pr-review/diff.txt` ÷ 4 |
| PR metadata (`metadata.json`) | `wc -c /tmp/pr-review/metadata.json` ÷ 4 |
| PR template (`pr-template.md`) | `wc -c /tmp/pr-review/pr-template.md` ÷ 4 |
| Existing comments (`comments.txt`) | `wc -c /tmp/pr-review/comments.txt` ÷ 4 |
| SKILL.md (system prompt) | `wc -c .claude/pr-reviewer/SKILL.md` ÷ 4 |
| Review template checklist | `wc -c .claude/pr-reviewer/checklists/review-template.md` ÷ 4 |
| Loaded sub-skill files | Sum `wc -c` of each loaded sub-skill ÷ 4 |
| Source files read during review | Sum `wc -c` of each file read ÷ 4 |

### Output tokens (what Claude writes)

| Source | How to estimate |
|---|---|
| Review payload (`payload.json`) | `wc -c /tmp/pr-review/payload.json` ÷ 4 |
| Conversation summary | Estimate ~200 tokens for the Step 7 summary |

### Cost estimation

Use current Claude API pricing to estimate cost. Report in both tokens and approximate USD.

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|---|---|---|
| Claude Sonnet 4.6 | $3 | $15 |
| Claude Opus 4.6 | $15 | $75 |

---

## Calculation Steps

After the review is complete (after Step 6, before Step 7), run:

```bash
# Calculate byte counts for all input sources
DIFF_BYTES=$(wc -c < /tmp/pr-review/diff.txt 2>/dev/null || echo 0)
META_BYTES=$(wc -c < /tmp/pr-review/metadata.json 2>/dev/null || echo 0)
TMPL_BYTES=$(wc -c < /tmp/pr-review/pr-template.md 2>/dev/null || echo 0)
COMMENTS_BYTES=$(wc -c < /tmp/pr-review/comments.txt 2>/dev/null || echo 0)
SKILL_BYTES=$(wc -c < .claude/pr-reviewer/SKILL.md 2>/dev/null || echo 0)
CHECKLIST_BYTES=$(wc -c < .claude/pr-reviewer/checklists/review-template.md 2>/dev/null || echo 0)
```

Then sum all input bytes, divide by 4 for token estimate. Do the same for output.

---

## Reporting Format

Append a **Token Consumption** section to the Step 7 conversation summary:

```
📊 Token Consumption Estimate
   Input:  ~XX,XXX tokens ($X.XX at Sonnet / $X.XX at Opus)
   Output: ~XX,XXX tokens ($X.XX at Sonnet / $X.XX at Opus)
   Total:  ~XX,XXX tokens ($X.XX at Sonnet / $X.XX at Opus)

   Breakdown:
   - PR diff:        ~XX,XXX tokens (XX%)
   - Source files:    ~XX,XXX tokens (XX%)
   - Sub-skills:     ~XX,XXX tokens (XX%)
   - Skill/template: ~XX,XXX tokens (XX%)
   - PR metadata:    ~XX,XXX tokens (XX%)
   - Review output:  ~XX,XXX tokens (XX%)
```

---

## Severity Thresholds

- ℹ️ Info: Total < 50,000 tokens — normal review
- 🟡 Warning: Total 50,000–150,000 tokens — large review, consider splitting the PR
- 🔴 Critical: Total > 150,000 tokens — very expensive review, strongly recommend splitting

---

## Tips for Reducing Token Consumption

- Split large PRs into smaller, focused ones
- Avoid reviewing generated files (lock files, build output, bundled code)
- Exclude files from diff that don't need review (e.g., `*.lock`, `*.snap`)
- Use `--name-only` to skip reading files that are clearly out of scope
