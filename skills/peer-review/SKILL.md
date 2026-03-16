---
name: peer-review
description: Generate evidence-backed peer reviews using real collaboration data from GitHub, Slack, and Jira. Use when the user wants to write a peer review, performance review, or 360 feedback for a colleague.
---

# Peer Review Skill

## Trigger

Auto-activate when the user expresses intent to write a peer review. Trigger phrases include:
- "write a peer review for..."
- "help me review [person]"
- "I need to fill out a performance review"
- "peer feedback for..."
- "360 review"
- "help me with my peer review"
- "draft a review for..."

---

## Skill Instructions

When triggered, follow this exact sequence:

### Phase 0: MCP Readiness Check

Before asking clarification questions, silently check which MCPs are available:
- GitHub MCP: attempt `search_pull_requests` or `list_repositories` — if it fails, mark GitHub as unavailable
- Slack MCP: attempt a basic list/search call — if it fails, mark Slack as unavailable
- Jira/Atlassian MCP: attempt a basic search — if it fails, mark Jira as unavailable

If ANY MCP is missing or failing, include a setup section in your FIRST response (before the clarification questions):

```
## MCP Setup Check

To generate evidence-backed reviews, I need access to your collaboration tools.
Here's what I found:

| Source  | Status  | What I can pull |
|---------|---------|-----------------|
| GitHub  | ✅ / ❌  | PR reviews, comments, co-authored commits |
| Slack   | ✅ / ❌  | Messages, @mentions, shared threads |
| Jira    | ✅ / ❌  | Shared tickets, comments, sprint data |

[For each ❌ source, include the setup instructions below]
```

**GitHub MCP setup** (if missing):
```
GitHub MCP is not configured. To enable it:

1. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: repo, read:user, read:org
   - Copy the token

2. I can add this to your Claude Code MCP settings automatically.
   Just confirm: should I configure GitHub MCP now? (yes/no)

   Or add it manually to ~/.claude/settings.json:
   {
     "mcpServers": {
       "github": {
         "type": "stdio",
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-github"],
         "env": {
           "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
         }
       }
     }
   }
```

**Slack MCP setup** (if missing):
```
Slack MCP is not configured. To enable it:

1. I can add Slack MCP to your Claude Code settings automatically.
   Confirm: should I configure Slack MCP now? (yes/no)

   Or add manually to ~/.claude/settings.json:
   {
     "mcpServers": {
       "slack": {
         "type": "stdio",
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-slack"],
         "env": {
           "SLACK_BOT_TOKEN": "xoxb-your-token",
           "SLACK_TEAM_ID": "T0000000000"
         }
       }
     }
   }

   To get your Slack Bot Token:
   - Go to https://api.slack.com/apps → Create New App
   - Add OAuth scopes: channels:history, channels:read, groups:history,
     groups:read, im:history, im:read, mpim:history, search:read, users:read
   - Install to workspace → copy Bot User OAuth Token
```

**Jira MCP setup** (if missing):
```
Jira MCP is not configured. To enable it:

1. Create a Jira API token:
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token" → give it a name → copy the token

2. I can add Jira MCP to your Claude Code settings automatically.
   Confirm: should I configure Jira MCP now? (yes/no)

   If yes, I'll also need:
   - Your Jira URL (e.g., https://your-org.atlassian.net)
   - Your Atlassian email address

   Or add manually to ~/.claude/settings.json:
   {
     "mcpServers": {
       "jira": {
         "type": "stdio",
         "command": "npx",
         "args": ["-y", "mcp-atlassian"],
         "env": {
           "JIRA_URL": "https://your-org.atlassian.net",
           "JIRA_USERNAME": "your@email.com",
           "JIRA_API_TOKEN": "your-api-token"
         }
       }
     }
   }
```

