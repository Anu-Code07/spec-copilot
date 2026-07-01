import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  initProject,
  createSpec,
  approveGate,
  generateGapAnalysis,
  generateDesign,
  generateTasks,
  getSpecStatus,
  getImplementContext,
  completeTask,
  listSpecs,
  SpecDriveError,
} from './index.js';

describe('SpecDrive workflow', () => {
  let projectRoot: string;

  beforeEach(async () => {
    process.env.SPECDRIVE_LLM_OFFLINE = '1';
    projectRoot = await mkdtemp(join(tmpdir(), 'specdrive-'));
    await initProject(projectRoot, 'flutter');
  });

  afterEach(async () => {
    delete process.env.SPECDRIVE_LLM_OFFLINE;
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('initializes project structure', async () => {
    const specs = await listSpecs(projectRoot);
    expect(specs).toHaveLength(0);
  });

  it('creates feature spec with requirements', async () => {
    const result = await createSpec(projectRoot, {
      title: 'Product Review Screen',
    });

    expect(result.slug).toBe('product-review-screen');
    expect(result.generated).toContain('requirements');

    const status = await getSpecStatus(projectRoot, result.slug);
    expect(status.meta.phase).toBe('requirements');
    expect(status.meta.gates.requirements.status).toBe('pending');
  });

  it('runs full gated workflow', async () => {
    const { slug } = await createSpec(projectRoot, {
      title: 'Dark Mode Toggle',
    });

    await approveGate(projectRoot, slug, 'requirements');
    await generateGapAnalysis(projectRoot, slug);
    await approveGate(projectRoot, slug, 'gap_analysis');
    await generateDesign(projectRoot, slug);
    await approveGate(projectRoot, slug, 'design');
    await generateTasks(projectRoot, slug);
    await approveGate(projectRoot, slug, 'tasks');

    const status = await getSpecStatus(projectRoot, slug);
    expect(status.meta.phase).toBe('implementing');
    expect(status.tasksTotal).toBeGreaterThan(0);
  });

  it('quick mode generates all documents', async () => {
    const { slug, generated } = await createSpec(projectRoot, {
      title: 'Settings Page',
      quick: true,
    });

    expect(generated).toEqual(
      expect.arrayContaining(['requirements', 'gap-analysis', 'design', 'tasks']),
    );
    const status = await getSpecStatus(projectRoot, slug);
    expect(status.meta.phase).toBe('implementing');
    expect(status.tasksTotal).toBe(6);
  });

  it('returns implement context for next task', async () => {
    const { slug } = await createSpec(projectRoot, {
      title: 'User Profile',
      quick: true,
    });

    const result = await getImplementContext(projectRoot, { spec: slug });
    expect(result.context.task.id).toBe('TASK-001');
    expect(result.context.designContent).toContain('# Design:');
  });

  it('marks task complete', async () => {
    const { slug } = await createSpec(projectRoot, {
      title: 'Notifications',
      quick: true,
    });

    await completeTask(projectRoot, slug, 'TASK-001');
    const result = await getImplementContext(projectRoot, { spec: slug });
    expect(result.context.task.id).not.toBe('TASK-001');
  });

  it('blocks design without gap analysis approval', async () => {
    const { slug } = await createSpec(projectRoot, { title: 'Checkout Flow' });

    await approveGate(projectRoot, slug, 'requirements');
    await expect(generateDesign(projectRoot, slug)).rejects.toThrow(SpecDriveError);
  });

  it('creates bugfix spec', async () => {
    const { slug, generated } = await createSpec(projectRoot, {
      title: 'Scroll crash',
      type: 'bugfix',
      description: 'App crashes when scrolling review list',
    });

    expect(generated).toContain('bugfix');
    const status = await getSpecStatus(projectRoot, slug);
    expect(status.meta.type).toBe('bugfix');
  });
});
