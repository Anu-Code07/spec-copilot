import { Command } from 'commander';
import chalk from 'chalk';
import {
  getImplementContext,
  formatImplementContext,
  completeTask,
  resolveSpecSlug,
  formatWorkflowSteps,
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
    .option('--auto-figma', 'Run Design2Code for UI tasks (prompts for token if missing)')
    .option('--figma-file <key>', 'Figma file key or URL (or .specdrive/figma.json)')
    .option('--figma-token <token>', 'Figma token when user provides it')
    .option('--figma-skip', 'Skip Design2Code and implement with CLI context only')
    .action(
      async (opts: {
        spec?: string;
        task?: string;
        next?: boolean;
        complete?: boolean;
        autoFigma?: boolean;
        figmaFile?: string;
        figmaToken?: string;
        figmaSkip?: boolean;
      }) => {
        try {
          const root = await requireProjectRoot();
          const slug = await resolveSpecSlug(root, opts.spec);

          const result = await getImplementContext(root, {
            spec: slug,
            taskId: opts.task,
            autoFigma: opts.autoFigma ?? opts.figmaSkip !== true,
            figmaFileKey: opts.figmaFile,
            figmaToken: opts.figmaToken,
            figmaAction: opts.figmaSkip ? 'skip' : opts.figmaToken ? 'use' : 'prompt',
            surface: 'cli',
          });

          console.log(formatImplementContext(result));

          if (opts.complete) {
            await completeTask(root, slug, result.context.task.id);
            console.log(chalk.green(`\n✓ Marked ${result.context.task.id} complete`));
            for (const step of formatWorkflowSteps(result.nextSteps)) {
              console.log(chalk.cyan(`→ ${step}`));
            }
          } else {
            console.log(chalk.dim(`\nMark done: spec implement --spec ${slug} --task ${result.context.task.id} --complete`));
            for (const step of formatWorkflowSteps(result.nextSteps)) {
              console.log(chalk.cyan(`→ ${step}`));
            }
          }
        } catch (error) {
          handleError(error);
        }
      },
    );
}
