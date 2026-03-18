# Discovery - Build Project Context

Read these files using your native file tools. Infer what you can. Write the result to `.claude/project-context.md` and tell the user to commit it.

## Files to Read (in order)

1. `package.json` - name, scripts, dependencies, `"type"` field
2. `tsconfig.json` - strict, paths, moduleResolution
3. Top-level folder structure - infer where handlers, types, tests live
4. One handler/route file - infer error handling pattern
5. One shared types file - infer naming conventions
6. Env config file (if any) - infer validation approach

Stop reading when you have enough signal for all fields below.

## Write to `.claude/project-context.md`

```markdown
## Project: <name>

### Stack

- Runtime: Node.js / Lambda
- Framework: Express / Hono / bare Lambda / other
- Test runner: Jest / Vitest / other
- Package manager: npm / pnpm / yarn

### Folders

- Handlers: <path>
- Types: <path>
- Tests: <path>
- Config: <path>

### Error Pattern

- Style: throws / Result<T> / {data,error} / custom class
- Example: <paste real snippet from codebase>

### Env Validation

- At startup: yes / no
- Tool: Zod / manual / none
- File: <path>

### Conventions

- Handler naming: <e.g. handleX>
- Type naming: <e.g. XRequest>
- Error naming: <e.g. AppError>

### tsconfig

- strict: yes / no
- noUncheckedIndexedAccess: yes / no
- paths: <aliases or none>

### Verify Commands

- types: <command>
- tests: <command>
```

Tell the user: "Commit `.claude/project-context.md` - your whole team gets codebase-aware debugging from their next `git pull`."
