import { describe, it, expect } from 'vitest';
import { parseEnvFromShellProfile } from './shell-profile-env.js';

describe('parseEnvFromShellProfile', () => {
  it('parses bash/zsh export lines', () => {
    const content = `
# LLM
export GEMINI_API_KEY="abc123"
export GROQ_API_KEY=grq_456
`;
    expect(parseEnvFromShellProfile(content)).toEqual({
      GEMINI_API_KEY: 'abc123',
      GROQ_API_KEY: 'grq_456',
    });
  });

  it('parses PowerShell profile lines', () => {
    const content = `
$env:GEMINI_API_KEY = "ps-key"
[System.Environment]::SetEnvironmentVariable("GROQ_API_KEY", "groq-ps", "User")
`;
    expect(parseEnvFromShellProfile(content)).toEqual({
      GEMINI_API_KEY: 'ps-key',
      GROQ_API_KEY: 'groq-ps',
    });
  });
});
