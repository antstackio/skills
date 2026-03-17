# Sub-Skill: AWS SAM / CloudFormation / Serverless Review

## File patterns
Applies to: `template.yaml`, `template.yml`, `samconfig.toml`, `samconfig.yaml`, `serverless.yml`, `serverless.ts`, `cdk.json`, `*.template.json`, `*.template.yaml`, any YAML/JSON with `AWSTemplateFormatVersion` or `Transform: AWS::Serverless`

---

## Lambda Function Checks

### Memory & Timeout Configuration
- Every Lambda must have explicit `MemorySize` and `Timeout` — never rely on defaults (128MB / 3s). Defaults are almost always wrong for production.
- 🔴 Critical: Flag `Timeout` > 29s for API Gateway-backed Lambdas — API GW has a 29s hard limit and will cut off the response regardless of Lambda timeout
- Flag `MemorySize` < 256MB for Node.js Lambdas doing any non-trivial work (below this, you get proportionally less CPU)
- Flag `Timeout` set very high (>300s) without a corresponding DLQ — if it fails after 5 min you want to know
- 🔵 Suggestion: Memory between 512MB-1024MB is the sweet spot for most Node.js Lambdas

### Environment Variables
- Flag any hardcoded values that should be parameters or SSM references (account IDs, region, endpoints)
- Flag secrets in plain text — use `AWS::SSM::Parameter::Value` or Secrets Manager `{{resolve:secretsmanager:...}}`
- Flag missing `NODE_OPTIONS` for common needs (e.g., `--enable-source-maps`)
- Flag large numbers of environment variables (>15) — consider using a config service

### Bundling & Layers
- Flag `CodeUri` pointing to the entire project root when it should target a specific directory
- Flag missing `BuildMethod: esbuild` for TypeScript projects (SAM supports native esbuild)
- If using Layers, check they're versioned and the Lambda references a specific version
- Flag Lambda package sizes > 50MB (affects cold start). Check if tree-shaking or code splitting is needed

### Event Sources
- API Gateway events: check for missing `Auth` configuration (defaults to no auth)
- SQS events: check `BatchSize` and `MaximumBatchingWindowInSeconds` are appropriate
- SQS events: check `FunctionResponseTypes` includes `ReportBatchItemFailures` — without this, a single failure replays the whole batch
- DynamoDB Streams: check `StartingPosition`, `BatchSize`, `MaximumRetryAttempts`, and `BisectBatchOnFunctionError`
- S3 events: check for overly broad event filters (processing everything vs. specific prefixes/suffixes)
- Scheduled events: check the schedule expression is correct and in the right timezone

---

## IAM Permissions

### Least Privilege
- 🔴 Critical: Flag `Effect: Allow` with `Resource: "*"` — almost never acceptable
- 🔴 Critical: Flag `Action: "*"` — never acceptable
- 🟡 Warning: Flag overly broad actions like `s3:*`, `dynamodb:*`, `sqs:*` — narrow to specific actions
- 🟡 Warning: Flag missing resource ARN constraints — actions should target specific resources, not `*`
- 🔵 Suggestion: Use `!Sub` or `!Ref` to construct resource ARNs dynamically rather than hardcoding

### Managed Policies
- Flag use of AWS-managed `AdministratorAccess` or `PowerUserAccess` on any Lambda
- Prefer inline policies scoped to the specific function over shared managed policies

---

## API Gateway

### Configuration
- Check for missing `Cors` configuration on API resources
- Check `StageName` is parameterized, not hardcoded to `prod` or `dev`
- Flag missing throttling configuration (`ThrottlingBurstLimit`, `ThrottlingRateLimit`)
- Flag missing request validation (models, required parameters)
- Flag APIs without any authorization (`Auth` property missing)
- Check for missing `AccessLogSetting` — API Gateway logs should be enabled

### Common Mistakes
- Missing `OPTIONS` method for CORS preflight (SAM can auto-generate this)
- Binary media types not configured when API serves files
- Missing `400` / `500` response models

---

## DynamoDB Tables

For detailed DynamoDB checks (key design, GSIs, client code, capacity), see `sub-skills/dynamodb.md`. Only flag DynamoDB issues from this sub-skill if `dynamodb.md` is not loaded.

---

## S3 Buckets

- Flag buckets without `VersioningConfiguration`
- Flag buckets without `BucketEncryption`
- Flag public access (check `PublicAccessBlockConfiguration` — should be all true unless intentional)
- Flag missing lifecycle rules for buckets that accumulate data
- Flag buckets without `AccessControl: Private` (or equivalent block public access)

---

## SQS / SNS

- Flag SQS queues without a Dead Letter Queue (`RedrivePolicy`)
- Flag DLQ without monitoring/alarms
- Flag `VisibilityTimeout` less than the consuming Lambda's `Timeout` (causes duplicate processing)
- Flag missing encryption (`KmsMasterKeyId` or `SqsManagedSseEnabled`)
- Flag SNS topics without a DLQ for subscriptions

---

## VPC Configuration (if present)

- Flag Lambdas in a VPC without NAT Gateway (they'll lose internet access)
- Flag Lambda in VPC without VPC endpoints for AWS services they use
- Flag security groups with `0.0.0.0/0` inbound rules
- Flag subnets that don't span multiple AZs for resilience

---

## General IaC Checks

### Resource Naming
- Flag hardcoded resource names (use `!Sub` with stack name prefix for uniqueness)
- Flag inconsistent naming conventions across resources

### Parameters & Outputs
- Flag resources that should be parameterized per environment but are hardcoded
- Flag missing `Outputs` for resources that other stacks might reference
- Flag missing `Description` on parameters

### Change Safety
- 🔴 Critical: Flag any change that would cause a resource **replacement** (e.g., changing a DynamoDB table's key schema, changing a Lambda's `FunctionName`) — this destroys and recreates the resource
- 🟡 Warning: Flag removed resources — verify this is intentional and data has been migrated
- Flag `DeletionPolicy` missing on stateful resources (tables, buckets, databases)
- Flag `UpdateReplacePolicy` missing on critical resources
