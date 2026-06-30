# Repository Structure

## Monorepo Layout

SpecDrive uses a **pnpm + TurboRepo monorepo** for unified builds, testing, and publishing.

```
specdrive/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Lint, test, build on PR
│   │   ├── release.yml            # Semantic release
│   │   └── docs.yml               # Deploy documentation site
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── packages/
│   ├── cli/                       # @specdrive/cli — `spec` command
│   ├── core/                      # @specdrive/core — domain & engine
│   ├── mcp/                       # @specdrive/mcp — MCP server
│   ├── vscode/                    # specdrive-vscode — VS Code extension
│   ├── templates/                 # @specdrive/templates — spec templates
│   ├── plugin-sdk/                # @specdrive/plugin-sdk — plugin API
│   ├── review-engine/             # @specdrive/review-engine
│   ├── docs-engine/               # @specdrive/docs-engine
│   └── plugins/
│       ├── cursor/                # @specdrive/plugin-cursor
│       ├── claude/                # @specdrive/plugin-claude
│       ├── gemini/                # @specdrive/plugin-gemini
│       ├── codex/                 # @specdrive/plugin-codex
│       ├── windsurf/              # @specdrive/plugin-windsurf
│       ├── cline/                 # @specdrive/plugin-cline
│       ├── roo/                   # @specdrive/plugin-roo
│       ├── flutter/               # @specdrive/plugin-flutter
│       ├── nextjs/                # @specdrive/plugin-nextjs
│       └── react-native/          # @specdrive/plugin-react-native
│
├── examples/
│   ├── flutter-app/               # Flutter + .specdrive example
│   ├── nextjs-app/                # Next.js example (planned)
│   └── react-native-app/          # React Native example (planned)
│
├── docs/
│   ├── phase-1/                   # Foundation docs (this phase)
│   ├── phase-2/                   # Domain model & schemas
│   ├── guides/                    # User guides
│   ├── api/                       # Public API reference
│   └── rfc/                       # RFC process & proposals
│
├── website/                       # Documentation site (VitePress/Astro)
│
├── package.json                   # Root workspace config
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── LICENSE
├── README.md
└── CONTRIBUTING.md
```

## Package Details

### `@specdrive/core`

The foundation. All other packages depend on core.

```
packages/core/
├── src/
│   ├── domain/
│   │   ├── entities/              # Spec, Task, Decision, Review, Project
│   │   ├── value-objects/         # SpecId, TaskStatus, Phase
│   │   ├── services/              # SpecValidator, TaskPlanner
│   │   └── ports/                 # Repository interfaces
│   ├── application/
│   │   ├── services/              # SpecService, TaskService, etc.
│   │   └── usecases/              # CreateSpec, CompleteTask, etc.
│   ├── infrastructure/
│   │   ├── filesystem/            # Markdown/YAML I/O
│   │   ├── sqlite/                # Knowledge index
│   │   ├── git/                   # Git integration
│   │   └── plugins/               # Plugin host implementation
│   └── index.ts
├── schemas/                       # JSON Schema for spec frontmatter
├── package.json
└── tsconfig.json
```

### `@specdrive/cli`

```
packages/cli/
├── src/
│   ├── commands/                  # One file per command group
│   │   ├── init.ts
│   │   ├── create.ts
│   │   ├── implement.ts
│   │   └── ...
│   ├── ui/                        # Ink/React terminal UI (optional)
│   └── index.ts                   # Entry: spec binary
├── bin/
│   └── spec.js
└── package.json
```

### `@specdrive/mcp`

```
packages/mcp/
├── src/
│   ├── tools/                     # MCP tool handlers
│   ├── resources/                 # MCP resource providers
│   ├── server.ts                  # MCP server bootstrap
│   └── index.ts
└── package.json
```

### `@specdrive/vscode`

```
packages/vscode/
├── src/
│   ├── extension.ts
│   ├── panels/                    # Spec explorer, task explorer, review
│   ├── commands/
│   └── mcp-client/                # Connect to local MCP server
├── package.json                   # VS Code extension manifest
└── media/                         # Icons, webview assets
```

### `@specdrive/plugin-sdk`

```
packages/plugin-sdk/
├── src/
│   ├── types/                     # PluginManifest, StackPlugin, AIAdapter
│   ├── hooks/                     # Lifecycle hooks
│   └── index.ts
└── package.json
```

### `@specdrive/templates`

