import { Command } from 'commander';
import chalk from 'chalk';
import {
  getImplementContext,
  formatImplementContext,
  completeTask,
  resolveSpecSlug,
} from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

export function registerImplement(program: Command): void {
  program
    .command('implement')
    .description('Show implementation context for a task')
    .option('--spec <slug>', 'Spec slug')
    .option('--task <id>', 'Task ID (e.g. TASK-001)')
    .option('--next', 'Next pending task')
    .option('--complete', 'Mark task done after showing context')
    .action(
      async (opts: {
        spec?: string;
        task?: string;
        next?: boolean;
        complete?: boolean;
      }) => {
        try {
          const root = await requireProjectRoot();
          const slug = await resolveSpecSlug(root, opts.spec);

          const ctx = await getImplementContext(root, {
            spec: slug,
            taskId: opts.task,
          });

          console.log(formatImplementContext(ctx));

          if (opts.complete) {
            await completeTask(root, slug, ctx.task.id);
            console.log(chalk.green(`\n✓ Marked ${ctx.task.id} complete`));
          } else {
            console.log(chalk.dim(`\nMark done: spec implement --spec ${slug} --task ${ctx.task.id} --complete`));
          }
        } catch (error) {
          handleError(error);
        }
      },
    );
}
