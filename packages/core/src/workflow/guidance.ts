import type { FeatureSpecMeta, GateName } from '../domain/types.js';
import type { SpecDocument } from '../ai/generation-bundle.js';

export type WorkflowSurface = 'mcp' | 'cli';

export interface WorkflowStep {
  /** What to run next */
  action: string;
  /** Why this step (or why skip) */
  reason?: string;
  /** User may skip this step */
  optional?: boolean;
}

function gateLabel(gate: GateName): string {
  return gate === 'gap_analysis' ? 'gap-analysis' : gate;
}

/** Next steps after create_spec (MCP) or spec create (CLI). */
export function stepsAfterCreateSpec(
  slug: string,
  surface: WorkflowSurface,
): WorkflowStep[] {
  if (surface === 'mcp') {
    return [
      {
        action: `Generate requirements.md from the returned bundle, then call write_spec_document { slug: "${slug}", document: "requirements", content: "..." }`,
        reason: 'MCP never calls an LLM — your host AI writes the markdown',
      },
      {
        action: `Call update_spec { slug: "${slug}", gate: "requirements" }`,
        reason: 'Approve before gap-analysis',
      },
      {
        action: `Call generate_gap_analysis { slug: "${slug}" }`,
        reason: 'Compare requirements to your codebase before design',
      },
    ];
  }
  return [
    {
      action: `spec approve requirements --spec ${slug}`,
      reason: 'Approve before gap-analysis',
    },
    {
      action: `spec gap-analysis --spec ${slug}`,
      reason: 'CLI uses free LLM (GemINI/Groq/Ollama) to generate gap-analysis.md',
    },
    {
      action: `spec approve gap-analysis --spec ${slug}`,
    },
    {
      action: `spec design --spec ${slug}`,
    },
  ];
}

/** After write_spec_document or CLI doc generation. */
export function stepsAfterDocument(
  slug: string,
  document: SpecDocument,
  surface: WorkflowSurface,
): WorkflowStep[] {
  const gateMap: Partial<Record<SpecDocument, GateName>> = {
    requirements: 'requirements',
    'gap-analysis': 'gap_analysis',
    design: 'design',
    tasks: 'tasks',
  };
  const gate = gateMap[document];

  const nextMcp: Partial<Record<SpecDocument, WorkflowStep>> = {
    requirements: {
      action: `update_spec { slug: "${slug}", gate: "requirements" }`,
      reason: 'Approve requirements gate',
    },
    'gap-analysis': {
      action: `update_spec { slug: "${slug}", gate: "gap-analysis" }`,
    },
    design: {
      action: `update_spec { slug: "${slug}", gate: "design" }`,
    },
    tasks: {
      action: `update_spec { slug: "${slug}", gate: "tasks" }`,
      reason: 'After approval, call get_next_task to implement',
    },
  };

  const nextGenMcp: Partial<Record<SpecDocument, WorkflowStep>> = {
    requirements: {
      action: `generate_gap_analysis { slug: "${slug}" }`,
      reason: 'Required before design — identifies codebase gaps',
    },
    'gap-analysis': {
      action: `generate_design { slug: "${slug}" }`,
    },
    design: {
      action: `generate_tasks { slug: "${slug}" }`,
    },
    tasks: {
      action: `get_next_task { slug: "${slug}" }`,
      reason: 'Begin implementation; UI tasks will prompt for Figma token or skip',
    },
  };

  if (surface === 'mcp' && gate) {
    return [
      nextMcp[document]!,
      nextGenMcp[document] ?? {
        action: `get_next_task { slug: "${slug}" }`,
      },
    ].filter(Boolean);
  }

  const cliNext: Partial<Record<SpecDocument, WorkflowStep[]>> = {
    requirements: [
      { action: `spec approve requirements --spec ${slug}` },
      { action: `spec gap-analysis --spec ${slug}` },
    ],
    'gap-analysis': [
      { action: `spec approve gap-analysis --spec ${slug}` },
      { action: `spec design --spec ${slug}` },
    ],
    design: [
      { action: `spec approve design --spec ${slug}` },
      { action: `spec tasks --spec ${slug}` },
    ],
    tasks: [
      { action: `spec approve tasks --spec ${slug}` },
      { action: `spec implement --spec ${slug} --next` },
    ],
  };

  return cliNext[document] ?? [{ action: `spec status --spec ${slug}` }];
}

