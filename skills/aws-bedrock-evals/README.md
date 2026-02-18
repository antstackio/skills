# aws-bedrock-evals

Build and run LLM-as-judge evaluation pipelines using Amazon Bedrock Evaluation Jobs with pre-computed inference datasets. This skill teaches AI agents to walk users through the full evaluation pipeline — from designing test scenarios to parsing results and iterating on findings.

## Usage

Install via:

```bash
npx skills add antstackio/skills --skill aws-bedrock-evals
```

Then ask the agent:

- "Set up a Bedrock evaluation pipeline for my app"
- "Create custom metrics for my application"
- "Help me evaluate my Bedrock agent with LLM-as-judge"

The agent gathers your inputs (region, models, scenario count, etc.), shows a cost estimate, and then walks through each pipeline step — generating configs, scripts, and CLI commands tailored to your application.

## Prerequisites

- **AWS CLI 2.33+** installed and configured (`aws --version`)
- **Bedrock model access** enabled for both target model and evaluator model (e.g., `amazon.nova-pro-v1:0`)
- **S3 bucket** (or the skill will guide creation)
- **IAM permissions**: S3 read/write, IAM role creation, Bedrock model invocation, Bedrock evaluation job creation
- Your application's **system prompt** (used to derive custom metrics)
- **Test scenarios** covering your application's functional areas

## What the Agent Produces

- Test scenario JSON definitions
- Response collection script (e.g., Converse API with tool-calling loop)
- Pre-computed inference JSONL dataset uploaded to S3
- Custom metric definitions tailored to your app's business rules
- `eval-config.json` and `inference-config.json`
- IAM role and policy setup
- CLI command to run the evaluation job
- Result parsing script with per-category score breakdowns and low-score alerts

## When to Use This Skill

- **Pre-computed inference evaluations** — your app uses tool calling, multi-turn conversations, or external orchestration
- **Custom domain metrics** — you need to check app-specific rules beyond general text quality
- **Pre-deployment validation** — verify model behavior before shipping changes
- **Ongoing quality monitoring** — track scores over time with repeated eval runs
- **System prompt iteration** — measure the impact of prompt changes with data

## Security

This skill includes security hardening to prevent common vulnerabilities when working with AI evaluation pipelines:

- **Input validation** — All user-provided values (regions, bucket names, role names, etc.) are validated against strict regex patterns before use in shell commands. See `scripts/validate-inputs.sh`.
- **Prompt injection mitigation** — Custom metric judge prompts wrap untrusted content (`{{prompt}}`, `{{prediction}}`) in boundary markers with anti-injection preambles. JSONL fields are sanitized before upload.
- **Least-privilege IAM** — IAM templates use scoped resource ARNs, `aws:SourceArn` conditions, and explicit deny statements for dangerous S3 actions.
- **Dataset integrity** — S3 uploads use `--checksum-algorithm SHA256` for integrity verification. Downloads validate JSONL structure. See `scripts/verify-dataset.sh`.
- **Command review** — The agent shows all generated commands to the user for review before execution and confirms destructive operations.

### Validation Scripts

| Script | Purpose |
|--------|---------|
| `scripts/validate-inputs.sh` | Validates AWS regions, bucket names, role names, job names, account IDs, and model IDs |
| `scripts/validate-iam-policy.sh` | Checks IAM policy JSON for wildcard resources, missing conditions, and dangerous actions |
| `scripts/verify-dataset.sh` | Validates JSONL structure, checks for injection attempts, computes SHA-256 checksum |

## References

- [Model Evaluation Metrics](https://docs.aws.amazon.com/bedrock/latest/userguide/model-evaluation-metrics.html) — all 11 built-in metrics
- [Custom Metrics Prompt Formats](https://docs.aws.amazon.com/bedrock/latest/userguide/model-evaluation-custom-metrics-prompt-formats.html) — `metricName`, template variables, constraints
- [Prompt Datasets for Judge Evaluation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-evaluation-prompt-datasets-judge.html) — dataset JSONL format
- [CreateEvaluationJob API Reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_CreateEvaluationJob.html) — full API spec
- [AWS CLI create-evaluation-job](https://docs.aws.amazon.com/cli/latest/reference/bedrock/create-evaluation-job.html) — CLI command reference
- [Amazon Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/) — model pricing
