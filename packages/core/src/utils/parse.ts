import type { ParsedRequirement, ParsedTask } from '../domain/types.js';

const REQ_HEADER = /^### (REQ-\d{3}): (.+)$/gm;
const USER_STORY = /\*\*As a\*\* (.+)\s+\*\*I want\*\* (.+)\s+\*\*So that\*\* (.+)/s;

export function parseRequirements(content: string): ParsedRequirement[] {
  const requirements: ParsedRequirement[] = [];
  const headers = [...content.matchAll(REQ_HEADER)];

  for (let i = 0; i < headers.length; i++) {
    const match = headers[i];
    const start = match.index ?? 0;
    const end = headers[i + 1]?.index ?? content.length;
    const block = content.slice(start, end);
    const story = block.match(USER_STORY);

    requirements.push({
      id: match[1],
      title: match[2].trim(),
      role: story?.[1]?.trim(),
      action: story?.[2]?.trim(),
      benefit: story?.[3]?.trim(),
    });
  }

  return requirements;
}

const TASK_HEADER = /^### (TASK-\d{3}): (.+)$/gm;
const TASK_FIELD = /^- \*\*(Status|Requirements|Design ref|Depends on|Files|Acceptance):\*\* (.+)$/gm;

export function parseTasks(content: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  const headers = [...content.matchAll(TASK_HEADER)];
  let wave = 1;

  for (let i = 0; i < headers.length; i++) {
    const match = headers[i];
    const start = match.index ?? 0;
    const end = headers[i + 1]?.index ?? content.length;
    const block = content.slice(start, end);

    if (block.includes('## Wave')) {
      const waveMatch = block.match(/## Wave (\d+)/);
      if (waveMatch) wave = Number(waveMatch[1]);
    }

    const fields = Object.fromEntries(
      [...block.matchAll(TASK_FIELD)].map((m) => [m[1], m[2].trim()]),
    );

    const statusRaw = fields['Status'] ?? 'pending';
    const status =
      statusRaw === 'done' || statusRaw === 'in_progress' ? statusRaw : 'pending';

    tasks.push({
      id: match[1],
      title: match[2].trim(),
      status,
      requirements: fields['Requirements']
        ? fields['Requirements'].split(',').map((r) => r.trim())
        : [],
      designRef: fields['Design ref'],
      dependsOn: fields['Depends on']
        ? fields['Depends on'].split(',').map((d) => d.trim())
        : [],
      wave,
      files: fields['Files'],
      acceptance: fields['Acceptance'],
    });
  }

  return tasks;
}

export function countPendingTasks(tasks: ParsedTask[]): number {
  return tasks.filter((t) => t.status === 'pending').length;
}

export function nextPendingTask(tasks: ParsedTask[]): ParsedTask | null {
  const sorted = [...tasks].sort((a, b) => {
    if (a.wave !== b.wave) return a.wave - b.wave;
    return a.id.localeCompare(b.id);
  });

  for (const task of sorted) {
    if (task.status !== 'pending') continue;
    const depsDone = task.dependsOn.every((depId) => {
      const dep = tasks.find((t) => t.id === depId);
      return dep?.status === 'done';
    });
    if (depsDone) return task;
  }

  return null;
}
