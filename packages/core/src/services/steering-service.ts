import {
  defaultProjectPaths,
  defaultSteeringPaths,
  legacySteeringPaths,
} from '../domain/paths.js';
import { readText, fileExists } from '../infrastructure/files.js';
import type { GenerationInput } from '../ai/types.js';

/**
 * Load steering — prefer `.specdrive/steering/*` (Kiro-style),
 * fall back to legacy flat `.specdrive/*.md`.
 * Steering is the source of truth for package paths & architecture in ANY repo.
 */
export async function loadSteeringContent(projectRoot: string) {
  const paths = defaultProjectPaths(projectRoot);
  const preferred = defaultSteeringPaths(paths.specdrive);
  const legacy = legacySteeringPaths(paths.specdrive);
  const steering: GenerationInput['steering'] = {};

  const pairs: Array<[keyof GenerationInput['steering'], string, string]> = [
    ['product', preferred.product, legacy.product],
    ['techStack', preferred.techStack, legacy.techStack],
    ['structure', preferred.structure, legacy.structure],
    ['codingStyle', preferred.codingStyle, legacy.codingStyle],
  ];

  for (const [key, primary, fallback] of pairs) {
    if (await fileExists(primary)) {
      steering[key] = await readText(primary);
    } else if (await fileExists(fallback)) {
      steering[key] = await readText(fallback);
    }
  }

  // Optional vertical / analytics files under steering/ — concatenate into structure hint
  const extras = ['analytics.md', 'learnings.md'];
  const verticalDir = `${paths.steering}/verticals`;
  const extraChunks: string[] = [];
  for (const name of extras) {
    const p = `${paths.steering}/${name}`;
    if (await fileExists(p)) extraChunks.push(await readText(p));
  }
  if (await fileExists(verticalDir)) {
    try {
      const { readdir } = await import('node:fs/promises');
      for (const f of await readdir(verticalDir)) {
        if (f.endsWith('.md')) {
          extraChunks.push(await readText(`${verticalDir}/${f}`));
        }
      }
    } catch {
      // ignore
    }
  }
  if (extraChunks.length) {
    steering.structure = [steering.structure, '# Additional steering', ...extraChunks]
      .filter(Boolean)
      .join('\n\n');
  }

  return steering;
}
