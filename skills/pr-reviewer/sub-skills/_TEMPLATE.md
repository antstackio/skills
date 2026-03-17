# Sub-Skill: [Stack/Technology Name]

<!--
  TEMPLATE: Copy this file to create a new sub-skill.

  Instructions:
  1. Copy this file to your-stack-name.md in this directory (sub-skills/)
  2. Fill in the file patterns, checklist items, anti-patterns, and best practices
  3. Add file pattern mappings to Step 3 in the main SKILL.md
  4. The skill will automatically pick it up on the next review
-->

## File patterns
Applies to: `*.ext1`, `*.ext2`, `config-file-name.*`

---

## Category 1: [e.g., Security]

### Check Name
- 🔴 Critical: [What to flag as a blocker]
- 🟡 Warning: [What to flag as concerning]
- 🔵 Suggestion: [What to flag as an improvement opportunity]
- ℹ️ Info: [What to note as informational]

**Anti-pattern:**
```
// ❌ Example of what NOT to do
```

**Best practice:**
```
// ✅ Example of what TO do
```

---

## Category 2: [e.g., Performance]

### Check Name
- Description of what to check and why it matters
- What the thresholds are for each severity level
- How to fix the issue

---

## Category 3: [e.g., Configuration]

### Check Name
- Items to verify in config files
- Common mistakes specific to this stack
- Best practices to validate

---

<!--
  Severity guide:
  🔴 Critical — Must fix before merge. Security vulnerabilities, data loss risks,
                 production breaking changes.
  🟡 Warning  — Should fix. Performance issues, bad patterns, maintainability
                 concerns.
  🔵 Suggestion — Nice to have. Cleaner patterns, minor improvements, style
                   consistency.
  ℹ️ Info      — For awareness. Context, explanations, things to watch in
                 future PRs.
-->
