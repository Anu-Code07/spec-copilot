# Next.js coding standards

> Written to `.specdrive/coding-style.md` on `spec init --stack nextjs`.

## Structure

Feature modules under `src/features/<feature>/` with `components/`, `hooks/`, `domain/`, `data/`, and a public `index.ts`. App Router `page.tsx` files stay thin.

## Server vs Client

Server Components by default. `'use client'` only for state, effects, or browser APIs. No secrets or DB clients in client bundles.

## State

URL for shareable state; server fetch when possible; Zustand slices for cross-route client state. No business filtering in JSX.

## Data

DTOs + mappers live in `data/`. UI consumes domain types only.

## UI & a11y

Semantic HTML, labeled inputs, stable list keys, design tokens for spacing.

## Tests

Vitest + Testing Library for domain/hooks and critical flows.

## Task routing

UI/page/layout → host AI (+ optional Design2Code). Hooks/server actions/validation/tests → host AI only.

Full detail ships in `.specdrive/coding-style.md` after init.
