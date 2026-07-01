import { describe, it, expect } from 'vitest';
import { runReview, formatReviewReport } from './review.js';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('review-engine', () => {
  it('passes when design and requirements exist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'review-'));
    const specDir = join(root, '.specdrive', 'specs', 'test-feature');
    await mkdir(specDir, { recursive: true });

    await writeFile(
      join(specDir, 'requirements.md'),
      '### REQ-001: View feature\n\n**As a** user\n',
    );
    await writeFile(
      join(specDir, 'design.md'),
      '# Design\n\n## Accessibility\n\nLabels required.\n\n## Requirement Traceability\n| REQ-001 | Screen |\n',
    );
    await writeFile(
      join(specDir, 'tasks.md'),
      '### TASK-001: Build screen\n\n- **Status:** pending\n',
    );

    const report = await runReview(
      root,
      {
        dir: specDir,
        requirements: join(specDir, 'requirements.md'),
        design: join(specDir, 'design.md'),
        tasks: join(specDir, 'tasks.md'),
      },
      { slug: 'test-feature', title: 'Test', requirements: ['REQ-001'] },
    );

    expect(report.findings.length).toBeGreaterThan(0);
    expect(formatReviewReport(report)).toContain('Review:');

    await rm(root, { recursive: true, force: true });
  });
});
