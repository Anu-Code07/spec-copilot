# Flutter coding standards

> Source of truth for SpecDrive: this content is written to `.specdrive/coding-style.md` on `spec init --stack flutter` / `npx @specdrive/mcp setup --stack flutter`.

See the full document in the package template, mirrored below for the docs site.

---

SpecDrive enforces **production Flutter standards**: Clean Architecture + BLoC.

## Layers

```
lib/src/features/<feature>/
├── presentation/   # Widgets, BLoCs — dumb UI
├── domain/         # Entities, abstract repos, use cases (pure Dart)
└── data/           # DTOs, datasources, repository impls
```

**UI → BLoC → UseCase → Repository.** Never skip layers. Never put `fromJson` on entities. Never call repositories from widgets.

## BLoC

- Sealed/discrete states: Initial, Loading, Loaded/Empty, Error — **not** boolean flags
- Complete Equatable `props`
- Descriptive events (`LoadUserProfile`, not `Fetch`)
- Thin bloc: event → use case → emit; `if (isClosed) return` after await
- Side effects in `BlocListener`; prefer `BlocSelector` / `buildWhen`

## SOLID

Depend on abstractions; one use case per operation; split fat repositories; no god-BLoCs.

## UI

- `const` everywhere possible
- Extract `build()` over ~50 lines
- `ListView.builder` for dynamic lists + keys
- `context.mounted` after async
- Design-system spacing; no `print()`

## Tests

Every new `*bloc*`, `*usecase*`, helper needs `_test.dart`. Cover loading/empty/error/success.

## Task routing

| Title keywords | Owner |
|----------------|-------|
| UI, widget, screen, layout | Cursor/Claude (+ optional Design2Code) |
| bloc, state, navigation, validation, test | Cursor/Claude only |

Full detail ships in `.specdrive/coding-style.md` after init.
