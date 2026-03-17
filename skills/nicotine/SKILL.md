---
name: nicotine
description: >
  Smart pre-compact workflow. Extracts important knowledge from the current
  conversation, asks the user what to include, writes the approved summary to
  a temp file, then triggers automated /compact via Stop hook. After /compact
  completes, a second Stop hook stage overwrites the session JSONL with the
  manual summary. Auto-installs hooks on every run using dynamic paths.
allowed-tools:
  - Read
  - Write
  - Bash
---

# Nicotine — Smart Compaction Skill

## Workflow

### Step 0 — Install Hooks (always run this step)

Run unconditionally on every invocation to ensure hooks are installed on any device:

```bash
python3 - << 'EOF'
import json, os, stat

# Derive project root from cwd
cwd = os.getcwd()
hooks_dir = os.path.expanduser('~/.claude/hooks')
os.makedirs(hooks_dir, exist_ok=True)

# Compute the Claude project dir slug from cwd
project_slug = cwd.replace('/', '-').lstrip('-')
project_dir = os.path.expanduser(f'~/.claude/projects/{project_slug}')

hook_path = os.path.join(hooks_dir, 'pre-compact-hook.sh')
settings_path = os.path.join(cwd, '.claude', 'settings.local.json')

# Write hook script with dynamic project_dir
hook_script = f'''#!/bin/bash

# Stage 1: skill requested /compact
if [ -f /tmp/.run_compact ]; then
  rm /tmp/.run_compact
  touch /tmp/.compact_overwrite_pending
  sleep 0.5
  osascript -e 'tell application "System Events"' \\
            -e 'keystroke "/compact"' \\
            -e 'delay 0.3' \\
            -e 'key code 36' \\
            -e 'end tell'
  exit 0
fi

# Stage 2: /compact finished — overwrite JSONL with manual summary
if [ -f /tmp/.compact_overwrite_pending ] && [ -f /tmp/.precompact_summary.md ]; then
  rm /tmp/.compact_overwrite_pending
  python3 - << 'PYEOF'
import json, uuid, glob, os
from datetime import datetime, timezone

project_dir = "{project_dir}"
jsonl_files = sorted(glob.glob(f"{{project_dir}}/*.jsonl"), key=os.path.getmtime, reverse=True)
if not jsonl_files:
    print("ERROR: no JSONL files found in " + project_dir)
    exit(1)
target_file = jsonl_files[0]

with open(target_file) as f:
    lines = [l.strip() for l in f if l.strip()]

last_obj = json.loads(lines[-1])
summary_text = open("/tmp/.precompact_summary.md").read()

entry = {{
    "parentUuid": last_obj.get("uuid"),
    "isSidechain": False,
    "userType": last_obj.get("userType", "external"),
    "cwd": last_obj.get("cwd"),
    "sessionId": last_obj.get("sessionId"),
    "version": last_obj.get("version"),
    "gitBranch": last_obj.get("gitBranch"),
    "slug": last_obj.get("slug"),
    "type": "user",
    "message": {{"role": "user", "content": summary_text}},
    "uuid": str(uuid.uuid4()),
    "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
}}

with open(target_file, "w") as f:
    f.write(json.dumps(entry) + "\\n")

print(f"JSONL overwritten: {{target_file}}")
PYEOF
  rm -f /tmp/.precompact_summary.md
fi
'''

with open(hook_path, 'w') as f:
    f.write(hook_script)
os.chmod(hook_path, os.stat(hook_path).st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
print(f"Hook written: {hook_path}")

# Register Stop hook in project settings
if not os.path.exists(settings_path):
    d = {}
else:
    with open(settings_path) as f:
        d = json.load(f)

hooks = d.setdefault('hooks', {})
stop_hooks = hooks.setdefault('Stop', [])

already = any(
    any('pre-compact-hook.sh' in h.get('command', '') for h in entry.get('hooks', []))
    for entry in stop_hooks
)

if not already:
    stop_hooks.append({
        "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/pre-compact-hook.sh"}]
    })
    os.makedirs(os.path.dirname(settings_path), exist_ok=True)
    with open(settings_path, 'w') as f:
        json.dump(d, f, indent=2)
    print(f"Stop hook registered in {settings_path}")
else:
    print("Stop hook already present.")
EOF
```

---

### Step 1 — Extract Session Facts

Scan the entire conversation chronologically. Extract only what **cannot be derived from the codebase, CLAUDE.md, or memory files**:

**Always extract:**
- Primary intent: what the user was trying to accomplish overall
- Every file actually read or modified (path + what changed or why)
- Every bug encountered: symptom, root cause, fix applied
- Every decision made that isn't obvious from the resulting code
- Every user correction, preference, or feedback expressed (prevents repeating mistakes)
- Incomplete tasks, blocked items, open questions

**Never extract (already loaded automatically):**
- Tech stack, framework versions, package manager — in CLAUDE.md
- File structure, component names, where things live — in CLAUDE.md
- Coding conventions, style rules — in CLAUDE.md

Present as a **numbered flat list** grouped by category. Then ask:

> "Which of these should go in the compact summary? 'all', numbers, or anything to add."

Wait for the user's response before proceeding.

### Step 2 — Ask the User

Wait for the user's response from Step 1, then proceed.

### Step 3 — Generate Lean Summary

The summary **must** begin with this exact string:

```
This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.
```

Then write the body using this structured format. Omit empty sections entirely:

```
GOAL: <what the user was accomplishing, one line>
STATUS: <done | in-progress | blocked>

MODIFIED:
- <path>: <what changed and why, one line>

FIXED:
- <symptom>: <root cause> → <fix applied>

DECISIONS:
- <decision made>: <reason>

USER_FEEDBACK:
- <correction or preference the user expressed, verbatim or close>

PENDING:
- <incomplete task or open question>

NEXT: <the single most important next action to resume seamlessly>
```

**Compression rules — non-negotiable:**
1. No prose — every line is a structured entry
2. No redundancy — merge duplicates
3. No CLAUDE.md content — stack, conventions, file structure load automatically
4. No debugging journeys — just `symptom → root cause → fix`
5. No verbatim user messages — distil to intent, except in USER_FEEDBACK
6. Short paths always — `w/` = `apps/web/`, `api/` = `apps/api/`, `cdk/` = `apps/cdk/`
7. **Target: under 600 tokens for the entire summary body**

### Step 4 — Save Summary and Trigger

Write the full summary to the temp file, then create the trigger:

```bash
python3 -c "
summary = '''<full summary text from Step 3>'''
open('/tmp/.precompact_summary.md', 'w').write(summary)
print('Summary saved.')
"
```

```bash
touch /tmp/.run_compact
```

### Step 5 — End Your Response

End your response immediately. The automation takes over:

- **Stop hook stage 1**: sees `/tmp/.run_compact` → deletes it → sets stage 2 flag → types `/compact` + Enter
- `/compact` runs and clears in-memory context
- **Stop hook stage 2**: sees stage 2 flag + summary file → overwrites JSONL with manual summary → cleans up
