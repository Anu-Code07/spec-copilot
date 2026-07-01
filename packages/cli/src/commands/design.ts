import { Command } from 'commander';
import chalk from 'chalk';
import { generateDesign } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

export function registerDesign(program: Command): void {
  program
    .command('design')
    .description('Generate design.md from approved requirements')
    .requiredOption('--spec <slug>', 'Spec slug')
    .option('--regenerate', 'Overwrite existing design.md')
    .action(async (opts: { spec: string; regenerate?: boolean }) => {
      try {
        const root = await requireProjectRoot();
        await generateDesign(root, opts.spec, { regenerate: opts.regenerate });
        console.log(chalk.green('✓ Generated design.md'));
        console.log(`  Next: spec approve design --spec ${opts.spec}`);
      } catch (error) {
        handleError(error);
      }
    });
}
