# Visa Domain Knowledge

This document provides background on Schengen visa applications for developers working on VisaFlow.

## Schengen Visa Basics

The Schengen Area comprises 29 European countries with no internal border controls. A Schengen visa allows short stays (up to 90 days within 180 days) for tourism, business, or family visits.

## Application Process

1. **Determine destination** - Apply to the country of main destination or first entry
2. **Gather documents** - Passport, photos, forms, financial proof, etc.
3. **Book appointment** - At embassy, consulate, or authorized visa center
4. **Submit application** - In person, with biometrics
5. **Wait for decision** - Usually 15 calendar days
6. **Receive passport** - With visa sticker if approved

## Document Categories

### Passport Documents
- Current passport (valid 3+ months after planned exit)
- Previous passports with Schengen visas
- Passport-size photos (ICAO compliant)

### Travel Documents
- Flight reservations (round-trip)
- Detailed itinerary
- Train/bus tickets if traveling between countries

### Accommodation
- Hotel reservations (full duration)
- Invitation letter (if staying with host)
- Proof of host's legal residence

### Financial Documents
- Bank statements (3-6 months)
- Proof of income/employment
- Sponsor's financial proof (if sponsored)

### Employment Documents
- Employment letter (position, salary, leave approval)
- Business registration (if self-employed)
- School enrollment (if student)
- Pension documents (if retired)

### Insurance
- Travel medical insurance
- Minimum 30,000 EUR coverage
- Valid in all Schengen countries
- Covers medical emergency repatriation

## Why These Validation Rules?

### Trip Dates Valid
Entry date must be before exit date. Sounds obvious, but typos happen.

### Passport Valid After Trip
Schengen requires passport validity 3 months after planned departure. A common rejection reason.

### Appointment Before Trip
You can't travel before getting the visa. Appointment must be before entry date.

### Insurance Covers Trip
Insurance must cover the entire stay. Partial coverage is grounds for rejection.

### Accommodation Covers Trip
Hotel bookings must cover all nights. Gaps raise questions.

### Leave Covers Trip
Employed applicants need approved leave. Inconsistent dates suggest fabrication.

### Main Destination Matches Longest Stay
Apply to the country where you'll spend the most nights. Wrong embassy = rejection.

### First Entry Matches Route
If spending equal time in multiple countries, apply to the first entry country.

## Common Rejection Reasons

1. Insufficient financial means
2. Unclear purpose of travel
3. Doubts about intention to return
4. Inconsistent or missing documents
5. Previous visa violations
6. Invalid passport/insurance

## Sponsor Requirements

If someone else is funding the trip:
- Sponsor invitation letter
- Sponsor's ID/residence permit
- Sponsor's financial proof
- Proof of relationship

## Notes for Developers

### Why Strict Validation?
Visa applications are high-stakes. A mistake can mean rejection, lost appointment fees, and delayed travel plans. VisaFlow's validation catches common errors.

### Why Country Configuration?
Each embassy interprets Schengen rules slightly differently. Greece might require specific document formats that Italy doesn't. Configuration allows customization.

### Why Date Precision?
Dates are critical. Entry date, exit date, passport expiry, insurance validity - all must align. Off-by-one errors are real problems.

### Why Privacy First?
Visa applications contain highly sensitive data: passport numbers, bank balances, employment history. Users have every reason to distrust cloud storage.

## External Resources

These are for developers' reference only. VisaFlow does NOT scrape or link to official sites.

- Schengen Visa Code (Regulation (EC) No 810/2009)
- Individual embassy websites
- VFS Global / BLS International (visa centers)

## Positioning: organization, not prediction (ADR-016)

VisaFlow measures **dossier readiness and internal consistency** only. It must
never present a visa-approval probability or a refusal-risk score. Contributors
adding features should use the vocabulary: dossier readiness, application
completeness, missing required documents, documents needing updates,
consistency findings (TR: dosya hazırlık düzeyi, başvuru tamamlanma durumu,
eksik zorunlu belgeler, güncellenmesi gereken belgeler, tutarlılık bulguları).

## Route & date semantics

- **Trip dates are the canonical boundary.** `entryDate`/`exitDate` define the trip; everything derived
  (total nights, accommodation/insurance/leave coverage, timeline, findings) refers to them. Do not
  re-derive trip boundaries in components — use `src/features/trip/route-dates.ts`.
- **Nights vs days.** Nights = calendar days between two dates (`differenceInDays`); days = nights + 1.
  Example: 26 Sep → 3 Oct is **7 nights · 8 days**. Duration is always *derived*, never entered, so there
  is no off-by-one to reconcile.
- **Route stops represent overnight stays**, not every sightseeing location. A stop is one place you
  sleep; day trips don't need a stop. Sequence is the array order.
- **A stop's date pair is canonical; `nights` is derived.** `RouteStopSchema` stores `arrivalDate`,
  `departureDate` **and** `nights` (all required, for schemaVersion 1.0.0 compatibility), but `nights` is
  recomputed from the dates on every write (`syncStopNights`) and always derived from the dates for
  display, so the stored value can never conflict. Imported legacy routes are read, not mutated on load.
- **Country values persist as ISO 3166-1 alpha-2 codes**; localized names are resolved for display only
  (`src/lib/countries.ts`, via `Intl.DisplayNames`). Exported JSON stays language-independent.
- **Planned itinerary and reservation evidence are separate.** A user can plan a route before holding any
  flight/hotel/ferry reservation; reservation status (`pending`/`confirmed`/…) is layered on later.

## Employment: tenure, income, and evidence

