---
name: specdrive-sdd
description: Run SpecDrive frontend spec-driven development via MCP. Use for create_spec, quick specs, gap analysis, design, tasks, cart/UI features, or when MCP returns NOT_INITIALIZED.
---

# SpecDrive SDD Skill

## Prerequisite check (do this first)

1. Confirm `.specdrive/config.yaml` exists in workspace root.
2. If missing → tell user to run: `spec setup mcp --stack <flutter|nextjs|react-native>`
3. Reload MCP in Cursor, then retry.

## Standard workflow

1. **create_spec** `{ title, description?, type: "feature"|"bugfix" }`
2. Use returned **bundle** prompts → generate markdown
3. **write_spec_document** `{ slug, document, content }`
4. **update_spec** `{ slug, gate }` — approve before next phase
5. Repeat for gap-analysis → design → tasks
6. **get_next_task** → UI tasks: ask Cursor/Claude to implement (optional Figma token for Design2Code) → **complete_task**

## Figma at task time (optional)

If `get_next_task` returns `figmaPrompt`:
- **Skip (recommended default)** → Cursor/Claude implements the UI from `design.md`
- **Provide token** → Design2Code scaffolds UI first, then host AI finishes

## Quick spec (small UI change)

Even for "quick" features, run the full gate pipeline (can keep docs concise):

```
create_spec → requirements → approve
→ gap-analysis → approve → design → approve → tasks → approve
→ get_next_task
```

## MCP never calls LLM

You generate all documents. Use **scan_codebase** / **find_context** for repo context.

## Full reference

See `.cursor/rules/specdrive-cheatsheet.mdc` in this project.
