import { startMcpServer } from './server.js';

startMcpServer().catch((err) => {
  console.error('SpecDrive MCP server error:', err);
  process.exit(1);
});