- **Current-employer tenure is derived, never stored.** The dossier keeps only
  `employment.startDate`; tenure ("1 year 3 months at current employer") is a live
  derivation (`src/features/employment/employment-tenure.ts`, `computeTenure`).
  Handle future / missing / <1 month / exact-year / partial cases; a future start
  date shows a calm data-quality note, not a negative duration (no validation change).
- **Total career experience is not modeled.** There is no schema field for it; it
  belongs to notes or cover-letter context only. Do not invent or persist it.
- **Employment data ≠ employment documents.** `employment.*` fields describe the
  applicant's situation (employer, role, income, salary bank, approved leave).
  Supporting evidence (employer letter, approved-leave letter, payslips,
  social-security record, company registry / signature circular) are **Document
  instances** tracked in the Documents workspace, resolved from the country
  template by `code`. The Employment page never stores document status; it reads
  applicable requirements + instances and links into Documents (ADR-026).
- **Income is net only.** The schema stores `monthlyNetIncome` + `currency`; label
  it honestly as net. Persist the raw number + ISO currency code; format for display
  only. No gross field, no "financial strength" score.
- **Approved leave is compared against the canonical Trip dates** (`trip.entryDate`/
  `exitDate`) by the existing `employment.leaveCoversTrip` rule — the Employment page
  consumes those findings, it does not re-derive coverage. Leave only applies to the
  `employed` status; other statuses raise no employment findings.

## Financing: source-driven evidence, balance is recorded not judged

- **Applicability is funding-source-driven.** `financing.source` (self / sponsor /
  employer / mixed) decides which sections carry evidence: self/mixed → personal
  bank funds; sponsor/mixed → sponsors; employer → employer coverage context. All
  four values stay editable so an imported dossier is never left with an unreachable
  source. Non-applicable sections show calm "not needed" states, never errors
  (ADR-027).
- **Account balance is *recorded*, never judged.** The schema keeps `accountBalance`
  + `currency` for the applicant's own reference. Never compare it to a threshold,
  never label it sufficient/insufficient, never imply more money helps approval
  (ADR-016). Persist the raw number + ISO currency; format for display only.
- **Personal funds ≠ employment income.** Monthly income lives only on
  `employment.monthlyNetIncome` — the Finance page **reads** it (a read-only income
  overview that links to Employment) and never copies or re-enters it. `Financing`
  has no income figure, so there is no conflict.
- **Financing data ≠ financial documents.** `financing.*` fields describe the
  strategy; the evidence (bank statement, sponsor letter, sponsor bank statement,
  relationship proof, income proofs) are **Document instances** in the Documents
  workspace. The Finance page groups applicable finance requirements (Bank /
  Employment income / Sponsor / Employer / Other) and never stores document status.
- **Sponsors are summarized in a funding context; editing is owned by `/sponsors`.**
  Finance reads `dossier.sponsors` directly (single-app MVP; `application.sponsorIds`
  is unwired) and links to a specific sponsor via the additive `/sponsors?sponsor=<id>`.
- **Consistency reuses findings + factual notes.** Funding-consistency findings come
  from the engine's `sponsor.*` rules (including `sponsor.requiredForSponsoredFunding`,
  which treats `sponsor` *and* `mixed` as sponsored); the Finance page adds only
  net-new *factual* observations (e.g. "a bank statement is still pending"), never a
  prediction. Known gap: the Greece pack keys sponsor documents on
  `financing.source == 'sponsor'` only, so `mixed` does not surface sponsor-document
  *requirements* — the rule still flags it, and fixing the pack would change readiness
  outcomes (out of scope).

## Sponsors: the canonical hub, evidence linked not owned

- **`dossier.sponsors` is the canonical sponsor list.** `application.sponsorIds` is
  vestigial/unwired (no reducer action manages it) — do not rely on it; removing a
  sponsor cannot clean a `sponsorIds` reference, so that limitation is surfaced, not
  silently corrupted (ADR-028).
- **`Sponsor.documentIds` is the canonical sponsor↔document link.** The Sponsors
  workspace links/unlinks *existing* sponsor-evidence documents (via `updateSponsor`);
  it never creates, edits, or deletes a document — Documents owns creation, status,
  verification, dates, notes, and deletion. Unlinking never deletes; removing a sponsor
  never deletes linked documents. Populating `documentIds` is legitimate data entry, so
  the existing `sponsor.hasDocuments` finding resolving for that sponsor is correct data
  flow, not a rule change.
- **Eligibility vs applicability.** A document is *eligible* sponsor evidence by its
  category/code (`category === 'sponsor'` or the classified `RELATIONSHIP_PROOF`) —
  independent of funding source, so any existing sponsor letter can be linked. Arbitrary
  passport/trip/employment documents are never eligible. *Applicable* required evidence
  (what's still missing) is derived from `applicableRequirements` (which honors the
  `financing.source == 'sponsor'` condition). The linker distinguishes linked evidence,
  unlinked-but-eligible evidence, missing applicable requirements, and **stale**
  references (ids that resolve to nothing eligible — surfaced, removable, never a crash).
- **Per-sponsor readiness is organizational, never a score.** `ready` / `needsAttention`
  / `incomplete` derive from recorded facts (finance info, letters, linked evidence) and
  the sponsor's own `sponsor.*` findings — never a financial-strength score, an asset
  comparison, or an approval likelihood (ADR-016). Sponsor findings tie to a sponsor via
  the `sponsors.<id>.*` relatedField.

## Requirement vs document instance

- **Document requirement** (`src/config/types.ts`) — template/configuration
  stating what an application *may* need.
- **Document instance** (`src/domain/schemas/document.schema.ts`) —
  applicant-specific record of whether that document is prepared. Identified by
  stable `code`; its display label is derived via translation.
