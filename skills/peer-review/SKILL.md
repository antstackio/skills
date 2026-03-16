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

## Flags

- `--external` — External/contractor mode: skip Slack setup, treat GitHub as optional, Jira-first
- `--paste` — Skip all MCP setup; show manual paste templates for all sources
- `--gitlab` — Use GitLab MCP instead of GitHub MCP for code review data

---

## Skill Instructions

When triggered, follow this exact sequence:

### Phase 0: Tiered Access Check

Before asking clarification questions, silently check which MCPs are available:
- GitHub MCP: attempt `search_pull_requests` or `list_repositories` — if it fails, mark GitHub as unavailable
- GitLab MCP: attempt a basic project list call — if it fails, mark GitLab as unavailable
- Slack MCP: attempt a basic list/search call — if it fails, mark Slack as unavailable
- Jira/Atlassian MCP: attempt a basic search — if it fails, mark Jira as unavailable

**Determine the access tier:**

| Tier | Condition | Coverage |
|------|-----------|----------|
| Full | GitHub/GitLab + Slack + Jira all available | ~100% |
| GitHub-only | GitHub/GitLab + Jira, no Slack | ~80% |
| Jira-Hub | Jira only (no GitHub/GitLab, no Slack) | ~60-70% |
| Minimal | Nothing available | User-provided only |

**Always show this table in your first response**, filling in the actual status:

```
## Data Source Setup

For the best review, I use collaboration tool data. Here's what I found:

| Source | Status | Effort to enable | What it adds |
|--------|--------|-----------------|--------------|
| Jira   | ✅/❌  | 2 min (API token) | Tickets, comments, linked PRs/commits |
| GitHub | ✅/❌  | 5-10 min (PAT)  | PR reviews, code comments, commits |
| GitLab | ✅/❌  | 5-10 min (PAT)  | MR reviews, code comments, commits |
| Slack  | ✅/❌  | 30+ min (Slack App) | Messages, @mentions, async comms |

Current tier: [Full / GitHub-only / Jira-Hub / Minimal]

⚡ **External or limited access?** Just Jira is enough for a solid review if your
   org uses GitHub for Jira or GitLab for Jira integration. (~60-70% coverage)
   Run with --external to skip Slack and treat GitHub as optional.
```

**If `--external` flag is used OR user indicates they are external / have limited tool access:**
Enter External Mode:
- Show Jira as **required** (run setup wizard below)
- Show GitHub/GitLab as **optional** — offer minimal-scope PAT instructions
- **Skip Slack entirely** — note it requires workspace admin; offer manual paste as alternative
- Ask: "Do you use GitLab instead of GitHub?" — if yes, switch to GitLab mode

**Setup instructions — show only for missing sources, in this order (Jira first):**

**Jira MCP setup** (if missing):
```
Jira MCP is not configured. To enable it (2 minutes):

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

**GitHub MCP setup** (if missing and NOT in external mode — or shown as optional in external mode):
```
GitHub MCP is not configured.
[In external mode: This is optional — Jira-Hub mode can cover ~60-70% without it.]

To enable it:
1. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Minimum scopes needed: public_repo, read:user
     (read:org is NOT required for external use)
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

**GitLab MCP setup** (if using `--gitlab` flag or user prefers GitLab):
```
GitLab MCP is not configured. To enable it:

1. Create a GitLab Personal Access Token:
   - Go to https://gitlab.com/-/user_settings/personal_access_tokens
   - Scopes needed: read_api, read_user
   - Copy the token

2. I can add GitLab MCP to your Claude Code settings automatically.
   Confirm: should I configure GitLab MCP now? (yes/no)

   Or add manually to ~/.claude/settings.json:
   {
     "mcpServers": {
       "gitlab": {
         "type": "stdio",
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-gitlab"],
         "env": {
           "GITLAB_URL": "https://gitlab.com",
           "GITLAB_PERSONAL_ACCESS_TOKEN": "your-token-here"
         }
       }
     }
   }
```

**Slack MCP setup** (if missing and NOT in external mode):
```
Slack MCP is not configured. To enable it:

1. Which Slack channels should I look at for this review?
   (e.g., #eng-backend, #ant-trail, #team-updates — be specific rather than granting access to all channels)

2. I can add Slack MCP to your Claude Code settings automatically.
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
           "SLACK_TEAM_ID": "T0000000000",
           "SLACK_CHANNEL_IDS": "C0000000001,C0000000002"
         }
       }
     }
   }

   To get your Slack Bot Token:
   - Go to https://api.slack.com/apps → Create New App
   - Add OAuth scopes for only the channels you specified:
     channels:history, channels:read, users:read
     (avoid granting groups:history, im:history, mpim:history unless strictly needed)
   - Install to workspace → copy Bot User OAuth Token

   Note: This requires Slack workspace admin approval (~30+ minutes).
   In external mode, this step is skipped — use manual paste if needed.
```

