import { Command } from 'commander';
import chalk from 'chalk';
import { getSpecStatus, resolveSpecSlug } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

function gateIcon(status: string): string {
  return status === 'approved' ? chalk.green('✓') : chalk.yellow('○');
}

export function registerStatus(program: Command): void {
  program
    .command('status')
    .description('Show spec workflow status')
    .option('--spec <slug>', 'Spec slug')
    .action(async (opts: { spec?: string }) => {
      try {
        const root = await requireProjectRoot();
        const slug = await resolveSpecSlug(root, opts.spec);
        const { meta, tasksDone, tasksTotal } = await getSpecStatus(root, slug);

        console.log(chalk.bold(`${meta.title} (${meta.id})`));
        console.log(`  Slug:   ${meta.slug}`);
        console.log(`  Stack:  ${meta.stack}`);
        console.log(`  Phase:  ${meta.phase}`);
        console.log('');
        console.log('  Gates:');
        console.log(`    ${gateIcon(meta.gates.requirements.status)} requirements`);
        console.log(`    ${gateIcon(meta.gates.design.status)} design`);
        console.log(`    ${gateIcon(meta.gates.tasks.status)} tasks`);

        if (tasksTotal > 0) {
          console.log('');
          console.log(`  Tasks: ${tasksDone}/${tasksTotal} complete`);
        }
      } catch (error) {
        handleError(error);
      }
    });
}
