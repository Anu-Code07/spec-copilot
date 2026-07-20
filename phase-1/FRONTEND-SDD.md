# Frontend Spec-Driven Development

SpecDrive is a **frontend-first, Kiro-style spec-driven development (SDD) framework** for building UI with Flutter, React/Next.js, and React Native.

## Positioning

| | SpecDrive | Backend SDD tools |
|---|-----------|-------------------|
| **Focus** | Screens, components, flows, UX | APIs, schemas, services |
| **Primary artifact** | `design.md` (UI blueprint) | OpenAPI, service specs |
| **Examples** | Kiro workflow, adapted for UI | GitHub Spec Kit, OpenAPI |

Backend spec tooling already exists. SpecDrive fills the gap for **how frontend developers plan, design, and ship UI**.

## Kiro-Style Workflow (Frontend Adaptation)

Every feature follows a **gated three-document pipeline**:

```
Feature idea
     │
     ▼
requirements.md ──approve──▶ design.md ──approve──▶ tasks.md ──approve──▶ Implement
     │                            │                        │
 User stories +              UI/UX blueprint          Sequenced frontend
 EARS criteria               screens, components,     tasks linked to
                             flows, state, a11y         requirements
```

### Per-feature layout

```
.specdrive/specs/product-review/
├── requirements.md    # WHAT — user stories, acceptance criteria (EARS)
├── design.md          # HOW (UI) — screens, components, navigation, state
└── tasks.md           # DO — implementation checklist with traceability
```

### Project steering (persistent context)

```
.specdrive/
├── product.md         # Product vision (Kiro: product steering)
├── tech-stack.md      # Flutter | Next.js | React Native (Kiro: tech steering)
├── structure.md       # Folder layout, feature modules (Kiro: structure steering)
├── coding-style.md    # Widget/component conventions
└── specs/             # One folder per feature
```

AI reads steering files when generating requirements, design, and tasks — same role as Kiro's `.kiro/steering/`.

## design.md Drives UI/UX

In Kiro, `design.md` covers full-stack architecture. In SpecDrive, **`design.md` is the UI/UX source of truth**:

| Section | Purpose |
|---------|---------|
| User flow | Journey through screens |
| Screen map | Screen hierarchy and relationships |
| Component breakdown | Props, states, responsibilities |
| Navigation | Routes, modals, deep links |
| State management | Where state lives, data flow |
| Design tokens | Colors, typography, spacing |
| Platform behavior | iOS vs Android vs web differences |
| Accessibility | a11y requirements per component |
| API integration | Client-side calls only (not server design) |
| Responsive layout | Breakpoints, adaptive UI |

Implementation and review validate against `design.md`.

## Supported Stacks (First-Class)

| Stack | Plugin | Conventions |
|-------|--------|-------------|
| **Flutter** | `@specdrive/plugin-flutter` | Clean Architecture, BLoC/Riverpod, feature folders, widget tests |
| **Next.js** | `@specdrive/plugin-nextjs` | App Router, Server/Client Components, colocation |
| **React Native** | `@specdrive/plugin-react-native` | Expo, React Navigation, platform-specific UI |

Stack plugins provide templates and review rules — they do not replace the framework.

## Workflow Variants

| Mode | Command | Behavior |
|------|---------|----------|
| **Requirements-First** | `spec create "..."` | Default. Clarify → requirements → approve → design → approve → tasks |
| **Design-First** | `spec create --design-first "..."` | Start from UI concept, backfill requirements |
| **Quick Plan** | `spec create --quick "..."` | Generate all three docs without gates |
| **Bugfix** | `spec create --type bugfix "..."` | Generates `bugfix.md` instead of requirements |

## Frontend Dev Lifecycle

How SpecDrive mirrors real frontend work:

```
1 — Product asks for "product reviews"
    │
    ▼
Requirements — User stories, edge cases, acceptance criteria
    │
    ▼
Design — Screen map, ReviewForm component, StarRating, navigation
    │
    ▼
Tasks — Scaffold screen → Build form → Wire state → Widget tests → a11y
    │
    ▼
Implement — Task-by-task (human or AI via MCP)
    │
    ▼
Review — Code matches design.md? Requirements covered?
    │
    ▼
Ship — Spec artifacts committed with code
```

## AI Integration

SpecDrive generates docs like Kiro but stays **AI-agnostic**:

- **MCP server** exposes spec tools to Cursor, Claude, Codex, Gemini
- **CLI** works standalone for human-driven workflows
- Same `.specdrive/` files regardless of AI tool

## What SpecDrive Is Not

- Not a backend/API spec framework
- Not a replacement for Flutter, React, or React Native
- Not a proprietary IDE (unlike Kiro)
- Not a design tool (Figma links in `design.md`, not replacement)

---

*Spec format details: [SPEC-FORMAT.md](../phase-2/SPEC-FORMAT.md). CLI: [CLI-SPEC.md](../phase-2/CLI-SPEC.md).*
