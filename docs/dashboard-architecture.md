# Dashboard Architecture

The Dashboard is VisaFlow's command center: at a glance it answers *how ready is my dossier,
what should I do next, what dates are approaching, are there consistency problems.* It is built
as a **thin composition of reusable widgets over a pure presentation adapter** — the pattern to
follow for any data-dense screen.

See also: [architecture.md](./architecture.md) (presentation layer), [validation-engine.md](./validation-engine.md)
(where findings come from), [playground.md](./playground.md), and [ADR-017] in
[decisions.md](./decisions.md).

## Two layers

**1. The presentation adapter — `src/features/dashboard/dashboard-model.ts`.**
`buildDashboardModel(state)` derives everything the dashboard shows: document readiness buckets,
completion percentage, countdowns, an organizational readiness verdict, prioritized next
actions, a timeline, and requirement/source status. It is:

- **pure** — a plain function, unit-tested with no React or providers;
- **i18n- and `Intl`-free** — it returns raw numbers, ISO dates, tones and stable keys, so no
  locale-formatted value can leak into it;
- **non-duplicating** — it re-encodes no business rule. Validation comes from `runValidation`,
  requirement/source resolution from `resolveVisaTemplate`, applicability from the config layer.
  The adapter only adds one documented definition of document readiness and a few derived view
  descriptors.

**2. The widgets — `src/components/dashboard/*`.** Each section is a standalone, prop-driven
component fed from the model: `ReadinessHero`, `MetricsRow`, `NextActions`, `UpcomingTimeline`,
`DocumentsSummary`, `ValidationSummary`, `TripSummary`, and `DashboardSkeleton`. `DashboardPage`
holds only layout and order — no data logic.

```
DossierState ──▶ useDashboardModel() ──▶ DashboardModel
                                            │  (per-application view model)
        ┌───────────────┬──────────────┬───┴────────────┬───────────────┐
        ▼               ▼              ▼                ▼               ▼
  ReadinessHero    MetricsRow    NextActions     DocumentsSummary  ValidationSummary …
```

## Organizational, never predictive

The readiness ring shows a percentage and an *organizational state* ("Preparing well", "Ready
for your appointment", "Documents remaining"). It describes how assembled the dossier is — it is
**never** an approval-probability or risk indicator ([ADR-016]). New dashboard signals must
respect this line.

## Built for where the product is going

`buildDashboardModel` returns `{ applications, active }` — a list of per-application view models
with the active one selected. Today there is always exactly one application; the shape exists so
a future multi-application phase (see [roadmap.md](./roadmap.md)) fits without reshaping any
widget prop. No multi-application UI, selection or storage is built yet — this is structure only.

## Reusable primitives

Two dependency-free primitives back the widgets and live in the design system:
`src/components/ui/readiness-ring.tsx` (an understated SVG progress ring) and
`src/components/ui/timeline.tsx` (a quiet vertical timeline). Like all reusable UI, they are
demonstrated in the [Playground](./playground.md) before being used in the app.

## Adding a dashboard widget

1. Add the derived data to `dashboard-model.ts` (keep it pure — raw values and keys only).
2. Write a prop-driven widget in `src/components/dashboard/` that renders that slice; format
   dates/currency via `useFormatters()` and findings via `useFindingText()`.
3. Demonstrate it in `/playground` (Dashboard section) with a fictional demo model.
4. Compose it into `DashboardPage`.
5. Add a unit test for the new model logic and, if useful, a render test.

## Motion

Dashboard micro-interactions (fade / slide / scale, progress transitions, skeleton shimmer) are
a small CSS keyframe vocabulary defined once in `src/index.css`. They are disabled automatically
by the global `prefers-reduced-motion` rule — widgets do not implement their own motion handling.

[ADR-016]: ./decisions.md
[ADR-017]: ./decisions.md
