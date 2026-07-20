---
name: specdrive-sdd
description: Run SpecDrive Kiro-style frontend SDD via MCP. Use for create_spec, brief, gap, HLD/LLD, tasks, or NOT_INITIALIZED.
---

# SpecDrive SDD Skill (Kiro-style)

Works in **any repo**. Steering = source of truth for paths/architecture.

## YOUR JOURNEY

```
1. brief          → STOP → approve
2. requirements   → STOP → approve
3. gap-analysis   → STOP → approve
4. design-hld     → STOP → approve
5. design-lld     → STOP → approve
6. tasks          → STOP → approve   ← last human gate
7. implement      → get_next_task → complete_task
                    (Design2Code only if user wants Figma on a UI task)
8. validate       → review_code
```

## Hard rules

1. After write_spec_document → show FULL documentContent → STOP
2. Never update_spec without userConfirmed: true
3. Cite real files in gap analysis — no invented modules
4. Implement under steering/structure.md paths only
5. Tasks: small, file-scoped, checkboxes [ ] / [x]
6. Design2Code is NOT a separate phase — only optional during implement

See `.cursor/rules/specdrive-cheatsheet.mdc`
