/**
 * @specdrive/core
 *
 * Frontend spec-driven development domain model.
 * Kiro-style: requirements → design → tasks with approval gates.
 */

export const SPECDRIVE_VERSION = '0.0.0';

/** Supported frontend stacks */
export type FrontendStack = 'flutter' | 'nextjs' | 'react-native';

/** Spec type */
export type SpecType = 'feature' | 'bugfix';

/** Workflow phase within a feature spec */
export type SpecPhase =
  | 'requirements'
  | 'design'
  | 'tasks'
  | 'implementing'
  | 'review'
  | 'done';

/** Gate approval status */
export type GateStatus = 'pending' | 'approved' | 'rejected';

/** Which document gate */
export type GateName = 'requirements' | 'design' | 'tasks';

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
}

/** Steering file paths (Kiro-style persistent context) */
export interface SteeringPaths {
  product: string;
  techStack: string;
  structure: string;
  codingStyle: string;
}

/** Paths for a single feature spec folder */
export interface FeatureSpecPaths {
  dir: string;
  meta: string;
  requirements: string;
  design: string;
  tasks: string;
  bugfix: string;
}

/** Default `.specdrive/` directory layout */
export function defaultProjectPaths(projectRoot: string): ProjectPaths {
  const specdrive = `${projectRoot}/.specdrive`;
  return {
    root: projectRoot,
    specdrive,
    specs: `${specdrive}/specs`,
    decisions: `${specdrive}/decisions`,
    reviews: `${specdrive}/reviews`,
  };
}

export function defaultSteeringPaths(specdriveRoot: string): SteeringPaths {
  return {
    product: `${specdriveRoot}/product.md`,
    techStack: `${specdriveRoot}/tech-stack.md`,
    structure: `${specdriveRoot}/structure.md`,
    codingStyle: `${specdriveRoot}/coding-style.md`,
  };
}

export function featureSpecPaths(specsRoot: string, slug: string): FeatureSpecPaths {
  const dir = `${specsRoot}/${slug}`;
  return {
    dir,
    meta: `${dir}/meta.yaml`,
    requirements: `${dir}/requirements.md`,
    design: `${dir}/design.md`,
    tasks: `${dir}/tasks.md`,
    bugfix: `${dir}/bugfix.md`,
  };
}

/** Check if a phase gate is approved (required before next generation step) */
export function isGateApproved(
  meta: FeatureSpecMeta,
  gate: GateName,
): boolean {
  return meta.gates[gate]?.status === 'approved';
}

/** Next gate to approve in Kiro-style workflow */
export function nextPendingGate(meta: FeatureSpecMeta): GateName | null {
  const order: GateName[] = ['requirements', 'design', 'tasks'];
  for (const gate of order) {
    if (meta.gates[gate]?.status !== 'approved') {
      return gate;
    }
  }
  return null;
}
