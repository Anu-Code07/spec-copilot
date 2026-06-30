import { describe, it, expect } from 'vitest';
import {
  defaultProjectPaths,
  defaultSteeringPaths,
  featureSpecPaths,
  isGateApproved,
  nextPendingGate,
  SPECDRIVE_VERSION,
  type FeatureSpecMeta,
} from './index.js';

describe('@specdrive/core', () => {
  it('exports version', () => {
    expect(SPECDRIVE_VERSION).toBe('0.0.0');
  });

  it('returns default project paths', () => {
    const paths = defaultProjectPaths('/app');
    expect(paths.specdrive).toBe('/app/.specdrive');
    expect(paths.specs).toBe('/app/.specdrive/specs');
  });

  it('returns steering paths', () => {
    const steering = defaultSteeringPaths('/app/.specdrive');
    expect(steering.product).toBe('/app/.specdrive/product.md');
    expect(steering.techStack).toBe('/app/.specdrive/tech-stack.md');
  });

  it('returns feature spec paths', () => {
    const paths = featureSpecPaths('/app/.specdrive/specs', 'product-review');
    expect(paths.requirements).toBe('/app/.specdrive/specs/product-review/requirements.md');
    expect(paths.design).toBe('/app/.specdrive/specs/product-review/design.md');
  });

  it('tracks gate approval workflow', () => {
    const meta: FeatureSpecMeta = {
      specdriveVersion: '1.0',
      id: 'SPEC-001',
      slug: 'product-review',
      title: 'Product Review',
      type: 'feature',
      stack: 'flutter',
      phase: 'requirements',
      gates: {
        requirements: { status: 'approved' },
        design: { status: 'pending' },
        tasks: { status: 'pending' },
      },
      requirements: ['REQ-001'],
      tasks: [],
    };

    expect(isGateApproved(meta, 'requirements')).toBe(true);
    expect(isGateApproved(meta, 'design')).toBe(false);
    expect(nextPendingGate(meta)).toBe('design');
  });
});
