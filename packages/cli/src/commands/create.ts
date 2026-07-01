import { Command } from 'commander';
import chalk from 'chalk';
import { createSpec } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';
import { ensureCliLlmReady } from '../llm-setup.js';

export function registerCreate(program: Command): void {
  program
    .command('create')
    .description('Create a new feature or bugfix spec')
    .argument('<title>', 'Feature or bug title')
    .option('--quick', 'Generate requirements, design, and tasks without gates')
    .option('--design-first', 'Design-first workflow (future: starts from UI concept)')
    .option('--type <type>', 'Spec type: feature or bugfix', 'feature')
    .option('-d, --description <text>', 'Detailed description')
    .option('--api-key <key>', 'Gemini API key for this session (or add to ~/.zshrc)')
    .action(
      async (
        title: string,
        opts: {
          quick?: boolean;
          designFirst?: boolean;
          type: string;
          description?: string;
          apiKey?: string;
        },
      ) => {
        try {
          const root = await requireProjectRoot();
          await ensureCliLlmReady({ apiKey: opts.apiKey });
          const result = await createSpec(root, {
            title,
            description: opts.description,
            type: opts.type as 'feature' | 'bugfix',
            quick: opts.quick,
            designFirst: opts.designFirst,
          });

          console.log(chalk.green(`✓ Created spec: ${result.slug}`));
          console.log(chalk.dim(`  ID: ${result.id}`));
          console.log(chalk.dim(`  Generated: ${result.generated.join(', ')}`));
          console.log(chalk.dim(`  Path: ${result.paths.dir}`));

          if (!opts.quick && opts.type !== 'bugfix') {
            console.log('');
            console.log('Next steps:');
            console.log(`  spec approve requirements --spec ${result.slug}`);
            console.log(`  spec gap-analysis --spec ${result.slug}`);
            console.log(`  spec approve gap-analysis --spec ${result.slug}`);
            console.log(`  spec design --spec ${result.slug}`);
          } else if (opts.quick) {
            console.log('');
            console.log(`  spec implement --spec ${result.slug} --next`);
          }
        } catch (error) {
          handleError(error);
        }
      },
    );
}
