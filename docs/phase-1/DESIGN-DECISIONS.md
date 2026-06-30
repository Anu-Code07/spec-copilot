# Design Decisions (Architecture Decision Records)

Phase 1 foundational decisions. Future decisions follow the [RFC process](../rfc/README.md).

---

## ADR-001: Markdown-First Specification Format

**Status:** Accepted  
**Date:** 2026-06-30

### Context

Specifications must be human-readable, version-controllable, and machine-parseable. Options: pure JSON/YAML, Markdown with frontmatter, or custom format.

### Decision

Use **Markdown with YAML frontmatter** for all specification artifacts.

### Rationale

- Developers can read and edit specs without SpecDrive installed
- Git diffs are meaningful for prose changes
- YAML frontmatter provides structured metadata for tooling
- Markdown body supports rich documentation (requirements, diagrams, code blocks)
- Industry precedent: ADRs (Markdown), OpenAPI (YAML), README-driven development

### Consequences

- Need robust Markdown/YAML parser (gray-matter + remark)
- JSON Schema validates frontmatter, not body prose
- Full-text search requires indexing pipeline

---

## ADR-002: Files as Source of Truth, SQLite as Index

**Status:** Accepted  
**Date:** 2026-06-30

### Context

Project knowledge must be searchable and queryable. Options: SQLite primary, files primary, or cloud database.

### Decision

**Markdown files are authoritative.** SQLite is a derived, rebuildable index.

### Rationale

- No vendor lock-in to a database
- `spec sync` rebuilds index from files — corruption is recoverable
- Works fully offline
- Git remains the collaboration layer
- Aligns with "local_devs can read specs without tools" principle

### Consequences

- Index may be stale until `spec sync` or file watcher runs
- `.specdrive/knowledge.db` is gitignored
- Search performance depends on index freshness

---

## ADR-003: AI-Agnostic via MCP, Not Direct API Integration

**Status:** Accepted  
**Date:** 2026-06-30

### Context

SpecDrive must work with Claude, Cursor, Gemini, Codex, and future tools. Options: integrate each AI API directly, or expose knowledge via a standard protocol.

### Decision

Primary AI integration is through **Model Context Protocol (MCP)**. AI tool adapters are thin plugins that configure MCP connection and provide tool-specific hints.

### Rationale

- MCP is becoming industry standard (Anthropic, Google, and growing ecosystem adoption)
- SpecDrive doesn't need AI API keys
- One MCP server serves all AI clients simultaneously
- CLI and VS Code extension work without MCP for human-driven workflows

### Consequences

- MCP-less tools need manual spec reading (still works — files are human-readable)
- MCP server must be production-quality from Phase 3
- Adapter plugins are configuration, not core logic

---

## ADR-004: Clean Architecture with Strict Layer Boundaries

**Status:** Accepted  
**Date:** 2026-06-30

### Context

Monorepo with CLI, MCP, VS Code, plugins. Risk of spaghetti dependencies.

### Decision

**Clean Architecture** with domain at center. Presentation layers (CLI, MCP, VS Code) call application services only.

### Rationale

- Domain logic tested without I/O mocks at presentation layer
- Same business logic exposed via CLI, MCP, and VS Code
- Plugin system integrates at infrastructure/application boundary
- Long-term maintainability for open source project

### Consequences

- More boilerplate (ports/adapters) initially
- Enforced via ESLint import rules and code review
- New surfaces (e.g., JetBrains plugin) are cheap to add

---

## ADR-005: Plugin System for Stack-Specific Knowledge

**Status:** Accepted  
**Date:** 2026-06-30

### Context

Flutter projects need BLoC patterns; NestJS projects need module structure. Core cannot know every stack.

### Decision

**Stack plugins** provide templates, folder structures, review rules, and coding standards. Core remains stack-agnostic.

### Plugin types:

| Type | Purpose | Example |
|------|---------|---------|
| `stack` | Framework conventions | `@specdrive/plugin-flutter` |
| `ai-adapter` | Tool-specific config | `@specdrive/plugin-cursor` |
| `review` | Custom review rules | `@specdrive/plugin-security` |

### Rationale

- Core stays small and stable
- Community can publish plugins without core changes
- Matches Terraform provider / ESLint plugin patterns

### Consequences

- Plugin SDK must be stable and well-documented
- `spec init --plugin flutter` scaffolds stack-specific structure
- Plugin compatibility versioned against core SemVer

---

## ADR-006: Optional Multi-Agent Workflow

**Status:** Accepted  
**Date:** 2026-06-30

### Context

BMAD and similar methodologies use multi-agent personas. Should SpecDrive enforce this?

### Decision

Multi-agent workflow is **optional**, configured in `.specdrive/config.yaml`. Default is single-developer workflow with structured phases.

### Rationale

- Solo developers don't need 10 agent personas
- Teams can enable Planner → Architect → Developer → Reviewer pipeline
- Agents communicate through spec artifacts, not side channels
- Avoids complexity for simple projects

### Consequences

- Agent roles defined as configuration, not hardcoded
- `spec agent` command manages multi-agent mode
- Phase 4 implementation

---

## ADR-007: TypeScript Monorepo with pnpm + TurboRepo

**Status:** Accepted  
**Date:** 2026-06-30

### Context

