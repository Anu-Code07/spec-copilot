import type { FeatureSpecMeta, GateName } from '../domain/types.js';
import type { SpecDocument } from '../ai/generation-bundle.js';
import { gateLabel } from '../domain/paths.js';

export type WorkflowSurface = 'mcp' | 'cli';

export interface WorkflowStep {
  action: string;
  reason?: string;
  optional?: boolean;
}

/** Next steps after create_spec (MCP) or spec create (CLI). */
export function stepsAfterCreateSpec(
  slug: string,
  surface: WorkflowSurface,
): WorkflowStep[] {
  if (surface === 'mcp') {
    return [
      {
        action: `Generate brief.md from the returned bundle, then call write_spec_document { slug: "${slug}", document: "brief", content: "..." }`,
        reason: 'Kiro-style: brief is the first human-approved artifact',
      },
      {
        action: `STOP — show the full brief.md to the human and ask: approve / request changes / reject`,
        reason: 'Never auto-approve gates',
      },
      {
        action: `Only after the user says approve → update_spec { slug: "${slug}", gate: "brief", userConfirmed: true, decision: "approve" }`,
        reason: 'userConfirmed=true is required',
      },
    ];
  }
  return [
    {
      action: `Show requirements.md to the user, then: spec approve requirements --spec ${slug}`,
      reason: 'Human approval required before gap-analysis',
    },
    {
      action: `spec gap-analysis --spec ${slug}`,
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
    brief: 'brief',
    requirements: 'requirements',
    'gap-analysis': 'gap_analysis',
    'design-hld': 'design_hld',
    'design-lld': 'design_lld',
    design: 'design_lld',
    tasks: 'tasks',
    maestro: 'maestro',
  };
  const gate = gateMap[document];
  if (!gate) {
    return [{ action: `get_spec_status { slug: "${slug}" }` }];
  }

  const gateArg = gateLabel(gate);

  if (surface === 'mcp') {
    return [
      {
        action: `STOP — show the user the full ${document} document (documentContent / approvalBrief). Do NOT call update_spec yet.`,
        reason: 'Kiro-style: human must read and approve before the next phase',
      },
      {
        action: `Wait for user reply: approve | request changes | reject`,
        reason: 'Only continue after explicit human approval',
      },
      {
        action: `If approve → update_spec { slug: "${slug}", gate: "${gateArg}", userConfirmed: true, decision: "approve" }`,
        reason: 'userConfirmed is required — auto-approve is forbidden',
      },
      {
        action: `If request changes → revise doc → write_spec_document → ask again`,
        optional: true,
      },
    ];
  }

  const cliNext: Partial<Record<SpecDocument, WorkflowStep[]>> = {
    brief: [
      { action: `Show brief.md; wait for approval` },
      { action: `spec approve brief --spec ${slug}` },
    ],
    requirements: [
      { action: `Show requirements.md to the user; wait for approval` },
      { action: `spec approve requirements --spec ${slug}` },
      { action: `spec gap-analysis --spec ${slug}` },
    ],
    'gap-analysis': [
      { action: `Show gap-analysis.md to the user; wait for approval` },
      { action: `spec approve gap-analysis --spec ${slug}` },
      { action: `spec design-hld --spec ${slug}` },
    ],
    'design-hld': [
      { action: `Show design-hld.md; wait for approval` },
      { action: `spec approve design-hld --spec ${slug}` },
      { action: `spec design-lld --spec ${slug}` },
    ],
    'design-lld': [
      { action: `Show design-lld.md; wait for approval` },
      { action: `spec approve design-lld --spec ${slug}` },
      { action: `spec tasks --spec ${slug}` },
    ],
    design: [
      { action: `Show design docs; wait for approval` },
      { action: `spec approve design-lld --spec ${slug}` },
      { action: `spec tasks --spec ${slug}` },
    ],
    tasks: [
      { action: `Show tasks.md to the user; wait for approval` },
      { action: `spec approve tasks --spec ${slug}` },
      { action: `spec implement --spec ${slug} --next` },
    ],
    maestro: [
      { action: `Show maestro.md; wait for approval` },
      { action: `spec approve maestro --spec ${slug}` },
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
  const slug = meta.folderName ?? meta.slug;

  if (surface === 'mcp') {
    if (meta.ready_for_implementation) {
      return [
        {
          action: `get_next_task { slug: "${slug}" }`,
          reason: 'ready_for_implementation=true — start implementation',
        },
      ];
    }

    const byPhase: Record<string, WorkflowStep> = {
      requirements: {
        action: `Generate requirements.md then write_spec_document { slug: "${slug}", document: "requirements", content: "..." }`,
        reason: 'Brief approved',
      },
      gap_analysis: {
        action: `generate_gap_analysis { slug: "${slug}" }`,
        reason: 'Requirements approved — compare reqs vs codebase',
      },
      design_hld: {
        action: `generate_design_hld { slug: "${slug}" }`,
        reason: 'Gap analysis approved — high-level design',
      },
      design_lld: {
        action: `generate_design_lld { slug: "${slug}" }`,
        reason: 'HLD approved — low-level design',
      },
      tasks: {
        action: `generate_tasks { slug: "${slug}" }`,
        reason: 'LLD approved — sequenced checkbox tasks',
      },
      implementing: {
        action: `get_next_task { slug: "${slug}" }`,
        reason: 'All required gates approved',
      },
      maestro: {
        action: `generate_maestro { slug: "${slug}" }`,
        reason: 'Optional UI E2E map',
        optional: true,
      },
    };

    if (approvedGate === 'all') {
      return [byPhase.implementing];
    }
    return [byPhase[meta.phase] ?? { action: `get_spec_status { slug: "${slug}" }` }];
  }

  const cliByPhase: Record<string, WorkflowStep> = {
    requirements: { action: `spec create already wrote requirements — approve then gap-analysis` },
    gap_analysis: { action: `spec gap-analysis --spec ${slug}` },
    design_hld: { action: `spec design-hld --spec ${slug}` },
    design_lld: { action: `spec design-lld --spec ${slug}` },
    tasks: { action: `spec tasks --spec ${slug}` },
    implementing: { action: `spec implement --spec ${slug} --next` },
  };
  return [cliByPhase[meta.phase] ?? { action: `spec status --spec ${slug}` }];
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
        'Ask the user: (A) provide Figma token for optional Design2Code scaffold, or (B) skip — Cursor/Claude implements the UI from HLD/LLD',
      reason: 'UI task — host AI owns UI by default; Design2Code is optional',
    });
    steps.push({
      action: `Retry get_next_task { slug: "${params.slug}", figmaToken: "figd_...", figmaAction: "use" }`,
      reason: 'Optional — Design2Code scaffolds widgets/screens from Figma',
      optional: true,
    });
    steps.push({
      action: `Retry get_next_task { slug: "${params.slug}", figmaAction: "skip" } then implement UI with Cursor/Claude using design-hld/lld`,
      reason: 'Recommended default — host AI builds screens using steering + design',
    });
    return steps;
  }

  if (params.design2codeSkipped && params.skipReason) {
    steps.push({
      action:
        'Implement this task with Cursor/Claude using returned context (steering + HLD/LLD + requirements). Use REAL paths from gap-analysis — never invent modules.',
      reason: `Design2Code not used: ${params.skipReason}`,
    });
  } else {
    steps.push({
      action:
        'Cursor/Claude: implement under paths from steering/structure.md + design-lld file map (state, navigation, tests as needed)',
      reason: 'Host AI finishes everything Design2Code does not cover',
    });
  }

  steps.push({
    action: surfaceAction(
      params.surface,
      `complete_task { slug: "${params.slug}", taskId: "${params.taskId}" }`,
      `spec implement --spec ${params.slug} --task ${params.taskId} --complete`,
    ),
    reason: 'Mark task done when acceptance criteria pass (checkbox [x])',
  });
  steps.push({
    action: surfaceAction(
      params.surface,
      `get_next_task { slug: "${params.slug}" }`,
      `spec implement --spec ${params.slug} --next`,
    ),
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
        action: surfaceAction(
          surface,
          `review_code { slug: "${slug}" }`,
          `spec review --spec ${slug}`,
        ),
        reason: 'All tasks done — validate against HLD/LLD + requirements',
      },
    ];
  }
  return [
    {
      action: surfaceAction(
        surface,
        `get_next_task { slug: "${slug}" }`,
        `spec implement --spec ${slug} --next`,
      ),
    },
    {
      action: surfaceAction(
        surface,
        `review_code { slug: "${slug}", taskId: "${taskId}" }`,
        `spec review --spec ${slug} --task ${taskId}`,
      ),
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
