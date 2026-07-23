# Vision

## The north star

> **VisaFlow aims to become the open-source, privacy-first application workspace for
> international visa preparation.** Rather than being limited to a checklist, it provides a
> structured dossier, validation engine, timeline, country-specific requirements, and reusable
> workflows that help applicants organize complex visa processes while keeping all personal
> data under their own control.

Everything in this repository — the roadmap, the architecture, the principles — is in service
of that sentence. When a decision is unclear, this is the tie-breaker.

## Why VisaFlow exists

Visa preparation is a high-stakes, error-prone, deeply personal process. Applicants juggle
passports, financial statements, employment letters, reservations, insurance and appointment
logistics across weeks, and a single inconsistency (a passport that expires too soon, coverage
that ends before the trip) can cost an appointment or a refusal.

The existing options are poor:

- **Spreadsheets and notes** don't understand the domain — they can't tell you a document is
  missing or a date is inconsistent.
- **Cloud "visa helper" services** ask you to hand your passport number, bank balance and
  travel history to a third party, often to upsell or to monetize the data.

VisaFlow is the alternative: software that *understands* the domain (structured dossier +
validation) **without ever taking custody of your data**. It runs entirely in your browser;
the only persistence is a JSON file you own.

## What VisaFlow is becoming

- A **structured dossier**, not a flat checklist — applicant, trip, employment, finances,
  sponsors, documents, appointment and notes as first-class, validated data.
- A **deterministic validation engine** that surfaces inconsistencies as actionable findings.
- A **timeline** of the dates that matter (appointment, milestones, trip, document expiries).
- A **country-pack ecosystem**: requirements organized as `country → visa type → requirements`
  with honest official-source metadata, extensible by contributors.
- **Reusable workflows** and a widget-based **dashboard** that make a complex process feel
  calm and under control.

## What VisaFlow is *not*, and will never be

VisaFlow is an **organizational tool**. It does **not**:

- provide legal advice, or represent any embassy, consulate or visa center;
- submit applications on your behalf;
- store your data on any server or require an account;
- estimate an approval probability or a refusal-risk score — ever ([ADR-016]).

**What VisaFlow measures is organization and internal consistency only:** dossier readiness,
application completeness, missing required documents, documents needing updates, and
consistency findings. In Turkish: *dosya hazırlık düzeyi, başvuru tamamlanma durumu, eksik
zorunlu belgeler, güncellenmesi gereken belgeler, tutarlılık bulguları*.

## Where we are — Current / Next / Future

- **Current** — a complete single-application workspace: structured dossier, validation engine,
  timeline, widget-based dashboard, design system + playground, TR/EN internationalization,
  JSON import/export, and one production country pack (Greece — Schengen short-stay tourism).
- **Next** — multiple saved dossiers, a richer core workspace, more visa types, and additional
  country packs.
- **Future** — a country-pack ecosystem with verified sources, optional self-hosting, reviewer
  collaboration, and organizational (never predictive) AI assistance.

See [roadmap.md](./roadmap.md) for the phased plan and the reasoning behind each phase.

## Target users

Individuals preparing an international visa application who want to organize their documents
systematically, catch common errors before submission, and keep sensitive data private —
starting with short-stay Schengen applicants and broadening as country packs are added.

Secondary: contributors who want to author country packs, and developers who value a clean,
framework-light, privacy-first codebase.

## Domain vocabulary

| Term | Meaning |
|------|---------|
| Dossier | The complete visa application package (applicant + application + documents + sponsors) |
| Applicant | The person applying for the visa |
| Sponsor | A person financially supporting the trip |
| Trip | Travel details (dates, route, accommodation, transport, insurance) |
| Document | An individual required document with a status and optional validity date |
| Country pack | A country's `visa type → requirements` template plus source metadata |
| Requirement | A template entry describing a document an application may need |
| Finding | A validation result (error / warning / info), rendered from a stable key |
| Readiness | How assembled the dossier is — an organizational metric, never a prediction |

## Why this approach

Visa applications involve passport numbers, financial details, employment records and travel
history. Rather than trust a cloud service with that data, VisaFlow keeps everything local and
gives the user a portable, open JSON file they store however they prefer. Privacy is not a
feature here — it is the architecture (see [privacy.md](./privacy.md) and
[principles.md](./principles.md)).

[ADR-016]: ./decisions.md
