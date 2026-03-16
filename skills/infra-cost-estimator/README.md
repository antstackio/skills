# infra-cost-estimator

Ballpark your AWS costs and catch architecture mistakes before you deploy.

Point this skill at a SAM template, CDK project, or Terraform config and get back:

- **Cost estimate** — per-service monthly breakdown with confidence range
- **Unit economics** — cost per API call, per user, per workflow
- **Ranked optimizations** — concrete savings with copy-paste config fixes
- **Markdown report** — saved to `cost-estimate.md` for PRs and team sharing

---

## How to Invoke

```
> Run the infra-cost-estimator skill on this project
> Estime the costs on my project from @backend/
> Run infra-cost-estimator on backend/ using AWS profile MyProfile
```

---

## Supported Frameworks

| Framework | Detection |
|---|---|
| AWS SAM | `template.yaml` with `Transform: AWS::Serverless-2016-10-31` |
| AWS CDK | `cdk.json` present (uses `cdk.out/`; runs `cdk synth` if needed) |
| Terraform | Any `*.tf` files |

---

## Prerequisites

- **AWS CLI** with read-only permissions: `cloudformation:Describe*`, `cloudwatch:GetMetricStatistics`, `pricing:GetProducts`
- **CDK projects**: Node.js + `npm install -g aws-cdk`

---

## How It Works

1. **Detect framework** — finds SAM, CDK, or Terraform files
2. **Build manifest** — extracts billable resources, scans IAM for usage-based services (SES, Bedrock, etc.)
3. **Confirm manifest** — you verify before proceeding
4. **Get usage data** — pick one:
   - **A** — Describe traffic naturally, numbers are inferred
   - **B** — Provide specific numbers
   - **C** — Fetch 30-day actuals from CloudWatch
5. **Fetch pricing** — live AWS Pricing API, cached fallback if unavailable
6. **Calculate** — breakdown, per-workflow costs, unit economics, storage growth
7. **Optimize** — ranked savings with framework-specific fixes
8. **Write report** — saves `cost-estimate.md` to project root

---

## Output

Results are presented in-conversation and written to `cost-estimate.md` (or `cost-estimate-<stack-name>.md`).

### Sample output

```
PRODUCTION COST ESTIMATE — us-east-1 — March 2026
════════════════════════════════════════════════════
Pricing: Cached 2026-03 ⚠
Usage:   Inferred from description — Path A

ASSUMPTIONS USED
  Lambda invocations:     150,000/month  (inferred)
  Avg duration:           200ms          (inferred)
  DynamoDB reads:         300,000/month  (inferred)
  Bedrock (Haiku):        15,000/month   (inferred)

COST BREAKDOWN
  Bedrock (Claude 3 Haiku):        $7.88   ⚠ HOTSPOT (62%)
  Lambda (12 functions):           $1.25
  API Gateway (REST):              $0.53
  DynamoDB (PAY_PER_REQUEST):      $0.34
  CloudWatch Logs:                 $0.15
  S3 (2 buckets):                  $0.05
  SES (email):                     $0.10
  Secrets Manager:                 $0.40
  Data transfer (internet egress): $0.07
  ─────────────────────────────────────────
  ESTIMATED TOTAL:                ~$10.77/month
  Confidence range:                $5.39 — $21.54/month

COST PER WORKFLOW
══════════════════════════════════════════════════════
  ┌─────────────────────────────┬──────────┬──────────────────┐
  │ Endpoint                    │ Cost/req │ Est. monthly     │
  ├─────────────────────────────┼──────────┼──────────────────┤
  │ ProcessDocument (+ Bedrock) │ $0.00058 │ $8.70 (15K/mo)   │
  │ GetDocuments                │ $0.00001 │ $0.75 (50K/mo)   │
  │ CreateDocument              │ $0.00002 │ $0.30 (20K/mo)   │
  └─────────────────────────────┴──────────┴──────────────────┘

UNIT ECONOMICS
══════════════════════════════════════════════════════
  Cost per API call:     $0.000072
  Cost per MAU:          $0.011/user/month
  Break-even at $100/mo: ~46,300 req/day

COST OPTIMIZATIONS (ranked by estimated savings)
  1. [$4.73/month] Switch Bedrock model from Sonnet to Haiku
  2. [$0.25/month] Switch Lambda architecture to ARM64
  3. [$0.15/month] Switch REST API to HTTP API
```

---

## Local Testing

### Setup

```bash
# Copy skill into your project's .claude/skills/ directory
mkdir -p /path/to/your-project/.claude/skills/infra-cost-estimator
cp SKILL.md /path/to/your-project/.claude/skills/infra-cost-estimator/
```

### Run

Open Claude Code in your project directory:

```
Run the infra-cost-estimator skill on this project
```

For CloudWatch actuals (requires deployed stack):

```
Run the infra-cost-estimator skill, use profile --profile MyAWSProfile
```

### Smoke test without AWS credentials

Choose **Path A** or **Path B** for usage data — no CloudWatch needed. The skill falls back to cached pricing automatically. Only Path C and live pricing require credentials.

### What to verify

- Manifest catches all billable resources + IAM-detected services
- All three usage paths (A/B/C) work correctly
- Math checks out against [calculator.aws](https://calculator.aws)
- Optimizations are relevant and ranked by savings
- `cost-estimate.md` is written with correct content

---

## Limitations

- **Free tier excluded** — estimates reflect production costs at volume
- **Data transfer** — API Gateway egress is estimated; cross-region/VPC transfers are not
- **Shared resources** — exclude cross-stack resources when confirming the manifest
- **Regional pricing** — fallback uses us-east-1 rates; other regions may vary ±10-20%
