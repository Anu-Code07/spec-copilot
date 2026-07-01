import { join } from 'node:path';
import {
  defaultProjectPaths,
  featureSpecPaths,
} from '../domain/paths.js';
import { fileExists, loadMeta, writeText } from '../infrastructure/files.js';
import { runReview, formatReviewReport, type ReviewReport } from '@specdrive/review-engine';
import { SpecDriveError } from './project-service.js';

export async function reviewSpec(
  projectRoot: string,
  slug: string,
  options: { taskId?: string; filePath?: string } = {},
): Promise<ReviewReport> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = featureSpecPaths(paths.specs, slug);

  if (!(await fileExists(specPaths.meta))) {
    throw new SpecDriveError(`Spec not found: ${slug}`, 'SPEC_NOT_FOUND');
  }

  const meta = await loadMeta(specPaths.meta);
  const report = await runReview(
    projectRoot,
    specPaths,
    meta,
    { specSlug: slug, taskId: options.taskId, filePath: options.filePath },
  );

  const reviewPath = join(
    paths.reviews,
    `${slug}-rev-${Date.now()}.md`,
  );
  await writeText(reviewPath, formatReviewReport(report));

  return report;
}
