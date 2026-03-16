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

### Step 2: Classify each resource type

For each type found, determine which billing category it falls into:

**BILLABLE — include in manifest and estimate:**
Any resource type where AWS charges based on provisioning or usage. When in doubt, include it.

Examples of always-billable types:
`AWS::Lambda::Function`, `AWS::Serverless::Function`,
`AWS::DynamoDB::Table`,
`AWS::ApiGateway::RestApi`, `AWS::ApiGatewayV2::Api`,
`AWS::S3::Bucket`,
`AWS::CloudFront::Distribution`,
`AWS::Cognito::UserPool`,
`AWS::SQS::Queue`,
`AWS::SNS::Topic`,
`AWS::Events::EventBus` (custom buses only — default bus is free),
`AWS::Scheduler::Schedule`, `AWS::Scheduler::ScheduleGroup`,
`AWS::Kinesis::Stream`,
`AWS::StepFunctions::StateMachine`,
`AWS::CodeBuild::Project`,
`AWS::CodePipeline::Pipeline`,
`AWS::RDS::DBInstance`, `AWS::RDS::DBCluster`,
`AWS::ElastiCache::CacheCluster`, `AWS::ElastiCache::ReplicationGroup`,
`AWS::OpenSearchService::Domain`,
`AWS::MSK::Cluster`,
`AWS::ECS::Service` (Fargate launch type),
`AWS::SecretsManager::Secret`,
`AWS::SSM::Parameter` (Advanced tier only — check `Tier: Advanced`),
`AWS::Bedrock::KnowledgeBase`,
`AWS::WAFv2::WebACL`,
`AWS::Route53::HostedZone`

**FREE / CONFIGURATION ONLY — skip:**
`AWS::IAM::Role`, `AWS::IAM::Policy`, `AWS::IAM::ManagedPolicy`,
`AWS::Lambda::Permission`, `AWS::Lambda::EventSourceMapping`,
`AWS::S3::BucketPolicy`,
`AWS::CloudFormation::*`,
`AWS::CDK::Metadata`,
`AWS::Cognito::UserPoolClient`, `AWS::Cognito::UserPoolDomain`, `AWS::Cognito::UserPoolIdentityProvider`,
`AWS::CloudFront::CloudFrontOriginAccessIdentity`, `AWS::CloudFront::OriginAccessControl`,
`AWS::Route53::RecordSet` (not a hosted zone — zone itself has a cost),
`AWS::Scheduler::ScheduleGroup` (the group itself is free; schedules within it are billed)

**UNKNOWN TYPE**: If you encounter a resource type not in either list above, mark it as `⚠ UNKNOWN — pricing not confirmed` in the manifest and attempt to look up its pricing in Phase 5.

### Step 3: Scan for usage-based services invoked from Lambda

These services are not provisioned resources but generate costs via API calls. Scan all IAM policy statements and Lambda environment variables for these permission patterns:

| Permission prefix | Service | What to estimate |
|---|---|---|
| `bedrock:InvokeModel` or `bedrock:InvokeModelWithResponseStream` | Amazon Bedrock | Calls/day per model, avg input + output tokens |
| `comprehend:*` | Amazon Comprehend | Document classification or entity detection calls |
| `rekognition:*` | Amazon Rekognition | Image/video analysis calls |
| `textract:*` | Amazon Textract | Pages analyzed |
| `translate:*` | Amazon Translate | Characters translated |
| `polly:*` | Amazon Polly | Characters synthesized |
| `transcribe:*` | Amazon Transcribe | Audio minutes |
| `sagemaker:InvokeEndpoint` | Amazon SageMaker | Endpoint invocations |
| `ses:SendEmail` or `ses:SendRawEmail` | Amazon SES | Emails sent |

For each detected permission, extract the specific resource ARNs or model IDs where possible (e.g., Bedrock model IDs from ARN strings like `foundation-model/anthropic.claude-3-haiku-20240307-v1:0`).

### Step 4: Add implicit auto-billed resources

- One CloudWatch Log Group per Lambda function (retention=Never by default ⚠)
- One CloudWatch Log Group per CodeBuild project
- CloudWatch Log Group for any service with logging enabled

### Step 5: Extract key config from template

For each billable resource, extract the config properties that determine cost tier — never ask the user about values readable from the template:

- **Lambda / Serverless::Function**: `Architectures` (default x86_64), `MemorySize` (default 128MB), `Timeout` (default 3s), `Runtime`
- **DynamoDB**: `BillingMode` (default PROVISIONED), `ProvisionedThroughput.ReadCapacityUnits`/`WriteCapacityUnits`, or PAY_PER_REQUEST
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

