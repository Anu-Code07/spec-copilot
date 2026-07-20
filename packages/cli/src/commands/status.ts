import { Command } from 'commander';
import chalk from 'chalk';
import { getSpecStatus, resolveSpecSlug } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

function gateIcon(gate?: { status?: string; approved?: boolean }): string {
  if (!gate) return chalk.yellow('○');
  return gate.status === 'approved' || gate.approved ? chalk.green('✓') : chalk.yellow('○');
}

export function registerStatus(program: Command): void {
  program
    .command('status')
    .description('Show spec workflow status (Kiro-style gates)')
    .option('--spec <slug>', 'Spec slug or folder name')
    .action(async (opts: { spec?: string }) => {
      try {
        const root = await requireProjectRoot();
        const slug = await resolveSpecSlug(root, opts.spec);
        const { meta, tasksDone, tasksTotal } = await getSpecStatus(root, slug);

        console.log(chalk.bold(`${meta.title} (${meta.id})`));
        console.log(`  Slug:   ${meta.slug}`);
        if (meta.folderName) console.log(`  Folder: ${meta.folderName}`);
        console.log(`  Stack:  ${meta.stack}`);
        console.log(`  Phase:  ${meta.phase}`);
        console.log(
          `  Ready:  ${meta.ready_for_implementation ? chalk.green('true') : chalk.yellow('false')}`,
        );
        console.log('');
        console.log('  Gates:');
        console.log(`    ${gateIcon(meta.gates.brief)} brief`);
        console.log(`    ${gateIcon(meta.gates.requirements)} requirements`);
        console.log(`    ${gateIcon(meta.gates.gap_analysis)} gap-analysis`);
        console.log(`    ${gateIcon(meta.gates.design_hld)} design-hld`);
        console.log(`    ${gateIcon(meta.gates.design_lld)} design-lld`);
        console.log(`    ${gateIcon(meta.gates.tasks)} tasks`);
        if (meta.artifacts?.maestro || meta.gates.maestro) {
          console.log(`    ${gateIcon(meta.gates.maestro)} maestro`);
        }

        if (tasksTotal > 0) {
          console.log('');
          console.log(`  Tasks: ${tasksDone}/${tasksTotal} complete`);
        }
      } catch (error) {
        handleError(error);
      }
    });
}
