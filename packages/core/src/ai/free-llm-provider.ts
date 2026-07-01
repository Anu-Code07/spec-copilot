import type { GenerationInput, GenerationProvider } from './types.js';
import { TemplateGenerationProvider } from './template-provider.js';
import { SpecDriveError } from '../services/project-service.js';
import {
  ensureProfileEnvHydrated,
  getLlmKeySetupInstructions,
} from '../infrastructure/shell-profile-env.js';

export type FreeLlmBackend = 'gemini' | 'groq' | 'ollama';

export interface FreeLlmConfig {
  backend: FreeLlmBackend;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

/** Resolve free LLM for npm/CLI — Gemini → Groq → Ollama (opt-in) → null */
export function resolveFreeLlmConfig(): FreeLlmConfig | null {
  if (process.env.SPECDRIVE_LLM_OFFLINE === '1') return null;

  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    return {
      backend: 'gemini',
      apiKey: geminiKey,
      model: process.env.SPECDRIVE_LLM_MODEL ?? 'gemini-2.0-flash',
    };
  }
  if (process.env.GROQ_API_KEY) {
    return {
      backend: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.SPECDRIVE_LLM_MODEL ?? 'llama-3.3-70b-versatile',
    };
  }
  if (process.env.SPECDRIVE_USE_OLLAMA === '1') {
    return {
      backend: 'ollama',
      baseUrl: process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434',
      model: process.env.SPECDRIVE_LLM_MODEL ?? 'llama3.2',
    };
  }
  return null;
}

export async function resolveFreeLlmConfigAsync(): Promise<FreeLlmConfig | null> {
  await ensureProfileEnvHydrated();
  return resolveFreeLlmConfig();
}

async function callGemini(config: FreeLlmConfig, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

async function callGroq(config: FreeLlmConfig, prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: 'Output markdown spec documents only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Groq API error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content?.trim() ?? '';
}

async function callOllama(config: FreeLlmConfig, prompt: string): Promise<string> {
  const res = await fetch(`${config.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} — is Ollama running?`);
  const data = (await res.json()) as { response?: string };
  return data.response?.trim() ?? '';
}

function buildCliPrompt(input: GenerationInput): string {
  const steering = [
    input.steering.product && `Product:\n${input.steering.product}`,
    input.steering.techStack && `Tech:\n${input.steering.techStack}`,
    input.steering.structure && `Structure:\n${input.steering.structure}`,
    input.steering.codingStyle && `Style:\n${input.steering.codingStyle}`,
  ].filter(Boolean).join('\n\n');

  const codeCtx = input.codebaseContextFormatted
    ? `\n\n# Codebase scan\n${input.codebaseContextFormatted}`
    : '';

  const docs = [
    input.requirementsContent && `Requirements:\n${input.requirementsContent}`,
    input.gapAnalysisContent && `Gap analysis:\n${input.gapAnalysisContent}`,
    input.designContent && `Design:\n${input.designContent}`,
  ].filter(Boolean).join('\n\n');

  return `Generate ${input.kind}.md for frontend feature "${input.title}" (${input.stack}).
Description: ${input.description}
${steering ? `\n${steering}` : ''}
${docs ? `\n${docs}` : ''}
${codeCtx}
Output ONLY valid Markdown. Analyze the codebase context to make docs specific to this repo.`;
}

/** CLI/npm provider: reads shell profiles, then calls free LLM or throws */
export class FreeLlmGenerationProvider implements GenerationProvider {
  readonly name = 'free-llm';
  private readonly template = new TemplateGenerationProvider();

  async generate(input: GenerationInput): Promise<string> {
    await ensureProfileEnvHydrated();
    const config = resolveFreeLlmConfig();

    if (!config) {
      if (process.env.SPECDRIVE_LLM_OFFLINE === '1') {
        return this.template.generate(input);
      }
      throw new SpecDriveError(getLlmKeySetupInstructions(), 'LLM_KEY_MISSING');
    }

    const prompt = buildCliPrompt(input);
    try {
      if (config.backend === 'gemini' && config.apiKey) {
        return await callGemini(config, prompt);
      }
      if (config.backend === 'groq' && config.apiKey) {
        return await callGroq(config, prompt);
      }
      if (config.backend === 'ollama') {
        return await callOllama(config, prompt);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new SpecDriveError(
        `LLM generation failed: ${detail}\n\n${getLlmKeySetupInstructions()}`,
        'LLM_GENERATION_FAILED',
      );
    }

    throw new SpecDriveError(getLlmKeySetupInstructions(), 'LLM_KEY_MISSING');
  }
}