AWS bills on usage, not existence. The IaC tells us what resources exist; we need usage numbers to calculate cost. For each billable resource in the manifest, show the user what data is needed and offer three options:

### Present this to the user after confirming the manifest

Show a usage data summary like this:

```
USAGE DATA NEEDED
To calculate cost I need usage figures for each service.
All values have sensible defaults — you can skip any question.

SERVICE            WHAT'S NEEDED                     DEFAULT
Lambda             Invocations/month, avg duration   300,000/mo, 500ms
DynamoDB           Reads + writes/month              600K reads, 300K writes
CloudFront         Requests/month, data transfer GB  same as Lambda req, 1GB
CloudWatch Logs    MB ingested/month per function    100MB/function
Cognito            Monthly active users (MAU)        1,000
CodeBuild          Builds/month, avg duration min    100 builds, 5 min
Bedrock (Haiku)    Calls/day, input tokens, output   1,000/day, 500in, 200out
SES                Emails sent/month                 1,000
EventBridge        Events/month                      same as Lambda req
[... only services present in manifest ...]

How would you like to provide usage data?
  A — Fetch last 30 days actuals from CloudWatch (requires AWS CLI access)
  B — I'll provide my own estimates
  C — Use all defaults and calculate now
```

Wait for the user's choice before proceeding.

---

