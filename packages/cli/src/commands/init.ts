import { Command } from 'commander';
import chalk from 'chalk';
import {
  initProject,
  type FrontendStack,
} from '@specdrive/core';
import { handleError } from '../context.js';
import { cwd } from 'node:process';

const STACKS: FrontendStack[] = ['flutter', 'nextjs', 'react-native'];

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Initialize SpecDrive in the current project')
    .option(
      '--stack <stack>',
      'Frontend stack: flutter, nextjs, react-native',
      'flutter',
    )
    .action(async (opts: { stack: string }) => {
      try {
        const stack = opts.stack as FrontendStack;
        if (!STACKS.includes(stack)) {
          console.error(`Invalid stack: ${stack}. Use flutter, nextjs, or react-native.`);
          process.exit(1);
        }

        const { paths } = await initProject(cwd(), stack);
        console.log(chalk.green('✓ SpecDrive initialized'));
        console.log(chalk.dim(`  ${paths.specdrive}/`));
        console.log(chalk.dim(`  Stack: ${stack}`));
        console.log('');
        console.log('Next: spec create "Your feature title"');
      } catch (error) {
        handleError(error);
      }
    });
}
