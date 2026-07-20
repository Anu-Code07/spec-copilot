# Known Limitations (v0.1.0)

SpecDrive is **production-quality for early adopters and MCP use** when built from source. These limitations apply before npm publish and v1.0.

## Distribution

- **Not on npm yet** — install via `git clone` + `pnpm install && pnpm build`, or link locally.
- Docs reference `npx @specdrive/mcp`; packages must be published first.

## AI generation quality

| Mode | Behavior |
|------|----------|
| **MCP** | Host AI (Cursor/Claude) generates docs — quality depends on your model |
| **CLI + LLM key** | Gemini/Groq produce repo-aware specs when key is set |
| **CLI offline** | `SPECDRIVE_LLM_OFFLINE=1` or no key → **static templates**, not codebase-specific gap analysis |

Always use MCP or a free LLM key for real project work.

## Design2Code (figma-to-code)

- Optional integration — requires linking `@design2code/*` packages from [figma-to-code](https://github.com/Anu-Code07/figma-to-code).
- Auto-figma runs **UI tasks only** (`component` scope); logic tasks (BLoC, state, nav) stay with SpecDrive + host AI.
- Figma auth uses a **Personal Access Token** (not OAuth). See [docs/mcp.html#figma](mcp.html#figma).

## Stack plugins

Flutter, Next.js, and React Native plugins provide steering sections and structure hints — not full code generators yet.

## Examples

`examples/flutter-app/` contains a complete spec sample, not a runnable Flutter app. Full demo apps are planned.

## Not implemented (architecture docs)

- SQLite search index (markdown remains source of truth)
- Full marketplace listing (packaging exists; submission is manual)

## Recommended setup for production use today

1. Clone repo, `pnpm install && pnpm build`
2. Use **MCP mode in Cursor** for spec generation
3. Set `GEMINI_API_KEY` or use Cursor API for CLI commands
4. Run `node scripts/smoke-test.mjs` after upgrades
5. Link Design2Code only if you use Figma → code workflow

## Reporting issues

https://github.com/Anu-Code07/spec-copilot/issues
