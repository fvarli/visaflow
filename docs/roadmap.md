# Roadmap

VisaFlow is planned as **product phases**, not a feature backlog. Each phase has a theme and a
reason it comes when it does; within a phase, items are tagged **Shipped**, **Next** (actively
planned) or **Future** (directional). A phase marked shipped means its release goal is met — not
that no follow-up work remains under it. Phases are sequential in emphasis but not rigid —
priority follows user need, security, and maintainability.

The north star is [vision.md](./vision.md); the commitments that constrain every phase are in
[principles.md](./principles.md). Nothing here overrides the hard line: **no approval/refusal
prediction, ever** ([ADR-016]).

---

## Phase 1 — Foundation  ·  *Shipped in v1.0.0*

**Theme:** a trustworthy, well-architected single-application workspace.
**Why first:** everything else (more countries, collaboration, assistance) is only worth
building on top of a correct, private, maintainable core. Get the architecture and the
guarantees right before scaling scope.

**Status:** the Foundation phase shipped as **v1.0.0** on 2026-08-16 — the release is complete and
the phase's goal is met. That is *not* the same as "nothing Foundation-related remains": the
maintenance and follow-up items under **Next within Foundation** below are still open and are
expected to land in 1.x alongside Phase 2 work.

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
shipped example dossier that read as 547 days overdue. A short follow-up sprint then closed
the last accessibility defect it left open — overlays now return focus to their opener
(ADR-035) — and codified what P0/P1 actually mean in `docs/manual-qa.md`.

**Next within Foundation:** surface `SourceNote` in the Documents detail view; add more Schengen
visa types (business, visit) using the existing hierarchy; verify the Greece pack against a
current official source and record real `lastVerifiedAt` / raise `reviewStatus` honestly;
**consolidate the two timeline date derivations** — the Dashboard's `buildTimeline` and the
Timeline feature's `timeline-dates` — onto a single shared source now that the Timeline UX has
shipped (the Timeline redesign deliberately reused only `deriveNextActions` and left the Dashboard
untouched; ADR-029). *Tech debt.*

**Maintenance baseline (v1.1, done):** the 360 React `act(...)` warnings are gone at the root cause,
CI now runs the gates on every push/PR, Dependabot alerting is on, the one runtime dependency
advisory is patched, and the Sponsors first-create focus P2 is closed. Remaining known debt: **9
dev-only dependency advisories** (`undici` via `jsdom`, `brace-expansion` via `eslint`,
`postcss`/`nanoid` via `vite`) — none ship in the bundle, all deliberately deferred rather than
bundled into a maintenance sprint. *Tech debt.*

---

## Phase 2 — Core Workspace  ·  *Shipped*

**Theme:** make it a workspace, not a single form.
**Why now:** with the foundation solid, the highest-value step is depth for the applicant who is
actually preparing — the ability to manage more than one application and to get more out of the
data they've already entered.

**Status:** complete. The flagship — multiple saved dossiers — shipped as **v1.1.0** on 2026-08-25;
the printable appointment package, the deeper trip/finance/sponsor surfacing and the timeline work
followed in the same 1.x line. A completion audit on 2026-08-28 confirmed every item below against
production code, tests, ADRs and browser-visible behaviour, and found the phase had been finished for
some time while this section still described it as open ([ADR-046]).

- **Multiple saved dossiers** — **shipped in v1.1.0.** Dossiers are saved in the browser's IndexedDB
  behind a repository port, survive refresh and restart, and can be created, switched and deleted
  from `/dossiers` or the header switcher. Persistence is on by default with a per-dossier
  "Session only" escape hatch (ADR-036). Each dossier can be given a name of your own, and two
  open tabs are safe: every write is a compare-and-swap on a per-record revision, so a stale tab
  is told rather than allowed to overwrite (ADR-037). Each dossier reports its own backup freshness
  and can be exported without being opened, storage failures explain themselves and offer export as
  the way out, and a session-only dossier can be promoted to a saved one instead of being discarded
  (ADR-038, ADR-039). The workspace and the open dossier are now distinct product surfaces with a
  home each — *Your dossiers* above *Dashboard* in the navigation, entry derived from what is saved
  rather than from the editor, and the dashboard headed by the dossier it describes (ADR-040).
  Leaving an editor whose work is not in storage is one guarded decision with a way out per reason,
  deletion is authoritative by design, and an import reports what it could not read (ADR-041).
  *Done.*
- **Deeper trip, finance & sponsor structure** — **done, and it added no schema.** The audit found
  the trip fully modelled and barely surfaced: `route`, `transportReservations` and
  `accommodationReservations` were already arrays with real editors, yet Final Review and the printed
  package showed the trip as two dates. Transport (labelled outbound/return, derived from the dates),
  stays, route, trip purpose, the budget, the funding split and named sponsors with what they cover
  now all reach both surfaces. `trip.estimatedBudget` gained the editor it never had despite being
  rendered on the dashboard, and the funding split is proof-read against it — guidance only, never a
  sufficiency verdict ([ADR-044]). *Done.*
