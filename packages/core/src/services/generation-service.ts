import type { SpecDocument, GenerationBundle } from '../ai/generation-bundle.js';
import { buildGenerationBundle, formatGenerationBundle } from '../ai/generation-bundle.js';
import { scanCodebaseContext, formatCodebaseContext } from '../infrastructure/codebase-scanner.js';
import { createGenerationProvider } from '../ai/index.js';
import type { GenerationInput } from '../ai/types.js';
import type { FeatureSpecMeta } from '../domain/types.js';
import { loadSteeringContent } from './steering-service.js';
import {
  readText,
  writeText,
  fileExists,
  loadConfig,
  loadMeta,
  saveMeta,
  resolveFeaturePaths,
} from '../infrastructure/files.js';
import { defaultProjectPaths } from '../domain/paths.js';
import { SpecDriveError } from './project-service.js';
import { documentToGate } from './approval-service.js';
import { todayIso } from '../utils/format.js';
import { parseRequirements, parseTasks } from '../utils/parse.js';

/** MCP: returns bundle for host AI (Claude/Cursor API). Does NOT call any LLM. */
export async function getGenerationBundle(
  projectRoot: string,
  meta: FeatureSpecMeta,
  document: SpecDocument,
  folderOrSlug?: string,
): Promise<GenerationBundle> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(
    paths.specs,
    folderOrSlug ?? meta.folderName ?? meta.slug,
  );
  const steering = await loadSteeringContent(projectRoot);

  const readIf = async (p: string) => ((await fileExists(p)) ? await readText(p) : '');

  const inputDocuments: Record<string, string> = {
    brief: await readIf(specPaths.brief),
    requirements: await readIf(specPaths.requirements),
    'gap-analysis': await readIf(specPaths.gapAnalysis),
    'design-hld': await readIf(specPaths.designHld),
    'design-lld': await readIf(specPaths.designLld),
    design: await readIf(specPaths.design),
    decisions: await readIf(specPaths.decisions),
    ...Object.fromEntries(Object.entries(steering).map(([k, v]) => [`steering:${k}`, v ?? ''])),
  };

  const codebaseContext = await scanCodebaseContext(
    projectRoot,
    meta.stack,
    meta.slug,
    meta.title,
    inputDocuments.requirements || undefined,
  );

  return buildGenerationBundle({
    document,
    slug: meta.folderName ?? meta.slug,
    title: meta.title,
    description: meta.description ?? meta.title,
    stack: meta.stack,
    inputDocuments,
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
  kind: GenerationInput['kind'] | SpecDocument,
): Promise<string> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, meta.folderName ?? meta.slug);
  const steering = await loadSteeringContent(projectRoot);
  await loadConfig(projectRoot);

  const readIf = async (p: string) => ((await fileExists(p)) ? await readText(p) : undefined);

  const codebaseContext = await scanCodebaseContext(
    projectRoot,
    meta.stack,
    meta.slug,
    meta.title,
    await readIf(specPaths.requirements),
  );

  const provider = createGenerationProvider('cli');

  // Map new doc kinds onto generation provider kinds when needed
  const providerKind = ((): GenerationInput['kind'] => {
    if (kind === 'design-hld' || kind === 'design-lld' || kind === 'design') return 'design';
    if (kind === 'brief' || kind === 'maestro' || kind === 'decisions' || kind === 'impl-validation') {
      return 'requirements'; // template fallback path; bundle/prompts carry real intent in MCP
    }
    return kind as GenerationInput['kind'];
  })();

  return provider.generate({
    kind: providerKind,
    title: meta.title,
    description: meta.description ?? meta.title,
    stack: meta.stack,
    slug: meta.slug,
    requirementsContent: await readIf(specPaths.requirements),
    gapAnalysisContent: await readIf(specPaths.gapAnalysis),
    designContent:
      (await readIf(specPaths.designLld)) ||
      (await readIf(specPaths.designHld)) ||
      (await readIf(specPaths.design)),
    steering,
    codebaseContextFormatted: formatCodebaseContext(codebaseContext),
  });
}

const DOC_PATH_KEY: Record<SpecDocument, keyof Awaited<ReturnType<typeof resolveFeaturePaths>>> = {
  brief: 'brief',
  requirements: 'requirements',
  'gap-analysis': 'gapAnalysis',
  'design-hld': 'designHld',
  'design-lld': 'designLld',
  design: 'design',
  decisions: 'decisions',
  tasks: 'tasks',
  maestro: 'maestro',
  bugfix: 'bugfix',
  'impl-validation': 'implValidation',
};

/** Save AI-generated document (called by MCP host after Claude/Cursor generates content) */
export async function writeSpecDocument(
  projectRoot: string,
  slug: string,
  document: SpecDocument,
  content: string,
): Promise<string> {
  const paths = defaultProjectPaths(projectRoot);
  const specPaths = await resolveFeaturePaths(paths.specs, slug);
  const key = DOC_PATH_KEY[document];
  const filePath = specPaths[key];
  if (!filePath || typeof filePath !== 'string') {
    throw new SpecDriveError(`Unknown document: ${document}`, 'INVALID_DOCUMENT');
  }
  await writeText(filePath, content);

  // Keep legacy design.md in sync when HLD/LLD written
  if (document === 'design-hld' || document === 'design-lld') {
    const hld = (await fileExists(specPaths.designHld))
      ? await readText(specPaths.designHld)
      : '';
    const lld = (await fileExists(specPaths.designLld))
      ? await readText(specPaths.designLld)
      : '';
    if (hld || lld) {
      await writeText(
        specPaths.design,
        [hld && `<!-- design-hld -->\n${hld}`, lld && `<!-- design-lld -->\n${lld}`]
          .filter(Boolean)
          .join('\n\n---\n\n'),
      );
    }
  }

  if ((await fileExists(specPaths.specJson)) || (await fileExists(`${specPaths.dir}/meta.yaml`))) {
    const meta = await loadMeta(
      (await fileExists(specPaths.specJson)) ? specPaths.specJson : `${specPaths.dir}/meta.yaml`,
    );
    meta.updated = todayIso();
    meta.artifacts = meta.artifacts ?? {};

    if (document === 'brief') meta.artifacts.brief = true;
    if (document === 'requirements') {
      meta.requirements = parseRequirements(content).map((r) => r.id);
      meta.artifacts.requirements = true;
    }
    if (document === 'gap-analysis') meta.artifacts.gapAnalysis = true;
    if (document === 'design-hld') meta.artifacts.designHld = true;
    if (document === 'design-lld') meta.artifacts.designLld = true;
    if (document === 'decisions') meta.artifacts.decisions = true;
    if (document === 'maestro') meta.artifacts.maestro = true;
    if (document === 'tasks') {
      const parsed = parseTasks(content).map((t) => t.id);
      meta.tasks = parsed.length
        ? parsed
        : [...content.matchAll(/TASK-\d{3}/g)].map((m) => m[0]);
      meta.artifacts.tasks = true;
    }

    const gate = documentToGate(document);
    if (gate && meta.gates[gate]) {
      meta.gates[gate] = {
        ...meta.gates[gate]!,
        generated: true,
        status: meta.gates[gate]!.status === 'approved' ? 'approved' : 'pending',
        approved: meta.gates[gate]!.status === 'approved',
      };
    }

    await saveMeta(specPaths.specJson, meta);
  }

  return filePath;
}

export { scanCodebaseContext, formatCodebaseContext };
