import { Command } from 'commander';
import chalk from 'chalk';
import { createSpec } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';
import { ensureCliLlmReady } from '../llm-setup.js';

export function registerCreate(program: Command): void {
  program
    .command('create')
    .description('Create a new feature or bugfix spec (Kiro-style dated folder)')
    .argument('<title>', 'Feature or bug title')
    .option('--quick', 'Generate requirements, design, and tasks without gates')
    .option('--design-first', 'Design-first workflow (future: starts from UI concept)')
    .option('--type <type>', 'Spec type: feature, bugfix, or tech-debt', 'feature')
    .option('--ticket <id>', 'Optional ticket id for folder name (e.g. FRONT-3092)')
    .option('-d, --description <text>', 'Detailed description')
    .option('--api-key <key>', 'Gemini API key for this session (or add to ~/.zshrc)')
    .action(
      async (
        title: string,
        opts: {
          quick?: boolean;
          designFirst?: boolean;
          type: string;
          ticket?: string;
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
            type: opts.type as 'feature' | 'bugfix' | 'tech-debt',
            ticket: opts.ticket,
            quick: opts.quick,
            designFirst: opts.designFirst,
          });

          console.log(chalk.green(`✓ Created spec: ${result.folderName}`));
          console.log(chalk.dim(`  ID: ${result.id}`));
          console.log(chalk.dim(`  Slug: ${result.slug}`));
          console.log(chalk.dim(`  Generated: ${result.generated.join(', ') || '(scaffold only)'}`));
          console.log(chalk.dim(`  Path: ${result.paths.dir}`));

          if (!opts.quick && opts.type !== 'bugfix') {
            console.log('');
            console.log('YOUR JOURNEY (approve each gate):');
            console.log(`  spec approve requirements --spec ${result.folderName}`);
            console.log(`  spec gap-analysis --spec ${result.folderName}`);
            console.log(`  spec approve gap-analysis --spec ${result.folderName}`);
            console.log(`  spec design-hld --spec ${result.folderName}`);
            console.log(`  spec approve design-hld --spec ${result.folderName}`);
            console.log(`  spec design-lld --spec ${result.folderName}`);
            console.log(`  spec approve design-lld --spec ${result.folderName}`);
            console.log(`  spec tasks --spec ${result.folderName}`);
            console.log(`  spec approve tasks --spec ${result.folderName}`);
          } else if (opts.quick) {
            console.log('');
            console.log(`  spec implement --spec ${result.folderName} --next`);
          }
        } catch (error) {
          handleError(error);
        }
      },
    );
}
