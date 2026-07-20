/** Flutter coding standards — injected into .specdrive/coding-style.md on init */
export const CODING_STYLE_FLUTTER = `# Coding Style — Flutter (Clean Architecture + BLoC)

SpecDrive enforces **production Flutter standards**. Host AI (Cursor/Claude) and CLI generation must follow this document. Violations are blocking.

---

## 1. Folder structure (mandatory)

\`\`\`
lib/src/features/<feature>/
├── presentation/          ← Widgets, BLoCs, Cubits — dumb UI only
│   ├── pages/
│   ├── widgets/
│   └── bloc/              ← events + states + bloc
├── domain/                ← Pure Dart. No Flutter, no HTTP, no JSON
│   ├── entities/
│   ├── repositories/      ← Abstract interfaces ONLY
│   └── usecases/          ← One public execute() per use case
└── data/                  ← Implementation details
    ├── repositories/      ← Implements domain interfaces
    ├── datasources/       ← Remote and Local SEPARATED
    └── models/            ← DTOs with fromJson/toJson — never leave this layer
\`\`\`

UI must NEVER call repositories. Flow: **Widget → BLoC → UseCase → Repository**.

---

## 2. Clean Architecture layer rules

### Presentation
- Widgets are **dumb**: render state, dispatch events, nothing else
- No filtering/sorting/pricing math in \`build()\` — do it in the BLoC before emit
- No repository / API / use-case calls from widgets or \`initState\`
- \`initState\` may only \`add(LoadXEvent())\`
- Navigation / snackbars only in \`BlocListener\`, never in \`build()\`

### Domain
- Entities are plain immutable Dart — **no** \`fromJson\` / \`toJson\` / Flutter imports
- Repository files are **abstract interfaces only**
- Use cases: one responsibility, return \`Either<Failure, Entity>\` / \`NetworkResponse<Entity>\` — never Models or raw Exceptions
- No \`dio\`, \`http\`, \`shared_preferences\`, \`get_it\` imports in domain

### Data
- All JSON lives in Models/DTOs
- Repositories map DTO → Entity before returning
- Remote DS and Local DS are separate classes
- Map errors at the boundary — never pass raw \`Exception\` / \`Response\` upward

---

## 3. BLoC / Cubit rules

### Discrete states (required)

\`\`\`dart
// ❌ boolean-flag anti-pattern
class TrainState {
  final bool isLoading;
  final bool hasError;
  final List<Train>? trains;
}

// ✅ sealed / discrete states
sealed class TrainState extends Equatable {
  const TrainState();
}
class TrainInitial extends TrainState {
  @override List<Object?> get props => [];
}
class TrainLoading extends TrainState {
  @override List<Object?> get props => [];
}
class TrainLoaded extends TrainState {
  final List<Train> trains;
  const TrainLoaded(this.trains);
  @override List<Object?> get props => [trains];
}
class TrainError extends TrainState {
  final String message;
  const TrainError(this.message);
  @override List<Object?> get props => [message];
}
\`\`\`

Always include: **Initial → Loading → Success/Loaded → Empty (if needed) → Error**.

### Equatable completeness
Every field that affects UI must be in \`props\`. Missing fields silently break \`BlocSelector\` / \`buildWhen\`.

### Events
- Descriptive names: \`LoadUserProfile\`, \`SubmitPayment\`, \`RetryTransaction\` — not \`Fetch\` / \`Update\`
- Immutable: \`final\` fields + \`const\` constructors + \`props\`

### BLoC responsibilities
- Thin: receive event → call use case → emit state
- Never call API/Dio directly
- Never inject another BLoC — inject UseCases
- After \`await\`: \`if (isClosed) return;\` before \`emit\`
- Prefer \`BlocSelector\` / \`buildWhen\` / \`listenWhen\` over full rebuilds
- Side effects (nav, snackbar) in \`BlocListener\`, not \`BlocBuilder\`

### Forbidden
- \`setState\` for loading/error/success flow state
- \`context.read<Bloc>()\` inside \`build()\` — use \`BlocBuilder\` / \`BlocSelector\`
- \`StreamBuilder\` / \`FutureBuilder\` over BLoC streams for feature state
- Business decisions in widgets (\`if (user.isPremium)\` → BLoC decides, widget renders)

---

## 4. SOLID (blocking if violated)

| Principle | Rule |
|-----------|------|
| **S** | One BLoC per screen concern; one use case per operation; no fetch+cache+analytics in one execute |
| **O** | Add new states/classes — don't break every switch by stuffing enums |
| **L** | Implementations honour full interface contract — no \`UnimplementedError\` stubs in prod paths |
| **I** | Narrow repositories (search vs booking vs status) — don't force fat interfaces |
| **D** | BLoC/UseCase depend on **abstract** repository interfaces, never \`*Impl\` |

---

## 5. Flutter UI best practices

### const
Every widget / \`EdgeInsets\` / \`TextStyle\` / \`BoxDecoration\` that is compile-time constant must be \`const\`.

### Extraction
- \`build()\` > ~50 lines → extract private widgets
- Repeated subtrees / own tap handlers → named widgets
- Lists that can grow → \`ListView.builder\` (not \`.map().toList()\` in Column)
- Stateful / reorderable list items → \`ValueKey(id)\`

### Context after async
\`\`\`dart
await doWork();
if (!context.mounted) return;
Navigator.of(context).push(...);
\`\`\`

### Spacing
Prefer design-system tokens (\`AppSpacing.sectionGap\`) — no unexplained magic numbers.

### Logging
Use project logger — never \`print()\` in production paths.

### Naming
- Screens: \`ProductReviewScreen\`
- BLoCs: \`ProductReviewBloc\` / events \`LoadProductReview\` / states \`ProductReviewLoaded\`
- Use cases: \`GetProductReviewUseCase\`
- Files: \`snake_case.dart\`

---

## 6. Testing (mandatory for core logic)

Every changed \`*bloc.dart\`, \`*cubit.dart\`, \`*usecase.dart\`, \`*util.dart\`, \`*helper.dart\` needs a \`*_test.dart\`.

Cover: loading, empty, error, success; network failure; invalid input; timeout.

Use \`bloc_test\` / \`mocktail\`. Prefer coverage ≥ 70% on changed core files.

---

## 7. Accessibility & platform

- Semantic labels on interactive widgets
- Contrast and tap targets per Material / Cupertino guidance
- iOS vs Android differences documented in \`design.md\` Platform Behavior

---

## 8. SpecDrive task tagging

| Task title contains | Owner |
|---------------------|-------|
| UI, widget, screen, layout, styling | Cursor/Claude (optional Design2Code if Figma token) |
| bloc, cubit, state, navigation, validation, repository, usecase, test | Cursor/Claude only — never Design2Code |

---

## 9. PR review checklist (agent must self-check)

Before marking a task complete:

1. No business logic in widgets
2. No DTO leakage into domain/UI
3. BLoC uses sealed states + complete \`props\`
4. UseCase → abstract Repository only
5. \`const\` where possible; no \`print\`
6. Tests exist for new BLoC/UseCase
7. \`design.md\` / requirements acceptance criteria met
`;
