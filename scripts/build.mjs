import * as esbuild from 'esbuild';
import { readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const watch = process.argv.includes('--watch');

function readPackageDir() {
  const cwd = process.cwd();
  if (cwd.includes('packages/')) {
    const rel = relative(join(rootDir, 'packages'), cwd);
    return rel.split('/').length > 1 ? rel : rel.split('/')[0];
  }
  return process.argv.find((a) => a.startsWith('--pkg='))?.slice(6) ?? 'core';
}

async function buildPackage(pkg) {
  const pkgDir = join(rootDir, 'packages', pkg);
  const entry = join(pkgDir, 'src/index.ts');

  try {
    statSync(entry);
  } catch {
    console.log(`Skip ${pkg} (no src/index.ts)`);
    return;
  }

  const pkgJson = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8'));
  const externals = [
    'better-sqlite3',
    ...Object.keys(pkgJson.dependencies ?? {}).filter((d) => d.startsWith('@specdrive/')),
  ];

  const ctx = await esbuild.context({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: join(pkgDir, 'dist/index.js'),
    sourcemap: true,
    external: externals,
  });

  if (watch) {
    await ctx.watch();
    console.log(`Watching ${pkg}...`);
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log(`Built ${pkg}`);
  }
}

const pkg = readPackageDir();
await buildPackage(pkg);

if (watch) {
  console.log('Watching for changes...');
}
