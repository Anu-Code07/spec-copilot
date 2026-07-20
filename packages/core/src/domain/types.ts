export const SPECDRIVE_VERSION = '1.0.0';

/** npm package version — keep in sync with packages package.json files on release */
export const SPECDRIVE_PACKAGE_VERSION = '0.1.5';

export type FrontendStack = 'flutter' | 'nextjs' | 'react-native';

export type SpecType = 'feature' | 'bugfix';

export type SpecPhase =
  | 'requirements'
  | 'gap_analysis'
  | 'design'
  | 'tasks'
  | 'implementing'
  | 'review'
  | 'done';

export type GateStatus = 'pending' | 'approved' | 'rejected';

export type GateName = 'requirements' | 'gap_analysis' | 'design' | 'tasks';

export interface PhaseGate {
  status: GateStatus;
  approvedAt?: string;
  approvedBy?: string;
}

export interface FeatureSpecMeta {
  specdriveVersion: string;
  id: string;
  slug: string;
  title: string;
  type: SpecType;
  stack: FrontendStack;
  phase: SpecPhase;
  gates: Record<GateName, PhaseGate>;
  requirements: string[];
  tasks: string[];
  description?: string;
  created?: string;
  updated?: string;
}

export interface ProjectConfig {
  specdriveVersion: string;
  stack: FrontendStack;
  workflow: {
    default: 'requirements-first' | 'design-first';
    requireApproval: boolean;
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
  title: string;
  type: SpecType;
  stack: FrontendStack;
  phase: SpecPhase;
  path: string;
}

export interface ProjectPaths {
  root: string;
  specdrive: string;
  specs: string;
  decisions: string;
  reviews: string;
  config: string;
}

export interface SteeringPaths {
  product: string;
  techStack: string;
  structure: string;
  codingStyle: string;
}

export interface FeatureSpecPaths {
  dir: string;
  meta: string;
  requirements: string;
  gapAnalysis: string;
  design: string;
  tasks: string;
  bugfix: string;
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
  /** cli = template engine; mcp = scaffold + AI bundle for host */
  runtime?: 'cli' | 'mcp';
}

export interface CreateSpecResult {
  slug: string;
  id: string;
  paths: FeatureSpecPaths;
  generated: ('requirements' | 'gap-analysis' | 'design' | 'tasks' | 'bugfix')[];
  /** Present when runtime=mcp — host AI generates docs using Cursor/Claude API */
  generationBundle?: import('../ai/generation-bundle.js').GenerationBundle;
}
