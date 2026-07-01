# SpecDrive MCP Server

Connect SpecDrive to Cursor, Claude Desktop, or any MCP client.

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

Or if installed globally:

```json
{
  "mcpServers": {
    "specdrive": {
      "command": "specdrive-mcp",
      "cwd": "${workspaceFolder}"
    }
  }
}
```

## Claude Desktop configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "specdrive": {
      "command": "node",
      "args": ["/absolute/path/to/spec-copilot/packages/mcp/bin/mcp.js"]
    }
  }
}
```

## Available tools

| Tool | Description |
|------|-------------|
| `create_spec` | Create feature spec with requirements.md |
| `read_spec` | Read requirements, design, tasks |
| `update_spec` | Approve workflow gates |
| `generate_design` | Generate UI/UX design.md |
| `generate_tasks` | Generate tasks.md |
| `get_next_task` | Get next task implementation context |
| `complete_task` | Mark task done |
| `review_code` | Review against design.md |
| `find_context` | Read steering files |
| `read_architecture` | Read structure + tech-stack |
| `search_specs` | List all specs |
| `get_spec_status` | Phase, gates, task progress |

## AI generation

Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` and configure `.specdrive/config.yaml`:

```yaml
generation:
  provider: llm
```

Without API keys, template generation is used automatically.
