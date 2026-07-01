import type { FrontendStack } from '../domain/types.js';
import type { CodebaseContext } from '../infrastructure/codebase-scanner.js';
import { formatCodebaseContext } from '../infrastructure/codebase-scanner.js';

export type SpecDocument =
  | 'requirements'
  | 'gap-analysis'
  | 'design'
  | 'tasks'
  | 'bugfix';

export type RuntimeMode = 'cli' | 'mcp';

export interface GenerationBundle {
  mode: 'ai_assisted';
  /** Host AI (Cursor/Claude) generates the document — uses client API keys, not SpecDrive */
  runtime: 'mcp';
  document: SpecDocument;
  slug: string;
  title: string;
  stack: FrontendStack;
  systemPrompt: string;
  userPrompt: string;
  requiredSections: string[];
  inputDocuments: Record<string, string>;
  codebaseContext: CodebaseContext;
  codebaseContextFormatted: string;
  saveTool: 'write_spec_document';
  workflow: {
    afterSave: string;
    nextStep: string;
  };
}

const SECTION_SCHEMAS: Record<SpecDocument, string[]> = {
  requirements: [
    'Overview', 'User Stories', 'Acceptance Criteria (EARS)',
    'Non-Functional Requirements', 'Out of Scope',
  ],
  'gap-analysis': [
    'Executive Summary', 'Existing Code Inventory', 'Requirements Coverage Matrix',
    'Gaps to Bridge', 'Files to Create', 'Files to Modify', 'Architecture Gaps',
    'Dependencies & Risks', 'Recommended Implementation Order',
  ],
  design: [
    'User Flow', 'Screen Map', 'Component Hierarchy', 'Component Specifications',
    'Navigation', 'State Management', 'Design Tokens', 'Platform Behavior',
    'Accessibility', 'Requirement Traceability',
  ],
  tasks: ['Wave 1', 'Wave 2', 'Wave 3'],
  bugfix: [
    'Observed Behavior', 'Expected Behavior', 'Reproduction Steps',
    'Root Cause Analysis', 'Fix Approach', 'Regression Tests',
  ],
};

function buildSystemPrompt(stack: FrontendStack, document: SpecDocument): string {
  return `You are SpecDrive, a frontend spec-driven development assistant for ${stack}.
You are running inside Cursor/Claude via MCP. Use YOUR host API to generate high-quality Markdown.
Output ONLY the Markdown document body — no preamble, no wrapping code fences around the entire doc.
The document type is: ${document}. Follow the required sections exactly.
Focus on UI/UX for frontend — screens, components, navigation, state, accessibility.
Analyze the provided codebase context to make docs specific to THIS repository.`;
}

function buildUserPrompt(
  document: SpecDocument,
  title: string,
  description: string,
  sections: string[],
  inputDocuments: Record<string, string>,
  codebaseFormatted: string,
): string {
  const inputs = Object.entries(inputDocuments)
    .filter(([, v]) => v)
    .map(([k, v]) => `## ${k}\n${v}`)
    .join('\n\n');

  const docInstructions: Record<SpecDocument, string> = {
    requirements: `Generate requirements.md for feature "${title}".
Include user stories (REQ-001, REQ-002...) with EARS acceptance criteria.
Use the codebase context to avoid duplicating existing functionality.`,
    'gap-analysis': `Generate gap-analysis.md for feature "${title}".
Compare requirements against the EXISTING codebase scan below.
Identify precisely what exists vs what's missing. List every gap that must be bridged before implementation.
Be specific: name files, components, routes, state providers that exist or need creation.`,
    design: `Generate design.md UI/UX blueprint for "${title}".
Use requirements AND gap-analysis to design only what is needed.
Reference existing components from codebase where they can be reused.`,
    tasks: `Generate tasks.md with sequenced implementation tasks (TASK-001...).
Tasks must address each gap from gap-analysis and satisfy requirements.
Group into waves with dependencies.`,
    bugfix: `Generate bugfix.md for "${title}".`,
  };

  return `${docInstructions[document]}

Description: ${description}

Required sections:
${sections.map((s) => `- ${s}`).join('\n')}

${inputs ? `# Input Documents\n\n${inputs}\n\n` : ''}# Codebase Context (scan of this repo)

${codebaseFormatted}

Generate the complete ${document}.md now.`;
}

export function buildGenerationBundle(params: {
  document: SpecDocument;
  slug: string;
  title: string;
  description: string;
  stack: FrontendStack;
  inputDocuments: Record<string, string>;
  codebaseContext: CodebaseContext;
}): GenerationBundle {
  const sections = SECTION_SCHEMAS[params.document];
  const codebaseFormatted = formatCodebaseContext(params.codebaseContext);

  const afterSaveMap: Record<SpecDocument, { afterSave: string; nextStep: string }> = {
    requirements: {
      afterSave: 'Call update_spec with gate=requirements to approve',
      nextStep: 'Call generate_gap_analysis, then write_spec_document',
    },
    'gap-analysis': {
      afterSave: 'Call update_spec with gate=gap_analysis to approve',
      nextStep: 'Call generate_design, then write_spec_document',
    },
    design: {
      afterSave: 'Call update_spec with gate=design to approve',
      nextStep: 'Call generate_tasks, then write_spec_document',
    },
    tasks: {
      afterSave: 'Call update_spec with gate=tasks to approve',
      nextStep: 'Call get_next_task to begin implementation',
    },
    bugfix: {
      afterSave: 'Begin investigation',
      nextStep: 'Implement fix per bugfix.md',
    },
  };

  const workflow = afterSaveMap[params.document];

  return {
    mode: 'ai_assisted',
    runtime: 'mcp',
    document: params.document,
    slug: params.slug,
    title: params.title,
    stack: params.stack,
    systemPrompt: buildSystemPrompt(params.stack, params.document),
    userPrompt: buildUserPrompt(
      params.document,
      params.title,
      params.description,
      sections,
      params.inputDocuments,
      codebaseFormatted,
    ),
    requiredSections: sections,
    inputDocuments: params.inputDocuments,
    codebaseContext: params.codebaseContext,
    codebaseContextFormatted: codebaseFormatted,
    saveTool: 'write_spec_document',
    workflow,
  };
}

export function formatGenerationBundle(bundle: GenerationBundle): string {
  return JSON.stringify({
    mode: bundle.mode,
    runtime: bundle.runtime,
    document: bundle.document,
    slug: bundle.slug,
    title: bundle.title,
    stack: bundle.stack,
    requiredSections: bundle.requiredSections,
    systemPrompt: bundle.systemPrompt,
    userPrompt: bundle.userPrompt,
    codebaseSummary: bundle.codebaseContext.summary,
    relevantFileCount: bundle.codebaseContext.relevantFiles.length,
    saveTool: bundle.saveTool,
    workflow: bundle.workflow,
    instructions: [
      '1. Use YOUR API (Cursor/Claude) to generate the document from userPrompt',
      `2. Call write_spec_document with slug="${bundle.slug}" document="${bundle.document}" content=<generated markdown>`,
      `3. ${bundle.workflow.afterSave}`,
      `4. ${bundle.workflow.nextStep}`,
    ],
  }, null, 2);
}
