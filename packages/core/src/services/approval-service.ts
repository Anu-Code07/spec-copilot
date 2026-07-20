import type { FeatureSpecMeta, GateName, GateStatus, SpecPhase } from '../domain/types.js';
import {
  defaultProjectPaths,
  isGateApproved,
  computeReadyForImplementation,
  gateLabel,
  REQUIRED_GATES,
} from '../domain/paths.js';
import {
  fileExists,
  loadMeta,
  readText,
  saveMeta,
  resolveFeaturePaths,
} from '../infrastructure/files.js';
import { SpecDriveError } from './project-service.js';
import { parseRequirements, parseTasks } from '../utils/parse.js';
import { nowIso } from '../utils/format.js';

export type ApprovalDecision = 'approve' | 'reject' | 'request_changes';

export interface ApprovalBrief {
  slug: string;
  folderName: string;
  gate: GateName;
  title: string;
  phase: string;
  status: 'pending_user_approval' | 'already_approved';
  userPromptMarkdown: string;
  documentContent: string;
  summary: {
    documentPath: string;
    highlights: string[];
    openQuestions: string[];
  };
  expectedUserReplies: string[];
  nextToolWhenApproved: {
    tool: 'update_spec';
    args: {
      slug: string;
      gate: string;
      userConfirmed: true;
      decision: 'approve';
    };
  };
  cheatSheet: string;
}

export interface ApprovalResult {
  meta: FeatureSpecMeta;
  decision: ApprovalDecision;
  message: string;
}

export { gateLabel };

export function documentToGate(document: string): GateName | null {
  const map: Record<string, GateName> = {
    brief: 'brief',
    requirements: 'requirements',
    'gap-analysis': 'gap_analysis',
    'design-hld': 'design_hld',
    'design-lld': 'design_lld',
    design: 'design_lld', // legacy: treating combined design as LLD gate
    tasks: 'tasks',
    maestro: 'maestro',
    decisions: 'design_lld', // decisions often accompany LLD
  };
  return map[document] ?? null;
}

function gateToDocFile(
  paths: Awaited<ReturnType<typeof resolveFeaturePaths>>,
  gate: GateName,
): string {
  switch (gate) {
    case 'brief':
      return paths.brief;
    case 'requirements':
      return paths.requirements;
    case 'gap_analysis':
      return paths.gapAnalysis;
    case 'design_hld':
      return paths.designHld;
    case 'design_lld':
      return paths.designLld;
    case 'design':
      return paths.design;
    case 'tasks':
      return paths.tasks;
    case 'maestro':
      return paths.maestro;
    default:
      return paths.requirements;
  }
}

