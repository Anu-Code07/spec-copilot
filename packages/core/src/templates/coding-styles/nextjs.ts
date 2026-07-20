/** Next.js coding standards — injected into .specdrive/coding-style.md on init */
export const CODING_STYLE_NEXTJS = `# Coding Style — Next.js (App Router + Feature Architecture)

SpecDrive enforces **production Next.js / React standards**. Host AI and CLI generation must follow this document. Violations are blocking.

---

## 1. Folder structure (mandatory)

\`\`\`
src/
├── app/                          ← Routes only (thin)
│   └── (marketing)/feature/
│       ├── page.tsx              ← Server Component by default
│       ├── loading.tsx
│       ├── error.tsx
│       └── _components/          ← Route-local UI (not shared)
├── features/<feature>/           ← Feature module (Clean-ish)
│   ├── components/               ← Presentational UI
│   ├── hooks/                    ← Client state / data hooks
│   ├── api/                      ← Server actions / route handlers used by feature
│   ├── domain/                   ← Types, pure functions, validators (no React)
│   ├── data/                     ← Fetchers, mappers, DTO types
│   └── index.ts                  ← Public API of the feature
├── components/ui/                ← Design-system primitives only
└── lib/                          ← Shared utilities, clients, config
\`\`\`

**Rules**
- \`page.tsx\` / \`layout.tsx\` stay thin — compose feature components
- Domain code has **zero** React / Next imports
- DTOs stay in \`data/\` — map to domain types before UI
- Do not import from another feature's internals — only via that feature's \`index.ts\`

---

## 2. Server vs Client Components

| Default | Use \`'use client'\` only when |
|---------|------------------------------|
| Server Component | You need state, effects, browser APIs, or event handlers |

- Fetch data on the server when possible (\`async\` Server Components)
- Pass serializable props to Client Components
- Never put secrets in Client Components
- Prefer Server Actions for mutations over ad-hoc \`fetch\` in client

\`\`\`tsx
// ❌ Client component fetching for no reason
'use client'
useEffect(() => { fetch('/api/trains').then(...) }, [])

// ✅ Server Component
export default async function TrainsPage() {
  const trains = await listTrains()
  return <TrainList trains={trains} />
}
\`\`\`

---

## 3. State management

- **URL state** (filters, tabs, pagination) → \`searchParams\` / \`nuqs\`
- **Server cache** → React \`cache()\`, Next \`fetch\` cache, or TanStack Query on client when needed
- **UI-only state** → \`useState\` / \`useReducer\` colocated
- **Cross-route client state** → Zustand store with narrow slices (not a mega-store)
- No Redux unless the team already standardized on it

### Hook rules
- One concern per hook (\`useTrainSearch\`, not \`useTrainsEverything\`)
- Hooks return \`{ data, error, isLoading, actions }\` — components stay dumb
- No business rules inside JSX — compute in hooks / domain functions

\`\`\`tsx
// ❌ filter in JSX
{trains.filter(t => t.active).map(...)}

// ✅ filter in hook / selector
const active = useActiveTrains(trains)
\`\`\`

---

## 4. Data layer

- \`data/\` owns fetchers + DTO types + \`mapXDtoToX\`
- UI and domain never import raw API response shapes
- Errors: map to typed results (\`Result<T, AppError>\` / never throw opaque Errors into UI)
- Separate remote vs local (cookies/localStorage) helpers

\`\`\`ts
// ❌ DTO in UI
function Card({ train }: { train: TrainApiResponse }) {}

// ✅ domain type
function Card({ train }: { train: Train }) {}
\`\`\`

---

## 5. Component rules

- Presentational components receive props — no direct fetch
- Extract when \`return\` > ~50 lines or subtree has its own interaction
- Lists: virtualize or paginate when unbounded; use stable \`key={id}\`
- Prefer composition over prop-drilling mega-components

### const / purity
- Pure presentational pieces as plain functions
- Avoid creating new object/array literals inline in hot paths when they defeat memoization (only memoize when measured)

### Accessibility
- Semantic HTML (\`button\`, \`nav\`, \`main\`)
- Labels on inputs; keyboard focus visible
- Images need meaningful \`alt\` (or empty alt if decorative)

---

## 6. App Router conventions

- Colocate \`loading.tsx\` / \`error.tsx\` / \`not-found.tsx\` per route segment
- Use \`Suspense\` boundaries for streaming where it improves UX
- Metadata via \`export const metadata\` / \`generateMetadata\`
- Parallel / intercepting routes only when product requires them — don't over-engineer

---

## 7. Styling

- Follow the project design system (Tailwind tokens / CSS variables)
- No one-off magic spacing without tokens (\`p-4\` OK if tokenized in config; unexplained \`mt-[13px]\` not OK)
- Dark mode / responsive breakpoints documented in \`design.md\`

---

## 8. Testing

Required for:
- Domain validators / mappers
- Complex hooks
- Critical UI flows (Testing Library)

Cover: loading, empty, error, success; failed fetch; invalid input.

Prefer Vitest + Testing Library. Avoid testing implementation details of Server Components — test mappers and client interactions.

---

## 9. SOLID (Next.js mapping)

| Principle | Rule |
|-----------|------|
| **S** | Feature module = one product concern; page file is composition only |
| **O** | Add features via new modules — don't bolt unrelated logic into existing pages |
| **L** | Shared UI primitives must honor their variant contracts |
| **I** | Export narrow feature APIs from \`index.ts\` |
| **D** | UI depends on domain types + hooks; hooks depend on data adapters — not the reverse |

---

## 10. Forbidden patterns

- Business logic in \`page.tsx\` beyond composition
- Importing \`fs\` / DB clients into Client Components
- Passing non-serializable props Server → Client
- \`any\` in public feature APIs
- \`console.log\` left in production paths (use project logger)
- Cross-feature deep imports (\`features/a/data/foo\` from \`features/b\`)

---

## 11. SpecDrive task tagging

| Task title contains | Owner |
|---------------------|-------|
| UI, component, page, layout, styling | Cursor/Claude (optional Design2Code) |
| hook, state, server action, validation, fetch, test | Cursor/Claude only |

---

## 12. PR self-check

1. Server/Client boundary correct
2. No DTO in UI
3. Feature public API via \`index.ts\`
4. Loading / error / empty handled
5. A11y basics present
6. Tests for new domain/hooks
`;
