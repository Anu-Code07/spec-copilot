import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ImplementContext } from '../domain/types.js';
import { defaultProjectPaths, defaultSteeringPaths, featureSpecPaths } from '../domain/paths.js';
import { nextPendingTask, parseTasks } from '../utils/parse.js';
import {
  fileExists,
  loadMeta,
  readText,
} from '../infrastructure/files.js';
import {
  classifyTaskForDesign2Code,
  isDesign2CodeAvailable,
  resolveFigmaToken,
  resolveSpecFigmaFileKey,
  tryExecuteUiTaskWithDesign2Code,
  type Design2CodeTaskAttempt,
} from '../integrations/design2code-service.js';
import {
  formatWorkflowStepsMarkdown,
  stepsAfterGetNextTask,
  type WorkflowStep,
} from '../workflow/guidance.js';
import { SpecDriveError } from './project-service.js';
import { resolveSpecSlug } from './spec-service.js';

export type FigmaAction = 'prompt' | 'use' | 'skip';

export interface FigmaPrompt {
  needed: true;
  message: string;
  taskKind: 'ui' | 'unknown';
  options: Array<'provide_token' | 'skip'>;
  hint: string;
}

export interface ImplementResult {
  context: ImplementContext;
  design2code?: Design2CodeTaskAttempt;
  figmaPrompt?: FigmaPrompt;
  nextSteps: WorkflowStep[];
}

export async function getImplementContext(
  projectRoot: string,
  options: {
    spec?: string;
    taskId?: string;
    autoFigma?: boolean;
    figmaFileKey?: string;
    figmaToken?: string;
    figmaAction?: FigmaAction;
    surface?: 'mcp' | 'cli';
  },
): Promise<ImplementResult> {
  const slug = await resolveSpecSlug(projectRoot, options.spec);
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = featureSpecPaths(paths.specs, slug);
  const steeringPaths = defaultSteeringPaths(paths.specdrive);

  if (!(await fileExists(specPaths.tasks))) {
    throw new SpecDriveError(
      'tasks.md not found. MCP: call generate_tasks then write_spec_document. CLI: spec tasks --spec ' + slug,
      'DOC_MISSING',
    );
  }

  const meta = await loadMeta(specPaths.meta);
  const tasksContent = await readText(specPaths.tasks);
  const tasks = parseTasks(tasksContent);

  const task = options.taskId
    ? tasks.find((t) => t.id === options.taskId)
    : nextPendingTask(tasks);

  if (!task) {
    throw new SpecDriveError('No pending tasks available', 'NO_PENDING_TASKS');
  }

  if (task.status === 'done') {
    throw new SpecDriveError(`Task already complete: ${task.id}`, 'TASK_DONE');
  }

  const steering: ImplementContext['steering'] = {};
  for (const [key, filePath] of Object.entries(steeringPaths)) {
    if (await fileExists(filePath)) {
      steering[key as keyof ImplementContext['steering']] = await readText(filePath);
    }
  }

  const context: ImplementContext = {
    spec: meta,
    task,
    requirementsContent: (await fileExists(specPaths.requirements))
      ? await readText(specPaths.requirements)
      : '',
    designContent: (await fileExists(specPaths.design))
      ? await readText(specPaths.design)
      : '',
    steering,
  };

  const surface = options.surface ?? 'cli';
  const taskKind = classifyTaskForDesign2Code(task);
  const figmaAction = options.figmaAction ?? 'prompt';
  const autoFigma = options.autoFigma !== false;

  if (!autoFigma || figmaAction === 'skip' || taskKind === 'logic') {
    const nextSteps = stepsAfterGetNextTask({
      slug: context.spec.slug,
      taskId: context.task.id,
      surface,
      design2codeSkipped: taskKind === 'logic',
      skipReason:
        taskKind === 'logic'
          ? 'Logic/state/navigation task — host AI implements using spec context'
          : 'Figma auto-generation skipped by user',
    });
    return { context, nextSteps };
  }

  if (taskKind === 'ui' || taskKind === 'unknown') {
    const needsPrompt = await shouldPromptForFigma(projectRoot, options);
    if (needsPrompt && figmaAction === 'prompt' && !options.figmaToken) {
      const nextSteps = stepsAfterGetNextTask({
        slug: context.spec.slug,
        taskId: context.task.id,
        surface,
        figmaPromptNeeded: true,
      });
      return {
        context,
        figmaPrompt: {
          needed: true,
          taskKind: taskKind === 'ui' ? 'ui' : 'unknown',
          message:
            'This task looks like UI work. Design2Code can scaffold widgets/screens from Figma. Provide a Figma Personal Access Token (figd_...) or skip to implement with your host AI.',
          options: ['provide_token', 'skip'],
          hint: 'Get token: https://www.figma.com/settings → Personal access tokens',
        },
        nextSteps,
      };
    }
  }

  const design2code = await tryExecuteUiTaskWithDesign2Code(
    projectRoot,
    task,
    meta.stack,
    {
      figmaFileKey: options.figmaFileKey,
      figmaToken: options.figmaToken,
      mergeStrategy: 'merge',
    },
  );

  const nextSteps = stepsAfterGetNextTask({
    slug: context.spec.slug,
    taskId: context.task.id,
    surface,
    design2codeSkipped: design2code.skipped,
    skipReason: design2code.skipReason,
  });

  return { context, design2code, nextSteps };
}

