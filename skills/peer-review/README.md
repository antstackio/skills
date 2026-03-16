# peer-review

Generate evidence-backed peer reviews using real collaboration data from GitHub, GitLab, Slack, and Jira. Replaces vague platitudes with specific, cited observations — automatically pulled from your team's tools.

## Usage

Install via:

```bash
npx skills add antstackio/skills --skill peer-review
```

Then ask the agent:

- "Write a peer review for @alice"
- "Help me review John for Q1 2026"
- "I need to fill out a performance review"
- "Draft 360 feedback for my teammate"

The skill checks which integrations are available, walks you through setup for any that are missing, asks five clarifying questions, then pulls live data and generates a structured, evidence-backed review.

## Features

- **Tiered access** — works with any combination of GitHub/GitLab, Jira, and Slack; degrades gracefully when sources are missing
- **Auto MCP setup** — detects missing integrations and configures them automatically (with your confirmation)
- **External / contractor mode** (`--external`) — Jira-first flow, GitHub optional, Slack skipped
- **GitLab support** (`--gitlab`) — full MR review data in place of GitHub PRs
- **Jira-Hub mode** — extracts PR data via Jira's dev-status API when GitHub/GitLab MCP isn't available
- **Manual paste fallback** (`--paste`) — works without any MCP, using copy-pasted exports
- **Tone control** — Critical, Neutral, or Soft; growth areas are always included regardless of tone
- **Rating format** — X/10 per question with specific gap analysis and actionable "to reach 10" guidance

## Access Tiers

| Tier | Sources | Coverage |
|------|---------|----------|
| Full | GitHub/GitLab + Slack + Jira | ~100% |
| GitHub-only | GitHub/GitLab + Jira, no Slack | ~80% |
| Jira-Hub | Jira only | ~60–70% |
| Minimal | Manual paste | User-provided |

## Flags

| Flag | Description |
|------|-------------|
| `--external` | External/contractor mode: Jira-first, GitHub optional, Slack skipped |
| `--paste` | Skip all MCP setup; show manual paste templates for all sources |
| `--gitlab` | Use GitLab MCP instead of GitHub MCP |

## What the Agent Evaluates

Beyond the review form questions, the skill always surfaces:

- **Code review participation** — PRs reviewed vs. authored ratio; substantive vs. rubber-stamp reviews
- **Codebase breadth** — siloed vs. cross-functional contribution patterns
- **PR quality habits** — descriptions, linked tickets, appropriate scope
- **Fix-on-fix patterns** — multiple patches to the same area within days
- **Proactive contribution** — work outside assigned scope, unblocking teammates
- **Stale work** — open PRs or In Progress tickets with no movement

## Prerequisites

At least one of the following:

- **GitHub MCP** — `@modelcontextprotocol/server-github` with a PAT (scopes: `public_repo`, `read:user`)
- **GitLab MCP** — `@modelcontextprotocol/server-gitlab` with a PAT (scopes: `read_api`, `read_user`)
- **Jira MCP** — `mcp-atlassian` with an Atlassian API token
- **Slack MCP** — `@modelcontextprotocol/server-slack` with a Bot Token (requires workspace admin)

The skill will walk you through setup for any missing source when triggered.

## Portable Prompt

`references/universal-prompt.md` contains the core logic as a standalone prompt — paste it into Cursor `.cursorrules`, Windsurf system prompt, GitHub Copilot instructions, or any AI assistant.
