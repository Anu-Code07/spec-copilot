#!/usr/bin/env node
/**
 * Pack SpecDrive as Claude Desktop extension (.mcpb).
 * Requires: pnpm build, then npx @anthropic/mcpb or @modelcontextprotocol/mcpb CLI
 */
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const extDir = join(root, 'integrations/claude-desktop');
const packDir = join(extDir, '.pack');
const outDir = join(extDir, 'dist');

function run() {
  console.log('Building monorepo...');
  execSync('pnpm build', { cwd: root, stdio: 'inherit' });

  rmSync(packDir, { recursive: true, force: true });
  mkdirSync(packDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  cpSync(join(extDir, 'manifest.json'), join(packDir, 'manifest.json'));
  cpSync(join(extDir, 'server'), join(packDir, 'server'), { recursive: true });

  const mcpDist = join(root, 'packages/mcp/dist');
  const coreDist = join(root, 'packages/core/dist');
  mkdirSync(join(packDir, 'server/mcp/dist'), { recursive: true });
  mkdirSync(join(packDir, 'server/core/dist'), { recursive: true });
  cpSync(mcpDist, join(packDir, 'server/mcp/dist'), { recursive: true });
  cpSync(coreDist, join(packDir, 'server/core/dist'), { recursive: true });

  if (existsSync(join(extDir, 'icon.png'))) {
    cpSync(join(extDir, 'icon.png'), join(packDir, 'icon.png'));
  }

  console.log('Packing .mcpb (install mcpb CLI if this fails)...');
  try {
    execSync(`npx -y @anthropic/mcpb pack "${packDir}" -o "${join(outDir, 'specdrive.mcpb')}"`, {
      cwd: root,
      stdio: 'inherit',
    });
    console.log(`✓ Created ${join(outDir, 'specdrive.mcpb')}`);
  } catch {
    console.log('mcpb CLI not available — zip manually:');
    console.log(`  cd ${packDir} && zip -r ../dist/specdrive.mcpb .`);
  }
}

run();
