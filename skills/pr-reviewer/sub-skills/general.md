# Sub-Skill: General Code Review

## File patterns
Applies to: all files as a baseline review layer. Other sub-skills provide deeper, stack-specific checks — this sub-skill catches cross-cutting concerns.

---

## Security

### Secrets & Credentials
- 🔴 Critical: API keys, tokens, passwords, or connection strings in code
- 🔴 Critical: Private keys or certificates committed to repo
- 🟡 Warning: `.env` files with real values (should be `.env.example` with placeholders)
- Check `.gitignore` includes sensitive file patterns
- Flag hardcoded URLs to internal services — use env vars or config

### Input Validation
- Flag API endpoints that don't validate request body/params
- Flag missing content-type checks
- Flag parsed user input used without schema validation (e.g., `JSON.parse(req.body)` fed directly into DB queries or business logic without validating shape/types)
- Flag regex patterns that could be vulnerable to ReDoS

### Authentication & Authorization
- Flag endpoints missing auth middleware
- Flag authorization checks that only run on the frontend (no backend enforcement)
- Flag JWT handling issues: not verifying signature, not checking expiry, storing in localStorage

---

## Error Handling & Resilience

### Error Handling Patterns
- Flag empty catch blocks
- Flag generic error messages returned to users (leaking internal details)
- Flag missing error handling on I/O operations (network, file, database)
- Flag catch blocks that log but don't handle or rethrow appropriately
- Flag missing retry logic on transient failures (network calls to external services)

### Resilience
- Flag missing circuit breaker patterns on external service calls
- Flag missing timeouts on HTTP/network calls (will hang indefinitely without them)
- Flag missing graceful shutdown handlers in long-running services
- Flag missing health check endpoints

---

## Logging & Observability

- Flag `console.log` in production code — use a structured logger (JSON-output loggers like pino, winston, or bunyan)
- Flag sensitive data in log output (PII, tokens, passwords)
- Flag missing request ID / correlation ID propagation
- Flag missing error context in logs (which user, which request, what was the input)
- Flag missing metrics for critical operations (latency, error rates, throughput)

---

## Configuration & Environment

### Package Changes (package.json)
- Flag new dependencies — are they necessary? Are they maintained?
- Flag dependencies with known vulnerabilities
- Flag `dependencies` vs `devDependencies` misclassification
- Flag pinned versions without lock file changes (or vice versa)
- Flag removed dependencies that are still imported somewhere
- Flag dependency version that is wildcard (`*`) or very loose (`>=`)

### Config Files
- Flag `tsconfig.json` changes that relax strictness (e.g., `strict: false`, `noImplicitAny: false`)
- Flag ESLint/Prettier rule changes that disable important checks
- Flag Dockerfile changes that affect security (running as root, exposing unnecessary ports)
- Flag `.env` or config changes that differ from documentation

---

## Git & PR Hygiene

- Flag very large PRs (>500 lines changed) — suggest splitting
- Flag unrelated changes bundled together (refactors mixed with features)
- Flag debug code left in (console.log, debugger statements, TODO/FIXME/HACK)
- Flag committed generated files that should be in `.gitignore`
- Flag merge conflict markers left in code

---

## Documentation

- Flag public functions/APIs without documentation
- Flag changed behavior without updated README or docs
- Flag new environment variables not documented
- Flag new config options not documented
- Flag breaking changes not called out in PR description

---

## Accessibility (only for frontend file changes)

- Flag missing `alt`, ARIA labels, keyboard accessibility, and form labels on interactive elements

---

## Dependency & Supply Chain

- Flag new npm scripts that run arbitrary commands
- Flag `postinstall` scripts in new dependencies
- Flag dependencies sourced from git URLs instead of npm registry
- Flag major version bumps without a migration review
