# Product & Engineering Principles

These are the commitments that shape every decision in VisaFlow. They are intentionally
opinionated. Most are backed by an Architecture Decision Record in [decisions.md](./decisions.md);
where a principle is enforced by code or tests, that is noted so it stays true over time.

## 1. Privacy first

Sensitive personal data never leaves the user's device. No server, no database, no account, no
analytics, no third-party calls, no CDN. **Why:** the data is passport numbers and bank
balances; the safest place for it is nowhere but the user's own browser and files.
**Enforced by:** [ADR-001] (no database), [ADR-006] (no localStorage for data), the
[privacy model](./privacy.md), and the strict Content-Security-Policy posture (all assets
bundled, no network for user data).

## 2. The user owns the data

The dossier is the user's, in a portable file they control. Export and import are explicit user
actions; closing the tab discards in-memory state by design. **Why:** ownership means the
ability to leave. **Enforced by:** the import/export services and the "no silent persistence"
rule ([ADR-006]).

## 3. No vendor lock-in

Nothing about VisaFlow requires VisaFlow. The data format is open and documented; the app is
open source and self-hostable as static files. **Why:** a privacy tool you can't walk away from
isn't one. **Enforced by:** the [JSON format spec](./json-schema.md) and an MIT license.

## 4. Open, versioned JSON format

The dossier is a single documented JSON document with an explicit `schemaVersion`. It is
**language-independent** — the same dossier exports byte-identically in Turkish or English.
**Why:** portability and longevity. **Enforced by:** [ADR-010] (schema versioning), [ADR-012]
(stable language-independent domain values), and the `json-language-independence` test.

## 5. Deterministic validation

Validation is a set of pure functions `(Dossier) => ValidationFinding[]` composed by a runner
with a stable severity order. Same input, same findings, always — no randomness, no network, no
hidden state. **Why:** trust requires reproducibility. **Enforced by:** [ADR-003] and the rule
unit tests. See [validation-engine.md](./validation-engine.md).

## 6. Reusable country packs

Requirements are **configuration**, organized as `country → visa type → requirements` with
honest source metadata — never code, never prose baked into components. **Why:** the product
scales by adding data, not by editing the app. **Enforced by:** [ADR-004], [ADR-014],
[ADR-015]. See [country-pack-guide.md](./country-pack-guide.md).

## 7. Configuration over hardcoding

Requirements, conditional logic ("required if employed"), preparation milestones and source
citations live in configuration. Components render whatever the resolved template provides.
**Why:** contributors should be able to add a country without touching the engine.
**Enforced by:** the country-pack config layer and `resolveVisaTemplate()`.

## 8. Accessibility first

Keyboard navigation, screen-reader semantics, focus management and `prefers-reduced-motion` are
requirements, not polish. **Why:** an official, high-stakes process must be usable by everyone.
**Enforced by:** the design-system primitives, a single global focus system, motion that is
CSS-driven and reduced-motion-aware, and a11y assertions in the render tests.

## 9. Internationalization by design

The UI is bilingual (Turkish default, English), and text is never hardcoded — every string is a
key. Dates, numbers and currency are formatted only through one locale-aware helper.
**Why:** VisaFlow is Türkiye-first and international by ambition. **Enforced by:** [ADR-011],
the i18n parity test (`tr`/`en` carry identical keys), and `src/lib/format.ts`
(components never call `Intl` directly).

## 10. Pure business logic

Domain logic — validation, readiness derivation, template resolution — is expressed as pure
functions with no side effects and no UI dependency. **Why:** pure logic is testable, portable
and predictable. **Enforced by:** the rules layer ([ADR-003]) and the dashboard presentation
adapter ([ADR-017]), both unit-tested without React.

## 11. Framework-independent domain layer, where practical

The `domain/` and `config/` layers depend on Zod and plain TypeScript, not on React. The
presentation layer depends on the domain, never the reverse. **Why:** the valuable part (the
model of visa preparation) should outlive any framework choice. **Enforced by:** the layer
boundaries in [architecture.md](./architecture.md) — imports point downward only.

## 12. Long-term maintainability

Decisions are recorded (ADRs), reusable UI is demonstrated in the [playground](./playground.md)
before it is used, models are shaped for where the product is going (e.g. multi-application),
and duplication is consolidated to a single source of truth. **Why:** this is a product, not a
sprint. **Enforced by:** the ADR log, the demonstrate-before-use rule ([ADR-020]), and the
documentation taxonomy.

## The hard line: no prediction

Underneath all of the above sits one non-negotiable: VisaFlow will **never** compute a visa
approval probability or a rejection-risk score. It measures organization and consistency, not
outcomes. **Enforced by:** [ADR-016] and the Settings disclaimer.

[ADR-001]: ./decisions.md
[ADR-003]: ./decisions.md
[ADR-004]: ./decisions.md
[ADR-006]: ./decisions.md
[ADR-010]: ./decisions.md
[ADR-011]: ./decisions.md
[ADR-012]: ./decisions.md
[ADR-014]: ./decisions.md
[ADR-015]: ./decisions.md
[ADR-016]: ./decisions.md
[ADR-017]: ./decisions.md
[ADR-020]: ./decisions.md
