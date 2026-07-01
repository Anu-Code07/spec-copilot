import { Command } from 'commander';
import { reviewSpec, resolveSpecSlug, formatReviewReport } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

export function registerReview(program: Command): void {
  program
    .command('review')
    .description('Review implementation against design.md and requirements')
    .option('--spec <slug>', 'Spec slug')
    .option('--task <id>', 'Review specific task')
    .option('--file <path>', 'Review specific file')
    .option('--ci', 'Exit non-zero on failure')
    .action(async (opts: { spec?: string; task?: string; file?: string; ci?: boolean }) => {
      try {
        const root = await requireProjectRoot();
        const slug = await resolveSpecSlug(root, opts.spec);
        const report = await reviewSpec(root, slug, {
          taskId: opts.task,
          filePath: opts.file,
        });

        console.log(formatReviewReport(report));

        if (opts.ci && !report.passed) {
          process.exit(4);
        }
      } catch (error) {
        handleError(error);
      }
    });
}
