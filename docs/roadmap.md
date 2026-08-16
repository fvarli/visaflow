# Roadmap

VisaFlow is planned as **product phases**, not a feature backlog. Each phase has a theme and a
reason it comes when it does; within a phase, items are tagged **Current** (shipped), **Next**
(actively planned) or **Future** (directional). Phases are sequential in emphasis but not rigid —
priority follows user need, security, and maintainability.

The north star is [vision.md](./vision.md); the commitments that constrain every phase are in
[principles.md](./principles.md). Nothing here overrides the hard line: **no approval/refusal
prediction, ever** ([ADR-016]).

---

## Phase 1 — Foundation  ·  *Current*

**Theme:** a trustworthy, well-architected single-application workspace.
**Why first:** everything else (more countries, collaboration, assistance) is only worth
building on top of a correct, private, maintainable core. Get the architecture and the
guarantees right before scaling scope.

Shipped: privacy-first JSON workflow · domain-driven Zod schemas · deterministic validation
engine · widget-based dashboard over a pure presentation adapter · design system + Playground ·
Turkish/English internationalization · the `country → visa type → requirements` config system ·
one production country pack (Greece — Schengen short-stay tourism) · ADR history and docs.

**Recently completed within Foundation:** the readiness reconciliation — six divergent
document-readiness derivations consolidated into one canonical model
(`src/features/readiness/`, ADR-033), so every surface shows the same number under the same
label; then the presentation follow-through (ADR-034) — the submission checklist became an
inventory rather than a competing ratio, document recommendations became status-aware, and the
five call sites that still used a non-canonical denominator were fixed; then a
release-candidate hardening pass (dark-mode scrim inversion, mobile overflow, the last
competing ratio, Turkish truncation, contrast and touch-target failures), with the
judgements that need a real browser captured in `docs/manual-qa.md`; and finally the
**first real-browser visual QA pass**, which closed those judgements against measurements
instead of estimates and found what three static sprints could not — most importantly that
**no shadcn-derived control had a visible keyboard focus ring at all** (a Tailwind v4
cascade-layer conflict), plus a dangling breadcrumb separator, a crushed page title, a
hardcoded-English theme menu, half the Settings sections unreachable on a phone, and a
shipped example dossier that read as 547 days overdue.

**Next within Foundation:** surface `SourceNote` in the Documents detail view; add more Schengen
visa types (business, visit) using the existing hierarchy; verify the Greece pack against a
current official source and record real `lastVerifiedAt` / raise `reviewStatus` honestly;
**consolidate the two timeline date derivations** — the Dashboard's `buildTimeline` and the
Timeline feature's `timeline-dates` — onto a single shared source now that the Timeline UX has
shipped (the Timeline redesign deliberately reused only `deriveNextActions` and left the Dashboard
untouched; ADR-029). *Tech debt.*
**Restore focus to the trigger when a dialog or sheet closes** — the one accessibility defect
knowingly shipped at v1.0; `Escape` currently drops focus to `<body>`. Reproduction in
`docs/manual-qa.md`. *Accessibility.*

---

## Phase 2 — Core Workspace  ·  *Next*

**Theme:** make it a workspace, not a single form.
**Why now:** with the foundation solid, the highest-value step is depth for the applicant who is
actually preparing — the ability to manage more than one application and to get more out of the
data they've already entered.

- **Multiple saved dossiers** — hold and switch between several applications. The dashboard model
  is already shaped for this (`{ applications, active }`); this phase adds the UI and in-memory
  management. *Next.*
- **Richer dossier & timeline** — deeper trip/finance/sponsor structure and a fuller timeline. *Next.*
- **PDF / printable index** — generate a dossier index and a printable checklist for the
  appointment. The Final Review workspace already models what is printable: a closed set of
  VisaFlow-generated sheets (cover sheet, submission checklist, appointment summary, itinerary
  summary) with a readiness derived from data presence, held deliberately separate from the
  applicant's own physical documents, which VisaFlow never holds or prints ([ADR-032]). This
  phase implements the generation against that existing shape. *Next.*

---

## Phase 3 — Country Ecosystem  ·  *Next → Future*

**Theme:** grow from "a Greece pack" to a maintained ecosystem of country packs.
**Why here:** country packs are already data, not code — so scaling coverage is a content and
process problem, best tackled once the workspace is worth filling with more countries.

- **More countries & visa types** authored as packs. *Next.*
- **Source verification workflow** — a repeatable, honest process to move packs from
  `unverified` toward `verified` with recorded evidence. *Future.*
- **Community-authored packs** — contributors add countries without touching the engine;
  identifiers stay stable and requirements stay keys-not-prose (which is why the config layer was
  built this way). Packs never contain personal data. *Future.*

---

## Phase 4 — Productivity  ·  *Future*

**Theme:** reduce the mental load of a weeks-long process.
**Why later:** these features multiply the value of a rich workspace and a broad country
ecosystem, so they land after those exist.

- **Expiry & date reminders** driven by the timeline (passport, insurance, appointment).
- **Reusable workflows** — guided, repeatable steps across a dossier.
- **Family / group applications** — multiple applicants sharing documents and validated together.

---

## Phase 5 — Optional Self-Hosting  ·  *Future*

**Theme:** more durability for users who want it, without weakening the default.
**Why optional and late:** persistence is the one thing that can erode the privacy guarantee, so
it is strictly opt-in and only considered once the in-memory model is mature.

- **Local file adapter** — save/load to the local filesystem (user-run), never a hosted service.
- **Optional encrypted local persistence** — opt-in, password-protected, fully offline.

A local-only, in-memory option always remains the default. Data ownership never regresses.

---

## Phase 6 — Collaboration  ·  *Future*

**Theme:** let a trusted person help review a dossier — privately.
**Why last among features:** collaboration inherently involves data leaving one device, so it is
the hardest to reconcile with the privacy model and is designed only after self-hosting exists.

- **Share for review** — hand a dossier to a reviewer (e.g. an immigration-savvy friend).
- **End-to-end encrypted sync** across a user's own devices.
- **Reviewer comments / roles** on a shared dossier.

All of this is optional, user-controlled, and encrypted; VisaFlow never becomes a data broker.

---

## Phase 7 — AI Assistance  ·  *Future*

**Theme:** organizational help, on the user's terms.
**Why explicitly bounded:** AI is powerful and easy to misuse in this domain, so its scope is
fixed by principle before any of it is built.

Permitted directions — **organizational only**:

- explaining what a requirement means and why it exists;
- drafting cover letters or itineraries from data the user already entered;
- surfacing and explaining consistency findings in plain language.

**Never:** estimating an approval probability or refusal-risk score, or otherwise predicting an
outcome ([ADR-016]). Any assistance runs on the user's terms with their data under their control.

---

## Non-goals

Explicitly **not** planned:

- Cloud-hosted SaaS or any default that stores personal data off-device.
- Monetization through user data; analytics or tracking.
- Third-party integrations that leak data.
- A native mobile app (the web app is responsive).
- Automatic submission to embassies.
- Visa approval/refusal prediction of any kind.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) to propose or pick up roadmap work.
Implementation status of the current phase is tracked in [current-status.md](./current-status.md).

[ADR-016]: ./decisions.md
[ADR-032]: ./decisions.md
