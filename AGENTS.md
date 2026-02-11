# Creating Skills

## Structure

Each skill lives in `skills/<skill-name>/` using kebab-case naming.

```
skills/
└── my-skill/
    ├── SKILL.md           # Required — skill prompt and instructions
    ├── README.md          # Optional — human-readable docs
    ├── metadata.json      # Optional — name, description, tags
    ├── rules/             # Optional — additional rule files
    └── scripts/           # Optional — helper scripts
```

## Requirements

- Every skill **must** have a `SKILL.md` file.
- Use kebab-case for the skill directory name.
- Keep `SKILL.md` focused and concise — it is the prompt the agent receives.
