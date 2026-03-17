# PR Review Checklist Template

This template is used to produce the overall PR comment. It gets merged with the repo's PR template checklist (if one exists).

## Merge rules

1. If the repo has a PR template with checklist items, those go under **"Team Checklist"** first
2. The sections below follow, but skip any item that duplicates a team checklist item
3. **Only include sections that have at least one finding** (❌ or ⚠️). Skip sections where everything passes — keep the comment short.

## Status markers

- ✅ Pass
- ❌ Fail (include severity + file:line)
- ⚠️ Needs attention
- ➖ N/A

---

## Flags section (always include)

Compute and display at the very top:

```
📏 **Size:** {XS|S|M|L|XL} ({lines} lines) | 🧠 **Complexity:** {functions flagged} | 🗄️ **DB Changes** | ☁️ **Infra Changes** | 📦 **Deps Changed** | 🔐 **Security** | 🧪 **Missing Tests** | 🔄 **Breaking**
```

Only show flags that are triggered. Skip flags that don't apply.

---

## Checklist sections

### 🔐 Security
- No secrets, API keys, or credentials in code
- No hardcoded sensitive values
- Input validation on external inputs
- No SQL injection vectors
- IAM follows least-privilege
- No overly permissive CORS
- Dependencies don't introduce known CVEs

### 🏗️ Architecture
- Changes align with existing patterns
- Separation of concerns (handler → service → repository)
- No circular dependencies
- API contracts backward-compatible

### 📝 Code Quality
- No functions exceeding cognitive complexity >15
- No unnecessary O(n²)+ algorithms
- No deeply nested conditionals (>3 levels)
- No duplicate logic that should be extracted
- Dead code removed
- Magic numbers replaced with constants

### ⚡ Performance
- No N+1 query patterns
- No sequential awaits on independent operations
- Lambda cold start impact considered
- No memory leaks

### 🧪 Testing
- New logic has test coverage
- Edge cases tested
- Tests are deterministic
- Mocks don't hide real issues

### 🗄️ DynamoDB (if applicable)
- Key schema supports access patterns
- GSI design is appropriate
- No Scan where Query works
- BatchWrite handles UnprocessedItems
- DeletionPolicy set on tables

### 🗄️ SQL Database (if applicable)
- Migration is reversible
- No data loss from schema changes
- Indexes added for new queries
- No locking issues on large tables
- Connection management appropriate (RDS Proxy for Lambda)

### ☁️ Infrastructure (if applicable)
- Lambda memory/timeout appropriate
- DLQ configured for async ops
- Resource naming follows conventions
- No accidental resource deletions
- Environment configs parameterized

### 📖 Documentation
- Complex logic has comments
- Public APIs have JSDoc/TSDoc
- README updated if behavior changed
- New env vars documented

---

## Summary section (always include)

```
🔴 {n} critical | 🟡 {n} warnings | 🔵 {n} suggestions

**Risk:** {Low|Medium|High} — {one sentence explanation}
```
