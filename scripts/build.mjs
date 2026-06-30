import * as esbuild from 'esbuild';
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

const packagesDir = join(__dirname, '../packages');

function getPackages() {
  const dirs = readdirSync(packagesDir);
  const packages = [];

  for (const dir of dirs) {
    const pkgPath = join(packagesDir, dir, 'package.json');
    try {
      statSync(pkgPath);
      packages.push(dir);
    } catch {
      // not a package
    }
  }

  const pluginsDir = join(packagesDir, 'plugins');
  try {
    for (const dir of readdirSync(pluginsDir)) {
      const pkgPath = join(pluginsDir, dir, 'package.json');
      try {
        statSync(pkgPath);
        packages.push(`plugins/${dir}`);
      } catch {
        // not a package
      }
    }
  } catch {
    // no plugins dir
  }

  return packages;
}

async function buildPackage(pkg) {
  const pkgDir = join(packagesDir, pkg);
  const entry = join(pkgDir, 'src/index.ts');

  try {
    statSync(entry);
  } catch {
    return;
  }

  const ctx = await esbuild.context({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: join(pkgDir, 'dist/index.js'),
    sourcemap: true,
    external: ['better-sqlite3'],
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

for (const pkg of getPackages()) {
  await buildPackage(pkg);
}

if (watch) {
  console.log('Watching for changes...');
}
