import type { GenerationInput, GenerationProvider, LlmConfig } from './types.js';

function buildPrompt(input: GenerationInput): string {
  const steering = [
    input.steering.product && `## Product\n${input.steering.product}`,
    input.steering.techStack && `## Tech Stack\n${input.steering.techStack}`,
    input.steering.structure && `## Structure\n${input.steering.structure}`,
    input.steering.codingStyle && `## Coding Style\n${input.steering.codingStyle}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const base = `You are SpecDrive, a frontend spec-driven development assistant for ${input.stack}.
Generate ONLY valid Markdown. No preamble, no code fences wrapping the whole doc.

Project context:
${steering}

Feature: ${input.title}
Description: ${input.description}
`;

  switch (input.kind) {
    case 'requirements':
      return `${base}

Generate requirements.md with:
- Overview
- User Stories (REQ-001, REQ-002, REQ-003 minimum) using "As a / I want / So that"
- EARS acceptance criteria per story (Ubiquitous, Event-driven, State-driven, Unwanted event)
- Non-functional requirements (accessibility, performance)
- Out of scope`;

    case 'gap-analysis':
      return `${base}

Approved requirements:
${input.requirementsContent ?? ''}

Codebase context:
${input.codebaseContextFormatted ?? ''}

Generate gap-analysis.md comparing requirements against the existing codebase.
Include: Executive Summary, Existing Code Inventory, Requirements Coverage Matrix,
Gaps to Bridge, Files to Create, Files to Modify, Architecture Gaps, Dependencies & Risks,
Recommended Implementation Order. Be specific about file paths and components.`;

    case 'design':
      return `${base}

Approved requirements:
${input.requirementsContent ?? ''}

Generate design.md as UI/UX blueprint with:
- User Flow
- Screen Map (table)
- Component Hierarchy (tree)
- Component Specifications (props, states)
- Navigation table
- State Management table
- Design Tokens
- Platform Behavior
- Accessibility section
- Requirement Traceability table mapping REQ-* to design elements
Focus on screens, widgets/components, and frontend architecture — NOT backend APIs.`;

    case 'tasks':
      return `${base}

Requirements:
${input.requirementsContent ?? ''}

Design:
${input.designContent ?? ''}

Generate tasks.md with waves of implementation tasks.
Each task: TASK-NNN title, Status pending, Requirements, Design ref, Files, Acceptance, Depends on.
Include widget/component tests and accessibility audit task.`;

    case 'bugfix':
      return `${base}

Generate bugfix.md with: Observed Behavior, Expected Behavior, Reproduction Steps, Root Cause Analysis, Fix Approach, Regression Tests.`;
  }
}

async function callOpenAi(config: LlmConfig, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
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

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content?.trim() ?? '';
}

async function callAnthropic(config: LlmConfig, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { content: { text: string }[] };
  return data.content[0]?.text?.trim() ?? '';
}

export class LlmGenerationProvider implements GenerationProvider {
  readonly name: string;

  constructor(private readonly config: LlmConfig) {
    this.name = `llm:${config.provider}`;
  }

  async generate(input: GenerationInput): Promise<string> {
    const prompt = buildPrompt(input);
    if (this.config.provider === 'anthropic') {
      return callAnthropic(this.config, prompt);
    }
    return callOpenAi(this.config, prompt);
  }
}
