import { Command } from 'commander';
import chalk from 'chalk';
import { doctorProject } from '@specdrive/core';
import { handleError, requireProjectRoot } from '../context.js';

export function registerDoctor(program: Command): void {
  program
    .command('doctor')
    .description('Validate SpecDrive project setup')
    .action(async () => {
      try {
        const root = await requireProjectRoot();
        const issues = await doctorProject(root);

        for (const issue of issues) {
          const icon =
            issue.level === 'error'
              ? chalk.red('✗')
              : issue.level === 'warning'
                ? chalk.yellow('!')
                : chalk.green('✓');
          console.log(`${icon} ${issue.message}`);
        }

        const hasError = issues.some((i) => i.level === 'error');
        if (hasError) process.exit(1);
      } catch (error) {
        handleError(error);
      }
    });
}
