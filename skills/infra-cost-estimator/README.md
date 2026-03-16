# infra-cost-estimator

Predict monthly AWS production cost from SAM, CDK, or Terraform files before a single resource is provisioned.

Fetches live pricing from the AWS Pricing API. Uses CloudWatch actuals if the stack is already deployed. Ranks cost optimizations by estimated savings so you can fix the architecture before it ships.

---

## Prerequisites

**AWS CLI** configured with a profile that has these read-only permissions:

- `cloudformation:DescribeStackResources` — resolve physical resource names from logical IDs
- `cloudwatch:GetMetricStatistics` — fetch 30-day usage actuals
- `pricing:GetProducts` — fetch live pricing (must reach `us-east-1`)

**CDK projects** additionally require Node.js and the CDK CLI:

```bash
npm install -g aws-cdk
```

---

## How to Invoke

Run this skill from your project root directory — the directory containing `template.yaml`, `cdk.json`, or `*.tf` files.

In your AI assistant, say:

> Run the infra-cost-estimator skill on this project.

Or point it at a specific file:

> Run infra-cost-estimator on backend/template.yaml

The skill will walk you through 7 phases: detect IaC, build resource manifest, confirm it, collect usage data, fetch live pricing, output the cost estimate, and recommend optimizations.

---

## Example Output

```
─────────────────────────────────────────────────
RESOURCE MANIFEST
Source: template.yaml (SAM) | Region: us-east-1

COMPUTE
  Lambda: ProcessOrder     arm64  512MB  3s  nodejs20.x
  Lambda: GetOrder         arm64  256MB  3s  nodejs20.x
  Lambda: SendNotification arm64  128MB  3s  nodejs20.x

API
  API Gateway: OrderApi   type=REST   ($3.50/million requests)

DATA
  DynamoDB: OrdersTable   PAY_PER_REQUEST

ASYNC
  SQS: NotificationQueue   type=standard

AUTO-CREATED
  CloudWatch Log Group × 3   retention=Never ⚠
─────────────────────────────────────────────────

PRODUCTION COST ESTIMATE — us-east-1 — March 2026
════════════════════════════════════════════════════
Pricing: AWS Pricing API (live)
Usage:   User estimates

ASSUMPTIONS USED
  Lambda invocations: 300,000/month | avg duration: 450ms
  DynamoDB: 600,000 reads + 300,000 writes/month
  SQS: 300,000 messages/month
  CloudWatch Logs: 300MB ingested/month (3 functions × 100MB)

COST BREAKDOWN
  Lambda (3 functions):        $1.12
  API Gateway (REST):          $1.05
  DynamoDB (1 table):          $0.26
  SQS:                         $0.12
  CloudWatch Logs:             $1.51  ⚠ HOTSPOT — 37% of total bill
  ─────────────────────────────────────
  ESTIMATED TOTAL:             ~$4.06/month

⚠ Estimates only. Free tier excluded. Verify: calculator.aws

COST OPTIMIZATIONS (ranked by estimated savings)

1. [$1.35/month] Set CloudWatch log retention
   3 log groups with retention=Never will accumulate unbounded storage costs
   SAM fix — add under each function or Globals:
     LogGroup:
       Type: AWS::Logs::LogGroup
       Properties:
         LogGroupName: !Sub /aws/lambda/${MyFunction}
         RetentionInDays: 30

2. [$0.74/month] Switch to HTTP API
   REST API costs $3.50/M vs HTTP API at $1.00/M — 3.5× savings
   No usage plans or WAF integration detected in template

3. [$0.22/month] Enable ARM64 on remaining x86 functions
   GetOrder and SendNotification are still x86 — ARM64 costs ~20% less
   SAM fix: add Architectures: [arm64] under Globals/Function
```

---

## Supported Frameworks

| Framework | Detection | Notes |
|---|---|---|
| AWS SAM | `template.yaml` with `Transform: AWS::Serverless-2016-10-31` | Reads template directly |
| AWS CDK | `cdk.json` present | Prefers `cdk.out/` synthesized JSON; runs `cdk synth` if needed |
| Terraform | Any `*.tf` files | Parses HCL resource blocks |

---

## Limitations

- **Free tier excluded**: estimates reflect production costs at volume, not the AWS free tier.
- **Data transfer costs not included**: egress pricing is not calculated.
- **Shared resources**: if your stack references resources in other stacks, exclude them when confirming the manifest in Phase 3.
- **CDK dynamic values**: if CDK constructs generate resource config dynamically at deploy time, `cdk synth` output may not reflect all configuration.
