import type { FrontendStack } from '../domain/types.js';

export interface GenerationInput {
  kind: 'requirements' | 'gap-analysis' | 'design' | 'tasks' | 'bugfix';
  title: string;
  description: string;
  stack: FrontendStack;
  slug: string;
  requirementsContent?: string;
  gapAnalysisContent?: string;
  designContent?: string;
  codebaseContextFormatted?: string;
  steering: {
    product?: string;
    techStack?: string;
    structure?: string;
    codingStyle?: string;
  };
}

export interface GenerationProvider {
  readonly name: string;
  generate(input: GenerationInput): Promise<string>;
}

export type LlmProviderName = 'openai' | 'anthropic';

export interface LlmConfig {
  provider: LlmProviderName;
  apiKey: string;
  model?: string;
}

export function resolveLlmConfig(): LlmConfig | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.SPECDRIVE_LLM_MODEL ?? 'claude-sonnet-4-20250514',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.SPECDRIVE_LLM_MODEL ?? 'gpt-4o',
    };
  }
  return null;
}
