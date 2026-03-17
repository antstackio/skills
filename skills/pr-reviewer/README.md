# PR Reviewer

An AI skill that reviews GitHub pull requests using the `gh` CLI. It fetches the diff, runs modular sub-skill checks based on the tech stack, posts inline comments on specific lines, and adds an overall summary comment with flags, a merged checklist, and token consumption estimates.

## Features

- **Auto-detection of tech stack** — classifies changed files and loads relevant sub-skills (TypeScript, AWS SAM, DynamoDB, SQL, general)
- **Inline code comments** — posts comments on specific lines with severity levels (Critical, Warning, Suggestion)
- **PR flags** — instant visibility into PR size, complexity, security risks, database/infra changes, missing tests, and breaking changes
- **Checklist merging** — merges the repo's own PR template checklist with the skill's review checklist, deduplicating items
- **Token consumption tracking** — estimates and reports input/output tokens and cost at Sonnet/Opus pricing
- **Extensible** — add new stack support by creating a sub-skill file and mapping file patterns

## Usage

```
/pr-reviewer 123
/pr-reviewer https://github.com/org/repo/pull/123
```

Or simply ask: "review PR #123", "check the diff on my PR", "do a code review".

## Prerequisites

- **gh CLI** — installed and authenticated (`gh auth login` with `repo` and `read:org` scopes)

## How It Works

1. **Fetch** — runs `scripts/fetch-pr.sh` to gather PR metadata, diff, changed files, PR template, and existing comments
2. **Merge checklist** — combines the repo's PR template checklist with `checklists/review-template.md`
3. **Classify files** — maps changed files to sub-skills (TypeScript, AWS SAM, DynamoDB, SQL, general)
4. **Compute flags** — PR size, complexity, security, database/infra changes, deps, breaking changes, missing tests
5. **Detailed review** — applies sub-skill checklists to each file, recording file path, line number, severity, and fix suggestion
6. **Token estimation** — calculates token consumption for the entire review
7. **Post to GitHub** — writes a review payload and posts via `scripts/post-review.sh` with inline comments and an overall summary
8. **Chat summary** — prints a concise summary with flags, top issues, and token costs

## Structure

```
pr-reviewer/
├── SKILL.md                        # Main skill prompt
├── README.md                       # This file
├── metadata.json                   # Skill metadata
├── checklists/
│   └── review-template.md          # Default review checklist
├── scripts/
│   ├── fetch-pr.sh                 # Fetches PR data via gh CLI
│   └── post-review.sh              # Posts review comment via gh API
└── sub-skills/
    ├── _TEMPLATE.md                # Template for adding new sub-skills
    ├── typescript.md               # TypeScript/JavaScript checks
    ├── aws-sam.md                  # AWS SAM/CloudFormation checks
    ├── dynamodb.md                 # DynamoDB design and usage checks
    ├── sql-databases.md            # SQL, migrations, ORM checks
    ├── general.md                  # Security, error handling, logging
    └── token-consumption.md        # Token usage estimation
```

## Extensible by Design

This skill is built to be extended. Reviews are powered by modular **sub-skills** — each one a focused checklist for a specific tech stack. The skill auto-detects which sub-skills to load based on the files changed in a PR, so you only get checks relevant to your stack.

Out of the box it ships with sub-skills for TypeScript, AWS SAM/CloudFormation, DynamoDB, SQL/ORMs, and general best practices. But the real power is adding your own — if your team uses Python, Terraform, Go, React Native, or anything else, you can plug in a custom sub-skill in minutes.

### Adding a custom sub-skill

1. Copy `sub-skills/_TEMPLATE.md` to `sub-skills/your-stack.md`
2. Define your checklist items, patterns to look for, and severity levels
3. Add file patterns to the classification table in SKILL.md (Step 3) to map file types to your new sub-skill
4. That's it — the new sub-skill is picked up automatically on the next review

## Testing Instructions

1. Fork the repo and create a test PR with code changes (TypeScript files, SAM templates, etc.)
2. Run `/pr-reviewer <PR_NUMBER>` in your AI assistant
3. Verify that:
   - The correct sub-skills are loaded based on changed file types
   - Inline comments are posted on the correct lines with appropriate severity
   - The overall comment includes flags, merged checklist, summary, and token consumption
   - The chat summary matches the posted review
