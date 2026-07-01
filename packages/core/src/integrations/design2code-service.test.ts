import { describe, expect, it } from 'vitest';
import {
  extractFigmaFileKey,
  stackToFramework,
  getFigmaTokenSetupInstructions,
  getDesign2CodeInstallInstructions,
  classifyTaskForDesign2Code,
} from './design2code-service.js';
import type { ParsedTask } from '../domain/types.js';

function task(title: string, extra: Partial<ParsedTask> = {}): ParsedTask {
  return {
    id: 'TASK-001',
    title,
    status: 'pending',
    requirements: [],
    dependsOn: [],
    wave: 1,
    ...extra,
  };
}

describe('design2code-service', () => {
  it('extracts file key from Figma URL', () => {
    expect(
      extractFigmaFileKey('https://www.figma.com/design/AbCdEf123/My-Screen'),
    ).toBe('AbCdEf123');
    expect(extractFigmaFileKey('raw-key-123')).toBe('raw-key-123');
  });

  it('maps SpecDrive stack to Design2Code framework', () => {
    expect(stackToFramework('flutter')).toBe('flutter');
    expect(stackToFramework('nextjs')).toBe('nextjs');
    expect(stackToFramework('react-native')).toBe('react-native');
  });

  it('returns setup instructions for missing token', () => {
    expect(getFigmaTokenSetupInstructions()).toContain('FIGMA_TOKEN');
  });

  it('returns install instructions when Design2Code missing', () => {
    expect(getDesign2CodeInstallInstructions()).toContain('figma-to-code');
  });

  it('classifies UI vs logic tasks', () => {
    expect(classifyTaskForDesign2Code(task('Build core UI components'))).toBe('ui');
    expect(classifyTaskForDesign2Code(task('Scaffold product screen'))).toBe('ui');
    expect(classifyTaskForDesign2Code(task('Wire state management'))).toBe('logic');
    expect(classifyTaskForDesign2Code(task('Add validation and error handling'))).toBe('logic');
    expect(classifyTaskForDesign2Code(task('Navigation integration'))).toBe('logic');
  });
});
