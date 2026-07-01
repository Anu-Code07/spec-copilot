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
  approveGate,
  generateDesign,
  generateTasks,
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
} from '@specdrive/core';
import { cwd } from 'node:process';

async function getRoot(): Promise<string> {
  const root = await findProjectRoot(cwd());
  if (!root) throw new SpecDriveError('Not a SpecDrive project', 'NOT_INITIALIZED');
  return root;
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
        description: 'Create a new feature spec with requirements.md',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            quick: { type: 'boolean' },
            type: { type: 'string', enum: ['feature', 'bugfix'] },
          },
          required: ['title'],
        },
      },
      {
        name: 'read_spec',
        description: 'Read spec documents (requirements, design, tasks)',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            document: { type: 'string', enum: ['requirements', 'design', 'tasks', 'meta', 'all'] },
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
            gate: { type: 'string', enum: ['requirements', 'design', 'tasks', 'all'] },
          },
          required: ['slug', 'gate'],
        },
      },
      {
        name: 'generate_design',
        description: 'Generate design.md from approved requirements',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            regenerate: { type: 'boolean' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'generate_tasks',
        description: 'Generate tasks.md from approved design',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            regenerate: { type: 'boolean' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'get_next_task',
        description: 'Get implementation context for the next pending task',
        inputSchema: {
          type: 'object',
          properties: { slug: { type: 'string' } },
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
    for (const doc of ['requirements', 'design', 'tasks'] as const) {
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
            quick: a.quick as boolean | undefined,
            type: (a.type as 'feature' | 'bugfix') ?? 'feature',
          });
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'read_spec': {
          const slug = a.slug as string;
          const doc = (a.document as string) ?? 'all';
          const paths = defaultProjectPaths(root);
          const specPaths = featureSpecPaths(paths.specs, slug);
          const readDoc = async (key: 'requirements' | 'design' | 'tasks' | 'meta') => {
            const p = specPaths[key];
            return (await fileExists(p)) ? await readText(p) : '';
          };
          if (doc === 'all') {
            const parts = await Promise.all(
              (['requirements', 'design', 'tasks'] as const).map(async (d) =>
                `## ${d}\n${await readDoc(d)}`,
              ),
            );
            return { content: [{ type: 'text', text: parts.join('\n\n') }] };
          }
          return { content: [{ type: 'text', text: await readDoc(doc as 'requirements') }] };
        }
        case 'update_spec': {
          const meta = await approveGate(root, a.slug as string, a.gate as 'requirements' | 'design' | 'tasks' | 'all');
          return { content: [{ type: 'text', text: JSON.stringify(meta, null, 2) }] };
        }
        case 'generate_design': {
          const text = await generateDesign(root, a.slug as string, {
            regenerate: a.regenerate as boolean | undefined,
          });
          return { content: [{ type: 'text', text }] };
        }
        case 'generate_tasks': {
          const text = await generateTasks(root, a.slug as string, {
            regenerate: a.regenerate as boolean | undefined,
          });
          return { content: [{ type: 'text', text }] };
        }
        case 'get_next_task': {
          const slug = await resolveSpecSlug(root, a.slug as string | undefined);
          const ctx = await getImplementContext(root, { spec: slug });
          return { content: [{ type: 'text', text: formatImplementContext(ctx) }] };
        }
        case 'complete_task': {
          await completeTask(root, a.slug as string, a.taskId as string);
          return { content: [{ type: 'text', text: `Task ${a.taskId} marked complete` }] };
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
  const server = await createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
