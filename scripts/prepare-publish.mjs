#!/usr/bin/env node
/**
 * Prepare workspace packages for npm publish by replacing workspace:* deps
 * with the target version.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VERSION = process.argv[2] ?? '0.1.0';
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

  if (!pkg.publishConfig) {
    pkg.publishConfig = { access: 'public' };
  }

  if (!pkg.repository) {
    pkg.repository = {
      type: 'git',
      url: 'https://github.com/Anu-Code07/spec-copilot.git',
      directory: pkgPath,
    };
  }

  if (!pkg.files) {
    pkg.files = ['dist', 'bin', 'README.md'].filter((f) => {
      try {
        readFileSync(join(root, pkgPath, f));
        return true;
      } catch {
        return f === 'dist';
      }
    });
  }

  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!pkg[section]) continue;
    for (const [name, ver] of Object.entries(pkg[section])) {
      if (ver === 'workspace:*') {
        pkg[section][name] = `^${VERSION}`;
      }
    }
  }

  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Prepared ${pkg.name}@${VERSION}`);
}

console.log(`\nDone. Run: pnpm publish -r --access public --no-git-checks`);
