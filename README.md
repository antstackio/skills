# AntStack Skills

A curated collection of AI agent skills for use with Claude Code and compatible agents.

## Installation

```bash
npx skills add antstackio/skills
```

## Contributing

See [AGENTS.md](./AGENTS.md) for guidelines on creating and submitting skills.

## Skills

| Skill                                                                | Description                                                                                                                                                                                                                        |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [aws-bedrock-evals](./skills/aws-bedrock-evals/)                     | Build LLM-as-judge evaluation pipelines with Amazon Bedrock Evaluation Jobs                                                                                                                                                        |
| [react-effect-guide](./skills/react-effect-guide/)                   | Identify unnecessary useEffect usage in React code and recommend the correct alternative pattern                                                                                                                                   |
| [aws-well-architected-review](./skills/aws-well-architected-review/) | Enforces AWS Well-Architected best practices during infrastructure generation and reviews existing infra code for anti-patterns with actionable fixes                                                                              |
| [agent-web-compatibility](./skills/agent-web-compatibility/)         | Audits websites for AI consumption — agentic task completion, AEO, and GEO. AI-optimized, human-compatible.                                                                                                                        |
| [figma-design-audit](./skills/figma-design-audit/)                   | Audits a Figma design against its design system. Checks color variables, font styles, numeric variables (padding/corner radius/gap), and unnecessary nesting. Posts inline comments on the Figma canvas for every violation found. |

## License

[MIT](./LICENSE)
