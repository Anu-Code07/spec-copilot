import { mkdir } from 'node:fs/promises';
import type { FrontendStack } from '../domain/types.js';
import { defaultProjectPaths, defaultSteeringPaths } from '../domain/paths.js';
import { fileExists, writeText } from '../infrastructure/files.js';
import {
  configYaml,
  productMd,
  techStackMd,
  structureMd,
  codingStyleMd,
} from '../templates/steering.js';

export class SpecDriveError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'SpecDriveError';
  }
}

export async function initProject(
  projectRoot: string,
  stack: FrontendStack,
): Promise<{ paths: ReturnType<typeof defaultProjectPaths> }> {
  const paths = defaultProjectPaths(projectRoot);
  const steering = defaultSteeringPaths(paths.specdrive);

  if (await fileExists(paths.config)) {
    throw new SpecDriveError(
      'SpecDrive already initialized. .specdrive/config.yaml exists.',
      'ALREADY_INITIALIZED',
    );
  }

  await mkdir(paths.specs, { recursive: true });
  await mkdir(paths.features, { recursive: true });
  await mkdir(paths.bugs, { recursive: true });
  await mkdir(`${paths.specs}/tech-debt`, { recursive: true });
  await mkdir(paths.decisions, { recursive: true });
  await mkdir(paths.reviews, { recursive: true });
  await mkdir(paths.steering, { recursive: true });
  await mkdir(`${paths.steering}/verticals`, { recursive: true });

  await writeText(paths.config, configYaml(stack));
  await writeText(steering.product, productMd());
  await writeText(steering.techStack, techStackMd(stack));
  await writeText(steering.structure, structureMd(stack));
  await writeText(steering.codingStyle, codingStyleMd(stack));
  await writeText(
    `${paths.steering}/README.md`,
    `# Steering (source of truth)

Edit these files for YOUR repository before generating specs:

- \`product.md\` — product vision / users
- \`tech.md\` — real tech stack (state mgmt, DI, routing, testing)
- \`structure.md\` — real package/folder layout (cite actual paths)
- \`coding-style.md\` — architecture & review rules
- \`verticals/*.md\` — optional domain-specific notes

Gap analysis, HLD/LLD, and tasks must follow these files — never invent scaffold folders.
`,
  );

  return { paths };
}

export interface DoctorIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
}

export async function doctorProject(projectRoot: string): Promise<DoctorIssue[]> {
  const paths = defaultProjectPaths(projectRoot);
  const steering = defaultSteeringPaths(paths.specdrive);
  const issues: DoctorIssue[] = [];

  if (!(await fileExists(paths.config))) {
    issues.push({ level: 'error', message: 'Missing .specdrive/config.yaml — run spec init' });
    return issues;
  }

  for (const [name, filePath] of Object.entries(steering)) {
    if (!(await fileExists(filePath))) {
      issues.push({ level: 'warning', message: `Missing steering file: ${name} (${filePath})` });
    }
  }

  if (!(await fileExists(paths.specs))) {
    issues.push({ level: 'warning', message: 'Missing specs/ directory' });
  }

  const { ensureProfileEnvHydrated, hasAnyLlmApiKey, getPrimaryShellProfilePath } =
    await import('../infrastructure/shell-profile-env.js');
  await ensureProfileEnvHydrated();

  if (process.env.SPECDRIVE_LLM_OFFLINE === '1') {
    issues.push({ level: 'info', message: 'LLM: offline templates (SPECDRIVE_LLM_OFFLINE=1)' });
  } else if (hasAnyLlmApiKey()) {
    const backend = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      ? 'Gemini'
      : 'Groq';
    issues.push({ level: 'info', message: `LLM: ${backend} API key configured` });
  } else if (process.env.SPECDRIVE_USE_OLLAMA === '1') {
    issues.push({ level: 'info', message: 'LLM: Ollama mode (SPECDRIVE_USE_OLLAMA=1)' });
  } else {
    issues.push({
      level: 'warning',
      message: `LLM: no API key — add GEMINI_API_KEY to ${getPrimaryShellProfilePath()} or run with --api-key`,
    });
  }

  if (issues.every((i) => i.level === 'info')) {
    issues.unshift({ level: 'info', message: 'SpecDrive project is healthy' });
  }

  const { getCursorSetupStatus } = await import('../integrations/cursor-setup-service.js');
  const cursor = await getCursorSetupStatus(projectRoot);
  if (!cursor.mcpConfigured) {
    issues.push({
      level: 'warning',
      message: 'Cursor MCP not configured — run `spec setup cursor`',
    });
  } else {
    issues.push({ level: 'info', message: 'Cursor MCP configured (.cursor/mcp.json)' });
  }

  return issues;
}
