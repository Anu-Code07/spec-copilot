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
import {
  requirementsMd,
  defaultRequirements,
  designMd,
  tasksMd,
  bugfixMd,
} from '../templates/spec-docs.js';

function pendingGate(): FeatureSpecMeta['gates'] {
  return {
    requirements: { status: 'pending' },
    design: { status: 'pending' },
    tasks: { status: 'pending' },
  };
}

function approvedGate(by = 'developer'): FeatureSpecMeta['gates'] {
  const at = nowIso();
  return {
    requirements: { status: 'approved', approvedAt: at, approvedBy: by },
    design: { status: 'approved', approvedAt: at, approvedBy: by },
    tasks: { status: 'approved', approvedAt: at, approvedBy: by },
  };
}

export async function createSpec(
  projectRoot: string,
  options: CreateSpecOptions,
): Promise<CreateSpecResult> {
  const config = await loadConfig(projectRoot);
  const paths = defaultProjectPaths(projectRoot);
  const slug = slugify(options.title);

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

  if (type === 'bugfix') {
    await writeText(specPaths.bugfix, bugfixMd(options.title, description));
    meta.phase = 'implementing';
    meta.gates.requirements = { status: 'approved', approvedAt: nowIso(), approvedBy: 'developer' };
    generated.push('bugfix');
    await saveMeta(specPaths.meta, meta);
  } else {
    const reqs = defaultRequirements(options.title, description);
    meta.requirements = reqs.map((r) => r.id);
    await writeText(specPaths.requirements, requirementsMd(options.title, description, reqs));
    generated.push('requirements');
    await saveMeta(specPaths.meta, meta);

    if (options.quick) {
      await generateDesign(projectRoot, slug, { regenerate: true, skipGateCheck: true });
      await generateTasks(projectRoot, slug, { regenerate: true, skipGateCheck: true });
      generated.push('design', 'tasks');
      const updated = await loadMeta(specPaths.meta);
      updated.phase = 'implementing';
      updated.gates = approvedGate();
      await saveMeta(specPaths.meta, updated);
    }
  }

  const finalMeta = await loadMeta(specPaths.meta);
  return { slug, id: finalMeta.id, paths: specPaths, generated };
}

export async function approveGate(
  projectRoot: string,
  slug: string,
  gate: GateName | 'all',
  approvedBy = 'developer',
): Promise<FeatureSpecMeta> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = featureSpecPaths(paths.specs, slug);
  const meta = await loadMeta(specPaths.meta);

  const gates: GateName[] = gate === 'all' ? ['requirements', 'design', 'tasks'] : [gate];

  for (const g of gates) {
    if (g === 'design' && !isGateApproved(meta, 'requirements')) {
      throw new SpecDriveError(
        'Requirements must be approved before design',
        'GATE_NOT_READY',
      );
    }
    if (g === 'tasks' && !isGateApproved(meta, 'design')) {
      throw new SpecDriveError('Design must be approved before tasks', 'GATE_NOT_READY');
    }

    if (g === 'requirements' && !(await fileExists(specPaths.requirements))) {
      throw new SpecDriveError('requirements.md not found', 'DOC_MISSING');
    }
    if (g === 'design' && !(await fileExists(specPaths.design))) {
      throw new SpecDriveError('design.md not found — run spec design first', 'DOC_MISSING');
    }
    if (g === 'tasks' && !(await fileExists(specPaths.tasks))) {
      throw new SpecDriveError('tasks.md not found — run spec tasks first', 'DOC_MISSING');
    }

    meta.gates[g] = { status: 'approved', approvedAt: nowIso(), approvedBy };
    if (g === 'requirements') meta.phase = 'design';
    if (g === 'design') meta.phase = 'tasks';
    if (g === 'tasks') meta.phase = 'implementing';
  }

  await saveMeta(specPaths.meta, meta);
  return meta;
}

export async function generateDesign(
  projectRoot: string,
  slug: string,
  opts: { regenerate?: boolean; skipGateCheck?: boolean } = {},
): Promise<string> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = featureSpecPaths(paths.specs, slug);
  const meta = await loadMeta(specPaths.meta);

  if (!opts.skipGateCheck && !isGateApproved(meta, 'requirements')) {
    throw new SpecDriveError(
      'Requirements gate not approved. Run: spec approve requirements --spec ' + slug,
      'GATE_NOT_APPROVED',
    );
  }

  if (!opts.regenerate && (await fileExists(specPaths.design))) {
    throw new SpecDriveError(
      'design.md already exists. Use --regenerate to overwrite.',
      'DOC_EXISTS',
    );
  }

  const reqContent = await readText(specPaths.requirements);
  const requirements = parseRequirements(reqContent);
  const content = designMd(meta.title, slug, meta.stack, requirements);
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
  const meta = await loadMeta(specPaths.meta);

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

  const reqContent = await readText(specPaths.requirements);
  const requirements = parseRequirements(reqContent);
  const content = tasksMd(meta.title, slug, meta.stack, requirements);
  await writeText(specPaths.tasks, content);

  meta.tasks = [...content.matchAll(/TASK-\d{3}/g)].map((m) => m[0]);
  meta.phase = 'tasks';
  await saveMeta(specPaths.meta, meta);
  return content;
}

export async function listSpecs(projectRoot: string) {
  const paths = defaultProjectPaths(projectRoot);
  const { listSpecSlugs } = await import('../infrastructure/files.js');
  const slugs = await listSpecSlugs(paths.specs);
  const summaries = [];

  for (const slug of slugs) {
    const specPaths = featureSpecPaths(paths.specs, slug);
    if (!(await fileExists(specPaths.meta))) continue;
    const meta = await loadMeta(specPaths.meta);
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

  const meta = await loadMeta(specPaths.meta);
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
