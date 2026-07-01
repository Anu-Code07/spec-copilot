import type { FrontendStack, ParsedRequirement } from '../domain/types.js';
import { stackSourceRoot, stackLabel } from '../domain/paths.js';
import { toPascalCase } from '../utils/format.js';

export function requirementsMd(
  title: string,
  description: string,
  requirements: ParsedRequirement[],
): string {
  const stories = requirements
    .map((req) => {
      const role = req.role ?? 'user';
      const action = req.action ?? `use ${req.title.toLowerCase()}`;
      const benefit = req.benefit ?? 'achieve the feature goal';

      return `### ${req.id}: ${req.title}

**As a** ${role}  
**I want** ${action}  
**So that** ${benefit}  

#### Acceptance Criteria (EARS)

1. **Ubiquitous:** The system shall provide ${req.title.toLowerCase()} functionality.
2. **Event-driven:** When the user interacts with ${req.title.toLowerCase()}, the system shall respond with appropriate UI feedback.
3. **State-driven:** While ${req.title.toLowerCase()} is loading, the system shall display a loading indicator.
4. **Unwanted event:** If an error occurs in ${req.title.toLowerCase()}, the system shall display a user-friendly error message.
`;
    })
    .join('\n');

  return `# Requirements: ${title}

## Overview

${description}

## User Stories

${stories}
## Non-Functional Requirements

- UI shall meet WCAG 2.1 AA accessibility guidelines
- All interactive elements shall have visible focus states
- Loading, empty, and error states shall be implemented

## Out of Scope

- Backend API implementation (client integration only)
- Admin or internal tooling
`;
}

export function defaultRequirements(title: string, _description?: string): ParsedRequirement[] {
  return [
    {
      id: 'REQ-001',
      title: `View ${title.toLowerCase()}`,
      role: 'user',
      action: `view ${title.toLowerCase()}`,
      benefit: 'understand and interact with the feature',
    },
    {
      id: 'REQ-002',
      title: `Interact with ${title.toLowerCase()}`,
      role: 'user',
      action: `perform actions within ${title.toLowerCase()}`,
      benefit: 'complete their goal efficiently',
    },
    {
      id: 'REQ-003',
      title: `Validate ${title.toLowerCase()} input`,
      role: 'user',
      action: 'receive clear validation feedback',
      benefit: 'correct mistakes before submitting',
    },
  ];
}

export function designMd(
  title: string,
  slug: string,
  stack: FrontendStack,
  requirements: ParsedRequirement[],
): string {
  const pascal = toPascalCase(slug);
  const screenName =
    stack === 'flutter'
      ? `${pascal}Page`
      : stack === 'nextjs'
        ? `${pascal}Page`
        : `${pascal}Screen`;

  const componentRows = requirements
    .map(
      (req) =>
        `| ${req.id} | ${req.title} | ${screenName} + related components |`,
    )
    .join('\n');

  const stateSection =
    stack === 'flutter'
      ? `| feature state | featureProvider | AsyncNotifier |`
      : `| feature state | useFeatureStore | Zustand/Context |`;

  return `# Design: ${title}

## User Flow

Entry point → ${screenName} → User interaction → Success/Error feedback

## Screen Map

| Screen | Route / Path | Purpose |
|--------|--------------|---------|
| ${screenName} | \`/${slug}\` | Main ${title.toLowerCase()} UI |

## Component Hierarchy

\`\`\`
${screenName}
├── Header
├── ContentArea
│   └── FeatureBody
├── LoadingState
├── EmptyState
└── ErrorState
\`\`\`

## Component Specifications

### FeatureBody

**States:** idle, loading, populated, error

**Accessibility:** All actions labeled for screen readers

## Navigation

| From | To | Type | Trigger |
|------|----|------|---------|
| App home | ${screenName} | Push/Navigate | User taps feature entry |

## State Management (${stackLabel(stack)})

| State | Location | Type |
|-------|----------|------|
${stateSection}

## Design Tokens

- Use project design system defaults
- Spacing: 8px/8dp grid
- Error states: semantic error color

## Platform Behavior

| Behavior | Mobile | Web |
|----------|--------|-----|
| Loading | Skeleton/shimmer | Skeleton |
| Errors | Toast/snackbar | Inline alert |

## Accessibility

- All buttons and inputs have accessible labels
- Color contrast meets WCAG AA
- Focus order follows visual layout

## Requirement Traceability

| Requirement | Design Element |
|-------------|----------------|
${componentRows}

## Implementation Notes

- Source root: \`${stackSourceRoot(stack)}/${slug}/\`
- Follow structure defined in \`.specdrive/structure.md\`
`;
}

