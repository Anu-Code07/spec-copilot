import { Command } from 'commander';
import chalk from 'chalk';
import { generateGapAnalysis } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

import { ensureCliLlmReady } from '../llm-setup.js';

export function registerGapAnalysis(program: Command): void {
  program
    .command('gap-analysis')
    .description('Generate gap-analysis.md from approved requirements (uses free LLM in CLI mode)')
    .requiredOption('--spec <slug>', 'Spec slug')
    .option('--regenerate', 'Overwrite existing gap-analysis.md')
    .option('--api-key <key>', 'Gemini API key for this session')
    .action(async (opts: { spec: string; regenerate?: boolean; apiKey?: string }) => {
      try {
        const root = await requireProjectRoot();
        await ensureCliLlmReady({ apiKey: opts.apiKey });
        await generateGapAnalysis(root, opts.spec, { regenerate: opts.regenerate });
        console.log(chalk.green('✓ Generated gap-analysis.md'));
        console.log(`  Next: spec approve gap-analysis --spec ${opts.spec}`);
      } catch (error) {
        handleError(error);
      }
    });
}
