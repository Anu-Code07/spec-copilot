import { Command } from 'commander';
import chalk from 'chalk';
import { approveGate, type GateName } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

export function registerApprove(program: Command): void {
  program
    .command('approve')
    .description('Approve a workflow gate')
    .argument('<gate>', 'Gate: requirements, design, tasks, or all')
    .requiredOption('--spec <slug>', 'Spec slug')
    .action(async (gate: string, opts: { spec: string }) => {
      try {
        const root = await requireProjectRoot();
        const valid = ['requirements', 'design', 'tasks', 'all'];
        if (!valid.includes(gate)) {
          console.error(`Invalid gate: ${gate}. Use requirements, design, tasks, or all.`);
          process.exit(1);
        }

        const meta = await approveGate(
          root,
          opts.spec,
          gate as GateName | 'all',
        );

        console.log(chalk.green(`✓ Approved: ${gate}`));
        console.log(chalk.dim(`  Phase: ${meta.phase}`));

        if (gate === 'requirements' || gate === 'all') {
          console.log(`  Next: spec design --spec ${opts.spec}`);
        } else if (gate === 'design') {
          console.log(`  Next: spec tasks --spec ${opts.spec}`);
        } else if (gate === 'tasks') {
          console.log(`  Next: spec implement --spec ${opts.spec} --next`);
        }
      } catch (error) {
        handleError(error);
      }
    });
}
