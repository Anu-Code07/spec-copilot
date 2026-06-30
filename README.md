# SpecDrive

**Frontend spec-driven development for Flutter, Next.js, and React Native.**

SpecDrive is an open-source, AI-agnostic framework that generates Kiro-style specifications — `requirements.md` → `design.md` → `tasks.md` — focused on **UI/UX implementation**, not backend APIs.

## The Problem

Backend SDD already has OpenAPI, GitHub Spec Kit, and similar tools. **Frontend developers lack an equivalent** — a structured way to go from feature idea → UI design spec → implementation tasks, with AI assistance and persistent project knowledge.

## How It Works (Kiro-Style, Frontend-First)

```
Feature idea  →  requirements.md  →  design.md  →  tasks.md  →  Implement  →  Review
                    (EARS)           (UI/UX)        (frontend tasks)
                 approve ✓         approve ✓        approve ✓
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
        ├── design.md       # UI/UX blueprint (screens, components, flows)
        └── tasks.md        # Sequenced implementation tasks
```

## Quick Start

```bash
git clone https://github.com/specdrive/specdrive.git
cd specdrive
pnpm install

# Initialize in your frontend project (Phase 3)
spec init --stack flutter
spec create "Add product review screen"
spec approve requirements --spec product-review
spec design --spec product-review
spec approve design --spec product-review
spec tasks --spec product-review
spec implement --next
```

## Documentation

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
| **2** | Spec format, CLI design, domain model | 🔄 In progress |
| **3** | Core implementation | Planned |
| **4** | AI integrations (MCP, adapters) | Planned |
| **5** | VS Code extension | Planned |
| **6** | Documentation site | Planned |
| **7** | Example projects (Flutter, Next.js, RN) | Planned |

## License

[MIT](LICENSE)
