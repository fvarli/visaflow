# VisaFlow

**The open-source, privacy-first application workspace for international visa preparation.**

VisaFlow turns a stressful, error-prone process into a structured one — a validated dossier, a
deterministic consistency engine, a timeline of the dates that matter, and country-specific
requirements — while keeping **every byte of your personal data on your own device**. No server,
no account, no tracking. Your data lives in the browser and in a JSON file you own.

> VisaFlow is an organizational tool. It does **not** provide legal advice, represent any
> embassy or visa center, submit applications, or predict a visa decision. Always verify
> requirements using current official sources.

## Vision

Rather than being limited to a checklist, VisaFlow provides a structured dossier, validation
engine, timeline, country-specific requirements, and reusable workflows that help applicants
organize complex visa processes while keeping all personal data under their own control. The
full statement and reasoning live in [docs/vision.md](docs/vision.md).

## Why VisaFlow exists

Visa preparation means juggling passports, finances, employment letters, reservations, insurance
and appointment logistics for weeks — where one inconsistency (a passport that expires too soon,
coverage that ends before the trip) can cost an appointment or a refusal. Spreadsheets don't
understand the domain; cloud "visa helpers" ask you to hand your passport number and bank balance
to a third party. VisaFlow is the alternative: software that understands the domain **without
ever taking custody of your data**.

## Core principles

Privacy first · The user owns the data · No vendor lock-in · Open, versioned JSON format ·
Deterministic validation · Reusable country packs · Configuration over hardcoding ·
Accessibility first · Internationalization by design · Pure business logic · Framework-independent
domain layer where practical · Long-term maintainability.

Each is explained and tied to an ADR in [docs/principles.md](docs/principles.md). The hard line:
VisaFlow will **never** estimate an approval probability or refusal-risk score.

## Features

- **Structured dossier** — applicant, trip, employment, finances, sponsors, documents,
  appointment and notes as first-class, schema-validated data.
- **Consistency validation** — deterministic checks surface inconsistencies (dates, coverage,
  completeness) as actionable findings.
- **Command-center dashboard** — readiness, next actions, upcoming dates and open findings at a
  glance (widget-based; organizational metrics only, never a prediction).
- **Timeline** — appointment, preparation milestones, trip and document-expiry dates.
- **Country packs** — requirements as `country → visa type → requirements` with honest
  official-source metadata.
- **Bilingual** — Turkish (default) and English; the choice is a non-personal preference and the
  exported JSON is identical regardless of language.
- **Privacy-first** — all data stays in your browser; nothing is sent anywhere.
- **Open JSON import/export** — full control of your data in a portable, documented format.

## Product architecture

VisaFlow is a client-only React/TypeScript application organized into clear layers, each with a
single responsibility and dependencies that point downward only:

| Layer | Responsibility |
|-------|----------------|
| **Domain** | Zod schemas, branded types, and pure validation rules — the model of visa preparation |
| **Validation engine** | Composes pure rules into deterministic findings ([docs/validation-engine.md](docs/validation-engine.md)) |
| **Country packs** | `country → visa type → requirements` configuration + source metadata ([docs/country-pack-guide.md](docs/country-pack-guide.md)) |
| **Import / Export** | The open JSON boundary in and out of the app ([docs/json-schema.md](docs/json-schema.md)) |
| **Presentation** | React pages, the design system, and the widget-based dashboard ([docs/dashboard-architecture.md](docs/dashboard-architecture.md)) |
| **Privacy** | The cross-cutting invariant: nothing personal leaves the device ([docs/privacy.md](docs/privacy.md)) |

The full directory map and the layer boundaries are in
[docs/architecture.md](docs/architecture.md). Reusable UI is developed and demonstrated in the
[Playground](docs/playground.md) before being used in the app.

## Screenshots

_Placeholder — screenshots to be added._

## Demo

_Placeholder — a hosted demo will be linked here._

## Installation

