# Validation Engine

The validation engine is what makes VisaFlow more than a checklist: it reads a dossier and
reports **findings** — concrete, actionable inconsistencies (a passport expiring too soon,
insurance that ends before the trip, a missing required document). It is deterministic, pure,
and framework-independent.

See also: [architecture.md](./architecture.md) (where this layer sits), [principles.md](./principles.md)
(#5 deterministic validation), and [ADR-003] / [ADR-016] in [decisions.md](./decisions.md).

## Shape of a rule

A rule is a pure function from a dossier to zero or more findings:

```ts
type ValidationRule = (dossier: Dossier) => ValidationFinding[]
```

Rules live in `src/domain/rules/` (`trip`, `passport`, `accommodation`, `insurance`,
`employment`, `document`, `sponsor`). They have **no side effects**, make **no network calls**,
and never read the clock in a way that changes results for the same input. A rule returns an
empty array when it has nothing to report.

## The finding is language-independent

Findings carry **stable keys and typed parameters**, never translated prose. Prose is resolved
at the UI boundary, per locale. This is the whole reason a finding can be produced in the domain
layer and rendered identically in Turkish or English.

```ts
interface ValidationFinding {
  id: string                    // stable identifier for this finding instance
  ruleId: string                // which rule produced it, e.g. "passport.validAfterTrip"
  severity: 'error' | 'warning' | 'info'
  messageKey: string            // base key into the `validation` namespace
  messageParams?: FindingParams // typed interpolation values (see below)
  suggestedActionKey?: string   // defaults to `${messageKey}.action`
  relatedFields: string[]       // field paths the finding concerns
}
```

`FindingParams` splits interpolation by kind so the UI can format each correctly:

```ts
interface FindingParams {
  values?: Record<string, string | number>
  dates?: Record<string, string>                 // ISO strings, formatted per locale
  documentCodes?: Record<string, string[]>       // rendered via Intl.ListFormat + labels
  money?: Record<string, { amount: number; currency: string }>
  enumKeys?: Record<string, string>              // translation keys for enum values
}
```

Findings are **never persisted**. They are computed at render time and do not appear in the
exported JSON, so their shape can evolve freely without any dossier-compatibility risk.

## The runner

`src/domain/rules/runner.ts` composes all rules, catches per-rule errors so one bad rule can't
break the page, and sorts findings by severity (error → warning → info):

```ts
export function runValidation(dossier: Dossier): ValidationResult
// → { findings, errorCount, warningCount, infoCount, passedRules, totalRules }
```

Convenience helpers are also exported: `runSpecificRules`, `getValidationErrors`,
`hasValidationErrors`, and `getValidationSummary`.

## The i18n boundary

`src/lib/finding-text.ts` is the single place findings become prose. `useFindingText()` returns
a function that resolves `validation:${messageKey}.title` / `.description` / the action key, and
interpolates the params — dates via the locale formatter, `documentCodes` via `Intl.ListFormat`
and the document-label resolver, `money` via the currency formatter, `enumKeys` via the dynamic
translator. Components call `useFindingText()`; they never assemble finding text themselves.

## Data flow

```
Dossier ──▶ runValidation() ──▶ ValidationFinding[]  (keys + params, sorted)
                                      │
                                      ▼
                         useFindingText()  ──▶  localized {title, description, action}
                                      │
                                      ▼
              ConsistencyChecksPage · Dashboard ValidationSummary
```

## Adding a rule

1. Add a function to the appropriate file in `src/domain/rules/` (or a new file), returning
   `ValidationFinding[]` with a stable `id` / `ruleId` and a `messageKey`.
2. Register it in the relevant rules array consumed by `runner.ts`.
3. Add the message under `src/i18n/locales/{tr,en}/validation.json` (parity test enforces that
   `tr` and `en` carry identical keys).
4. Add unit tests in `src/tests/rules/` asserting `id`/`severity`/params for representative
   inputs. Tests run without React — that is the point of keeping rules pure.

## The one thing rules must never do

Rules describe **facts about the dossier** ("expiry date is before trip end"). They must never
express or imply an outcome — no "likely to be refused", no risk score. That line is
non-negotiable ([ADR-016]).

[ADR-003]: ./decisions.md
[ADR-016]: ./decisions.md