**Slack in external mode** (show this instead of setup instructions):
```
Slack: Skipped (external mode)
   Slack requires creating a Slack App and getting workspace admin approval.
   If you have Slack data you can share manually, paste it when prompted.
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
   - GitHub username (@handle) — or GitLab username if using GitLab
   - Jira username or email
   - Slack display name (if available)

**2. What is the review period?**
   (e.g., "Q1 2026" / "Jan–Mar 2026" / "last 6 months")

**3. Paste your company's review questions** (numbered list):
   — Skip to use defaults:
     1. Collaboration & Teamwork
     2. Technical Skills & Depth
     3. Codebase Breadth & Cross-functional Contribution
     4. Code Review Quality & Peer Engagement
     5. Communication & Async Habits
     6. Reliability & Ownership
     7. Growth & Learning

**4. Project scope:**
   - Should the analysis cover **all projects/repos** this person worked on?
   - Or limit to **specific projects**? (e.g., a particular GitHub repo or Jira project key)
   — Default: all projects unless specified

**5. Review tone:**
   a) Critical — frank, direct ("X was a bottleneck in...")
   b) Neutral — balanced, professional *(recommended)*
   c) Soft — diplomatic, encouraging

   *Note: All tones include ≥2 specific, evidence-backed growth areas.*
```

---

### Phase 2: Data Collection

After receiving answers, announce what you're pulling:

```
Gathering collaboration data for [Name] during [Period]...
[Access tier: Full / GitHub-only / Jira-Hub / Minimal]
```

Then execute in parallel where possible:

**GitHub** (if available):
- Search PRs authored by `{reviewee}` within date range
- Search PRs reviewed by `{reviewee}` on teammates' code (`reviewed-by:{reviewee}`)
- Look for inline PR comments left by `{reviewee}` on others' PRs (quality signal)
- Check which directories/modules their PRs touch — flag if work is concentrated in one area
- Count PRs reviewed vs. authored ratio (collaboration health signal)
- Check PR descriptions for quality (body length, linked tickets, context provided)
- Look for patterns: fix-on-fix cycles, stale open PRs, self-merges without review
- Check co-authored commits

**GitLab** (if using `--gitlab` or GitLab MCP detected):
- Search MRs by author: `{reviewee_username}` within date range
- Search MRs reviewed by: `{reviewee_username}` within date range
- Look for MR comment exchanges
- Check co-authored commits

**Slack** (if available and not in external mode):
- Search messages from/to reviewee in the period
- Find @mention threads
- Look for reactions/kudos

**Jira** (if available):
- Search tickets with both users involved
- Pull shared sprint/epic activity
- Get comment exchanges on shared tickets

**Jira-Hub mode** (when GitHub/GitLab is unavailable but Jira is configured):

If the org uses GitHub for Jira or GitLab for Jira integration, use this strategy:

*Step A — Broad JQL search for reviewee activity:*
```jql
(assignee = "{reviewee_email}" OR reporter = "{reviewee_email}" OR comment ~ "{reviewee_name}")
AND updated >= "{period_start}" AND updated <= "{period_end}"
ORDER BY updated DESC
```

*Step B — Dev-info extraction via curl* (use the Jira credentials from MCP config):
For each issue returned, extract the numeric Jira issue ID, then call:
```bash
# Summary — PR count, commit count, branch count per issue
curl -s -u "{jira_email}:{jira_api_token}" \
  "{jira_url}/rest/dev-status/latest/issue/summary?issueId={numeric_id}"

# PR detail — titles, URLs, merge status, authors
curl -s -u "{jira_email}:{jira_api_token}" \
  "{jira_url}/rest/dev-status/latest/issue/detail?issueId={numeric_id}&applicationType=github&dataType=pullrequest"
```
Use `applicationType=gitlab` for GitLab-linked issues.

*Step C — Build the PR picture from Jira data:*
- Which tickets had PRs submitted? By whom?
- Were PRs merged? (delivery reliability signal)
- Any open/stalled PRs? (blocker signal)
- Cross-reference reviewer's own Jira activity on those tickets

Note: Jira-Hub mode cannot retrieve PR review comment content or individual reviewer identities — state this limitation clearly in the data sources footer.

**Manual paste mode** (`--paste` flag or when a source is unavailable):

For each unavailable source, show the relevant paste template:

