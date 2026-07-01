# SpecDrive — Cursor Plugin

Cursor Marketplace plugin for [SpecDrive](https://github.com/Anu-Code07/spec-copilot) frontend spec-driven development.

## What it includes

- **MCP server** (`@specdrive/mcp`) — spec workflow tools
- **Rule** — `.specdrive/` workflow guidance
- **Skill** — `specdrive-sdd` for agent-driven spec creation

## Local test (before marketplace)

1. Copy or symlink this folder to `~/.cursor/plugins/local/specdrive`
2. Open Cursor → **Customize** → verify SpecDrive appears
3. Open a project with `spec init` and test MCP tools

Or merge into project `.cursor/mcp.json`:

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

## Prerequisites

- Node.js 20+
- Run `spec init --stack flutter|nextjs|react-native` in the project
- Host AI (Cursor) uses its own API key — no SpecDrive LLM key needed for MCP

## Submit to Cursor Marketplace

See [docs/MARKETPLACE-SUBMISSION.md](../../docs/MARKETPLACE-SUBMISSION.md).
