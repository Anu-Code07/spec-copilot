# SpecDrive Architecture

## Overview

SpecDrive follows **Clean Architecture** with strict layer boundaries. The core domain is AI-agnostic, tool-agnostic, and stack-agnostic. External integrations enter through adapters at the system edges.

## System Context (C4 Level 1)

```
┌──────────────────────────────────────────────────────────────────┐
│                        External Actors                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │Developer │ │ AI Tools │ │ VS Code  │ │ CI/CD    │ │ GitHub  │ │
│  │          │ │(MCP)     │ │          │ │          │ │  API    │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │
└───────┼────────────┼────────────┼────────────┼─────────────┼───────┘
        │            │            │            │             │
        ▼            ▼            ▼            ▼             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      SpecDrive Framework                          │
│  CLI · MCP Server · VS Code Extension · Review Engine · Docs     │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SpecDrive Core (packages/core)                 │
│         Spec Engine · Knowledge Base · Plugin Host · Domain       │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    .specdrive/ (Project Knowledge)                │
│  specs · tasks · decisions · reviews · architecture · roadmap     │
└──────────────────────────────────────────────────────────────────┘
```

## Container Diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                       │
├─────────────┬─────────────┬─────────────┬─────────────────────────┤
│  CLI        │  MCP Server │  VS Code    │  CI Adapter (future)    │
│  (packages/ │  (packages/ │  Extension  │                         │
│   cli)      │   mcp)      │  (packages/ │                         │
│             │             │   vscode)   │                         │
└──────┬──────┴──────┬──────┴──────┬──────┴─────────────────────────┘
       │             │             │
       └─────────────┼─────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Workflow Orchestrator · Review Runner · Docs Generator          │
│  Task Queue · Agent Coordinator (optional multi-agent)           │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Domain Layer (packages/core)              │
├─────────────────────────────────────────────────────────────────┤
│  Entities: Spec, Task, Decision, Review, Milestone, AgentRole    │
│  Services: SpecValidator, TaskPlanner, ReviewRules, SpecParser   │
│  Ports: SpecRepository, KnowledgeStore, PluginRegistry, GitPort  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                         │
├─────────────┬─────────────┬─────────────┬─────────────────────────┤
│ File System │ SQLite Index│ Git Client  │ GitHub API              │
│ Markdown/   │ (optional   │             │ (optional)              │
│ YAML Parser │  vector DB) │             │                         │
└─────────────┴─────────────┴─────────────┴─────────────────────────┘
```

## Layer Rules

| Layer | May Depend On | Must NOT Depend On |
|-------|---------------|-------------------|
| Domain | Nothing external | CLI, MCP, VS Code, AI APIs |
| Application | Domain | Presentation specifics |
| Infrastructure | Domain ports | Application UI logic |
| Presentation | Application, Domain | Direct file I/O (use services) |

## Core Domain Model

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Project   │────▶│    Spec     │────▶│    Task     │
│  (root)     │     │  (feature)  │     │ (work unit) │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Decision   │     │  Review     │     │  Milestone  │
│   (ADR)     │     │  (report)   │     │ (roadmap)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Entity Relationships

- A **Project** contains many Specs, Tasks, Decisions, Reviews, and Milestones
- A **Spec** decomposes into many Tasks
- A **Review** references a Spec and/or Task and produces a structured report
- A **Decision** (ADR) is standalone but linkable from Specs and Architecture docs

## Specification Engine

The spec engine is the heart of SpecDrive.

```
Input                    Engine                      Output
─────                    ──────                      ──────
Markdown +         →    Parse frontmatter        →    Validated Spec
YAML frontmatter        Validate JSON Schema         Structured AST
User edits              Link cross-references         Task suggestions
                        Index to SQLite

Operations:
  parse(specPath) → SpecAST
  validate(spec) → ValidationResult
  create(template, data) → Spec file
  link(spec, decision) → updated frontmatter
  search(query) → SpecSummary[]
```

**Design principle:** Markdown files are the source of truth. SQLite is a derived index for fast search, not authoritative storage.

## Package Architecture

```
packages/
├── core/                 # Domain + spec engine + knowledge base
│   ├── domain/           # Entities, value objects, domain services
│   ├── application/      # Use cases, workflow orchestration
│   └── infrastructure/   # File I/O, SQLite, Git adapters
│
├── cli/                  # Commander.js CLI → calls application layer
├── mcp/                  # MCP tools → calls application layer
├── vscode/               # Webview panels + MCP client
├── templates/            # Handlebars/Mustache spec templates
├── plugin-sdk/           # Plugin interface definitions
├── review-engine/        # Rule-based + AST review against specs
├── docs-engine/          # MDX/docs generation from specs
└── plugins/
    ├── cursor/           # Cursor-specific adapter hints
    ├── claude/           # Claude Code adapter
    ├── gemini/
    ├── codex/
    ├── windsurf/
    ├── cline/
    └── roo/
```

## CLI Architecture

```
spec <command>
    │
    ▼
Command Handler (packages/cli/src/commands/)
    │
    ▼
Application Service (packages/core/application/)
    │
    ├── SpecService
    ├── TaskService
    ├── ReviewService
    ├── DocsService
    └── WorkflowService
    │
    ▼
