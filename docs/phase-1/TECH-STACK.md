# Tech Stack

## Stack Decision Summary

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Language | **TypeScript 5.x** | Type safety, ecosystem, MCP SDK support |
| Runtime | **Node.js ≥ 20 LTS** | Universal, MCP-native, CLI-friendly |
| Package Manager | **pnpm 9.x** | Fast, strict, workspace-native |
| Monorepo | **TurboRepo** | Incremental builds, task caching |
| Bundler | **ESBuild** | Fast library/CLI builds |
| Testing | **Vitest** | Fast, ESM-native, compatible with Turbo |
| CLI Framework | **Commander.js** | Mature, subcommand support |
| MCP SDK | **@modelcontextprotocol/sdk** | Official MCP implementation |
| Schema Validation | **JSON Schema + Ajv** | Spec frontmatter validation |
| Markdown | **remark / unified** | AST parsing for specs and docs |
| Frontmatter | **gray-matter** | YAML frontmatter extraction |
| Templates | **Handlebars** | Logic-less spec templates |
| Local Index | **better-sqlite3** | Fast embedded search index |
| Vector Search | **Optional: sqlite-vec or LanceDB** | Semantic spec search (Phase 4+) |
| VS Code | **VS Code Extension API** | Official extension platform |
| Docs Site | **VitePress** | Markdown-native, Vue-powered |
| HTTP (optional) | **Fastify** | MCP HTTP transport, future API |
| Git | **simple-git** | Git status, diff, commit hooks |
| GitHub | **@octokit/rest** | PR/issue integration (optional) |
| Multi-Agent | **Optional: LangGraph.js** | Agent orchestration (Phase 4+) |
| CI/CD | **GitHub Actions** | Standard OSS CI |
| Versioning | **Changesets** | Monorepo release management |
| Linting | **ESLint 9 (flat config)** | Consistent code quality |
| Formatting | **Prettier** | Auto-formatting |

## Why TypeScript + Node.js

### Considered Alternatives

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **TypeScript/Node** | MCP SDK, CLI ecosystem, VS Code native | Not ideal for CPU-heavy AST | **Selected** |
| Rust | Performance, single binary | Slower iteration, weaker MCP ecosystem | Rejected for core |
| Go | Fast CLI binaries | Weaker plugin ecosystem, no VS Code native | Rejected |
| Python | AI/ML libraries | MCP secondary, packaging friction | Rejected for core |

**Hybrid option (future):** Rust CLI wrapper for `spec` binary distribution; Node.js engine loaded as library. Not Phase 1 scope.

## Core Dependencies

### `@specdrive/core`

```json
{
  "dependencies": {
    "ajv": "^8.17.0",
    "gray-matter": "^4.0.3",
    "yaml": "^2.6.0",
    "zod": "^3.24.0",
    "better-sqlite3": "^11.0.0",
    "simple-git": "^3.27.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

**Note:** Zod for runtime validation in application layer; JSON Schema for spec document validation (human-readable schema files).

### `@specdrive/cli`

```json
{
  "dependencies": {
    "@specdrive/core": "workspace:*",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "inquirer": "^12.0.0"
  },
  "bin": {
    "spec": "./bin/spec.js"
  }
}
```

### `@specdrive/mcp`

```json
{
  "dependencies": {
    "@specdrive/core": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

### `@specdrive/vscode`

```json
{
  "dependencies": {
    "@specdrive/core": "workspace:*",
    "vscode-languageclient": "^9.0.0"
  },
  "engines": {
    "vscode": "^1.85.0"
  }
}
```

## Specification Format Stack

```
┌─────────────────────────────────────────┐
│           Spec File (.md)               │
├─────────────────────────────────────────┤
│  YAML Frontmatter (metadata)            │  ← gray-matter + JSON Schema
├─────────────────────────────────────────┤
│  Markdown Body (requirements, design)   │  ← remark/unified AST
├─────────────────────────────────────────┤
│  Structured Sections (headings)         │  ← Custom parser
│    ## Business Requirements             │
│    ## Functional Requirements           │
│    ## Acceptance Criteria               │
└─────────────────────────────────────────┘
```

### Frontmatter Schema (JSON Schema)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "title", "status", "phase"],
  "properties": {
    "id": { "type": "string", "pattern": "^SPEC-[0-9]{3}$" },
    "title": { "type": "string" },
    "status": { "enum": ["draft", "review", "approved", "implementing", "done"] },
    "phase": { "enum": ["requirements", "design", "architecture", "tasks", "implementing", "review", "testing", "done"] },
    "created": { "type": "string", "format": "date" },
    "updated": { "type": "string", "format": "date" },
    "authors": { "type": "array", "items": { "type": "string" } },
    "tags": { "type": "array", "items": { "type": "string" } },
    "dependencies": { "type": "array", "items": { "type": "string" } },
    "decisions": { "type": "array", "items": { "type": "string" } }
  }
}
```

Full schemas defined in Phase 2.

## Build Pipeline

```
Source (TypeScript)
    │
    ▼
ESBuild (per package)
    │
    ├── ESM: dist/index.js
    ├── CJS: dist/index.cjs (CLI compatibility)
    └── Types: dist/index.d.ts (tsc --emitDeclarationOnly)
    │
    ▼
TurboRepo cache → npm publish
```

### ESBuild Config (shared)

```typescript
// scripts/build.ts
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  external: ['better-sqlite3'], // native module
  sourcemap: true,
});
```

## SQLite Knowledge Index

```
.specdrive/knowledge.db (gitignored, rebuilt via spec sync)

