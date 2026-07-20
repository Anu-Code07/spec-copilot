import { cwd } from 'node:process';
import {
  installSpecdriveMcp,
  SPECDRIVE_PACKAGE_VERSION,
  type FrontendStack,
} from '@specdrive/core';

const STACKS: FrontendStack[] = ['flutter', 'nextjs', 'react-native'];

function printHelp(): void {
  console.log(`SpecDrive MCP installer v${SPECDRIVE_PACKAGE_VERSION}

One-command wire for Cursor + Claude Desktop:

  cd your-app
  npx -y @specdrive/mcp setup --stack flutter

Options:
  --stack flutter|nextjs|react-native   (default: flutter)
  --figma-token <token>                 optional FIGMA_TOKEN in MCP env
  --force                               overwrite existing specdrive MCP entry
  --no-claude                           skip Claude Desktop config write

Aliases:  setup | install

After setup: Cursor → Settings → MCP → Reload → you should see "specdrive"
`);
}

function parseFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}

export async function runMcpCli(argv: string[]): Promise<void> {
  const args = argv.slice(2);
  const cmd = args[0];

  if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
    printHelp();
    return;
  }

  if (cmd === '--version' || cmd === '-V') {
    console.log(SPECDRIVE_PACKAGE_VERSION);
    return;
  }

  if (cmd === 'setup' || cmd === 'install') {
    if (args.includes('--help') || args.includes('-h')) {
      printHelp();
      return;
    }
    const stackArg = parseFlag(args, '--stack') ?? 'flutter';
    const stack = stackArg as FrontendStack;
    if (!STACKS.includes(stack)) {
      console.error(`Invalid --stack ${stackArg}. Use: ${STACKS.join(', ')}`);
      process.exit(1);
    }

    const result = await installSpecdriveMcp({
      projectRoot: cwd(),
      stack,
      figmaToken: parseFlag(args, '--figma-token'),
      force: args.includes('--force'),
      writeClaudeDesktop: !args.includes('--no-claude'),
    });

    console.log(`Wiring SpecDrive MCP in ${cwd()} …\n`);
    for (const line of result.instructions) {
      console.log(line);
    }
    return;
  }

  // No subcommand → stdio MCP server (what Cursor/Claude launch)
  if (process.stdin.isTTY) {
    console.error(`SpecDrive MCP v${SPECDRIVE_PACKAGE_VERSION} — stdio mode (waiting for IDE).`);
    console.error('');
    console.error('To install/wire into a project, run:');
    console.error('  npx -y @specdrive/mcp setup --stack flutter');
    console.error('');
  }

  const { startMcpServer } = await import('./server.js');
  await startMcpServer();
}
