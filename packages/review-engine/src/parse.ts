export interface ParsedRequirement {
  id: string;
  title: string;
}

export interface ParsedTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'done';
}

const REQ_HEADER = /^### (REQ-\d{3}): (.+)$/gm;
const TASK_HEADER = /^### (TASK-\d{3}): (.+)$/gm;
const TASK_STATUS = /^- \*\*Status:\*\* (\w+)/m;

export function parseRequirements(content: string): ParsedRequirement[] {
  return [...content.matchAll(REQ_HEADER)].map((m) => ({
    id: m[1],
    title: m[2].trim(),
  }));
}

export function parseTasks(content: string): ParsedTask[] {
  const headers = [...content.matchAll(TASK_HEADER)];
  const tasks: ParsedTask[] = [];
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index ?? 0;
    const end = headers[i + 1]?.index ?? content.length;
    const block = content.slice(start, end);
    const statusMatch = block.match(TASK_STATUS);
    const statusRaw = statusMatch?.[1] ?? 'pending';
    const status =
      statusRaw === 'done' || statusRaw === 'in_progress' ? statusRaw : 'pending';
    tasks.push({
      id: headers[i][1],
      title: headers[i][2].trim(),
      status,
    });
  }
  return tasks;
}
