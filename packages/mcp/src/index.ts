import { runMcpCli } from './cli.js';

runMcpCli(process.argv).catch((err) => {
  console.error('SpecDrive MCP error:', err);
  process.exit(1);
});
