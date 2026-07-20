export function cursorMcpServerConfig(figmaToken?: string): Record<string, unknown> {
  const config: Record<string, unknown> = {
    command: 'npx',
    args: ['-y', '@specdrive/mcp'],
    cwd: '${workspaceFolder}',
  };

  if (figmaToken) {
    config.env = { FIGMA_TOKEN: figmaToken };
  }

  return config;
}

export function cursorWorkflowRule(): string {
  return `---
description: SpecDrive Kiro-style frontend spec workflow — use MCP tools for requirements, gap-analysis, design, and tasks
alwaysApply: false
globs: ".specdrive/**"
---

When working on a SpecDrive feature:

1. Run \`spec setup cursor\` if \`.specdrive/\` or \`.cursor/mcp.json\` is missing.
2. Use MCP \`create_spec\` → generate markdown with your API → \`write_spec_document\`.
3. Approve gates with \`update_spec\` between phases.
4. Workflow order: requirements → gap-analysis → design → tasks → implement.
5. SpecDrive MCP scans the repo; you (host AI) write the spec documents.
6. \`design.md\` drives UI/UX — screens, components, navigation, state, a11y.

Do not skip gap-analysis — it compares requirements to existing codebase before design.
`;
}

/** Full cheat sheet — installed as always-on Cursor rule by \`spec setup cursor\` */
export function cursorCheatsheetRule(): string {
  return `---
description: SpecDrive MCP cheat sheet — setup, tools, schemas, workflow, errors. Load when using SpecDrive or create_spec.
alwaysApply: true
---

# SpecDrive MCP Cheat Sheet (Cursor)

## 0. Before ANY MCP tool — project must be initialized

MCP tools only work when **\`.specdrive/config.yaml\`** exists in the **workspace root** (Cursor \`cwd\`).

If you see \`Not a SpecDrive project\` or \`NOT_INITIALIZED\`:

\`\`\`bash
npm install -g @specdrive/cli@0.1.2
cd <your-app-root>    # NOT the spec-copilot repo unless developing SpecDrive itself
spec setup cursor --stack flutter   # or nextjs | react-native
\`\`\`

Then **restart Cursor** → Settings → MCP → Reload.

Verify: call MCP \`search_specs\` (should return \`[]\`, not an error).

---

## 1. How MCP mode works

| Who | Does what |
|-----|-----------|
| **SpecDrive MCP** | Scans repo, returns **generation bundles** (prompts + codebase context) |
| **Cursor (you)** | Generate markdown using your API, then \`write_spec_document\` |
| **SpecDrive MCP** | Saves files, tracks gates, tasks |

SpecDrive **never** calls an LLM in MCP mode.

---

## 2. Document pipeline (never skip gates)

\`\`\`
create_spec
  → write_spec_document (requirements)
  → update_spec (gate=requirements)
generate_gap_analysis
  → write_spec_document (gap-analysis)
  → update_spec (gate=gap-analysis)
generate_design
  → write_spec_document (design)
  → update_spec (gate=design)
generate_tasks
  → write_spec_document (tasks)
  → update_spec (gate=tasks)
get_next_task → implement → complete_task → review_code
\`\`\`

Files live at: \`.specdrive/specs/{slug}/\`

---

## 3. MCP tool reference

### create_spec
Scaffold meta.yaml + return requirements generation bundle.

\`\`\`json
{ "title": "string (required)", "description": "string?", "type": "feature" | "bugfix" }
\`\`\`

### write_spec_document
Save host-generated markdown.

\`\`\`json
{ "slug": "string", "document": "requirements"|"gap-analysis"|"design"|"tasks"|"bugfix", "content": "full markdown" }
\`\`\`

### update_spec
Approve a workflow gate.

\`\`\`json
{ "slug": "string", "gate": "requirements"|"gap-analysis"|"gap_analysis"|"design"|"tasks"|"all" }
\`\`\`

### generate_gap_analysis | generate_design | generate_tasks
Return generation bundle for host AI. Input: \`{ "slug": "string" }\`

### read_spec
\`\`\`json
{ "slug": "string", "document": "requirements"|"gap-analysis"|"design"|"tasks"|"meta"|"all" }
\`\`\`

### get_spec_status
\`\`\`json
{ "slug": "string" }
\`\`\`

### search_specs
No args. Lists all specs.

### scan_codebase
\`\`\`json
{ "slug": "string?", "title": "string?" }
\`\`\`

### get_next_task
\`\`\`json
{ "slug": "string?", "autoFigma": true, "figmaAction": "prompt"|"use"|"skip", "figmaToken": "string?", "figmaFileKey": "string?" }
\`\`\`
On UI tasks: **ask user** for Figma token or skip. Retry with \`figmaToken\` + \`figmaAction: "use"\` or \`figmaAction: "skip"\`.
Logic tasks (BLoC, nav, tests) always use host AI — never Design2Code.

### complete_task
\`\`\`json
{ "slug": "string", "taskId": "TASK-001" }
\`\`\`

### review_code
\`\`\`json
{ "slug": "string", "taskId": "string?", "filePath": "string?" }
\`\`\`

### find_context | read_architecture
No args. Steering files (product, tech-stack, structure, coding-style).

### Figma / Design2Code
\`figma_status\` | \`figma_import\` | \`figma_generate\` | \`figma_generate_for_spec\` | \`figma_preview\`

---

## 4. Quick spec recipe (e.g. cart button)

**User request:** "Add button below cart price breakdown to open commerce home"

### Step A — create_spec
\`\`\`json
{
  "title": "Add button below cart price breakdown to open commerce home",
  "description": "Add a button below the cart price breakdown that opens commerce home. Quick feature.",
  "type": "feature"
}
\`\`\`

Response includes \`slug\` (e.g. \`cart-commerce-home-button\`) and a **bundle** with \`systemPrompt\`, \`userPrompt\`, \`requiredSections\`.

### Step B — generate requirements.md
Use bundle prompts + your knowledge of the cart screen. Include EARS acceptance criteria.

Required sections: Overview, User Stories, Acceptance Criteria (EARS), Non-Functional Requirements, Out of Scope.

### Step C — write_spec_document
\`\`\`json
{ "slug": "<slug>", "document": "requirements", "content": "<generated markdown>" }
\`\`\`

### Step D — update_spec
\`\`\`json
{ "slug": "<slug>", "gate": "requirements" }
\`\`\`

### Step E — gap-analysis → design → tasks
Repeat: \`generate_*\` → host generates doc → \`write_spec_document\` → \`update_spec\`.

For **quick UI features**, gap-analysis can be short but must not be skipped.

### Step F — implement
\`get_next_task\` with slug → implement code → \`complete_task\`.

---

## 5. requirements.md template (EARS)

\`\`\`markdown
---
specdriveVersion: "1.0"
phase: requirements
---

# Requirements: {Title}

## Overview
...

## User Stories

### REQ-001: {Story}
**As a** shopper **I want** a button below the price breakdown **So that** I can return to commerce home

#### Acceptance Criteria (EARS)
1. **Ubiquitous:** The cart screen shall display a button directly below the price breakdown section.
2. **Event-driven:** When the user taps the button, the app shall navigate to the commerce home screen.
3. **State-driven:** While navigation is in progress, the button shall show a loading state.
4. **Unwanted event:** If navigation fails, the system shall show an error snackbar.

## Non-Functional Requirements
- Match existing cart screen styling and accessibility labels

## Out of Scope
- Changing price breakdown layout
\`\`\`

---

## 6. Task tagging (for get_next_task + Figma)

| Task mentions | Routed to |
|---------------|-----------|
| UI, widget, component, screen, layout, button | Design2Code (if \`autoFigma: true\`) |
| bloc, cubit, navigation, api, repository, test | Host AI (Cursor) with spec context |

---

## 7. Common errors

| Error | Fix |
|-------|-----|
| \`Not a SpecDrive project\` | Run \`spec setup cursor\` in app root; reload MCP |
| \`ALREADY_INITIALIZED\` | Project already inited — only run setup cursor |
| Gate not approved | \`update_spec\` previous gate before \`generate_*\` next phase |
| \`npx @specdrive/mcp\` silent | Normal — MCP uses stdio; test via Cursor chat |

---

## 8. CLI equivalents (optional)

\`\`\`bash
spec create "Title"
spec gap-analysis --spec <slug>
spec approve gap-analysis --spec <slug>
spec design --spec <slug>
spec tasks --spec <slug>
spec implement --spec <slug> --next
\`\`\`

CLI uses free LLM; MCP uses Cursor's model.
`;
}

