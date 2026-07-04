# Changelog

All notable changes to SpecDrive are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
