import type { GenerationProvider } from './types.js';
import { resolveLlmConfig } from './types.js';
import { TemplateGenerationProvider } from './template-provider.js';
import { LlmGenerationProvider } from './llm-provider.js';
import type { ProjectConfig } from '../domain/types.js';

export function createGenerationProvider(config: ProjectConfig): GenerationProvider {
  const preferLlm = config.generation.provider === 'llm' || config.generation.provider === 'mcp';
  const llmConfig = resolveLlmConfig();

  if (preferLlm && llmConfig) {
    return new LlmGenerationProvider(llmConfig);
  }

  return new TemplateGenerationProvider();
}

export { TemplateGenerationProvider } from './template-provider.js';
export { LlmGenerationProvider } from './llm-provider.js';
export type { GenerationInput, GenerationProvider, LlmConfig } from './types.js';
export { resolveLlmConfig } from './types.js';
