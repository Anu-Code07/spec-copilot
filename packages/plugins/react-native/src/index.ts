import type { FrontendStack } from '@specdrive/core';

export const STACK: FrontendStack = 'react-native';

export const PLUGIN_ID = '@specdrive/plugin-react-native';

export const DESIGN_SECTIONS = [
  'User Flow',
  'Screen Map',
  'Component Hierarchy',
  'Component Specifications',
  'Navigation',
  'State Management',
  'Platform Behavior',
  'Accessibility',
  'Requirement Traceability',
] as const;

export const STRUCTURE_TEMPLATE = 'src/features/{feature}/screens|components|hooks|domain|data';
