---
name: specdrive-sdd
description: Run SpecDrive Kiro-style frontend SDD via MCP. Use for create_spec, brief, gap analysis, HLD/LLD, tasks, or when MCP returns NOT_INITIALIZED.
---

# SpecDrive SDD Skill (Kiro-style)

Works in **any repo**. Steering files are the source of truth for package paths and architecture.

## Prerequisite

1. Confirm `.specdrive/config.yaml` exists.
2. If missing → `npx -y @specdrive/mcp setup --stack <flutter|nextjs|react-native>`
3. Edit `.specdrive/steering/*` for THIS repo before designing.
4. Reload MCP, then retry.

## YOUR JOURNEY (never skip / never auto-approve)

```
create_spec
  → write brief → STOP → user approve → update_spec { userConfirmed: true }
  → requirements → STOP → approve
  → generate_gap_analysis → write → STOP → approve
  → generate_design_hld → write → STOP → approve
  → generate_design_lld → write → STOP → approve
  → generate_tasks → write → STOP → approve
  → (optional) generate_maestro → approve
  → get_next_task  (only when ready_for_implementation=true)
  → complete_task → review_code
```

## Hard rules

1. After `write_spec_document` → show **full** `documentContent` → **STOP**
2. Never call `update_spec` without `userConfirmed: true`
3. Gap analysis must cite **real files** from scan + steering — no invented modules
4. Implement only under paths from `steering/structure.md`
5. Tasks are small, file-scoped, checkboxed `- [ ]` / `- [x]`

## Reply map

| User says | You do |
|-----------|--------|
| approve | `update_spec { userConfirmed: true, decision: "approve" }` |
| request changes | revise → `write_spec_document` → ask again |
| reject | stop |

## Full reference

See `.cursor/rules/specdrive-cheatsheet.mdc`
