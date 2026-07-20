# SpecDrive MCP Server

Connect SpecDrive to **Cursor, Claude Desktop, Windsurf, Cline, Continue**, or any MCP client.

**MCP mode uses your host AI's API keys** (Cursor/Claude). SpecDrive scans the repo and returns **generation bundles** — prompts + codebase context — but does **not** call any LLM itself.

Works in **any repo**. Edit `.specdrive/steering/*` so gap analysis / HLD / LLD target your real packages.

## Simple install (any IDE)

```bash
cd your-app
npx -y @specdrive/mcp setup --stack flutter
```

Then: **Cursor → Settings → MCP → Reload** → look for **specdrive**.

## MCP workflow (Kiro-style)

```
create_spec          → YOUR JOURNEY + brief bundle
write_spec_document  → brief.md → STOP → human approve (update_spec userConfirmed:true)
write_spec_document  → requirements.md → STOP → approve
generate_gap_analysis → write → STOP → approve
generate_design_hld  → write → STOP → approve
generate_design_lld  → write → STOP → approve
generate_tasks       → write → STOP → approve
generate_maestro     → optional UI E2E map
get_next_task        → only when ready_for_implementation=true
complete_task / review_code
```

**Never auto-approve.** After every write, show `documentContent` to the user and wait.

### Spec layout

```
.specdrive/specs/features/YYYY-MM-DD[-TICKET]-<slug>/
  spec.json  brief.md  requirements.md  gap-analysis.md
  design-hld.md  design-lld.md  tasks.md  maestro.md?
```

## UI tasks + Design2Code

`get_next_task` on UI tasks: Cursor/Claude by default; optional Figma token for Design2Code.

## Available tools

| Tool | Description |
|------|-------------|
| `create_spec` | Dated feature folder + journey + brief bundle |
| `write_spec_document` | Save markdown; returns approval brief |
| `request_gate_approval` | Build approval brief — show & STOP |
| `update_spec` | Human decision (`userConfirmed: true`) |
| `generate_gap_analysis` | Gap bundle (cite real files) |
| `generate_design_hld` / `generate_design_lld` | HLD / LLD bundles |
| `generate_tasks` / `generate_maestro` | Tasks / optional E2E map |
| `get_next_task` | Impl when ready_for_implementation |
| `get_spec_status` | Gates + cheat sheet |
| `figma_*` | Design2Code helpers |

## CLI mode (optional)

When using the `spec` CLI directly (not MCP), SpecDrive can call a free LLM chain (Gemini / Groq / Ollama / templates).

See [CLI reference](../../docs/cli.html) for MCP ↔ CLI mapping.
