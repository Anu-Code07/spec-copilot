import type {
  CreateSpecOptions,
  CreateSpecResult,
  FeatureSpecMeta,
  GateName,
  PhaseGate,
  SpecPhase,
} from '../domain/types.js';
import { SpecDriveError } from './project-service.js';
import {
  defaultProjectPaths,
  isGateApproved,
  computeReadyForImplementation,
  REQUIRED_GATES,
  gateLabel,
  buildFeaturePaths,
} from '../domain/paths.js';
import { slugify, todayIso, nowIso } from '../utils/format.js';
import { parseRequirements, parseTasks } from '../utils/parse.js';
import {
  fileExists,
  loadConfig,
  loadMeta,
  nextSpecId,
  readText,
  saveMeta,
  writeText,
  buildFolderName,
  resolveFeaturePaths,
  listSpecLocations,
} from '../infrastructure/files.js';
import { defaultRequirements } from '../templates/spec-docs.js';
import {
  generateDocumentCli,
  getGenerationBundle,
  formatBundleForMcp,
} from './generation-service.js';
import type { SpecDocument } from '../ai/generation-bundle.js';
import { buildSpecCreatedJourney } from '../workflow/journey.js';
import { applyApprovalDecision } from './approval-service.js';

function emptyGate(): PhaseGate {
  return { status: 'pending', generated: false, approved: false };
}

function pendingGates(): FeatureSpecMeta['gates'] {
  return {
    brief: emptyGate(),
    requirements: emptyGate(),
    gap_analysis: emptyGate(),
    design_hld: emptyGate(),
    design_lld: emptyGate(),
    tasks: emptyGate(),
    maestro: emptyGate(),
  };
}

function approvedGates(by = 'developer'): FeatureSpecMeta['gates'] {
  const at = nowIso();
  const g = (): PhaseGate => ({
    status: 'approved',
    generated: true,
    approved: true,
    approvedAt: at,
    approvedBy: by,
  });
  return {
    brief: g(),
    requirements: g(),
    gap_analysis: g(),
    design_hld: g(),
    design_lld: g(),
    tasks: g(),
    maestro: g(),
  };
}

async function loadSpecMeta(dir: string): Promise<FeatureSpecMeta> {
  const specJson = `${dir}/spec.json`;
  const metaYaml = `${dir}/meta.yaml`;
  if (await fileExists(specJson)) return loadMeta(specJson);
  if (await fileExists(metaYaml)) return loadMeta(metaYaml);
  throw new SpecDriveError(`Spec meta not found in ${dir}`, 'SPEC_NOT_FOUND');
}