**Automatic setup**: If the user says "yes" to auto-configure any MCP:
1. Ask for the required credentials (token, URL, email as needed)
2. Read `~/.claude/settings.json` (create if it doesn't exist)
3. Add the MCP server block to the `mcpServers` section
4. Write the updated config back
5. Inform the user: "Done. You'll need to restart Claude Code for the MCP to activate."
6. Offer to proceed with available sources in the meantime

After showing setup info, continue to Phase 1 regardless. Setup is not a blocker — proceed with whatever is available.

---

### Phase 1: Clarification Questions

Ask all five questions in a single message. Do NOT pull data until answers are received.

```
To generate your peer review, I need a few details:

**1. Who are you reviewing?**
   - Full name (as it appears in the review form)
   - GitHub username (@handle)
   - Jira email address
   - Slack display name

**2. What is the review period?**
   (e.g., "Q1 2026" / "Jan–Mar 2026" / "last 6 months")

**3. Where did they work?**
   - GitHub repo (e.g., `org/repo-name`)
   - Jira project key (e.g., `PROJ`) — if unsure, I can look it up
   - Skip either if that source isn't used

**4. Paste your company's review questions** (numbered list):
   — Skip to use defaults: Collaboration, Technical Skills, Communication,
     Reliability & Ownership, Growth & Learning

**5. Scrutiny level:**
   a) Strict — flag everything: minor patterns, small gaps, one-off incidents
   b) Balanced — significant patterns and clear gaps only *(recommended)*
   c) High-level — top 2–3 most impactful observations only
```

---

### Phase 2: Data Collection

After receiving answers, announce what you're pulling:

```
Gathering collaboration data for [Name] during [Period]...
```

Then execute in parallel where possible:

**GitHub** (if available + repo provided):
- Search reviewee's PRs: `author:@{reviewee} repo:{repo} created:{start}..{end}` — title, status, labels, merge date, files changed count
- For each PR, check review outcomes (APPROVED / CHANGES_REQUESTED, round count) — surfaces review-quality signal
- Fetch up to 400–500 PRs for the period. If the result set is larger, ask the user whether to narrow the date range or focus on a specific area.
- Do NOT fetch full PR diffs or body text unless a specific question requires it.

**Slack** (if available):
- Only pull if a review question explicitly covers communication or collaboration
- Search messages by reviewee in the period; look for @mentions, threads, kudos

**Jira** (if available + project key provided):
- `assignee = "{email}" AND project = {KEY} AND updated >= "{start}"` — assigned tickets
- `reporter = "{email}" AND project = {KEY} AND updated >= "{start}"` — filed tickets
- Fields per ticket: summary, type, status, priority, created, updated only. No full descriptions or comments unless a question specifically requires it.
- Fetch up to 400–500 tickets for the period. If larger, ask the user whether to narrow scope.

**What NOT to pull:**
- Full PR diffs
- All comments on all PRs (only review outcomes)
- Tickets outside the specified project
- Personal/unrelated repos
- More than 30 items from any single query

For each unavailable source, state:
```
⚠️ [Source] unavailable — skipping automated pull.
   You can paste [GitHub CSV / Slack export / Jira ticket list] if you have it.
```

---

### Phase 3: Generate Review

Use the format from `references/universal-prompt.md`:

```markdown
## Peer Review: [Name] | [Period] | Scrutiny: [Strict/Balanced/High-level]

### [Question 1]
[Evidence-backed answer with citations: PR #, ticket ID, date, Slack context]

### [Question 2]
[...]

...

### Strengths
- **[Strength]**: [Specific example with citation]
- **[Strength]**: [Specific example with citation]

### Growth Areas  ← Always present
- **[Constructive point]**: [Evidence or observed gap]
- **[Constructive point]**: [Evidence or observed gap]

---
*Data sources: GitHub ([N] PRs, [N] comments) | Slack ([N] messages) | Jira ([N] tickets)*
*Missing data: [any gaps]*
```

**Scrutiny enforcement**:
- Strict: 3+ growth areas. Flag minor patterns, repeated and one-off issues, style concerns.
- Balanced: 2 growth areas. Only recurring issues or clear-impact gaps. Skip isolated one-offs.
- High-level: 1–2 growth areas. Most impactful findings only. Omit minor details entirely.

Language stays professional across all levels. Scrutiny level controls what gets flagged, not wording.

**Never**:
- Write vague praise without citations ("great collaborator" → cite actual PRs/tickets)
- Skip growth areas in any tone
- Soften a factual finding into meaninglessness
- Hallucinate data — if evidence is absent, say so

---

## Reference

Core logic lives in: `references/universal-prompt.md`
That file is portable to Cursor, Windsurf, Copilot, or any AI assistant.