function extractHighlights(markdown: string, gate: GateName): string[] {
  const lines = markdown.split('\n').map((l) => l.trim()).filter(Boolean);
  const highlights: string[] = [];

  if (gate === 'requirements') {
    const reqs = parseRequirements(markdown);
    for (const r of reqs.slice(0, 8)) highlights.push(`${r.id}: ${r.title}`);
    if (reqs.length > 8) highlights.push(`…and ${reqs.length - 8} more requirements`);
  } else if (gate === 'tasks') {
    const tasks = parseTasks(markdown);
    for (const t of tasks.slice(0, 8)) highlights.push(`${t.id}: ${t.title}`);
    if (tasks.length > 8) highlights.push(`…and ${tasks.length - 8} more tasks`);
  } else {
    for (const line of lines) {
      if (line.startsWith('## ') || line.startsWith('### ')) {
        highlights.push(line.replace(/^#+\s*/, ''));
      }
      if (highlights.length >= 10) break;
    }
  }

  if (!highlights.length) highlights.push('(Review the full document content below)');
  return highlights;
}

function extractOpenQuestions(markdown: string): string[] {
  const questions: string[] = [];
  for (const line of markdown.split('\n')) {
    const t = line.trim();
    if (/\b(TODO|TBD|open question|needs clarification|\?\?\?)\b/i.test(t)) {
      questions.push(t.replace(/^[-*]\s*/, '').slice(0, 160));
    }
    if (questions.length >= 5) break;
  }
  return questions;
}

const GATE_TITLES: Record<GateName, string> = {
  brief: 'Brief',
  requirements: 'Requirements',
  gap_analysis: 'Gap analysis',
  design_hld: 'Design HLD',
  design_lld: 'Design LLD',
  design: 'Design',
  tasks: 'Implementation tasks',
  maestro: 'Maestro E2E map',
};

export async function buildApprovalBrief(
  projectRoot: string,
  slug: string,
  gate: GateName,
): Promise<ApprovalBrief> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, slug);
  if (!(await fileExists(specPaths.specJson)) && !(await fileExists(joinMetaYaml(specPaths.dir)))) {
    // also check if dir exists with either
    const hasMeta =
      (await fileExists(specPaths.specJson)) ||
      (await fileExists(`${specPaths.dir}/meta.yaml`));
    if (!hasMeta) {
      throw new SpecDriveError(`Spec not found: ${slug}`, 'SPEC_NOT_FOUND');
    }
  }

  const metaPath = (await fileExists(specPaths.specJson))
    ? specPaths.specJson
    : `${specPaths.dir}/meta.yaml`;
  const meta = await loadMeta(metaPath);
  const label = gateLabel(gate);
  const folderName = meta.folderName ?? slug;

  if (isGateApproved(meta, gate)) {
    return {
      slug: meta.slug,
      folderName,
      gate,
      title: meta.title,
      phase: meta.phase,
      status: 'already_approved',
      userPromptMarkdown: `Gate **${label}** is already approved for **${meta.title}**.`,
      documentContent: '',
      summary: { documentPath: '', highlights: [], openQuestions: [] },
      expectedUserReplies: [],
      nextToolWhenApproved: {
        tool: 'update_spec',
        args: { slug: folderName, gate: label, userConfirmed: true, decision: 'approve' },
      },
      cheatSheet: '',
    };
  }

  const docPath = gateToDocFile(specPaths, gate);
  if (!(await fileExists(docPath))) {
    throw new SpecDriveError(
      `${label} document missing — generate and write_spec_document first`,
      'DOC_MISSING',
    );
  }

  const content = await readText(docPath);
  const highlights = extractHighlights(content, gate);
  const openQuestions = extractOpenQuestions(content);

  const { buildPhaseCheatSheet } = await import('../workflow/journey.js');

  const userPromptMarkdown = [
    `## ⏸ SpecDrive approval needed (Kiro-style)`,
    '',
    `**Spec:** ${meta.title}`,
    `**Folder:** \`${folderName}\``,
    `**Gate:** ${GATE_TITLES[gate]}`,
    `**File:** \`${docPath}\``,
    '',
    '### Highlights',
    ...highlights.map((h) => `- ${h}`),
    '',
    ...(openQuestions.length
      ? ['### Open questions / TBD', ...openQuestions.map((q) => `- ${q}`), '']
      : []),
    '### Full document',
    'The complete markdown is in `documentContent` — **read it before approving**.',
    '',
    '### Your reply (required)',
    '- **approve** — lock this gate and continue to the next phase',
    '- **request changes** — tell me what to fix; I will revise the document',
    '- **reject** — stop this phase',
    '',
    '> **Host AI: STOP.** Show the user the full document. Do **NOT** call `update_spec` until they reply.',
  ].join('\n');

  return {
    slug: meta.slug,
    folderName,
    gate,
    title: meta.title,
    phase: meta.phase,
    status: 'pending_user_approval',
    userPromptMarkdown,
    documentContent: content,
    summary: { documentPath: docPath, highlights, openQuestions },
    expectedUserReplies: ['approve', 'request changes', 'reject'],
    nextToolWhenApproved: {
      tool: 'update_spec',
      args: {
        slug: folderName,
        gate: label,
        userConfirmed: true,
        decision: 'approve',
      },
    },
    cheatSheet: buildPhaseCheatSheet({ slug: folderName, meta }),
  };
}

function joinMetaYaml(dir: string): string {
  return `${dir}/meta.yaml`;
}

