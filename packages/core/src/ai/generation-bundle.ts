import type { FrontendStack } from '../domain/types.js';
import type { CodebaseContext } from '../infrastructure/codebase-scanner.js';
import { formatCodebaseContext } from '../infrastructure/codebase-scanner.js';

/** Kiro-aligned documents — generic for any repo */
export type SpecDocument =
  | 'brief'
  | 'requirements'
  | 'gap-analysis'
  | 'design-hld'
  | 'design-lld'
  | 'design'
  | 'decisions'
  | 'tasks'
  | 'maestro'
  | 'bugfix'
  | 'impl-validation';

export type RuntimeMode = 'cli' | 'mcp';

export interface GenerationBundle {
  mode: 'ai_assisted';
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
  brief: [
    'Problem',
    'Goals',
    'Scope In',
    'Scope Out',
    'Proposed Approach',
    'Open Questions',
  ],
  requirements: [
    'Overview',
    'User Stories',
    'Acceptance Criteria (EARS)',
    'Non-Functional Requirements',
    'Out of Scope',
  ],
  'gap-analysis': [
    'Executive Summary',
    'Existing Code Inventory',
    'Requirements Coverage Matrix',
    'Gaps to Bridge',
    'Files to Create',
    'Files to Modify',
    'Architecture Gaps',
    'Dependencies & Risks',
    'Recommended Implementation Order',
  ],
  'design-hld': [
    'Context',
    'Architecture Overview',
    'User Flows',
    'Screen / Module Map',
    'Cross-cutting Concerns',
    'Requirement Traceability',
  ],
  'design-lld': [
    'Concrete Types / Classes',
    'File Map',
    'Interfaces & Contracts',
    'State Machines',
    'Navigation / Routing',
    'Error Handling',
    'Accessibility / Semantics',
    'Requirement Traceability',
  ],
  design: [
    'User Flow',
    'Screen Map',
    'Component Hierarchy',
    'State Management',
    'Accessibility',
    'Requirement Traceability',
  ],
  decisions: ['Decision', 'Context', 'Options', 'Outcome', 'Consequences'],
  tasks: ['Wave 1', 'Wave 2', 'Wave 3'],
  maestro: [
    'Flows Covered',
    'Semantics IDs',
    'Happy Paths',
    'Edge Cases',
    'Mapping to Requirements',
  ],
  bugfix: [
    'Observed Behavior',
    'Expected Behavior',
    'Reproduction Steps',
    'Root Cause Analysis',
    'Fix Approach',
    'Regression Tests',
  ],
  'impl-validation': [
    'Checklist',
    'Requirement Coverage',
    'Design Compliance',
    'Open Follow-ups',
  ],
};

function buildSystemPrompt(stack: FrontendStack, document: SpecDocument): string {
  const stackRules: Record<FrontendStack, string> = {
    flutter:
      'Flutter: follow THIS repo\'s steering (structure.md + coding-style.md). Prefer Clean Architecture + BLoC when steering says so. Never invent a fake lib/features/<title>/ if steering points elsewhere.',
    nextjs:
      'Next.js: follow THIS repo\'s steering for App Router / feature modules. Thin pages; domain/data separation when steering requires it.',
    'react-native':
      'React Native: follow THIS repo\'s steering for screens/features. Domain must not import RN modules when steering says so.',
  };

  return `You are SpecDrive, a frontend spec-driven development assistant for ${stack}.
You are running inside Cursor/Claude via MCP. Use YOUR host API to generate high-quality Markdown.
Output ONLY the Markdown document body — no preamble, no wrapping code fences around the entire doc.
Document type: ${document}. Follow the required sections exactly.

CRITICAL (any repo):
1. ALWAYS load and obey .specdrive/steering/* (or legacy flat steering files) — they are the source of truth for package layout, architecture, and conventions.
2. Target the CORRECT package/path from structure.md — never invent scaffold folders at the wrong repo root.
3. Gap analysis and LLD must cite REAL files from the codebase scan — do not invent modules.
4. Tasks must be small, file-scoped, and use markdown checkboxes (- [ ] / - [x]).
5. Keep docs specific to THIS repository.

Stack hint: ${stackRules[stack]}`;
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
    brief: `Generate brief.md for "${title}".
Problem statement, goals, scope in/out, proposed approach, open questions.
Keep it short — this is the kickoff artifact humans approve first.`,
    requirements: `Generate requirements.md for feature "${title}".
Include user stories (REQ-001…) with EARS acceptance criteria.
Use codebase context to avoid duplicating existing functionality.`,
    'gap-analysis': `Generate gap-analysis.md for "${title}".
Compare requirements against the EXISTING codebase scan below.
Cite real file paths and symbols. List gaps precisely. Do NOT invent modules that are not in the scan or steering.`,
    'design-hld': `Generate design-hld.md (high-level design) for "${title}".
Architecture overview, flows, module map. Align with steering structure/tech. No invented packages.`,
    'design-lld': `Generate design-lld.md (low-level design) for "${title}".
Concrete classes/files/interfaces under the paths from HLD + steering. Cite real existing files to extend.`,
    design: `Generate combined design.md for "${title}" (legacy). Prefer HLD+LLD when possible.`,
    decisions: `Generate decisions.md ADRs/tradeoffs for "${title}".`,
    tasks: `Generate tasks.md with sequenced checkbox tasks.
Format each task as:
### TASK-00N: Title
- [ ] Done
- **Files:** real/path/from/repo.ext
- **Status:** pending
Tag UI vs logic in titles. One small change per task. No invented paths.`,
    maestro: `Generate maestro.md E2E semantics map for UI feature "${title}".
Map flows to semantics IDs used (or to-be-added) in this repo's test conventions from steering.`,
    bugfix: `Generate bugfix.md for "${title}".`,
    'impl-validation': `Generate impl-validation.md checklist for "${title}".`,
  };

  return `${docInstructions[document]}

Description: ${description}

Required sections:
${sections.map((s) => `- ${s}`).join('\n')}

${inputs ? `# Input Documents\n\n${inputs}\n\n` : ''}# Codebase Context (scan of this repo)

