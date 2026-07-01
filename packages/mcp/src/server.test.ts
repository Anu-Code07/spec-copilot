import { describe, it, expect } from 'vitest';
import { createMcpServer } from './server.js';
import { SPECDRIVE_MCP_TOOL_NAMES } from './tool-names.js';

describe('MCP server', () => {
  it('creates a server instance', async () => {
    const server = await createMcpServer();
    expect(server).toBeDefined();
  });

  it('registers all expected tool names', () => {
    expect(SPECDRIVE_MCP_TOOL_NAMES.length).toBeGreaterThanOrEqual(20);
    expect(SPECDRIVE_MCP_TOOL_NAMES).toContain('create_spec');
    expect(SPECDRIVE_MCP_TOOL_NAMES).toContain('get_next_task');
    expect(SPECDRIVE_MCP_TOOL_NAMES).toContain('figma_generate_for_spec');
  });
});
