# SpecDrive Vision

## One-Line Vision

**SpecDrive is the open standard for frontend spec-driven, AI-assisted UI development.**

SpecDrive targets **Flutter, Next.js, and React Native** — generating Kiro-style specs where `design.md` drives UI/UX implementation. Backend SDD is out of scope; tools like OpenAPI and GitHub Spec Kit already cover that space.

## The Problem We Solve

AI coding assistants are powerful but chaotic. Without structure, they produce inconsistent code, ignore project conventions, forget decisions, and skip critical engineering phases. Every team reinvents prompts, workflows, and context management.

SpecDrive brings the discipline of professional software engineering to AI-assisted development — without locking you into a specific AI vendor.

## What SpecDrive Is

| SpecDrive Is | SpecDrive Is Not |
|--------------|------------------|
| A frontend UI spec workflow | A backend/API spec tool |
| A Kiro-style doc generator (open) | A proprietary IDE |
| design.md-driven UI/UX specs | Server architecture specs |
| AI-agnostic via MCP | Locked to one AI vendor |

## Analogy

| Domain | Standard | What It Standardized |
|--------|----------|---------------------|
| Version control | **Git** | How teams track code changes |
| Containers | **Docker** | How apps are packaged and run |
| Infrastructure | **Terraform** | How infra is declared and applied |
| AI-assisted frontend dev | **SpecDrive** | How humans and AI build UI together |

## Core Beliefs

### 1. Specifications Before Code

No feature ships without a written specification. Specs capture *what* and *why* before *how*. AI implements from specs, not from vague prompts.

### 2. Knowledge Compounds

Every decision, requirement, review, and test plan becomes permanent project knowledge. Future AI sessions — and future developers — inherit full context.

### 3. AI Is Replaceable

Claude today, Gemini tomorrow, a local model next year. The workflow, specs, and knowledge base survive model changes because they are AI-agnostic.

### 4. Professional Engineering Discipline

AI should behave like a senior engineering team:

- Business Analyst clarifies requirements
- Architect designs the system
- Developer implements against tasks
- Reviewer validates against specs
- QA verifies acceptance criteria

Not like an autocomplete engine that guesses.

### 5. design.md Drives UI/UX

Every frontend feature has a `design.md` that specifies screens, components, navigation, state, and accessibility. Implementation and review validate against this document — not against ad-hoc prompts.

### 6. Kiro-Style Generation, Open and Frontend-Focused

Like [Kiro](https://kiro.dev/docs/specs/), SpecDrive generates `requirements.md` → `design.md` → `tasks.md` with human approval gates. Unlike Kiro, SpecDrive is open source, AI-agnostic, and **`design.md` is a UI/UX blueprint** for screens, components, and flows — not backend architecture.

## The SpecDrive Workflow

```
Feature idea
     │
     ▼
requirements.md ──approve──▶ design.md ──approve──▶ tasks.md ──approve──▶ Implement → Review
   (EARS/user stories)        (UI/UX blueprint)      (frontend tasks)
```

Each phase produces artifacts in `.specdrive/specs/{feature}/`. Nothing is ephemeral.

## Ecosystem Components

```
                    ┌─────────────────────────────────┐
                    │         SpecDrive Core          │
                    │  Domain Model · Spec Engine ·   │
                    │  Knowledge Base · Plugin Host   │
                    └───────────────┬─────────────────┘
                                    │
        ┌───────────┬───────────────┼───────────────┬───────────┐
        ▼           ▼               ▼               ▼           ▼
   ┌─────────┐ ┌─────────┐   ┌───────────┐   ┌──────────┐ ┌────────┐
   │   CLI   │ │   MCP   │   │  VS Code  │   │  Review  │ │  Docs  │
   │         │ │ Server  │   │ Extension │   │  Engine  │ │ Engine │
   └─────────┘ └─────────┘   └───────────┘   └──────────┘ └────────┘
        │           │               │               │           │
        └───────────┴───────────────┴───────────────┴───────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │         Plugin System          │
                    │  Stack Plugins · AI Adapters   │
                    │  Flutter · React · NestJS · …  │
                    └───────────────────────────────┘
                                    │
        ┌───────────┬───────────────┼───────────────┬───────────┐
        ▼           ▼               ▼               ▼           ▼
   ┌─────────┐ ┌─────────┐   ┌───────────┐   ┌──────────┐ ┌────────┐
   │ Cursor  │ │ Claude  │   │  Gemini   │   │  Codex   │ │  …     │
   │ Adapter │ │ Adapter │   │  Adapter  │   │  Adapter │ │        │
   └─────────┘ └─────────┘   └───────────┘   └──────────┘ └────────┘
```

## Success Criteria

SpecDrive succeeds when:

1. **Any AI tool** can read project specs via MCP and implement features correctly
2. **Any developer** can onboard to a SpecDrive project in minutes by reading `.specdrive/`
3. **Any stack** is supported through plugins without forking core
4. **Reviews are automated** — code is validated against specs, not gut feeling
5. **Knowledge persists** across AI sessions, team changes, and model upgrades

## Long-Term Goals

- Become the de facto standard for AI-assisted development workflows
- Publish an open specification format (like OpenAPI for specs)
- Enable a marketplace of community plugins and templates
- Support enterprise features (SSO, audit logs, compliance) via optional extensions
- Integrate with CI/CD pipelines for spec-gated deployments

## Guiding Principles for Implementation

1. **Stability over speed** — API changes go through RFC process
2. **Extensibility over features** — plugins do stack-specific work; core stays generic
3. **Files over databases** — specs are human-readable Markdown + YAML frontmatter; SQLite is an index, not the source of truth
4. **Test everything** — domain logic, spec parsing, review rules, plugin contracts
5. **Document as you build** — every public API has docs before release

---

*Phase 1 — Foundation. See [PHASE-1-REVIEW.md](./PHASE-1-REVIEW.md) for review and next steps.*
