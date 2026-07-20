# CLI Specification

Kiro-style CLI for frontend spec-driven development.

## Binary

```bash
spec <command> [options]
```

## Core Workflow Commands

### `spec init`

Initialize `.specdrive/` in an existing frontend project.

```bash
spec init
spec init --stack flutter
spec init --stack nextjs
spec init --stack react-native
```

**Creates:**
- Steering files (`product.md`, `tech-stack.md`, `structure.md`, `coding-style.md`)
- Empty `specs/`, `decisions/`, `reviews/`
- `config.yaml`

**Stack plugin** scaffolds stack-specific `structure.md` and `coding-style.md`.

---

### `spec create`

Start a new feature or bugfix spec. AI generates documents through gated phases.

```bash
# Requirements-First (default)
spec create "Add product review screen"

# Design-First
spec create --design-first "Redesign checkout flow"

# Quick Plan — all 3 docs, no approval gates
spec create --quick "Add dark mode toggle"

# Bugfix
spec create --type bugfix "Crash when scrolling review list"
```

**Interactive flow (Requirements-First):**

```
1. SpecDrive asks clarifying questions
   - Which screens are affected?
   - New components or modify existing?
   - Platform targets (iOS/Android/web)?

2. Generates .specdrive/specs/{slug}/requirements.md

3. Waits for approval (or auto if --quick)
```

**Output:**

```
.specdrive/specs/product-review/
├── meta.yaml
├── requirements.md
├── design.md      # after design phase
└── tasks.md       # after tasks phase
```

---

### `spec approve`

Approve a phase gate to unlock the next generation step.

```bash
spec approve requirements --spec product-review
spec approve design --spec product-review
spec approve tasks --spec product-review

# Approve all (used internally by --quick)
spec approve all --spec product-review
```

**Updates** `meta.yaml` gate status and timestamp.

---

### `spec design`

Generate or regenerate `design.md` from approved requirements.

```bash
spec design --spec product-review
spec design --spec product-review --regenerate  # overwrite existing
```

**Inputs:**
- Approved `requirements.md`
- Steering files
- Codebase analysis (existing screens/components)
- Stack plugin conventions

**Output:** `design.md` with UI/UX blueprint (screens, components, flows, state, a11y).

---

### `spec tasks`

Generate or regenerate `tasks.md` from approved design.

```bash
spec tasks --spec product-review
spec tasks --spec product-review --regenerate
```

**Output:** Sequenced tasks in waves, linked to requirements and design sections.

---

### `spec implement`

Load context for implementing a task (human or AI).

```bash
spec implement --task TASK-003 --spec product-review
spec implement --next   # next pending task
```

**Outputs context bundle:**
- Task definition
- Relevant design.md sections
- Related requirements
- Files to create/modify
- Acceptance criteria

Designed for MCP `get_next_task` / AI consumption.

---

### `spec review`

Review implementation against spec.

```bash
spec review --spec product-review
spec review --task TASK-003
spec review --file lib/features/review/presentation/widgets/star_rating.dart
```

**Checks:**
- Requirements coverage (REQ-* → code)
- Design compliance (components match design.md)
- Coding style (coding-style.md)
- Accessibility (a11y sections in design.md)
- Test coverage (tasks marked for testing)

**Output:** `.specdrive/reviews/{spec}-rev-{n}.md`

---

## Supporting Commands

### `spec status`

```bash
spec status
spec status --spec product-review
```

Shows phase, gate approvals, task progress.

```
Product Review (SPEC-001)
  Phase: implementing
  Gates: requirements ✓  design ✓  tasks ✓
  Tasks: 4/6 complete
  Next: TASK-005 — Navigation integration
```

### `spec list`

```bash
spec list
spec list --phase design
spec list --status approved
```

### `spec doctor`

Validate project setup, steering files, schema compliance.

```bash
spec doctor
```

### `spec sync`

Rebuild SQLite search index from Markdown files.

```bash
spec sync
```

### `spec export`

Export specs to PDF/HTML for sharing.

```bash
spec export --spec product-review --format html
```

### `spec agent`

Multi-agent mode (optional, Phase 4).

```bash
spec agent run --role architect --spec product-review
```

### `spec plugin`

Manage stack and AI adapter plugins.

```bash
spec plugin list
spec plugin add @specdrive/plugin-flutter
```

---

## MCP Tool Mapping

CLI commands map 1:1 to MCP tools for AI clients:

| CLI | MCP Tool |
|-----|----------|
| `spec create` | `create_spec` |
| `spec design` | `generate_design` |
| `spec tasks` | `generate_tasks` |
| `spec implement --next` | `get_next_task` |
| (mark done) | `complete_task` |
| `spec review` | `review_code` |
| (read files) | `read_spec`, `read_architecture`, `find_context` |
| `spec approve` | `update_spec` (gate status) |
| `spec list` | `search_specs` |

---

## config.yaml

```yaml
specdriveVersion: "1.0"
stack: flutter
workflow:
  default: requirements-first  # requirements-first | design-first
  requireApproval: true        # false when using --quick
generation:
  provider: mcp                # mcp | prompt (bundled prompts)
  askClarifyingQuestions: true
review:
  accessibility: true
  designCompliance: true
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Validation failed |
| 3 | Gate not approved (e.g. design before requirements approved) |
| 4 | Review failed (--ci mode) |

---

*Format reference: [SPEC-FORMAT.md](./SPEC-FORMAT.md). Frontend philosophy: [FRONTEND-SDD.md](../phase-1/FRONTEND-SDD.md).*