Multiple packages (core, cli, mcp, vscode, plugins) need unified development experience.

### Decision

**pnpm workspaces + TurboRepo** for monorepo management. **TypeScript** for all packages. **ESBuild** for bundling.

### Rationale

- pnpm: strict dependency resolution, disk efficient
- TurboRepo: incremental builds, remote caching ready
- TypeScript: type safety across package boundaries
- ESBuild: sub-second builds for developer experience

### Consequences

- Node.js ≥ 20 required
- Native modules (better-sqlite3) need platform-specific builds
- Changesets for independent package versioning

---

## ADR-008: Review Engine as First-Class Component

**Status:** Accepted  
**Date:** 2026-06-30

### Context

No competitor validates code against specifications. This is SpecDrive's key differentiator.

### Decision

Dedicated `@specdrive/review-engine` package with pluggable review rules.

### Review dimensions:

1. Requirements coverage (acceptance criteria → code)
2. Architecture compliance (layer boundaries, patterns)
3. Coding standards (`coding-style.md` rules)
4. Security heuristics (OWASP basics)
5. Test plan alignment
6. Documentation completeness

### Rationale

- Automated review is the "Terraform plan" moment for AI-generated code
- Rules are extensible via plugins
- CI integration: `spec review --ci` exits non-zero on failures

### Consequences

- AST parsing needed per language (start with TypeScript/JavaScript)
- Review reports stored in `.specdrive/reviews/`
- False positives managed via rule severity levels (error/warning/info)

---

## ADR-009: Semantic Versioning with RFC Process for Breaking Changes

**Status:** Accepted  
**Date:** 2026-06-30

### Context

Open source framework needs stability guarantees for adopters.

### Decision

- Packages follow **SemVer**
- Spec schema changes require **RFC** and major version bump
- MCP tool signatures are part of public API
- Deprecation period: 1 major version before removal

### Rationale

- Enterprise adoption requires stability
- Git/Docker/Terraform all have formal change processes
- Community trust depends on predictable upgrades

### Consequences

- RFC template and process documented
- Changesets enforce changelog generation
- Migration guides for major versions

---

## ADR-010: Progressive Adoption Model

**Status:** Accepted  
**Date:** 2026-06-30

### Context

Full spec-driven workflow may overwhelm teams new to the concept.

### Decision

Support **progressive adoption** — teams start minimal and add phases over time.

### Adoption levels:

| Level | What You Use | Effort |
|-------|-------------|--------|
| **0 — Rules** | `coding-style.md` + `architecture.md` only | Minutes |
| **1 — Specs** | Feature specs before implementation | Low |
| **2 — Tasks** | Spec → tasks → implement → review | Medium |
| **3 — Full** | All phases + multi-agent + CI gates | High |

### Rationale

- Reduces adoption friction
- `spec doctor` suggests next adoption step
- Teams already using CLAUDE.md can migrate incrementally

### Consequences

- All levels use same `.specdrive/` structure
- Unused directories are simply empty
- CLI commands gracefully handle missing phases

---

---

## ADR-011: Frontend-First, Kiro-Style Spec Generation

**Status:** Accepted  
**Date:** 2026-06-30

### Context

Backend spec-driven tools (OpenAPI, GitHub Spec Kit) already exist. Users need a framework focused on **frontend UI development** with **Kiro-like doc generation** — requirements → design → tasks with approval gates.

### Decision

1. **Frontend-only focus** — Flutter, Next.js, React Native as first-class stacks. Backend/API design is out of scope (client integration notes in `design.md` only).

2. **Kiro-compatible workflow** — Each feature generates:
   - `requirements.md` (EARS notation)
   - `design.md` (UI/UX blueprint — screens, components, flows)
   - `tasks.md` (sequenced frontend tasks with requirement traceability)

3. **Approval gates** — Requirements → Design → Tasks require explicit approval (skippable with `--quick`).

4. **Steering files** — `product.md`, `tech-stack.md`, `structure.md`, `coding-style.md` provide persistent context (equivalent to Kiro steering).

5. **design.md drives UI/UX** — Not backend architecture. Primary artifact for implementation and review.

### Rationale

- Fills gap no existing open tool addresses (Kiro is proprietary/full-stack)
- Matches how frontend developers actually work
- EARS + gated workflow proven by Kiro
- Open + MCP makes it work with any AI tool

### Consequences

- Stack plugins are frontend-only (Flutter, Next.js, React Native)
- Review engine prioritizes UI compliance (design.md, a11y)
- Phase 3 implementation starts with `spec create` doc generation pipeline

---

## Decision Log

| ADR | Title | Status |
|-----|-------|--------|
| 001 | Markdown-First Specification Format | Accepted |
| 002 | Files as Source of Truth | Accepted |
| 003 | AI-Agnostic via MCP | Accepted |
| 004 | Clean Architecture | Accepted |
| 005 | Plugin System | Accepted |
| 006 | Optional Multi-Agent | Accepted |
| 007 | TypeScript Monorepo | Accepted |
| 008 | Review Engine | Accepted |
| 009 | SemVer + RFC Process | Accepted |
| 010 | Progressive Adoption | Accepted |
| 011 | Frontend-First, Kiro-Style Spec Generation | Accepted |

---

*New decisions: submit via RFC. Project-level decisions live in `.specdrive/decisions/`.*
