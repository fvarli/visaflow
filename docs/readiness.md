# Readiness

This is the canonical description of what "readiness" means in VisaFlow, who owns it, and how every
surface consumes it. The reasoning and history are in [ADR-033](./decisions.md); the hard line it
serves is [ADR-016](./decisions.md) — no approval or refusal prediction, ever.

## The one definition

**Dossier readiness is an organizational measure of how much of the applicable document preparation
is confirmed done.** Nothing more.

```
numerator   = applicable documents with status 'ready'
denominator = required documents whose status is not 'not_applicable',
              plus applicable required requirements with no document record yet
percent     = round(numerator / denominator × 100)
```

- `applicable === 0` → `percent 0`, `complete false`, `hasApplicableWork false`. **Never 100%.**
- Optional documents never enter either side.
- Validation findings never enter the arithmetic at all.

## Status semantics

Each `Document.status` has exactly one meaning across the whole product.

| Status | Class | In numerator | In denominator | Meaning |
|---|---|---|---|---|
| `not_started` | `notStarted` | no | yes | Not obtained; preparation has not begun |
| `requested` | `inProgress` | no | yes | Requested / being obtained |
| `received` | `obtained` | **no** | yes | **In hand, not yet confirmed dossier-ready** |
| `needs_update` | `needsUpdate` | no | yes | In hand but needs correction or renewal |
| `ready` | `ready` | **yes** | yes | Confirmed ready for the dossier |
| `not_applicable` | `notApplicable` | no | **no** | Does not apply to this applicant |

Two invariants hold for every `DocumentReadiness` value, both asserted by test:

```
ready + obtained + inProgress + notStarted + needsUpdate === applicable
applicable + notApplicable                              === requiredTotal
```

The first is why a segmented readiness bar can be drawn honestly: every applicable document occupies
exactly one visible segment, with no unexplained remainder.

## Readiness is a ratio; the submission checklist is an inventory

These are different questions and must never look like competing progress metrics
([ADR-034](./decisions.md)):

| | Readiness | Submission checklist |
|---|---|---|
| Question | *How much of my required dossier is confirmed ready?* | *What belongs in my appointment package?* |
| Shape | a percentage + `N of M` | a count + *"M need attention"* |
| Population | applicable **required** work | everything the applicant actually carries |

Exactly one percentage is shown for a dossier. The checklist never renders a ratio,
a bar or a score — only an inventory count and how many of those items want action.

## Three distinct concepts

VisaFlow measures three different things and never blends them into one number.

| Concept | Shape | Owner |
|---|---|---|
| **Dossier readiness** | a percentage | `src/features/readiness/` |
| **Consistency health** | counts + a verdict, never a percentage | `src/features/validation/` |
| **Appointment preparation** | a discrete four-item check | `src/features/timeline/` |

A dossier can be 100% ready and still carry findings; it can be finding-free and half-assembled.
Both cases are covered by invariant tests. The **only** point of contact is `deriveReadinessState`,
where a blocking finding gates the "ready for your appointment" verdict — it never changes the
percentage.

## Task completion ≠ dossier readiness

The one sanctioned divergence, kept deliberately:

- A Timeline preparation task — *"obtain the bank statement"* — **is** satisfied by `received`.
  `timeline-tasks.ts` keeps this behaviour.
- *"Is the bank statement dossier-ready?"* is satisfied only by `ready`. Readiness,
  `buildAppointmentDay` and the submission checklist all require it.

Both are correct because the questions differ. An invariant test asserts both simultaneously, so a
future contributor cannot "unify" them without a failing test explaining why not.

## Module map

```
src/features/readiness/
├── readiness-types.ts        # ReadinessClass, DocumentReadiness, READINESS_CLASS
├── document-readiness.ts     # buildDocumentReadiness + isDossierReady/isObtained/isApplicable
├── requirement-readiness.ts  # requiredRequirementCodes — the bridge to the country pack
└── readiness-model.ts        # ReadinessState, deriveReadinessState, deriveNextActions
```

The first three import only domain types. The module is a **graph sink** — everything imports it and
it imports nothing from `features/` — so no consumer can introduce a cycle.

## Who consumes it

| Surface | What it shows |
|---|---|
| Dashboard | the ring + verdict + next action + documents breakdown |
| Documents | the hero percentage, the segmented bar, the quick-filter chips |
| Validation Center | the same ring under the same label, beside its own non-percentage health signals |
| Timeline | the phase verdict and the outstanding count (no percentage) |
| Final Review | the ring, the departure check, and the submission checklist |
| App shell | the Documents nav badge (`outstanding`) |

> **Every consumer must pass `requiredRequirementCodes`.** Until ADR-034 five call
> sites omitted it, so the sidebar badge showed 3 while every page body showed 4.
> The one sanctioned exception is the Dashboard snapshot, which reads only
> `ready`/`obtained`/`needsUpdate` — fields pending codes cannot affect.

Every user-facing readiness label resolves from `common:readiness.*`, so the surfaces share one
string as well as one number.

## Adding a surface that shows readiness

1. Call `buildDocumentReadiness({ documents, requiredRequirementCodes: … })`. Never re-derive.
2. Render the label from `common:readiness.label` and the caption from `common:readiness.ofApplicable`.
3. Branch on `hasApplicableWork` before drawing a ring or a bar — `0%` and "nothing to track" are
   different states.
4. Add the surface to `src/tests/features/readiness-invariants.test.ts`, which asserts every surface
   returns the same value for the same fixture.

## Fixtures

`src/tests/fixtures/dossiers.ts` holds the shared dossiers the invariants run against:
`emptyDossier` · `partiallyPrepared` · `receivedHeavy` · `manyNotApplicable` · `allApplicableReady` ·
`readyButWithFindings`. Three of them are built **from the country pack** rather than hand-listed, so
"complete" means a record for every applicable requirement — a hand-picked subset would read 100%
only if readiness ignored uncollected requirements, which is precisely the bug they guard against.
