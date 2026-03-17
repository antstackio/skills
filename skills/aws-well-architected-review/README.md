# AWS Well-Architected Skill

Enforces AWS Well-Architected best practices during **infrastructure generation** and **code review** — across all major IaC frameworks.

## Modes

### Generate Mode
When creating new AWS infrastructure, every resource is written with Well-Architected defaults from the first draft — no anti-patterns to fix later.

- Lambda: DLQ, ARM64, tuned memory/timeout, X-Ray tracing, log retention, Powertools logging
- S3: public access blocked, encryption, SSL enforced, versioning, lifecycle rules, RETAIN
- DynamoDB: PITR, encryption, PAY_PER_REQUEST, query-friendly keys, RETAIN
- SQS: companion DLQ, encryption, SSL enforced
- IAM: scoped actions and resource ARNs, grant helpers preferred
- API Gateway: throttling, auth on every endpoint, tracing, explicit CORS
- Handler code: structured logging, input validation, error handling, env var config

### Review Mode
When reviewing existing infrastructure, the skill scans for anti-patterns across 7 pillars and produces a structured findings report with concrete fixes in the same framework/language.

## Supported Frameworks

| Framework | File Types | Languages |
|-----------|-----------|-----------|
| AWS CDK | Constructs, stacks | TypeScript, Python |
| AWS SAM | `template.yaml`, `template.json` | YAML, JSON |
| CloudFormation | `.yaml`, `.json` templates | YAML, JSON |
| Terraform | `.tf`, `.tfvars` | HCL |
| Serverless Framework | `serverless.yml` | YAML |

The skill auto-detects the framework and language from the project context.

## Pillars Evaluated

| Pillar | Key Checks |
|--------|------------|
| **Security** | IAM least-privilege, encryption at rest + in transit, public access, secrets management, WAF, VPC isolation |
| **Reliability** | DLQs, retries, multi-AZ, backups/PITR, idempotency, health checks, circuit breakers |
| **Performance Efficiency** | Compute choice, memory/timeout tuning, caching, connection reuse, ARM architecture, batching |
| **Cost Optimization** | Over-provisioning, auto-scaling, NAT Gateway costs, log retention, lifecycle rules, reserved/spot |
| **Operational Excellence** | Structured logging, distributed tracing, CI/CD, deployment strategies, tagging, IaC coverage |
| **Sustainability** | Always-on optimization, data transfer efficiency, batch processing |
| **Cross-Cutting** | Event-driven architecture, service coupling, error handling, backpressure, environment isolation |

## Usage

The skill triggers in both generation and review contexts:

**Generation:**
```
> create a CDK stack with Lambda + API Gateway + DynamoDB
> add an SQS queue to the order processing service
> scaffold a new SAM template for the payments API
> write a terraform config for the data pipeline
```

**Review:**
```
> review this architecture against aws well-architected
> check aws best practices for this project
> review lib/api-stack.ts against well-architected
> check the terraform files in infra/ for aws best practices
```

## Sample Review Output

```
# AWS Well-Architected Review

## Architecture Summary
- Services detected: Lambda, API Gateway, DynamoDB, S3, SQS
- Architecture pattern: Event-driven (API Gateway + Lambda + SQS)
- Framework: Terraform (HCL)

## Quick Wins
1. Scope IAM policy from `dynamodb:*` to specific actions — 5 min
2. Add `aws_s3_bucket_public_access_block` resource — 2 min
3. Add DLQ to order-processing Lambda — 10 min
4. Set CloudWatch log retention to 14 days — 2 min

## Findings

### Security
[SEC-001] Over-permissive IAM — High — modules/api/iam.tf:12 ...
[SEC-002] Public S3 bucket — High — modules/storage/main.tf:5 ...

### Reliability
[REL-001] Lambda missing DLQ — High — modules/api/lambda.tf:8 ...

### Cost Optimization
[COST-001] Infinite log retention — Low — modules/api/lambda.tf:8 ...
```

## Skill Structure

```
aws-well-architected-review/
├── SKILL.md           # Agent prompt — mode routing, defaults, review checklist, report template
├── README.md          # This file
├── metadata.json      # Name, description, tags, triggers
└── rules/
    └── generate-defaults.md   # Framework hint tables (CDK/SAM/CFN/Terraform property mappings)
```

- **SKILL.md**: The prompt the agent receives. Contains all requirements (generate mode) and 60 review checks across 7 pillars.
- **rules/generate-defaults.md**: Property name translation tables. Only consulted during code generation — maps framework-agnostic requirements to CDK, SAM/CFN, and Terraform syntax.