export function tasksMd(
  title: string,
  slug: string,
  stack: FrontendStack,
  requirements: ParsedRequirement[],
): string {
  const pascal = toPascalCase(slug);
  const ext = stack === 'flutter' ? 'dart' : 'tsx';
  const srcRoot = stackSourceRoot(stack);

  const task1Files =
    stack === 'flutter'
      ? `\`${srcRoot}/${slug}/presentation/pages/${slug.replace(/-/g, '_')}_page.${ext}\``
      : `\`${srcRoot}/${slug}/page.${ext}\``;

  const tasks = [
    {
      id: 'TASK-001',
      wave: 1,
      title: `Scaffold ${pascal} screen/page`,
      reqs: ['REQ-001'],
      design: 'Screen Map',
      files: task1Files,
      acceptance: 'Screen renders with placeholder layout and all UI states stubbed',
      depends: [],
    },
    {
      id: 'TASK-002',
      wave: 1,
      title: 'Build core UI components',
      reqs: ['REQ-001', 'REQ-002'],
      design: 'Component Hierarchy → FeatureBody',
      files: `\`${srcRoot}/${slug}/components/\``,
      acceptance: 'Components render loading, empty, and error states',
      depends: [],
    },
    {
      id: 'TASK-003',
      wave: 2,
      title: 'Wire state management',
      reqs: ['REQ-002'],
      design: 'State Management',
      files: `\`${srcRoot}/${slug}/\``,
      acceptance: 'Data loads, user actions update UI correctly',
      depends: ['TASK-001', 'TASK-002'],
    },
    {
      id: 'TASK-004',
      wave: 2,
      title: 'Add validation and error handling',
      reqs: ['REQ-003'],
      design: 'Component Specifications',
      files: `\`${srcRoot}/${slug}/\``,
      acceptance: 'Invalid input blocked with clear error messages',
      depends: ['TASK-003'],
    },
    {
      id: 'TASK-005',
      wave: 3,
      title: 'Navigation integration',
      reqs: requirements.map((r) => r.id),
      design: 'Navigation',
      files: 'Router/navigation config',
      acceptance: 'User can navigate to and from feature',
      depends: ['TASK-001'],
    },
    {
      id: 'TASK-006',
      wave: 3,
      title: 'Widget/component tests + accessibility audit',
      reqs: requirements.map((r) => r.id),
      design: 'Accessibility',
      files: `test/ or __tests__/ for ${slug}`,
      acceptance: 'Tests pass, a11y checks complete',
      depends: ['TASK-003', 'TASK-004', 'TASK-005'],
    },
  ];

  const waves = new Map<number, typeof tasks>();
  for (const task of tasks) {
    if (!waves.has(task.wave)) waves.set(task.wave, []);
    waves.get(task.wave)!.push(task);
  }

  const body = [...waves.entries()]
    .sort(([a], [b]) => a - b)
    .map(([wave, waveTasks]) => {
      const taskBlocks = waveTasks
        .map(
          (t) => `### ${t.id}: ${t.title}

- **Status:** pending
- **Requirements:** ${t.reqs.join(', ')}
- **Design ref:** ${t.design}
- **Files:** ${t.files}
- **Acceptance:** ${t.acceptance}${t.depends.length ? `\n- **Depends on:** ${t.depends.join(', ')}` : ''}
`,
        )
        .join('\n');
      return `## Wave ${wave}\n\n${taskBlocks}`;
    })
    .join('\n');

  return `# Tasks: ${title}

${body}`;
}

export function bugfixMd(title: string, description: string): string {
  return `# Bugfix: ${title}

## Observed Behavior

${description}

## Expected Behavior

Describe expected behavior after fix.

## Reproduction Steps

1. Step one
2. Step two
3. Observe issue

## Root Cause Analysis

(To be filled during investigation)

## Fix Approach

Minimal UI fix scoped to affected components.

## Regression Tests

- Add test covering reproduction scenario
- Verify related UI flows still work
`;
}
