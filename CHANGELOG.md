# Changelog

All notable changes to SpecDrive are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.6] - 2026-07-20

### Added

- One-command install: `npx -y @specdrive/mcp setup --stack flutter` (wires Cursor + Claude Desktop)

## [0.1.5] - 2026-07-20

### Fixed

- `spec --version` now prints the **npm package version** (e.g. 0.1.5), not the format version 1.0.0
- `spec setup` with no subcommand lists `mcp` and `cursor` options

### Added

- Alternate binary: `specdrive` (same CLI as `spec`)

## [0.1.4] - 2026-07-20

### Changed

- UI tasks (widget/screen/layout) default to **Cursor/Claude** implementation; Design2Code is optional when a Figma token is provided

## [0.1.3] - 2026-07-20

### Added

- `spec setup mcp` — universal MCP setup for Cursor, Claude Desktop, Windsurf, Cline, and any MCP client
- `nextSteps` guidance on MCP tool responses and CLI implement output
- Figma token prompt at `get_next_task` time (`figmaAction`: prompt / use / skip)
- MCP ↔ CLI command mapping in docs (MCP-first getting started)

### Changed

- Docs emphasize MCP-first install; CLI remains optional (free LLM)
- `npx -y @specdrive/mcp` TTY message clarifies that waiting means installed (stdio)

## [0.1.2] - 2026-07-04

### Fixed

- Package publish alignment for `@specdrive/*` 0.1.2

## [0.1.1] - 2026-07-04

### Fixed

- Add `README.md` and `bin/` to `@specdrive/cli` npm package (npm page was empty)
- Include `bin/` in `@specdrive/mcp` published tarball

## [0.1.0] - 2026-07-01

### Added

- Kiro-style frontend spec workflow: `requirements → gap-analysis → design → tasks → implement → review`
- CLI (`spec`) for Flutter, Next.js, and React Native
- MCP server for Cursor and Claude Desktop (generation bundles + `write_spec_document`)
- Free LLM chain for CLI: Gemini → Groq → Ollama → template fallback
- Shell profile auto-load for `GEMINI_API_KEY`, `GROQ_API_KEY`, `FIGMA_TOKEN`
- Gap-analysis phase comparing requirements vs codebase
- Review engine validating implementation against `design.md`
- Design2Code (figma-to-code) integration with UI task auto-routing
- MCP tools: `figma_import`, `figma_generate`, `figma_generate_for_spec`, `figma_preview`
- Documentation site under `docs/`
- Cursor plugin and Claude desktop extension packaging
- CI: typecheck, build, test, lint, smoke test
- Smoke test script: `node scripts/smoke-test.mjs`
- Release check script: `node scripts/release-check.mjs`

### Fixed

- `pnpm install --frozen-lockfile` CI failure (restored `workspace:*` deps)
- GitHub Pages docs site path (`docs/` folder)

### Known limitations

See [docs/KNOWN-LIMITATIONS.md](docs/KNOWN-LIMITATIONS.md).

[0.1.1]: https://github.com/Anu-Code07/spec-copilot/releases/tag/v0.1.1
[0.1.0]: https://github.com/Anu-Code07/spec-copilot/releases/tag/v0.1.0
