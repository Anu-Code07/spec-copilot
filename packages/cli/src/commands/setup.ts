import { Command } from 'commander';
import chalk from 'chalk';
import {
  initProject,
  setupCursorIntegration,
  setupMcpIntegration,
  type FrontendStack,
  fileExists,
  defaultProjectPaths,
} from '@specdrive/core';
import { handleError } from '../context.js';
import { cwd } from 'node:process';

const STACKS: FrontendStack[] = ['flutter', 'nextjs', 'react-native'];

async function ensureInitialized(root: string, stack: FrontendStack): Promise<boolean> {
  const paths = defaultProjectPaths(root);
  if (await fileExists(paths.config)) return false;
  await initProject(root, stack);
  console.log(chalk.green('✓ SpecDrive initialized'));
  console.log(chalk.dim(`  ${paths.specdrive}/ (stack: ${stack})`));
  return true;
}

export function registerSetup(program: Command): void {
  const setup = program
    .command('setup')
    .description('Set up SpecDrive integrations');

  setup
    .command('mcp')
    .description('Universal MCP setup for Cursor, Claude Desktop, Windsurf, Cline, or any MCP client')
    .option(
      '--stack <stack>',
      'Frontend stack when auto-initializing: flutter, nextjs, react-native',
      'flutter',
    )
    .option('--figma-token <token>', 'Optional FIGMA_TOKEN in MCP server env')
    .option('--force', 'Overwrite existing MCP config entries')
    .action(async (opts: { stack: string; figmaToken?: string; force?: boolean }) => {
      try {
        const root = cwd();
        const stack = opts.stack as FrontendStack;
        if (!STACKS.includes(stack)) {
          console.error(`Invalid stack: ${stack}. Use flutter, nextjs, or react-native.`);
          process.exit(1);
        }

        await ensureInitialized(root, stack);

        const result = await setupMcpIntegration({
          projectRoot: root,
          absoluteCwd: root,
          figmaToken: opts.figmaToken,
          force: opts.force,
        });

        console.log(chalk.green('✓ MCP configuration written'));
        console.log(chalk.dim(`  ${result.projectMcpConfigPath}`));
        if (result.cursorConfigPath) {
          console.log(
            result.cursorConfigUpdated
              ? chalk.green(`✓ Updated ${result.cursorConfigPath}`)
              : chalk.dim(`• ${result.cursorConfigPath} already configured`),
          );
        }

        console.log('');
        for (const line of result.instructions) {
          console.log(line);
        }
      } catch (error) {
        handleError(error);
      }
    });

  setup
    .command('cursor')
    .description('Cursor setup: MCP + rules + skills (runs setup mcp + Cursor extras)')
    .option(
      '--stack <stack>',
      'Frontend stack when auto-initializing: flutter, nextjs, react-native',
      'flutter',
    )
    .option('--figma-token <token>', 'Add FIGMA_TOKEN to .cursor/mcp.json env')
    .option('--force', 'Overwrite existing SpecDrive Cursor files')
    .action(async (opts: { stack: string; figmaToken?: string; force?: boolean }) => {
      try {
        const root = cwd();
        const stack = opts.stack as FrontendStack;
        if (!STACKS.includes(stack)) {
          console.error(`Invalid stack: ${stack}. Use flutter, nextjs, or react-native.`);
          process.exit(1);
        }

        const didInit = await ensureInitialized(root, stack);

        await setupMcpIntegration({
          projectRoot: root,
          absoluteCwd: root,
          figmaToken: opts.figmaToken,
          force: opts.force,
        });

        const result = await setupCursorIntegration(root, {
          figmaToken: opts.figmaToken,
          force: opts.force,
        });

        if (result.mcpConfigCreated) {
          console.log(chalk.green('✓ Created .cursor/mcp.json'));
        } else if (result.mcpConfigUpdated) {
          console.log(chalk.green('✓ Updated specdrive entry in .cursor/mcp.json'));
        } else {
          console.log(chalk.dim('• .cursor/mcp.json already configured'));
        }

        if (result.ruleCreated) {
          console.log(chalk.green('✓ Added Cursor rule (.cursor/rules/specdrive-workflow.mdc)'));
        } else {
          console.log(chalk.dim('• Cursor rule already present'));
        }

        if (result.cheatsheetCreated) {
          console.log(chalk.green('✓ Added SpecDrive cheat sheet (.cursor/rules/specdrive-cheatsheet.mdc)'));
        } else {
          console.log(chalk.dim('• SpecDrive cheat sheet already present'));
        }

        if (result.skillCreated) {
          console.log(chalk.green('✓ Added Cursor skill (.cursor/skills/specdrive-sdd/SKILL.md)'));
        } else {
          console.log(chalk.dim('• Cursor skill already present'));
        }

        console.log('');
        console.log(chalk.bold('Next steps:'));
        console.log('  1. Restart Cursor (or Settings → MCP → Reload)');
        console.log('  2. Confirm "specdrive" appears under MCP servers');
        console.log('  3. In chat, ask: use search_specs MCP tool');
        console.log('');
        console.log(chalk.dim('Note: npx -y @specdrive/mcp showing a waiting message means it IS installed.'));
        console.log(chalk.dim('MCP uses stdio — it only activates when your IDE connects.'));
        if (didInit) {
          console.log('');
          console.log('Create your first spec via MCP: create_spec { "title": "Your feature" }');
        }
      } catch (error) {
        handleError(error);
      }
    });
}
