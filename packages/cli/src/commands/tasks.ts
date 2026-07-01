import { Command } from 'commander';
import chalk from 'chalk';
import { generateTasks } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

import { ensureCliLlmReady } from '../llm-setup.js';

export function registerTasks(program: Command): void {
  program
    .command('tasks')
    .description('Generate tasks.md from approved design')
    .requiredOption('--spec <slug>', 'Spec slug')
    .option('--regenerate', 'Overwrite existing tasks.md')
    .option('--api-key <key>', 'Gemini API key for this session')
    .action(async (opts: { spec: string; regenerate?: boolean; apiKey?: string }) => {
      try {
        const root = await requireProjectRoot();
        await ensureCliLlmReady({ apiKey: opts.apiKey });
        await generateTasks(root, opts.spec, { regenerate: opts.regenerate });
        console.log(chalk.green('✓ Generated tasks.md'));
        console.log(`  Next: spec approve tasks --spec ${opts.spec}`);
      } catch (error) {
        handleError(error);
      }
    });
}
