import type {
  CreateSpecOptions,
  CreateSpecResult,
  FeatureSpecMeta,
  GateName,
} from '../domain/types.js';
import { SpecDriveError } from './project-service.js';
import {
  defaultProjectPaths,
  featureSpecPaths,
  isGateApproved,
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
} from '../infrastructure/files.js';
import { defaultRequirements } from '../templates/spec-docs.js';
import {
  generateDocumentCli,
  getGenerationBundle,
  formatBundleForMcp,
} from './generation-service.js';
import type { SpecDocument } from '../ai/generation-bundle.js';

function pendingGate(): FeatureSpecMeta['gates'] {
  return {
    requirements: { status: 'pending' },
    gap_analysis: { status: 'pending' },
    design: { status: 'pending' },
    tasks: { status: 'pending' },
  };
}

function approvedGate(by = 'developer'): FeatureSpecMeta['gates'] {
  const at = nowIso();
  return {
    requirements: { status: 'approved', approvedAt: at, approvedBy: by },
    gap_analysis: { status: 'approved', approvedAt: at, approvedBy: by },
    design: { status: 'approved', approvedAt: at, approvedBy: by },
    tasks: { status: 'approved', approvedAt: at, approvedBy: by },
  };
}

function ensureMetaGates(meta: FeatureSpecMeta): FeatureSpecMeta {
  if (!meta.gates.gap_analysis) {
    meta.gates.gap_analysis = { status: 'pending' };
  }
  return meta;
}

async function loadSpecMeta(specPaths: { meta: string }): Promise<FeatureSpecMeta> {
  const meta = ensureMetaGates(await loadMeta(specPaths.meta));
  return meta;
}

export async function createSpec(
  projectRoot: string,
  options: CreateSpecOptions,
): Promise<CreateSpecResult> {
  const config = await loadConfig(projectRoot);
  const paths = defaultProjectPaths(projectRoot);
  const slug = slugify(options.title);
  const runtime = options.runtime ?? 'cli';

  if (!slug) {
    throw new SpecDriveError('Could not derive spec slug from title', 'INVALID_TITLE');
  }

  const specPaths = featureSpecPaths(paths.specs, slug);
  if (await fileExists(specPaths.meta)) {
    throw new SpecDriveError(
      `Spec already exists: ${slug}. Use a different title or remove existing spec.`,
      'SPEC_EXISTS',
    );
  }

  const id = await nextSpecId(paths.specs);
  const type = options.type ?? 'feature';
  const description = options.description ?? options.title;
  const generated: CreateSpecResult['generated'] = [];

  const meta: FeatureSpecMeta = {
    specdriveVersion: '1.0',
    id,
    slug,
    title: options.title,
    type,
    stack: config.stack,
    phase: 'requirements',
    gates: options.quick ? approvedGate() : pendingGate(),
    requirements: [],
    tasks: [],
    description,
    created: todayIso(),
    updated: todayIso(),
  };

  let generationBundle: CreateSpecResult['generationBundle'];

  if (type === 'bugfix') {
    if (runtime === 'mcp') {
      await saveMeta(specPaths.meta, meta);
      generationBundle = await getGenerationBundle(projectRoot, meta, 'bugfix');
      return { slug, id, paths: specPaths, generated, generationBundle };
    }

    const bugfixContent = await generateDocumentCli(projectRoot, meta, 'bugfix');
    await writeText(specPaths.bugfix, bugfixContent);
    meta.phase = 'implementing';
    meta.gates.requirements = { status: 'approved', approvedAt: nowIso(), approvedBy: 'developer' };
    generated.push('bugfix');
    await saveMeta(specPaths.meta, meta);
  } else if (runtime === 'mcp') {
    await saveMeta(specPaths.meta, meta);
    generationBundle = await getGenerationBundle(projectRoot, meta, 'requirements');
    return { slug, id, paths: specPaths, generated, generationBundle };
  } else {
    const reqContent = await generateDocumentCli(projectRoot, meta, 'requirements');
    const reqs = parseRequirements(reqContent);
    meta.requirements = reqs.length
      ? reqs.map((r) => r.id)
      : defaultRequirements(options.title, description).map((r) => r.id);
    await writeText(specPaths.requirements, reqContent);
    generated.push('requirements');
    await saveMeta(specPaths.meta, meta);

    if (options.quick) {
      await generateGapAnalysis(projectRoot, slug, { regenerate: true, skipGateCheck: true });
      await generateDesign(projectRoot, slug, { regenerate: true, skipGateCheck: true });
      await generateTasks(projectRoot, slug, { regenerate: true, skipGateCheck: true });
      generated.push('gap-analysis', 'design', 'tasks');
      const updated = await loadSpecMeta(specPaths);
      updated.phase = 'implementing';
      updated.gates = approvedGate();
      await saveMeta(specPaths.meta, updated);
    }
  }

  const finalMeta = await loadSpecMeta(specPaths);
  return { slug, id: finalMeta.id, paths: specPaths, generated, generationBundle };
}

