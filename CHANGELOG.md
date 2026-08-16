# Changelog

Notable changes to VisaFlow are documented here. The format is inspired by
[Keep a Changelog](https://keepachangelog.com/), and VisaFlow follows
[Semantic Versioning](https://semver.org/).

> **Two independent versions.** This file tracks the **application** version. The dossier JSON
> format carries its own `schemaVersion`, documented in [docs/json-schema.md](docs/json-schema.md),
> and country packs carry a third `templateVersion`. They move independently — reaching application
> v1.0.0 did **not** change the dossier schema, which remains `1.0.0`.

## [1.0.0] - 2026-08-16

First public release. VisaFlow is a private-by-architecture workspace for preparing an
international visa application: a structured dossier, deterministic consistency checks, a
preparation timeline, and country-specific requirements — with every byte of personal data staying
on your own device.

### Added

- **Privacy-first, client-only architecture.** No server, no account, no database, no analytics, no
  third-party or CDN requests. The dossier lives in browser memory and in a JSON file you own.
- **Structured dossier** — applicant, trip, employment, finances, sponsors, documents, appointment
  and notes as first-class, schema-validated data.
- **Greece Schengen short-stay tourism country pack** — the first production pack, authored as
  `country → visa type → requirements` data with conditional logic and honest source metadata.
  Requirements are translation keys, never baked-in prose; unverified sources say so plainly.
- **Deterministic consistency validation** — pure `(Dossier) => ValidationFinding[]` rules composed
  by a runner with a stable severity order. Same input, same findings, always. Findings carry
  stable keys and typed parameters, so they render identically in either language.
- **Canonical dossier readiness** — one shared derivation behind every surface, so the dashboard,
  documents workspace, timeline, validation center and final review can never disagree about how
  ready the dossier is.
- **Command-center dashboard** — readiness, the recommended next action, upcoming dates and open
  findings at a glance.
- **Guided workflows** for Applicant, Trip, Employment and Finance, with contextual guidance at the
  point of entry rather than in a manual.
- **Sponsor workspace** — add, edit and link sponsors and their supporting evidence.
- **Documents workspace** — status tracking, requirement matching, filtering, and a recommended
  next document.
- **Timeline** — appointment, preparation milestones, trip dates and document expiry, presented as
  a recommended plan rather than official deadlines.
- **Validation Center** — every consistency finding grouped and explained, with a route to the
  field that resolves it.
- **Final Review and departure check** — a pre-submission review plus a focused "before you leave
  for the appointment" view.
- **Settings and first-run onboarding** — appearance, language, country packs, privacy, local data,
  import/export and about, plus a guided first run that can load a fictional example dossier.
- **Open JSON import/export** — one documented, versioned, language-independent document. The same
  dossier exports byte-identically whether the interface is Turkish or English.
- **Turkish and English throughout**, Turkish by default. Language is a non-personal interface
  preference and never changes exported data.
- **Responsive light/dark design system** built on design tokens, developed and demonstrated in an
  in-app Playground before use.

### Accessibility

- A single global focus system: one `:focus-visible` ring for every control in the app.
- Overlays (dialogs, sheets, alert dialogs) trap focus while open, close on `Escape`, and return
  focus to whatever opened them — including overlays opened from a different component subtree, a
  URL parameter, or a file input.
- Keyboard-operable navigation with a skip link, visible focus throughout, and no tab traps.
- Verified in a real browser at 390px, 834px and 1440px, in both themes and both languages.

### Privacy / Security

- Personal data is never written to browser storage. The only keys VisaFlow persists are
  `visaflow-theme` and `visaflow-locale`, both non-personal interface preferences.
- Data leaves the browser only when you explicitly export a JSON file. Closing or refreshing the
  tab discards the in-memory dossier by design — export first.
- All assets are bundled locally; the application makes no network requests.

### Known boundaries in 1.0.0

One application at a time · the dossier exists only in memory until exported · document references
are text, not uploaded files · Greece Schengen short-stay tourism is the only production country
pack · no offline PWA.

VisaFlow is an organizational tool. It does not provide legal advice, represent any embassy or visa
center, submit applications, generate official forms, or predict a visa decision — and it never
will estimate an approval probability or refusal-risk score.

[1.0.0]: https://github.com/fvarli/visaflow/releases/tag/v1.0.0
