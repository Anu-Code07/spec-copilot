import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import chalk from 'chalk';
import {
  ensureProfileEnvHydrated,
  hasAnyLlmApiKey,
  getLlmKeySetupInstructions,
  getPrimaryShellProfilePath,
  formatProfileExportLine,
  resolveFreeLlmConfig,
  SpecDriveError,
} from '@specdrive/core';

export interface EnsureLlmOptions {
  /** Prompt for API key when stdin is a TTY (default: true) */
  interactive?: boolean;
  /** One-off key from --api-key flag */
  apiKey?: string;
}

export async function ensureCliLlmReady(options: EnsureLlmOptions = {}): Promise<void> {
  const interactive = options.interactive !== false;

  if (options.apiKey) {
    process.env.GEMINI_API_KEY = options.apiKey;
  }

  await ensureProfileEnvHydrated();

  if (process.env.SPECDRIVE_LLM_OFFLINE === '1') return;
  if (hasAnyLlmApiKey()) return;
  if (process.env.SPECDRIVE_USE_OLLAMA === '1') return;

  if (interactive && input.isTTY) {
    const provided = await promptForApiKey();
    if (provided) {
      process.env.GEMINI_API_KEY = provided;
      await maybeSaveKeyToProfile(provided);
      return;
    }
  }

  throw new SpecDriveError(getLlmKeySetupInstructions(), 'LLM_KEY_MISSING');
}

async function promptForApiKey(): Promise<string | null> {
  const rl = createInterface({ input, output });
  try {
    console.log(chalk.yellow('No GEMINI_API_KEY / GROQ_API_KEY found.'));
    const answer = await rl.question(
      'Enter Gemini API key now (Enter to skip): ',
    );
    const trimmed = answer.trim();
    return trimmed || null;
  } finally {
    rl.close();
  }
}

async function maybeSaveKeyToProfile(key: string): Promise<void> {
  if (!input.isTTY) return;

  const rl = createInterface({ input, output });
  try {
    const profile = getPrimaryShellProfilePath();
    const answer = await rl.question(
      `Save to ${profile} for future runs? (y/N): `,
    );
    if (!/^y(es)?$/i.test(answer.trim())) return;

    await mkdir(dirname(profile), { recursive: true });
    const line = `\n# SpecDrive LLM\n${formatProfileExportLine('GEMINI_API_KEY', key)}\n`;
    await appendFile(profile, line, 'utf-8');
    console.log(chalk.green(`✓ Saved GEMINI_API_KEY to ${profile}`));
    console.log(chalk.dim(`  Run: source ${profile}`));
  } finally {
    rl.close();
  }
}

export async function printLlmStatus(): Promise<void> {
  await ensureProfileEnvHydrated();
  const config = resolveFreeLlmConfig();

  if (process.env.SPECDRIVE_LLM_OFFLINE === '1') {
    console.log(chalk.dim('LLM: offline templates (SPECDRIVE_LLM_OFFLINE=1)'));
    return;
  }
  if (!config) {
    console.log(chalk.yellow('LLM: not configured'));
    return;
  }
  if (config.backend === 'ollama') {
    console.log(chalk.green(`LLM: Ollama (${config.model} @ ${config.baseUrl})`));
    return;
  }
  console.log(chalk.green(`LLM: ${config.backend} (${config.model})`));
}
