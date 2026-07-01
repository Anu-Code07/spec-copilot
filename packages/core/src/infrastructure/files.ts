import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { FeatureSpecMeta, ProjectConfig } from '../domain/types.js';
import { defaultProjectPaths } from '../domain/paths.js';

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

export async function loadMeta(metaPath: string): Promise<FeatureSpecMeta> {
  return readYaml<FeatureSpecMeta>(metaPath);
}

export async function saveMeta(metaPath: string, meta: FeatureSpecMeta): Promise<void> {
  meta.updated = new Date().toISOString().slice(0, 10);
  await writeYaml(metaPath, meta);
}

export async function listSpecSlugs(specsDir: string): Promise<string[]> {
  if (!(await fileExists(specsDir))) return [];
  const entries = await readdir(specsDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export async function nextSpecId(specsDir: string): Promise<string> {
  const slugs = await listSpecSlugs(specsDir);
  let max = 0;
  for (const slug of slugs) {
    const metaPath = join(specsDir, slug, 'meta.yaml');
    if (!(await fileExists(metaPath))) continue;
    const meta = await loadMeta(metaPath);
    const num = Number(meta.id.replace('SPEC-', ''));
    if (!Number.isNaN(num)) max = Math.max(max, num);
  }
  return `SPEC-${String(max + 1).padStart(3, '0')}`;
}
