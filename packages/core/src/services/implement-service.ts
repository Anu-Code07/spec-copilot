import type { ImplementContext } from '../domain/types.js';
import { defaultProjectPaths, defaultSteeringPaths, featureSpecPaths } from '../domain/paths.js';
import { nextPendingTask, parseTasks } from '../utils/parse.js';
import {
  fileExists,
  loadMeta,
  readText,
} from '../infrastructure/files.js';
import { SpecDriveError } from './project-service.js';
import { resolveSpecSlug } from './spec-service.js';

export async function getImplementContext(
  projectRoot: string,
  options: { spec?: string; taskId?: string },
): Promise<ImplementContext> {
  const slug = await resolveSpecSlug(projectRoot, options.spec);
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = featureSpecPaths(paths.specs, slug);
  const steeringPaths = defaultSteeringPaths(paths.specdrive);

  if (!(await fileExists(specPaths.tasks))) {
    throw new SpecDriveError(
      'tasks.md not found. Run: spec tasks --spec ' + slug,
      'DOC_MISSING',
    );
  }

  const meta = await loadMeta(specPaths.meta);
  const tasksContent = await readText(specPaths.tasks);
  const tasks = parseTasks(tasksContent);

  let task = options.taskId
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

  return {
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
}

export function formatImplementContext(ctx: ImplementContext): string {
  const lines = [
    `# Implement: ${ctx.task.id} — ${ctx.task.title}`,
    '',
    `**Spec:** ${ctx.spec.title} (${ctx.spec.slug})`,
    `**Stack:** ${ctx.spec.stack}`,
    '',
  ];

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

  return lines.join('\n');
}
