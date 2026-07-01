import type { SpecDocument, GenerationBundle } from '../ai/generation-bundle.js';
import { buildGenerationBundle, formatGenerationBundle } from '../ai/generation-bundle.js';
import { scanCodebaseContext, formatCodebaseContext } from '../infrastructure/codebase-scanner.js';
import { createGenerationProvider } from '../ai/index.js';
import type { GenerationInput } from '../ai/types.js';
import type { FeatureSpecMeta } from '../domain/types.js';
import { featureSpecPaths } from '../domain/paths.js';
import { loadSteeringContent } from './steering-service.js';
import { readText, writeText, fileExists, loadConfig } from '../infrastructure/files.js';
import { SpecDriveError } from './project-service.js';

/** MCP: returns bundle for host AI (Claude/Cursor API). Does NOT call any LLM. */
export async function getGenerationBundle(
  projectRoot: string,
  meta: FeatureSpecMeta,
  document: SpecDocument,
): Promise<GenerationBundle> {
  const paths = featureSpecPaths(
    `${projectRoot}/.specdrive/specs`,
    meta.slug,
  );
  const specPaths = paths;
  const steering = await loadSteeringContent(projectRoot);

  const reqContent = (await fileExists(specPaths.requirements))
    ? await readText(specPaths.requirements)
    : '';
  const gapContent = (await fileExists(specPaths.gapAnalysis))
    ? await readText(specPaths.gapAnalysis)
    : '';
  const designContent = (await fileExists(specPaths.design))
    ? await readText(specPaths.design)
    : '';

  const codebaseContext = await scanCodebaseContext(
    projectRoot,
    meta.stack,
    meta.slug,
    meta.title,
    reqContent || undefined,
  );

  return buildGenerationBundle({
    document,
    slug: meta.slug,
    title: meta.title,
    description: meta.description ?? meta.title,
    stack: meta.stack,
    inputDocuments: {
      requirements: reqContent,
      'gap-analysis': gapContent,
      design: designContent,
      ...Object.fromEntries(
        Object.entries(steering).map(([k, v]) => [k, v ?? '']),
      ),
    },
    codebaseContext,
  });
}

export function formatBundleForMcp(bundle: GenerationBundle): string {
  return formatGenerationBundle(bundle);
}

/** CLI/npm: scans repo + calls free LLM (Gemini/Groq/Ollama) or template fallback */
export async function generateDocumentCli(
  projectRoot: string,
  meta: FeatureSpecMeta,
  kind: GenerationInput['kind'],
): Promise<string> {
  const specPaths = featureSpecPaths(`${projectRoot}/.specdrive/specs`, meta.slug);
  const steering = await loadSteeringContent(projectRoot);
  await loadConfig(projectRoot);

  const reqContent = (await fileExists(specPaths.requirements))
    ? await readText(specPaths.requirements)
    : undefined;
  const gapContent = (await fileExists(specPaths.gapAnalysis))
    ? await readText(specPaths.gapAnalysis)
    : undefined;
  const designContent = (await fileExists(specPaths.design))
    ? await readText(specPaths.design)
    : undefined;

  const codebaseContext = await scanCodebaseContext(
    projectRoot,
    meta.stack,
    meta.slug,
    meta.title,
    reqContent,
  );

  const provider = createGenerationProvider('cli');
  return provider.generate({
    kind,
    title: meta.title,
    description: meta.description ?? meta.title,
    stack: meta.stack,
    slug: meta.slug,
    requirementsContent: reqContent,
    gapAnalysisContent: gapContent,
    designContent,
    codebaseContextFormatted: formatCodebaseContext(codebaseContext),
    steering,
  });
}

const DOC_PATH_MAP: Record<SpecDocument, keyof ReturnType<typeof featureSpecPaths>> = {
  requirements: 'requirements',
  'gap-analysis': 'gapAnalysis',
  design: 'design',
  tasks: 'tasks',
  bugfix: 'bugfix',
};

/** Save AI-generated document (called by MCP host after Claude/Cursor generates content) */
export async function writeSpecDocument(
  projectRoot: string,
  slug: string,
  document: SpecDocument,
  content: string,
): Promise<string> {
  const specPaths = featureSpecPaths(`${projectRoot}/.specdrive/specs`, slug);
  const key = DOC_PATH_MAP[document];
  const filePath = specPaths[key];
  if (!filePath) {
    throw new SpecDriveError(`Unknown document: ${document}`, 'INVALID_DOCUMENT');
  }
  await writeText(filePath, content);
  return filePath;
}

export { scanCodebaseContext, formatCodebaseContext };