${codebaseFormatted}

Generate the complete ${document} document now.`;
}

function workflowFor(document: SpecDocument): { afterSave: string; nextStep: string } {
  const stop = (name: string) =>
    `STOP. Show the full ${name} to the human. Ask: approve / request changes / reject. Do NOT call update_spec until they approve.`;

  const map: Record<SpecDocument, { afterSave: string; nextStep: string }> = {
    brief: {
      afterSave: stop('brief.md'),
      nextStep:
        'After approve: update_spec { userConfirmed: true, gate: "brief" }. Then generate requirements (write_spec_document requirements).',
    },
    requirements: {
      afterSave: stop('requirements.md'),
      nextStep:
        'After approve: update_spec { userConfirmed: true, gate: "requirements" }. Then generate_gap_analysis.',
    },
    'gap-analysis': {
      afterSave: stop('gap-analysis.md'),
      nextStep:
        'After approve: update_spec { userConfirmed: true, gate: "gap-analysis" }. Then generate_design_hld.',
    },
    'design-hld': {
      afterSave: stop('design-hld.md'),
      nextStep:
        'After approve: update_spec { userConfirmed: true, gate: "design-hld" }. Then generate_design_lld.',
    },
    'design-lld': {
      afterSave: stop('design-lld.md'),
      nextStep:
        'After approve: update_spec { userConfirmed: true, gate: "design-lld" }. Then generate_tasks.',
    },
    design: {
      afterSave: stop('design.md'),
      nextStep:
        'After approve: update_spec { userConfirmed: true, gate: "design-lld" }. Then generate_tasks.',
    },
    decisions: {
      afterSave: 'Show decisions.md (usually with LLD). Ask user to acknowledge.',
      nextStep: 'Continue LLD approval / generate_tasks as appropriate.',
    },
    tasks: {
      afterSave: stop('tasks.md'),
      nextStep:
        'After approve: update_spec { userConfirmed: true, gate: "tasks" }. If UI feature, optional generate_maestro; else get_next_task when ready_for_implementation=true.',
    },
    maestro: {
      afterSave: stop('maestro.md'),
      nextStep:
        'After approve: update_spec { userConfirmed: true, gate: "maestro" }. Then get_next_task.',
    },
    bugfix: {
      afterSave: 'Show bugfix.md to the user, then begin investigation',
      nextStep: 'Implement fix per bugfix.md',
    },
    'impl-validation': {
      afterSave: 'Show impl-validation.md and walk through checklist with the user',
      nextStep: 'Mark remaining follow-ups or close the spec',
    },
  };
  return map[document];
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
    workflow: workflowFor(params.document),
  };
}

export function formatGenerationBundle(bundle: GenerationBundle): string {
  return JSON.stringify(
    {
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
    },
    null,
    2,
  );
}
