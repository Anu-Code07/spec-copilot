import type { FrontendStack } from '@specdrive/core';

export const STACK: FrontendStack = 'nextjs';

export const PLUGIN_ID = '@specdrive/plugin-nextjs';

export const DESIGN_SECTIONS = [
  'User Flow',
  'Page Map',
  'Component Hierarchy',
  'Component Specifications',
  'Routing',
  'State Management',
  'Server vs Client Components',
  'Responsive Layout',
  'Accessibility',
  'Requirement Traceability',
] as const;

export const STRUCTURE_TEMPLATE = 'src/features/{feature}/components|hooks|domain|data';
