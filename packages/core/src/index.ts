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

export {
  hydrateEnvFromShellProfiles,
  ensureProfileEnvHydrated,
  hasAnyLlmApiKey,
  getLlmKeySetupInstructions,
  getPrimaryShellProfilePath,
  formatProfileExportLine,
  getShellProfilePaths,
  parseEnvFromShellProfile,
} from './infrastructure/shell-profile-env.js';

// Services
export { initProject, doctorProject, SpecDriveError } from './services/project-service.js';
export type { DoctorIssue } from './services/project-service.js';

export {
  createSpec,
  approveGate,
  generateGapAnalysis,
  generateDesign,
  generateTasks,
  getMcpGenerationBundle,
  listSpecs,
  getSpecStatus,
  completeTask,
  resolveSpecSlug,
} from './services/spec-service.js';

export {
  getGenerationBundle,
  generateDocumentCli,
  writeSpecDocument,
  scanCodebaseContext,
  formatCodebaseContext,
  formatBundleForMcp,
} from './services/generation-service.js';

export {
  getImplementContext,
  formatImplementContext,
} from './services/implement-service.js';

export { reviewSpec } from './services/review-service.js';
export { formatReviewReport, runReview } from '@specdrive/review-engine';
export type { ReviewReport } from '@specdrive/review-engine';
export { loadSteeringContent } from './services/steering-service.js';
export {
  createGenerationProvider,
  resolveLlmConfig,
  resolveFreeLlmConfig,
  resolveFreeLlmConfigAsync,
  buildGenerationBundle,
  formatGenerationBundle,
} from './ai/index.js';
export type {
  GenerationInput,
  GenerationProvider,
  GenerationBundle,
  SpecDocument,
  RuntimeMode,
} from './ai/index.js';

export { SPECDRIVE_VERSION } from './domain/types.js';
