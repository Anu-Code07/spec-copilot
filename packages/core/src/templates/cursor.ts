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

1. Run \`spec setup cursor\` if \`.cursor/mcp.json\` is missing.
2. Use MCP \`create_spec\` → generate markdown with your API → \`write_spec_document\`.
3. Approve gates with \`update_spec\` between phases.
4. Workflow order: requirements → gap-analysis → design → tasks → implement.
5. SpecDrive MCP scans the repo; you (host AI) write the spec documents.
6. \`design.md\` drives UI/UX — screens, components, navigation, state, a11y.

Do not skip gap-analysis — it compares requirements to existing codebase before design.
`;
}

export function cursorSddSkill(): string {
  return `---
name: specdrive-sdd
description: Run SpecDrive frontend spec-driven development workflow via MCP. Use when creating feature specs, gap analysis, UI design docs, or implementation tasks for Flutter, Next.js, or React Native projects with .specdrive/.
---

# SpecDrive SDD Skill

## When to use

- User wants Kiro-style specs for a frontend feature
- Project has or needs \`.specdrive/\` folder
- Creating \`requirements.md\`, \`gap-analysis.md\`, \`design.md\`, or \`tasks.md\`

## Workflow

1. **create_spec** — scaffold meta.yaml, get requirements generation bundle
2. Generate requirements markdown using host AI, then **write_spec_document**
3. **update_spec** gate=requirements
4. **generate_gap_analysis** → write gap-analysis.md → approve gap_analysis gate
5. **generate_design** → write design.md → approve design gate
6. **generate_tasks** → write tasks.md → approve tasks gate
7. **get_next_task** for implementation context

## Rules

- SpecDrive MCP never calls LLM APIs — you generate documents
- Use **scan_codebase** when you need fresh repo context
- Bugfix specs use type=bugfix in create_spec
`;
}
