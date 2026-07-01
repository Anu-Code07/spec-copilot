import { Command } from 'commander';
import chalk from 'chalk';
import { generateDesign } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

import { ensureCliLlmReady } from '../llm-setup.js';

export function registerDesign(program: Command): void {
  program
    .command('design')
    .description('Generate design.md from approved gap-analysis')
    .requiredOption('--spec <slug>', 'Spec slug')
    .option('--regenerate', 'Overwrite existing design.md')
    .option('--api-key <key>', 'Gemini API key for this session')
    .action(async (opts: { spec: string; regenerate?: boolean; apiKey?: string }) => {
      try {
        const root = await requireProjectRoot();
        await ensureCliLlmReady({ apiKey: opts.apiKey });
        await generateDesign(root, opts.spec, { regenerate: opts.regenerate });
        console.log(chalk.green('✓ Generated design.md'));
        console.log(`  Next: spec approve design --spec ${opts.spec}`);
      } catch (error) {
        handleError(error);
      }
    });
}
