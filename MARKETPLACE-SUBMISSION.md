# Marketplace submission guide

How to publish SpecDrive MCP to **Cursor Marketplace** and **Claude Connectors Directory**.

## Prerequisites

1. **Publish to npm** (required for easy installs):
   ```bash
   # Set NPM_TOKEN in GitHub secrets, then create a release or run publish workflow
   npm view @specdrive/mcp
   ```
2. Public GitHub repo: `https://github.com/Anu-Code07/spec-copilot`
3. Open-source license (MIT ✓)

---

## Cursor Marketplace

### What's in this repo

```
.cursor-plugin/marketplace.json     # Monorepo marketplace manifest
integrations/cursor-plugin/         # Plugin bundle
  ├── .cursor-plugin/plugin.json
  ├── mcp.json
  ├── assets/logo.svg
  ├── rules/
  └── skills/
```

### Local test

```bash
cp -r integrations/cursor-plugin ~/.cursor/plugins/local/specdrive
# Cursor → Customize → install SpecDrive
```

### Submit

1. Commit and push all plugin files to `main`
2. Go to [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish)
3. Submit repo URL: `https://github.com/Anu-Code07/spec-copilot`
4. Wait for manual review (open source required)

**Tip:** List on [cursor.directory](https://cursor.directory) first for community discovery while marketplace review is pending.

---

## Claude Desktop / Connectors Directory

### Option A: npm + manual config (works today)

User adds to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "specdrive": {
      "command": "npx",
      "args": ["-y", "@specdrive/mcp"],
      "cwd": "/absolute/path/to/their/project"
    }
  }
}
```

Requires Node.js 20+ and `spec init` in the project.

### Option B: Desktop extension (.mcpb) for directory listing

```
integrations/claude-desktop/
  ├── manifest.json
  ├── icon.png          # Add 128x128 PNG before submission
  └── server/index.js
```

Pack the extension:

```bash
pnpm build
pnpm pack:claude-extension   # creates integrations/claude-desktop/dist/specdrive.mcpb
```

Install locally: double-click `.mcpb` in Claude Desktop.

### Submit to Claude Connectors Directory

1. Review [submission guidelines](https://claude.com/docs/connectors/building/submission)
2. Ensure every MCP tool has **title** + **readOnlyHint** or **destructiveHint** (in server)
3. Prepare: docs URL, privacy policy URL, support contact, example prompts
4. Submit via Claude.ai admin → Connectors (Team/Enterprise) or desktop extension form for `.mcpb`

**Note:** SpecDrive is a **local stdio** server — best fit is **desktop extension (MCPB)**, not remote HTTPS MCP.

---

## npm install summary (both Cursor & Claude)

| Step | Command / config |
|------|------------------|
| Install (optional) | `npm install -g @specdrive/mcp` |
| Run via npx | `npx -y @specdrive/mcp` |
| Cursor | `.cursor/mcp.json` → `"command": "npx", "args": ["-y", "@specdrive/mcp"]` |
| Claude | `claude_desktop_config.json` → same npx config + `"cwd": project path` |

No SpecDrive LLM API key needed for MCP — host AI (Cursor/Claude) generates documents.