export function cursorSddSkill(): string {
  return `---
name: specdrive-sdd
description: Run SpecDrive frontend spec-driven development via MCP. Use for create_spec, quick specs, gap analysis, design, tasks, cart/UI features, or when MCP returns NOT_INITIALIZED.
---

# SpecDrive SDD Skill

## Prerequisite check (do this first)

1. Confirm \`.specdrive/config.yaml\` exists in workspace root.
2. If missing → tell user to run: \`spec setup cursor --stack <flutter|nextjs|react-native>\`
3. Reload MCP in Cursor, then retry.

## Standard workflow

1. **create_spec** \`{ title, description?, type: "feature"|"bugfix" }\`
2. Use returned **bundle** prompts → generate markdown
3. **write_spec_document** \`{ slug, document, content }\`
4. **update_spec** \`{ slug, gate }\` — approve before next phase
5. Repeat for gap-analysis → design → tasks
6. **get_next_task** → implement → **complete_task**

## Quick spec (small UI change)

Even for "quick" features, run the full gate pipeline (can keep docs concise):

\`\`\`
create_spec → requirements → approve
→ gap-analysis → approve → design → approve → tasks → approve
→ get_next_task
\`\`\`

## MCP never calls LLM

You generate all documents. Use **scan_codebase** / **find_context** for repo context.

## Full reference

See \`.cursor/rules/specdrive-cheatsheet.mdc\` in this project.
`;
}
