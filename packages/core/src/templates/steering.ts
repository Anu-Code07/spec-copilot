import type { FrontendStack, ProjectConfig } from '../domain/types.js';
import { stackLabel } from '../domain/paths.js';

export function defaultConfig(stack: FrontendStack): ProjectConfig {
  return {
    specdriveVersion: '1.0',
    stack,
    workflow: {
      default: 'requirements-first',
      requireApproval: true,
    },
    generation: {
      provider: 'template',
      askClarifyingQuestions: false,
    },
    review: {
      accessibility: true,
      designCompliance: true,
    },
  };
}

export function configYaml(stack: FrontendStack): string {
  const config = defaultConfig(stack);
  return `# SpecDrive project config
specdriveVersion: "${config.specdriveVersion}"
stack: ${stack}
workflow:
  default: requirements-first
  requireApproval: true
generation:
  provider: template
  askClarifyingQuestions: false
review:
  accessibility: true
  designCompliance: true
`;
}

export function productMd(): string {
  return `# Product

## Vision

Describe your product vision here.

## Target Users

- Primary user persona
- Platform targets (mobile, web, or both)

## Key Features

- Feature 1
- Feature 2
`;
}

export function techStackMd(stack: FrontendStack): string {
  const stacks: Record<FrontendStack, string> = {
    flutter: `# Tech Stack

- **Platform:** Flutter 3.x
- **State:** Riverpod
- **Navigation:** go_router
- **HTTP:** dio
- **Testing:** flutter_test, mocktail
- **Architecture:** Clean Architecture + feature folders
`,
    nextjs: `# Tech Stack

- **Platform:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **State:** React Context / Zustand
- **Styling:** Tailwind CSS
- **Testing:** Vitest, Testing Library
- **Architecture:** Feature-based colocation
`,
    'react-native': `# Tech Stack

- **Platform:** React Native (Expo)
- **Language:** TypeScript
- **Navigation:** React Navigation
- **State:** Zustand / Context
- **Testing:** Jest, Testing Library
- **Architecture:** Feature folders
`,
  };
  return stacks[stack];
}

export function structureMd(stack: FrontendStack): string {
  const structures: Record<FrontendStack, string> = {
    flutter: `# Project Structure

\`\`\`
lib/
├── core/
│   ├── theme/
│   ├── router/
│   └── network/
└── features/
    └── {feature}/
        ├── data/
        ├── domain/
        └── presentation/
            ├── pages/
            ├── widgets/
            └── providers/
\`\`\`
`,
    nextjs: `# Project Structure

\`\`\`
src/
├── app/
│   └── {route}/
│       ├── page.tsx
│       └── components/
├── components/
│   └── ui/
└── lib/
    ├── hooks/
    └── utils/
\`\`\`
`,
    'react-native': `# Project Structure

\`\`\`
src/
├── navigation/
├── screens/
│   └── {feature}/
│       ├── components/
│       └── hooks/
├── components/
└── services/
\`\`\`
`,
  };
  return structures[stack];
}

export function codingStyleMd(stack: FrontendStack): string {
  return `# Coding Style (${stackLabel(stack)})

## Components / Widgets

- One component per file
- Props/interfaces defined explicitly
- Extract reusable UI into shared components

## State

- Keep state close to where it is used
- Async operations via dedicated providers/notifiers

## Naming

- Screens/Pages: PascalCase + Screen/Page suffix
- Components/Widgets: PascalCase
- Files: snake_case (Flutter) or kebab-case (React)

## Testing

- Widget/component tests for all UI specs
- Test loading, empty, error, and success states
`;
}
