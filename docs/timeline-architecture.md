# Timeline Architecture

The Timeline page is a calm, actionable **visa-preparation plan** — not a calendar,
Gantt chart, admin table, activity feed, or legal deadline calculator. It answers:
what's my appointment, how much preparation time remains, what to do first, what's
overdue, what's coming, which documents are fresh, and is the plan realistic — while
never presenting VisaFlow's recommendations as official embassy deadlines.

It is a **presentation + derivation** surface over existing state: no schema,
validation-outcome, readiness-rule, import/export, or language-independence change,
and no persistence, notifications, or calendar integration.

## Layers

- **`src/features/timeline/*`** — pure adapters (React/i18n/Intl-free, unit-tested):
  - `timeline-policy.ts` — normalizes the resolved country template's
    `preparationMilestones` (VisaFlow's organisational recommendations, override-ready
    per country/visa type) into a small `TimelinePolicy`, with the shared Schengen
    defaults as a fallback. Invents no official-source metadata.
  - `timeline-tasks.ts` — `deriveTasks(input, now)` builds the preparation plan: each
    task carries a title/reason (`visa-domain:milestones.<id>.*`), a recommended target
    date (`appointment − leadDays`), a **status** derived from real document/validation
    state, and a **proximity band** from `now` + the target/appointment/trip anchors.
    Plus two derived (non-milestone) tasks: sponsor evidence and a pre-travel
    dossier-organisation task.
  - `timeline-dates.ts` — `buildKeyDates(input, now)` collects the dossier's **fixed
    events** (appointment, leave, trip, itinerary, reservations, insurance, passport,
    document validity), chronologically sorted, ranges collapsed.
  - `document-freshness.ts` — `classifyFreshness` / `buildFreshness`: a **factual** view
    from recorded dates + status/findings only. Never invents an expiry or recency rule.
  - `timeline-links.ts` — a thin domain→route / type→route map that complements (never
    duplicates) `finding-actions.ts`.
  - `timeline-model.ts` — `buildTimelineModel` / `useTimelineModel` composes the hero,
    plan, key dates, freshness, and appointment-day summary.
- **`src/components/timeline/*`** — prop-driven components (reusable ones in `/playground`):
  `TimelineHero`, `TimelineModeSelector`, `PreparationPlan`, `PreparationTaskCard`,
  `DateWindowBadge`, `KeyDatesTimeline`, `DocumentFreshnessList`, `AppointmentDaySummary`.
- **`src/pages/TimelinePage.tsx`** — a thin shell: `PageHeader` + `TimelineHero` +
  `TimelineModeSelector` + the active mode view. `?mode=` deep-link; default `plan`.

## Modes

`plan` (default) · `dates` · `freshness`, via a keyboard-operable segmented control and
the additive `?mode=` query param.

## Preparation plan — proximity bands

Each task's target date is `appointment − leadDays`; tasks are grouped **dynamically**
into localized bands from the current date and target date: Overdue · Today · This week ·
Before the appointment · Appointment day · Before travel · Travel period · Later. A task
moves between bands as time passes. **Overdue** means the recommended date has passed
**and** the task is still incomplete — a completed past task is never overdue. A target
after the appointment but before travel lands under **Before travel**. When there is no
appointment, the plan falls back to calm relative phases (Start now / Soon / Before the
appointment / Final steps) and says so — **no dates are invented**. `classifyBand` is
pure and exported for testing.

## Priority compatibility with the Dashboard (reuse-only)

Timeline's single highlighted "do this first" **reuses the Dashboard's exported
`deriveNextActions`** (`src/features/dashboard/dashboard-model.ts`): the hero's primary
action is `deriveNextActions(buildDocumentBuckets(documents), runValidation(dossier),
application)[0]`, with the Dashboard's own `nextActions.*` / `nextAction.reason.*`
wording and route. A test asserts Timeline's primary action equals the Dashboard's for
the same dossier. The Dashboard model is **not modified**.

**Known technical debt:** two timeline *date* derivations still exist — the Dashboard's
`buildTimeline` and this feature's `timeline-dates`. This sprint deliberately left the
Dashboard untouched (reuse-only). A future sprint should consolidate both onto a single
shared source once the Timeline UX has stabilised (see roadmap).

## Honest-derivation guardrails

- Recommendations use plan language — Recommended · Plan to complete · Suggested
  preparation window · Coming up · Overdue based on your plan. **Never** "Legally
  required by / Embassy deadline / Must be completed by".
- **Fixed events state facts (dates); preparation tasks state recommendations** — the two
  are separate concepts (separate views + models).
- Tasks are **derived, never persisted** — there is no task/checkbox/activity store. The
  appointment-day view is a read-only readiness summary.
- Document freshness is **factual** — a document is flagged only when its own
  `validUntil`, status, or a validation finding says so.
- Country-specific notes appear only when genuinely configured (`template.notesKeys`).
