# Final Review architecture

`/review` — "Final Review" / "Son Kontrol" — is the last look before the appointment. It answers a
different question from the Validation Center: *"what do I have, what am I still missing, what do I
bring, and am I organised for the day?"* rather than *"what is inconsistent?"* Decisions:
[ADR-032](./decisions.md) (the workspace) and [ADR-033](./decisions.md) (readiness + the departure
mode).

## Two views, one model

```
/review              → full review
/review?mode=departure → departure check
```

Both render the **same** `FinalReviewModel`. The mode is derived from the URL (bookmarkable,
Back/Forward-safe, unknown values fall back to `full` silently) using the pattern the Timeline's
`?mode=` established. It is presentation state — nothing is persisted and no storage key exists.

**Full review** — application summary → submission checklist → what still needs attention → what
already looks good → appointment preparation → print package.

**Departure check** — a compact, deliberately mobile-first card designed at 390px, because this is
the one VisaFlow view likely to be opened on a phone on the way out the door. Five blocks, in the
order you need them: appointment → what goes in the folder → pages VisaFlow can generate → what is
unresolved → one action, then a calm footer. It is *not* a compressed copy of the full review.

## What it composes (and never re-derives)

| Concern | Source |
|---|---|
| Readiness percentage, state, outstanding | `src/features/readiness/` ([ADR-033]) |
| Findings, counts, per-area health | `buildValidationModel` used **whole** |
| Appointment-day readiness | the Timeline's exported `buildAppointmentDay` |
| Document applicability | the country pack |
| Priority (`primaryAction`) | `deriveNextActions(...)[0]` |

The only derivations Final Review adds are the **submission checklist grouping** and the
**print-package split**.

## The submission checklist

One derivation (`buildSubmissionChecklist`) backs both the item-level list and the physical-dossier
plan, so they can never disagree. Rows come from the applicant's own documents **and** the applicable
template requirements (deduped by `code`, the dossier record winning).

`ChecklistState` is a *presentation grouping* of `Document.status`, never a new status system:
`ready` · `obtained` · `needsAttention` · `missing` · `optional` · `notApplicable`.

`obtained` (`received`) carries the calm `info` tone, a `PackageCheck` icon and its own microcopy
("Received — confirm to mark ready"). It shares the tone with `requested` deliberately — both are
workflow progress — and is told apart by icon and label, never by hue ([ADR-034]).

The **All / Needs attention** filter is view state only. `filterChecklist('all')` returns the same
object by identity; `'attention'` rebuilds the groups from the surviving rows, drops empty groups,
preserves `SUBMISSION_GROUP_ORDER` and re-tallies — counts are always derived, never carried.
"Needs attention" is `missing | obtained | needsAttention`.

> `checklist.counts.actionable` is **not** the readiness denominator, and is never rendered as a
> ratio. The checklist is an **inventory** — "11 items in your appointment package · 4 need
> attention" — while readiness is the one percentage ([ADR-034](./decisions.md)). Optional
> requirements with no record are excluded: a suggestion nobody added is not something you carry.
> Optional documents the applicant *did* create stay in the package, which is why the inventory is a
> different population from the readiness denominator and must not be shown as a fraction.

## The print package

Two deliberately separate concepts, enforced by type shape rather than wording:

- **Generated sheets** — what VisaFlow can produce from dossier data. `GeneratedSheet` is
  `{ id, state, itemCount? }` over a **closed** id union, so it has no field capable of carrying a
  document code, id or title. An applicant's external document structurally cannot appear here, and
  a test asserts it.
- **Physical bundles** — the applicant's own files, at roll-up granularity only (the item detail
  lives in the checklist above). VisaFlow never holds, stores, embeds or prints these.

No PDF generation, and **no Print button** — a button that does nothing is worse than none.

## Honesty guardrails

- Never claims physical possession: "bundle to bring", never "packed" or "in your bag". There is no
  packed-state, because VisaFlow could not truthfully persist or verify one.
- "At the appointment" shows only what the applicant recorded plus the country pack's own
  `notesKeys`. There is deliberately **no fabricated after-submission checklist**.
- Readiness is captioned as organizational and explicitly not a prediction ([ADR-016]).

## The heading contract

`src/tests/ui/review-page.test.tsx` asserts one `h1` and **no skipped heading levels**, in both
modes. Consequences for anyone extending this page:

- The departure view opens with an `h2` (`SectionHeader`) before any `h3`.
- `EmptyState` renders its own `h2`, so the checklist's empty and "nothing needs attention" panels
  are hand-rolled instead — see the comments in `SubmissionChecklist.tsx`.
- Radix `AccordionTrigger` injects an `h3`; no accordion is used here.