function ensurePrerequisiteGates(
  meta: FeatureSpecMeta,
  gate: GateName,
  hasBriefDoc: boolean,
): void {
  const prereq: Partial<Record<GateName, GateName>> = {
    requirements: 'brief',
    gap_analysis: 'requirements',
    design_hld: 'gap_analysis',
    design_lld: 'design_hld',
    tasks: 'design_lld',
    maestro: 'tasks',
  };
  const need = prereq[gate];
  if (!need) return;
  // Brief is optional for CLI/legacy specs that never wrote brief.md
  if (need === 'brief' && !hasBriefDoc) return;
  if (!isGateApproved(meta, need)) {
    throw new SpecDriveError(
      `${gateLabel(need)} must be approved by the user before ${gateLabel(gate)}`,
      'GATE_NOT_READY',
    );
  }
}


function phaseAfterGate(gate: GateName): SpecPhase {
  const map: Partial<Record<GateName, SpecPhase>> = {
    brief: 'requirements',
    requirements: 'gap_analysis',
    gap_analysis: 'design_hld',
    design_hld: 'design_lld',
    design_lld: 'tasks',
    tasks: 'implementing',
    maestro: 'implementing',
    design: 'tasks',
  };
  return map[gate] ?? 'requirements';
}

function docExistsForGate(
  paths: Awaited<ReturnType<typeof resolveFeaturePaths>>,
  gate: GateName,
): Promise<boolean> {
  return fileExists(gateToDocFile(paths, gate));
}

/** Apply human decision. Only call after the user explicitly replied. */
export async function applyApprovalDecision(
  projectRoot: string,
  slug: string,
  gate: GateName | 'all',
  decision: ApprovalDecision,
  opts: { approvedBy?: string; notes?: string } = {},
): Promise<ApprovalResult> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, slug);
  const metaPath = (await fileExists(specPaths.specJson))
    ? specPaths.specJson
    : `${specPaths.dir}/meta.yaml`;
  const meta = await loadMeta(metaPath);

  let gates: GateName[] =
    gate === 'all'
      ? [...REQUIRED_GATES]
      : gate === 'design'
        ? ['design_hld', 'design_lld']
        : [gate];

  if (decision === 'request_changes') {
    return {
      meta,
      decision,
      message: [
        'User requested changes — do NOT approve.',
        opts.notes
          ? `Notes: ${opts.notes}`
          : 'Ask the user what to change, revise the document, write_spec_document again, then request approval again.',
      ].join('\n'),
    };
  }

  if (decision === 'reject') {
    for (const g of gates) {
      const status: GateStatus = 'rejected';
      meta.gates[g] = {
        status,
        generated: meta.gates[g]?.generated ?? true,
        approved: false,
        approvedAt: nowIso(),
        approvedBy: opts.approvedBy ?? 'user',
      };
    }
    meta.ready_for_implementation = false;
    await saveMeta(specPaths.specJson, meta);
    return {
      meta,
      decision,
      message: `Rejected gate(s): ${gates.map(gateLabel).join(', ')}. Workflow stopped.`,
    };
  }

  // approve
  for (const g of gates) {
    const hasBrief = await fileExists(specPaths.brief);
    ensurePrerequisiteGates(meta, g, hasBrief);

    if (!(await docExistsForGate(specPaths, g))) {
      throw new SpecDriveError(
        `${gateLabel(g)} document not found — write it before approving`,
        'DOC_MISSING',
      );
    }

    meta.gates[g] = {
      status: 'approved',
      generated: true,
      approved: true,
      approvedAt: nowIso(),
      approvedBy: opts.approvedBy ?? 'user',
    };
    meta.phase = phaseAfterGate(g);
  }

  meta.ready_for_implementation = computeReadyForImplementation(meta);
  if (meta.ready_for_implementation) {
    meta.phase = 'implementing';
  }

  await saveMeta(specPaths.specJson, meta);
  return {
    meta,
    decision: 'approve',
    message: [
      `Approved by user: ${gates.map(gateLabel).join(', ')}.`,
      meta.ready_for_implementation
        ? 'ready_for_implementation=true — you may call get_next_task.'
        : `Next pending gate still required before implement.`,
    ].join(' '),
  };
}
