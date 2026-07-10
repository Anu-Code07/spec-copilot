import { join } from 'node:path';
import { fileExists, readText, writeText } from '../infrastructure/files.js';
import {
  cursorMcpServerConfig,
  cursorSddSkill,
  cursorWorkflowRule,
} from '../templates/cursor.js';

export interface CursorSetupResult {
  initialized: boolean;
  mcpConfigPath: string;
  mcpConfigCreated: boolean;
  mcpConfigUpdated: boolean;
  rulePath: string;
  ruleCreated: boolean;
  skillPath: string;
  skillCreated: boolean;
}

export interface CursorSetupOptions {
  figmaToken?: string;
  force?: boolean;
}

interface McpConfigFile {
  mcpServers?: Record<string, Record<string, unknown>>;
}

function cursorPaths(projectRoot: string) {
  const cursorDir = join(projectRoot, '.cursor');
  return {
    cursorDir,
    mcpConfig: join(cursorDir, 'mcp.json'),
    rule: join(cursorDir, 'rules', 'specdrive-workflow.mdc'),
    skill: join(cursorDir, 'skills', 'specdrive-sdd', 'SKILL.md'),
  };
}

async function readMcpConfig(path: string): Promise<McpConfigFile> {
  if (!(await fileExists(path))) return {};
  try {
    return JSON.parse(await readText(path)) as McpConfigFile;
  } catch {
    return {};
  }
}

function configsEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown>,
): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b);
}

export async function setupCursorIntegration(
  projectRoot: string,
  options: CursorSetupOptions = {},
): Promise<CursorSetupResult> {
  const paths = cursorPaths(projectRoot);
  const desiredServer = cursorMcpServerConfig(options.figmaToken);

  const existing = await readMcpConfig(paths.mcpConfig);
  const mcpConfigCreated = !(await fileExists(paths.mcpConfig));
  const currentServer = existing.mcpServers?.specdrive;
  const needsMcpUpdate =
    options.force === true || !configsEqual(currentServer, desiredServer);

  if (needsMcpUpdate) {
    const next: McpConfigFile = {
      ...existing,
      mcpServers: {
        ...existing.mcpServers,
        specdrive: desiredServer,
      },
    };
    await writeText(paths.mcpConfig, `${JSON.stringify(next, null, 2)}\n`);
  }

  const ruleExisted = await fileExists(paths.rule);
  if (!ruleExisted || options.force) {
    await writeText(paths.rule, cursorWorkflowRule());
  }

  const skillExisted = await fileExists(paths.skill);
  if (!skillExisted || options.force) {
    await writeText(paths.skill, cursorSddSkill());
  }

  return {
    initialized: true,
    mcpConfigPath: paths.mcpConfig,
    mcpConfigCreated,
    mcpConfigUpdated: needsMcpUpdate && !mcpConfigCreated,
    rulePath: paths.rule,
    ruleCreated: !ruleExisted,
    skillPath: paths.skill,
    skillCreated: !skillExisted,
  };
}

export async function getCursorSetupStatus(projectRoot: string): Promise<{
  mcpConfigured: boolean;
  rulePresent: boolean;
  skillPresent: boolean;
  mcpConfigPath: string;
}> {
  const paths = cursorPaths(projectRoot);
  const config = await readMcpConfig(paths.mcpConfig);
  const desiredServer = cursorMcpServerConfig();

  return {
    mcpConfigured: configsEqual(config.mcpServers?.specdrive, desiredServer),
    rulePresent: await fileExists(paths.rule),
    skillPresent: await fileExists(paths.skill),
    mcpConfigPath: paths.mcpConfig,
  };
}
