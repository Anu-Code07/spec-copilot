import type { FrontendStack, FeatureSpecMeta, GateName } from '../domain/types.js';
import type { SpecDocument } from '../ai/generation-bundle.js';
import { gateLabel } from '../domain/paths.js';

export interface SpecJourneyStep {
  n: number;
  phase: string;
  mcpTool: string;
  what: string;
  humanGate: boolean;
  optional?: boolean;
}

export interface SpecCreatedJourney {
  header: string;
  slug: string;
  folderName: string;
  title: string;
  configuration: {
    type: string;
    stack: FrontendStack;
    workflow: string;
    requireHumanApproval: boolean;
  };
  journey: SpecJourneyStep[];
  flags: string[];
  createdFiles: string[];
  /** Markdown the host AI MUST show the user immediately after create_spec */
  userFacingMarkdown: string;
}

/** Kiro-style pipeline — generic for any repo (paths from steering). */
export const JOURNEY_STEPS: SpecJourneyStep[] = [
  {
    n: 1,
    phase: 'brief',
    mcpTool: 'write_spec_document (brief) → STOP → user approve → update_spec',
    what: 'Problem, scope in/out, approach',
    humanGate: true,
  },
  {
    n: 2,
    phase: 'requirements',
    mcpTool: 'write_spec_document (requirements) → STOP → user approve → update_spec',
    what: 'User stories + EARS acceptance criteria',
    humanGate: true,
  },
  {
    n: 3,
    phase: 'gap-analysis',
    mcpTool: 'generate_gap_analysis → write → STOP → user approve → update_spec',
    what: 'Requirements vs real codebase (cite real files)',
    humanGate: true,
  },
  {
    n: 4,
    phase: 'design-hld',
    mcpTool: 'generate_design_hld → write → STOP → user approve → update_spec',
    what: 'Architecture / flows overview (HLD)',
    humanGate: true,
  },
  {
    n: 5,
    phase: 'design-lld',
    mcpTool: 'generate_design_lld → write → STOP → user approve → update_spec',
    what: 'Interfaces / classes / files (LLD)',
    humanGate: true,
  },
  {
    n: 6,
    phase: 'tasks',
    mcpTool: 'generate_tasks → write → STOP → user approve → update_spec',
    what: 'Small checkbox tasks [ ] scoped to real files — last human gate',
    humanGate: true,
  },
  {
    n: 7,
    phase: 'implement',
    mcpTool: 'get_next_task → implement → complete_task',
    what: 'Build when ready_for_implementation=true (Design2Code only if user wants Figma on a UI task)',
    humanGate: false,
  },
  {
    n: 8,
    phase: 'validate',
    mcpTool: 'review_code',
    what: 'Validate against HLD/LLD + requirements',
    humanGate: false,
  },
];

