---
name: pr-reviewer
description: Review pull requests from GitHub using the gh CLI with structured checklists and inline code comments. Use this skill whenever the user asks to review a PR, review code changes, check a diff, do a code review, or mentions "PR review". Also trigger when the user provides a PR number/URL or says "review #123". This skill fetches the PR via gh CLI, reads the repo's PR template, merges it with the skill's own checklist, runs sub-skill checks (TypeScript, AWS SAM, DynamoDB, SQL, general), posts inline review comments on specific lines, and adds an overall PR comment with a checklist, flags, and summary.
argument-hint: "<pr-number-or-url>"
user-invocable: true
---

# PR Reviewer Skill

Review pull requests via `gh` CLI. Fetches the diff, reads the repo's PR template, runs modular sub-skill checks, posts inline comments on code, and adds an overall summary comment with flags.

## Prerequisites

### 1. Check if `gh` CLI is installed

```bash
command -v gh
```

- If **not installed**, detect the platform and install it:
  - **macOS**: `brew install gh`
  - **Debian/Ubuntu**: `sudo apt install gh` (or follow https://github.com/cli/cli/blob/trunk/docs/install_linux.md)
  - **Windows (WSL)**: `sudo apt install gh`
  - **Other**: Tell the user to install from https://cli.github.com/ and retry
- If the install command fails (e.g. Homebrew or apt not available), provide the manual install link and stop.

### 2. Check if `gh` CLI is authenticated

```bash
gh auth status
```

- If **not authenticated**, prompt the user to run `gh auth login` and walk them through it:
  1. Run `gh auth login`
  2. Select **GitHub.com** (or GitHub Enterprise if applicable)
  3. Choose authentication method (browser or token)
  4. Confirm scopes include `repo` and `read:org`
- After login completes, re-run `gh auth status` to verify before proceeding.

---

## Step-by-step review process

### Step 1: Fetch PR data

The user provides one of:
- A PR number: `#123` or just `123`
- A PR URL: `https://github.com/org/repo/pull/123`
- "review my PR" (when inside a repo with one open PR by the user)

Run the fetch script to gather all PR data in parallel:
```bash
.claude/pr-reviewer/scripts/fetch-pr.sh <PR_NUMBER_OR_URL>
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

### Step 2: Merge PR template with review checklist

Read the fetched PR template:
```bash
cat /tmp/pr-review/pr-template.md
```

**Merging logic:**
- If a PR template has checklist items (`- [ ]`), extract them
- Group by their heading/category if headings exist
- Merge with the skill's checklist from `checklists/review-template.md`:
  - Template items go first under a **"Team Checklist"** section
  - Skill items follow, but skip any that duplicate a template item (match by meaning, not exact wording)
- If no PR template exists (`NO_PR_TEMPLATE`), use only the skill's checklist

### Step 3: Classify changed files and load sub-skills

Classify each changed file and read ONLY the relevant sub-skill files:

| File pattern | Sub-skill |
|---|---|
| `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.config.*`, `*.test.*`, `*.spec.*`, `package.json`, `tsconfig.json` | `sub-skills/typescript.md` |
| `template.yaml`, `template.yml`, `samconfig.*`, `serverless.yml`, `*.yaml`/`*.yml` (CloudFormation) | `sub-skills/aws-sam.md` |
| DynamoDB client code or table defs in CFN/SAM | `sub-skills/dynamodb.md` |
| `*.sql`, `*migration*`, `*schema*`, `*.prisma`, `*knexfile*`, `*drizzle*`, `*typeorm*`, RDS/Aurora in CFN | `sub-skills/sql-databases.md` |
| Everything else, `Dockerfile`, `docker-compose*` | `sub-skills/general.md` |

A TypeScript file with DynamoDB operations loads both `typescript.md` and `dynamodb.md`. Same for SQL/ORM code. Multiple sub-skills can apply to one file.

Available sub-skills:
- `sub-skills/typescript.md` — TS/JS code quality, async patterns, type safety
- `sub-skills/aws-sam.md` — SAM, CloudFormation, serverless infra
- `sub-skills/dynamodb.md` — DynamoDB table design, client code, capacity
- `sub-skills/sql-databases.md` — SQL migrations, ORMs, RDS/Aurora, queries
- `sub-skills/general.md` — Security, error handling, logging, dependencies
- `sub-skills/token-consumption.md` — Token usage estimation (always loaded, runs after Step 6)

### Step 4: Compute PR flags

Before detailed review, compute flags. These go at the top of the overall comment for instant visibility.

| Flag | Condition | Label |
|---|---|---|
| 📏 PR Size | additions + deletions | `XS` (<50), `S` (<200), `M` (<500), `L` (<1000), `XL` (≥1000) |
| 🧠 Cognitive Complexity | Any function with complexity >10 | `⚠️ HIGH COMPLEXITY` + function names |
| ⏱️ Time Complexity | Any algorithm worse than O(n log n) that could be better | `⚠️ PERF RISK` + locations |
| 🗄️ Database Changes | Migration files, schema changes, DynamoDB table defs | `⚠️ DB CHANGES` |
| ☁️ Infra Changes | SAM/CFN template changes | `⚠️ INFRA CHANGES` + resources added/modified/deleted |
| 🔐 Security | Secrets, IAM changes, auth changes | `🔴 SECURITY REVIEW NEEDED` |
| 📦 Deps Changed | `package.json` or lock file changes | `⚠️ DEPS CHANGED` + new/removed |
| 🔄 Breaking Changes | API contract changes, removed exports | `🔴 BREAKING CHANGE` |
| 🧪 Missing Tests | New logic without test files changed | `⚠️ MISSING TESTS` |

### Step 5: Run detailed review

For each changed file, apply sub-skill checklists. For every issue:
1. Record **file path** and **line number** (line in the new file, not old)
2. Assign **severity**: 🔴 Critical, 🟡 Warning, 🔵 Suggestion
3. Write a **concise comment** — one-liner issue + concrete fix

Keep comments short and actionable. One issue per comment. No essays.

### Step 6: Calculate token consumption

**Always run this step before posting.** Follow `sub-skills/token-consumption.md` to estimate total tokens consumed by the review.

Calculate byte counts for all inputs (diff, metadata, template, comments, SKILL.md, checklist, loaded sub-skills, source files read). Convert bytes → tokens (÷ 4). Estimate the output payload size (~200–500 tokens for inline comments + body). Estimate cost at both Sonnet and Opus pricing.

Save the token consumption results — they will be included in both the GitHub review comment (Step 7) and the conversation summary (Step 8).

### Step 7: Post review to GitHub

Build the review payload JSON and write it to `/tmp/pr-review/payload.json`.

The `body` field must include the overall comment **with the token consumption section appended at the end** (see "Overall comment format" below for the full template).

```json
{
  "event": "COMMENT",
  "body": "<overall comment with flags + checklist + summary + token consumption>",
  "comments": [
    {
      "path": "src/handlers/orderHandler.ts",
      "line": 42,
      "body": "🟡 **Complexity** — ~18 branches here. Extract validation into `validateOrderItem()`."
    },
    {
      "path": "src/services/userService.ts",
      "line": 87,
      "body": "🟡 **Perf** — `await` in loop. Use `Promise.all(ids.map(id => getUser(id)))`."
    },
    {
      "path": "template.yaml",
      "line": 55,
      "body": "🔴 **IAM** — `Resource: \"*\"` with `dynamodb:*`. Scope to `!GetAtt OrdersTable.Arn`."
    }
  ]
}
```

Write the payload and post it using the script:
```bash
# Write payload to file (Claude generates this from analysis)
cat > /tmp/pr-review/payload.json << 'REVIEW_JSON'
{ ... payload ... }
REVIEW_JSON

# Post the review and clean up
.claude/pr-reviewer/scripts/post-review.sh <PR_NUMBER>
```

The script validates the JSON, resolves the repo, posts the review via `gh api`, prints the review URL, and cleans up the payload file.

**Inline comment rules:**
- `line` = line number in the **new file** (right side of diff)
- For multi-line issues, use `start_line` + `line` for a range
- Keep each comment body ≤3 lines
- One issue per comment

### Step 8: Conversation summary

After posting to GitHub, print a concise summary in the chat. The token consumption is already included in the GitHub review comment — repeat it here for quick visibility.

```
✅ Review posted to PR #123 (https://github.com/org/repo/pull/123)

Flags: 📏 M (347 lines) | 🧠 HIGH COMPLEXITY (2 fn) | 🗄️ DB CHANGES | 📦 DEPS CHANGED

Posted 7 inline comments: 🔴 1 | 🟡 4 | 🔵 2

Top issues:
1. IAM Resource: * on DynamoDB policy — scope to table ARN
2. processOrder() complexity ~18 — extract to helpers
3. Sequential awaits in userService — use Promise.all

📊 Token Consumption Estimate
   Input:  ~45,200 tokens ($0.14 at Sonnet / $0.68 at Opus)
   Output: ~3,800 tokens ($0.06 at Sonnet / $0.29 at Opus)
   Total:  ~49,000 tokens ($0.20 at Sonnet / $0.97 at Opus)
```

Keep it short. The detail is in the GitHub comments.

---

## Overall comment format (posted to PR)

```markdown
## 🔍 PR Review

### Flags
📏 **M** (347 lines) | 🧠 **Complexity:** `processOrder`, `validateInput` | 🗄️ **DB Changes** | 📦 **Deps Changed**

### Checklist

#### Team Checklist
- ✅ Unit tests added
- ❌ Documentation updated — README missing new env var `CACHE_TTL`
- ➖ N/A — No UI changes

#### Security
- ✅ No hardcoded secrets
- ❌ IAM `Resource: *` in template.yaml L55

#### Code Quality
- ❌ Cognitive complexity >15 in `processOrder` (orderHandler.ts:42)

... (skip all-pass sections — only show sections with findings) ...

### Summary
🔴 1 critical | 🟡 4 warnings | 🔵 2 suggestions

**Risk:** Medium — IAM scope needs tightening before merge.

---

### 📊 Token Consumption Estimate

| Source | Tokens | % |
|---|---|---|
| PR diff | ~XX,XXX | XX% |
| Sub-skills | ~X,XXX | XX% |
| Skill/template/checklist | ~X,XXX | XX% |
| PR metadata | ~X,XXX | XX% |
| Review output | ~X,XXX | XX% |

| | Tokens | Sonnet | Opus |
|---|---|---|---|
| Input | ~XX,XXX | $X.XX | $X.XX |
| Output | ~X,XXX | $X.XX | $X.XX |
| **Total** | **~XX,XXX** | **$X.XX** | **$X.XX** |
```

**Principles for the overall comment:**
- Flags first — instant signal
- Team checklist items first — respect the team's own checks
- Skip all-pass sections — only show sections with findings
- One line per checklist item — scannable
- One-sentence risk assessment at the end
- Token consumption always at the end — cost visibility for the team

---

## Extending this skill

To add a new stack (Python, Terraform, Databricks, etc.):

1. Create `sub-skills/your-stack.md` using `sub-skills/_TEMPLATE.md`
2. Add file patterns to the table in Step 3
3. It's picked up automatically on next review

---

## Review principles

- **Concise** — 2-3 lines max per inline comment
- **Actionable** — always suggest a fix
- **Proportionate** — don't nitpick style when there are security issues
- **Respectful** — acknowledge good patterns, frame constructively
- **Context-aware** — prototype PRs get lighter scrutiny than production deploys