*Jira paste template* (if no Jira MCP):
```
Run this JQL in your Jira and paste the results:
  assignee = "{reviewee_email}" AND updated >= "{period_start}" ORDER BY updated DESC

Or use Jira board → Advanced Search → copy the issue list.
```

*GitHub paste template* (if no GitHub MCP):
```
Go to: https://github.com/pulls?q=involves:{username}+created:{start}..{end}
Copy or export the PR list (title, URL, status, date, reviewer names).
```

*GitLab paste template* (if no GitLab MCP):
```
Go to: https://gitlab.com/dashboard/merge_requests?scope=all&author_username={username}
Copy the list of MRs (title, URL, status, date).
```

*Slack paste template* (if no Slack MCP):
```
Export relevant Slack messages manually:
- Any DMs or threads with {reviewee_name} during the period
- Any #channel messages mentioning them
Paste the text directly — no specific format required.
```

For each unavailable source where paste is not provided:
```
⚠️ [Source] unavailable — skipping automated pull.
   You can paste [template above] if you have it.
```

---

### Phase 3: Generate Review

Use the format from `references/universal-prompt.md`:

```markdown
## Peer Review: [Name] | [Period] | Tone: [Tone]

### [Question 1]
[Answer in plain, human-readable prose — see writing rules below]

### [Question 2]
[...]

...

### Strengths
- **[Strength]**: [Plain language description with evidence woven in naturally]
- **[Strength]**: [Plain language description with evidence woven in naturally]

### Growth Areas  ← Always present
- **[Constructive point]**: [Evidence or observed gap, described plainly]
- **[Constructive point]**: [Evidence or observed gap, described plainly]

---
*Data sources: GitHub ([N] PRs, [N] comments) | Slack ([N] messages) | Jira ([N] tickets)*
*Access tier: [Full / GitHub-only / Jira-Hub / Minimal]*
*Missing data: [any gaps and what they mean for review completeness]*
```

**Writing rules — readability first:**
- Write for a human reader (manager, HR, peer) — not a developer reading a git log
- **Each answer must be 1–3 sentences maximum.** Be direct and specific — no padding.
- **Never list PR numbers, ticket IDs, or PR titles** unless it was a production incident, a critical bug fix, or a named initiative that people would recognise by name
- Instead of "PR #74 feat(PROJ-86): add progress deviation..." → say "built the progress deviation and activity tracking analytics feature"
- Instead of "PROJ-62 was completed on Mar 6" → say "redesigned the meeting scheduling system to use cron-based recurrence"
- Use numbers for scale when they add context ("shipped 12 features across the quarter", "all 16 assigned tickets delivered") — but don't enumerate them
- Evidence should feel like natural supporting detail, not a citation list
- If something is notable enough to name specifically (a production outage fix, a major architectural decision, a high-impact launch), name it in plain English — not as a ticket reference

**Rating format** (when review form uses numeric ratings):
- Always include a rating in the format `**X/10**` at the start of each answer
- If the rating is less than 10, include one sentence explaining the specific gap and one sentence on what the person can do to close it
- Example: **8/10** — Delivered consistently but Jira tickets were often left open after PRs merged. To improve: update ticket status as part of the PR checklist so work is visible to the team.

**Tone enforcement**:
- Critical: 1–2 strengths, 3+ growth areas, frank language
- Neutral: 2–3 strengths, 2 growth areas, balanced language
- Soft: 3–4 strengths, 2 growth areas (still mandatory), encouraging language

**Signals to always evaluate and surface (even if not in the review questions):**
- **Code review participation**: Did they review teammates' PRs? How many vs. how many they authored? Were reviews substantive (inline comments) or rubber-stamp (empty LGTM)?
- **Codebase breadth**: Did their work span multiple modules/services, or is it concentrated in one area? Siloed ownership is a growth gap worth calling out.
- **PR quality habits**: Were PRs well-described, appropriately scoped, linked to tickets? Or were they bare, large, or self-merged without review?
- **Fix-on-fix patterns**: Multiple PRs patching the same area within days signals insufficient self-review or peer review before merging.
- **Proactive contribution**: Did they pick up bugs, help unblock teammates, or improve things outside their assigned scope?
- **Stale work**: Open PRs or In Progress Jira tickets with no movement are a visibility and reliability signal.

**Never**:
- List PR names, ticket IDs, or commit hashes as inline citations in review text
- Write vague praise without any supporting evidence
- Skip growth areas in any tone
- Soften a factual finding into meaninglessness
- Hallucinate data — if evidence is absent, say so

---

## Reference

Core logic lives in: `references/universal-prompt.md`
That file is portable to Cursor, Windsurf, Copilot, or any AI assistant.
