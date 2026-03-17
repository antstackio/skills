# Sub-Skill: TypeScript / JavaScript Review

## File patterns
Applies to: `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.mjs`, `*.cjs`, `package.json`, `tsconfig.json`, `*.config.ts`, `*.config.js`, `*.test.*`, `*.spec.*`

---

## Code Quality Checks

### Cognitive Complexity
Flag functions where nested control flow makes the code hard to follow. Each of these increments complexity: `if`, `else if`, `else`, `switch`, `for`, `while`, `do-while`, `catch`, ternary, logical operators (`&&`, `||`) when used for branching, and nested functions/callbacks. Nesting multiplies the penalty — a nested `if` inside a `for` counts more than a flat `if`.

**Thresholds:**
- 🔵 Suggestion: complexity 10-15 → consider simplification
- 🟡 Warning: complexity 15-25 → should refactor
- 🔴 Critical: complexity >25 → must refactor before merge

**Common fixes:**
- Extract nested logic into well-named helper functions
- Replace complex conditionals with early returns (guard clauses)
- Replace switch statements with lookup objects/maps
- Use polymorphism instead of type-checking branches

**Example anti-pattern:**
```typescript
// ❌ Cognitive complexity ~18
async function processOrder(order: Order) {
  if (order.items.length > 0) {
    for (const item of order.items) {
      if (item.type === 'physical') {
        if (item.weight > 10) {
          if (item.destination === 'international') {
            // deeply nested logic...
          } else {
            // more nested logic...
          }
        }
      } else if (item.type === 'digital') {
        // another branch...
      }
    }
  }
}
```

```typescript
// ✅ Refactored — flat, readable
async function processOrder(order: Order) {
  if (order.items.length === 0) return;
  
  for (const item of order.items) {
    await processOrderItem(item);
  }
}

function processOrderItem(item: OrderItem) {
  const handler = itemHandlers[item.type];
  if (!handler) throw new UnknownItemTypeError(item.type);
  return handler(item);
}
```

### Time Complexity
Flag algorithms that are unnecessarily slow for the data size they operate on.

**Things to watch for:**
- Nested loops over the same or related collections → O(n²) or worse
- `.find()` or `.includes()` inside a loop → O(n²), use a Set or Map instead
- Repeated array scans that could be a single pass
- Sorting where a single-pass min/max would suffice
- Recursive functions without memoization that have overlapping subproblems

**Example anti-pattern:**
```typescript
// ❌ O(n²) — find inside loop
const duplicates = items.filter((item, i) =>
  items.findIndex(other => other.id === item.id) !== i
);
```

```typescript
// ✅ O(n) — Set-based
const seen = new Set<string>();
const duplicates = items.filter(item => {
  if (seen.has(item.id)) return true;
  seen.add(item.id);
  return false;
});
```

### Simplification Opportunities
Flag code that can be expressed more concisely without sacrificing readability.

**Patterns to catch:**
- `if (condition) { return true; } else { return false; }` → `return condition;`
- `if (x !== null && x !== undefined)` → optional chaining or nullish coalescing
- Manual array transformations that could use `.map()`, `.filter()`, `.reduce()`
- Verbose null checks when `??` or `?.` would work
- Redundant `async/await` on already-returned promises
- `new Promise((resolve) => resolve(value))` → `Promise.resolve(value)`
- Spread-then-reassign patterns that could be a single object literal
- Redundant type assertions when TypeScript can infer the type

### Async/Await Patterns
**Anti-patterns to flag:**
- `await` inside a `for` loop when iterations are independent → use `Promise.all`
- Missing `await` on async calls (fire-and-forget without intent)
- `async` keyword on functions that never `await`
- Sequential awaits on independent operations
- Missing error handling on promises (no `.catch()` and no try/catch)
- Using `.then()` chains mixed with `async/await` in the same function

**Example:**
```typescript
// ❌ Sequential — takes sum of all durations
for (const id of userIds) {
  const user = await getUser(id);
  results.push(user);
}
```

```typescript
// ✅ Concurrent — takes max of all durations
const results = await Promise.all(userIds.map(id => getUser(id)));

// ✅ With concurrency limit for large batches
import pLimit from 'p-limit';
const limit = pLimit(10);
const results = await Promise.all(
  userIds.map(id => limit(() => getUser(id)))
);
```

### Error Handling
**Check for:**
- Empty `catch` blocks that silently swallow errors
- `catch (e) { throw e; }` — pointless rethrow
- Catching generic `Error` when specific error types should be handled differently
- Missing error handling on external calls (API, DB, file system)
- Error messages that don't include enough context for debugging
- `console.log` for error reporting instead of a proper logger

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
