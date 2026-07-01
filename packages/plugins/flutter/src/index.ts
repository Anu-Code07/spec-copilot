import type { FrontendStack } from '@specdrive/core';

export const STACK: FrontendStack = 'flutter';

export const PLUGIN_ID = '@specdrive/plugin-flutter';

/** design.md sections injected by Flutter plugin */
export const DESIGN_SECTIONS = [
  'User Flow',
  'Screen Map',
  'Component Hierarchy',
  'Widget Specifications',
  'Navigation',
  'State Management',
  'Platform Behavior',
  'Accessibility',
  'Requirement Traceability',
] as const;

/** Default structure.md template for Flutter projects */
export const STRUCTURE_TEMPLATE = 'lib/features/{feature}/data|domain|presentation';
