# figma-design-audit

A Claude Code skill that audits a Figma design against its design system and leaves inline comments on every violation found.

## Usage

```
/figma-design-audit <figma-url>
```

You will also be prompted for (or can pass inline) a **Figma personal access token** — needed to post comments via the REST API.

### Example

```
/figma-design-audit https://www.figma.com/design/Jucz9tPOsXOGFUcm69VA2h/Design-Review?node-id=23-955
```

## What it checks

| Check | Description |
|-------|-------------|
| **Color variables** | Every fill/stroke must be bound to a design system color variable. Raw hex values are flagged even if they coincidentally match a variable's value. |
| **Font styles** | Every text node must be linked to a named text style. Nodes whose properties match a style fingerprint but are not formally linked are still flagged. |
| **Numeric variables** | Padding, gap, and corner radius values must be bound to numeric variables. Raw values are flagged even if they appear in the token set. Zero values are ignored. |
| **Unnecessary nesting** | Single-child frames/groups that add no visible styling, pass-through groups, and empty containers are flagged. |

## Prerequisites

- Figma MCP server connected (the `get_design_context` and `get_variable_defs` tools must be available)
- A Figma personal access token with comment write access to the file

## How it works

1. Parses the Figma URL to extract `fileKey` and `nodeId`
2. Fetches design system variables (`get_variable_defs`) to build allowed color, numeric, and text style reference sets
3. Fetches the full design context (`get_design_context`) for the selected node and all descendants
4. Traverses every node and runs all four checks
5. Posts one comment per node (multiple violations batched with `•` bullets) via the Figma REST API
6. Outputs a structured summary grouped by violation category

## Output

Comments are posted directly to the Figma canvas, pinned to the violating node. A summary is also printed to the terminal after all comments are posted.
