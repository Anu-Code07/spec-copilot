import { Command } from 'commander';
import chalk from 'chalk';
import { listSpecs } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

export function registerList(program: Command): void {
  program
    .command('list')
    .description('List all specs in the project')
    .action(async () => {
      try {
        const root = await requireProjectRoot();
        const specs = await listSpecs(root);

        if (specs.length === 0) {
          console.log(chalk.dim('No specs yet. Run: spec create "Feature title"'));
          return;
        }

        for (const spec of specs) {
          console.log(
            `${chalk.bold(spec.id)}  ${spec.slug}  ${chalk.dim(spec.phase)}  ${spec.title}`,
          );
        }
      } catch (error) {
        handleError(error);
      }
    });
}