/** After update_spec / spec approve. */
export function stepsAfterApproveGate(
  meta: FeatureSpecMeta,
  approvedGate: GateName | 'all',
  surface: WorkflowSurface,
): WorkflowStep[] {
  const phase = meta.phase;

  if (surface === 'mcp') {
    const byPhase: Record<string, WorkflowStep> = {
      gap_analysis: {
        action: `generate_gap_analysis { slug: "${meta.slug}" }`,
        reason: 'Requirements approved — compare reqs vs codebase',
      },
      design: {
        action: `generate_design { slug: "${meta.slug}" }`,
        reason: 'Gap analysis approved — generate UI/UX design.md',
      },
      tasks: {
        action: `generate_tasks { slug: "${meta.slug}" }`,
        reason: 'Design approved — generate sequenced tasks.md',
      },
      implementing: {
        action: `get_next_task { slug: "${meta.slug}" }`,
        reason: 'All gates approved — start implementation',
      },
    };
    if (approvedGate === 'all') {
      return [byPhase.implementing];
    }
    return [byPhase[phase] ?? { action: `get_spec_status { slug: "${meta.slug}" }` }];
  }

  const cliByPhase: Record<string, WorkflowStep> = {
    gap_analysis: { action: `spec gap-analysis --spec ${meta.slug}` },
    design: { action: `spec design --spec ${meta.slug}` },
    tasks: { action: `spec tasks --spec ${meta.slug}` },
    implementing: { action: `spec implement --spec ${meta.slug} --next` },
  };
  return [cliByPhase[phase] ?? { action: `spec status --spec ${meta.slug}` }];
}

/** After get_next_task / spec implement. */
export function stepsAfterGetNextTask(params: {
  slug: string;
  taskId: string;
  surface: WorkflowSurface;
  figmaPromptNeeded?: boolean;
  design2codeSkipped?: boolean;
  skipReason?: string;
}): WorkflowStep[] {
  const steps: WorkflowStep[] = [];

  if (params.figmaPromptNeeded) {
    steps.push({
      action:
        'Ask the user: provide a Figma Personal Access Token (figd_...) for Design2Code UI generation, or skip',
      reason: 'UI task — Design2Code can scaffold widgets; logic stays with host AI',
    });
    steps.push({
      action: `Retry get_next_task { slug: "${params.slug}", figmaToken: "figd_...", figmaAction: "use" }`,
      reason: 'If user provides token',
    });
    steps.push({
      action: `Retry get_next_task { slug: "${params.slug}", figmaAction: "skip" }`,
      reason: 'If user skips Figma — implement UI manually with spec context',
      optional: true,
    });
    return steps;
  }

  if (params.design2codeSkipped && params.skipReason) {
    steps.push({
      action: 'Implement this task using host AI (Cursor/Claude) and the returned spec context',
      reason: `Design2Code skipped: ${params.skipReason}`,
    });
  } else {
    steps.push({
      action: 'Implement remaining logic (state, BLoC, navigation, validation, tests) with host AI',
      reason: 'Design2Code handles UI layout only when it ran successfully',
      optional: true,
    });
  }

  steps.push({
    action:
      surfaceAction(params.surface, `complete_task { slug: "${params.slug}", taskId: "${params.taskId}" }`, `spec implement --spec ${params.slug} --task ${params.taskId} --complete`),
    reason: 'Mark task done when implementation passes acceptance criteria',
  });
  steps.push({
    action:
      surfaceAction(params.surface, `get_next_task { slug: "${params.slug}" }`, `spec implement --spec ${params.slug} --next`),
    reason: 'Continue to next pending task',
    optional: true,
  });

  return steps;
}

/** After complete_task. */
export function stepsAfterCompleteTask(
  slug: string,
  taskId: string,
  surface: WorkflowSurface,
  hasMoreTasks: boolean,
): WorkflowStep[] {
  if (!hasMoreTasks) {
    return [
      {
        action: surfaceAction(surface, `review_code { slug: "${slug}" }`, `spec review --spec ${slug}`),
        reason: 'All tasks done — validate against design.md',
      },
    ];
  }
  return [
    {
      action: surfaceAction(surface, `get_next_task { slug: "${slug}" }`, `spec implement --spec ${slug} --next`),
    },
    {
      action: surfaceAction(surface, `review_code { slug: "${slug}", taskId: "${taskId}" }`, `spec review --spec ${slug} --task ${taskId}`),
      reason: 'Optional per-task review',
      optional: true,
    },
  ];
}

function surfaceAction(surface: WorkflowSurface, mcp: string, cli: string): string {
  return surface === 'mcp' ? mcp : cli;
}

export function formatWorkflowSteps(steps: WorkflowStep[]): string[] {
  return steps.map((s, i) => {
    const prefix = s.optional ? 'Optional' : 'Next';
    const reason = s.reason ? ` — ${s.reason}` : '';
    return `${i + 1}. [${prefix}] ${s.action}${reason}`;
  });
}

export function formatWorkflowStepsMarkdown(steps: WorkflowStep[]): string {
  if (!steps.length) return '';
  return ['## Next steps', '', ...formatWorkflowSteps(steps).map((l) => `- ${l}`), ''].join('\n');
}

export function mcpToolEquivalent(gate: GateName): string {
  return `update_spec with gate="${gateLabel(gate)}"`;
}
