import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initProject, createSpec, getImplementContext } from '../index.js';

describe('implement auto-figma', () => {
  let projectRoot: string;

  beforeEach(async () => {
    process.env.SPECDRIVE_LLM_OFFLINE = '1';
    projectRoot = await mkdtemp(join(tmpdir(), 'specdrive-auto-figma-'));
    await initProject(projectRoot, 'flutter');
  });

  afterEach(async () => {
    delete process.env.SPECDRIVE_LLM_OFFLINE;
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('skips Design2Code for logic tasks without throwing', async () => {
    const { slug } = await createSpec(projectRoot, {
      title: 'Profile Screen',
      quick: true,
    });

    await completeTasksUntil(projectRoot, slug, 'TASK-003');

    const result = await getImplementContext(projectRoot, {
      spec: slug,
      autoFigma: true,
    });

    expect(result.design2code?.taskKind).toBe('logic');
    expect(result.design2code?.skipped).toBe(true);
    expect(result.context.task.title.toLowerCase()).toContain('state');
  });

  it('skips UI auto-figma when Design2Code not installed', async () => {
    const { slug } = await createSpec(projectRoot, {
      title: 'Home Screen',
      quick: true,
    });

    const result = await getImplementContext(projectRoot, {
      spec: slug,
      autoFigma: true,
    });

    expect(result.design2code?.taskKind).toBe('ui');
    expect(result.design2code?.skipped).toBe(true);
    expect(result.design2code?.skipReason).toMatch(/not installed|FIGMA|Design AST/i);
  });
});

async function completeTasksUntil(
  projectRoot: string,
  slug: string,
  stopBeforeTaskId: string,
): Promise<void> {
  const { completeTask, getImplementContext } = await import('../index.js');

  for (let i = 0; i < 10; i++) {
    const result = await getImplementContext(projectRoot, { spec: slug });
    if (result.context.task.id === stopBeforeTaskId) return;
    await completeTask(projectRoot, slug, result.context.task.id);
  }
}