Domain + Infrastructure
```

### Command Map

| Command | Service | Phase |
|---------|---------|-------|
| `spec init` | ProjectService | Setup |
| `spec doctor` | HealthService | Diagnostics |
| `spec create` | SpecService | Generate requirements (Kiro-style) |
| `spec approve` | SpecService | Unlock next phase gate |
| `spec design` | SpecService | Generate design.md (UI/UX) |
| `spec tasks` | TaskService | Generate tasks.md from design |
| `spec implement` | WorkflowService | Implementation |
| `spec review` | ReviewService | Review |
| `spec test` | TestPlanService | Testing |
| `spec docs` | DocsService | Documentation |
| `spec roadmap` | RoadmapService | Planning |
| `spec status` | ProjectService | Status |
| `spec sync` | IndexService | Index rebuild |
| `spec export` | ExportService | Export |
| `spec agent` | AgentService | Multi-agent |
| `spec plugin` | PluginService | Plugins |

## MCP Server Architecture

```
AI Client (Cursor, Claude, etc.)
    │
    │  MCP Protocol (stdio / HTTP)
    ▼
MCP Server (packages/mcp)
    │
    ├── Tools
    │   ├── create_spec
    │   ├── read_spec
    │   ├── update_spec
    │   ├── generate_design
    │   ├── generate_tasks
    │   ├── get_next_task
    │   ├── complete_task
    │   ├── review_code
    │   ├── generate_tests
    │   ├── generate_docs
    │   ├── find_context
    │   ├── read_architecture
    │   ├── update_roadmap
    │   ├── list_decisions
    │   └── search_specs
    │
    └── Resources
        ├── architecture (non-blocking, informational)
        ├── spec://current-task
        └── spec://project-status
```

MCP tools delegate to the same application services as CLI commands — no duplicated business logic.

## Plugin System (Frontend Stack Bridges)

```
┌─────────────────────────────────────────┐
│              Plugin Host (core)          │
│  load(manifest) · validate · lifecycle   │
└───────────────────┬─────────────────────┘
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Frontend │  │ AI Tool  │  │  Review  │
│  Stack   │  │ Adapter  │  │   Rule   │
│ (Flutter)│  │ (Cursor) │  │  (a11y)  │
└──────────┘  └──────────┘  └──────────┘
```

First-class stack plugins: **Flutter**, **Next.js**, **React Native**.

### Kiro-Style Feature Spec Flow

```
spec create "Add review screen"
    │
    ▼
requirements.md ──gate──▶ design.md ──gate──▶ tasks.md ──gate──▶ implement
     (EARS)                  (UI/UX)            (frontend tasks)
```

### Plugin Manifest (sketch)

```yaml
name: "@specdrive/plugin-flutter"
version: 0.1.0
type: stack
stack: flutter
provides:
  - structure-template
  - design-md-sections
  - review-rules: widget-tests, accessibility
```

## Multi-Agent Workflow (Optional)

Agents communicate through specs, not ad-hoc chat.

```
Planner → BA → Architect → Task Planner → Developer → Reviewer → QA → Docs Agent
     │         │            │              │              │          │
     └─────────┴────────────┴──────────────┴──────────────┴────────┘
                              Spec Artifacts only (no side-channel chat between agents)
```

Each role reads/writes `.specdrive/` artifacts; roles are optional and configurable.

## Review Engine

```
Code change + Spec context
        │
        ▼
Review Engine (packages/review-engine)
        │
        ├── Requirements coverage
        ├── Architecture compliance
        ├── Coding standards (from coding-style.md)
        ├── Security heuristics
        └── Test plan alignment
        │
        ▼
Structured ReviewReport (non-blocking by default)
```

## Data Flow: Implement Task

```
1. Developer/AI: spec implement --task TASK-001
2. WorkflowService loads task + parent spec + architecture.md
3. Context bundle returned (human-readable + machine index)
4. AI implements against acceptance criteria
5. spec review --task TASK-001 → ReviewReport
6. On pass: mark task complete, update spec status
```

## Cross-Cutting Concerns

| Concern | Approach |
|---------|----------|
| **Logging** | Structured JSON logs; `--verbose` flag |
| **Config** | `.specdrive/config.yaml` + env vars |
| **Errors** | Domain `Failure` types; never swallow exceptions |
| **Versioning** | SemVer for packages; spec schema version in frontmatter |
| **Security** | No secrets in specs; doctor checks for leaks |
| **Testing** | Vitest unit + fixture-based integration tests |
| **i18n** | English-first; extensible message catalogs later |

## Deployment Topology (Future)

```
Local dev:  CLI + file index + MCP stdio
CI:         spec review + spec test (non-blocking → blocking over time)
Team:       optional sync via Git (.specdrive/ committed)
Enterprise: optional cloud index / audit (out of Phase 1 scope)
```

## Architecture Principles

1. **Files are truth** — if SQLite disagrees with Markdown, Markdown wins
2. **One service, many surfaces** — CLI, MCP, VS Code share application layer
3. **Plugins extend, never fork** — stack rules live in plugins
4. **Explicit phases** — workflow state is visible in `spec status`
5. **RFC for breaking changes** — schema and tool contracts are stable

---

*Implementation details for domain model and schemas: Phase 2. See [PHASE-1-REVIEW.md](./PHASE-1-REVIEW.md).*
