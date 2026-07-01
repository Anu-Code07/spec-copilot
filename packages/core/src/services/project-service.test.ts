import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initProject, doctorProject, SpecDriveError } from './project-service.js';

describe('project-service', () => {
  let projectRoot: string;

  beforeEach(async () => {
    process.env.SPECDRIVE_LLM_OFFLINE = '1';
    projectRoot = await mkdtemp(join(tmpdir(), 'specdrive-doctor-'));
  });

  afterEach(async () => {
    delete process.env.SPECDRIVE_LLM_OFFLINE;
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('reports missing init on doctor', async () => {
    const issues = await doctorProject(projectRoot);
    expect(issues.some((i) => i.level === 'error')).toBe(true);
  });

  it('reports healthy after init', async () => {
    await initProject(projectRoot, 'nextjs');
    const issues = await doctorProject(projectRoot);
    expect(issues.some((i) => i.message.includes('healthy'))).toBe(true);
  });

  it('throws when already initialized', async () => {
    await initProject(projectRoot, 'flutter');
    await expect(initProject(projectRoot, 'flutter')).rejects.toThrow(SpecDriveError);
  });
});
