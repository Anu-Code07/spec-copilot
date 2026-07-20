/** React Native coding standards — injected into .specdrive/coding-style.md on init */
export const CODING_STYLE_REACT_NATIVE = `# Coding Style — React Native (Expo + Feature Architecture)

SpecDrive enforces **production React Native standards**. Host AI and CLI generation must follow this document. Violations are blocking.

---

## 1. Folder structure (mandatory)

\`\`\`
src/
├── app/ or navigation/           ← Expo Router / React Navigation roots (thin)
├── features/<feature>/
│   ├── screens/                  ← Screen components (compose only)
│   ├── components/               ← Feature UI
│   ├── hooks/                    ← Screen/feature state
│   ├── domain/                   ← Entities, pure logic (no RN imports)
│   ├── data/                     ← API clients, DTOs, mappers
│   ├── store/                    ← Zustand slice OR context for this feature
│   └── index.ts
├── components/ui/                ← Shared primitives
├── lib/                          ← HTTP client, storage, analytics wrappers
└── theme/                        ← Tokens, spacing, typography
\`\`\`

Screens stay dumb: **Screen → hook/store → use-case/data**. No \`fetch\` inside JSX.

---

## 2. Navigation

- Define routes in one place (Expo Router file map or a typed navigator)
- Pass only serializable params
- Deep links documented in \`design.md\` Navigation section
- Avoid navigating during render — do it in effects / event handlers after user action

\`\`\`tsx
// ❌ navigate during render
if (state.success) navigation.navigate('Done')

// ✅
useEffect(() => {
  if (state.status === 'success') navigation.navigate('Done')
}, [state.status])
\`\`\`

---

## 3. State management

Prefer **Zustand** (or team-standard) with **narrow feature slices**:

\`\`\`ts
// ❌ mega store with unrelated flags
isLoading, hasError, trains, insurance, passengers, modalOpen

// ✅ discrete status + data
type Status = 'idle' | 'loading' | 'success' | 'empty' | 'error'
\`\`\`

### Rules
- Async work in store actions / hooks — not in components
- Select narrowly: \`useTrainStore(s => s.trains)\` to limit re-renders
- Derived data (filters, totals) computed in selectors — not in JSX
- Do not put navigation or toast side effects deep inside reducers without a clear listener pattern

### Hooks
- \`useTrainSearch()\`, \`useBookingForm()\` — one concern each
- Return \`{ status, data, error, actions }\`
- Components only render and call actions

---

## 4. Domain vs data

- **Domain entities**: plain TS types + pure functions — no \`react-native\` imports
- **DTOs**: \`fromApi\` / \`toApi\` only in \`data/\`
- Map DTO → entity before UI
- Storage (AsyncStorage / SecureStore) behind a local data source interface

\`\`\`ts
// ❌ UI imports API shape
import type { TrainResponseDto } from '../data/dto'

// ✅
import type { Train } from '../domain/entities'
\`\`\`

---

## 5. Component & performance rules

- Extract list rows to memoized components when lists are long
- Use \`FlatList\` / \`FlashList\` — never giant \`ScrollView\` + \`.map\` for dynamic lists
- Stable \`keyExtractor\` using business ids
- Avoid anonymous inline components inside \`renderItem\`
- Images: sized explicitly; use appropriate caching library if project standard
- Prefer \`Pressable\` with a11y props over raw \`Touchable\` without labels

\`\`\`tsx
<FlatList
  data={trains}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <TrainRow train={item} />}
/>
\`\`\`

### Styling
- Use theme tokens (\`spacing.md\`, \`colors.surface\`) — no unexplained magic numbers
- Platform splits via \`Platform.select\` or \`.ios.tsx\` / \`.android.tsx\` when behavior differs
- Document iOS vs Android differences in \`design.md\`

---

## 6. Side effects & lifecycle

- Data load on screen focus: \`useFocusEffect\` (React Navigation) or equivalent
- Cleanup subscriptions / abort controllers on unmount
- After async work, guard if screen unmounted before \`setState\` / navigation

---

## 7. Accessibility

- \`accessibilityRole\`, \`accessibilityLabel\` on interactive elements
- Adequate hit slop for touch targets
- Announce errors to screen readers when status becomes \`error\`

---

## 8. Testing

Required for:
- Domain mappers / validators
- Store actions / hooks with async success & failure
- Critical screen interactions (Testing Library + Jest)

Cover: loading, empty, error, success; offline; invalid input.

---

## 9. SOLID (RN mapping)

| Principle | Rule |
|-----------|------|
| **S** | One screen hook/store per concern; screens don't own networking |
| **O** | New flows = new feature modules |
| **L** | Shared UI primitives keep variant contracts |
| **I** | Feature \`index.ts\` exports only what others need |
| **D** | Screens depend on hooks/domain; hooks depend on data ports |

---

## 10. Forbidden patterns

- \`fetch\` / axios inside presentational components
- Business filtering in JSX
- Giant god-screens (>150 lines without extraction)
- \`console.log\` in production paths
- Storing non-serializable class instances in navigation params
- Mixing multiple features' state in one global store without slices

---

## 11. SpecDrive task tagging

| Task title contains | Owner |
|---------------------|-------|
| UI, screen, component, layout, styling | Cursor/Claude (optional Design2Code) |
| store, hook, navigation, validation, api, test | Cursor/Claude only |

---

## 12. PR self-check

1. Screen is composition-only
2. Status model is discrete (not boolean soup)
3. No DTO in UI
4. Lists use FlatList/FlashList
5. A11y labels on CTAs
6. Tests for new hooks/stores/domain
`;
