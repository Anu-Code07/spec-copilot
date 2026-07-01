# SpecDrive MCP Server

Connect SpecDrive to Cursor, Claude Desktop, or any MCP client.

**MCP mode uses your host AI's API keys** (Cursor/Claude). SpecDrive scans the repo and returns **generation bundles** — prompts + codebase context — but does **not** call any LLM itself. You generate the markdown with your host AI, then save it via `write_spec_document`.

## Install

```bash
npm install -g @specdrive/cli @specdrive/mcp
# or
pnpm add -g @specdrive/cli @specdrive/mcp
```

## Cursor configuration

Add to `.cursor/mcp.json`:

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

## Claude Desktop configuration

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

Replace `cwd` with your project root (where you ran `spec init`). Restart Claude Desktop.

Or install globally:

```bash
npm install -g @specdrive/mcp
```

```json
{
  "mcpServers": {
    "specdrive": {
      "command": "specdrive-mcp",
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

See [Marketplace submission guide](../../docs/MARKETPLACE-SUBMISSION.md) for Cursor Marketplace and Claude Directory listing.

## Workflow (MCP)

```
create_spec          → scaffold meta.yaml + requirements generation bundle
write_spec_document  → save host-generated requirements.md
update_spec          → approve requirements gate
generate_gap_analysis → gap-analysis bundle (compare reqs vs codebase)
write_spec_document  → save gap-analysis.md
update_spec          → approve gap_analysis gate
generate_design      → design bundle
write_spec_document  → save design.md
generate_tasks       → tasks bundle
write_spec_document  → save tasks.md
get_next_task        → implement
```

## Available tools

| Tool | Description |
|------|-------------|
| `create_spec` | Scaffold spec + return requirements generation bundle |
| `read_spec` | Read requirements, gap-analysis, design, tasks |
| `update_spec` | Approve workflow gates |
| `generate_gap_analysis` | Return gap-analysis bundle (reqs vs codebase) |
| `generate_design` | Return design.md generation bundle |
| `generate_tasks` | Return tasks.md generation bundle |
| `write_spec_document` | Save host AI-generated markdown |
| `scan_codebase` | Scan repo for relevant source context |
| `get_next_task` | Get next task implementation context |
| `complete_task` | Mark task done |
| `review_code` | Review against design.md |
| `find_context` | Read steering files |
| `read_architecture` | Read structure + tech-stack |
| `search_specs` | List all specs |
| `get_spec_status` | Phase, gates, task progress |

## CLI mode (free LLM)

When using the `spec` CLI directly (not MCP), SpecDrive calls a free LLM chain:

1. `GEMINI_API_KEY` or `GOOGLE_API_KEY` → Gemini free tier
2. `GROQ_API_KEY` → Groq free tier
3. Ollama at `http://127.0.0.1:11434` (local)
4. Template fallback (offline)

```bash
export GEMINI_API_KEY=your-key
spec create "Feature name"
spec gap-analysis --spec feature-name
```
