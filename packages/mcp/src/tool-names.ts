/** Canonical MCP tool names — keep in sync with server.ts ListTools handler */
export const SPECDRIVE_MCP_TOOL_NAMES = [
  'create_spec',
  'read_spec',
  'update_spec',
  'generate_gap_analysis',
  'generate_design',
  'generate_tasks',
  'write_spec_document',
  'scan_codebase',
  'get_next_task',
  'complete_task',
  'review_code',
  'find_context',
  'read_architecture',
  'search_specs',
  'get_spec_status',
  'figma_status',
  'figma_import',
  'figma_generate',
  'figma_generate_for_spec',
  'figma_preview',
] as const;

export type SpecdriveMcpToolName = (typeof SPECDRIVE_MCP_TOOL_NAMES)[number];
