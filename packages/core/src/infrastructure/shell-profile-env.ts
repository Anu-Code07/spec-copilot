import { readFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { fileExists } from './files.js';

export const LLM_ENV_KEYS = ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GROQ_API_KEY'] as const;
export const FIGMA_ENV_KEYS = ['FIGMA_TOKEN', 'FIGMA_ACCESS_TOKEN'] as const;
export const PROFILE_ENV_KEYS = [...LLM_ENV_KEYS, ...FIGMA_ENV_KEYS] as const;

let profileHydrated = false;

/** Parse export/assign lines from shell profile content */
export function parseEnvFromShellProfile(content: string): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    for (const key of PROFILE_ENV_KEYS) {
      const patterns = [
        new RegExp(`^export\\s+${key}\\s*=\\s*["']([^"']+)["']\\s*$`),
        new RegExp(`^export\\s+${key}\\s*=\\s*([^\\s#]+)\\s*$`),
        new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']+)["']\\s*$`),
        new RegExp(`^\\$env:${key}\\s*=\\s*["']([^"']+)["']\\s*$`),
        new RegExp(
          `SetEnvironmentVariable\\(\\s*["']${key}["']\\s*,\\s*["']([^"']+)["']`,
        ),
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match?.[1]) {
          vars[key] = match[1].trim();
          break;
        }
      }
    }
  }

  return vars;
}

export function getShellProfilePaths(): string[] {
  const home = homedir();
  const paths: string[] = [];

  if (platform() === 'win32') {
    const userProfile = process.env.USERPROFILE ?? home;
    paths.push(
      join(userProfile, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1'),
      join(userProfile, '.bashrc'),
      join(userProfile, '.zshrc'),
    );
  } else {
    paths.push(
      join(home, '.zshrc'),
      join(home, '.bashrc'),
      join(home, '.bash_profile'),
      join(home, '.profile'),
    );
  }

  return paths;
}

export function getPrimaryShellProfilePath(): string {
  const paths = getShellProfilePaths();
  if (platform() === 'win32') {
    return paths[0] ?? join(homedir(), '.zshrc');
  }
  return process.env.SHELL?.includes('zsh') ? paths[0]! : paths[1] ?? paths[0]!;
}

/** Read ~/.zshrc, ~/.bashrc, PowerShell profile, etc. and merge into process.env */
export async function hydrateEnvFromShellProfiles(): Promise<Record<string, string>> {
  const loaded: Record<string, string> = {};

  for (const profilePath of getShellProfilePaths()) {
    if (!(await fileExists(profilePath))) continue;

    try {
      const content = await readFile(profilePath, 'utf-8');
      const parsed = parseEnvFromShellProfile(content);
      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key] && value) {
          process.env[key] = value;
          loaded[key] = value;
        }
      }
    } catch {
      // unreadable profile — skip
    }
  }

  profileHydrated = true;
  return loaded;
}

export async function ensureProfileEnvHydrated(): Promise<void> {
  if (!profileHydrated) {
    await hydrateEnvFromShellProfiles();
  }
}

export function hasAnyLlmApiKey(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_API_KEY ??
      process.env.GROQ_API_KEY,
  );
}

export function getLlmKeySetupInstructions(): string {
  const profile = getPrimaryShellProfilePath();
  const isWin = platform() === 'win32';

  if (isWin) {
    return [
      'No LLM API key found in environment or shell profile.',
      '',
      'Add a free Gemini key (https://aistudio.google.com) using ONE of:',
      '',
      `  PowerShell profile (${profile}):`,
      '    $env:GEMINI_API_KEY = "your-key"',
      '    [System.Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "your-key", "User")',
      '',
      '  Or: Windows Settings → Environment Variables → User → New → GEMINI_API_KEY',
      '',
      'Alternatives:',
      '  export GROQ_API_KEY in your profile',
      '  export SPECDRIVE_USE_OLLAMA=1 and run: ollama pull llama3.2',
      '  export SPECDRIVE_LLM_OFFLINE=1 for template-only (no AI)',
    ].join('\n');
  }

  return [
    'No LLM API key found in environment or shell profile.',
    '',
    'Add a free Gemini key (https://aistudio.google.com) to your shell profile:',
    '',
    `  echo 'export GEMINI_API_KEY="your-key"' >> ${profile}`,
    `  source ${profile}`,
    '',
    'Alternatives:',
    '  export GROQ_API_KEY in ~/.zshrc or ~/.bashrc',
    '  export SPECDRIVE_USE_OLLAMA=1 and run: ollama pull llama3.2',
    '  export SPECDRIVE_LLM_OFFLINE=1 for template-only (no AI)',
    '  run spec with --api-key <key> for a one-off session',
  ].join('\n');
}

export function formatProfileExportLine(key: string, value: string): string {
  return `export ${key}="${value.replace(/"/g, '\\"')}"`;
}