**Prerequisites:** Node.js 22+ (see `.nvmrc`) and pnpm 11+ (enforced via `packageManager`).

```bash
git clone https://github.com/fvarli/visaflow.git
cd visaflow
pnpm install
pnpm dev            # http://localhost:5173
```

New machine? See [docs/fresh-machine-setup.md](docs/fresh-machine-setup.md).

## Development

```bash
pnpm dev            # start the dev server
pnpm lint           # ESLint
pnpm typecheck      # TypeScript (tsc -b)
pnpm test           # Vitest
pnpm build          # production build
pnpm format         # Prettier
```

**Stack:** React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS v4 · shadcn/ui · React Router v7
· React Hook Form + Zod v4 · i18next · date-fns · Vitest.

Contributions are welcome — start with [CONTRIBUTING.md](CONTRIBUTING.md) and
[docs/principles.md](docs/principles.md).

## Privacy model

Privacy is the architecture, not a feature:

- **No server, no account, no database** — VisaFlow is a static client-side app.
- **No analytics, no tracking, no third-party or CDN requests** — all assets are bundled.
- **No personal data in browser storage** — the dossier lives only in memory; the *only*
  permitted `localStorage` keys are `visaflow-theme` and `visaflow-locale`, both non-personal
  interface preferences.
- **Explicit export/import** — your data leaves the browser only when you download a JSON file.

Closing or refreshing the tab discards in-memory data by design — export first. Full details in
[docs/privacy.md](docs/privacy.md); the security policy is in [SECURITY.md](SECURITY.md).

## Data ownership

Your dossier is yours, in a portable file you control. VisaFlow reads and writes a single,
documented, **versioned** JSON document ([docs/json-schema.md](docs/json-schema.md)) that is
**language-independent** — the same dossier exports byte-identically whether the UI is in Turkish
or English. Because the format is open and the app is self-hostable static files, there is no
lock-in: you can leave with your data at any time.

## Country packs

Support for a country is **authored data**, not code. A pack declares its visa types and their
requirements (with conditional logic like "required if employed"), preparation milestones, and
honest source citations — requirements carry translation keys, never baked-in prose. VisaFlow
does not scrape official sites or invent dates; an unverified pack says so plainly. See
[docs/country-pack-guide.md](docs/country-pack-guide.md). Currently one production pack ships:
Greece (Schengen short-stay tourism).

## Validation engine

Validation is a set of pure functions `(Dossier) => ValidationFinding[]` composed by a runner
with a stable severity order — same input, same findings, always. Findings carry **stable keys
and typed parameters**, not prose, so they render identically in either language and never touch
the exported JSON. Details in [docs/validation-engine.md](docs/validation-engine.md).

## JSON format

Import/export uses one documented JSON document with an explicit `schemaVersion` (currently
`1.0.0`) and forward-compatible migration notes. See [docs/json-schema.md](docs/json-schema.md).

## Roadmap

VisaFlow is planned as product phases. In brief:

- **Current** — a complete single-application workspace: dossier, validation engine, timeline,
  dashboard, design system + playground, TR/EN i18n, JSON import/export, one country pack (Greece).
- **Next** — multiple saved dossiers, a richer core workspace, more visa types and country packs.
- **Future** — a country-pack ecosystem with verified sources, optional self-hosting, reviewer
  collaboration, and organizational (never predictive) AI assistance.

The phased plan, the reasoning behind each phase, and the explicit non-goals are in
[docs/roadmap.md](docs/roadmap.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). New reusable UI must be demonstrated in the
[Playground](docs/playground.md) first; new countries follow the
[country pack guide](docs/country-pack-guide.md); architectural decisions are recorded in
[docs/decisions.md](docs/decisions.md).

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

VisaFlow is provided "as is", without warranty of any kind. Its document checklists and
validation rules are for organizational purposes only and are not official requirements. Always
verify requirements with the official embassy, consulate, or authorized visa center for your
application.
