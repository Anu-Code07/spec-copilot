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
6. **get_next_task** → on UI tasks ask user for Figma token or skip → implement → **complete_task**

## Figma at task time

If `get_next_task` returns `figmaPrompt`, ask the user to provide a Figma token or skip Design2Code.

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
