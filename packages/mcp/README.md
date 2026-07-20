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

## YOUR JOURNEY (Kiro-style)

```
1. brief          → write → STOP → human approve
2. requirements   → write → STOP → approve
3. gap-analysis   → generate → write → STOP → approve
4. design-hld     → generate → write → STOP → approve
5. design-lld     → generate → write → STOP → approve
6. tasks          → generate → write → STOP → approve  ← last human gate
7. implement      → get_next_task → complete_task
                    (Design2Code only if user wants Figma on a UI task)
8. validate       → review_code
```

**Never auto-approve.** After every write, show `documentContent` to the user and wait.
`update_spec` requires `userConfirmed: true`.

### Spec layout

```
.specdrive/specs/features/YYYY-MM-DD[-TICKET]-<slug>/
  spec.json  brief.md  requirements.md  gap-analysis.md
  design-hld.md  design-lld.md  tasks.md
```

## UI tasks + Design2Code

During **implement** (`get_next_task`), UI tasks go to Cursor/Claude by default.
Optional: user provides a Figma token → Design2Code scaffolds UI first.

## Available tools

| Tool | Description |
|------|-------------|
| `create_spec` | Dated feature folder + journey + brief bundle |
| `write_spec_document` | Save markdown; returns approval brief |
| `request_gate_approval` | Build approval brief — show & STOP |
| `update_spec` | Human decision (`userConfirmed: true`) |
| `generate_gap_analysis` | Gap bundle (cite real files) |
| `generate_design_hld` / `generate_design_lld` | HLD / LLD bundles |
| `generate_tasks` | Checkbox tasks (last human gate) |
| `get_next_task` | Impl when ready; optional Design2Code on UI+Figma |
| `get_spec_status` | Gates + cheat sheet |
| `figma_*` | Design2Code helpers |
| `review_code` | Validate against HLD/LLD |

## CLI mode (optional)

When using the `spec` CLI directly (not MCP), SpecDrive can call a free LLM chain (Gemini / Groq / Ollama / templates).

See [CLI reference](../../docs/cli.html) for MCP ↔ CLI mapping.
