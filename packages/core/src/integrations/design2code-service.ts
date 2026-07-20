import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { FrontendStack, ParsedTask, TaskKind } from '../domain/types.js';
import { defaultProjectPaths } from '../domain/paths.js';
import { fileExists, resolveFeaturePaths } from '../infrastructure/files.js';
import { ensureProfileEnvHydrated } from '../infrastructure/shell-profile-env.js';
import { SpecDriveError } from '../services/project-service.js';
import { getSpecStatus } from '../services/spec-service.js';

export type Design2CodeFramework = 'flutter' | 'react' | 'nextjs' | 'react-native';
export type Design2CodeScope = 'component' | 'screen' | 'feature' | 'project';
export type Design2CodeMergeStrategy = 'create' | 'merge' | 'replace' | 'preview';

export interface Design2CodeFileSummary {
  path: string;
  language: string;
  kind: string;
  preview: string;
}

export interface Design2CodeGenerateResult {
  filesGenerated: number;
  framework: Design2CodeFramework;
  scope: Design2CodeScope;
  mergeStrategy: Design2CodeMergeStrategy;
  warnings: string[];
  files: Design2CodeFileSummary[];
  merge?: {
    created: string[];
    updated: string[];
    skipped: string[];
  };
}

export interface Design2CodeImportResult {
  name: string;
  components: number;
  screens: number;
  outputPath: string;
}

export interface Design2CodeTaskAttempt {
  taskKind: TaskKind;
  attempted: boolean;
  skipped: boolean;
  skipReason?: string;
  scope?: Design2CodeScope;
  result?: Design2CodeGenerateResult;
}

interface Design2CodeConfigFile {
  figmaToken?: string;
}

interface SpecFigmaConfig {
  fileKey?: string;
  nodeIds?: string[];
}

const dynamicImport = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<unknown>;

let generatorsRegistered = false;

export function stackToFramework(stack: FrontendStack): Design2CodeFramework {
  return stack === 'react-native' ? 'react-native' : stack;
}

export function extractFigmaFileKey(input: string): string {
  const match = input.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? input.trim();
}

export async function resolveFigmaToken(explicit?: string): Promise<string | null> {
  if (explicit) return explicit;

  await ensureProfileEnvHydrated();
  const fromEnv = process.env.FIGMA_TOKEN ?? process.env.FIGMA_ACCESS_TOKEN;
  if (fromEnv) return fromEnv;

  const config = await loadDesign2CodeConfig();
  return config.figmaToken ?? null;
}

export async function requireFigmaToken(explicit?: string): Promise<string> {
  const token = await resolveFigmaToken(explicit);
  if (!token) {
    throw new SpecDriveError(getFigmaTokenSetupInstructions(), 'FIGMA_TOKEN_MISSING');
  }
  return token;
}

export async function loadDesign2CodeConfig(): Promise<Design2CodeConfigFile> {
  const configPath = join(homedir(), '.design2code', 'config.json');
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(await readFile(configPath, 'utf-8')) as Design2CodeConfigFile;
  } catch {
    return {};
  }
}

export async function resolveSpecFigmaFileKey(
  projectRoot: string,
  explicit?: string,
): Promise<string | undefined> {
  if (explicit) return extractFigmaFileKey(explicit);

  const fromEnv = process.env.SPECDRIVE_FIGMA_FILE ?? process.env.FIGMA_FILE_KEY;
  if (fromEnv) return extractFigmaFileKey(fromEnv);

  const configPath = join(projectRoot, '.specdrive', 'figma.json');
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(await readFile(configPath, 'utf-8')) as SpecFigmaConfig;
      if (config.fileKey) return extractFigmaFileKey(config.fileKey);
    } catch {
      // ignore invalid config
    }
  }

  return undefined;
}

export function getFigmaTokenSetupInstructions(): string {
  return [
    'No Figma token found.',
    '',
    'Figma uses a Personal Access Token (PAT) — there is no OAuth popup like GitHub.',
    '',
    '1. Open https://www.figma.com/settings',
    '2. Scroll to "Personal access tokens"',
    '3. Click "Generate new token" → name it (e.g. SpecDrive) → copy the token',
    '',
    'Save it once (pick one):',
    '',
    '  design2code login --figma-token figd_YOUR_TOKEN',
    '  → saves to ~/.design2code/config.json',
    '',
    '  export FIGMA_TOKEN="figd_YOUR_TOKEN" >> ~/.zshrc && source ~/.zshrc',
    '',
    '  Cursor MCP env: "FIGMA_TOKEN": "figd_YOUR_TOKEN" in .cursor/mcp.json',
    '',
    'Get token: https://www.figma.com/developers/api#access-tokens',
  ].join('\n');
}