```
packages/templates/
├── project/                       # spec init templates
├── specs/                         # Feature spec templates
│   ├── feature.md.hbs
│   ├── api-endpoint.md.hbs
│   └── ui-flow.md.hbs
├── decisions/                     # ADR template
└── package.json
```

### `@specdrive/review-engine`

```
packages/review-engine/
├── src/
│   ├── rules/                     # Review rule implementations
│   ├── analyzers/                 # AST-based analyzers
│   └── index.ts
└── package.json
```

### `@specdrive/docs-engine`

```
packages/docs-engine/
├── src/
│   ├── generators/                # Architecture, API, changelog, etc.
│   └── index.ts
└── package.json
```

## Project-Level Structure (Consumer Projects)

When a developer runs `spec init`, this structure is created:

```
my-project/
├── .specdrive/
│   ├── config.yaml                # SpecDrive project config
│   ├── project.md                 # Project overview
│   ├── product.md                 # Product vision & requirements
│   ├── architecture.md            # System architecture
│   ├── coding-style.md            # Coding standards
│   ├── tech-stack.md              # Technology choices
│   ├── decisions/
│   │   └── 001-example-decision.md
│   ├── specs/
│   │   └── SPEC-001-feature-name.md
│   ├── tasks/
│   │   └── TASK-001-implement-auth.md
│   ├── reviews/
│   │   └── REV-001-spec-001-review.md
│   ├── tests/
│   │   └── TEST-001-auth-strategy.md
│   └── roadmap/
│       └── ROADMAP.md
├── src/                           # Application source (stack-specific)
├── .gitignore
└── README.md
```

## Dependency Graph

```
                    ┌─────────────┐
                    │  templates  │
                    └──────┬──────┘
                           │
┌──────────┐    ┌──────────┴──────────┐    ┌──────────────┐
│ plugin-  │───▶│        core         │◀───│ review-engine│
│   sdk    │    └──────────┬──────────┘    └──────────────┘
└──────────┘               │                    ▲
                           │                    │
              ┌────────────┼────────────┐       │
              ▼            ▼            ▼       │
           ┌─────┐    ┌─────────┐   ┌──────┐   │
           │ cli │    │   mcp   │   │vscode│   │
           └──┬──┘    └────┬────┘   └──┬───┘   │
              │            │           │       │
              └────────────┴───────────┘       │
                           │                    │
                           ▼                    │
                    ┌─────────────┐             │
                    │ docs-engine │─────────────┘
                    └─────────────┘

plugins/* ──▶ plugin-sdk + core + templates
examples/* ──▶ (standalone, reference .specdrive/)
```

**Rule:** `core` has zero dependencies on other `@specdrive/*` packages.

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| npm package | `@specdrive/<name>` | `@specdrive/core` |
| VS Code extension | `specdrive-vscode` | marketplace ID |
| CLI binary | `spec` | `spec init` |
| Spec files | `SPEC-NNN-slug.md` | `SPEC-001-user-auth.md` |
| Task files | `TASK-NNN-slug.md` | `TASK-003-jwt-middleware.md` |
| Decision files | `NNN-slug.md` | `001-use-riverpod.md` |
| Review files | `REV-NNN-slug.md` | `REV-001-auth-review.md` |
| Plugin package | `@specdrive/plugin-<name>` | `@specdrive/plugin-flutter` |

## Build Outputs

| Package | Output | Publish Target |
|---------|--------|----------------|
| core | `dist/` ESM + CJS + `.d.ts` | npm |
| cli | `dist/` + `bin/spec.js` | npm (global install) |
| mcp | `dist/` | npm |
| vscode | `.vsix` | VS Code Marketplace |
| plugin-sdk | `dist/` | npm |
| templates | bundled in core/cli | npm |
| review-engine | `dist/` | npm |
| docs-engine | `dist/` | npm |
| plugins/* | `dist/` | npm |
| website | `dist/` static site | GitHub Pages / Vercel |

## GitHub Actions (Planned)

```yaml
# ci.yml — on every PR
- pnpm install
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

# release.yml — on tag
- changesets version
- pnpm publish -r

# docs.yml — on main
- pnpm --filter website build
- deploy to GitHub Pages
```

## Versioning Strategy

- **Monorepo:** Independent versioning per package via [Changesets](https://github.com/changesets/changesets)
- **Spec schema:** Versioned in frontmatter (`specdriveVersion|\n  version: "1.0"`)
- **MCP tools:** SemVer; breaking tool signature changes require major bump
- **CLI:** SemVer; command flags are stable within major versions

---

*Package implementations begin Phase 3. Domain schemas defined in Phase 2.*
