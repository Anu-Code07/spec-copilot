export const SPECDRIVE_VERSION = '1.0.0';

/** npm package version — keep in sync with packages package.json files on release */
export const SPECDRIVE_PACKAGE_VERSION = '0.1.8';

export type FrontendStack = 'flutter' | 'nextjs' | 'react-native';

export type SpecType = 'feature' | 'bugfix' | 'tech-debt';

/**
 * Kiro-aligned phases (Scapia-style SDD).
 * Pipeline: brief → requirements → gap-analysis → design-hld → design-lld → tasks → (maestro) → implementing → validate → done
 */
export type SpecPhase =
  | 'brief'
  | 'requirements'
  | 'gap_analysis'
  | 'design_hld'
  | 'design_lld'
  | 'tasks'
  | 'maestro'
  | 'implementing'
  | 'validate'
  | 'done'
  /** @deprecated legacy — migrated to design_hld/design_lld */
  | 'design';

/**
 * Human gates — each artifact is generated then human-approved (Kiro-style).
 * Legacy `design` is accepted as an alias for approving both HLD+LLD when present.
 */
export type GateName =
  | 'brief'
  | 'requirements'
  | 'gap_analysis'
  | 'design_hld'
  | 'design_lld'
  | 'tasks'
  | 'maestro'
  /** @deprecated prefer design_hld / design_lld */
  | 'design';

export type GateStatus = 'pending' | 'approved' | 'rejected';

/** Per-artifact approval — mirrors Kiro spec.json approvals.*.generated / .approved */
export interface PhaseGate {
  status: GateStatus;
  /** Artifact file has been written */
  generated?: boolean;
  /** Human approved this gate */
  approved?: boolean;
  approvedAt?: string;
  approvedBy?: string;
}

export interface FeatureSpecMeta {
  specdriveVersion: string;
  id: string;
  /** Short slug from title (e.g. commerce-cart-products-heading) */
  slug: string;
  /** Leaf folder name under specs/features/ (e.g. 2026-07-20-FRONT-3092-commerce-cart-products-heading) */
  folderName?: string;
  title: string;
  type: SpecType;
  stack: FrontendStack;
  phase: SpecPhase;
  /** Optional ticket id e.g. FRONT-3092 */
  ticket?: string;
  gates: Partial<Record<GateName, PhaseGate>> & {
    requirements: PhaseGate;
    gap_analysis: PhaseGate;
    design_hld: PhaseGate;
    design_lld: PhaseGate;
    tasks: PhaseGate;
  };
  /** CI unlock — true only when required gates are human-approved */
  ready_for_implementation: boolean;
  requirements: string[];
  tasks: string[];
  description?: string;
  created?: string;
  updated?: string;
  /** Artifact presence flags (Kiro-style) */
  artifacts?: {
    brief?: boolean;
    requirements?: boolean;
    gapAnalysis?: boolean;
    designHld?: boolean;
    designLld?: boolean;
    decisions?: boolean;
    tasks?: boolean;
    maestro?: boolean;
  };
}

export interface ProjectConfig {
  specdriveVersion: string;
  stack: FrontendStack;
  workflow: {
    default: 'requirements-first' | 'design-first';
    requireApproval: boolean;
    /** Prefer dated features/YYYY-MM-DD-… folders (Kiro-style) */
    datedFolders?: boolean;
    /** Split design into HLD + LLD (default true) */
    designHldLld?: boolean;
  };
  generation: {
    /** CLI/npm: template engine (offline). MCP: ai_assisted via host Cursor/Claude API */
    provider: 'template';
    askClarifyingQuestions: boolean;
  };
  review: {
    accessibility: boolean;
    designCompliance: boolean;
  };
}

export interface SpecSummary {
  id: string;
  slug: string;
  folderName?: string;
  title: string;
  type: SpecType;
  stack: FrontendStack;
  phase: SpecPhase;
  path: string;
  ready_for_implementation?: boolean;
}

export interface ProjectPaths {
  root: string;
  specdrive: string;
  specs: string;
  features: string;
  bugs: string;
  decisions: string;
  reviews: string;
  config: string;
  steering: string;
}

export interface SteeringPaths {
  product: string;
  techStack: string;
  structure: string;
  codingStyle: string;
}

export interface FeatureSpecPaths {
  dir: string;
  /** Prefer spec.json (Kiro); meta.yaml kept for legacy reads */
  meta: string;
  specJson: string;
  brief: string;
  requirements: string;
  gapAnalysis: string;
  designHld: string;
  designLld: string;
  /** Legacy combined design — written as HLD+LLD concat for older consumers */
  design: string;
  decisions: string;
  tasks: string;
  maestro: string;
  bugfix: string;
  implValidation: string;
  learnings: string;
}

export interface ParsedRequirement {
  id: string;
  title: string;
  role?: string;
  action?: string;
  benefit?: string;
}

export interface ParsedTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'done';
  requirements: string[];
  designRef?: string;
  dependsOn: string[];
  wave: number;
  files?: string;
  acceptance?: string;
}

export interface ImplementContext {
  spec: FeatureSpecMeta;
  task: ParsedTask;
  requirementsContent: string;
  designContent: string;
  steering: {
    product?: string;
    techStack?: string;
    structure?: string;
    codingStyle?: string;
  };
}

export type TaskKind = 'ui' | 'logic' | 'unknown';

export interface CreateSpecOptions {
  title: string;
  description?: string;
  type?: SpecType;
  quick?: boolean;
  designFirst?: boolean;
  /** Optional ticket for folder naming e.g. FRONT-3092 */
  ticket?: string;
  /** cli = template engine; mcp = scaffold + AI bundle for host */
  runtime?: 'cli' | 'mcp';
}

export interface CreateSpecResult {
  slug: string;
  folderName: string;
  id: string;
  paths: FeatureSpecPaths;
  generated: string[];
  /** Present when runtime=mcp — host AI generates docs using Cursor/Claude API */
  generationBundle?: import('../ai/generation-bundle.js').GenerationBundle;
  journeyMarkdown?: string;
}
