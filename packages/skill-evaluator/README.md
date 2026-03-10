# Skill Evaluator

Two-tier evaluator for Claude Code skills.

- **Tier 1** — Deterministic checks (structure, frontmatter, tokens, security patterns). No external API needed.
- **Tier 2** — LLM-as-judge via `claude -p` scoring usefulness, efficiency, correctness, safety, and completeness (1–5 scale).

## Usage

```bash
cd packages/skill-evaluator

# Tier 1 only
uv run evaluate.py ../../skills/aws-bedrock-evals/ --tier 1

# Full eval (requires claude CLI)
uv run evaluate.py ../../skills/aws-bedrock-evals/

# JSON output
uv run evaluate.py ../../skills/aws-bedrock-evals/ --json

# Custom model for Tier 2
uv run evaluate.py ../../skills/aws-bedrock-evals/ --model claude-sonnet-4-20250514
```
