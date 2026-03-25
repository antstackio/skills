---
name: AWS Well-Architected Review
description: Enforces AWS Well-Architected best practices
---
# AWS Well-Architected

Apply AWS Well-Architected best practices to all AWS infrastructure work. This applies whether you are **writing new infrastructure** or **reviewing existing infrastructure**.

**When writing new infra** (create, scaffold, add, generate): Apply the mandatory defaults below so every resource is correct from the first draft. Do not generate anti-patterns and then suggest fixes. The code itself is the output. Read `rules/generate-defaults.md` for framework-specific property name mappings when generating code.

**When reviewing existing infra** (review, check, audit, validate): Scan for anti-patterns using the review checklist below and produce a structured findings report with concrete fixes.

**If both** (e.g., "add a Lambda and review the rest"): Write new code with defaults applied, then review the existing code.

Detect the framework and language from the project context. Generate code and fixes in the matching format.

---

## Generate Mode — Mandatory Defaults

Every resource you generate must satisfy these requirements:

**Every resource**: Encryption at rest + in transit, least-privilege IAM (no wildcards), tags (Environment, Service, Team), no hardcoded secrets (use Secrets Manager / SSM)

**Every Lambda**: DLQ, retry config, ARM64, tuned memory + timeout (never 128MB/3s defaults), log retention set (never infinite), X-Ray tracing, structured logging (Powertools), connection reuse outside handler, non-secret config via env vars (secrets go in Secrets Manager / SSM)

**Every S3 bucket**: Public access blocked, encryption, SSL enforced (bucket policy), versioning, lifecycle rules, removal policy RETAIN

**Every DynamoDB table**: PITR enabled, encryption, PAY_PER_REQUEST (unless steady patterns), Query-friendly key design with GSIs (no Scans), removal policy RETAIN

**Every SQS queue**: Companion DLQ with maxReceiveCount, encryption, SSL enforced (queue policy)

**Every IAM policy**: Specific actions only (never `Action: "*"`), specific resource ARNs (never `Resource: "*"`), prefer framework grant helpers, no full-access managed policies

**Every API Gateway**: Throttling rate + burst limits, authorization on every endpoint, X-Ray tracing, explicit CORS origins (never wildcard `*`)

**Every Lambda handler**: Structured logging (Powertools, not console.log/print), input validation (zod/pydantic/joi), specific error handling (no silent catch), non-secret config from env vars

**All other resources** (SNS, RDS, Step Functions, EventBridge, ALB, CloudFront, etc.): Encryption, least-privilege IAM, DLQ/error destination where applicable, multi-AZ for stateful services, automated backups/PITR where supported

**Architecture**: Services decoupled via queues/events where possible, async over blocking sync, auto-scaling on stateful services, multi-AZ for RDS/ElastiCache/ECS, environment isolation (dev/staging/prod)

**Prototypes / minimal requests**: If the user explicitly asks for a minimal or prototype setup, apply the defaults but note which ones you would skip in production and why.

---

## Review Mode — Evaluating Existing Infrastructure

When reviewing existing infrastructure code, follow these steps:

### Step 1 — Discover AWS Resources

Scan the codebase for infrastructure definitions and handler code. Identify:

- **Compute**: Lambda, ECS, EC2, Fargate, Step Functions
- **Storage**: S3, DynamoDB, RDS, ElastiCache, EFS
- **Networking**: API Gateway, ALB/NLB, CloudFront, VPC, Route 53
- **Messaging**: SQS, SNS, EventBridge, Kinesis
- **Security**: IAM roles/policies, KMS, Secrets Manager, WAF, Cognito
- **Monitoring**: CloudWatch alarms, X-Ray, CloudTrail
- **CI/CD**: CodePipeline, CodeBuild, CodeDeploy

Search patterns:
- CDK: `new lambda.Function`, `new s3.Bucket`, `new dynamodb.Table`, `new sqs.Queue`, etc.
- SAM/CFN: `AWS::Lambda::Function`, `AWS::S3::Bucket`, `AWS::DynamoDB::Table`, etc.
- Terraform: `resource "aws_lambda_function"`, `resource "aws_s3_bucket"`, etc.
- Serverless: `functions:`, `resources:`, `provider:` blocks

### Step 2 — Map Architecture Patterns

Identify architectural patterns in use:
- Event-driven (Lambda + SQS/SNS/EventBridge)
- API-driven (API Gateway + Lambda/ECS)
- Data pipeline (Kinesis/SQS + Lambda + DynamoDB/S3)
- Static hosting (S3 + CloudFront)
- Microservices (multiple services with independent deployments)
- Monolithic Lambda (single large function handling many routes)

### Step 3 — Evaluate Against Each Pillar

For each pillar, check the specific items listed below.

---

#### Pillar 1: Security (SEC)

