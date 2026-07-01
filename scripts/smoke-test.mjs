#!/usr/bin/env node
/**
 * End-to-end smoke test for SpecDrive CLI (no npm publish required).
 * Run after: pnpm build
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const specBin = join(root, 'packages/cli/bin/spec.js');

function run(args, cwd, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [specBin, ...args], {
      cwd,
      env: { ...process.env, SPECDRIVE_LLM_OFFLINE: '1', ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`spec ${args.join(' ')} failed (${code}):\n${stderr || stdout}`));
    });
  });
}

async function main() {
  const projectDir = await mkdtemp(join(tmpdir(), 'specdrive-smoke-'));

  try {
    console.log('→ spec init --stack flutter');
    await run(['init', '--stack', 'flutter'], projectDir);

    console.log('→ spec create (quick)');
    await run(['create', 'Smoke Test Feature', '--quick'], projectDir);

    console.log('→ spec list');
    const { stdout: listOut } = await run(['list'], projectDir);
    if (!listOut.includes('smoke-test-feature')) {
      throw new Error('spec list missing smoke-test-feature');
    }

    console.log('→ spec doctor');
    await run(['doctor'], projectDir);

    console.log('→ spec status');
    await run(['status', '--spec', 'smoke-test-feature'], projectDir);

    console.log('→ spec implement --next');
    await run(['implement', '--spec', 'smoke-test-feature', '--next'], projectDir);

    console.log('→ spec figma status');
    await run(['figma', 'status'], projectDir);

    console.log('→ spec review --ci');
    await run(['review', '--spec', 'smoke-test-feature', '--ci'], projectDir);

    console.log('\n✓ Smoke test passed');
  } finally {
    await rm(projectDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
