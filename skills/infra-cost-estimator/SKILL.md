---
name: infra-cost-estimator
description: Predict monthly AWS production cost from SAM, CDK, or Terraform files before deployment.
---

# infra-cost-estimator

Predict monthly AWS production cost from IaC files before deployment. Works with SAM, CDK, and Terraform. Fetches live pricing from the AWS Pricing API. Uses CloudWatch actuals if the stack is deployed. Ranks optimizations by estimated savings.

---

## Phase 1 — Detect IaC Framework

Scan project root for IaC files:

- **SAM**: `template.yaml` or `template.json` containing `Transform: AWS::Serverless-2016-10-31`
- **CDK**: `cdk.json` present
  - Check for `cdk.out/` directory first (synthesized CloudFormation JSON)
  - If `cdk.out/` missing: run `cdk synth`
  - If `cdk synth` fails: STOP. Tell user: "Fix this error and re-run: [error message]"
  - Do NOT fall back to reading `lib/*.ts` — CDK TypeScript parsing is unreliable
- **Terraform**: any `*.tf` files
- **None found**: ask user to paste their IaC or describe the architecture

---

## Phase 2 — Build Resource Manifest

### Step 1: Extract all resource types

Read the IaC files and collect every unique `Type: AWS::*` resource type (CloudFormation/SAM) or `resource` block type (Terraform). Do not filter in advance — list them all first.

### Step 2: Filter out known-free resources

Instead of maintaining a large billable list, use an inverted approach: maintain a small "known free / config-only" list. Everything NOT on this list is treated as potentially billable and included in the manifest.

**KNOWN FREE — skip these:**
`AWS::IAM::Role`, `AWS::IAM::Policy`, `AWS::IAM::ManagedPolicy`,
`AWS::Lambda::Permission`, `AWS::Lambda::EventSourceMapping`,
`AWS::Lambda::LayerVersion`, `AWS::Lambda::LayerVersionPermission`,
`AWS::S3::BucketPolicy`,
`AWS::CloudFormation::*`,
`AWS::CDK::Metadata`,
`AWS::Cognito::UserPoolClient`, `AWS::Cognito::UserPoolDomain`, `AWS::Cognito::UserPoolIdentityProvider`,
`AWS::CloudFront::CloudFrontOriginAccessIdentity`, `AWS::CloudFront::OriginAccessControl`,
`AWS::Route53::RecordSet` (not a hosted zone — zone itself has a cost),
`AWS::Scheduler::ScheduleGroup` (the group itself is free; schedules within it are billed),
`AWS::ApiGateway::Deployment`, `AWS::ApiGateway::Stage`, `AWS::ApiGateway::BasePathMapping`,
`AWS::ApiGateway::Method`, `AWS::ApiGateway::Resource`, `AWS::ApiGateway::Model`,
`AWS::ApiGateway::RequestValidator`, `AWS::ApiGateway::GatewayResponse`,
`AWS::ApiGatewayV2::Stage`, `AWS::ApiGatewayV2::Deployment`, `AWS::ApiGatewayV2::Route`,
`AWS::ApiGatewayV2::Integration`, `AWS::ApiGatewayV2::Authorizer`,
`AWS::Logs::SubscriptionFilter`,
`AWS::ApplicationAutoScaling::ScalableTarget`, `AWS::ApplicationAutoScaling::ScalingPolicy`,
`AWS::SNS::Subscription`, `AWS::SQS::QueuePolicy`,
`AWS::Events::Rule` (rules on default bus are free; custom bus events are billed)

**Everything else → potentially billable.** Include in the manifest. For types not in the Phase 5 service code mapping table, attempt `aws pricing describe-services --region us-east-1` to find a matching service code. If found → billable. If not found → include in manifest as `⚠ UNKNOWN — verify pricing manually`.

### Step 3: Scan IAM permissions for usage-based service costs

Many AWS services are not provisioned resources but generate costs via API calls made from Lambda. Scan all IAM `Action` statements on Lambda execution roles to detect these.

