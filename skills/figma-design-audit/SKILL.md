---
name: figma-design-audit
description: Audits a Figma design mock against the file's design system, checking color variables, font styles, numeric variables (padding/corner radius), and unnecessary frame/group nesting. Leaves inline comments on the Figma canvas for every violation found. Use when the user says "audit design", "check design system compliance", "review design tokens", or provides a Figma URL and wants to validate it against the design system.
---

# Figma Design System Audit

Audit the Figma design at `$ARGUMENTS` for design system compliance and leave comments on violations.

## Prerequisites

- Figma MCP server must be connected (`get_design_context` tool must be available)
- User must provide:
  1. A Figma URL: `https://figma.com/design/:fileKey/:fileName?node-id=1-2`
  2. A Figma personal access token (used only for posting comments via the REST API)

If either is missing, ask for them before proceeding.

---

## Required Workflow

Follow these steps in order. Do not skip steps.

### Step 1: Parse the Figma URL

Extract from the URL:
- **fileKey**: segment after `/design/`
- **nodeId**: value of `node-id` query parameter (convert `-` to `:` when passing to MCP tools that require it, e.g. `42-15` → `42:15`; keep `-` form for REST API calls)

Example:
- URL: `https://figma.com/design/kL9xQn2VwM8pYrTb4ZcHjF/MyApp?node-id=42-15`
- fileKey: `kL9xQn2VwM8pYrTb4ZcHjF`
- nodeId (MCP): `42:15`
- nodeId (REST): `42-15`

Also ask the user for their **Figma personal access token** if they have not already provided it. Store it as `FIGMA_TOKEN` for use in REST API calls.

---

### Step 2: Fetch Design System Variables

Run `get_variable_defs` with the file key and the target node ID to retrieve the complete design system definition:

```
get_variable_defs(fileKey=":fileKey", nodeId=":nodeId")
```

From the response, build three reference sets:

**A. Allowed color values** — Extract all variables of type `COLOR`. Collect their resolved hex values (e.g. `#1A2B3C`) and any aliases. These are the only colors permitted in the design.

**B. Allowed numeric values** — Extract all variables of type `FLOAT`. Collect the complete set of their resolved numeric values. These are the only numbers permitted for padding, gap, and corner radius.

**C. Defined text styles** — Extract all text/typography styles. Collect their names and their full property fingerprints: `{ fontFamily, fontWeight, fontSize, lineHeight, letterSpacing }`. A text node is compliant only if it is explicitly linked to one of these named styles OR all its properties exactly match a defined style's fingerprint.

Log a summary: "Found X color variables, Y numeric variables, Z text styles."

---

### Step 3: Fetch Design Context

Run `get_design_context` for the target node:

```
get_design_context(fileKey=":fileKey", nodeId=":nodeId")
```

If the response is truncated or too large:
1. Run `get_metadata(fileKey=":fileKey", nodeId=":nodeId")` to get the node tree
2. Identify child node IDs from the metadata
3. Fetch each section individually with `get_design_context`

---

### Step 4: Analyse Every Node

Traverse every node in the design context tree. For each node, perform all four checks below. Keep a running list of violations in the format:

```
{ nodeId, nodeName, type: "color"|"font"|"numeric"|"nesting", message }
```

#### Check A — Color Variables

For every node that has a **fill** or **stroke** (shapes, frames, text):

1. Check if the fill/stroke is **bound to a variable** (the design context will show a variable binding or alias). If it is bound → ✅ pass.
2. If it is **not bound to a variable**, check if the raw color value exists in the Allowed Color Values set (exact hex match). If it does → still flag it, because even if the color value happens to match, it should be referenced via a variable.
3. **Flag every fill or stroke that is not variable-bound**, regardless of whether the hex value coincidentally matches a design system color.

Violation message format: `"Color not using a design system variable: [hex value]"`

#### Check B — Font Styles

For every **text** node:

1. Check if the text is **linked to a named text style** from the defined text styles set. If it is → ✅ pass.
2. If not linked to a named style, check if all typography properties (`fontFamily`, `fontWeight`, `fontSize`, `lineHeight`, `letterSpacing`) exactly match one of the defined style fingerprints. If they all match → still flag it, because the node should reference the named style directly.
3. **Flag every text node that is not linked to a named text style.**

