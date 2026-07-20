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

  it('initializes project structure with steering/', async () => {
    const specs = await listSpecs(projectRoot);
    expect(specs).toHaveLength(0);
    const { fileExists } = await import('./infrastructure/files.js');
    expect(await fileExists(join(projectRoot, '.specdrive/steering/structure.md'))).toBe(true);
    expect(await fileExists(join(projectRoot, '.specdrive/specs/features'))).toBe(true);
  });

  it('creates feature spec under features/YYYY-MM-DD-slug with spec.json', async () => {
    const result = await createSpec(projectRoot, {
      title: 'Product Review Screen',
    });

    expect(result.slug).toBe('product-review-screen');
    expect(result.folderName).toMatch(/^\d{4}-\d{2}-\d{2}-product-review-screen$/);
    expect(result.generated).toContain('requirements');
    expect(result.paths.specJson).toContain('/features/');
    expect(result.paths.specJson.endsWith('spec.json')).toBe(true);

    const status = await getSpecStatus(projectRoot, result.folderName);
    expect(status.meta.phase).toBe('requirements');
    expect(status.meta.gates.requirements.status).toBe('pending');
    expect(status.meta.ready_for_implementation).toBe(false);
  });

  it('runs full gated workflow with HLD+LLD', async () => {
    const { folderName } = await createSpec(projectRoot, {
      title: 'Dark Mode Toggle',
    });

    await approveGate(projectRoot, folderName, 'requirements');
    await generateGapAnalysis(projectRoot, folderName);
    await approveGate(projectRoot, folderName, 'gap_analysis');
    await generateDesign(projectRoot, folderName);
    await approveGate(projectRoot, folderName, 'design_hld');
    await approveGate(projectRoot, folderName, 'design_lld');
    await generateTasks(projectRoot, folderName);
    await approveGate(projectRoot, folderName, 'tasks');

    const status = await getSpecStatus(projectRoot, folderName);
    expect(status.meta.phase).toBe('implementing');
    expect(status.meta.ready_for_implementation).toBe(true);
    expect(status.tasksTotal).toBeGreaterThan(0);
  });

  it('quick mode generates all documents and unlocks impl', async () => {
    const { folderName, generated } = await createSpec(projectRoot, {
      title: 'Settings Page',
      quick: true,
    });

    expect(generated).toEqual(
      expect.arrayContaining(['requirements', 'gap-analysis', 'design-hld', 'design-lld', 'tasks']),
    );
    const status = await getSpecStatus(projectRoot, folderName);
    expect(status.meta.phase).toBe('implementing');
    expect(status.meta.ready_for_implementation).toBe(true);
    expect(status.tasksTotal).toBe(6);
  });

  it('returns implement context for next task', async () => {
    const { folderName } = await createSpec(projectRoot, {
      title: 'User Profile',
      quick: true,
    });

    const result = await getImplementContext(projectRoot, { spec: folderName });
    expect(result.context.task.id).toBe('TASK-001');
    expect(result.context.designContent.length).toBeGreaterThan(0);
  });

  it('marks task complete', async () => {
    const { folderName } = await createSpec(projectRoot, {
      title: 'Notifications',
      quick: true,
    });

    await completeTask(projectRoot, folderName, 'TASK-001');
    const result = await getImplementContext(projectRoot, { spec: folderName });
    expect(result.context.task.id).not.toBe('TASK-001');
  });

  it('blocks design without gap analysis approval', async () => {
    const { folderName } = await createSpec(projectRoot, { title: 'Checkout Flow' });

    await approveGate(projectRoot, folderName, 'requirements');
    await expect(generateDesign(projectRoot, folderName)).rejects.toThrow(SpecDriveError);
  });

  it('creates bugfix spec', async () => {
    const { folderName, generated } = await createSpec(projectRoot, {
      title: 'Scroll crash',
      type: 'bugfix',
      description: 'App crashes when scrolling review list',
    });

    expect(generated).toContain('bugfix');
    const status = await getSpecStatus(projectRoot, folderName);
    expect(status.meta.phase).toBe('implementing');
  });

  it('accepts optional ticket in folder name', async () => {
    const { folderName } = await createSpec(projectRoot, {
      title: 'Cart Button',
      ticket: 'FRONT-3092',
    });
    expect(folderName).toMatch(/FRONT-3092-cart-button$/);
  });
});
