# Problem Statement

## Executive Summary

AI coding assistants have transformed developer productivity, but they operate without engineering discipline. Teams lack a shared workflow, persistent context, and verifiable quality gates. SpecDrive addresses this by standardizing the entire AI-assisted development lifecycle around structured specifications.

## The Current State

### How Teams Use AI Today

```
Developer: "Add user authentication"
    ↓
AI generates code (maybe correct, maybe not)
    ↓
Developer reviews manually, fixes issues
    ↓
Next session: AI forgets everything
    ↓
Repeat
```

This pattern produces:

- **Inconsistent architecture** — each AI session makes different structural choices
- **Missing requirements** — edge cases, security, accessibility ignored
- **No audit trail** — decisions exist only in chat history
- **Vendor lock-in** — workflows tied to a specific AI tool's prompt format
- **Knowledge loss** — when developers leave or models change, context vanishes

### Pain Points by Stakeholder

#### Individual Developers

| Pain Point | Impact |
|------------|--------|
| Re-explaining project context every session | 30–50% of AI interaction time wasted |
| Inconsistent code style across AI-generated files | Technical debt accumulates silently |
| No way to verify AI followed requirements | Manual review burden increases |
| Prompt engineering is tribal knowledge | Not transferable to teammates |

#### Engineering Teams

| Pain Point | Impact |
|------------|--------|
| No shared AI workflow standard | Each developer uses different prompts and tools |
| Architecture decisions not captured | AI contradicts prior design choices |
| Code review doesn't reference specs | Reviewers lack acceptance criteria |
| Onboarding new developers is slow | Project knowledge scattered across chats and heads |

#### Engineering Leaders

| Pain Point | Impact |
|------------|--------|
| No visibility into AI-assisted development quality | Risk of shipping AI-generated bugs |
| Compliance and audit requirements unmet | No traceability from requirement to code |
| Tool fragmentation | Cursor, Claude, Copilot — no unified process |
| ROI of AI tools is unmeasurable | Can't track spec → implementation → test coverage |

## Root Causes

### 1. No Standard Workflow

Git standardized version control. There is no equivalent for AI-assisted development. Each tool invents its own approach:

- Cursor uses `.cursorrules` and Composer
- Claude Code uses CLAUDE.md and skills
- Continue.dev uses config YAML
- Cline uses custom instructions

None interoperate. None enforce phases.

### 2. Ephemeral Context

AI context windows are temporary. Chat history is not project knowledge. When a session ends:

- Architecture decisions are lost
- Requirement clarifications vanish
- Coding conventions must be re-stated
- Task progress is unknown

### 3. Prompt-Centric, Not Spec-Centric

Current tools optimize for *better prompts*. SpecDrive optimizes for *better specifications*. Prompts are implementation details; specs are the contract.

### 4. No Verification Loop

There is no automated way to ask: "Does this code satisfy specification X?" Review is manual and subjective. Testing strategy is often skipped.

### 5. Stack-Specific Knowledge Is Not Portable

A Flutter project's AI rules don't transfer to a React project. Each stack needs conventions, but there is no plugin system to share them.

## What Success Looks Like

### Before SpecDrive

```
Idea → [vague prompt] → AI code → manual fix → hope it works
```

### After SpecDrive

```
Idea → Requirements doc → Functional spec → Architecture → Tasks
  → AI implements task #3 against spec → Automated review
  → Tests against acceptance criteria → Docs generated → Deploy
```

Every artifact is:

- **Human-readable** — Markdown files in `.specdrive/`
- **Machine-queryable** — indexed by SQLite, exposed via MCP
- **Version-controlled** — committed alongside code in Git
- **Reviewable** — diffs show spec changes like code changes

## Scope of the Problem SpecDrive Solves

### In Scope

- Standardizing the AI-assisted development workflow
- Persistent, structured project knowledge
- AI-agnostic specification format
- Automated review against specifications
- Plugin system for stack-specific conventions
- MCP integration for any AI client

### Out of Scope

- Replacing IDEs or AI models
- Hosting or running AI inference
- Replacing project management tools (Jira, Linear)
- Replacing Git or CI/CD systems
- Code generation algorithms (we standardize *what* to generate, not *how*)

## Constraints

1. **Must work offline** — specs are local files; no cloud dependency required
2. **Must be AI-agnostic** — no coupling to OpenAI, Anthropic, or Google APIs
3. **Must be stack-agnostic** — core framework knows nothing about Flutter or React
4. **Must be human-first** — developers can read and edit all artifacts without tools
5. **Must be open source** — MIT license, community-driven

## Key Questions SpecDrive Answers

| Question | SpecDrive Answer |
|----------|------------------|
| What should we build? | `product.md` + feature specs in `.specdrive/specs/` |
| How should we build it? | `architecture.md` + `tech-stack.md` |
| What tasks remain? | `.specdrive/tasks/` with status tracking |
| Why did we choose X? | `.specdrive/decisions/` ADRs |
| Does the code match the spec? | Review engine reports |
| What should AI do next? | MCP `get_next_task` tool |
| What conventions apply? | Plugin-provided templates + `coding-style.md` |

## Problem Validation

This problem is validated by:

- **Industry trend** — "Spec-driven development" emerging across AI tool vendors (Anthropic's spec workflow, Cursor's rules system)
- **Developer frustration** — widespread complaints about AI context loss and inconsistency
- **Enterprise demand** — compliance teams require traceability AI tools don't provide
- **Open protocol gap** — MCP standardizes tool access but not development workflow

SpecDrive fills the gap between "AI can write code" and "AI can engineer software professionally."

---

*See [COMPETITIVE-ANALYSIS.md](./COMPETITIVE-ANALYSIS.md) for how existing tools address (or fail to address) these problems.*
