#!/usr/bin/env node
/**
 * Prepare workspace packages for npm publish.
 * ONLY runs in CI publish workflow — do NOT commit the output.
 * Monorepo dev uses workspace:* in package.json; pnpm publish resolves these at publish time.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VERSION = (process.argv[2] ?? '0.1.0').replace(/^v/, '');
const root = join(import.meta.dirname, '..');

const packages = [
  'packages/review-engine',
  'packages/core',
  'packages/cli',
  'packages/mcp',
  'packages/plugins/flutter',
  'packages/plugins/nextjs',
  'packages/plugins/react-native',
];

for (const pkgPath of packages) {
  const file = join(root, pkgPath, 'package.json');
  const pkg = JSON.parse(readFileSync(file, 'utf-8'));
  pkg.version = VERSION;

  if (!pkg.publishConfig) pkg.publishConfig = { access: 'public' };

  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!pkg[section]) continue;
    for (const [name, ver] of Object.entries(pkg[section])) {
      if (ver === 'workspace:*' || ver.startsWith('workspace:')) {
        pkg[section][name] = `^${VERSION}`;
      }
    }
  }

  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Prepared ${pkg.name}@${VERSION} for publish`);
}

console.log('\nDone. Run: pnpm publish -r --access public --no-git-checks');
