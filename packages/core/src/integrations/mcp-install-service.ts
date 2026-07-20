import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { fileExists, readText, writeText } from '../infrastructure/files.js';
import {
  buildMcpServerConfig,
  setupMcpIntegration,
  type McpServerConfig,
  type McpSetupResult,
} from './mcp-setup-service.js';

export interface InstallMcpOptions {
  projectRoot: string;
  stack?: 'flutter' | 'nextjs' | 'react-native';
  figmaToken?: string;
  force?: boolean;
  /** Also write Claude Desktop config when the file/dir exists or --claude is set */
  writeClaudeDesktop?: boolean;
}

export interface InstallMcpResult extends McpSetupResult {
  claudeConfigPath?: string;
  claudeConfigUpdated: boolean;
  initialized: boolean;
}

function claudeDesktopConfigPath(): string {
  const home = homedir();
  switch (platform()) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    case 'win32':
      return join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
    default:
      return join(home, '.config', 'Claude', 'claude_desktop_config.json');
  }
}

async function readMcpServers(path: string): Promise<Record<string, McpServerConfig>> {
  if (!(await fileExists(path))) return {};
  try {
    const parsed = JSON.parse(await readText(path)) as { mcpServers?: Record<string, McpServerConfig> };
    return parsed.mcpServers ?? {};
  } catch {
    return {};
  }
}

/** One-command install: init project + wire Cursor + optional Claude Desktop. */
export async function installSpecdriveMcp(options: InstallMcpOptions): Promise<InstallMcpResult> {
  const { projectRoot, figmaToken, force } = options;
  const { initProject } = await import('../services/project-service.js');
  const { defaultProjectPaths } = await import('../domain/paths.js');

  const paths = defaultProjectPaths(projectRoot);
  let initialized = false;
  if (!(await fileExists(paths.config))) {
    await initProject(projectRoot, options.stack ?? 'flutter');
    initialized = true;
  }

  const base = await setupMcpIntegration({
    projectRoot,
    absoluteCwd: projectRoot,
    figmaToken,
    force,
  });

  let claudeConfigUpdated = false;
  let claudeConfigPath: string | undefined;
  const writeClaude = options.writeClaudeDesktop !== false;
  if (writeClaude) {
    claudeConfigPath = claudeDesktopConfigPath();
    const desired = buildMcpServerConfig({ cwd: projectRoot, figmaToken });
    const existing = await readMcpServers(claudeConfigPath);
    const current = existing.specdrive;
    const needsUpdate =
      force === true || JSON.stringify(current ?? null) !== JSON.stringify(desired);

    if (needsUpdate) {
      const next = {
        mcpServers: {
          ...existing,
          specdrive: desired,
        },
      };
      await writeText(claudeConfigPath, `${JSON.stringify(next, null, 2)}\n`);
      claudeConfigUpdated = true;
    }
  }

  const instructions = [
    '✓ SpecDrive MCP wired for this project.',
    '',
    initialized ? `✓ Initialized .specdrive/ (stack: ${options.stack ?? 'flutter'})` : '• .specdrive/ already present',
    base.cursorConfigUpdated
      ? `✓ Cursor: ${base.cursorConfigPath}`
      : `• Cursor already had specdrive: ${base.cursorConfigPath}`,
    claudeConfigUpdated
      ? `✓ Claude Desktop: ${claudeConfigPath}`
      : claudeConfigPath
        ? `• Claude Desktop already had specdrive (or unchanged): ${claudeConfigPath}`
        : '• Claude Desktop config skipped',
    '',
    'Next:',
    '  1. Cursor: Settings → MCP → Reload  (look for "specdrive")',
    '  2. Claude Desktop: fully quit & reopen',
    '  3. In chat: call MCP tool search_specs',
    '',
    'Install command (share with teammates):',
    '  npx -y @specdrive/mcp setup --stack flutter',
  ];

  return {
    ...base,
    instructions,
    claudeConfigPath,
    claudeConfigUpdated,
    initialized,
  };
}
