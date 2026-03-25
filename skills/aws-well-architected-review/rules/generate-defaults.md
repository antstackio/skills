# Generate Mode — Framework Hints

Property names differ across IaC frameworks. Use these tables to map each requirement from SKILL.md to the correct framework syntax. Only consult this file when generating infrastructure code.

> **Serverless Framework**: Property names follow SAM/CFN conventions. Use the SAM/CFN column for Serverless Framework projects.

---

## Lambda Functions

| Requirement | CDK | SAM/CFN | Terraform |
|-------------|-----|---------|-----------|
| ARM64 | `architecture: Architecture.ARM_64` | `Architectures: [arm64]` | `architectures = ["arm64"]` |
| DLQ | `deadLetterQueue` prop | `DeadLetterQueue.TargetArn` | `dead_letter_config { target_arn }` |
| Log retention | `logRetention` prop (auto-creates log group) | Separate `AWS::Logs::LogGroup` | Separate `aws_cloudwatch_log_group` with `retention_in_days` |
| Tracing | `tracing: Tracing.ACTIVE` | `Tracing: Active` | `tracing_config { mode = "Active" }` |
| Retries | `retryAttempts: 2` | `EventInvokeConfig.MaximumRetryAttempts` | `aws_lambda_function_event_invoke_config` with `maximum_retry_attempts` |

---

## S3 Buckets

| Requirement | CDK | SAM/CFN | Terraform |
|-------------|-----|---------|-----------|
| Block public access | `blockPublicAccess: BLOCK_ALL` | `PublicAccessBlockConfiguration` (4 booleans) | Separate `aws_s3_bucket_public_access_block` resource |
| SSL enforcement | `enforceSSL: true` | Separate `AWS::S3::BucketPolicy` with `aws:SecureTransport` condition | Separate `aws_s3_bucket_policy` with condition |
| Encryption | `encryption: S3_MANAGED` | `BucketEncryption.ServerSideEncryptionConfiguration` | Separate `aws_s3_bucket_server_side_encryption_configuration` resource |
| Versioning | `versioned: true` | `VersioningConfiguration.Status: Enabled` | Separate `aws_s3_bucket_versioning` resource |
| Lifecycle | `lifecycleRules` prop | `LifecycleConfiguration.Rules` | Separate `aws_s3_bucket_lifecycle_configuration` resource |
| Retain | `removalPolicy: RETAIN` | `DeletionPolicy: Retain` | `lifecycle { prevent_destroy = true }` |

---

## DynamoDB Tables

| Requirement | CDK | SAM/CFN | Terraform |
|-------------|-----|---------|-----------|
| PITR | `pointInTimeRecovery: true` | `PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled: true` | `point_in_time_recovery { enabled = true }` |
| Encryption | `encryption: AWS_MANAGED` | `SSESpecification.SSEEnabled: true` | `server_side_encryption { enabled = true }` |
| Billing | `billingMode: PAY_PER_REQUEST` | `BillingMode: PAY_PER_REQUEST` | `billing_mode = "PAY_PER_REQUEST"` |
| Retain | `removalPolicy: RETAIN` | `DeletionPolicy: Retain` | `lifecycle { prevent_destroy = true }` |

---

## SQS Queues

| Requirement | CDK | SAM/CFN | Terraform |
|-------------|-----|---------|-----------|
| DLQ | `deadLetterQueue: { queue, maxReceiveCount }` | `RedrivePolicy: { deadLetterTargetArn, maxReceiveCount }` | `redrive_policy` JSON with same fields |
| Encryption | `encryption: SQS_MANAGED` | `SqsManagedSseEnabled: true` | `sqs_managed_sse_enabled = true` |
| SSL enforcement | `enforceSSL: true` | Separate `AWS::SQS::QueuePolicy` with `aws:SecureTransport` condition | Separate `aws_sqs_queue_policy` with condition |

---

## IAM Policies

| Requirement | CDK | SAM/CFN | Terraform |
|-------------|-----|---------|-----------|
| Grant helpers | `.grantReadWriteData()`, `.grantRead()`, etc. | SAM policy templates (`DynamoDBCrudPolicy`, etc.) | N/A — write explicit `aws_iam_role_policy` |
| Scoped policy | `new iam.PolicyStatement({ actions, resources })` | `PolicyDocument.Statement` with specific actions/resources | `policy = jsonencode({ Statement })` with specific actions/resources |

---

## API Gateway

| Requirement | CDK | SAM/CFN | Terraform |
|-------------|-----|---------|-----------|
| Throttling | `deployOptions.throttlingRateLimit/BurstLimit` | `MethodSettings[].ThrottlingRateLimit/BurstLimit` | `aws_api_gateway_method_settings` with `throttling_rate_limit/burst_limit` |
| Tracing | `deployOptions.tracingEnabled: true` | `TracingEnabled: true` | `xray_tracing_enabled = true` on stage |
| Auth | `authorizer` + `authorizationType` on each method | `Auth.DefaultAuthorizer` | Separate `aws_api_gateway_authorizer` resource |
| CORS | `defaultCorsPreflightOptions.allowOrigins` | `Cors.AllowOrigin` | Manual `OPTIONS` method + integration |

---

## Lambda Handler Code

| Requirement | TypeScript | Python |
|-------------|-----------|--------|
| Logging | `@aws-lambda-powertools/logger` | `aws_lambda_powertools.Logger` |
| Tracing | `@aws-lambda-powertools/tracer` | `aws_lambda_powertools.Tracer` |
| Validation | `zod` with `.safeParse()` | `pydantic` with `BaseModel` |
| Middleware | `middy` with `jsonBodyParser()` + `errorHandler()` | `@tracer.capture_lambda_handler` + `@logger.inject_lambda_context` decorators |
| Response format | `{ statusCode, body: JSON.stringify({ success, data/error }) }` | `{ "statusCode": ..., "body": json.dumps({ "success": ..., "data"/"error": ... }) }` |