export async function createSpec(
  projectRoot: string,
  options: CreateSpecOptions,
): Promise<CreateSpecResult> {
  const config = await loadConfig(projectRoot);
  const paths = defaultProjectPaths(projectRoot);
  const slug = slugify(options.title);
  const runtime = options.runtime ?? 'cli';
  const type = options.type ?? 'feature';

  if (!slug) {
    throw new SpecDriveError('Could not derive spec slug from title', 'INVALID_TITLE');
  }

  const folderName = buildFolderName({ slug, ticket: options.ticket });
  const category = type === 'bugfix' ? 'bugs' : type === 'tech-debt' ? 'tech-debt' : 'features';
  const dir = `${paths.specs}/${category}/${folderName}`;
  const specPaths = buildFeaturePaths(dir);

  if ((await fileExists(specPaths.specJson)) || (await fileExists(`${dir}/meta.yaml`))) {
    throw new SpecDriveError(
      `Spec already exists: ${folderName}. Use a different title or remove existing spec.`,
      'SPEC_EXISTS',
    );
  }

  // Also block collisions on short slug under features/
  const existing = await listSpecLocations(paths.specs);
  if (existing.some((e) => e.folderName === folderName || e.slug === slug)) {
    // allow same short slug on different dates; only block exact folder
    if (existing.some((e) => e.folderName === folderName)) {
      throw new SpecDriveError(`Spec already exists: ${folderName}`, 'SPEC_EXISTS');
    }
  }

  const id = await nextSpecId(paths.specs);
  const description = options.description ?? options.title;
  const generated: string[] = [];

  const meta: FeatureSpecMeta = {
    specdriveVersion: '1.0',
    id,
    slug,
    folderName,
    title: options.title,
    type,
    stack: config.stack,
    phase: 'brief',
    ticket: options.ticket,
    gates: options.quick ? approvedGates() : pendingGates(),
    ready_for_implementation: false,
    requirements: [],
    tasks: [],
    description,
    created: todayIso(),
    updated: todayIso(),
    artifacts: {},
  };

  let generationBundle: CreateSpecResult['generationBundle'];
  let journeyMarkdown: string | undefined;

  if (type === 'bugfix') {
    if (runtime === 'mcp') {
      await saveMeta(specPaths.specJson, meta);
      generationBundle = await getGenerationBundle(projectRoot, meta, 'bugfix', folderName);
      const journey = buildSpecCreatedJourney({
        slug,
        folderName,
        title: options.title,
        type,
        stack: config.stack,
        createdFiles: [specPaths.specJson],
        ticket: options.ticket,
      });
      return {
        slug,
        folderName,
        id,
        paths: specPaths,
        generated,
        generationBundle,
        journeyMarkdown: journey.userFacingMarkdown,
      };
    }

    const bugfixContent = await generateDocumentCli(projectRoot, meta, 'bugfix');
    await writeText(specPaths.bugfix, bugfixContent);
    meta.phase = 'implementing';
    meta.ready_for_implementation = true;
    meta.gates = approvedGates();
    generated.push('bugfix');
    await saveMeta(specPaths.specJson, meta);
  } else if (runtime === 'mcp') {
    await saveMeta(specPaths.specJson, meta);
    // Start with brief (Kiro-style), not requirements
    generationBundle = await getGenerationBundle(projectRoot, meta, 'brief', folderName);
    const journey = buildSpecCreatedJourney({
      slug,
      folderName,
      title: options.title,
      type,
      stack: config.stack,
      createdFiles: [specPaths.specJson],
      ticket: options.ticket,
    });
    journeyMarkdown = journey.userFacingMarkdown;
    return {
      slug,
      folderName,
      id,
      paths: specPaths,
      generated,
      generationBundle,
      journeyMarkdown,
    };
  } else {
    // CLI: generate requirements (and optional quick full pipeline)
    const reqContent = await generateDocumentCli(projectRoot, meta, 'requirements');
    const reqs = parseRequirements(reqContent);
    meta.requirements = reqs.length
      ? reqs.map((r) => r.id)
      : defaultRequirements(options.title, description).map((r) => r.id);
    await writeText(specPaths.requirements, reqContent);
    meta.gates.requirements = {
      status: 'pending',
      generated: true,
      approved: false,
    };
    meta.artifacts = { ...meta.artifacts, requirements: true };
    meta.phase = 'requirements';
    generated.push('requirements');
    await saveMeta(specPaths.specJson, meta);

    if (options.quick) {
      await generateGapAnalysis(projectRoot, folderName, { regenerate: true, skipGateCheck: true });
      await generateDesignHld(projectRoot, folderName, { regenerate: true, skipGateCheck: true });
      await generateDesignLld(projectRoot, folderName, { regenerate: true, skipGateCheck: true });
      await generateTasks(projectRoot, folderName, { regenerate: true, skipGateCheck: true });
      generated.push('gap-analysis', 'design-hld', 'design-lld', 'tasks');
      const updated = await loadSpecMeta(dir);
      updated.phase = 'implementing';
      updated.gates = approvedGates();
      updated.ready_for_implementation = true;
      await saveMeta(specPaths.specJson, updated);
    }
  }

  const finalMeta = await loadSpecMeta(dir);
  return {
    slug: finalMeta.slug,
    folderName: finalMeta.folderName ?? folderName,
    id: finalMeta.id,
    paths: specPaths,
    generated,
    generationBundle,
    journeyMarkdown,
  };
}

/** CLI / programmatic approve — still requires docs to exist. Prefer applyApprovalDecision for MCP. */
export async function approveGate(
  projectRoot: string,
  slug: string,
  gate: GateName | 'all',
  approvedBy = 'developer',
): Promise<FeatureSpecMeta> {
  const result = await applyApprovalDecision(projectRoot, slug, gate, 'approve', {
    approvedBy,
  });
  return result.meta;
}

export async function generateGapAnalysis(
  projectRoot: string,
  slug: string,
  opts: { regenerate?: boolean; skipGateCheck?: boolean } = {},
): Promise<string> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, slug);
  const meta = await loadSpecMeta(specPaths.dir);

  if (!opts.skipGateCheck && !isGateApproved(meta, 'requirements')) {
    throw new SpecDriveError(
      'Requirements gate not approved. Approve requirements first.',
      'GATE_NOT_APPROVED',
    );
  }

  if (!opts.regenerate && (await fileExists(specPaths.gapAnalysis))) {
    throw new SpecDriveError(
      'gap-analysis.md already exists. Use --regenerate to overwrite.',
      'DOC_EXISTS',
    );
  }

  const content = await generateDocumentCli(projectRoot, meta, 'gap-analysis');
  await writeText(specPaths.gapAnalysis, content);
  meta.phase = 'gap_analysis';
  meta.gates.gap_analysis = {
    ...(meta.gates.gap_analysis ?? emptyGate()),
    generated: true,
  };
  meta.artifacts = { ...meta.artifacts, gapAnalysis: true };
  await saveMeta(specPaths.specJson, meta);
  return content;
}

