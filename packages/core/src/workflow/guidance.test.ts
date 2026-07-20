import { describe, it, expect } from 'vitest';
import {
  stepsAfterCreateSpec,
  stepsAfterDocument,
  stepsAfterGetNextTask,
  formatWorkflowSteps,
} from './guidance.js';

describe('workflow guidance', () => {
  it('returns MCP-first steps after create_spec', () => {
    const steps = stepsAfterCreateSpec('my-feature', 'mcp');
    expect(steps[0].action).toContain('write_spec_document');
    expect(steps[1].action).toContain('update_spec');
  });

  it('returns CLI steps after create_spec', () => {
    const steps = stepsAfterCreateSpec('my-feature', 'cli');
    expect(steps[0].action).toContain('spec approve');
  });

  it('chains document save to gate approval in MCP', () => {
    const steps = stepsAfterDocument('slug', 'requirements', 'mcp');
    expect(steps[0].action).toContain('update_spec');
    expect(steps[1].action).toContain('generate_gap_analysis');
  });

  it('prompts for figma token on UI tasks', () => {
    const steps = stepsAfterGetNextTask({
      slug: 'cart',
      taskId: 'TASK-001',
      surface: 'mcp',
      figmaPromptNeeded: true,
    });
    expect(steps.some((s) => s.action.includes('figmaToken'))).toBe(true);
    expect(steps.some((s) => s.action.includes('Cursor/Claude'))).toBe(true);
  });

  it('formats steps as numbered list', () => {
    const lines = formatWorkflowSteps([
      { action: 'do thing', reason: 'because' },
    ]);
    expect(lines[0]).toMatch(/\[Next\] do thing — because/);
  });
});
