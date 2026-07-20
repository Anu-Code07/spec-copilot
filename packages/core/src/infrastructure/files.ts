import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type {
  FeatureSpecMeta,
  ProjectConfig,
  GateName,
  PhaseGate,
  FeatureSpecPaths,
} from '../domain/types.js';
import {
  defaultProjectPaths,
  buildFeaturePaths,
  computeReadyForImplementation,
} from '../domain/paths.js';

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readText(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

export async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf-8');
}

export async function readYaml<T>(path: string): Promise<T> {
  const content = await readText(path);
  return parseYaml(content) as T;
}

export async function writeYaml(path: string, data: unknown): Promise<void> {
  await writeText(path, stringifyYaml(data));
}

export async function findProjectRoot(startDir: string): Promise<string | null> {
  let current = startDir;
  while (true) {
    const configPath = join(current, '.specdrive', 'config.yaml');
    if (await fileExists(configPath)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export async function loadConfig(projectRoot: string): Promise<ProjectConfig> {
  const paths = defaultProjectPaths(projectRoot);
  return readYaml<ProjectConfig>(paths.config);
}

function emptyGate(): PhaseGate {
  return { status: 'pending', generated: false, approved: false };
}

/** Normalize legacy meta.yaml / partial gates into Kiro-aligned shape */
export function normalizeMeta(raw: FeatureSpecMeta): FeatureSpecMeta {
  const gates = { ...(raw.gates ?? {}) } as FeatureSpecMeta['gates'];

  // Migrate legacy single `design` gate → HLD + LLD
  if (gates.design && !gates.design_hld) {
    gates.design_hld = { ...gates.design, generated: gates.design.status === 'approved' || gates.design.generated };
  }
  if (gates.design && !gates.design_lld) {
    gates.design_lld = { ...gates.design };
  }

  for (const key of [
    'brief',
    'requirements',
    'gap_analysis',
    'design_hld',
    'design_lld',
    'tasks',
    'maestro',
  ] as GateName[]) {
    if (!gates[key]) {
      gates[key] = emptyGate();
    } else {
      const g = gates[key]!;
      g.approved = g.status === 'approved' || g.approved === true;
      g.generated = g.generated === true || g.status === 'approved';
    }
  }

  const meta: FeatureSpecMeta = {
    ...raw,
    gates: gates as FeatureSpecMeta['gates'],
    ready_for_implementation:
      raw.ready_for_implementation === true || computeReadyForImplementation({ ...raw, gates: gates as FeatureSpecMeta['gates'] }),
    artifacts: raw.artifacts ?? {},
  };

  // Recompute ready flag from gates
  meta.ready_for_implementation = computeReadyForImplementation(meta);
  return meta;
}

export async function loadMeta(metaPath: string): Promise<FeatureSpecMeta> {
  const dir = dirname(metaPath);
  const specJson = join(dir, 'spec.json');
  const metaYaml = join(dir, 'meta.yaml');

  if (await fileExists(specJson)) {
    const raw = JSON.parse(await readText(specJson)) as FeatureSpecMeta;
    return normalizeMeta(raw);
  }
  if (await fileExists(metaYaml)) {
    const raw = await readYaml<FeatureSpecMeta>(metaYaml);
    return normalizeMeta(raw);
  }
  // path might already be the right file
  if (metaPath.endsWith('.json')) {
    return normalizeMeta(JSON.parse(await readText(metaPath)) as FeatureSpecMeta);
  }
  return normalizeMeta(await readYaml<FeatureSpecMeta>(metaPath));
}

export async function saveMeta(metaPath: string, meta: FeatureSpecMeta): Promise<void> {
  meta.updated = new Date().toISOString().slice(0, 10);
  meta.ready_for_implementation = computeReadyForImplementation(meta);
  const dir = dirname(metaPath);
  const specJson = join(dir, 'spec.json');
  // Always write Kiro-style spec.json
  await writeText(specJson, JSON.stringify(meta, null, 2) + '\n');
  // Drop writing meta.yaml for new specs; leave legacy files untouched unless path was yaml-only
}

export interface SpecLocation {
  /** Short slug from meta */
  slug: string;
  /** Leaf folder name */
  folderName: string;
  /** Absolute dir */
  dir: string;
  /** Relative category: features | bugs | tech-debt | legacy */
  category: string;
}

async function listDirs(dir: string): Promise<string[]> {
  if (!(await fileExists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

/**
 * List all spec folders: features/*, bugs/*, tech-debt/*, and legacy flat specs/*.
 */
export async function listSpecLocations(specsDir: string): Promise<SpecLocation[]> {
  const out: SpecLocation[] = [];

  for (const category of ['features', 'bugs', 'tech-debt'] as const) {
    const base = join(specsDir, category);
    for (const name of await listDirs(base)) {
      const dir = join(base, name);
      if (
        (await fileExists(join(dir, 'spec.json'))) ||
        (await fileExists(join(dir, 'meta.yaml')))
      ) {
        out.push({ slug: name, folderName: name, dir, category });
      }
    }
  }

  // Legacy flat `.specdrive/specs/<slug>/`
  for (const name of await listDirs(specsDir)) {
    if (['features', 'bugs', 'tech-debt'].includes(name)) continue;
    const dir = join(specsDir, name);
    if (
      (await fileExists(join(dir, 'spec.json'))) ||
      (await fileExists(join(dir, 'meta.yaml')))
    ) {
      out.push({ slug: name, folderName: name, dir, category: 'legacy' });
    }
  }

  return out;
}

/** @deprecated use listSpecLocations — returns folder names for compatibility */
export async function listSpecSlugs(specsDir: string): Promise<string[]> {
  const locs = await listSpecLocations(specsDir);
  return locs.map((l) => l.folderName);
}

export async function nextSpecId(specsDir: string): Promise<string> {
  const locs = await listSpecLocations(specsDir);
  let max = 0;
  for (const loc of locs) {
    try {
      const meta = await loadMeta(join(loc.dir, 'spec.json'));
      const num = Number(String(meta.id).replace('SPEC-', ''));
      if (!Number.isNaN(num)) max = Math.max(max, num);
    } catch {
      // ignore unreadable
    }
  }
  return `SPEC-${String(max + 1).padStart(3, '0')}`;
}

/**
 * Resolve a user-provided slug/folder/ticket fragment to FeatureSpecPaths.
 * Tolerates date/ticket prefixes (Kiro-style).
 */
export async function resolveFeaturePaths(
  specsRoot: string,
  query: string,
): Promise<FeatureSpecPaths> {
  const locs = await listSpecLocations(specsRoot);
  const q = query.replace(/^features\//, '').replace(/^bugs\//, '');

  const exact = locs.find((l) => l.folderName === q || l.slug === q);
  if (exact) return buildFeaturePaths(exact.dir);

  // Ends-with match: FRONT-3092-foo or date-prefixed
  const ends = locs.filter(
    (l) =>
      l.folderName.endsWith(`-${q}`) ||
      l.folderName.endsWith(q) ||
      basename(l.dir).includes(q),
  );
  if (ends.length === 1) return buildFeaturePaths(ends[0].dir);
  if (ends.length > 1) {
    throw new Error(
      `Ambiguous spec "${query}". Matches: ${ends.map((e) => e.folderName).join(', ')}`,
    );
  }

  // Not found yet — return preferred new path under features/ (caller may create)
  return buildFeaturePaths(join(specsRoot, 'features', q));
}

export function buildFolderName(opts: {
  slug: string;
  ticket?: string;
  date?: string;
}): string {
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  const ticket = opts.ticket?.replace(/^-+|-+$/g, '');
  return ticket ? `${date}-${ticket}-${opts.slug}` : `${date}-${opts.slug}`;
}