| Check | Severity | What to look for |
|-------|----------|-------------------|
| Over-permissive IAM | High | `Action: "*"`, `Resource: "*"`, `Effect: Allow` with wildcards, full-access managed policies (`AdministratorAccess`, `AmazonS3FullAccess`, etc.) |
| Root account usage | High | Root account credentials used for application tasks, CI/CD, or operational access instead of IAM roles |
| Hardcoded credentials | High | API keys, passwords, tokens, connection strings embedded in source files, IaC templates, or config files |
| Public S3 buckets | High | Missing public access block (`BlockPublicAccess`, `PublicAccessBlockConfiguration`, `aws_s3_bucket_public_access_block`) |
| Encryption at rest | High | S3, DynamoDB, RDS, SQS, EBS, EFS without encryption configured |
| Encryption in transit | High | API Gateway without HTTPS, missing TLS on ALB/NLB listeners, no SSL enforcement on S3/SQS |
| No Secrets Manager / Parameter Store | High | Secrets stored in environment variables, config files, or code instead of Secrets Manager or SSM Parameter Store |
| No VPC for sensitive services | Medium | Lambda/ECS accessing databases or internal services without VPC configuration — lack of network isolation |
| No WAF | Medium | API Gateway or ALB exposed to internet without WAF association |
| Security groups | Medium | Ingress `0.0.0.0/0` on non-public-facing resources, overly permissive egress rules |
| KMS key management | Medium | Using AWS-managed keys instead of CMKs for sensitive data |
| Missing auth | Medium | API endpoints without authorization (Cognito, IAM, Lambda authorizer, API keys) |

---

#### Pillar 2: Reliability (REL)

| Check | Severity | What to look for |
|-------|----------|-------------------|
| Missing DLQ | High | Lambda, SQS, or SNS without dead-letter queue configured |
| No retries | High | Lambda invocations, SQS consumers, or SDK calls without retry configuration for transient failures |
| Single point of failure | High | RDS, ElastiCache, or ECS in a single AZ without multi-AZ or cross-AZ redundancy |
| No idempotency | High | Event-driven handlers (SQS, SNS, EventBridge, Kinesis) without idempotency keys, conditional writes, or deduplication |
| No circuit breaker / fallback | Medium | Service-to-service calls without timeout, retry limits, circuit breaker, or fallback logic |
| Service limits / throttling ignored | Medium | No API Gateway throttling, no reserved concurrency on Lambda, no awareness of AWS service quotas |
| No health checks | Medium | ALB target groups without health check configuration |
| No backup | Medium | DynamoDB without PITR, RDS without automated backups, no snapshot policies |
| Error handling | Medium | Handlers with bare `catch`/`except` blocks that swallow errors silently |

---

#### Pillar 3: Performance Efficiency (PERF)

| Check | Severity | What to look for |
|-------|----------|-------------------|
| Wrong compute choice | High | EC2 for short-lived tasks that should be Lambda/Fargate, or Lambda for long-running batch jobs that should be ECS/Step Functions |
| Blocking synchronous workflows | High | Synchronous request-response chains where async/event-driven patterns would reduce latency and improve throughput |
| Inefficient DB access | High | DynamoDB `Scan` operations instead of `Query`, missing GSIs for common access patterns, N+1 query patterns |
| No caching strategy | Medium | Repeated reads from DynamoDB/RDS without DAX, ElastiCache, CloudFront, or API Gateway caching |
| Large Lambda packages | Medium | Unminified bundles, bundled SDKs not used, no tree-shaking — causing slow cold starts |
| No connection reuse | Medium | Lambda creating new DB/HTTP connections per invocation instead of reusing connections outside the handler |
| Lambda memory | Medium | Default 128MB memory (often too low for Node.js/Python runtimes) |
| Lambda timeout | Medium | Default 3s timeout for non-trivial operations |
| Monolithic Lambda | Medium | Single function handling 10+ routes instead of per-route or per-domain functions |
| Poor batching / streaming | Medium | Processing SQS/Kinesis records one-at-a-time instead of batching, no batch window configuration |
| Missing CDN | Low | Static assets served from S3 or origin without CloudFront |
| ARM architecture | Low | Lambda not using `arm64` / Graviton2 |

---

#### Pillar 4: Cost Optimization (COST)

| Check | Severity | What to look for |
|-------|----------|-------------------|
| Over-provisioned compute | High | EC2/RDS instances sized far beyond actual utilization, Lambda with 3008MB+ for simple CRUD |
| Unused resources | High | Orphaned EBS volumes, unattached Elastic IPs, old snapshots, resources defined in IaC but not referenced |
| No auto-scaling | High | EC2, ECS, or DynamoDB (provisioned mode) without auto-scaling policies |
| No cost monitoring | Medium | No AWS Budgets, Cost Anomaly Detection, or billing alarms configured |
| Chatty service communication | Medium | High-frequency synchronous calls between services instead of batching, aggregation, or event-driven patterns |
| No reserved / spot instances | Medium | Steady-state EC2/RDS workloads on On-Demand pricing without Reserved Instances or Savings Plans; batch workloads not using Spot |
| NAT Gateway costs | Medium | Lambda in VPC using NAT Gateway for AWS API access instead of VPC endpoints |
| No lifecycle rules | Medium | S3 buckets without lifecycle policies to transition to IA/Glacier or expire objects |
| Log retention | Low | CloudWatch log groups with infinite retention (default) |