export async function generateDesignHld(
  projectRoot: string,
  slug: string,
  opts: { regenerate?: boolean; skipGateCheck?: boolean } = {},
): Promise<string> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, slug);
  const meta = await loadSpecMeta(specPaths.dir);

  if (!opts.skipGateCheck && !isGateApproved(meta, 'gap_analysis')) {
    throw new SpecDriveError(
      'Gap analysis gate not approved. Approve gap-analysis first.',
      'GATE_NOT_APPROVED',
    );
  }

  if (!opts.regenerate && (await fileExists(specPaths.designHld))) {
    throw new SpecDriveError('design-hld.md already exists. Use --regenerate.', 'DOC_EXISTS');
  }

  const content = await generateDocumentCli(projectRoot, meta, 'design-hld');
  await writeText(specPaths.designHld, content);
  meta.phase = 'design_hld';
  meta.gates.design_hld = {
    ...(meta.gates.design_hld ?? emptyGate()),
    generated: true,
  };
  meta.artifacts = { ...meta.artifacts, designHld: true };
  await saveMeta(specPaths.specJson, meta);
  return content;
}

export async function generateDesignLld(
  projectRoot: string,
  slug: string,
  opts: { regenerate?: boolean; skipGateCheck?: boolean } = {},
): Promise<string> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, slug);
  const meta = await loadSpecMeta(specPaths.dir);

  if (!opts.skipGateCheck && !isGateApproved(meta, 'design_hld')) {
    throw new SpecDriveError(
      'Design HLD gate not approved. Approve design-hld first.',
      'GATE_NOT_APPROVED',
    );
  }

  if (!opts.regenerate && (await fileExists(specPaths.designLld))) {
    throw new SpecDriveError('design-lld.md already exists. Use --regenerate.', 'DOC_EXISTS');
  }

  const content = await generateDocumentCli(projectRoot, meta, 'design-lld');
  await writeText(specPaths.designLld, content);
  // Also write legacy design.md as concat for older consumers
  const hld = (await fileExists(specPaths.designHld))
    ? await readText(specPaths.designHld)
    : '';
  await writeText(
    specPaths.design,
    [hld && `# Design HLD\n\n${hld}`, `# Design LLD\n\n${content}`]
      .filter(Boolean)
      .join('\n\n---\n\n'),
  );

  meta.phase = 'design_lld';
  meta.gates.design_lld = {
    ...(meta.gates.design_lld ?? emptyGate()),
    generated: true,
  };
  meta.artifacts = { ...meta.artifacts, designLld: true };
  await saveMeta(specPaths.specJson, meta);
  return content;
}

/** @deprecated prefer generateDesignHld + generateDesignLld */
export async function generateDesign(
  projectRoot: string,
  slug: string,
  opts: { regenerate?: boolean; skipGateCheck?: boolean } = {},
): Promise<string> {
  await generateDesignHld(projectRoot, slug, opts);
  return generateDesignLld(projectRoot, slug, { ...opts, skipGateCheck: true });
}

export async function generateTasks(
  projectRoot: string,
  slug: string,
  opts: { regenerate?: boolean; skipGateCheck?: boolean } = {},
): Promise<string> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, slug);
  const meta = await loadSpecMeta(specPaths.dir);

  if (!opts.skipGateCheck && !isGateApproved(meta, 'design_lld') && !isGateApproved(meta, 'design')) {
    throw new SpecDriveError(
      'Design LLD gate not approved. Approve design-lld first.',
      'GATE_NOT_APPROVED',
    );
  }

  if (!opts.regenerate && (await fileExists(specPaths.tasks))) {
    throw new SpecDriveError('tasks.md already exists. Use --regenerate.', 'DOC_EXISTS');
  }

  const content = await generateDocumentCli(projectRoot, meta, 'tasks');
  await writeText(specPaths.tasks, content);

  meta.tasks = [...content.matchAll(/TASK-\d{3}/g)].map((m) => m[0]);
  meta.phase = 'tasks';
  meta.gates.tasks = {
    ...(meta.gates.tasks ?? emptyGate()),
    generated: true,
  };
  meta.artifacts = { ...meta.artifacts, tasks: true };
  await saveMeta(specPaths.specJson, meta);
  return content;
}