export function getDesign2CodeInstallInstructions(): string {
  return [
    'Design2Code (figma-to-code) is not installed in this project.',
    '',
    'Install from https://github.com/Anu-Code07/figma-to-code:',
    '',
    '  git clone https://github.com/Anu-Code07/figma-to-code.git',
    '  cd figma-to-code && pnpm install && pnpm build',
    '  cd your-project && pnpm link ../figma-to-code/packages/compiler-core \\',
    '    ../figma-to-code/packages/figma-parser \\',
    '    ../figma-to-code/packages/merge-engine \\',
    '    ../figma-to-code/packages/generator-flutter \\',
    '    ../figma-to-code/packages/generator-react \\',
    '    ../figma-to-code/packages/generator-nextjs \\',
    '    ../figma-to-code/packages/generator-react-native',
    '',
    'Or run both MCP servers in Cursor (SpecDrive + Design2Code).',
  ].join('\n');
}

export async function isDesign2CodeAvailable(): Promise<boolean> {
  try {
    await dynamicImport('@design2code/compiler-core');
    return true;
  } catch {
    return false;
  }
}

async function loadDesign2CodeRuntime() {
  try {
    const [
      compilerCore,
      figmaParser,
      mergeEngine,
      generatorFlutter,
      generatorReact,
      generatorNextjs,
      generatorReactNative,
    ] = await Promise.all([
      dynamicImport('@design2code/compiler-core'),
      dynamicImport('@design2code/figma-parser'),
      dynamicImport('@design2code/merge-engine'),
      dynamicImport('@design2code/generator-flutter'),
      dynamicImport('@design2code/generator-react'),
      dynamicImport('@design2code/generator-nextjs'),
      dynamicImport('@design2code/generator-react-native'),
    ]);

    if (!generatorsRegistered) {
      const core = compilerCore as typeof import('@design2code/compiler-core');
      const flutter = generatorFlutter as typeof import('@design2code/generator-flutter');
      const react = generatorReact as typeof import('@design2code/generator-react');
      const nextjs = generatorNextjs as typeof import('@design2code/generator-nextjs');
      const reactNative = generatorReactNative as typeof import('@design2code/generator-react-native');

      core.registerGenerator('flutter', new flutter.FlutterGenerator());
      core.registerGenerator('react', new react.ReactGenerator());
      core.registerGenerator('nextjs', new nextjs.NextjsGenerator());
      core.registerGenerator('react-native', new reactNative.ReactNativeGenerator());
      generatorsRegistered = true;
    }

    return {
      compilerCore: compilerCore as typeof import('@design2code/compiler-core'),
      figmaParser: figmaParser as typeof import('@design2code/figma-parser'),
      mergeEngine: mergeEngine as typeof import('@design2code/merge-engine'),
    };
  } catch {
    throw new SpecDriveError(getDesign2CodeInstallInstructions(), 'DESIGN2CODE_NOT_INSTALLED');
  }
}

export async function resolveDesignSystemPath(projectRoot: string): Promise<string | undefined> {
  const candidates = [
    join(projectRoot, '.specdrive', 'design-system.md'),
    join(projectRoot, 'design.md'),
  ];
  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }
  return undefined;
}

export async function importFigmaDesign(
  projectRoot: string,
  opts: {
    fileKey: string;
    figmaToken?: string;
    outputDir?: string;
    nodeIds?: string[];
  },
): Promise<Design2CodeImportResult> {
  const runtime = await loadDesign2CodeRuntime();
  const token = await requireFigmaToken(opts.figmaToken);
  const fileKey = extractFigmaFileKey(opts.fileKey);
  const outputDir = join(projectRoot, opts.outputDir ?? '.design2code');
  const outputPath = join(outputDir, 'design-ast.json');

  const client = runtime.figmaParser.createFigmaClient(token);
  const figmaFile = await client.getFile(fileKey, opts.nodeIds);
  const document = runtime.figmaParser.parseFigmaFile(figmaFile, {
    fileKey,
    nodeIds: opts.nodeIds,
  }) as {
    name: string;
    components: unknown[];
    screens: unknown[];
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(document, null, 2));

  return {
    name: document.name,
    components: document.components.length,
    screens: document.screens.length,
    outputPath,
  };
}

