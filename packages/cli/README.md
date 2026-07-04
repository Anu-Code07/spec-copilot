# @specdrive/cli

**SpecDrive CLI** — frontend spec-driven development for **Flutter**, **Next.js**, and **React Native**.

Kiro-style workflow: `requirements → gap-analysis → design → tasks → implement → review`

## Install

```bash
npm install -g @specdrive/cli
# or run without global install
npx @specdrive/cli --help
```

## Quick start

```bash
cd your-frontend-project

spec init --stack flutter          # or nextjs | react-native
spec create "Product Review Screen" --quick

# Or gated workflow
spec create "Product Review Screen"
spec approve requirements --spec product-review-screen
spec gap-analysis --spec product-review-screen
spec approve gap-analysis --spec product-review-screen
spec design --spec product-review-screen
spec approve design --spec product-review-screen
spec tasks --spec product-review-screen
spec implement --spec product-review-screen --next
```

## CLI vs MCP

| Mode | Who generates specs | API keys |
|------|---------------------|----------|
| **CLI** | SpecDrive calls free LLM (Gemini → Groq → Ollama) | `GEMINI_API_KEY` in shell profile |
| **MCP** | Cursor/Claude host AI | Your IDE API key |

For Cursor/Claude, use [`@specdrive/mcp`](../mcp) instead.

## Environment

```bash
export GEMINI_API_KEY="your-key"    # free at https://aistudio.google.com
export FIGMA_TOKEN="figd_..."       # optional, for Design2Code integration
export SPECDRIVE_LLM_OFFLINE=1        # template-only mode (no AI)
```

## Commands

| Command | Description |
|---------|-------------|
| `spec init` | Initialize `.specdrive/` in project |
| `spec create` | Create a new feature spec |
| `spec gap-analysis` | Compare requirements vs codebase |
| `spec design` | Generate `design.md` |
| `spec tasks` | Generate `tasks.md` |
| `spec implement` | Show next task context (`--auto-figma` for UI) |
| `spec review` | Review code against `design.md` |
| `spec doctor` | Check project health |
| `spec figma` | Figma → code via Design2Code |

## Links

- [Documentation](https://anu-code07.github.io/spec-copilot/)
- [GitHub](https://github.com/Anu-Code07/spec-copilot)
- [MCP server](https://www.npmjs.com/package/@specdrive/mcp)

## License

MIT