Violation message format: `"Font not linked to a text style: [fontFamily] [fontSize]/[lineHeight] [fontWeight]"`

#### Check C — Numeric Values (Padding & Corner Radius)

For every node that has **padding** (paddingTop, paddingRight, paddingBottom, paddingLeft, itemSpacing/gap) or **corner radius** (cornerRadius, topLeftRadius, topRightRadius, bottomRightRadius, bottomLeftRadius):

1. For each non-zero numeric value: check if it exists in the Allowed Numeric Values set.
2. If the value is **bound to a numeric variable** → ✅ pass (no further check needed).
3. If the value is **not bound to a variable** and the number does not appear in the Allowed Numeric Values set → ❌ flag.
4. If the value is **not bound to a variable** but the number happens to be in the set → still flag, because it should be referenced via a variable.
5. **Flag every padding or corner radius value that is not variable-bound.**

For padding violations, list which sides are affected. For corner radius, list which corners.

Violation message format:
- `"Padding not using a numeric variable: top=[n] right=[n] bottom=[n] left=[n]"`
- `"Corner radius not using a numeric variable: [n]px"`
- `"Gap/spacing not using a numeric variable: [n]px"`

#### Check D — Unnecessary Nesting

For every **frame** or **group** node:

Apply the following rules:

**Rule D1 — Single-child frame/group wrapper:**
If a frame or group contains exactly **one child** that is also a frame or group, AND the outer container adds no visible styling difference (same dimensions, no fill, no stroke, no effects, no corner radius, no visible padding, no clip content that changes visual output), then it is an unnecessary wrapper.

**Rule D2 — Pass-through group:**
If a group contains exactly one child and the group has no applied effects or interactions, it is redundant.

**Rule D3 — Empty containers:**
If a frame or group has zero children, flag it as empty.

Violation message format:
- `"Unnecessary nesting: single-child frame wrapper adds no styling"`
- `"Unnecessary nesting: single-child group adds no styling"`
- `"Empty frame/group with no children"`

---

### Step 5: Post Comments via Figma REST API

For every violation collected in Step 4, post a comment to the Figma file using the REST API.

Use this `curl` command template for each comment (replace placeholders):

```bash
curl -s -X POST "https://api.figma.com/v1/files/FILE_KEY/comments" \
  -H "X-Figma-Token: FIGMA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "VIOLATION_MESSAGE",
    "client_meta": {
      "node_id": "NODE_ID"
    }
  }'
```

- `FILE_KEY`: the file key from Step 1
- `FIGMA_TOKEN`: the personal access token provided by the user
- `NODE_ID`: the node ID in `42-15` format (hyphen, not colon)
- `VIOLATION_MESSAGE`: the short violation message from Step 4

**Batching:** Group multiple violations on the same node into a single comment with each issue on its own line, prefixed with `•`. Do not post more than one comment per node.

**Error handling:** If a `curl` call returns a non-2xx status, log the error and continue posting remaining comments. Do not abort the entire audit.

---

### Step 6: Report Summary

After all comments have been posted, output a structured summary:

```
## Figma Design Audit — Summary

### Color Violations ([N])
- [nodeName] ([nodeId]): [message]
...

### Font Style Violations ([N])
- [nodeName] ([nodeId]): [message]
...

### Numeric Value Violations ([N])
- [nodeName] ([nodeId]): [message]
...

### Nesting Violations ([N])
- [nodeName] ([nodeId]): [message]
...

---
Total: [N] violations found. Comments posted to the Figma file.
```

If there are zero violations in any category, write "None found." for that section.

---

## Rules & Constraints

- **Never expose** the user's Figma token in the summary output or in any text visible to the user beyond confirmation that it was used.
- Keep comment messages **short** — one line per issue, no explanations. The Figma canvas is not a design doc.
- **Do not modify** any design nodes — only read and post comments.
- If `get_variable_defs` returns no variables or styles (empty design system), warn the user before proceeding: "No design system variables found. The audit will flag all raw values. Proceed?"
- Zero-value padding/corner radius (0px) does not need to be flagged as a numeric violation.
- The audit covers the **selected node and all its descendants**. It does not audit sibling nodes outside the selection.
