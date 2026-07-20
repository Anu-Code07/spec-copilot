import { Command } from 'commander';
import chalk from 'chalk';
import { approveGate, type GateName } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

function normalizeGate(gate: string): GateName | 'all' | null {
  const map: Record<string, GateName | 'all'> = {
    brief: 'brief',
    requirements: 'requirements',
    'gap-analysis': 'gap_analysis',
    gap_analysis: 'gap_analysis',
    'design-hld': 'design_hld',
    design_hld: 'design_hld',
    'design-lld': 'design_lld',
    design_lld: 'design_lld',
    design: 'design',
    tasks: 'tasks',
    maestro: 'maestro',
    all: 'all',
  };
  return map[gate] ?? null;
}

export function registerApprove(program: Command): void {
  program
    .command('approve')
    .description('Approve a workflow gate (human gate — Kiro-style)')
    .argument(
      '<gate>',
      'Gate: brief, requirements, gap-analysis, design-hld, design-lld, tasks, maestro, or all',
    )
    .requiredOption('--spec <slug>', 'Spec slug or folder name')
    .action(async (gate: string, opts: { spec: string }) => {
      try {
        const root = await requireProjectRoot();
        const normalized = normalizeGate(gate);
        if (!normalized) {
          console.error(
            `Invalid gate: ${gate}. Use brief, requirements, gap-analysis, design-hld, design-lld, tasks, maestro, or all.`,
          );
          process.exit(1);
        }

        const meta = await approveGate(root, opts.spec, normalized);

        console.log(chalk.green(`✓ Approved: ${gate}`));
        console.log(chalk.dim(`  Phase: ${meta.phase}`));
        console.log(
          chalk.dim(
            `  ready_for_implementation: ${meta.ready_for_implementation ? 'true' : 'false'}`,
          ),
        );

        if (meta.ready_for_implementation) {
          console.log(`  Next: spec implement --spec ${opts.spec} --next`);
        } else if (normalized === 'brief') {
          console.log(`  Next: write/approve requirements, then spec gap-analysis --spec ${opts.spec}`);
        } else if (normalized === 'requirements' || normalized === 'all') {
          console.log(`  Next: spec gap-analysis --spec ${opts.spec}`);
        } else if (normalized === 'gap_analysis') {
          console.log(`  Next: spec design-hld --spec ${opts.spec}`);
        } else if (normalized === 'design_hld') {
          console.log(`  Next: spec design-lld --spec ${opts.spec}`);
        } else if (normalized === 'design_lld' || normalized === 'design') {
          console.log(`  Next: spec tasks --spec ${opts.spec}`);
        } else if (normalized === 'tasks') {
          console.log(`  Next: spec implement --spec ${opts.spec} --next`);
        }
      } catch (error) {
        handleError(error);
      }
    });
}
