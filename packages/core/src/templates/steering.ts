import type { FrontendStack, ProjectConfig } from '../domain/types.js';
import { stackLabel } from '../domain/paths.js';
import {
  CODING_STYLE_FLUTTER,
  CODING_STYLE_NEXTJS,
  CODING_STYLE_REACT_NATIVE,
} from './coding-styles/index.js';

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
- **Architecture:** Clean Architecture (data / domain / presentation)
- **State:** flutter_bloc (BLoC / Cubit) + Equatable
- **DI:** get_it / injectable (or project standard)
- **Navigation:** go_router
- **HTTP:** dio
- **Errors:** Either/Failure or NetworkResponse — never raw exceptions to UI
- **Testing:** flutter_test, bloc_test, mocktail
`,
    nextjs: `# Tech Stack

- **Platform:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict)
- **Architecture:** Feature modules (components / hooks / domain / data)
- **Server Components** by default; \`'use client'\` only when required
- **Client state:** Zustand slices or URL search params
- **Styling:** Project design system (Tailwind / CSS variables)
- **Testing:** Vitest, Testing Library
`,
    'react-native': `# Tech Stack

- **Platform:** React Native (Expo)
- **Language:** TypeScript (strict)
- **Architecture:** Feature modules (screens / hooks / domain / data)
- **Navigation:** Expo Router or React Navigation
- **State:** Zustand feature slices (discrete status unions)
- **Lists:** FlatList / FlashList
- **Testing:** Jest, Testing Library
`,
  };
  return stacks[stack];
}

export function structureMd(stack: FrontendStack): string {
  const structures: Record<FrontendStack, string> = {
    flutter: `# Project Structure

\`\`\`
lib/src/features/{feature}/
├── data/
│   ├── datasources/     # remote + local separated
│   ├── models/          # DTOs only (fromJson/toJson)
│   └── repositories/    # implements domain interfaces
├── domain/
│   ├── entities/        # plain Dart, no JSON
│   ├── repositories/    # abstract interfaces only
│   └── usecases/        # one execute() each
└── presentation/
    ├── pages/
    ├── widgets/         # dumb UI
    └── bloc/            # events + sealed states + bloc
\`\`\`

UI → BLoC → UseCase → Repository. Never skip layers.
`,
    nextjs: `# Project Structure

\`\`\`
src/
├── app/{route}/              # thin pages + loading/error
│   └── _components/
├── features/{feature}/
│   ├── components/
│   ├── hooks/
│   ├── domain/               # pure TS
│   ├── data/                 # fetchers + DTOs + mappers
│   └── index.ts              # public API
├── components/ui/
└── lib/
\`\`\`
`,
    'react-native': `# Project Structure

\`\`\`
src/
├── navigation/ or app/       # Expo Router
├── features/{feature}/
│   ├── screens/              # composition only
│   ├── components/
│   ├── hooks/ | store/
│   ├── domain/
│   ├── data/
│   └── index.ts
├── components/ui/
├── lib/
└── theme/
\`\`\`
`,
  };
  return structures[stack];
}

export function codingStyleMd(stack: FrontendStack): string {
  switch (stack) {
    case 'flutter':
      return CODING_STYLE_FLUTTER;
    case 'nextjs':
      return CODING_STYLE_NEXTJS;
    case 'react-native':
      return CODING_STYLE_REACT_NATIVE;
    default: {
      const _exhaustive: never = stack;
      return _exhaustive;
    }
  }
}

export { stackLabel };
