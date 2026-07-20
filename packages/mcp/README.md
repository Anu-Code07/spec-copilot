# SpecDrive MCP Server

Connect SpecDrive to **Cursor, Claude Desktop, Windsurf, Cline, Continue**, or any MCP client.

**MCP mode uses your host AI's API keys** (Cursor/Claude). SpecDrive scans the repo and returns **generation bundles** — prompts + codebase context — but does **not** call any LLM itself.

## Simple install (any IDE)

In your **app project** root (Flutter / Next.js / RN):

```bash
npx -y @specdrive/mcp setup --stack flutter
```

That one command:

1. Creates `.specdrive/` if missing
2. Writes/merges `.cursor/mcp.json` → **Cursor** picks up `specdrive`
3. Merges Claude Desktop config when possible
4. Leaves design2code / supabase / other MCPs alone

Then: **Cursor → Settings → MCP → Reload** → you should see **specdrive**.

### Universal MCP config (manual)

All clients use the same server:

```json
{
  "mcpServers": {
    "specdrive": {
      "command": "npx",
      "args": ["-y", "@specdrive/mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

| IDE | Config file |
|-----|-------------|
| **Cursor / Windsurf** | `.cursor/mcp.json` (auto-written by `spec setup mcp`) |
| **Claude Desktop** | `claude_desktop_config.json` — use absolute `cwd` path |
| **Other MCP clients** | Copy from `.specdrive/mcp.json` in your project |

### `npx -y @specdrive/mcp` just waits — is it broken?

**No — that means it is installed.** MCP servers communicate over stdio. When run in a terminal they wait for an IDE connection. You normally never run this manually; your IDE starts it from `mcp.json`.

## Cursor (extra)

For rules + skills in addition to MCP:

```bash
spec setup cursor --stack flutter
```

## Claude Desktop

Add to `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "specdrive": {
      "command": "npx",
      "args": ["-y", "@specdrive/mcp"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

Restart Claude Desktop.

## MCP workflow (Kiro-style, frontend-first)

```
create_spec          → scaffold + requirements bundle
write_spec_document  → save host-generated requirements.md
update_spec          → approve requirements gate
generate_gap_analysis → gap-analysis bundle
write_spec_document  → save gap-analysis.md
update_spec          → approve gap_analysis gate
generate_design      → design bundle
write_spec_document  → save design.md
generate_tasks       → tasks bundle
write_spec_document  → save tasks.md
get_next_task        → implement (UI tasks prompt for Figma token or skip)
complete_task        → mark done
```

Every major tool response includes **`nextSteps`** — what to run next or skip.

## UI tasks + Design2Code

`get_next_task` on UI tasks (screens, widgets, layout):

1. **Default — ask Cursor/Claude** to implement the UI from `design.md`
2. **Optional** — user can provide a Figma token for Design2Code scaffold:
   - `get_next_task { figmaToken: "...", figmaAction: "use" }`
3. **Skip Figma** — `get_next_task { figmaAction: "skip" }` → host AI builds the UI

Logic tasks (BLoC, state, navigation, validation, tests) always use host AI — never Design2Code.

## Available tools

| Tool | Description |
|------|-------------|
| `create_spec` | Scaffold spec + return requirements generation bundle |
| `read_spec` | Read requirements, gap-analysis, design, tasks |
| `update_spec` | Approve workflow gates |
| `generate_gap_analysis` | Return gap-analysis bundle |
| `generate_design` | Return design.md generation bundle |
| `generate_tasks` | Return tasks.md generation bundle |
| `write_spec_document` | Save host AI-generated markdown |
| `scan_codebase` | Scan repo for relevant source context |
| `get_next_task` | Implementation context; UI tasks prompt Figma token/skip |
| `complete_task` | Mark task done |
| `review_code` | Review against design.md |
| `find_context` | Read steering files |
| `read_architecture` | Read structure + tech-stack |
| `search_specs` | List all specs |
| `get_spec_status` | Phase, gates, task progress |
| `figma_status` | Check Design2Code + FIGMA_TOKEN |
| `figma_import` | Import Figma to Design AST |
| `figma_generate` | Generate code from Figma/AST |
| `figma_generate_for_spec` | Generate for spec stack + Figma |
| `figma_preview` | Preview without writing files |

## CLI mode (optional)

When using the `spec` CLI directly (not MCP), SpecDrive calls a free LLM chain:

1. `GEMINI_API_KEY` or `GOOGLE_API_KEY` → Gemini free tier
2. `GROQ_API_KEY` → Groq free tier
3. Ollama at `http://127.0.0.1:11434` (local)
4. Template fallback (offline)

See [CLI reference](../../docs/cli.html) for MCP ↔ CLI mapping.