export async function approveGate(
  projectRoot: string,
  slug: string,
  gate: GateName | 'all',
  approvedBy = 'developer',
): Promise<FeatureSpecMeta> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = featureSpecPaths(paths.specs, slug);
  const meta = await loadSpecMeta(specPaths);

  const gates: GateName[] =
    gate === 'all' ? ['requirements', 'gap_analysis', 'design', 'tasks'] : [gate];

  for (const g of gates) {
    if (g === 'gap_analysis' && !isGateApproved(meta, 'requirements')) {
      throw new SpecDriveError(
        'Requirements must be approved before gap analysis',
        'GATE_NOT_READY',
      );
    }
    if (g === 'design' && !isGateApproved(meta, 'gap_analysis')) {
      throw new SpecDriveError(
        'Gap analysis must be approved before design',
        'GATE_NOT_READY',
      );
    }
    if (g === 'tasks' && !isGateApproved(meta, 'design')) {
      throw new SpecDriveError('Design must be approved before tasks', 'GATE_NOT_READY');
    }

    if (g === 'requirements' && !(await fileExists(specPaths.requirements))) {
      throw new SpecDriveError('requirements.md not found', 'DOC_MISSING');
    }
    if (g === 'gap_analysis' && !(await fileExists(specPaths.gapAnalysis))) {
      throw new SpecDriveError(
        'gap-analysis.md not found — run spec gap-analysis first',
        'DOC_MISSING',
      );
    }
    if (g === 'design' && !(await fileExists(specPaths.design))) {
      throw new SpecDriveError('design.md not found — run spec design first', 'DOC_MISSING');
    }
    if (g === 'tasks' && !(await fileExists(specPaths.tasks))) {
      throw new SpecDriveError('tasks.md not found — run spec tasks first', 'DOC_MISSING');
    }

    meta.gates[g] = { status: 'approved', approvedAt: nowIso(), approvedBy };
    if (g === 'requirements') meta.phase = 'gap_analysis';
    if (g === 'gap_analysis') meta.phase = 'design';
    if (g === 'design') meta.phase = 'tasks';
    if (g === 'tasks') meta.phase = 'implementing';
  }

  await saveMeta(specPaths.meta, meta);
  return meta;
}

export async function generateGapAnalysis(
  projectRoot: string,
  slug: string,
  opts: { regenerate?: boolean; skipGateCheck?: boolean } = {},
): Promise<string> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = featureSpecPaths(paths.specs, slug);
  const meta = await loadSpecMeta(specPaths);

  if (!opts.skipGateCheck && !isGateApproved(meta, 'requirements')) {
    throw new SpecDriveError(
      'Requirements gate not approved. Run: spec approve requirements --spec ' + slug,
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
  await saveMeta(specPaths.meta, meta);
  return content;
}

export async function generateDesign(
  projectRoot: string,
  slug: string,
  opts: { regenerate?: boolean; skipGateCheck?: boolean } = {},
): Promise<string> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = featureSpecPaths(paths.specs, slug);
  const meta = await loadSpecMeta(specPaths);

  if (!opts.skipGateCheck && !isGateApproved(meta, 'gap_analysis')) {
    throw new SpecDriveError(
      'Gap analysis gate not approved. Run: spec approve gap-analysis --spec ' + slug,
      'GATE_NOT_APPROVED',
    );
  }

  if (!opts.regenerate && (await fileExists(specPaths.design))) {
    throw new SpecDriveError(
      'design.md already exists. Use --regenerate to overwrite.',
      'DOC_EXISTS',
    );
  }

  const content = await generateDocumentCli(projectRoot, meta, 'design');
  await writeText(specPaths.design, content);
  meta.phase = 'design';
  await saveMeta(specPaths.meta, meta);
  return content;
}

