# Playground

The Playground (`/playground`, `src/pages/PlaygroundPage.tsx`) is VisaFlow's component
workbench: a single page that renders every reusable UI primitive and dashboard widget in its
meaningful states, in both languages and both themes.

## Why it exists — a lightweight Storybook alternative

Storybook is a fine tool, but it is a heavy dependency: its own build, its own runtime, its own
config, and a large surface to keep in sync with the app. VisaFlow's design system is small
enough that a **single in-app page** gives us the same core benefit — see and iterate on
components in isolation — with **zero extra dependencies**, using the exact same providers,
tokens, i18n and theme as production. It is code-split like any other route, so it costs nothing
until visited, and it is not linked from the production sidebar.

Benefits we keep from the "Storybook idea":

- Every primitive visible at once, so a regression in any of them is caught by eye (and by a
  render test that mounts the whole page).
- A place to design a component's API and states before wiring it into a real screen.
- A living, always-current catalogue — because it runs the real components, it can't drift the
  way separate stories can.

## The rule: demonstrate before use

**Every reusable UI primitive and dashboard widget must appear in the Playground before it is
used across the application** ([ADR-020]). Concretely:

- New file in `src/components/ui/` (a primitive) or `src/components/dashboard/` (a widget) →
  add a Playground demo in the **same** change.
- The demo shows the component's real states (default, tones/sizes, empty, loading, long-label /
  long-Turkish stress cases where relevant).
- One-off, page-specific components are exempt; anything meant to be reused is not.

This keeps the design system honest: if a component is worth reusing, it is worth demonstrating,
and the demo is where its API gets pressure-tested.

## How the page is organized

`PlaygroundPage` renders a `PageHeader` and then one section component per area (Foundations,
Typography, Buttons, Badges, Forms, Feedback, Data display, Overlays, Composition, Dashboard,
Internationalization). Two local helpers give every section the same rhythm:

- `Block({ id, title, description, children })` — a titled section card.
- `Row({ label, hint, children })` — a labelled specimen row.

To add a demo: write a section (or a `Row` inside an existing `Block`), register its id in the
`SECTIONS` tuple (drives the in-page nav), and render it. Titles/labels are translation keys in
`src/i18n/locales/{tr,en}/playground.json` (the parity test enforces `tr`/`en` key equality).

## Bilingual and theme-aware by construction

The Playground runs inside the real `LocaleProvider` and `ThemeProvider`, with the language and
theme switchers in its header. Reviewing a component means checking it in Turkish and English,
light and dark — the same matrix the app ships in.

[ADR-020]: ./decisions.md