export async function generateFromDesign(
  projectRoot: string,
  opts: {
    framework: Design2CodeFramework;
    scope: Design2CodeScope;
    figmaFileKey?: string;
    figmaToken?: string;
    astPath?: string;
    designSystemPath?: string;
    mergeStrategy?: Design2CodeMergeStrategy;
    selection?: string[];
    includeTests?: boolean;
    outputDir?: string;
  },
): Promise<Design2CodeGenerateResult> {
  const runtime = await loadDesign2CodeRuntime();
  const mergeStrategy = opts.mergeStrategy ?? 'preview';
  const astPath = opts.astPath ?? join(projectRoot, '.design2code', 'design-ast.json');

  let document: unknown;
  if (opts.figmaFileKey) {
    const token = await requireFigmaToken(opts.figmaToken);
    const fileKey = extractFigmaFileKey(opts.figmaFileKey);
    const client = runtime.figmaParser.createFigmaClient(token);
    const figmaFile = await client.getFile(fileKey);
    document = runtime.figmaParser.parseFigmaFile(figmaFile, { fileKey });
  } else if (existsSync(astPath)) {
    document = JSON.parse(await readFile(astPath, 'utf-8'));
  } else {
    throw new SpecDriveError(
      'No Figma file key or Design AST found. Run figma_import first or pass figmaFileKey.',
      'DESIGN2CODE_INPUT_MISSING',
    );
  }

  const designSystemPath =
    opts.designSystemPath ?? (await resolveDesignSystemPath(projectRoot));
  const compiler = runtime.compilerCore.createCompiler();
  const dryRun = mergeStrategy === 'preview';

  const result = await compiler.compile(document, {
    framework: opts.framework,
    scope: opts.scope,
    designSystemPath,
    projectRoot: mergeStrategy === 'merge' || mergeStrategy === 'replace' ? projectRoot : undefined,
    outputDir: opts.outputDir ?? join(projectRoot, 'generated'),
    selection: opts.selection,
    mergeStrategy,
    includeTests: opts.includeTests,
    aiEnabled: true,
    dryRun,
  });

  if (!dryRun && mergeStrategy === 'create') {
    const outputDir = join(projectRoot, opts.outputDir ?? 'generated');
    for (const file of result.generation.files) {
      const filePath = join(outputDir, file.path);
      await mkdir(join(filePath, '..'), { recursive: true });
      await writeFile(filePath, file.content);
    }
  }

  return {
    filesGenerated: result.generation.files.length,
    framework: opts.framework,
    scope: opts.scope,
    mergeStrategy,
    warnings: result.generation.warnings,
    files: result.generation.files.map((file) => ({
      path: file.path,
      language: file.language,
      kind: file.kind,
      preview: file.content.split('\n').slice(0, 30).join('\n'),
    })),
    merge: result.merge
      ? {
          created: result.merge.created,
          updated: result.merge.updated,
          skipped: result.merge.skipped,
        }
      : undefined,
  };
}

export async function generateFigmaForSpec(
  projectRoot: string,
  slug: string,
  opts: {
    figmaFileKey?: string;
    figmaToken?: string;
    scope?: Design2CodeScope;
    mergeStrategy?: Design2CodeMergeStrategy;
    selection?: string[];
    includeTests?: boolean;
  },
): Promise<Design2CodeGenerateResult & { spec: { slug: string; title: string; stack: FrontendStack } }> {
  const status = await getSpecStatus(projectRoot, slug);
  const framework = stackToFramework(status.meta.stack);
  const scope = opts.scope ?? inferScopeFromPhase(status.meta.phase);

  const result = await generateFromDesign(projectRoot, {
    framework,
    scope,
    figmaFileKey: opts.figmaFileKey,
    figmaToken: opts.figmaToken,
    mergeStrategy: opts.mergeStrategy ?? 'merge',
    selection: opts.selection,
    includeTests: opts.includeTests,
  });

  return {
    ...result,
    spec: {
      slug: status.meta.slug,
      title: status.meta.title,
      stack: status.meta.stack,
    },
  };
}

function inferScopeFromPhase(phase: string): Design2CodeScope {
  if (phase === 'implementing' || phase === 'tasks') return 'screen';
  if (phase === 'design') return 'screen';
  return 'component';
}

export async function detectDesign2CodeProject(projectRoot: string): Promise<unknown> {
  const runtime = await loadDesign2CodeRuntime();
  return runtime.mergeEngine.detectProject(projectRoot);
}

