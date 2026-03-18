---
name: ts-node-debugger
description: >
  TypeScript/Node.js debugging skill. MUST be invoked IMMEDIATELY when the user shares ANY error output, stack trace, or failing behavior — before reading source files or suggesting fixes. TRIGGER when: user pastes a stack trace, error log, console error, failing test output, or describes unexpected runtime/compile behavior. Trigger keywords: "ReferenceError", "TypeError", "Cannot read properties", "is not defined", "is not a function", "TS2", "Cannot find module", "Unhandled rejection", "ECONNREFUSED", "500", "502", "503", "401", "403", "jest", "FAIL", "Expected", "received", "timeout", "stack trace", "error", "crash", "bug", "broken", "not working", "fails", "failing", "wrong", "incorrect", "unexpected", "bad response", "returns", "should be", "supposed to", "instead of", "giving", "getting", "wrong total", "wrong result",  "wrong output", "wrong value", "off by", "miscalculated". DO NOT skip this skill by fixing errors directly — always invoke first. Examples: "getting ReferenceError - is not defined", "test is failing", "500 error on health endpoint", "TypeError cannot read properties of undefined", "TS2339 property does not exist", "lambda returns 401",  "getting the wrong total", "returns incorrect value", "should be 500 but getting 105".
license: MIT
---

# TypeScript / Node.js Debugger

**Core rule:** Find root cause before suggesting fixes. Never guess file locations - read them.

---

## Phase 1 - Load Project Context

Check if `.claude/project-context.md` exists.

- **Exists** → read it, skip to Phase 2
- **Missing** → read `references/discovery.md`, run discovery, then continue

---

## Phase 2 - Classify

Identify the error class from the input:

| Class          | Signal                                                     |
| -------------- | ---------------------------------------------------------- |
| TS compiler    | `TS2xxx` code                                              |
| Runtime crash  | `Cannot read properties`, `is not a function`              |
| Async bug      | Unhandled rejection, missing `await`                       |
| Type narrowing | `possibly undefined`, union not narrowed                   |
| Test failure   | Expected/received mismatch, timeout                        |
| Env/config     | Works locally, fails in CI or prod                         |
| Module error   | `Cannot find module`, ESM/CJS mismatch                     |
| Circular dep   | Import is `undefined`, works after reorder                 |
| Memory leak    | `MaxListenersExceededWarning`, growing RSS                 |
| Logic bug      | Wrong result, incorrect output, off-by-one, wrong operator |

For **env/config** bugs → read `references/env-checklist.md` before touching code.

---

## Phase 3 - Locate

Use the agent's native file tools to find exact locations. Never infer paths.

- Read the file mentioned in the stack trace
- Find where the crashing symbol is defined and where it is constructed
- For type errors: find the type definition, then the call site

Reference only what you actually read. State `file:line` explicitly.

---

## Phase 4 - Diagnose

State 2–3 ranked hypotheses:

```
#1 (most likely) - <one-line cause>
  Why: <1-2 sentences using actual code you read>
  TS gap: <why the type system missed this>
```

---

## Phase 5 - Fix

Read `references/patterns.md` for type-safe fix patterns.

Each fix must:

- Show before/after from the **actual file content**
- Match the project's error handling pattern from `project-context.md`
- Include a type-safe alternative
- Reference exact `file:line`

If a fix requires a file not yet read, read it first. Never write fixes for unseen code.

---

## Phase 6 - Verify

Use the verify commands from `project-context.md`. Default fallbacks:

```
tsc --noEmit
vitest run <test-file>   # or jest
```
