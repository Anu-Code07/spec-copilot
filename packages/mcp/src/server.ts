import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  findProjectRoot,
  createSpec,
  getMcpGenerationBundle,
  writeSpecDocument,
  scanCodebaseContext,
  formatCodebaseContext,
  getImplementContext,
  formatImplementContext,
  completeTask,
  listSpecs,
  getSpecStatus,
  reviewSpec,
  formatReviewReport,
  loadSteeringContent,
  readText,
  fileExists,
  resolveSpecSlug,
  defaultProjectPaths,
  resolveFeaturePaths,
  SpecDriveError,
  type GateName,
  type SpecDocument,
  formatGenerationBundle,
  importFigmaDesign,
  generateFromDesign,
  generateFigmaForSpec,
  getFigmaIntegrationStatus,
  readSpecDesignExcerpt,
  type Design2CodeFramework,
  type Design2CodeScope,
  type Design2CodeMergeStrategy,
  stepsAfterCreateSpec,
  stepsAfterDocument,
  stepsAfterApproveGate,
  stepsAfterCompleteTask,
  formatWorkflowSteps,
  type FigmaAction,
  type SpecDocument as CoreSpecDocument,
  buildSpecCreatedJourney,
  buildPhaseCheatSheet,
  buildApprovalBrief,
  applyApprovalDecision,
  documentToGate,
  type ApprovalDecision,
  SPECDRIVE_PACKAGE_VERSION,
  type WorkflowStep,
} from '@specdrive/core';
import { cwd } from 'node:process';

function mcpJson(payload: Record<string, unknown>): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

function withNextSteps<T extends Record<string, unknown>>(
  data: T,
  steps: WorkflowStep[],
): T & { nextSteps: string[] } {
  return { ...data, nextSteps: formatWorkflowSteps(steps) };
}

async function getRoot(): Promise<string> {
  const root = await findProjectRoot(cwd());
  if (!root) {
    throw new SpecDriveError(
      [
        'Not a SpecDrive project — .specdrive/config.yaml missing in workspace root.',
        '',
        'Fix (run in your app folder, then reload MCP):',
        '  npx -y @specdrive/mcp setup --stack flutter',
        '',
        `Current MCP cwd: ${cwd()}`,
      ].join('\n'),
      'NOT_INITIALIZED',
    );
  }
  return root;
}

function normalizeGate(gate: string): GateName | 'all' {
  const map: Record<string, GateName | 'all'> = {
    brief: 'brief',
    requirements: 'requirements',
    'gap-analysis': 'gap_analysis',
    gap_analysis: 'gap_analysis',
    'design-hld': 'design_hld',
    design_hld: 'design_hld',
    'design-lld': 'design_lld',
    design_lld: 'design_lld',
    design: 'design',
    tasks: 'tasks',
    maestro: 'maestro',
    all: 'all',
  };
  const normalized = map[gate];
  if (!normalized) throw new SpecDriveError(`Invalid gate: ${gate}`, 'INVALID_GATE');
  return normalized;
}

const GATE_ENUM = [
  'brief',
  'requirements',
  'gap-analysis',
  'gap_analysis',
  'design-hld',
  'design_hld',
  'design-lld',
  'design_lld',
  'design',
  'tasks',
  'maestro',
  'all',
] as const;

const DOC_ENUM = [
  'brief',
  'requirements',
  'gap-analysis',
  'design-hld',
  'design-lld',
  'design',
  'decisions',
  'tasks',
  'maestro',
  'bugfix',
  'impl-validation',
] as const;

