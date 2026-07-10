# Frontend Boundaries

This project keeps React and data code in explicit layers. The goal is to make it
obvious where new UI and state logic should live.

`src/domain` owns framework-free entity contracts. `src/lib` owns generic
infrastructure and may depend on `src/domain`, but neither layer may import
from `features` or `app`.

## `src/app`

`app` is the Next.js route and page composition layer.

- `page.tsx`, `layout.tsx`, `template.tsx`, and `route.ts` belong here.
- Route groups separate `(public)`, `(auth)`, and `(workspace)` composition without changing URLs.
- `app/(workspace)/_components` owns the authenticated shell, navigation, and settings UI.
- `app/<route>/_components` is for route-private page sections. These components
  may compose feature components, but they should not own core business rules.
- `app/<route>/_hooks` is only for route-private controller state, such as modal
  visibility, selected editing records, top bar bindings, and delete
  confirmation flow.

Do not put domain data rules or CRUD logic in `app`.

## `src/features`

`features` owns domain behavior.

- `features/<domain>/components` is for reusable UI that speaks the domain
  language, such as `GoalCard`, `HabitList`, or `MomentModal`.
- `features/<domain>/hooks` is for domain data, mutations, derived domain state,
  and feature-level orchestration.
- Pure domain helpers can sit beside the hooks when they are useful without
  React, such as projection, filtering, and validation functions.

If a component or hook would make sense on more than one route, it usually
belongs in `features`.

Supabase snake_case mapping belongs in `src/data/supabase`. Feature
hooks consume camelCase domain entities and must not query Supabase or
IndexedDB directly.

Composition features (`workspace`, `today`, and `profile`) may combine domain
features. Domain features must not import composition features or other domain
features.

## `src/data`

- `data/local` owns IndexedDB persistence and the durable mutation worker.
- `data/react` adapts the local-first store to React Query.
- `data/supabase` owns remote contracts and snake_case mapping.

`data` may depend on `domain` and infrastructure in `lib`, but never on UI,
features, or app routes.

Persisted domain entities must not contain presentation-only resources such as
signed URLs or `blob:` URLs. Feature view hooks resolve those values in memory.

## `src/shared`

`shared` is for code with no product-domain meaning.

- `shared/components/ui` contains base UI primitives such as buttons, cards,
  dialogs, inputs, and empty states.
- `shared/components/date` contains reusable date controls.
- `shared/i18n` contains language context utilities.

`shared` must not import from `features` or `app`.

## Placement Rules

- Business data and business operations go in `features/<domain>/hooks`.
- Business-specific visual components go in `features/<domain>/components`.
- Page-only sections go in `app/<route>/_components`.
- Page-only UI/controller state goes in `app/<route>/_hooks`.
- Generic visual primitives go in `shared/components/ui`.

Avoid duplicate names across `app` and `features`. Prefer names that expose the
scope, such as `GoalList` in `features/goals/components` and
`TodayGoalsSection` in `app/(workspace)/home/_components`.
