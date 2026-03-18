# ts-node-debugger

Codebase-aware TypeScript/Node.js debugging for any AI agent. Reads your project once, learns your patterns, gives exact file:line fixes that match your codebase, not generic examples.

## What it does

Gives any AI agent a structured debugging protocol for TypeScript and Node.js projects. On first use, the agent reads key project files and generates a `.claude/project-context.md` committed to git so every teammate gets codebase-aware debugging automatically.

**Works on:** Claude Code, Cursor, Copilot, Gemini CLI, Codex, Windsurf, and any agent with file-reading capability.

## Install

```bash
npx skills add antstackio/skills --skill ts-node-debugger
```

## What it covers

- TS compiler errors (`TS2xxx` codes)
- Runtime TypeErrors and null/undefined crashes
- Async/Promise bugs and unhandled rejections
- Type narrowing failures and union type issues
- Test failures (Jest, Vitest, Playwright, Testing Library)
- Env/config bugs — "works locally, fails in prod/CI"
- ESM/CJS and module resolution errors

## Usage

Ask the agent:

- "Debug this TypeScript error"
- "Why is this failing in Lambda but not locally?"
- "This test keeps failing, what's wrong?"
- "I'm getting `Cannot read properties of undefined` here"
- "Set up project context for this repo"

The skill activates automatically when it detects TypeScript errors, stack traces, failing tests, or unexpected behavior in a Node.js/TypeScript codebase.

## How It Works

### First Run - Project Discovery

On first use in a repo, the agent reads key project files and generates `.claude/project-context.md`:

```
agent reads →  tsconfig.json
               package.json
               one handler file
               shared types file
               env config

agent writes → .claude/project-context.md
```

**Commit this file.** Every teammate gets codebase-aware debugging from their next `git pull` — no per-developer setup.

### Subsequent Runs — Context-Aware Debugging

The agent loads `project-context.md` and uses your actual patterns for every fix:

- Error handling style (`Result<T>`, throws, `{data, error}`)
- Folder structure (exact file paths, not guesses)
- Naming conventions
- Test runner and verify commands

### Updating Project Context

When your conventions change:

```
"Re-scan project context"        ← regenerates .claude/project-context.md
"Update error handling pattern"  ← updates just that section
```

## File structure

```
ts-node-debugger/
├── skill.md                  ← always loaded (88 lines)
├── README.md
├── metadata.json
└── references/
    ├── discovery.md          ← first run only
    ├── env-checklist.md      ← env/config bugs only
    └── patterns.md           ← type-safe fix patterns + TS error reference
```

## Why token-efficient

Only `skill.md` is always in context. Reference files are pulled on demand discovery runs once per repo, the env checklist only for prod bugs, patterns only when writing fixes.

## Judging notes

- **Correctness** — fixes reference actual file:line from code the agent read, never invented paths
- **Usefulness** — every TS/Node developer hits these bugs daily; project context means fixes match your codebase, not a generic tutorial
- **Efficiency** — 88-line orchestrator, reference files loaded only when needed
