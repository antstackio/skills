# Sub-Skill: TypeScript / JavaScript Review

## File patterns
Applies to: `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.mjs`, `*.cjs`, `package.json`, `tsconfig.json`, `*.config.ts`, `*.config.js`, `*.test.*`, `*.spec.*`

---

## Code Quality Checks

### Cognitive Complexity
Estimate complexity by counting control flow structures in each function:

**Counting method:**
1. +1 for each: `if`, `else if`, `else`, `switch`, `for`, `while`, `do-while`, `catch`, ternary (`?:`), `&&`/`||` used for branching
2. +1 nesting penalty for each level of nesting (a `for` inside an `if` inside a `try` = +2 nesting penalty on the `for`)
3. Sum = estimated cognitive complexity for that function

**Thresholds:**
- 🔵 Suggestion: complexity 10-15
- 🟡 Warning: complexity 15-25
- 🔴 Critical: complexity >25

**Common fixes:** extract nested logic into helpers, use early returns/guard clauses, replace switch with lookup maps

### Time Complexity
Flag algorithms that are unnecessarily slow:
- Nested loops over same/related collections → O(n²)
- `.find()`, `.includes()`, `.indexOf()` inside a loop → O(n²), use Set/Map
- Repeated array scans that could be a single pass
- Sorting where single-pass min/max suffices
- Recursive functions without memoization with overlapping subproblems

### Simplification Opportunities
- `if (cond) { return true; } else { return false; }` → `return cond;`
- Verbose null checks → `??` or `?.`
- Manual loops → `.map()`, `.filter()`, `.reduce()`
- Redundant `async/await` on already-returned promises
- `new Promise((resolve) => resolve(val))` → `Promise.resolve(val)`
- Redundant type assertions when TS can infer

### Async/Await Patterns
- `await` inside a `for` loop when iterations are independent → use `Promise.all`
- Missing `await` on async calls (fire-and-forget without intent)
- `async` keyword on functions that never `await`
- Sequential awaits on independent operations → `Promise.all`
- Missing error handling on promises (no `.catch()` and no try/catch)
- Mixing `.then()` chains with `async/await` in the same function

### Error Handling
- Empty `catch` blocks that silently swallow errors
- `catch (e) { throw e; }` — pointless rethrow
- Catching generic `Error` when specific types should differ
- Missing error handling on external calls (API, DB, file system)
- Error messages missing context for debugging

### TypeScript-Specific
**Check for:**
- Use of `any` type → flag as 🟡 Warning, suggest proper typing
- Use of `@ts-ignore` or `@ts-expect-error` without justification
- Non-null assertions (`!`) used excessively instead of proper null checks
- Missing return types on exported/public functions
- Enum usage where a union type would be simpler and safer
- Overly complex generic types that hurt readability
- Interface vs Type alias misuse (prefer interface for object shapes)
- Missing `readonly` on properties that shouldn't mutate

### Import Hygiene
**Check for:**
- Unused imports
- Circular import chains
- Importing from internal/private module paths
- `import *` when only specific members are needed
- Missing or inconsistent path aliases
- Importing dev dependencies in production code

### Testing (for test files)
**Check for:**
- Test descriptions that don't describe the expected behavior
- Missing edge case coverage (empty arrays, null, boundary values)
- Tests that test implementation details rather than behavior
- Tests with no assertions
- Flaky tests (time-dependent, order-dependent, random)
- Test setup/teardown leaks (shared mutable state between tests)
- Over-mocking — mocking so much that the test doesn't test anything real
- Missing error path tests
