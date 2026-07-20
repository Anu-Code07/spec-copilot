import type {
  FeatureSpecMeta,
  GateName,
  FrontendStack,
  ProjectPaths,
  SteeringPaths,
  FeatureSpecPaths,
} from '../domain/types.js';

export function defaultProjectPaths(projectRoot: string): ProjectPaths {
  const specdrive = `${projectRoot}/.specdrive`;
  return {
    root: projectRoot,
    specdrive,
    specs: `${specdrive}/specs`,
    features: `${specdrive}/specs/features`,
    bugs: `${specdrive}/specs/bugs`,
    decisions: `${specdrive}/decisions`,
    reviews: `${specdrive}/reviews`,
    config: `${specdrive}/config.yaml`,
    steering: `${specdrive}/steering`,
  };
}

/**
 * Prefer `.specdrive/steering/*` (Kiro-style). Fall back to flat `.specdrive/*.md`
 * so existing projects keep working.
 */
export function defaultSteeringPaths(specdriveRoot: string): SteeringPaths {
  const steeringDir = `${specdriveRoot}/steering`;
  return {
    product: `${steeringDir}/product.md`,
    techStack: `${steeringDir}/tech.md`,
    structure: `${steeringDir}/structure.md`,
    codingStyle: `${steeringDir}/coding-style.md`,
  };
}

/** Legacy flat paths used when steering/ files are missing */
export function legacySteeringPaths(specdriveRoot: string): SteeringPaths {
  return {
    product: `${specdriveRoot}/product.md`,
    techStack: `${specdriveRoot}/tech-stack.md`,
    structure: `${specdriveRoot}/structure.md`,
    codingStyle: `${specdriveRoot}/coding-style.md`,
  };
}

/**
 * Resolve feature dir. `folderOrSlug` may be:
 * - short slug: `commerce-cart-heading`
 * - dated folder: `2026-07-20-commerce-cart-heading`
 * - relative: `features/2026-07-20-…`
 */
export function featureSpecPaths(specsRoot: string, folderOrSlug: string): FeatureSpecPaths {
  const cleaned = folderOrSlug
    .replace(/^features\//, '')
    .replace(/^bugs\//, '')
    .replace(/\/$/, '');

  // Prefer features/<name> layout; callers that already resolved absolute dirs pass via resolve
  const dir = cleaned.includes('/')
    ? `${specsRoot}/${cleaned}`
    : `${specsRoot}/features/${cleaned}`;

  return buildFeaturePaths(dir);
}

export function buildFeaturePaths(dir: string): FeatureSpecPaths {
  return {
    dir,
    meta: `${dir}/spec.json`,
    specJson: `${dir}/spec.json`,
    brief: `${dir}/brief.md`,
    requirements: `${dir}/requirements.md`,
    gapAnalysis: `${dir}/gap-analysis.md`,
    designHld: `${dir}/design-hld.md`,
    designLld: `${dir}/design-lld.md`,
    design: `${dir}/design.md`,
    decisions: `${dir}/decisions.md`,
    tasks: `${dir}/tasks.md`,
    maestro: `${dir}/maestro.md`,
    bugfix: `${dir}/bugfix.md`,
    implValidation: `${dir}/impl-validation.md`,
    learnings: `${dir}/learnings.md`,
  };
}

/** Legacy flat `.specdrive/specs/<slug>/` paths */
export function legacyFeatureSpecPaths(specsRoot: string, slug: string): FeatureSpecPaths {
  const dir = `${specsRoot}/${slug}`;
  const paths = buildFeaturePaths(dir);
  // Older installs used meta.yaml
  return { ...paths, meta: `${dir}/meta.yaml` };
}

export function isGateApproved(meta: FeatureSpecMeta, gate: GateName): boolean {
  const g = meta.gates[gate];
  if (!g) return false;
  return g.status === 'approved' || g.approved === true;
}

/** Required gates before ready_for_implementation (maestro optional; brief optional if absent). */
export const REQUIRED_GATES: GateName[] = [
  'requirements',
  'gap_analysis',
  'design_hld',
  'design_lld',
  'tasks',
];

export function computeReadyForImplementation(meta: FeatureSpecMeta): boolean {
  const needBrief = meta.artifacts?.brief === true || meta.gates.brief?.generated === true;
  const gates = needBrief ? (['brief', ...REQUIRED_GATES] as GateName[]) : REQUIRED_GATES;
  return gates.every((gate) => isGateApproved(meta, gate));
}

export function nextPendingGate(meta: FeatureSpecMeta): GateName | null {
  const order: GateName[] = [
    'brief',
    'requirements',
    'gap_analysis',
    'design_hld',
    'design_lld',
    'tasks',
    'maestro',
  ];
  for (const gate of order) {
    if (gate === 'maestro' && !meta.artifacts?.maestro) continue;
    if (!isGateApproved(meta, gate)) return gate;
  }
  return null;
}

export function stackLabel(stack: FrontendStack): string {
  const labels: Record<FrontendStack, string> = {
    flutter: 'Flutter',
    nextjs: 'Next.js',
    'react-native': 'React Native',
  };
  return labels[stack];
}

/**
 * Default source roots — soft hints only.
 * Real layout MUST come from steering/structure.md for the target repo.
 */
export function stackSourceRoot(stack: FrontendStack): string {
  const roots: Record<FrontendStack, string> = {
    flutter: 'lib',
    nextjs: 'src',
    'react-native': 'src',
  };
  return roots[stack];
}

export function gateLabel(gate: GateName): string {
  const labels: Record<GateName, string> = {
    brief: 'brief',
    requirements: 'requirements',
    gap_analysis: 'gap-analysis',
    design_hld: 'design-hld',
    design_lld: 'design-lld',
    design: 'design',
    tasks: 'tasks',
    maestro: 'maestro',
  };
  return labels[gate];
}