export async function getFigmaIntegrationStatus(projectRoot: string): Promise<{
  design2codeInstalled: boolean;
  figmaTokenConfigured: boolean;
  designAstPath: string;
  designAstExists: boolean;
  designSystemPath?: string;
  specdriveDesignSystemPath: string;
}> {
  await ensureProfileEnvHydrated();
  const designAstPath = join(projectRoot, '.design2code', 'design-ast.json');
  const designSystemPath = await resolveDesignSystemPath(projectRoot);

  return {
    design2codeInstalled: await isDesign2CodeAvailable(),
    figmaTokenConfigured: Boolean(await resolveFigmaToken()),
    designAstPath,
    designAstExists: existsSync(designAstPath),
    designSystemPath,
    specdriveDesignSystemPath: join(projectRoot, '.specdrive', 'design-system.md'),
  };
}

/** Classify whether SpecDrive should route a task to Design2Code (UI-only) or host AI (logic). */
export function classifyTaskForDesign2Code(task: ParsedTask): TaskKind {
  const text = `${task.title} ${task.designRef ?? ''} ${task.files ?? ''} ${task.acceptance ?? ''}`.toLowerCase();

  const logicPatterns =
    /\b(bloc|cubit|provider|store|zustand|redux|state management|wire state|navigation|router|gorouter|validation|repository|usecase|use case|api|service layer|integrat|business logic|test|accessibility audit|error handling)\b/;
  const uiPatterns =
    /\b(ui|widget|component|screen|layout|scaffold|page|view|figma|styling|theme|design|placeholder layout|render)\b/;

  if (logicPatterns.test(text)) return 'logic';
  if (uiPatterns.test(text)) return 'ui';
  return 'unknown';
}

/**
 * UI tasks use component scope intentionally — screen/feature scope in Design2Code
 * also scaffolds BLoC/Clean Architecture. SpecDrive owns logic tasks separately.
 */
export function inferUiScopeForTask(task: ParsedTask): Design2CodeScope {
  const text = `${task.title} ${task.designRef ?? ''}`.toLowerCase();
  if (/\b(component|widget|button|card|navbar|shared)\b/.test(text)) return 'component';
  return 'component';
}

export async function tryExecuteUiTaskWithDesign2Code(
  projectRoot: string,
  task: ParsedTask,
  stack: FrontendStack,
  opts: {
    figmaFileKey?: string;
    figmaToken?: string;
    mergeStrategy?: Design2CodeMergeStrategy;
  } = {},
): Promise<Design2CodeTaskAttempt> {
  const taskKind = classifyTaskForDesign2Code(task);

  if (taskKind === 'logic') {
    return {
      taskKind,
      attempted: false,
      skipped: true,
      skipReason: 'Logic/state/navigation task — implement with Cursor/Claude using spec context',
    };
  }

  if (taskKind === 'unknown') {
    return {
      taskKind,
      attempted: false,
      skipped: true,
      skipReason: 'Task type unclear — implement manually or tag UI tasks in tasks.md title',
    };
  }

  if (!(await isDesign2CodeAvailable())) {
    return {
      taskKind,
      attempted: false,
      skipped: true,
      skipReason: 'Design2Code not installed — skipped UI auto-generation',
    };
  }

  const token = await resolveFigmaToken(opts.figmaToken);
  const fileKey = await resolveSpecFigmaFileKey(projectRoot, opts.figmaFileKey);
  const astPath = join(projectRoot, '.design2code', 'design-ast.json');

  if (!token && !existsSync(astPath) && !fileKey) {
    return {
      taskKind,
      attempted: false,
      skipped: true,
      skipReason: 'No FIGMA_TOKEN, Figma file key (.specdrive/figma.json), or saved Design AST — skipped',
    };
  }

  const scope = inferUiScopeForTask(task);
  const framework = stackToFramework(stack);

  try {
    const result = await generateFromDesign(projectRoot, {
      framework,
      scope,
      figmaFileKey: fileKey,
      figmaToken: token ?? undefined,
      astPath,
      mergeStrategy: opts.mergeStrategy ?? 'merge',
    });

    return {
      taskKind,
      attempted: true,
      skipped: false,
      scope,
      result,
    };
  } catch (error) {
    return {
      taskKind,
      attempted: true,
      skipped: true,
      skipReason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function readSpecDesignExcerpt(
  projectRoot: string,
  slug: string,
  maxChars = 1500,
): Promise<string | undefined> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, slug);
  const candidates = [specPaths.designLld, specPaths.designHld, specPaths.design];
  for (const p of candidates) {
    if (await fileExists(p)) {
      const content = await readFile(p, 'utf-8');
      return content.slice(0, maxChars);
    }
  }
  return undefined;
}
