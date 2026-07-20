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
      datedFolders: true,
      designHldLld: true,
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
  return `# SpecDrive project config (Kiro-style SDD — works in any repo)
specdriveVersion: "${config.specdriveVersion}"
stack: ${stack}
workflow:
  default: requirements-first
  requireApproval: true
  datedFolders: true
  designHldLld: true
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

> **Edit this file for YOUR repo.** SpecDrive must target real packages/paths here — never invent a scaffold folder at the wrong root.

## Package / app roots
List the real app packages in this workspace (examples only — replace with yours):
- \`<your-app-package>/lib/...\`

## Feature layout (when using Clean Architecture + BLoC)

\`\`\`
<package>/lib/.../features/{vertical}/
├── data/
│   ├── datasources/
│   ├── models/
│   └── repositories/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── usecases/
└── presentation/
    ├── pages/
    ├── widgets/
    └── bloc/
\`\`\`

UI → BLoC → UseCase → Repository. Follow coding-style.md.
`,
    nextjs: `# Project Structure

> **Edit this file for YOUR repo.** Cite real app directories — do not invent modules.

\`\`\`
src/
├── app/{route}/
├── features/{feature}/
│   ├── components/
│   ├── hooks/
│   ├── domain/
│   └── data/
└── components/ui/
\`\`\`
`,
    'react-native': `# Project Structure

> **Edit this file for YOUR repo.** Cite real app directories — do not invent modules.

\`\`\`
src/
├── app/ or navigation/
├── features/{feature}/
│   ├── screens/
│   ├── components/
│   ├── domain/
│   └── data/
└── components/ui/
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
