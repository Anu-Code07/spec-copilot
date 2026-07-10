import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getCursorSetupStatus,
  setupCursorIntegration,
} from './cursor-setup-service.js';

describe('cursor-setup-service', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'specdrive-cursor-'));
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('creates cursor mcp config, rule, and skill', async () => {
    const result = await setupCursorIntegration(projectRoot);

    expect(result.mcpConfigCreated).toBe(true);
    expect(result.ruleCreated).toBe(true);
    expect(result.skillCreated).toBe(true);

    const mcp = JSON.parse(await readFile(result.mcpConfigPath, 'utf-8')) as {
      mcpServers: { specdrive: { command: string; args: string[] } };
    };
    expect(mcp.mcpServers.specdrive.command).toBe('npx');
    expect(mcp.mcpServers.specdrive.args).toEqual(['-y', '@specdrive/mcp']);

    const status = await getCursorSetupStatus(projectRoot);
    expect(status.mcpConfigured).toBe(true);
    expect(status.rulePresent).toBe(true);
    expect(status.skillPresent).toBe(true);
  });

  it('merges specdrive into existing mcp.json', async () => {
    const mcpPath = join(projectRoot, '.cursor', 'mcp.json');
    await setupCursorIntegration(projectRoot);
    await rm(mcpPath);

    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(join(projectRoot, '.cursor'), { recursive: true });
    await writeFile(
      mcpPath,
      JSON.stringify({
        mcpServers: {
          other: { command: 'echo', args: ['hi'] },
        },
      }),
      'utf-8',
    );

    await setupCursorIntegration(projectRoot);
    const mcp = JSON.parse(await readFile(mcpPath, 'utf-8')) as {
      mcpServers: Record<string, unknown>;
    };
    expect(mcp.mcpServers.other).toBeDefined();
    expect(mcp.mcpServers.specdrive).toBeDefined();
  });

  it('adds figma token to mcp env when provided', async () => {
    await setupCursorIntegration(projectRoot, { figmaToken: 'figd_test' });
    const mcp = JSON.parse(
      await readFile(join(projectRoot, '.cursor', 'mcp.json'), 'utf-8'),
    ) as { mcpServers: { specdrive: { env?: { FIGMA_TOKEN: string } } } };
    expect(mcp.mcpServers.specdrive.env?.FIGMA_TOKEN).toBe('figd_test');
  });
});