### Path A — Fetch from CloudWatch (30-day actuals)

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
  --start-time $(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda --metric-name Duration \
  --dimensions Name=FunctionName,Value=[PHYSICAL_FUNCTION_NAME] \
  --start-time $(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Average

# Step 2b: DynamoDB — consumed capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=[TABLE_NAME] \
  --start-time $(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=[TABLE_NAME] \
  --start-time $(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

# Step 2c: CloudWatch Logs ingestion per log group
aws cloudwatch get-metric-statistics \
  --namespace AWS/Logs --metric-name IncomingBytes \
  --dimensions Name=LogGroupName,Value=/aws/lambda/[PHYSICAL_FUNCTION_NAME] \
  --start-time $(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

# Step 2d: CloudFront — requests and bytes downloaded
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront --metric-name Requests \
  --dimensions Name=DistributionId,Value=[DISTRIBUTION_ID] Name=Region,Value=Global \
  --start-time $(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront --metric-name BytesDownloaded \
  --dimensions Name=DistributionId,Value=[DISTRIBUTION_ID] Name=Region,Value=Global \
  --start-time $(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

# Step 2e: CodeBuild — builds and total duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/CodeBuild --metric-name Builds \
  --dimensions Name=ProjectName,Value=[PROJECT_NAME] \
  --start-time $(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

aws cloudwatch get-metric-statistics \
  --namespace AWS/CodeBuild --metric-name Duration \
  --dimensions Name=ProjectName,Value=[PROJECT_NAME] \
  --start-time $(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum

# Step 2f: Bedrock — invocations per model
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock --metric-name Invocations \
  --dimensions Name=ModelId,Value=[MODEL_ID] \
  --start-time $(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 2592000 --statistics Sum
```

**Note**: CloudWatch does not expose Bedrock token counts or SES email volume. After fetching all available metrics, ask the user to estimate:
- Average input + output tokens per Bedrock call (per model)
- Emails sent/month via SES (if SES detected)

If any command fails: tell the user "Run this command yourself and paste the output here: [exact command]". Do not guess or use defaults silently — always show which values came from CloudWatch and which are estimated.

---

### Path B — User estimates

Ask only what the template cannot answer. Group into one message, one question per line. All have defaults — user can reply with just the values or "all defaults".

| # | Question | Default |
|---|---|---|
| 1 | Requests/day in production? | 10,000 |
| 2 | CloudWatch log MB/month per Lambda function? | 100MB |
| 3 | DynamoDB data stored (GB)? | 1GB |
| 4 | S3 data stored per bucket (GB)? | 1GB |
| 5 | Messages/day per SQS queue? | same as requests |
| 6 | Step Functions executions/day? | 10% of requests |
| 7 | Cognito MAU? | 1,000 |
| 8 | CodeBuild: builds/month + avg duration (min)? | 100 builds, 5 min |
| 9 | CloudFront data transfer GB/month? | 1GB |
| 10 | Bedrock [model]: calls/day, avg input tokens, avg output tokens? | 1,000/day, 500 in, 200 out |
| 11 | SES emails/month? | 1,000 |
| 12 | Traffic growth in 6 months? (optional) | flat |

Only include rows for services present in the manifest.

---

### Path C — Use all defaults

Proceed directly to Phase 5 using the default values in the table above. Note in the output that all usage figures are defaults and may not reflect actual traffic.

---

## Phase 5 — Fetch Live Pricing

The AWS Pricing API always requires `--region us-east-1` regardless of deployment region. Map the deployment region to the correct location string:

| Region | Location string |
|---|---|
| us-east-1 | US East (N. Virginia) |
| us-east-2 | US East (Ohio) |
| us-west-2 | US West (Oregon) |
| eu-west-1 | Europe (Ireland) |
| eu-central-1 | Europe (Frankfurt) |
| ap-south-1 | Asia Pacific (Mumbai) |
| ap-southeast-1 | Asia Pacific (Singapore) |
| ap-northeast-1 | Asia Pacific (Tokyo) |

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
- **CloudWatch Logs**: `USE1-DataProcessing-Bytes` (ingestion), `USE1-TimedStorage-ByteHrs` (storage)
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
| DynamoDB reads (on-demand) | USD 0.000000125 | RCU |
| DynamoDB writes (on-demand) | USD 0.000000625 | WCU |
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

| Model | Input | Output | Unit |
|---|---|---|---|
| Claude 3 Haiku | USD 0.00025 | USD 0.00125 | per 1K tokens |
| Claude 3 Sonnet / 3.5 Sonnet | USD 0.003 | USD 0.015 | per 1K tokens |
| Claude 3.5 Haiku | USD 0.0008 | USD 0.004 | per 1K tokens |
| Claude 3 Opus | USD 0.015 | USD 0.075 | per 1K tokens |
| Titan Embed Text v1 | USD 0.0001 | — | per 1K tokens |
| Titan Embed Text v2 | USD 0.00002 | — | per 1K tokens |
| Cohere Embed | USD 0.0001 | — | per 1K tokens |
| Llama 3 8B Instruct | USD 0.0003 | USD 0.0006 | per 1K tokens |
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
  (monthly_reads × read_rate) + (monthly_writes × write_rate)

DynamoDB PROVISIONED =
  (RCU × 730hrs × provisioned_RCU_rate) + (WCU × 730hrs × provisioned_WCU_rate)

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
```

**Output this exact format:**

```
PRODUCTION COST ESTIMATE — [region] — [Month Year]
════════════════════════════════════════════════════
Pricing: [AWS Pricing API (live) | Cached 2026-03 ⚠]
Usage:   [CloudWatch actuals (30d) | User estimates]

ASSUMPTIONS USED
  Lambda invocations: [N]/month | avg duration: [X]ms
  DynamoDB: [N] reads + [N] writes/month
  Bedrock [model]: [N] calls/month | [X] in + [Y] out tokens avg
  CloudWatch Logs: [X]MB ingested/month
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
  [all other detected services]    $XX.XX
  ─────────────────────────────────────────
  ESTIMATED TOTAL:                 ~$XX.XX/month

[If growth specified:]
  6-month projection ([Nx]):       ~$XX.XX/month

⚠ Estimates only. Free tier excluded. Verify: calculator.aws
```

Only show line items for services present in the manifest. Flag any service exceeding 30% of the total bill as ⚠ HOTSPOT with its percentage.

---

## Phase 7 — Ranked Recommendations

List top 3–5 optimizations ranked by monthly savings. Each must include:

- Estimated $ savings/month
- Root cause (one line)
- Exact config fix for the detected framework

Check these in order:

### 1. CloudWatch Log retention

SAM/CDK default is Never Expire. High log volume = expensive unbounded storage.

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

**Output this format:**

```
COST OPTIMIZATIONS (ranked by estimated savings)

1. [$X.XX/month] [Title]
   [Root cause — one line]
   [Framework-specific config snippet]

2. ...
```

---

## Safety Requirements

- Never write to AWS. All operations are read-only: `cloudformation describe-*`, `cloudwatch get-*`, `pricing get-*`.
- Never request or store AWS credentials or secrets.
- Never run destructive AWS CLI commands.
- Always show the disclaimer on cost output: "⚠ Estimates only. Free tier excluded. Verify: calculator.aws"
- Always show pricing source (live API vs cached fallback).
- If CLI commands fail: tell the user the exact command to run themselves. Do not guess or fabricate numbers.