async function shouldPromptForFigma(
  projectRoot: string,
  options: { figmaFileKey?: string; figmaToken?: string },
): Promise<boolean> {
  if (options.figmaToken) return false;
  if (!(await isDesign2CodeAvailable())) return false;

  const token = await resolveFigmaToken();
  if (token) return false;

  const fileKey = await resolveSpecFigmaFileKey(projectRoot, options.figmaFileKey);
  const astPath = join(projectRoot, '.design2code', 'design-ast.json');
  if (fileKey || existsSync(astPath)) return false;

  return true;
}

export function formatImplementContext(result: ImplementResult | ImplementContext): string {
  const ctx = 'context' in result ? result.context : result;
  const design2code = 'context' in result ? result.design2code : undefined;
  const figmaPrompt = 'context' in result ? result.figmaPrompt : undefined;
  const nextSteps = 'context' in result ? result.nextSteps : undefined;

  const lines = [
    `# Implement: ${ctx.task.id} — ${ctx.task.title}`,
    '',
    `**Spec:** ${ctx.spec.title} (${ctx.spec.slug})`,
    `**Stack:** ${ctx.spec.stack}`,
    '',
  ];

  if (figmaPrompt) {
    lines.push('## Figma / Design2Code — user input needed', '');
    lines.push(figmaPrompt.message);
    lines.push('');
    lines.push(`**Options:** ${figmaPrompt.options.join(' | ')}`);
    lines.push(`**Hint:** ${figmaPrompt.hint}`);
    lines.push('');
    lines.push('MCP: retry `get_next_task` with `figmaToken` + `figmaAction: "use"`, or `figmaAction: "skip"`.');
    lines.push('CLI: retry with `--figma-token <token>` or omit `--auto-figma`.');
    lines.push('');
  }

  if (design2code) {
    lines.push('## Design2Code (auto-figma)', '');
    lines.push(`- **Task kind:** ${design2code.taskKind}`);
    if (design2code.skipped) {
      lines.push(`- **Skipped:** ${design2code.skipReason ?? 'yes'}`);
    } else if (design2code.result) {
      lines.push(`- **Generated:** ${design2code.result.filesGenerated} UI files (${design2code.scope})`);
      if (design2code.result.merge) {
        lines.push(`- **Merged:** +${design2code.result.merge.created.length} created, ~${design2code.result.merge.updated.length} updated`);
      }
      lines.push('');
      lines.push('Design2Code handled UI only. You still implement state, navigation, validation, and tests if this task requires them.');
    }
    lines.push('');
  }

  if (ctx.task.requirements.length) {
    lines.push('## Requirements', ctx.task.requirements.join(', '), '');
  }
  if (ctx.task.designRef) {
    lines.push('## Design Reference', ctx.task.designRef, '');
  }
  if (ctx.task.files) {
    lines.push('## Files', ctx.task.files, '');
  }
  if (ctx.task.acceptance) {
    lines.push('## Acceptance', ctx.task.acceptance, '');
  }
  if (ctx.task.dependsOn.length) {
    lines.push('## Depends On', ctx.task.dependsOn.join(', '), '');
  }

  lines.push('## design.md (excerpt)', '```markdown', ctx.designContent.slice(0, 2000), '```', '');

  if (ctx.requirementsContent) {
    lines.push('## requirements.md (excerpt)', '```markdown', ctx.requirementsContent.slice(0, 1500), '```');
  }

  if (nextSteps?.length) {
    lines.push(formatWorkflowStepsMarkdown(nextSteps));
  }

  return lines.join('\n');
}