export async function createMcpServer(): Promise<Server> {
  const server = new Server(
    { name: 'specdrive', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'create_spec',
        description:
          'Scaffold a new Kiro-style spec (spec.json under specs/features/YYYY-MM-DD-…). Returns YOUR JOURNEY + brief generation bundle. Host AI generates docs; human approves every gate.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['feature', 'bugfix', 'tech-debt'] },
            ticket: { type: 'string', description: 'Optional ticket id e.g. FRONT-3092 or JIRA-123' },
          },
          required: ['title'],
        },
      },
      {
        name: 'read_spec',
        description: 'Read spec documents (brief, requirements, gap-analysis, design-hld/lld, tasks, …)',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            document: {
              type: 'string',
              enum: ['brief', 'requirements', 'gap-analysis', 'design-hld', 'design-lld', 'design', 'decisions', 'tasks', 'maestro', 'meta', 'all'],
            },
          },
          required: ['slug'],
        },
      },
      {
        name: 'update_spec',
        description:
          'Apply a HUMAN gate decision. Requires userConfirmed=true after the user replied approve/reject/request_changes. Without userConfirmed, returns an approval brief — does NOT approve.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            gate: { type: 'string', enum: [...GATE_ENUM] },
            userConfirmed: {
              type: 'boolean',
              description: 'MUST be true only after the human explicitly approved/rejected in chat',
            },
            decision: {
              type: 'string',
              enum: ['approve', 'reject', 'request_changes'],
              description: 'Human decision. Default approve when userConfirmed.',
            },
            notes: { type: 'string', description: 'Optional user feedback for request_changes' },
          },
          required: ['slug', 'gate'],
        },
      },
      {
        name: 'request_gate_approval',
        description:
          'Build a Kiro-style approval brief + full document content for the human to read. Call after write_spec_document. Show documentContent to the user and STOP.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            gate: {
              type: 'string',
              enum: ['brief', 'requirements', 'gap-analysis', 'gap_analysis', 'design-hld', 'design_hld', 'design-lld', 'design_lld', 'tasks', 'maestro'],
            },
          },
          required: ['slug', 'gate'],
        },
      },
      {
        name: 'generate_gap_analysis',
        description:
          'Return gap-analysis generation bundle. Host AI must cite REAL files from the scan + steering — no invented modules.',
        inputSchema: {
          type: 'object',
          properties: { slug: { type: 'string' } },
          required: ['slug'],
        },
      },
      {
        name: 'generate_design_hld',
        description: 'Return design-hld (architecture / flows) generation bundle.',
        inputSchema: {
          type: 'object',
          properties: { slug: { type: 'string' } },
          required: ['slug'],
        },
      },
      {
        name: 'generate_design_lld',
        description: 'Return design-lld (classes / files / contracts) generation bundle.',
        inputSchema: {
          type: 'object',
          properties: { slug: { type: 'string' } },
          required: ['slug'],
        },
      },
      {
        name: 'generate_design',
        description: 'Legacy alias — returns design-hld bundle. Prefer generate_design_hld / generate_design_lld.',
        inputSchema: {
          type: 'object',
          properties: { slug: { type: 'string' } },
          required: ['slug'],
        },
      },
      {
        name: 'generate_tasks',
        description: 'Return tasks.md generation bundle (checkbox, file-scoped tasks).',
        inputSchema: {
          type: 'object',
          properties: { slug: { type: 'string' } },
          required: ['slug'],
        },
      },
      {
        name: 'generate_maestro',
        description: 'Optional: return maestro.md E2E semantics map bundle (UI features).',
        inputSchema: {
          type: 'object',
          properties: { slug: { type: 'string' } },
          required: ['slug'],
        },
      },
      {
        name: 'write_spec_document',
        description:
          'Save host AI-generated markdown. Returns full content + approval brief. Host AI MUST show documentContent to the user and STOP — never auto-approve.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            document: { type: 'string', enum: [...DOC_ENUM] },
            content: { type: 'string' },
          },
          required: ['slug', 'document', 'content'],
        },
      },
      {
        name: 'scan_codebase',
        description: 'Scan the repo for relevant source files and return codebase context',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            title: { type: 'string' },
          },
        },
      },
      {
        name: 'get_next_task',
        description:
          'Get implementation context for the next pending task. Requires ready_for_implementation=true. UI tasks: Cursor/Claude by default; optional Figma token.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            autoFigma: { type: 'boolean' },
            figmaAction: { type: 'string', enum: ['prompt', 'use', 'skip'] },
            figmaFileKey: { type: 'string' },
            figmaToken: { type: 'string' },
          },
        },
      },
      {
        name: 'complete_task',
        description: 'Mark a task as done (checkbox [x])',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            taskId: { type: 'string' },
          },
          required: ['slug', 'taskId'],
        },
      },
      {
        name: 'review_code',
        description: 'Review implementation against HLD/LLD + requirements',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            taskId: { type: 'string' },
            filePath: { type: 'string' },
          },
        },
      },
      {
        name: 'find_context',
        description: 'Get steering files and project context (always load before designing)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_architecture',
        description: 'Read structure.md and tech.md steering files',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'search_specs',
        description: 'List all specs in the project',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_spec_status',
        description: 'Get spec phase, gates, ready_for_implementation, and task progress + phase cheat sheet',
        inputSchema: {
          type: 'object',
          properties: { slug: { type: 'string' } },
        },
      },
      {
        name: 'figma_status',
        description: 'Check Design2Code integration: package installed, FIGMA_TOKEN, design AST',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'figma_import',
        description: 'Import a Figma file into .design2code/design-ast.json',
        inputSchema: {
          type: 'object',
          properties: {
            fileKey: { type: 'string' },
            figmaToken: { type: 'string' },
            outputDir: { type: 'string' },
            nodeIds: { type: 'array', items: { type: 'string' } },
          },
          required: ['fileKey'],
        },
      },
      {
        name: 'figma_generate',
        description: 'Generate code from Figma or saved Design AST via Design2Code',
        inputSchema: {
          type: 'object',
          properties: {
            framework: { type: 'string', enum: ['flutter', 'react', 'nextjs', 'react-native'] },
            scope: { type: 'string', enum: ['component', 'screen', 'feature', 'project'] },
            figmaFileKey: { type: 'string' },
            figmaToken: { type: 'string' },
            astPath: { type: 'string' },
            designSystemPath: { type: 'string' },
            mergeStrategy: { type: 'string', enum: ['create', 'merge', 'replace', 'preview'] },
            selection: { type: 'array', items: { type: 'string' } },
            includeTests: { type: 'boolean' },
          },
          required: ['framework', 'scope'],
        },
      },
      {
        name: 'figma_generate_for_spec',
        description: 'Generate UI code for a SpecDrive spec using project stack + Figma',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            figmaFileKey: { type: 'string' },
            figmaToken: { type: 'string' },
            scope: { type: 'string', enum: ['component', 'screen', 'feature', 'project'] },
            mergeStrategy: { type: 'string', enum: ['create', 'merge', 'replace', 'preview'] },
            selection: { type: 'array', items: { type: 'string' } },
            includeTests: { type: 'boolean' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'figma_preview',
        description: 'Preview Design2Code output without writing files',
        inputSchema: {
          type: 'object',
          properties: {
            framework: { type: 'string', enum: ['flutter', 'react', 'nextjs', 'react-native'] },
            scope: { type: 'string', enum: ['component', 'screen', 'feature', 'project'] },
            figmaFileKey: { type: 'string' },
            figmaToken: { type: 'string' },
            astPath: { type: 'string' },
          },
          required: ['framework', 'scope'],
        },
      },
    ],
  }));


  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const root = await getRoot();
    const specs = await listSpecs(root);
    return {
      resources: specs.map((s) => ({
        uri: `specdrive://spec/${s.folderName ?? s.slug}`,
        name: s.title,
        description: `${s.phase} — ${s.id}${s.ready_for_implementation ? ' (ready)' : ''}`,
        mimeType: 'text/markdown',
      })),
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const root = await getRoot();
    const match = request.params.uri.match(/^specdrive:\/\/spec\/(.+)$/);
    if (!match) throw new Error(`Unknown resource: ${request.params.uri}`);
    const slug = match[1];
    const paths = defaultProjectPaths(root);
    const specPaths = await resolveFeaturePaths(paths.specs, slug);
    const parts: string[] = [];
    for (const key of ['brief', 'requirements', 'gapAnalysis', 'designHld', 'designLld', 'tasks', 'maestro'] as const) {
      const p = specPaths[key];
      if (await fileExists(p)) {
        parts.push(await readText(p));
      }
    }
    return {
      contents: [{ uri: request.params.uri, mimeType: 'text/markdown', text: parts.join('\n\n---\n\n') }],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const root = await getRoot();
    const { name, arguments: args } = request.params;
    const a = (args ?? {}) as Record<string, unknown>;

    try {
      switch (name) {
        case 'create_spec': {
          const result = await createSpec(root, {
            title: a.title as string,
            description: a.description as string | undefined,
            type: (a.type as 'feature' | 'bugfix' | 'tech-debt') ?? 'feature',
            ticket: a.ticket as string | undefined,
            runtime: 'mcp',
          });
          const folder = result.folderName;
          const journey =
            result.journeyMarkdown ??
            buildSpecCreatedJourney({
              slug: result.slug,
              folderName: folder,
              title: a.title as string,
              type: (a.type as string) ?? 'feature',
              stack: (await getSpecStatus(root, folder)).meta.stack,
              createdFiles: [result.paths.specJson],
              ticket: a.ticket as string | undefined,
            }).userFacingMarkdown;
          const bundleText = result.generationBundle
            ? formatGenerationBundle(result.generationBundle)
            : null;
          return mcpJson(
            withNextSteps(
              {
                slug: result.slug,
                folderName: folder,
                id: result.id,
                paths: result.paths,
                journey,
                userFacingMarkdown: journey,
                generated: result.generated,
                bundle: bundleText ? JSON.parse(bundleText) : null,
              },
              stepsAfterCreateSpec(folder, 'mcp'),
            ),
          );
        }
        case 'read_spec': {
          const slug = a.slug as string;
          const doc = (a.document as string) ?? 'all';
          const paths = defaultProjectPaths(root);
          const specPaths = await resolveFeaturePaths(paths.specs, slug);
          const readDoc = async (key: keyof typeof specPaths) => {
            const p = specPaths[key];
            if (typeof p !== 'string') return '';
            return (await fileExists(p)) ? await readText(p) : '';
          };
          if (doc === 'all') {
            const parts = await Promise.all(
              (
                [
                  ['brief', 'brief'],
                  ['requirements', 'requirements'],
                  ['gap-analysis', 'gapAnalysis'],
                  ['design-hld', 'designHld'],
                  ['design-lld', 'designLld'],
                  ['tasks', 'tasks'],
                  ['maestro', 'maestro'],
                ] as const
              ).map(async ([label, key]) => `## ${label}\n${await readDoc(key)}`),
            );
            return { content: [{ type: 'text', text: parts.join('\n\n') }] };
          }
          if (doc === 'meta') {
            return { content: [{ type: 'text', text: await readDoc('specJson') }] };
          }
          const keyMap: Record<string, keyof typeof specPaths> = {
            brief: 'brief',
            requirements: 'requirements',
            'gap-analysis': 'gapAnalysis',
            'design-hld': 'designHld',
            'design-lld': 'designLld',
            design: 'design',
            decisions: 'decisions',
            tasks: 'tasks',
            maestro: 'maestro',
          };
          const key = keyMap[doc] ?? 'requirements';
          return { content: [{ type: 'text', text: await readDoc(key) }] };
        }
        case 'update_spec': {
          const gate = normalizeGate(a.gate as string);
          const slug = a.slug as string;
          const userConfirmed = a.userConfirmed === true;
          if (!userConfirmed) {
            const briefGate = gate === 'all' ? 'requirements' : gate === 'design' ? 'design_lld' : gate;
            const brief = await buildApprovalBrief(root, slug, briefGate);
            return mcpJson({
              status: 'pending_user_approval',
              message:
                'userConfirmed was not true — NOT approved. Show documentContent to the human and STOP.',
              approvalBrief: brief,
              documentContent: brief.documentContent,
              userFacingMarkdown: brief.userPromptMarkdown,
              cheatSheet: brief.cheatSheet,
              nextSteps: [
                '1. [Next] Show documentContent / userFacingMarkdown to the user',
                '2. [Next] Wait for approve | request changes | reject',
                '3. [Next] Only then call update_spec with userConfirmed: true',
              ],
            });
          }
          const decision = ((a.decision as ApprovalDecision) ?? 'approve') as ApprovalDecision;
          const result = await applyApprovalDecision(root, slug, gate, decision, {
            notes: a.notes as string | undefined,
            approvedBy: 'user',
          });
          return mcpJson(
            withNextSteps(
              {
                meta: result.meta,
                decision: result.decision,
                message: result.message,
                ready_for_implementation: result.meta.ready_for_implementation,
                cheatSheet: buildPhaseCheatSheet({
                  slug: result.meta.folderName ?? result.meta.slug,
                  meta: result.meta,
                }),
              },
              stepsAfterApproveGate(result.meta, gate, 'mcp'),
            ),
          );
        }
        case 'request_gate_approval': {
          const gate = normalizeGate(a.gate as string);
          if (gate === 'all') throw new SpecDriveError('Pick a specific gate', 'INVALID_GATE');
          const briefGate = gate === 'design' ? 'design_lld' : gate;
          const brief = await buildApprovalBrief(root, a.slug as string, briefGate);
          return mcpJson({
            ...brief,
            nextSteps: [
              '1. [Next] Show documentContent to the user and STOP',
              '2. [Next] Wait for their reply before update_spec',
            ],
          });
        }
        case 'generate_gap_analysis': {
          const text = await getMcpGenerationBundle(root, a.slug as string, 'gap-analysis');
          return { content: [{ type: 'text', text }] };
        }
        case 'generate_design_hld': {
          const text = await getMcpGenerationBundle(root, a.slug as string, 'design-hld');
          return { content: [{ type: 'text', text }] };
        }
        case 'generate_design_lld': {
          const text = await getMcpGenerationBundle(root, a.slug as string, 'design-lld');
          return { content: [{ type: 'text', text }] };
        }
        case 'generate_design': {
          const text = await getMcpGenerationBundle(root, a.slug as string, 'design-hld');
          return { content: [{ type: 'text', text }] };
        }
        case 'generate_tasks': {
          const text = await getMcpGenerationBundle(root, a.slug as string, 'tasks');
          return { content: [{ type: 'text', text }] };
        }
        case 'generate_maestro': {
          const text = await getMcpGenerationBundle(root, a.slug as string, 'maestro');
          return { content: [{ type: 'text', text }] };
        }
        case 'write_spec_document': {
          const doc = a.document as SpecDocument;
          const slug = a.slug as string;
          const filePath = await writeSpecDocument(root, slug, doc, a.content as string);
          const gate = documentToGate(doc);
          let approvalBrief = null as Awaited<ReturnType<typeof buildApprovalBrief>> | null;
          if (gate) {
            try {
              approvalBrief = await buildApprovalBrief(root, slug, gate);
            } catch {
              approvalBrief = null;
            }
          }
          const status = await getSpecStatus(root, slug);
          return mcpJson(
            withNextSteps(
              {
                saved: doc,
                path: filePath,
                slug,
                folderName: status.meta.folderName ?? slug,
                documentContent: a.content as string,
                approvalBrief,
                userFacingMarkdown: approvalBrief?.userPromptMarkdown ?? null,
                cheatSheet: buildPhaseCheatSheet({
                  slug: status.meta.folderName ?? slug,
                  meta: status.meta,
                  document: doc as CoreSpecDocument,
                }),
                stop: true,
                message:
                  'STOP — show documentContent to the human. Do NOT call update_spec until they approve.',
              },
              stepsAfterDocument(slug, doc as CoreSpecDocument, 'mcp'),
            ),
          );
        }
        case 'scan_codebase': {
          const slug = await resolveSpecSlug(root, a.slug as string | undefined);
          const status = await getSpecStatus(root, slug);
          const reqContent = (await fileExists(status.specPaths.requirements))
            ? await readText(status.specPaths.requirements)
            : undefined;
          const ctx = await scanCodebaseContext(
            root,
            status.meta.stack,
            slug,
            (a.title as string) ?? status.meta.title,
            reqContent,
          );
          return {
            content: [{ type: 'text', text: formatCodebaseContext(ctx) }],
          };
        }
        case 'get_next_task': {
          const slug = await resolveSpecSlug(root, a.slug as string | undefined);
          const result = await getImplementContext(root, {
            spec: slug,
            autoFigma: a.autoFigma !== false,
            figmaFileKey: a.figmaFileKey as string | undefined,
            figmaToken: a.figmaToken as string | undefined,
            figmaAction: (a.figmaAction as FigmaAction | undefined) ?? 'prompt',
            surface: 'mcp',
          });
          const markdown = formatImplementContext(result);
          return mcpJson(
            withNextSteps(
              {
                slug,
                taskId: result.context.task.id,
                taskTitle: result.context.task.title,
                figmaPrompt: result.figmaPrompt ?? null,
                design2code: result.design2code ?? null,
                contextMarkdown: markdown,
              },
              result.nextSteps,
            ),
          );
        }
        case 'complete_task': {
          const slug = a.slug as string;
          const taskId = a.taskId as string;
          await completeTask(root, slug, taskId);
          const status = await getSpecStatus(root, slug);
          const hasMore = status.tasksDone < status.tasksTotal;
          return mcpJson(
            withNextSteps(
              { slug, taskId, completed: true },
              stepsAfterCompleteTask(slug, taskId, 'mcp', hasMore),
            ),
          );
        }
        case 'review_code': {
          const slug = await resolveSpecSlug(root, a.slug as string | undefined);
          const report = await reviewSpec(root, slug, {
            taskId: a.taskId as string | undefined,
            filePath: a.filePath as string | undefined,
          });
          return { content: [{ type: 'text', text: formatReviewReport(report) }] };
        }
        case 'find_context': {
          const steering = await loadSteeringContent(root);
          return { content: [{ type: 'text', text: JSON.stringify(steering, null, 2) }] };
        }
        case 'read_architecture': {
          const steering = await loadSteeringContent(root);
          const text = [steering.structure, steering.techStack].filter(Boolean).join('\n\n---\n\n');
          return { content: [{ type: 'text', text }] };
        }
        case 'search_specs': {
          const specs = await listSpecs(root);
          return { content: [{ type: 'text', text: JSON.stringify(specs, null, 2) }] };
        }
        case 'get_spec_status': {
          const slug = await resolveSpecSlug(root, a.slug as string | undefined);
          const status = await getSpecStatus(root, slug);
          return mcpJson({
            meta: status.meta,
            tasksDone: status.tasksDone,
            tasksTotal: status.tasksTotal,
            ready_for_implementation: status.meta.ready_for_implementation,
            cheatSheet: buildPhaseCheatSheet({
              slug: status.meta.folderName ?? status.meta.slug,
              meta: status.meta,
            }),
          });
        }
        case 'figma_status': {
          const status = await getFigmaIntegrationStatus(root);
          return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
        }
        case 'figma_import': {
          const result = await importFigmaDesign(root, {
            fileKey: a.fileKey as string,
            figmaToken: a.figmaToken as string | undefined,
            outputDir: a.outputDir as string | undefined,
            nodeIds: a.nodeIds as string[] | undefined,
          });
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'figma_generate': {
          const result = await generateFromDesign(root, {
            framework: a.framework as Design2CodeFramework,
            scope: a.scope as Design2CodeScope,
            figmaFileKey: a.figmaFileKey as string | undefined,
            figmaToken: a.figmaToken as string | undefined,
            astPath: a.astPath as string | undefined,
            designSystemPath: a.designSystemPath as string | undefined,
            mergeStrategy: (a.mergeStrategy as Design2CodeMergeStrategy | undefined) ?? 'preview',
            selection: a.selection as string[] | undefined,
            includeTests: a.includeTests as boolean | undefined,
          });
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'figma_generate_for_spec': {
          const slug = a.slug as string;
          const designExcerpt = await readSpecDesignExcerpt(root, slug);
          const result = await generateFigmaForSpec(root, slug, {
            figmaFileKey: a.figmaFileKey as string | undefined,
            figmaToken: a.figmaToken as string | undefined,
            scope: a.scope as Design2CodeScope | undefined,
            mergeStrategy: (a.mergeStrategy as Design2CodeMergeStrategy | undefined) ?? 'merge',
            selection: a.selection as string[] | undefined,
            includeTests: a.includeTests as boolean | undefined,
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ designExcerpt, ...result }, null, 2),
            }],
          };
        }
        case 'figma_preview': {
          const result = await generateFromDesign(root, {
            framework: a.framework as Design2CodeFramework,
            scope: a.scope as Design2CodeScope,
            figmaFileKey: a.figmaFileKey as string | undefined,
            figmaToken: a.figmaToken as string | undefined,
            astPath: a.astPath as string | undefined,
            mergeStrategy: 'preview',
          });
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });

  return server;
}

export async function startMcpServer(): Promise<void> {
  if (process.stdin.isTTY) {
    console.error(`✓ SpecDrive MCP v${SPECDRIVE_PACKAGE_VERSION} ready (stdio).`);
    console.error('To wire this project for Cursor/Claude:');
    console.error('  npx -y @specdrive/mcp setup --stack flutter');
  }

  const server = await createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