Tables:
  specs       (id, title, status, phase, path, content_hash, indexed_at)
  tasks       (id, spec_id, title, status, path, content_hash)
  decisions   (id, title, path, content_hash)
  reviews     (id, spec_id, task_id, status, path)
  fts_specs   (FTS5 virtual table for full-text search)
```

**Principle:** Database is ephemeral. Delete and `spec sync` rebuilds from Markdown files.

## Optional: Vector Search (Phase 4+)

For semantic `find_context` MCP tool:

| Option | Pros | Cons |
|--------|------|------|
| sqlite-vec | Same DB, no extra service | Limited scale |
| LanceDB | Embedded, fast | Extra dependency |
| External (Pinecone) | Scalable | Cloud dependency |

**Recommendation:** Start with FTS5 full-text search. Add vector search as optional plugin when needed.

## Optional: Multi-Agent (Phase 4+)

| Option | Pros | Cons |
|--------|------|------|
| LangGraph.js | Graph-based agent flows | Complexity |
| Custom state machine | Simple, SpecDrive-native | More code |
| External (AutoGen) | Feature-rich | Heavy dependency |

**Recommendation:** Custom state machine in core for Phase 4; LangGraph as optional plugin.

## VS Code Extension Stack

```
Extension Host
    │
    ├── TreeView: Spec Explorer, Task Explorer
    ├── WebviewPanel: Architecture Viewer, Review Panel
    ├── Commands: Generate Feature, Implement Task, Review File
    └── MCP Client: spawns @specdrive/mcp as child process
```

## Documentation Site

**VitePress** chosen over Docusaurus/Astro:

- Markdown-native (matches spec format philosophy)
- Fast builds with Vite
- Built-in search
- Vue components for interactive examples

```
website/
├── .vitepress/config.ts
├── index.md
├── guide/
├── api/
└── plugins/
```

## Development Tools

```json
{
  "devDependencies": {
    "typescript": "^5.7.0",
    "esbuild": "^0.24.0",
    "turbo": "^2.3.0",
    "vitest": "^2.1.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0",
    "@changesets/cli": "^2.27.0"
  }
}
```

## Platform Support

| Platform | Support |
|----------|---------|
| macOS (arm64, x64) | ✅ Primary |
| Linux (x64) | ✅ Primary |
| Windows (x64) | ✅ Supported |
| Node.js 20+ | ✅ Required |
| Node.js 18 | ❌ Not supported |

## Security Considerations

- **No AI API keys in SpecDrive** — adapters use tool-native auth
- **`spec doctor`** scans for secrets in `.specdrive/`
- **MCP server** runs locally by default (stdio transport)
- **Dependencies** audited via `pnpm audit` in CI
- **Supply chain** — pinned versions, Renovate bot for updates

---

*Detailed API and schema definitions: Phase 2.*
