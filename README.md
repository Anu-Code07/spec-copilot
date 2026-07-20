# SpecDrive

**Frontend spec-driven development for Flutter, Next.js, and React Native.**

SpecDrive is an open-source, AI-agnostic framework that generates Kiro-style specifications — `requirements.md` → `gap-analysis.md` → `design.md` → `tasks.md` — focused on **UI/UX implementation**, not backend APIs.

## The Problem

Backend SDD already has OpenAPI, GitHub Spec Kit, and similar tools. **Frontend developers lack an equivalent** — a structured way to go from feature idea → UI design spec → implementation tasks, with AI assistance and persistent project knowledge.

## How It Works (Kiro-Style, Frontend-First)

```
Feature idea  →  requirements.md  →  gap-analysis.md  →  design.md  →  tasks.md  →  Implement  →  Review
                    (EARS)           (codebase gaps)      (UI/UX)        (frontend tasks)
                 approve ✓         approve ✓            approve ✓        approve ✓
```

**`design.md` drives UI/UX** — screens, components, navigation, state, accessibility, platform behavior.

## Supported Stacks

| Stack | Status |
|-------|--------|
| **Flutter** | First-class |
| **Next.js** | First-class |
| **React Native** | First-class |

## AI-Agnostic

Works with Cursor, Claude Code, Codex CLI, Gemini, Windsurf, Cline, Roo, Continue — via MCP or CLI.

## Project Layout

```
.specdrive/
├── product.md              # Product steering
├── tech-stack.md           # Stack steering
├── structure.md            # Architecture steering
├── coding-style.md         # Conventions steering
└── specs/
    └── product-review/
        ├── requirements.md # User stories + EARS acceptance criteria
        ├── gap-analysis.md # Requirements vs existing codebase gaps
        ├── design.md       # UI/UX blueprint (screens, components, flows)
        └── tasks.md        # Sequenced implementation tasks
```

## Quick Start

```bash
# In your frontend app (recommended: MCP-first)
npm install -g @specdrive/cli
cd your-flutter-app
spec setup mcp --stack flutter
# Reload MCP in Cursor/Claude → call tool: search_specs

# Optional: CLI with free LLM
export GEMINI_API_KEY=your-key
spec create "Product Review Screen"
spec gap-analysis --spec product-review-screen
```

See [packages/mcp/README.md](packages/mcp/README.md) for universal MCP setup (Cursor, Claude, Windsurf, Cline, …).

## CLI vs MCP (AI keys)

| Mode | Who generates docs | API keys |
|------|-------------------|----------|
| **CLI / npm** | SpecDrive calls a **free LLM** chain | `GEMINI_API_KEY`, `GROQ_API_KEY`, or local Ollama |
| **MCP** (Cursor/Claude) | **Host AI** generates docs | Your Cursor/Claude API key — SpecDrive never calls LLM |

CLI free LLM priority: Gemini → Groq → Ollama → template fallback.

```bash
export GEMINI_API_KEY=your-key   # free tier at https://aistudio.google.com
spec create "Checkout flow"
spec gap-analysis --spec checkout-flow
```

## MCP + Review

```bash
# MCP server (for Cursor / Claude) — uses host AI, not SpecDrive LLM
node packages/mcp/bin/mcp.js

# Review against design.md
spec review --spec product-review-screen --ci
```

See [packages/mcp/README.md](packages/mcp/README.md) for Cursor MCP setup.

## Documentation

**Docs site:** [https://anu-code07.github.io/spec-copilot/](https://anu-code07.github.io/spec-copilot/)

> **404?** Enable Pages once: [docs/GITHUB-PAGES-SETUP.md](docs/GITHUB-PAGES-SETUP.md) → Settings → Pages → branch **`main`**, folder **`/docs`**

| Document | Description |
|----------|-------------|
| [Frontend SDD](docs/phase-1/FRONTEND-SDD.md) | Core philosophy — frontend-first, Kiro-style |
| [Spec Format](docs/phase-2/SPEC-FORMAT.md) | requirements.md, design.md, tasks.md templates |
| [CLI Spec](docs/phase-2/CLI-SPEC.md) | Command reference |
| [Vision](docs/phase-1/VISION.md) | Project vision |
| [Architecture](docs/phase-1/ARCHITECTURE.md) | System design |
| [Design Decisions](docs/phase-1/DESIGN-DECISIONS.md) | ADRs |

## Development Phases

| Phase | Scope | Status |
|-------|-------|--------|
| **1** | Vision, architecture, frontend SDD direction | ✅ Complete |
| **2** | Spec format, CLI design, domain model | ✅ Complete |
| **3** | Core implementation (CLI + spec engine) | ✅ Complete |
| **4** | MCP server, AI generation, review engine | ✅ Complete |
| **5** | VS Code extension | ✅ Complete |
| **6** | Documentation site | ✅ Complete |
| **7** | Example projects (Flutter, Next.js, RN) | ✅ Flutter spec sample |

## Production readiness (v0.1.0)

SpecDrive is ready for **real project use** when built from source. npm publish is the remaining step for `npx` install.

| Check | Status |
|-------|--------|
| CI (typecheck, lint, test, smoke) | ✅ |
| End-to-end CLI smoke test | ✅ `pnpm smoke` |
| Release checklist | ✅ `pnpm release-check` |
| MCP + CLI + review engine | ✅ |
| Known limitations documented | ✅ [KNOWN-LIMITATIONS.md](docs/KNOWN-LIMITATIONS.md) |
| npm publish | ✅ `@specdrive/*@0.1.4` |

```bash
# Verify before release
pnpm install && pnpm build
pnpm test
pnpm smoke
pnpm release-check
```

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

[MIT](LICENSE)
