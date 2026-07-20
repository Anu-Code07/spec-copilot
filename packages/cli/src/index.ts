import { Command } from 'commander';
import { SPECDRIVE_PACKAGE_VERSION, SPECDRIVE_VERSION } from '@specdrive/core';
import { registerInit } from './commands/init.js';
import { registerCreate } from './commands/create.js';
import { registerApprove } from './commands/approve.js';
import { registerDesign } from './commands/design.js';
import { registerTasks } from './commands/tasks.js';
import { registerImplement } from './commands/implement.js';
import { registerStatus } from './commands/status.js';
import { registerList } from './commands/list.js';
import { registerDoctor } from './commands/doctor.js';
import { registerReview } from './commands/review.js';
import { registerGapAnalysis } from './commands/gap-analysis.js';
import { registerFigma } from './commands/figma.js';

import { registerSetup } from './commands/setup.js';

export function run(argv: string[]): void {
  const program = new Command();

  program
    .name('spec')
    .description('SpecDrive — frontend spec-driven development for Flutter, Next.js, and React Native')
    .version(
      SPECDRIVE_PACKAGE_VERSION,
      '-V, --version',
      `npm package version (spec format ${SPECDRIVE_VERSION})`,
    );

  registerInit(program);
  registerCreate(program);
  registerApprove(program);
  registerDesign(program);
  registerGapAnalysis(program);
  registerFigma(program);
  registerTasks(program);
  registerImplement(program);
  registerStatus(program);
  registerList(program);
  registerDoctor(program);
  registerReview(program);
  registerSetup(program);

  program.parse(argv);
}

