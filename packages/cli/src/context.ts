import { findProjectRoot, SpecDriveError } from '@specdrive/core';
import { cwd } from 'node:process';

export async function requireProjectRoot(): Promise<string> {
  const root = await findProjectRoot(cwd());
  if (!root) {
    throw new SpecDriveError(
      'Not a SpecDrive project. Run `spec init` first.',
      'NOT_INITIALIZED',
    );
  }
  return root;
}

export function handleError(error: unknown): never {
  if (error instanceof SpecDriveError) {
    console.error(`Error: ${error.message}`);
    if (error.code === 'GATE_NOT_APPROVED') process.exit(3);
    if (error.code === 'LLM_KEY_MISSING') process.exit(2);
    process.exit(1);
  }
  throw error;
}
