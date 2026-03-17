---
name: pr-reviewer
description: Review pull requests from GitHub using the gh CLI with structured checklists and inline code comments. Use this skill whenever the user asks to review a PR, review code changes, check a diff, do a code review, or mentions "PR review". Also trigger when the user provides a PR number/URL or says "review #123". This skill fetches the PR via gh CLI, reads the repo's PR template, merges it with the skill's own checklist, runs sub-skill checks (TypeScript, AWS SAM, DynamoDB, SQL, general), posts inline review comments on specific lines, and adds an overall PR comment with a checklist, flags, and summary.
argument-hint: "<pr-number-or-url>"
user-invocable: true
---

# PR Reviewer Skill

Review pull requests via `gh` CLI. Fetches the diff, reads the repo's PR template, runs modular sub-skill checks, posts inline comments on code, and adds an overall summary comment with flags.

## Prerequisites

Verify `gh` CLI is installed (`command -v gh`) and authenticated (`gh auth status`). If either check fails, tell the user what to install/run and stop.

---

## Step-by-step review process

### Step 1: Fetch PR data

The user provides one of:
- A PR number: `#123` or just `123`
- A PR URL: `https://github.com/org/repo/pull/123`
- "review my PR" (when inside a repo with one open PR by the user)

Run the fetch script to gather all PR data in parallel:
```bash
scripts/fetch-pr.sh <PR_NUMBER_OR_URL>
```

This creates `/tmp/pr-review/` with:
- `metadata.json` — PR title, body, author, branches, additions/deletions
- `diff.txt` — Full diff
- `changed-files.txt` — List of changed file paths
- `pr-template.md` — Repo's PR template (or `NO_PR_TEMPLATE`)
- `comments.txt` — Existing review comments

Then read the fetched files:
```bash
cat /tmp/pr-review/metadata.json
cat /tmp/pr-review/diff.txt
cat /tmp/pr-review/changed-files.txt
```

### Step 2: Build review checklist

Read the fetched PR template and the skill's checklist:
```bash
cat /tmp/pr-review/pr-template.md
```

Build a combined internal checklist to guide Step 5. This checklist is NOT posted — it drives what you look for during review.

**Merging logic:**
- If a PR template has checklist items (`- [ ]`), extract them and include them in the internal checklist
- Merge with the skill's checklist from `checklists/review-template.md`, skipping any item the template already covers (same category + same scope). When in doubt, keep both.
- If no PR template exists (`NO_PR_TEMPLATE`), use only the skill's checklist

### Step 3: Classify changed files and load sub-skills

Classify each changed file by matching file path patterns and read ONLY the relevant sub-skill files:

| File pattern | Sub-skill |
|---|---|
| `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.mjs`, `*.cjs`, `*.config.ts`, `*.config.js`, `*.test.*`, `*.spec.*`, `package.json`, `tsconfig.json` | `sub-skills/typescript.md` |
| `template.yaml`, `template.yml`, `samconfig.*`, `serverless.yml`, `serverless.ts`, `cdk.json`, `*.template.json`, `*.template.yaml`, any YAML/JSON containing `AWSTemplateFormatVersion` or `Transform: AWS::Serverless` | `sub-skills/aws-sam.md` |
| Files importing from `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-dynamodb`, or using `DynamoDBClient`, `DocumentClient`, `DynamoDB.DocumentClient`; also YAML/JSON containing `AWS::DynamoDB::Table` or `AWS::Serverless::SimpleTable` | `sub-skills/dynamodb.md` |
| `*.sql`, `*migration*`, `*schema*`, `*seed*`, `*.prisma`, `*knexfile*`, `*drizzle*`, `*typeorm*`, `*sequelize*`; also files importing from `knex`, `prisma`, `typeorm`, `drizzle-orm`, `sequelize`; also YAML/JSON containing `AWS::RDS::` or `AWS::Aurora::` | `sub-skills/sql-databases.md` |
| All files (baseline layer): `Dockerfile`, `docker-compose*`, `.env*`, `.gitignore`, and any file not covered above | `sub-skills/general.md` |

Multiple sub-skills can apply to one file. A TypeScript file importing DynamoDB SDK loads both `typescript.md` and `dynamodb.md`.

### Step 4: Compute PR flags

Before detailed review, compute flags from the diff. These go at the top of the overall comment.

| Flag | Condition | Label |
|---|---|---|
| 📏 PR Size | additions + deletions | `XS` (<50), `S` (<200), `M` (<500), `L` (<1000), `XL` (≥1000) |
| 🧠 Cognitive Complexity | Any function with estimated complexity >10 (see `sub-skills/typescript.md` for counting method) | `⚠️ HIGH COMPLEXITY` + function names |
| ⏱️ Time Complexity | Any algorithm worse than O(n log n) that could be improved | `⚠️ PERF RISK` + locations |
| 🗄️ Database Changes | Migration files, schema changes, DynamoDB table defs | `⚠️ DB CHANGES` |
| ☁️ Infra Changes | SAM/CFN template changes | `⚠️ INFRA CHANGES` + resources added/modified/deleted |
| 🔐 Security | Secrets, IAM changes, auth changes | `🔴 SECURITY REVIEW NEEDED` |
| 📦 Deps Changed | `package.json` or lock file changes | `⚠️ DEPS CHANGED` + new/removed |
| 🔄 Breaking Changes | API contract changes, removed exports | `🔴 BREAKING CHANGE` |
| 🧪 Missing Tests | New logic without test files changed | `⚠️ MISSING TESTS` |