export async function generateTasks(
  projectRoot: string,
  slug: string,
  opts: { regenerate?: boolean; skipGateCheck?: boolean } = {},
): Promise<string> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = featureSpecPaths(paths.specs, slug);
  const meta = await loadSpecMeta(specPaths);

  if (!opts.skipGateCheck && !isGateApproved(meta, 'design')) {
    throw new SpecDriveError(
      'Design gate not approved. Run: spec approve design --spec ' + slug,
      'GATE_NOT_APPROVED',
    );
  }

  if (!opts.regenerate && (await fileExists(specPaths.tasks))) {
    throw new SpecDriveError(
      'tasks.md already exists. Use --regenerate to overwrite.',
      'DOC_EXISTS',
    );
  }

  const content = await generateDocumentCli(projectRoot, meta, 'tasks');
  await writeText(specPaths.tasks, content);

  meta.tasks = [...content.matchAll(/TASK-\d{3}/g)].map((m) => m[0]);
  meta.phase = 'tasks';
  await saveMeta(specPaths.meta, meta);
  return content;
}

export async function getMcpGenerationBundle(
  projectRoot: string,
  slug: string,
  document: SpecDocument,
): Promise<string> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = featureSpecPaths(paths.specs, slug);
  const meta = await loadSpecMeta(specPaths);
  const bundle = await getGenerationBundle(projectRoot, meta, document);
  return formatBundleForMcp(bundle);
}

export async function listSpecs(projectRoot: string) {
  const paths = defaultProjectPaths(projectRoot);
  const { listSpecSlugs } = await import('../infrastructure/files.js');
  const slugs = await listSpecSlugs(paths.specs);
  const summaries = [];

  for (const slug of slugs) {
    const specPaths = featureSpecPaths(paths.specs, slug);
    if (!(await fileExists(specPaths.meta))) continue;
    const meta = await loadSpecMeta(specPaths);
    summaries.push({
      id: meta.id,
      slug: meta.slug,
      title: meta.title,
      type: meta.type,
      stack: meta.stack,
      phase: meta.phase,
      path: specPaths.dir,
    });
  }

  return summaries;
}

export async function getSpecStatus(projectRoot: string, slug: string) {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = featureSpecPaths(paths.specs, slug);

  if (!(await fileExists(specPaths.meta))) {
    throw new SpecDriveError(`Spec not found: ${slug}`, 'SPEC_NOT_FOUND');
  }

  const meta = await loadSpecMeta(specPaths);
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
  const specPaths = featureSpecPaths(paths.specs, slug);

  if (!(await fileExists(specPaths.tasks))) {
    throw new SpecDriveError('tasks.md not found', 'DOC_MISSING');
  }

  let content = await readText(specPaths.tasks);
  const pattern = new RegExp(
    `(### ${taskId}:[\\s\\S]*?- \\*\\*Status:\\*\\*) pending`,
    'm',
  );

  if (!pattern.test(content)) {
    throw new SpecDriveError(`Task not found or not pending: ${taskId}`, 'TASK_NOT_FOUND');
  }

  content = content.replace(pattern, '$1 done');
  await writeText(specPaths.tasks, content);
}

export async function resolveSpecSlug(
  projectRoot: string,
  spec?: string,
): Promise<string> {
  if (spec) return spec;

  const specs = await listSpecs(projectRoot);
  if (specs.length === 1) return specs[0].slug;

  throw new SpecDriveError(
    'Multiple specs found. Pass --spec <slug>',
    'SPEC_AMBIGUOUS',
  );
}