export async function getMcpGenerationBundle(
  projectRoot: string,
  slug: string,
  document: SpecDocument,
): Promise<string> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, slug);
  const meta = await loadSpecMeta(specPaths.dir);
  const folder = meta.folderName ?? slug;

  const need: Partial<Record<SpecDocument, GateName>> = {
    requirements: 'brief',
    'gap-analysis': 'requirements',
    'design-hld': 'gap_analysis',
    'design-lld': 'design_hld',
    design: 'gap_analysis',
    tasks: 'design_lld',
    maestro: 'tasks',
  };

  const required = need[document];
  if (required && !isGateApproved(meta, required)) {
    // Legacy: if design_lld required but only old design approved
    if (required === 'design_lld' && isGateApproved(meta, 'design')) {
      // ok
    } else if (required === 'brief' && !meta.gates.brief) {
      // old specs without brief — allow requirements
    } else if (!(required === 'brief' && document === 'requirements' && !meta.artifacts?.brief)) {
      throw new SpecDriveError(
        `${gateLabel(required)} gate not approved by the user yet. Show the document, wait for approve, then update_spec { userConfirmed: true }.`,
        'GATE_NOT_APPROVED',
      );
    }
  }

  // Soft-allow requirements without brief for migrated specs
  if (
    document === 'requirements' &&
    required === 'brief' &&
    !isGateApproved(meta, 'brief') &&
    !(await fileExists(specPaths.brief))
  ) {
    // allow
  } else if (required && document === 'requirements' && !isGateApproved(meta, 'brief') && (await fileExists(specPaths.brief))) {
    throw new SpecDriveError(
      'Brief gate not approved by the user yet. Show brief.md, wait for approve, then update_spec { userConfirmed: true }.',
      'GATE_NOT_APPROVED',
    );
  }

  const bundle = await getGenerationBundle(projectRoot, meta, document, folder);
  return formatBundleForMcp(bundle);
}

export async function listSpecs(projectRoot: string) {
  const paths = defaultProjectPaths(projectRoot);
  const locs = await listSpecLocations(paths.specs);
  const summaries = [];

  for (const loc of locs) {
    try {
      const meta = await loadSpecMeta(loc.dir);
      summaries.push({
        id: meta.id,
        slug: meta.slug,
        folderName: meta.folderName ?? loc.folderName,
        title: meta.title,
        type: meta.type,
        stack: meta.stack,
        phase: meta.phase,
        path: loc.dir,
        ready_for_implementation: meta.ready_for_implementation,
      });
    } catch {
      // skip broken
    }
  }

  return summaries;
}

export async function getSpecStatus(projectRoot: string, slug: string) {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, slug);

  if (!(await fileExists(specPaths.specJson)) && !(await fileExists(`${specPaths.dir}/meta.yaml`))) {
    throw new SpecDriveError(`Spec not found: ${slug}`, 'SPEC_NOT_FOUND');
  }

  const meta = await loadSpecMeta(specPaths.dir);
  meta.ready_for_implementation = computeReadyForImplementation(meta);

  let tasksDone = 0;
  let tasksTotal = 0;

  if (await fileExists(specPaths.tasks)) {
    const tasks = parseTasks(await readText(specPaths.tasks));
    tasksTotal = tasks.length;
    tasksDone = tasks.filter((t) => t.status === 'done').length;
  }

  return { meta, specPaths, tasksDone, tasksTotal };
}

export async function completeTask(
  projectRoot: string,
  slug: string,
  taskId: string,
): Promise<void> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, slug);

  if (!(await fileExists(specPaths.tasks))) {
    throw new SpecDriveError('tasks.md not found', 'DOC_MISSING');
  }

  let content = await readText(specPaths.tasks);
  const pattern = new RegExp(
    `(### ${taskId}:[\\s\\S]*?- \\*\\*Status:\\*\\*) pending`,
    'm',
  );

  if (!pattern.test(content)) {
    // Also support checkbox-only tasks
    const checkboxPattern = new RegExp(
      `(- \\[ \\][\\s\\S]*?${taskId}[\\s\\S]*?)`,
      'm',
    );
    if (checkboxPattern.test(content)) {
      content = content.replace(`- [ ]`, '- [x]'); // first only — weak
    } else {
      throw new SpecDriveError(`Task not found or not pending: ${taskId}`, 'TASK_NOT_FOUND');
    }
  } else {
    content = content.replace(pattern, '$1 done');
  }

  // Prefer marking checkbox if present for this task block
  content = content.replace(
    new RegExp(`(### ${taskId}:[\\s\\S]*?)- \\[ \\]`, 'm'),
    '$1- [x]',
  );

  await writeText(specPaths.tasks, content);
}

export async function resolveSpecSlug(
  projectRoot: string,
  spec?: string,
): Promise<string> {
  if (spec) {
    const paths = defaultProjectPaths(projectRoot);
    const resolved = await resolveFeaturePaths(paths.specs, spec);
    const meta = await loadSpecMeta(resolved.dir);
    return meta.folderName ?? meta.slug;
  }

  const specs = await listSpecs(projectRoot);
  if (specs.length === 1) return specs[0].folderName ?? specs[0].slug;

  throw new SpecDriveError(
    'Multiple specs found. Pass --spec <slug>',
    'SPEC_AMBIGUOUS',
  );
}

export { REQUIRED_GATES, gateLabel };
export type { SpecPhase };
