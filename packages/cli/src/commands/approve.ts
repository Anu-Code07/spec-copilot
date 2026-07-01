import { Command } from 'commander';
import chalk from 'chalk';
import { approveGate, type GateName } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

function normalizeGate(gate: string): GateName | 'all' | null {
  const map: Record<string, GateName | 'all'> = {
    requirements: 'requirements',
    'gap-analysis': 'gap_analysis',
    gap_analysis: 'gap_analysis',
    design: 'design',
    tasks: 'tasks',
    all: 'all',
  };
  return map[gate] ?? null;
}

export function registerApprove(program: Command): void {
  program
    .command('approve')
    .description('Approve a workflow gate')
    .argument('<gate>', 'Gate: requirements, gap-analysis, design, tasks, or all')
    .requiredOption('--spec <slug>', 'Spec slug')
    .action(async (gate: string, opts: { spec: string }) => {
      try {
        const root = await requireProjectRoot();
        const normalized = normalizeGate(gate);
        if (!normalized) {
          console.error(
            `Invalid gate: ${gate}. Use requirements, gap-analysis, design, tasks, or all.`,
          );
          process.exit(1);
        }

        const meta = await approveGate(root, opts.spec, normalized);

        console.log(chalk.green(`✓ Approved: ${gate}`));
        console.log(chalk.dim(`  Phase: ${meta.phase}`));

        if (normalized === 'requirements' || normalized === 'all') {
          console.log(`  Next: spec gap-analysis --spec ${opts.spec}`);
        } else if (normalized === 'gap_analysis') {
          console.log(`  Next: spec design --spec ${opts.spec}`);
        } else if (normalized === 'design') {
          console.log(`  Next: spec tasks --spec ${opts.spec}`);
        } else if (normalized === 'tasks') {
          console.log(`  Next: spec implement --spec ${opts.spec} --next`);
        }
      } catch (error) {
        handleError(error);
      }
    });
}
