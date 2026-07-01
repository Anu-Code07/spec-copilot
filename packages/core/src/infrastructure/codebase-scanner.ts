import { readdir, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import type { FrontendStack } from '../domain/types.js';
import { stackSourceRoot } from '../domain/paths.js';

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.specdrive', 'dist', 'build', '.turbo',
  'coverage', '.dart_tool', 'ios', 'android', '.next',
]);

const CODE_EXTENSIONS = new Set([
  '.dart', '.tsx', '.ts', '.jsx', '.js', '.vue', '.kt', '.swift',
]);

export interface CodeFileSummary {
  path: string;
  lines: number;
  snippet: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface CodebaseContext {
  scannedAt: string;
  stack: FrontendStack;
  sourceRoot: string;
  totalFiles: number;
  relevantFiles: CodeFileSummary[];
  existingFeatures: string[];
  summary: string;
}

async function walkCodeFiles(root: string, maxFiles = 400): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string) {
    if (files.length >= maxFiles) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (CODE_EXTENSIONS.has(extname(entry.name))) files.push(full);
    }
  }

  await walk(root);
  return files;
}

function keywordsFromFeature(slug: string, title: string): string[] {
  const fromSlug = slug.split('-').filter((w) => w.length > 2);
  const fromTitle = title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  return [...new Set([...fromSlug, ...fromTitle])];
}

function scoreRelevance(content: string, path: string, keywords: string[]): number {
  const lower = (content + path).toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) score += 2;
  }
  if (path.includes(stackSourceRoot('flutter').split('/')[0])) score += 1;
  return score;
}

function extractFeatureDirs(files: string[], sourceRoot: string): string[] {
  const features = new Set<string>();
  for (const f of files) {
    const match = f.match(new RegExp(`${sourceRoot.replace(/\//g, '[/\\\\]')}[/\\\\]([^/\\\\]+)`));
    if (match) features.add(match[1]);
  }
  return [...features].slice(0, 20);
}

export async function scanCodebaseContext(
  projectRoot: string,
  stack: FrontendStack,
  slug: string,
  title: string,
  requirementsContent?: string,
): Promise<CodebaseContext> {
  const keywords = keywordsFromFeature(slug, title);
  if (requirementsContent) {
    const reqWords = requirementsContent
      .toLowerCase()
      .match(/\b[a-z]{4,}\b/g)?.slice(0, 15) ?? [];
    keywords.push(...reqWords.filter((w) => !keywords.includes(w)));
  }

  const allFiles = await walkCodeFiles(projectRoot);
  const sourceRoot = stackSourceRoot(stack);
  const scored: CodeFileSummary[] = [];

  for (const file of allFiles) {
    const rel = relative(projectRoot, file);
    let content = '';
    try {
      content = await readFile(file, 'utf-8');
    } catch {
      continue;
    }
    const score = scoreRelevance(content, rel, keywords);
    if (score === 0 && !rel.includes(sourceRoot.split('/')[0])) continue;

    const lines = content.split('\n');
    const snippet = lines.slice(0, 40).join('\n');
    scored.push({
      path: rel,
      lines: lines.length,
      snippet: snippet.length > 1500 ? snippet.slice(0, 1500) + '\n...' : snippet,
      relevance: score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low',
    });
  }

  scored.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.relevance] - order[b.relevance];
  });

  const relevant = scored.slice(0, 15);
  const existingFeatures = extractFeatureDirs(allFiles, sourceRoot);

  const summary = [
    `Scanned ${allFiles.length} source files.`,
    `Found ${relevant.length} files relevant to "${title}".`,
    existingFeatures.length
      ? `Existing feature folders: ${existingFeatures.join(', ')}`
      : 'No existing feature folders detected.',
  ].join(' ');

  return {
    scannedAt: new Date().toISOString(),
    stack,
    sourceRoot,
    totalFiles: allFiles.length,
    relevantFiles: relevant,
    existingFeatures,
    summary,
  };
}

export function formatCodebaseContext(ctx: CodebaseContext): string {
  const lines = [
    `# Codebase Context`,
    '',
    ctx.summary,
    '',
    `**Stack:** ${ctx.stack} | **Source root:** ${ctx.sourceRoot}`,
    '',
    '## Relevant Files',
    '',
  ];

  for (const f of ctx.relevantFiles) {
    lines.push(`### ${f.path} (${f.relevance}, ${f.lines} lines)`);
    lines.push('```');
    lines.push(f.snippet);
    lines.push('```');
    lines.push('');
  }

  if (ctx.existingFeatures.length) {
    lines.push('## Existing Feature Modules');
    lines.push(ctx.existingFeatures.map((f) => `- ${f}`).join('\n'));
  }

  return lines.join('\n');
}
