import { join } from 'node:path';
import { defaultProjectPaths } from '../domain/paths.js';
import { fileExists, loadMeta, writeText, resolveFeaturePaths } from '../infrastructure/files.js';
import { runReview, formatReviewReport, type ReviewReport } from '@specdrive/review-engine';
import { SpecDriveError } from './project-service.js';

export async function reviewSpec(
  projectRoot: string,
  slug: string,
  options: { taskId?: string; filePath?: string } = {},
): Promise<ReviewReport> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, slug);

  if (!(await fileExists(specPaths.specJson)) && !(await fileExists(`${specPaths.dir}/meta.yaml`))) {
    throw new SpecDriveError(`Spec not found: ${slug}`, 'SPEC_NOT_FOUND');
  }

  const meta = await loadMeta(
    (await fileExists(specPaths.specJson)) ? specPaths.specJson : `${specPaths.dir}/meta.yaml`,
  );
  const report = await runReview(projectRoot, specPaths, meta, {
    specSlug: meta.folderName ?? slug,
    taskId: options.taskId,
    filePath: options.filePath,
  });

  const reviewPath = join(paths.reviews, `${meta.slug}-rev-${Date.now()}.md`);
  await writeText(reviewPath, formatReviewReport(report));

  return report;
}