---

#### Pillar 5: Operational Excellence (OPS)

| Check | Severity | What to look for |
|-------|----------|-------------------|
| No centralized logging | High | Missing CloudWatch Logs, or using `console.log`/`print()` instead of structured JSON logger (Powertools for Lambda, pino/winston for Node.js) |
| No monitoring / alerting | High | No CloudWatch alarms, no dashboards, no SNS notifications for failures or threshold breaches |
| No CI/CD pipeline | High | Manual deployments via console or CLI instead of CodePipeline, GitHub Actions, GitLab CI, etc. |
| No distributed tracing | Medium | Missing X-Ray tracing on Lambda/API Gateway/ECS — cannot trace requests across services |
| No runbooks / incident response | Medium | No documented runbooks, no automated remediation, no incident response playbooks |
| Unstructured / unsearchable logs | Medium | Log output as plain text without JSON structure, correlation IDs, or service context |
| No deployment strategies | Medium | Deploying directly to production without blue/green, canary, or rolling deployment strategies |
| Centralized config missing | Medium | Hardcoded values instead of SSM Parameter Store, AppConfig, or environment variables |
| IaC completeness | Medium | Resources created via AWS Console not captured in IaC |
| Tagging | Low | Resources missing `Environment`, `Team`, `Service` tags |

---

#### Pillar 6: Sustainability (SUS)

| Check | Severity | What to look for |
|-------|----------|-------------------|
| Always-on without optimization | Medium | EC2/ECS/RDS running 24/7 without scheduled scaling, stop/start schedules, or usage-based right-sizing |
| Inefficient data transfer | Medium | Cross-region or cross-AZ data transfers that could be avoided with local caching, CDN, or regional design |
| No batch processing | Low | Processing items one-at-a-time instead of batching for efficiency |

---

#### Cross-Cutting Concerns (CROSS)

These issues span multiple pillars and indicate fundamental architectural problems:

| Check | Severity | What to look for |
|-------|----------|-------------------|
| No event-driven architecture | High | Synchronous polling or request-response patterns where event-driven (SQS, SNS, EventBridge) would decouple and improve resilience |
| Tight coupling between services | High | Microservices calling each other directly via HTTP/SDK without queues, events, or contracts — failure cascades, deploy dependencies |
| Poor error handling / silent failures | High | Empty catch blocks, errors logged but not propagated, no alerting on failures, swallowed exceptions |
| No backpressure handling | Medium | Producers flooding consumers without throttling, queue-based buffering, or rate limiting |
| No environment isolation | Medium | Same AWS account or resources shared across dev/staging/prod without separation (separate accounts, stacks, or naming) |

---

### Step 4 — Quick Wins

Identify the top 3–5 fixes that are:
- High impact (address High severity findings)
- Low effort (can be fixed in < 30 minutes)
- No architectural changes required

These go at the top of the report so the developer knows where to start.

### Step 5 — Detailed Findings

For each issue found, output in this format:

    ### [PILLAR-NNN] Finding Title
    <!-- Number sequentially per pillar: SEC-001, SEC-002, REL-001, etc. -->

    - **Severity**: High | Medium | Low
    - **Location**: `path/to/file:line`
    - **Issue**: Specific description of what is wrong
    - **Why it matters**: Business/technical impact if not addressed
    - **Fix**: concrete code fix in the SAME framework/language as the existing code

---

## Report Template

Output the review in this structure:

```markdown
# AWS Well-Architected Review

## Architecture Summary
- **Services detected**: [list]
- **Architecture pattern**: [pattern name]
- **Framework**: [detected framework]
- **Language**: [detected language]

## Quick Wins
1. [high impact, low effort fix — with estimated time]
2. [high impact, low effort fix — with estimated time]
3. [high impact, low effort fix — with estimated time]

## Findings

### Security
[findings sorted by severity...]

### Reliability
[findings sorted by severity...]

### Performance Efficiency
[findings sorted by severity...]

### Cost Optimization
[findings sorted by severity...]

### Operational Excellence
[findings sorted by severity...]

### Sustainability
[findings sorted by severity...]

### Cross-Cutting Concerns
[findings sorted by severity...]
```

Order the pillar sections by number of High-severity findings (most critical pillar first). Omit pillar sections with zero findings.