Only show flags that are triggered. Skip flags that don't apply.

### Step 5: Run detailed review

**Hard rule: Never skip a line of code.** Every added/modified line in the diff must be reviewed.

#### Chunking strategy

Review the diff **one file at a time**. For large diffs (>500 lines), chunk further — review each file in sections of ~200 lines.

For each file chunk:
1. Read the chunk carefully, line by line
2. Track findings in a **scratchpad** (a running list in `/tmp/pr-review/scratchpad.md`) before composing inline comments
3. Move to the next chunk only after the current one is fully reviewed

#### Scratchpad format

Append findings as you go:
```
## src/handlers/orderHandler.ts
- L42: 🟡 complexity ~18 — extract validation
- L67: 🔵 redundant await — already returns promise
- L89: 🟡 .find() inside loop — O(n²), use Set

## src/services/userService.ts
- L12: 🔵 unused import `lodash`
- L34: 🟡 3 levels of nesting — use early return
```

#### What to check on every line

For each added/modified line, check:
- **Imports:** unused imports, missing imports, circular dependencies, `import *` when specific members suffice
- **Nesting:** unnecessary nesting (>2 levels deep), missing early returns/guard clauses
- **Control flow:** cognitive complexity, missing else branches, switch without default
- **Types:** `any` usage, missing return types on exports, non-null assertions (`!`)
- **Async:** `await` in loops, missing `await`, fire-and-forget promises
- **Performance:** `.find()`/`.includes()` in loops, unnecessary re-renders, N+1 patterns
- **Security:** hardcoded secrets, unvalidated input, SQL injection vectors
- **Error handling:** empty catch blocks, swallowed errors, missing error context

Apply sub-skill checklists on top of these baseline checks.

#### Composing inline comments

After reviewing all chunks for a file, convert scratchpad entries into inline comments:
1. **file path** and **line number** (from `+` lines in the diff)
2. **severity**: 🔴 Critical, 🟡 Warning, 🔵 Suggestion
3. **concise comment** — one-liner issue + concrete fix

One issue per comment. Keep each comment ≤2 lines.

### Step 6: Calculate token consumption

**Always run this step before posting.** Follow `sub-skills/token-consumption.md` to estimate total tokens consumed by the review.

### Step 7: Post review to GitHub

Build the review payload JSON and write it to `/tmp/pr-review/payload.json`.

The **overall comment** (`body`) is a quick summary only — no per-file details. All specific findings go in **inline comments** on the relevant lines.

```json
{
  "event": "COMMENT",
  "body": "<overall summary — see format below>",
  "comments": [
    {
      "path": "src/handlers/orderHandler.ts",
      "line": 42,
      "body": "🟡 **Complexity** — ~18 branches. Extract validation into `validateOrderItem()`."
    }
  ]
}
```

**Overall comment format (summary only, no repeated details):**
```markdown
## 🔍 PR Review

📏 **M** (347 lines) | 🧠 **Complexity:** `processOrder`, `validateInput` | 📦 **Deps Changed**

🔴 1 critical | 🟡 4 warnings | 🔵 2 suggestions

**Risk:** Medium — IAM scope needs tightening before merge.

📊 ~49,000 tokens ($0.20 Sonnet / $0.97 Opus)
```

**Inline comment rules:**
- `line` = line number in the **new file** (right side of diff, from `+` lines)
- For multi-line issues, use `start_line` + `line` for a range
- Comments come from the scratchpad built in Step 5

Write the payload and post it:
```bash
cat > /tmp/pr-review/payload.json << 'REVIEW_JSON'
{ ... payload ... }
REVIEW_JSON

scripts/post-review.sh <PR_NUMBER>
```

### Step 8: Conversation summary

After posting, print a concise summary in the chat:

```
✅ Review posted to PR #123 (https://github.com/org/repo/pull/123)

📏 M (347 lines) | 🧠 HIGH COMPLEXITY (2 fn) | 🗄️ DB CHANGES
🔴 1 | 🟡 4 | 🔵 2 — 7 inline comments posted

Risk: Medium — IAM scope needs tightening before merge.
📊 ~49,000 tokens ($0.20 Sonnet / $0.97 Opus)
```

Keep it short. The detail is in the inline GitHub comments.

---

## Extending this skill

To add a new stack (Python, Terraform, Databricks, etc.):

1. Create `sub-skills/your-stack.md` using `sub-skills/_TEMPLATE.md`
2. Add file patterns to the table in Step 3
3. It's picked up automatically on next review

---

## Review principles

- **Exhaustive** — every line reviewed, no exceptions. Chunk large diffs, use the scratchpad, but never skip
- **Concise** — ≤2 lines per inline comment: issue + fix
- **Actionable** — always suggest a concrete fix
- **Proportionate** — flag severity accurately; don't nitpick style when there are security issues
- **Respectful** — acknowledge good patterns, frame constructively
