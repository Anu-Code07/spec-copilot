#!/usr/bin/env node
/**
 * Pre-release checklist (excludes npm publish).
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');

const required = [
  'CHANGELOG.md',
  'docs/KNOWN-LIMITATIONS.md',
  'packages/cli/dist/index.js',
  'packages/core/dist/index.js',
  'packages/mcp/dist/server.js',
  'packages/review-engine/dist/index.js',
  'examples/flutter-app/.specdrive/config.yaml',
  'scripts/smoke-test.mjs',
];

const warnings = [];

async function checkPackageVersions() {
  const packages = [
    'packages/cli/package.json',
    'packages/core/package.json',
    'packages/mcp/package.json',
  ];
  for (const pkgPath of packages) {
    const pkg = JSON.parse(await readFile(join(root, pkgPath), 'utf-8'));
    if (pkg.version !== '0.1.0') {
      warnings.push(`${pkgPath}: version is ${pkg.version}, expected 0.1.0`);
    }
  }
}

async function main() {
  const errors = [];

  for (const file of required) {
    if (!existsSync(join(root, file))) {
      errors.push(`Missing: ${file}`);
    }
  }

  await checkPackageVersions();

  if (errors.length) {
    console.error('Release check FAILED:\n');
    errors.forEach((e) => console.error(`  ✗ ${e}`));
    process.exit(1);
  }

  if (warnings.length) {
    console.warn('Warnings:');
    warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
  }

  console.log('✓ Release check passed (publish step excluded)');
  console.log('  Next: pnpm test && node scripts/smoke-test.mjs');
  console.log('  Then: npm publish when NPM_TOKEN is configured');
}

main();