**Approach:**
1. Collect all `Action` values from IAM policy statements attached to Lambda execution roles.
2. Filter out known-free permission prefixes that never generate billable API calls: `iam:*`, `sts:*`, `logs:*`, `cloudformation:*`, `xray:*`, `cloudwatch:Put*` (metrics publishing), `lambda:*` (invocation costs are on the caller's Lambda).
3. For each remaining action prefix (e.g., `bedrock:`, `ses:`, `comprehend:`, `athena:`, `textract:`), map to the corresponding Pricing API service code using the Phase 5 service code table.
4. Add each detected service to the manifest under "AI / ML" or "USAGE-BASED (via IAM)" as appropriate.

**Special handling for Bedrock:** Extract specific model IDs from IAM resource ARNs (e.g., `foundation-model/anthropic.claude-3-haiku-20240307-v1:0`) — per-model pricing varies significantly.

This approach automatically catches Bedrock, SES, Comprehend, Textract, Rekognition, Translate, Polly, Transcribe, Athena, Redshift Data, Timestream, and any other billable service the Lambda calls.

> If an IAM action uses a wildcard (e.g., `bedrock:*`, `ses:*`), flag it: "⚠ Wildcard permission `[action]` — cannot determine specific API usage. Including service in manifest; ask user which operations are called and at what volume."

### Step 4: Add implicit auto-billed resources

- One CloudWatch Log Group per Lambda function (retention=Never by default ⚠)
- One CloudWatch Log Group per CodeBuild project
- CloudWatch Log Group for any service with logging enabled

### Step 5: Extract key config from template

For each billable resource, extract the config properties that determine cost tier — never ask the user about values readable from the template:

- **Lambda / Serverless::Function**: `Architectures` (default x86_64), `MemorySize` (default 128MB), `Timeout` (default 3s), `Runtime`
- **DynamoDB**: `BillingMode` (default PROVISIONED), `ProvisionedThroughput.ReadCapacityUnits`/`WriteCapacityUnits`, or PAY_PER_REQUEST; `GlobalSecondaryIndexes` count and projected attributes per GSI
- **API Gateway**: determine HTTP API vs REST API from resource type or properties
- **SQS**: `FifoQueue` → standard or FIFO
- **Step Functions**: `Type` → Standard or Express
- **CodeBuild**: `Environment.ComputeType`
- **CloudFront**: `PriceClass` if set
- **SSM Parameter**: `Tier` — only Advanced is billed
- **EventBridge default bus**: free — only custom buses (`AWS::Events::EventBus`) are billed

### Manifest output format

```
─────────────────────────────────────────────────
RESOURCE MANIFEST
Source: template.yaml (SAM) | Region: us-east-1

COMPUTE
  Lambda: CreateOrganization    arm64  512MB  3s  nodejs18.x
  Lambda: DashboardActions      arm64  512MB  3s  nodejs18.x
  CodeBuild: PostMergeProject   BUILD_GENERAL1_SMALL

API & EDGE
  API Gateway: MyApi            REST   (USD 3.50/million requests)
  CloudFront: Distribution      PriceClass=PriceClass_All

DATA
  DynamoDB: AppDataTable        PAY_PER_REQUEST
  S3: MediaBucket
  S3: FrontendBucket

MESSAGING & EVENTS
  EventBridge: AppEventBus      custom bus
  SQS: NotificationQueue        standard

AI / ML (via IAM permissions)
  Bedrock: anthropic.claude-3-haiku-20240307-v1:0
  Bedrock: amazon.titan-embed-text-v1

AUTH
  Cognito: UserPool

CONFIG
  Secrets Manager: ApiKeySecret

AUTO-CREATED
  CloudWatch Log Group × 26     retention=Never ⚠

⚠ UNKNOWN PRICING
  [any resource types not recognized]
─────────────────────────────────────────────────
```

---

## Phase 3 — Confirm Manifest

Show manifest. Ask:

> "Does this look right? Reply CONFIRM to proceed, or tell me what's missing, wrong, or already exists elsewhere (shared resources to exclude from cost)."

Do not proceed until user confirms.

---

## Phase 4 — Get Usage Data

AWS bills on usage, not existence. The IaC tells us what resources exist; we need usage numbers to calculate cost. After confirming the manifest, ask the user how they'd like to provide usage data:

```
USAGE DATA
I need traffic estimates to calculate costs. Pick one:

  A — Describe your traffic and I'll infer the numbers
      (e.g. "B2B SaaS, ~500 users, read-heavy, occasional AI calls")

  B — Provide specific numbers yourself

  C — Fetch last 30 days from CloudWatch (stack must be deployed)
```

Wait for the user's choice before proceeding.

---

### Path A — Describe traffic (primary path)

Ask ONE open-ended question:

> "Describe your expected traffic — e.g. number of users, requests per day, read vs write ratio, any AI/ML call patterns, peak hours."

From the response, infer per-service usage for every billable resource in the manifest. Reason about:
- User count → daily active → requests/day (e.g. 500 DAU × 10 actions = 5K req/day)
- "read-heavy" → 3:1 read/write ratio; "write-heavy" → 1:2 ratio
- "occasional AI calls" → 10% of requests hit Bedrock
- "batch processing nightly" → scheduled Lambda with high memory/duration
- Use the **baseline derivation rules** (below) to fill any gaps the user's description doesn't cover

Show inferred values in a confirmation table with reasoning:

```
INFERRED USAGE
  Source: Your description

  Lambda invocations:     150,000/month  (500 users × 10 actions × 30 days)
  Avg duration:           250ms          (50% of 500ms timeout from template)
  DynamoDB reads:         450,000/month  (3:1 read ratio × 150K requests)
  DynamoDB writes:        150,000/month  (1× requests)
  Bedrock (Haiku):        15,000/month   (10% of requests)
  ...

  Look right? Adjust any values or reply CONFIRM.
```

Tag all values as `(inferred)` in the Phase 6 output.

---

### Path B — Provide specific numbers

Ask per-service questions with baseline defaults derived from the template. Group into one message, one question per line. All have defaults — user can reply with just the values or "use defaults".

| # | Question | Baseline | Derivation |
|---|---|---|---|
| 1 | Requests/day? | 10,000 | Moderate production traffic |
| 2 | Avg Lambda duration? | 50% of Timeout | Template Timeout is max; real usage is typically half |
| 3 | DynamoDB reads + writes/month? | 2:1 ratio × requests | Each API call does ~2 reads + 1 write |
| 4 | DynamoDB stored (GB)? | 1GB | Starter dataset |
| 5 | DynamoDB GSIs on each table (count)? | from template | Read from template GlobalSecondaryIndexes |
| 6 | S3 data stored per bucket (GB)? | 1GB | Starter dataset |
| 7 | Messages/day per SQS queue? | = requests | 1:1 if SQS is downstream of API |
| 8 | Step Functions executions/day? | 10% of requests | Subset of API calls trigger workflows |
| 9 | Cognito MAU? | 1,000 | Moderate user base |
| 10 | CodeBuild: builds/month + avg duration (min)? | 100 builds, 5 min | ~3 builds/day, typical CI duration |
| 11 | CloudFront data transfer GB/month? | 1GB | Low-moderate static asset delivery |
| 12 | Average API response size (KB)? | 5KB | Typical JSON API payload |
| 13 | Bedrock [model]: calls/day, avg input tokens, avg output tokens? | 1,000/day, 500 in, 200 out | Medium prompt + short response |
| 14 | SES emails/month? | 1,000 | Moderate transactional email volume |
| 15 | CloudWatch log MB/month per function? | 100MB | ~1KB/invocation × 100K invocations |
| 16 | Traffic growth in 6 months? (optional) | flat | No growth assumed |

Only include rows for services present in the manifest.

If the user replies "use defaults", proceed directly to Phase 5 using all baseline values. Note in the output that all usage figures are baselines and may not reflect actual traffic.

Tag values as `(user)` in the Phase 6 output for user-provided values. Tag values as `(baseline)` for any defaults the user did not override.

---

### Path C — Fetch from CloudWatch (30-day actuals)

Use this if the stack is already deployed and the user wants to validate current costs or re-estimate after changes.

Run these commands with actual values substituted. If the stack name is unknown, first run:

```bash
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[].[StackName,CreationTime]' \
  --output table
```

```bash
# Step 1: resolve physical resource names from logical IDs
aws cloudformation describe-stack-resources \
  --stack-name [STACK_NAME] \
  --query 'StackResourceSummaries[].[LogicalResourceId,PhysicalResourceId,ResourceType]' \
  --output table

# Step 2a: Lambda — invocations and duration (run per function)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda --metric-name Invocations \
  --dimensions Name=FunctionName,Value=[PHYSICAL_FUNCTION_NAME] \
  --start-time $(date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda --metric-name Duration \
  --dimensions Name=FunctionName,Value=[PHYSICAL_FUNCTION_NAME] \
  --start-time $(date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Average

# Step 2b: DynamoDB — consumed capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=[TABLE_NAME] \
  --start-time $(date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=[TABLE_NAME] \
  --start-time $(date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

# Step 2c: CloudWatch Logs ingestion per log group
aws cloudwatch get-metric-statistics \
  --namespace AWS/Logs --metric-name IncomingBytes \
  --dimensions Name=LogGroupName,Value=/aws/lambda/[PHYSICAL_FUNCTION_NAME] \
  --start-time $(date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

# Step 2d: CloudFront — requests and bytes downloaded
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront --metric-name Requests \
  --dimensions Name=DistributionId,Value=[DISTRIBUTION_ID] Name=Region,Value=Global \
  --start-time $(date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront --metric-name BytesDownloaded \
  --dimensions Name=DistributionId,Value=[DISTRIBUTION_ID] Name=Region,Value=Global \
  --start-time $(date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

# Step 2e: CodeBuild — builds and total duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/CodeBuild --metric-name Builds \
  --dimensions Name=ProjectName,Value=[PROJECT_NAME] \
  --start-time $(date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

aws cloudwatch get-metric-statistics \
  --namespace AWS/CodeBuild --metric-name Duration \
  --dimensions Name=ProjectName,Value=[PROJECT_NAME] \
  --start-time $(date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

# Step 2f: Bedrock — invocations per model
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock --metric-name Invocations \
  --dimensions Name=ModelId,Value=[MODEL_ID] \
  --start-time $(date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum
```

**Note**: CloudWatch does not expose Bedrock token counts or SES email volume. After fetching all available metrics, ask the user to estimate:
- Average input + output tokens per Bedrock call (per model)
- Emails sent/month via SES (if SES detected)

If any command fails: tell the user "Run this command yourself and paste the output here: [exact command]". Do not guess or use defaults silently — always show which values came from CloudWatch and which are estimated.

Tag values as `(actual)` in the Phase 6 output.

---

### Baseline derivation rules (for Paths A and B)

These rules derive sensible defaults from the IaC template rather than using arbitrary numbers. Use them to fill gaps in the user's description (Path A) or as defaults in the questionnaire (Path B).

| Parameter | Baseline | Derived from |
|---|---|---|
| Avg Lambda duration | 50% of Timeout | Template Timeout is the max; actual is typically half or less |
| DynamoDB reads/writes | 2:1 ratio × requests | Each API call does ~2 reads + 1 write |
| SQS messages | = requests | 1:1 if SQS is downstream of API |
| CW Logs MB/function | 100MB | ~1KB/invocation × 100K invocations |
| Avg response size | 5KB | Typical JSON API payload |
| Bedrock tokens | 500 in / 200 out | Medium prompt + short response |

---

### Confidence levels

- **HIGH** — CloudWatch actuals (Path C)
- **MEDIUM** — Inferred from user's traffic description (Path A)
- **MEDIUM** — User-provided specific numbers (Path B)
- **LOW** — All baseline defaults (Path B with "use defaults")

---

## Phase 5 — Fetch Live Pricing

The AWS Pricing API always requires `--region us-east-1` regardless of deployment region. Map the deployment region to the correct location string:

| Region | Location string |
|---|---|
| us-east-1 | US East (N. Virginia) |
| us-east-2 | US East (Ohio) |
| us-west-1 | US West (N. California) |
| us-west-2 | US West (Oregon) |
| eu-west-1 | Europe (Ireland) |
| eu-west-2 | Europe (London) |
| eu-west-3 | Europe (Paris) |
| eu-central-1 | Europe (Frankfurt) |
| eu-north-1 | Europe (Stockholm) |
| eu-south-1 | Europe (Milan) |
| ap-south-1 | Asia Pacific (Mumbai) |
| ap-south-2 | Asia Pacific (Hyderabad) |
| ap-southeast-1 | Asia Pacific (Singapore) |
| ap-southeast-2 | Asia Pacific (Sydney) |
| ap-northeast-1 | Asia Pacific (Tokyo) |
| ap-northeast-2 | Asia Pacific (Seoul) |
| ap-east-1 | Asia Pacific (Hong Kong) |
| ca-central-1 | Canada (Central) |
| sa-east-1 | South America (São Paulo) |
| me-south-1 | Middle East (Bahrain) |
| me-central-1 | Middle East (UAE) |
| af-south-1 | Africa (Cape Town) |
| il-central-1 | Israel (Tel Aviv) |

If region not in table, use `aws pricing get-attribute-values --service-code AmazonEC2 --attribute-name location --region us-east-1` to find the correct location string.

```bash
# Fetch per service — always --region us-east-1
aws pricing get-products \
  --service-code [SERVICE_CODE] \
  --filters 'Type=TERM_MATCH,Field=location,Value=[LOCATION_STRING]' \
  --region us-east-1 --output json
```

### Service code mapping

| Resource type | Service code |
|---|---|
| Lambda / Serverless::Function | AWSLambda |
| DynamoDB::Table | AmazonDynamoDB |
| ApiGateway::RestApi | AmazonApiGateway |
| ApiGatewayV2::Api | AmazonApiGateway |
| S3::Bucket | AmazonS3 |
| CloudFront::Distribution | AmazonCloudFront |
| Cognito::UserPool | AmazonCognito |
| SQS::Queue | AWSQueueService |
| SNS::Topic | AmazonSNS |
| Events::EventBus | AmazonEventBridge |
| Scheduler::Schedule | AWSScheduler |
| Kinesis::Stream | AmazonKinesis |
| StepFunctions::StateMachine | AWSStepFunctions |
| CodeBuild::Project | AWSCodeBuild |
| CodePipeline::Pipeline | AWSCodePipeline |
| RDS::DBInstance / DBCluster | AmazonRDS |
| ElastiCache::CacheCluster | AmazonElastiCache |
| OpenSearchService::Domain | AmazonES |
| MSK::Cluster | AmazonMSK |
| SecretsManager::Secret | AWSSecretsManager |
| WAFv2::WebACL | awswaf |
| Route53::HostedZone | AmazonRoute53 |
| CloudWatch Logs (implicit) | AmazonCloudWatch |
| Bedrock (via IAM) | AmazonBedrock |
| Comprehend (via IAM) | AmazonComprehend |
| Rekognition (via IAM) | AmazonRekognition |
| Textract (via IAM) | AmazonTextract |
| SES (via IAM) | AmazonSES |
| Translate (via IAM) | AmazonTranslate |
| Polly (via IAM) | AmazonPolly |

For resource types not in this table: try `aws pricing describe-services --region us-east-1` to find the correct service code, or flag as `⚠ pricing not available via API`.

### Key usagetype values to extract from API responses

- **Lambda ARM64**: `Lambda-GB-Second-ARM` (Tier-1), `Request-ARM`
- **Lambda x86**: `Lambda-GB-Second` (Tier-1), `Request`
- **DynamoDB**: `ReadRequestUnits`, `WriteRequestUnits`; `ReadCapacityUnit-Hrs`, `WriteCapacityUnit-Hrs` if PROVISIONED
- **API GW HTTP**: `ApiGatewayHttpRequest`
- **API GW REST**: `ApiGatewayRequest` (Tier 1)
- **SQS**: `SQS-Requests-Tier1`
- **S3 storage**: `TimedStorage-ByteHrs` with `storageClass=General Purpose`
- **CloudWatch Logs**: `[REGION_PREFIX]-DataProcessing-Bytes` (ingestion), `[REGION_PREFIX]-TimedStorage-ByteHrs` (storage) — prefix is region-specific (e.g. `USE1` for us-east-1, `USE2` for us-east-2, `USW2` for us-west-2). Filter by `usagetype` containing `DataProcessing-Bytes` if prefix is unknown.
- **CloudFront**: `US-Requests-Tier1`, `US-DataTransfer-Out-Bytes`
- **CodeBuild**: filter by `computeType` attribute matching the project's compute type
- **Cognito**: `CognitoUserPools-MAU`
- **Bedrock**: filter by model short name in `usagetype` (e.g., `Claude3Haiku`, `TitanEmbedTextV2`)

### Fallback pricing table

Use only if the Pricing API is unavailable or returns unparseable data. Always notify the user when fallback is used.

**Compute**

| Service | Rate | Unit |
|---|---|---|
| Lambda ARM64 compute | USD 0.0000133334 | GB-second |
| Lambda x86 compute | USD 0.0000166667 | GB-second |
| Lambda requests | USD 0.0000002 | request |
| CodeBuild small (x86) | USD 0.005 | build-minute |
| CodeBuild medium (x86) | USD 0.01 | build-minute |
| CodeBuild large (x86) | USD 0.02 | build-minute |
| CodeBuild ARM small | USD 0.0034 | build-minute |
| CodePipeline | USD 1.00 | active pipeline/month |
| Fargate (x86) | USD 0.04048 | vCPU-hour |
| Fargate memory | USD 0.004445 | GB-hour |

**API & Edge**

| Service | Rate | Unit |
|---|---|---|
| API Gateway HTTP | USD 0.000001 | request |
| API Gateway REST (Tier 1) | USD 0.0000035 | request |
| CloudFront HTTP requests (US/EU) | USD 0.0000085 | request |
| CloudFront data transfer out (first 10TB) | USD 0.085 | GB |

**Data**

| Service | Rate | Unit |
|---|---|---|
| DynamoDB reads (on-demand) | USD 0.000000125 | RRU |
| DynamoDB writes (on-demand) | USD 0.000000625 | WRU |
| DynamoDB storage | USD 0.25 | GB-month |
| DynamoDB reads (provisioned) | USD 0.00013 | RCU-hour |
| DynamoDB writes (provisioned) | USD 0.00065 | WCU-hour |
| S3 standard storage | USD 0.023 | GB-month |
| S3 PUT/COPY/POST | USD 0.000005 | request |
| S3 GET | USD 0.0000004 | request |
| RDS db.t3.micro (single-AZ) | USD 0.017 | instance-hour |
| RDS db.t3.medium (single-AZ) | USD 0.068 | instance-hour |
| ElastiCache cache.t3.micro | USD 0.017 | node-hour |

**Messaging**

| Service | Rate | Unit |
|---|---|---|
| SQS standard | USD 0.0000004 | request |
| SQS FIFO | USD 0.0000005 | request |
| SNS HTTP/S delivery | USD 0.00000006 | notification |
| SNS email | USD 0.000002 | notification |
| EventBridge custom bus | USD 0.000001 | event |
| EventBridge Scheduler (after 14M free) | USD 0.000001 | invocation |
| Kinesis shard | USD 0.015 | shard-hour |
| Kinesis PUT | USD 0.014 | million records |

**AI / ML — Bedrock (us-east-1, on-demand)**

Always prefer live Pricing API for Bedrock rates. This fallback table may be outdated — warn user when using it.

| Model | Input | Output | Unit |
|---|---|---|---|
| Claude 3 Haiku | USD 0.00025 | USD 0.00125 | per 1K tokens |
| Claude 3 Sonnet / 3.5 Sonnet v1 | USD 0.003 | USD 0.015 | per 1K tokens |
| Claude 3.5 Sonnet v2 | USD 0.003 | USD 0.015 | per 1K tokens |
| Claude 3.5 Haiku | USD 0.0008 | USD 0.004 | per 1K tokens |
| Claude 3 Opus | USD 0.015 | USD 0.075 | per 1K tokens |
| Claude Sonnet 4 | USD 0.003 | USD 0.015 | per 1K tokens |
| Claude Opus 4 | USD 0.015 | USD 0.075 | per 1K tokens |
| Claude Haiku 4 | USD 0.0008 | USD 0.004 | per 1K tokens |
| Nova Micro | USD 0.000035 | USD 0.00014 | per 1K tokens |
| Nova Lite | USD 0.00006 | USD 0.00024 | per 1K tokens |
| Nova Pro | USD 0.0008 | USD 0.0032 | per 1K tokens |
| Titan Embed Text v1 | USD 0.0001 | — | per 1K tokens |
| Titan Embed Text v2 | USD 0.00002 | — | per 1K tokens |
| Cohere Embed | USD 0.0001 | — | per 1K tokens |
| Llama 3 8B Instruct | USD 0.0003 | USD 0.0006 | per 1K tokens |
| Llama 3.1 8B | USD 0.00022 | USD 0.00022 | per 1K tokens |
| Llama 3.1 70B | USD 0.00099 | USD 0.00099 | per 1K tokens |
| Mistral 7B Instruct | USD 0.00015 | USD 0.0002 | per 1K tokens |

**Config & Auth**

| Service | Rate | Unit |
|---|---|---|
| Secrets Manager | USD 0.40 | secret/month |
| Secrets Manager API | USD 0.05 | per 10K API calls |
| SSM Parameter Store Advanced | USD 0.05 | parameter/month |
| Cognito first 10,000 MAU | FREE | — |
| Cognito 10K–100K MAU | USD 0.0055 | MAU |
| Cognito 100K–1M MAU | USD 0.0046 | MAU |
| WAFv2 WebACL | USD 5.00 | WebACL/month |
| WAFv2 rules | USD 1.00 | rule/month |
| WAFv2 requests | USD 0.0000006 | request |
| Route53 hosted zone | USD 0.50 | zone/month |

**Observability**

| Service | Rate | Unit |
|---|---|---|
| CloudWatch Logs ingestion | USD 0.50 | GB |
| CloudWatch Logs storage | USD 0.03 | GB-month |

⚠ Using cached pricing (2026-03). Verify: aws.amazon.com/pricing

---

## Phase 6 — Calculate and Output Cost Estimate

**Formulas:**

```
Lambda cost =
  (monthly_invocations × request_rate)
  + (monthly_invocations × avg_duration_sec × memory_GB × compute_rate_per_GBsec)

DynamoDB PAY_PER_REQUEST =
  (monthly_reads × read_rate) + (monthly_writes × write_rate × (1 + num_GSIs))
  + (stored_GB × $0.25/GB-month)

DynamoDB PROVISIONED =
  (RCU × 730hrs × provisioned_RCU_rate) + (WCU × 730hrs × provisioned_WCU_rate)
  + per-GSI: (GSI_RCU × 730hrs × provisioned_RCU_rate) + (GSI_WCU × 730hrs × provisioned_WCU_rate)
  + (stored_GB × $0.25/GB-month)

CloudWatch Logs =
  (ingested_GB × ingestion_rate) + (stored_GB × storage_rate)

Bedrock =
  (monthly_calls × avg_input_tokens / 1000 × input_rate)
  + (monthly_calls × avg_output_tokens / 1000 × output_rate)

CodeBuild =
  monthly_builds × avg_duration_minutes × compute_rate_per_minute

Cognito =
  max(0, MAU - 10000) × tier_rate

CloudFront =
  (monthly_requests × request_rate) + (monthly_egress_GB × transfer_rate)

Step Functions Standard =
  monthly_transitions × $0.000025

Step Functions Express =
  monthly_executions × avg_duration_sec × $0.00001667/sec

SNS =
  notifications × rate_per_type ($0.50/100K HTTP, $2.00/100K email)

EventBridge Scheduler =
  max(0, monthly_invocations - 14,000,000) × $0.000001

Secrets Manager =
  num_secrets × $0.40 + api_calls / 10,000 × $0.05

WAFv2 =
  $5/WebACL + num_rules × $1 + monthly_requests × $0.0000006

Route53 =
  $0.50/zone + monthly_queries × $0.0000004

Data transfer (internet egress) =
  monthly_api_requests × avg_response_size_KB / 1,000,000 × $0.09/GB
```

**Output this exact format:**

```
PRODUCTION COST ESTIMATE — [region] — [Month Year]
════════════════════════════════════════════════════
Pricing: [AWS Pricing API (live) | Cached 2026-03 ⚠]
Usage:   [CloudWatch actuals — Path C | Inferred from description — Path A | User-provided — Path B | Baselines — Path B defaults]

ASSUMPTIONS USED
  Lambda invocations: [N]/month | avg duration: [X]ms  (actual|inferred|user|baseline)
  DynamoDB: [N] reads + [N] writes/month | [X]GB stored  (actual|inferred|user|baseline)
  DynamoDB GSIs: [N] per table  (actual|inferred|user|baseline)
  Bedrock [model]: [N] calls/month | [X] in + [Y] out tokens avg  (actual|inferred|user|baseline)
  CloudWatch Logs: [X]MB ingested/month  (actual|inferred|user|baseline)
  Avg API response size: [X]KB  (inferred|user|baseline)
  [... other non-default assumptions ...]

COST BREAKDOWN
  Lambda ([N] functions):          $XX.XX
  API Gateway ([type]):            $XX.XX
  CloudFront:                      $XX.XX
  DynamoDB:                        $XX.XX
  S3 ([N] buckets):                $XX.XX
  Bedrock ([models]):              $XX.XX  [⚠ HOTSPOT if >30% of total]
  CloudWatch Logs:                 $XX.XX  [⚠ HOTSPOT if >30% of total]
  Cognito:                         $XX.XX
  CodeBuild:                       $XX.XX
  EventBridge:                     $XX.XX
  Secrets Manager:                 $XX.XX
  Data transfer (internet egress): $XX.XX
  [all other detected services]    $XX.XX
  ─────────────────────────────────────────
  ESTIMATED TOTAL:                 ~$XX.XX/month
  Confidence range:                $XX.XX — $XX.XX/month
    (0.5× usage → low | 2× usage → high)

  Confidence: [HIGH — CloudWatch actuals (Path C) | MEDIUM — inferred (Path A) or user-provided (Path B) | LOW — all baselines (Path B defaults)]

COST COMPOSITION
  Compute (resets monthly):        $XX.XX  (XX%)
    Lambda, API GW, Bedrock, CloudFront requests, SQS
  Storage (compounds over time):   $XX.XX  (XX%)
    S3, DynamoDB storage, CloudWatch Logs retention

STORAGE GROWTH TRAJECTORY
  (based on [X]GB/month new data at current write rate)
  Month 1:   $XX.XX storage  →  $XX.XX total
  Month 3:   $XX.XX storage  →  $XX.XX total
  Month 6:   $XX.XX storage  →  $XX.XX total
  Month 12:  $XX.XX storage  →  $XX.XX total  [⚠ UNBOUNDED if retention=Never]

[If growth specified:]
  6-month projection ([Nx]):       ~$XX.XX/month

⚠ Estimates only. Free tier excluded. Verify: calculator.aws
```

Only show line items for services present in the manifest. Flag any service exceeding 30% of the total bill as ⚠ HOTSPOT with its percentage.

**Storage classification rules:**

- **COMPUTE (resets monthly):** Lambda compute + requests, API Gateway requests, CloudFront requests, CodeBuild build-minutes, SQS/SNS/EventBridge message costs, Step Functions transitions, Bedrock token costs, Cognito MAU charges, CloudWatch Logs *ingestion* (`DataProcessing-Bytes`).
- **STORAGE (compounds):** S3 storage GB-months, DynamoDB item storage GB-months, CloudWatch Logs *storage* (`TimedStorage-ByteHrs`), RDS storage, ElastiCache node-hours, Kinesis shard-hours.

**Storage trajectory formula:** `storage_at_month_N = (initial_GB + monthly_ingest_GB × N) × storage_rate_per_GB`. Monthly ingest rate is derived from CloudWatch log ingest MB (Phase 4) + S3 PUT volume × avg object size (default 10KB per PUT) + DynamoDB write volume × avg item size (default 1KB per write). If `RetentionInDays` is set on a log group, cap stored GB at `ingest_rate × retention_days / 30` rather than letting it grow unbounded. If retention is Never, flag Month 12 as `⚠ UNBOUNDED — set RetentionInDays`.

---

## Phase 6b — Per-Workflow Cost Model

Classify every Lambda function by trigger type and group into workflows. Use invocation counts already collected in Phase 4 to weight each function's cost contribution. Output cost per invocation for each workflow.

### Step 1: Classify Lambda functions by trigger type

Read each Lambda function's `Events:` block (SAM) or event source mapping (CDK/Terraform):

| Event source type | Classification |
|---|---|
| `Api` or `HttpApi` | USER_FACING — called via API Gateway |
| `SQS`, `DynamoDBStreams`, `Kinesis`, `SNS` | ASYNC_WORKER — triggered by message or stream |
| `Schedule` or `ScheduleV2` | BACKGROUND — scheduled/cron job |
| `Cognito`, `S3`, `EventBridgeRule` | EVENT_DRIVEN — triggered by external event |
| No Events block | UNKNOWN — internal, likely called by another Lambda |

**Cross-resource trigger detection:** If a Lambda has no `Events:` block (classified UNKNOWN), scan the rest of the template for resources that target it:
- `AWS::Scheduler::Schedule` where `Target.Arn` references the function → reclassify as **BACKGROUND**
- `AWS::Events::Rule` where a `Target` references the function → reclassify as **EVENT_DRIVEN** (or **BACKGROUND** if the rule uses `ScheduleExpression`)
- `AWS::SNS::Subscription` where `Endpoint` references the function → reclassify as **ASYNC_WORKER**
- `AWS::S3::Bucket` `NotificationConfiguration.LambdaConfigurations` referencing the function → reclassify as **EVENT_DRIVEN**

Match by `!GetAtt FnName.Arn`, `!Ref FnName`, or physical ARN. Flag reclassified functions as `(inferred from [resource type] — verify)`.

### Step 2: Group functions into workflows

Workflow entry points are USER_FACING and BACKGROUND functions. Group downstream functions into each workflow using these signals (in priority order):

1. **Environment variable references**: if a Lambda has an env var whose value is another Lambda's function name or ARN (`!Ref OtherFunction`), that downstream function belongs to the same workflow.
2. **SQS coupling**: if the entry-point Lambda has `sqs:SendMessage` permission to a queue and another Lambda has that queue as its `Events` trigger, group the worker into the same workflow.
3. **Step Functions**: if the entry-point Lambda starts a state machine (`states:StartExecution` IAM permission), find all Lambda resources referenced in the state machine `Definition`.
4. **Name-prefix heuristic (fallback)**: group functions sharing a common name prefix. Always flag these as `(inferred by name — verify)`.

ASYNC_WORKER and UNKNOWN functions that cannot be attributed to any workflow go in an UNATTRIBUTED section.

### Step 3: Calculate per-invocation cost

For each workflow:

```
cost_per_invocation =
  sum over each Lambda in workflow:
    (request_rate + avg_duration_sec × memory_GB × compute_rate_per_GBsec)
    weighted by (fn_invocations / total_workflow_invocations)
  + api_gateway_rate_per_request       (USER_FACING workflows only)
  + (reads_per_call × ddb_read_rate) + (writes_per_call × ddb_write_rate)
      (default: 2 reads + 1 write per invocation if not derivable from actuals)
  + (avg_log_KB_per_invocation / 1,000,000 × $0.50)
      (default: 1KB per invocation)
  + sqs_or_event_rate_per_message      (if SQS/EventBridge in chain)
```

If CloudWatch invocation counts are 0 or unavailable, assume equal weighting across all functions in the workflow.

### Output format

```
COST PER WORKFLOW
══════════════════════════════════════════════════════
Assumptions: 2 DDB reads + 1 write per request | 1KB logs per invocation
Fan-out: 1:1 (override with actual ratios if known)

  USER-FACING API CALLS
  ┌─────────────────────────────┬──────────┬──────────────────┐
  │ Endpoint (Lambda)           │ Cost/req │ Est. monthly     │
  ├─────────────────────────────┼──────────┼──────────────────┤
  │ CreateOrganization          │ $0.00XXX │ $X.XX (1 inv/mo) │
  │ DashboardActions            │ $0.00XXX │ $X.XX (186/mo)   │
  │ FeedbackActions             │ $0.00XXX │ $X.XX (41/mo)    │
  │ KnowledgeBaseActions        │ $0.00XXX │ $X.XX (289/mo)   │
  └─────────────────────────────┴──────────┴──────────────────┘

  ASYNC / EVENT-DRIVEN
  ┌─────────────────────────────┬──────────┬──────────────────┐
  │ Workflow                    │ Cost/evt │ Est. monthly     │
  ├─────────────────────────────┼──────────┼──────────────────┤
  │ FeedbackDBStream (DDB)      │ $0.00XXX │ $X.XX (355/mo)   │
  │ ProjectDDBStream (DDB)      │ $0.00XXX │ $X.XX (4/mo)     │
  └─────────────────────────────┴──────────┴──────────────────┘

  SCHEDULED / BACKGROUND
  ┌─────────────────────────────┬──────────┬──────────────────┐
  │ Job                         │ Cost/run │ Est. monthly     │
  ├─────────────────────────────┼──────────┼──────────────────┤
  │ EmailAlertScheduler         │ $0.00XXX │ $X.XX (0/mo)     │
  │ RecurringStartFC            │ $0.00XXX │ $X.XX (5/mo)     │
  └─────────────────────────────┴──────────┴──────────────────┘

  UNATTRIBUTED FUNCTIONS
  [FunctionName]  ⚠ no trigger detected — orphaned or internal?

  Most expensive endpoint:  [name]  $X.XX/request
  Cheapest endpoint:        [name]  $X.XX/request
══════════════════════════════════════════════════════
Note: Inferred groupings marked (inferred by name — verify).
If a function belongs to multiple workflows, cost is shown under each — do not double-count.
```

---

## Phase 6c — Unit Economics

Append directly after the Per-Workflow Cost Model output. Uses total monthly cost from Phase 6 and MAU from Phase 4 (Cognito MAU value, default 1,000).

```
UNIT ECONOMICS
══════════════════════════════════════════════════════
Total monthly cost:      $XX.XX
Monthly API calls:       X,XXX,XXX
Monthly active users:    X,XXX (from Cognito MAU)

  Cost per API call:     $0.000XXX
  Cost per MAU:          $X.XX/user/month

  Break-even traffic:    [N] req/day before this stack costs >$50/month
    (= $50 / (cost_per_request × 30 days))
══════════════════════════════════════════════════════
⚠ Estimates only. Free tier excluded. Verify: calculator.aws
```

If MAU or total API calls are zero or all baselines: flag `⚠ Using baseline usage figures — unit economics will be inaccurate. Describe your traffic (Path A), provide numbers (Path B), or fetch actuals (Path C).`

---

## Phase 6d — Data Transfer Estimation

Serverless stacks incur data transfer through:
- Lambda → Internet (via API Gateway): response payload egress
- CloudFront → origin fetch
- DynamoDB/S3 cross-region replication (if detected)

Add a `Data transfer (internet egress)` line item to the cost output using:

```
Data transfer (internet egress) =
  monthly_api_requests × avg_response_size_KB / 1,000,000 × $0.09/GB
```

Default avg response size: 5KB (JSON API response). First 100GB/month is $0.09/GB, next 10TB is $0.085/GB — use $0.09 as default simplification.

If CloudFront is in the manifest, its egress is already accounted for in the CloudFront line item. Only add this data transfer line for API Gateway egress not fronted by CloudFront.

---

## Phase 7 — Ranked Recommendations

List top 3–5 optimizations ranked by monthly savings. Each must include:

- Estimated $ savings/month
- Root cause (one line)
- Exact config fix for the detected framework

Check these in order:

### 1. CloudWatch Log retention

SAM/CDK default is Never Expire. High log volume = expensive unbounded storage. At current ingest rate, Month 12 storage cost = $XX.XX (from storage growth trajectory above).

- **SAM fix**: add `RetentionInDays: 30` to each function's LogGroup resource
- **CDK fix**: `logRetention: RetentionDays.ONE_MONTH` on Function construct
- **Terraform fix**: `aws_cloudwatch_log_group` with `retention_in_days = 30`

### 2. Bedrock model selection

If Sonnet or Opus is used for tasks Haiku can handle, cost difference is 12–60×.

- Haiku: classification, extraction, summarization, simple Q&A
- Sonnet/Opus: complex reasoning, code generation, long-form synthesis
- **Fix**: parameterize model ID; test with Haiku first, escalate only if quality is insufficient
- Enable Bedrock prompt caching if the same system prompt repeats (up to 90% savings on cached tokens)

### 3. Lambda architecture

x86 costs 20% more than ARM64 at the same memory and duration.

- **SAM fix**: `Architectures: [arm64]` under Globals or per function
- **CDK fix**: `architecture: Architecture.ARM_64`
- **Terraform fix**: `architectures = ["arm64"]`

### 4. API Gateway type

REST API costs 3.5× more than HTTP API for standard use cases.

Recommend HTTP API if no advanced REST features detected (WAF integration, usage plans, per-method caching).

### 5. DynamoDB capacity mode

If PAY_PER_REQUEST and writes exceed 1M/month, evaluate PROVISIONED.

Breakeven: provisioned is cheaper above approximately 1M writes/month.

### 6. Secrets Manager → SSM Parameter Store

USD 0.40/secret/month vs USD 0.05/parameter/month for non-rotating config values.

### 7. CloudFront price class

`PriceClass_All` routes globally. `PriceClass_100` (US + EU only) is ~40% cheaper if traffic is primarily from those regions.

- **CFN/SAM fix**: `PriceClass: PriceClass_100` in `DistributionConfig`
- **CDK fix**: `priceClass: PriceClass.PRICE_CLASS_100`
- **Terraform fix**: `price_class = "PriceClass_100"`

### 8. Lambda memory rightsizing

If average duration is under 500ms at current memory, test lower tier. Use AWS Lambda Power Tuning for data-driven rightsizing.

### 9. Idle Lambda functions

Flag functions with 0 invocations in the last 30 days for review or removal.

### 10. Lambda Compute Savings Plan

If total Lambda compute cost exceeds USD 5/month, a 1-year Compute Savings Plan saves approximately 17% on Lambda compute charges.

- Applies automatically to all Lambda functions in the account — no code changes required.
- Link user to: AWS Console → Savings Plans → Purchase Savings Plans → Compute Savings Plan
- Do not recommend if total Lambda compute is ≤ USD 5/month (savings too small to justify commitment).

### 11. DynamoDB storage cost — archive old items

If DynamoDB billing mode is PAY_PER_REQUEST and the storage trajectory (Phase 6) projects >10GB stored by month 12, recommend archiving old items to S3.

- DynamoDB storage: USD 0.25/GB-month. S3 Standard storage: USD 0.023/GB-month. S3 is 88% cheaper per GB.
- Approach: add a TTL attribute to items, enable DynamoDB Streams, stream expired items to S3 via Lambda, delete from DynamoDB.
- Alternative: use DynamoDB export to S3 (point-in-time or full table) and delete archived items.
- Estimated savings: `(projected_GB_month_12 - baseline_GB) × ($0.25 - $0.023)` per month by month 12.

**Output this format:**

```
COST OPTIMIZATIONS (ranked by estimated savings)

1. [$X.XX/month] [Title]
   [Root cause — one line]
   [Framework-specific config snippet]

2. ...
```

---

## Phase 8 — Write Cost Report

After presenting all results in chat (Phases 6–7), write a markdown report to the project directory. This gives the user a persistent, shareable artifact.

**File name:** `cost-estimate.md` — or `cost-estimate-[stack-name].md` if the stack name is known. If the file already exists, overwrite it (estimates are point-in-time).

**After writing, tell the user:** "Cost report written to `cost-estimate.md`"

**Report template:**

````markdown
# Cost Estimate — [Stack Name] — [Region]

> Generated [date] | Pricing: [source] | Usage: [source] | Confidence: [HIGH|MEDIUM|LOW]

## Summary

| | Monthly |
|---|---|
| **Estimated total** | **~$XX.XX** |
| Confidence range | $XX.XX — $XX.XX |
| Cost per API call | $0.000XXX |
| Cost per MAU | $X.XX |
| Break-even | [N] req/day to reach $50/month |

## Cost Breakdown

| Service | Monthly Cost | % of Total | Notes |
|---|---|---|---|
| Lambda ([N] functions) | $XX.XX | XX% | arm64, [mem]MB |
| API Gateway ([type]) | $XX.XX | XX% | |
| DynamoDB | $XX.XX | XX% | [mode], [N] GSI |
| ... | ... | ... | |
| **Total** | **$XX.XX** | | |

Only include services present in the manifest. Flag any service >30% of total with HOTSPOT.

## Assumptions

| Parameter | Value | Source |
|---|---|---|
| Lambda invocations | [N]/month | actual / inferred / user / baseline |
| Avg duration | [X]ms | actual / inferred / user / baseline |
| DynamoDB reads | [N]/month | actual / inferred / user / baseline |
| DynamoDB writes | [N]/month | actual / inferred / user / baseline |
| DynamoDB stored | [X]GB | actual / inferred / user / baseline |
| Avg response size | [X]KB | user / default |
| ... | ... | ... |

## Per-Workflow Costs

### User-Facing API Calls

| Endpoint | Cost/req | Est. Monthly |
|---|---|---|
| [FunctionName] | $0.00XXX | $X.XX ([N] inv/mo) |

### Async / Event-Driven

| Workflow | Cost/event | Est. Monthly |
|---|---|---|
| [FunctionName] ([trigger]) | $0.00XXX | $X.XX ([N]/mo) |

### Scheduled / Background

| Job | Cost/run | Est. Monthly |
|---|---|---|
| [FunctionName] | $0.00XXX | $X.XX ([N]/mo) |

Most expensive endpoint: [name] — $X.XX/request
Cheapest endpoint: [name] — $X.XX/request

## Storage Growth

| Month | Storage Cost | Total Cost | Notes |
|---|---|---|---|
| 1 | $XX.XX | $XX.XX | |
| 3 | $XX.XX | $XX.XX | |
| 6 | $XX.XX | $XX.XX | |
| 12 | $XX.XX | $XX.XX | UNBOUNDED if retention=Never |

## Optimizations

1. **[$X.XX/month] [Title]**
   [Root cause — one line]
   ```yaml
   [Framework-specific config fix]
   ```

2. ...

---

*Estimates only. Free tier excluded. Verify: [calculator.aws](https://calculator.aws)*
````

Only include sections relevant to the manifest — skip Per-Workflow Costs if there is only one Lambda, skip Storage Growth if no compounding storage services are present.

---

## Safety Requirements

- Never write to AWS. All operations are read-only: `cloudformation describe-*`, `cloudwatch get-*`, `pricing get-*`.
- Never request or store AWS credentials or secrets.
- Never run destructive AWS CLI commands.
- Always show the disclaimer on cost output: "⚠ Estimates only. Free tier excluded. Verify: calculator.aws"
- Always show pricing source (live API vs cached fallback).
- If CLI commands fail: tell the user the exact command to run themselves. Do not guess or fabricate numbers.
