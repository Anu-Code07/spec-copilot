import type { GenerationInput, GenerationProvider } from './types.js';
import {
  requirementsMd,
  defaultRequirements,
  designMd,
  tasksMd,
  bugfixMd,
} from '../templates/spec-docs.js';
import { parseRequirements } from '../utils/parse.js';

export class TemplateGenerationProvider implements GenerationProvider {
  readonly name = 'template';

  async generate(input: GenerationInput): Promise<string> {
    switch (input.kind) {
      case 'requirements': {
        const reqs = defaultRequirements(input.title, input.description);
        return requirementsMd(input.title, input.description, reqs);
      }
      case 'design': {
        const reqs = input.requirementsContent
          ? parseRequirements(input.requirementsContent)
          : defaultRequirements(input.title, input.description);
        return designMd(input.title, input.slug, input.stack, reqs);
      }
      case 'tasks': {
        const reqs = input.requirementsContent
          ? parseRequirements(input.requirementsContent)
          : defaultRequirements(input.title, input.description);
        return tasksMd(input.title, input.slug, input.stack, reqs);
      }
      case 'bugfix':
        return bugfixMd(input.title, input.description);
    }
  }
}
