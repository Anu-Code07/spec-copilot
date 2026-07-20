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
export type { ImplementResult, FigmaAction, FigmaPrompt } from './services/implement-service.js';

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
export { SPECDRIVE_PACKAGE_VERSION } from './domain/types.js';

export {
  stackToFramework,
  extractFigmaFileKey,
  resolveFigmaToken,
  requireFigmaToken,
  loadDesign2CodeConfig,
  resolveSpecFigmaFileKey,
  classifyTaskForDesign2Code,
  tryExecuteUiTaskWithDesign2Code,
  getFigmaTokenSetupInstructions,
  getDesign2CodeInstallInstructions,
  isDesign2CodeAvailable,
  resolveDesignSystemPath,
  importFigmaDesign,
  generateFromDesign,
  generateFigmaForSpec,
  detectDesign2CodeProject,
  getFigmaIntegrationStatus,
  readSpecDesignExcerpt,
} from './integrations/design2code-service.js';
export type {
  Design2CodeFramework,
  Design2CodeScope,
  Design2CodeMergeStrategy,
  Design2CodeFileSummary,
  Design2CodeGenerateResult,
  Design2CodeImportResult,
  Design2CodeTaskAttempt,
} from './integrations/design2code-service.js';

export {
  setupCursorIntegration,
  getCursorSetupStatus,
} from './integrations/cursor-setup-service.js';
export type { CursorSetupResult, CursorSetupOptions } from './integrations/cursor-setup-service.js';

export {
  setupMcpIntegration,
  buildMcpServerConfig,
  getUniversalMcpSnippet,
} from './integrations/mcp-setup-service.js';
export type { McpSetupResult, McpSetupOptions, McpServerConfig } from './integrations/mcp-setup-service.js';

export {
  stepsAfterCreateSpec,
  stepsAfterDocument,
  stepsAfterApproveGate,
  stepsAfterGetNextTask,
  stepsAfterCompleteTask,
  formatWorkflowSteps,
  formatWorkflowStepsMarkdown,
} from './workflow/guidance.js';
export type { WorkflowStep, WorkflowSurface } from './workflow/guidance.js';
