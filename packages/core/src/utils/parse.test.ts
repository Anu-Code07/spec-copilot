import { describe, it, expect } from 'vitest';
import {
  parseRequirements,
  parseTasks,
  countPendingTasks,
  nextPendingTask,
} from './parse.js';

describe('parseRequirements', () => {
  it('parses requirement headers and user stories', () => {
    const content = `### REQ-001: View reviews

**As a** shopper
**I want** to read product reviews
**So that** I can decide before buying

### REQ-002: Submit review

**As a** buyer
**I want** to post a rating
**So that** others benefit
`;
    const reqs = parseRequirements(content);
    expect(reqs).toHaveLength(2);
    expect(reqs[0]).toMatchObject({
      id: 'REQ-001',
      title: 'View reviews',
      role: 'shopper',
    });
  });
});

describe('parseTasks', () => {
  const sample = `# Tasks

## Wave 1

### TASK-001: Scaffold screen

- **Status:** pending
- **Requirements:** REQ-001
- **Design ref:** Screen Map
- **Depends on:** 
- **Files:** lib/features/review/
- **Acceptance:** Screen renders

### TASK-002: Wire state management

- **Status:** pending
- **Requirements:** REQ-002
- **Depends on:** TASK-001
`;

  it('parses task fields and wave', () => {
    const tasks = parseTasks(sample);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({
      id: 'TASK-001',
      title: 'Scaffold screen',
      wave: 1,
      requirements: ['REQ-001'],
    });
    expect(tasks[1].dependsOn).toEqual(['TASK-001']);
  });

  it('counts pending tasks', () => {
    const tasks = parseTasks(sample);
    expect(countPendingTasks(tasks)).toBe(2);
  });

  it('returns next task respecting dependencies', () => {
    const tasks = parseTasks(sample);
    expect(nextPendingTask(tasks)?.id).toBe('TASK-001');

    tasks[0]!.status = 'done';
    expect(nextPendingTask(tasks)?.id).toBe('TASK-002');
  });
});