/** Kiro-style SPEC CREATED card for create_spec responses. */
export function buildSpecCreatedJourney(params: {
  slug: string;
  folderName: string;
  title: string;
  type: string;
  stack: FrontendStack;
  createdFiles: string[];
  ticket?: string;
}): SpecCreatedJourney {
  const configuration = {
    type: params.type,
    stack: params.stack,
    workflow: 'Requirements First (gated) — Kiro-style',
    requireHumanApproval: true,
  };

  const lines = [
    `--- SPEC CREATED: ${params.folderName}`,
    '',
    'CONFIGURATION',
    `  Type:     ${params.type}`,
    `  Stack:    ${params.stack}`,
    params.ticket ? `  Ticket:   ${params.ticket}` : null,
    `  Workflow: ${configuration.workflow}`,
    '  Artifacts: brief [Y] · requirements [Y] · gap-analysis [Y] · HLD [Y] · LLD [Y] · tasks [Y]',
    '  Approvals: HUMAN required through tasks — never auto-approve',
    '  Unlock:    ready_for_implementation=true after tasks approved → get_next_task',
    '  Design2Code: optional on UI tasks only (user provides Figma token or skips)',
    '',
    'YOUR JOURNEY',
    ...JOURNEY_STEPS.map((s) => {
      const gate = s.humanGate ? (s.optional ? '  ← YOU APPROVE (optional)' : '  ← YOU APPROVE') : '';
      return `  ${s.n}. [${s.phase}] ${s.what}${gate}\n     MCP: ${s.mcpTool}`;
    }),
    '',
    'FLAGS',
    '  • Host AI must STOP after each write_spec_document and show you the full doc',
    '  • Only call update_spec after you reply: approve | request changes | reject',
    '  • update_spec requires userConfirmed: true — otherwise it returns an approval brief',
    '  • Gap analysis must cite REAL files from this repo (from steering + scan) — no invented modules',
    '  • Implement only under paths from steering/structure.md — never invent a scaffold folder',
    '',
    'CREATED FILES',
    ...params.createdFiles.map((f) => `  • ${f}`),
    '',
    'NEXT FOR HOST AI',
    `  1. Generate brief.md from the create_spec bundle (problem, scope, approach)`,
    `  2. write_spec_document { slug: "${params.folderName}", document: "brief", content: "..." }`,
    `  3. SHOW the full brief.md to the user — do not continue until they approve`,
  ].filter((l) => l !== null) as string[];

  return {
    header: `SPEC CREATED: ${params.folderName}`,
    slug: params.slug,
    folderName: params.folderName,
    title: params.title,
    configuration,
    journey: JOURNEY_STEPS,
    flags: [
      'Human approval required at every gate',
      'Never call update_spec without userConfirmed: true',
      'Always show documentContent to the user before asking to approve',
      'Steering files are source of truth for package paths and architecture',
    ],
    createdFiles: params.createdFiles,
    userFacingMarkdown: lines.join('\n'),
  };
}

/** Phase cheat card for Cursor/Claude at each gate. */
export function buildPhaseCheatSheet(params: {
  slug: string;
  meta: FeatureSpecMeta;
  document?: SpecDocument;
}): string {
  const pending = (
    ['brief', 'requirements', 'gap_analysis', 'design_hld', 'design_lld', 'tasks'] as GateName[]
  )
    .filter((g) => {
      const gate = params.meta.gates[g];
      return !gate || (gate.status !== 'approved' && !gate.approved);
    })
    .map((g) => gateLabel(g));

  return [
    `# SpecDrive phase cheat — ${params.slug}`,
    '',
    `Phase: **${params.meta.phase}** · Stack: **${params.meta.stack}**`,
    `ready_for_implementation: **${params.meta.ready_for_implementation ? 'true' : 'false'}**`,
    `Pending gates: ${pending.length ? pending.join(', ') : 'none'}`,
    '',
    '## Rules (never break)',
    '1. After writing a doc → show FULL content to the human → wait',
    '2. Never auto-call update_spec',
    '3. update_spec needs `{ userConfirmed: true, decision: "approve" }`',
    '4. generate_* only after the previous gate is user-approved',
    '5. Read steering (product / structure / tech / coding-style) before designing',
    '6. Gap analysis cites real files from the scan — do not invent modules',
    '7. Tasks are small, file-scoped, checkboxed `- [ ]` / `- [x]`',
    '8. Design2Code is optional on UI tasks during implement — not a separate phase',
    '',
    '## Reply map',
    '| User says | You do |',
    '|-----------|--------|',
    '| approve | update_spec with userConfirmed: true |',
    '| request changes | revise → write_spec_document → ask again |',
    '| reject | stop; mark gate rejected if they confirm |',
    '',
    '## Pipeline',
    'brief → requirements → gap-analysis → design-hld → design-lld → tasks → implement → validate',
    '',
    params.document
      ? `Current document focus: **${params.document}**`
      : 'Ask get_spec_status if unsure where you are.',
  ].join('\n');
}
