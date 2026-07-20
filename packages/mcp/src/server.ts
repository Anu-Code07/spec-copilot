import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { WorkflowStep } from '@specdrive/core';
import {
  findProjectRoot,
  createSpec,
  approveGate,
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
  featureSpecPaths,
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
} from '@specdrive/core';
import { cwd } from 'node:process';
import { SPECDRIVE_PACKAGE_VERSION } from '@specdrive/core';

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
        '  npm install -g @specdrive/cli@0.1.2',
        '  spec setup mcp --stack flutter',
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
    requirements: 'requirements',
    'gap-analysis': 'gap_analysis',
    gap_analysis: 'gap_analysis',
    design: 'design',
    tasks: 'tasks',
    all: 'all',
  };
  const normalized = map[gate];
  if (!normalized) throw new SpecDriveError(`Invalid gate: ${gate}`, 'INVALID_GATE');
  return normalized;
}

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
          'Scaffold a new spec (meta.yaml only). Returns a generation bundle — use YOUR host API (Cursor/Claude) to generate requirements.md, then call write_spec_document.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['feature', 'bugfix'] },
          },
          required: ['title'],
        },
      },
      {
        name: 'read_spec',
        description: 'Read spec documents (requirements, gap-analysis, design, tasks)',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            document: {
              type: 'string',
              enum: ['requirements', 'gap-analysis', 'design', 'tasks', 'meta', 'all'],
            },
          },
          required: ['slug'],
        },
      },
      {
        name: 'update_spec',
        description: 'Approve a workflow gate',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            gate: {
              type: 'string',
              enum: ['requirements', 'gap-analysis', 'gap_analysis', 'design', 'tasks', 'all'],
            },
          },
          required: ['slug', 'gate'],
        },
      },
      {
        name: 'generate_gap_analysis',
        description:
          'Return gap-analysis generation bundle. Host AI generates gap-analysis.md comparing requirements vs codebase.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'generate_design',
        description:
          'Return design generation bundle. Host AI generates design.md from requirements + gap-analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'generate_tasks',
        description:
          'Return tasks generation bundle. Host AI generates tasks.md from design + gap-analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'write_spec_document',
        description:
          'Save host AI-generated markdown to the spec folder (requirements, gap-analysis, design, tasks, bugfix)',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            document: {
              type: 'string',
              enum: ['requirements', 'gap-analysis', 'design', 'tasks', 'bugfix'],
            },
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
          'Get implementation context for the next pending task. UI tasks: Cursor/Claude implements by default; optionally prompt for Figma token (Design2Code). State/BLoC/navigation/tests always stay with host AI.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            autoFigma: {
              type: 'boolean',
              description: 'Offer optional Design2Code for UI tasks (default true). Host AI still owns UI unless user provides a token.',
            },
            figmaAction: {
              type: 'string',
              enum: ['prompt', 'use', 'skip'],
              description:
                'prompt: ask user (default) — skip = Cursor/Claude implements UI; use = run Design2Code with figmaToken.',
            },
            figmaFileKey: { type: 'string', description: 'Figma file key or URL (or .specdrive/figma.json)' },
            figmaToken: { type: 'string', description: 'Figma Personal Access Token (figd_...) when user provides it' },
          },
        },
      },
      {
        name: 'complete_task',
        description: 'Mark a task as done',
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
        description: 'Review implementation against design.md',
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
        description: 'Get steering files and project context',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_architecture',
        description: 'Read structure.md and tech-stack.md steering files',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'search_specs',
        description: 'List all specs in the project',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_spec_status',
        description: 'Get spec phase, gates, and task progress',
        inputSchema: {
          type: 'object',
          properties: { slug: { type: 'string' } },
        },
      },
      {
        name: 'figma_status',
        description:
          'Check Design2Code (figma-to-code) integration: package installed, FIGMA_TOKEN, design AST',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'figma_import',
        description:
          'Import a Figma file into .design2code/design-ast.json using Design2Code (figma-to-code)',
        inputSchema: {
          type: 'object',
          properties: {
            fileKey: { type: 'string', description: 'Figma file key or full Figma URL' },
            figmaToken: { type: 'string', description: 'Optional — defaults to FIGMA_TOKEN env' },
            outputDir: { type: 'string', description: 'Output dir under project root (default .design2code)' },
            nodeIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional Figma node IDs to import',
            },
          },
          required: ['fileKey'],
        },
      },
      {
        name: 'figma_generate',
        description:
          'Generate code from Figma or saved Design AST via Design2Code. Use mergeStrategy preview to dry-run.',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              enum: ['flutter', 'react', 'nextjs', 'react-native'],
            },
            scope: {
              type: 'string',
              enum: ['component', 'screen', 'feature', 'project'],
            },
            figmaFileKey: { type: 'string' },
            figmaToken: { type: 'string' },
            astPath: { type: 'string' },
            designSystemPath: { type: 'string' },
            mergeStrategy: {
              type: 'string',
              enum: ['create', 'merge', 'replace', 'preview'],
            },
            selection: { type: 'array', items: { type: 'string' } },
            includeTests: { type: 'boolean' },
          },
          required: ['framework', 'scope'],
        },
      },
      {
        name: 'figma_generate_for_spec',
        description:
          'Generate UI code for a SpecDrive spec using project stack + Figma. Best after design.md is approved.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            figmaFileKey: { type: 'string' },
            figmaToken: { type: 'string' },
            scope: {
              type: 'string',
              enum: ['component', 'screen', 'feature', 'project'],
            },
            mergeStrategy: {
              type: 'string',
              enum: ['create', 'merge', 'replace', 'preview'],
            },
            selection: { type: 'array', items: { type: 'string' } },
            includeTests: { type: 'boolean' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'figma_preview',
        description: 'Preview Design2Code output without writing files (mergeStrategy=preview)',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              enum: ['flutter', 'react', 'nextjs', 'react-native'],
            },
            scope: {
              type: 'string',
              enum: ['component', 'screen', 'feature', 'project'],
            },
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
        uri: `specdrive://spec/${s.slug}`,
        name: s.title,
        description: `${s.phase} — ${s.id}`,
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
    const specPaths = featureSpecPaths(paths.specs, slug);
    const parts: string[] = [];
    for (const doc of ['requirements', 'gapAnalysis', 'design', 'tasks'] as const) {
      const p = specPaths[doc];
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
            type: (a.type as 'feature' | 'bugfix') ?? 'feature',
            runtime: 'mcp',
          });
          const bundleText = result.generationBundle
            ? formatGenerationBundle(result.generationBundle)
            : null;
          return mcpJson(
            withNextSteps(
              {
                slug: result.slug,
                id: result.id,
                paths: result.paths,
                generated: result.generated,
                bundle: bundleText ? JSON.parse(bundleText) : null,
              },
              stepsAfterCreateSpec(result.slug, 'mcp'),
            ),
          );
        }
        case 'read_spec': {
          const slug = a.slug as string;
          const doc = (a.document as string) ?? 'all';
          const paths = defaultProjectPaths(root);
          const specPaths = featureSpecPaths(paths.specs, slug);
          const readDoc = async (key: 'requirements' | 'gapAnalysis' | 'design' | 'tasks' | 'meta') => {
            const p = specPaths[key];
            return (await fileExists(p)) ? await readText(p) : '';
          };
          if (doc === 'all') {
            const parts = await Promise.all(
              ([
                ['requirements', 'requirements'],
                ['gap-analysis', 'gapAnalysis'],
                ['design', 'design'],
                ['tasks', 'tasks'],
              ] as const).map(async ([label, key]) =>
                `## ${label}\n${await readDoc(key)}`,
              ),
            );
            return { content: [{ type: 'text', text: parts.join('\n\n') }] };
          }
          const keyMap: Record<string, 'requirements' | 'gapAnalysis' | 'design' | 'tasks' | 'meta'> = {
            requirements: 'requirements',
            'gap-analysis': 'gapAnalysis',
            design: 'design',
            tasks: 'tasks',
            meta: 'meta',
          };
          const key = keyMap[doc] ?? 'requirements';
          return { content: [{ type: 'text', text: await readDoc(key) }] };
        }
        case 'update_spec': {
          const gate = normalizeGate(a.gate as string);
          const meta = await approveGate(root, a.slug as string, gate);
          return mcpJson(
            withNextSteps({ meta }, stepsAfterApproveGate(meta, gate, 'mcp')),
          );
        }
        case 'generate_gap_analysis': {
          const text = await getMcpGenerationBundle(root, a.slug as string, 'gap-analysis');
          return { content: [{ type: 'text', text }] };
        }
        case 'generate_design': {
          const text = await getMcpGenerationBundle(root, a.slug as string, 'design');
          return { content: [{ type: 'text', text }] };
        }
        case 'generate_tasks': {
          const text = await getMcpGenerationBundle(root, a.slug as string, 'tasks');
          return { content: [{ type: 'text', text }] };
        }
        case 'write_spec_document': {
          const doc = a.document as SpecDocument;
          const slug = a.slug as string;
          const filePath = await writeSpecDocument(
            root,
            slug,
            doc,
            a.content as string,
          );
          return mcpJson(
            withNextSteps(
              { saved: doc, path: filePath, slug },
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
            content: [{
              type: 'text',
              text: formatCodebaseContext(ctx),
            }],
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
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                meta: status.meta,
                tasksDone: status.tasksDone,
                tasksTotal: status.tasksTotal,
              }, null, 2),
            }],
          };
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
