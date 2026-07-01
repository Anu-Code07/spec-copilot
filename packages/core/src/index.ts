// Domain
export * from './domain/types.js';
export * from './domain/paths.js';

// Utils
export * from './utils/format.js';
export * from './utils/parse.js';

// Infrastructure
export {
  fileExists,
  readText,
  writeText,
  findProjectRoot,
  loadConfig,
  loadMeta,
  saveMeta,
  listSpecSlugs,
  nextSpecId,
} from './infrastructure/files.js';

// Services
export { initProject, doctorProject, SpecDriveError } from './services/project-service.js';
export type { DoctorIssue } from './services/project-service.js';

export {
  createSpec,
  approveGate,
  generateDesign,
  generateTasks,
  listSpecs,
  getSpecStatus,
  completeTask,
  resolveSpecSlug,
} from './services/spec-service.js';

export {
  getImplementContext,
  formatImplementContext,
} from './services/implement-service.js';

export { reviewSpec } from './services/review-service.js';
export { formatReviewReport, runReview } from '@specdrive/review-engine';
export type { ReviewReport } from '@specdrive/review-engine';
export { loadSteeringContent } from './services/steering-service.js';
export { createGenerationProvider, resolveLlmConfig } from './ai/index.js';
export type { GenerationInput, GenerationProvider } from './ai/index.js';

export { SPECDRIVE_VERSION } from './domain/types.js';
