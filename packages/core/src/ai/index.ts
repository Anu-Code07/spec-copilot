import type { GenerationProvider } from './types.js';
import { TemplateGenerationProvider } from './template-provider.js';
import { FreeLlmGenerationProvider } from './free-llm-provider.js';
import type { RuntimeMode } from './generation-bundle.js';

/** CLI/npm → free LLM (Gemini/Groq/Ollama) + template fallback. MCP → never calls LLM here. */
export function createGenerationProvider(_runtime: RuntimeMode = 'cli'): GenerationProvider {
  if (_runtime === 'mcp') {
    return new TemplateGenerationProvider();
  }
  return new FreeLlmGenerationProvider();
}

export { TemplateGenerationProvider } from './template-provider.js';
export { FreeLlmGenerationProvider, resolveFreeLlmConfig, resolveFreeLlmConfigAsync } from './free-llm-provider.js';
export type { GenerationInput, GenerationProvider } from './types.js';
export { resolveLlmConfig } from './types.js';
export {
  buildGenerationBundle,
  formatGenerationBundle,
  type GenerationBundle,
  type SpecDocument,
  type RuntimeMode,
} from './generation-bundle.js';
