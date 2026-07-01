#!/usr/bin/env node
/** Claude Desktop (.mcpb) bundled entry — loads vendored dist from pack script */
import { startMcpServer } from './mcp/dist/index.js';

startMcpServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
