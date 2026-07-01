import { Command } from 'commander';
import chalk from 'chalk';
import {
  importFigmaDesign,
  generateFromDesign,
  generateFigmaForSpec,
  getFigmaIntegrationStatus,
  resolveSpecSlug,
  type Design2CodeFramework,
  type Design2CodeScope,
  type Design2CodeMergeStrategy,
} from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

export function registerFigma(program: Command): void {
  const figma = program
    .command('figma')
    .description('Figma → code via Design2Code (figma-to-code integration)');

  figma
    .command('status')
    .description('Check Design2Code install, FIGMA_TOKEN, and saved Design AST')
    .action(async () => {
      try {
        const root = await requireProjectRoot();
        const status = await getFigmaIntegrationStatus(root);
        console.log(JSON.stringify(status, null, 2));
        if (!status.design2codeInstalled) {
          console.log(chalk.yellow('\nDesign2Code packages not linked — see docs/mcp.html#figma'));
        }
      } catch (error) {
        handleError(error);
      }
    });

  figma
    .command('import')
    .description('Import Figma file to .design2code/design-ast.json')
    .requiredOption('--file <key>', 'Figma file key or URL')
    .option('--token <token>', 'Figma token (or set FIGMA_TOKEN)')
    .option('--output <dir>', 'Output directory', '.design2code')
    .action(async (opts: { file: string; token?: string; output: string }) => {
      try {
        const root = await requireProjectRoot();
        const result = await importFigmaDesign(root, {
          fileKey: opts.file,
          figmaToken: opts.token,
          outputDir: opts.output,
        });
        console.log(chalk.green(`✓ Imported "${result.name}"`));
        console.log(chalk.dim(`  ${result.components} components, ${result.screens} screens`));
        console.log(chalk.dim(`  Saved: ${result.outputPath}`));
      } catch (error) {
        handleError(error);
      }
    });

  figma
    .command('generate')
    .description('Generate code from Figma or saved Design AST')
    .option('--framework <fw>', 'flutter|nextjs|react-native|react')
    .option('--scope <scope>', 'component|screen|feature|project', 'screen')
    .option('--file <key>', 'Figma file key or URL')
    .option('--token <token>', 'Figma token')
    .option('--ast <path>', 'Path to design-ast.json')
    .option('--merge', 'Merge into project')
    .option('--preview', 'Preview only (no writes)')
    .option('--replace', 'Replace existing files')
    .option('--tests', 'Include tests')
    .action(
      async (opts: {
        framework?: Design2CodeFramework;
        scope: Design2CodeScope;
        file?: string;
        token?: string;
        ast?: string;
        merge?: boolean;
        preview?: boolean;
        replace?: boolean;
        tests?: boolean;
      }) => {
        try {
          const root = await requireProjectRoot();
          const mergeStrategy: Design2CodeMergeStrategy = opts.preview
            ? 'preview'
            : opts.replace
              ? 'replace'
              : opts.merge
                ? 'merge'
                : 'create';

          const result = await generateFromDesign(root, {
            framework: opts.framework ?? 'react',
            scope: opts.scope,
            figmaFileKey: opts.file,
            figmaToken: opts.token,
            astPath: opts.ast,
            mergeStrategy,
            includeTests: opts.tests,
          });

          console.log(
            chalk.green(
              `✓ Generated ${result.filesGenerated} files (${result.framework}/${result.scope})`,
            ),
          );
          if (result.merge) {
            console.log(chalk.dim(`  created: ${result.merge.created.length}`));
            console.log(chalk.dim(`  updated: ${result.merge.updated.length}`));
          }
        } catch (error) {
          handleError(error);
        }
      },
    );

  figma
    .command('generate-for-spec')
    .description('Generate UI code for a spec using project stack + Figma')
    .requiredOption('--spec <slug>', 'Spec slug')
    .option('--file <key>', 'Figma file key or URL')
    .option('--token <token>', 'Figma token')
    .option('--scope <scope>', 'component|screen|feature|project')
    .option('--merge', 'Merge into project', true)
    .option('--preview', 'Preview only')
    .option('--tests', 'Include tests')
    .action(
      async (opts: {
        spec: string;
        file?: string;
        token?: string;
        scope?: Design2CodeScope;
        merge?: boolean;
        preview?: boolean;
        tests?: boolean;
      }) => {
        try {
          const root = await requireProjectRoot();
          const slug = await resolveSpecSlug(root, opts.spec);
          const mergeStrategy: Design2CodeMergeStrategy = opts.preview ? 'preview' : 'merge';

          const result = await generateFigmaForSpec(root, slug, {
            figmaFileKey: opts.file,
            figmaToken: opts.token,
            scope: opts.scope,
            mergeStrategy,
            includeTests: opts.tests,
          });

          console.log(
            chalk.green(
              `✓ ${result.spec.title}: ${result.filesGenerated} files (${result.framework}/${result.scope})`,
            ),
          );
        } catch (error) {
          handleError(error);
        }
      },
    );
}
