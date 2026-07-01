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
    process.exit(error.code === 'GATE_NOT_APPROVED' ? 3 : 1);
  }
  throw error;
}
