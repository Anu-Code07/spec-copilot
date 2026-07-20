# React Native coding standards

> Written to `.specdrive/coding-style.md` on `spec init --stack react-native`.

## Structure

`src/features/<feature>/` with `screens/`, `components/`, `hooks|store/`, `domain/`, `data/`. Screens compose; they do not fetch.

## State

Discrete status unions (`idle | loading | success | empty | error`) — not boolean soup. Narrow Zustand selectors.

## Lists & performance

`FlatList` / `FlashList` with stable `keyExtractor`. Memoize heavy rows.

## Domain vs data

No React Native imports in domain. Map DTOs before UI.

## Navigation & a11y

Serializable route params; navigate outside render; accessibility labels on CTAs.

## Tests

Jest + Testing Library for stores/hooks/domain.

## Task routing

UI/screen/layout → host AI (+ optional Design2Code). Store/hook/navigation/api/tests → host AI only.

Full detail ships in `.specdrive/coding-style.md` after init.
