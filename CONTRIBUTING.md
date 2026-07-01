# Contributing to SpecDrive

Thank you for your interest in contributing to SpecDrive. This project follows production-grade open source practices.

## Development Setup

```bash
git clone https://github.com/specdrive/specdrive.git
cd specdrive
pnpm install
pnpm build
pnpm test
```

**Requirements:** Node.js ≥ 20, pnpm ≥ 9

## Branch Strategy

- `main` — stable, release-ready
- `cursor/*` — agent-driven feature branches
- `feature/*` — community feature branches
- `fix/*` — bug fixes

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(cli): add spec init command
fix(core): validate spec frontmatter schema
docs(architecture): update MCP tool list
```

## Pull Requests

1. Fork and create a feature branch
2. Write or update tests for changes
3. Ensure `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass
4. Update documentation if behavior changes
5. Open a PR with a clear description

## RFC Process

Significant architectural changes require an RFC. See [docs/rfc/README.md](docs/rfc/README.md).

## Code Style

- TypeScript strict mode
- ESLint + Prettier (configured per package)
- Clean Architecture boundaries enforced in `packages/core`
- One responsibility per module; prefer composition over inheritance

## Architecture Boundaries

```
UI (CLI, VS Code, MCP) → Application Services → Domain → Infrastructure
```

- Domain layer has zero external dependencies
- Plugins extend via defined SDK interfaces only
- AI adapters never leak into domain logic

## Reporting Issues

Use GitHub Issues with:

- Clear reproduction steps
- Expected vs actual behavior
- SpecDrive version and environment

## Code of Conduct

Be respectful, constructive, and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).