- **Timeline completion & density** — **done.** An audit of every date-bearing field found nothing
  silently missing (ADR-043 had closed that) and one imprecise link. What it found instead was
  density and a duplicate: fourteen key-date events with six of them on a single day, each repeating
  the date, and the passport expiry printed twice — once from the passport, once from the current-
  passport document. Dated events now group by day, `today` is a visible group instead of a computed
  value that was discarded, the duplicate is suppressed structurally (and kept when the two dates
  disagree), and a validity date opens its own document ([ADR-045]). *Done.*
- **Richer dossier & timeline** — **superseded, not open.** This item was completed by the two
  bullets above it: the dossier audit that removed unused fields and added refusal history
  ([ADR-043]), the trip/finance/sponsor surfacing ([ADR-044]) and the timeline work ([ADR-043],
  [ADR-045]). It survived here as stale wording claiming "deeper trip/finance/sponsor structure
  remains open" while the entry two above already reported that work done — a leftover from
  appending items without reconciling the older one. *Done.*
- **PDF / printable index** — **shipped.** The four VisaFlow-generated sheets ([ADR-032]) print
  from `/review/print`, a surface rendered outside the app shell so no navigation or button reaches
  the paper. A4 print styling, real page breaks, ink on white in both themes; the browser's own
  Print / Save as PDF produces the file, so no PDF dependency is bundled. Availability semantics are
  the print model's unchanged — a sheet with nothing to say prints one honest line rather than a
  page of blanks. The applicant's own physical documents are still never held or printed
  ([ADR-042]). *Done.*

---

## Phase 3 — Country Ecosystem  ·  *Next*

**Entry gate cleared 2026-08-28.** A provenance audit found the model already able to answer where a
requirement comes from, distinguish source authority, and record review without implying endorsement
— but nothing enforcing it. Registry-wide honesty invariants now hold every pack, present and
future, to that contract, and a requirement can no longer display a verification its own sources do
not carry ([ADR-046]).

**Greece source verification ran first, and it changed the contract.** The entry-gate invariant
turned out to be weaker than ADR-046 described — it read *template*-level sources existentially and
treated `verified` and `partially_verified` alike, so a pack could claim `verified` with every
requirement unsourced. `reviewStatus` is now checked against coverage computed from each
requirement's own sources ([ADR-047]).

**Greece is `partially_verified`: 18 of 28 requirements.** The primary evidence turned out to be the
harmonised list adopted under local Schengen cooperation **for Türkiye**, published by the Ankara
mission, layered with the Visa Code where the EU rule is the stronger authority. It corrected four
requirements that were describing the wrong document, replaced an invented "3-6 months" window with
the source's "last three months", corrected two applicability rules and surfaced a mandatory
requirement the pack lacked entirely ([ADR-048]).

**The pack is Greece *for applicants in Türkiye*, and the shared array knows it now.**
`commonSchengenDocuments` has no override mechanism and already carried Türkiye-specific concepts, so
it means "shared by the only production pack", not "proven across Schengen". An invariant names the
Türkiye-scoped requirements inside it and fails the build if a second pack would inherit them.

**Theme:** grow from "a Greece pack" to a maintained ecosystem of country packs.
**Why here:** country packs are already data, not code — so scaling coverage is a content and
process problem, best tackled once the workspace is worth filling with more countries.

- **Pack composition: Common Schengen → Destination → Jurisdiction overlay** — the split the Greece
  evidence now justifies designing from real domain data rather than from guesses. **Blocks pack #2**,
  and the quarantine invariant enforces that ([ADR-048]). *Next.*
- **More countries & visa types** authored as packs. *After the composition split.*
- **Source verification workflow** — a repeatable, honest process to move packs from
  `unverified` toward `verified` with recorded evidence. The mechanism now exists and has been used
  once end to end: evidence attaches per requirement, coverage is computed rather than declared, and
  a citation must support everything the requirement says — which is why three requirements Annex II
  names almost verbatim still do not count ([ADR-047]). What remains is reaching the national
  sources. *In progress.*
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
anything beyond the browser's own storage is strictly opt-in, and only considered once the local
model shipped in v1.1.0 has proven itself.

- **Local file adapter** — save/load to the local filesystem (user-run), never a hosted service.
- **Optional encrypted local persistence** — opt-in, password-protected, fully offline. Note that
  v1.1's local persistence is deliberately **not** encrypted and says so; encryption at rest is
  the work that remains here.

A local-only option always remains the default. Data ownership never regresses.

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
[ADR-042]: ./decisions.md
[ADR-043]: ./decisions.md
[ADR-044]: ./decisions.md
[ADR-045]: ./decisions.md
[ADR-046]: ./decisions.md
[ADR-047]: ./decisions.md
[ADR-048]: ./decisions.md
