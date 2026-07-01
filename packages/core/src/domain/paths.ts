import type { FeatureSpecMeta, GateName, FrontendStack, ProjectPaths, SteeringPaths, FeatureSpecPaths } from '../domain/types.js';

export function defaultProjectPaths(projectRoot: string): ProjectPaths {
  const specdrive = `${projectRoot}/.specdrive`;
  return {
    root: projectRoot,
    specdrive,
    specs: `${specdrive}/specs`,
    decisions: `${specdrive}/decisions`,
    reviews: `${specdrive}/reviews`,
    config: `${specdrive}/config.yaml`,
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

export function isGateApproved(meta: FeatureSpecMeta, gate: GateName): boolean {
  return meta.gates[gate]?.status === 'approved';
}

export function nextPendingGate(meta: FeatureSpecMeta): GateName | null {
  const order: GateName[] = ['requirements', 'design', 'tasks'];
  for (const gate of order) {
    if (meta.gates[gate]?.status !== 'approved') {
      return gate;
    }
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

export function stackSourceRoot(stack: FrontendStack): string {
  const roots: Record<FrontendStack, string> = {
    flutter: 'lib/features',
    nextjs: 'src/app',
    'react-native': 'src/screens',
  };
  return roots[stack];
}
