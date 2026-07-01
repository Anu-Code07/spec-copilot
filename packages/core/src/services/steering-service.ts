import { defaultProjectPaths, defaultSteeringPaths } from '../domain/paths.js';
import { readText, fileExists } from '../infrastructure/files.js';
import type { GenerationInput } from '../ai/types.js';

export async function loadSteeringContent(projectRoot: string) {
  const paths = defaultProjectPaths(projectRoot);
  const steeringPaths = defaultSteeringPaths(paths.specdrive);
  const steering: GenerationInput['steering'] = {};

  for (const [key, filePath] of Object.entries(steeringPaths)) {
    if (await fileExists(filePath)) {
      steering[key as keyof GenerationInput['steering']] = await readText(filePath);
    }
  }

  return steering;
}
