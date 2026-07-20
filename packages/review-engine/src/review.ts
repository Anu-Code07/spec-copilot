import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { ReviewFinding, ReviewReport, ReviewOptions } from './types.js';
import { parseRequirements, parseTasks } from './parse.js';

async function walkDir(dir: string, files: string[] = []): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (entry.isDirectory()) await walkDir(full, files);
      else files.push(full);
    }
  } catch {
    // directory may not exist
  }
  return files;
}

function extractComponents(designContent: string): string[] {
  const names = new Set<string>();
  const lines = designContent.split('\n');
  for (const line of lines) {
    const treeMatch = line.match(/^[│├└──\s]*([A-Z][A-Za-z0-9]+)/);
    if (treeMatch) names.add(treeMatch[1]);
    const headingMatch = line.match(/^### ([A-Z][A-Za-z0-9]+)/);
    if (headingMatch) names.add(headingMatch[1]);
  }
  return [...names].filter((n) => !['Screen', 'Map', 'Flow', 'Management'].includes(n));
}

function extractFilePaths(tasksContent: string): string[] {
  const paths: string[] = [];
  const matches = tasksContent.matchAll(/`([^`]+\.(dart|tsx|ts|jsx|js))`/g);
  for (const m of matches) paths.push(m[1]);
  return paths;
}

export async function runReview(
  projectRoot: string,
  specPaths: {
    dir: string;
    requirements: string;
    design: string;
    tasks: string;
  },
  meta: { slug: string; title: string; requirements: string[] },
  options: ReviewOptions = { specSlug: meta.slug },
): Promise<ReviewReport> {
  const findings: ReviewFinding[] = [];
  let findingId = 1;

  const add = (
    severity: ReviewFinding['severity'],
    category: ReviewFinding['category'],
    message: string,
    extra?: Partial<ReviewFinding>,
  ) => {
    findings.push({
      id: `FIND-${String(findingId++).padStart(3, '0')}`,
      severity,
      category,
      message,
      ...extra,
    });
  };

  let requirementsContent = '';
  let designContent = '';
  let tasksContent = '';

  try {
    requirementsContent = await readFile(specPaths.requirements, 'utf-8');
  } catch {
    add('error', 'requirements', 'requirements.md not found');
  }

  try {
    designContent = await readFile(specPaths.design, 'utf-8');
  } catch {
    // Prefer HLD+LLD (Kiro-style) when legacy design.md is absent
    const parts: string[] = [];
    for (const key of ['designHld', 'designLld'] as const) {
      const p = (specPaths as Record<string, string>)[key];
      if (!p) continue;
      try {
        parts.push(await readFile(p, 'utf-8'));
      } catch {
        // missing
      }
    }
    if (parts.length) {
      designContent = parts.join('\n\n');
    } else {
      add('error', 'design', 'design-hld.md / design-lld.md / design.md not found — run spec design');
    }
  }

  try {
    tasksContent = await readFile(specPaths.tasks, 'utf-8');
  } catch {
    add('warning', 'testing', 'tasks.md not found');
  }

  const parsedReqs = requirementsContent ? parseRequirements(requirementsContent) : [];
  const parsedTasks = tasksContent ? parseTasks(tasksContent) : [];

  for (const reqId of meta.requirements) {
    if (!parsedReqs.find((r) => r.id === reqId)) {
      add('warning', 'requirements', `Requirement ${reqId} listed in meta but missing from requirements.md`, {
        requirement: reqId,
      });
    }
  }

  if (designContent) {
    if (!designContent.includes('## Accessibility') && !designContent.toLowerCase().includes('accessibility')) {
      add('warning', 'accessibility', 'design.md missing Accessibility section');
    }
    if (!designContent.includes('Traceability') && !designContent.includes('Requirement')) {
      add('info', 'design', 'design.md missing Requirement Traceability table');
    }

    const components = extractComponents(designContent);
    const sourceFiles = await walkDir(projectRoot);
    const sourceText = await Promise.all(
      sourceFiles
        .filter((f) => /\.(dart|tsx|ts|jsx|js)$/.test(f))
        .slice(0, 500)
        .map(async (f) => {
          try {
            return await readFile(f, 'utf-8');
          } catch {
            return '';
          }
        }),
    );
    const combined = sourceText.join('\n');

    for (const component of components.slice(0, 15)) {
      if (!combined.includes(component)) {
        add('warning', 'design', `Component "${component}" in design.md not found in source code`, {
          file: component,
        });
      } else {
        add('info', 'design', `Component "${component}" found in source`, { file: component });
      }
    }
  }

  if (tasksContent) {
    const pending = parsedTasks.filter((t) => t.status === 'pending').length;
    const done = parsedTasks.filter((t) => t.status === 'done').length;
    add('info', 'testing', `Tasks: ${done} done, ${pending} pending`);

    for (const task of parsedTasks) {
      if (options.taskId && task.id !== options.taskId) continue;
      for (const filePath of extractFilePaths(tasksContent)) {
        const full = join(projectRoot, filePath);
        try {
          await stat(full);
          add('info', 'files', `Task ${task.id} file exists: ${filePath}`, { file: filePath });
        } catch {
          if (task.status === 'done') {
            add('error', 'files', `Task ${task.id} marked done but file missing: ${filePath}`, {
              file: filePath,
            });
          } else {
            add('info', 'files', `Task ${task.id} file not yet created: ${filePath}`, {
              file: filePath,
            });
          }
        }
      }
    }
  }

  if (options.filePath) {
    const rel = relative(projectRoot, options.filePath);
    if (designContent && !designContent.includes(rel.split('/').pop()?.replace(/\.\w+$/, '') ?? '')) {
      add('info', 'files', `Reviewing file: ${rel}`, { file: rel });
    }
  }

  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;
  const passed = errors === 0;
  const score = Math.max(0, 100 - errors * 20 - warnings * 5);

  return {
    specSlug: meta.slug,
    specTitle: meta.title,
    timestamp: new Date().toISOString(),
    passed,
    score,
    findings,
    summary: passed
      ? `Review passed with ${warnings} warning(s). Score: ${score}/100`
      : `Review failed: ${errors} error(s), ${warnings} warning(s). Score: ${score}/100`,
  };
}

export function formatReviewReport(report: ReviewReport): string {
  const lines = [
    `# Review: ${report.specTitle}`,
    '',
    `**Date:** ${report.timestamp}`,
    `**Result:** ${report.passed ? 'PASSED ✓' : 'FAILED ✗'}`,
    `**Score:** ${report.score}/100`,
    '',
    report.summary,
    '',
    '## Findings',
    '',
  ];

  for (const f of report.findings) {
    const icon = f.severity === 'error' ? '❌' : f.severity === 'warning' ? '⚠️' : 'ℹ️';
    lines.push(`- ${icon} **[${f.category}]** ${f.message}`);
  }

  return lines.join('\n');
}
