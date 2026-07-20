import { Command } from 'commander';
import chalk from 'chalk';
import { generateDesign, generateDesignHld, generateDesignLld } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';
import { ensureCliLlmReady } from '../llm-setup.js';

export function registerDesign(program: Command): void {
  program
    .command('design')
    .description('Generate design-hld.md + design-lld.md from approved gap-analysis')
    .requiredOption('--spec <slug>', 'Spec slug or folder name')
    .option('--regenerate', 'Overwrite existing design docs')
    .option('--api-key <key>', 'Gemini API key for this session')
    .action(async (opts: { spec: string; regenerate?: boolean; apiKey?: string }) => {
      try {
        const root = await requireProjectRoot();
        await ensureCliLlmReady({ apiKey: opts.apiKey });
        await generateDesign(root, opts.spec, { regenerate: opts.regenerate });
        console.log(chalk.green('✓ Generated design-hld.md + design-lld.md'));
        console.log(`  Next: spec approve design-hld --spec ${opts.spec}`);
        console.log(`        then: spec approve design-lld --spec ${opts.spec}`);
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command('design-hld')
    .description('Generate design-hld.md (architecture / flows)')
    .requiredOption('--spec <slug>', 'Spec slug or folder name')
    .option('--regenerate', 'Overwrite existing design-hld.md')
    .option('--api-key <key>', 'Gemini API key for this session')
    .action(async (opts: { spec: string; regenerate?: boolean; apiKey?: string }) => {
      try {
        const root = await requireProjectRoot();
        await ensureCliLlmReady({ apiKey: opts.apiKey });
        await generateDesignHld(root, opts.spec, { regenerate: opts.regenerate });
        console.log(chalk.green('✓ Generated design-hld.md'));
        console.log(`  Next: spec approve design-hld --spec ${opts.spec}`);
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command('design-lld')
    .description('Generate design-lld.md (classes / files / contracts)')
    .requiredOption('--spec <slug>', 'Spec slug or folder name')
    .option('--regenerate', 'Overwrite existing design-lld.md')
    .option('--api-key <key>', 'Gemini API key for this session')
    .action(async (opts: { spec: string; regenerate?: boolean; apiKey?: string }) => {
      try {
        const root = await requireProjectRoot();
        await ensureCliLlmReady({ apiKey: opts.apiKey });
        await generateDesignLld(root, opts.spec, { regenerate: opts.regenerate });
        console.log(chalk.green('✓ Generated design-lld.md'));
        console.log(`  Next: spec approve design-lld --spec ${opts.spec}`);
      } catch (error) {
        handleError(error);
      }
    });
}
