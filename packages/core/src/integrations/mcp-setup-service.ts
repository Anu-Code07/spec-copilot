import { join } from 'node:path';
import { fileExists, readText, writeText } from '../infrastructure/files.js';

export interface McpServerConfig {
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
}

export interface McpSetupResult {
  projectMcpConfigPath: string;
  projectMcpConfigCreated: boolean;
  cursorConfigPath?: string;
  cursorConfigUpdated: boolean;
  instructions: string[];
}

export interface McpSetupOptions {
  projectRoot: string;
  figmaToken?: string;
  /** Absolute path for Claude Desktop / non-Cursor IDEs */
  absoluteCwd?: string;
  force?: boolean;
}

/** Universal SpecDrive MCP server entry — works in Cursor, Claude Desktop, Windsurf, Cline, etc. */
export function buildMcpServerConfig(options: {
  cwd: string;
  figmaToken?: string;
}): McpServerConfig {
  const config: McpServerConfig = {
    command: 'npx',
    args: ['-y', '@specdrive/mcp'],
    cwd: options.cwd,
  };
  if (options.figmaToken) {
    config.env = { FIGMA_TOKEN: options.figmaToken };
  }
  return config;
}

function mcpConfigFile(servers: Record<string, McpServerConfig>): { mcpServers: Record<string, McpServerConfig> } {
  return { mcpServers: servers };
}

async function readJsonConfig<T>(path: string): Promise<T | null> {
  if (!(await fileExists(path))) return null;
  try {
    return JSON.parse(await readText(path)) as T;
  } catch {
    return null;
  }
}

export async function setupMcpIntegration(options: McpSetupOptions): Promise<McpSetupResult> {
  const { projectRoot, figmaToken, force } = options;
  const absoluteCwd = options.absoluteCwd ?? projectRoot;

  const projectMcpConfigPath = join(projectRoot, '.specdrive', 'mcp.json');
  const cursorConfigPath = join(projectRoot, '.cursor', 'mcp.json');

  const serverEntry = buildMcpServerConfig({
    cwd: '${workspaceFolder}',
    figmaToken,
  });

  const projectFile = mcpConfigFile({ specdrive: serverEntry });
  const projectMcpConfigCreated = !(await fileExists(projectMcpConfigPath));
  await writeText(projectMcpConfigPath, `${JSON.stringify(projectFile, null, 2)}\n`);

  let cursorConfigUpdated = false;
  const existingCursor = await readJsonConfig<{ mcpServers?: Record<string, McpServerConfig> }>(
    cursorConfigPath,
  );
  const desiredCursor = buildMcpServerConfig({ cwd: '${workspaceFolder}', figmaToken });

  const currentCursor = existingCursor?.mcpServers?.specdrive;
  const needsCursorUpdate =
    force === true || JSON.stringify(currentCursor ?? null) !== JSON.stringify(desiredCursor);

  if (needsCursorUpdate) {
    const next = {
      ...(existingCursor ?? {}),
      mcpServers: {
        ...(existingCursor?.mcpServers ?? {}),
        specdrive: desiredCursor,
      },
    };
    await writeText(cursorConfigPath, `${JSON.stringify(next, null, 2)}\n`);
    cursorConfigUpdated = true;
  }

  const claudeSnippet = mcpConfigFile({
    specdrive: buildMcpServerConfig({ cwd: absoluteCwd, figmaToken }),
  });

  const instructions = [
    'SpecDrive MCP is configured. Pick your editor:',
    '',
    '**Cursor / Windsurf / any IDE using .cursor/mcp.json**',
    `  → ${cursorConfigPath} ${cursorConfigUpdated ? '(updated)' : '(already set)'}`,
    '  → Reload MCP servers in settings',
    '',
    '**Claude Desktop** — paste into claude_desktop_config.json:',
    JSON.stringify(claudeSnippet, null, 2),
    '',
    '**Other MCP clients** — copy .specdrive/mcp.json or use:',
    `  command: npx`,
    `  args: ["-y", "@specdrive/mcp"]`,
    `  cwd: <absolute path to project>`,
    '',
    '**Verify:** running `npx -y @specdrive/mcp` in terminal shows a waiting message — that means installed.',
    'MCP uses stdio; it only talks to your IDE, not the terminal.',
    '',
    '**Test in chat:** call MCP tool `search_specs` (should return [] or your specs, not NOT_INITIALIZED).',
  ];

  return {
    projectMcpConfigPath,
    projectMcpConfigCreated,
    cursorConfigPath,
    cursorConfigUpdated,
    instructions,
  };
}

export function getUniversalMcpSnippet(projectRoot: string, figmaToken?: string): string {
  const snippet = mcpConfigFile({
    specdrive: buildMcpServerConfig({ cwd: projectRoot, figmaToken }),
  });
  return JSON.stringify(snippet, null, 2);
}
