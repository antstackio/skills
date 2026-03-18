# Env / Config Checklist

For "works locally, fails in CI/prod" bugs. Go through this before reading any code.
Each "no" becomes a hypothesis in Phase 4.

## Checklist

**Env vars**

- All required vars set in target environment?
- Types coerced? (PORT as number, not string)
- Startup Zod/validation in place?

**Build**

- Path aliases configured in bundler AND tsconfig?
- `moduleResolution` consistent? (`bundler` / `node16`)
- `"type": "module"` in package.json matches runtime expectation?
- devDependencies accidentally used at runtime?

**Runtime**

- Node version matches local? (check `engines` in package.json)
- Lambda: handler path in function config correct?
- Lambda: deployment package includes all required files?
- `@types/*` packages present in prod environment?

**Config**

- Separate `tsconfig.prod.json` differs from local config?
- `strict` mode consistent across environments?

**Permissions**

- IAM role / service account has required permissions?
- VPC / network rules allow outbound calls?
- API keys / DB URLs set in target environment?
