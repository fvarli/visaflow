# JSON Schema Documentation

This document describes the JSON format used by VisaFlow for importing and exporting dossier data.

## Schema Version

Current version: `1.4.0`. VisaFlow **reads** `1.0.0`, `1.1.0`, `1.2.0`, `1.3.0` and `1.4.0`, and
**writes** `1.4.0`.
No version this project has ever written is dropped: a file already on your disk stays openable.

The schema version is included in every exported file. It is not the application version and not the
local `STORAGE_FORMAT_VERSION` — see the note at the top of [CHANGELOG.md](../CHANGELOG.md).

**No older file needs migration.** Every bump so far has only *added* an optional field —
`applicant.previousRefusals` in 1.1.0, `document.satisfiedRevision` in 1.2.0,
`document.satisfiedContract` in 1.3.0, `application.employment.occupationCode` in 1.4.0. Nothing
changed meaning and nothing was removed, so every older document is already a valid `1.4.0` document
and imports with no warning at all.

**Every bump has added a *key*, never a value to an existing enum, and that is a rule rather than a
coincidence.** An unknown key is dropped field by field. An unknown enum value fails the object it sits
in — and `application` is parsed as one unit, so a value an older build does not recognise would take
the destination country, visa type, appointment, trip and financing with it while the import still
reported success (ADR-043, ADR-053).

Nothing is rewritten on disk, either. An older file is **parsed as it stands**; if you then export,
the new file is written at the current version with whatever fields this build knows about. Import
does not upgrade the file you imported.

**So why bump at all?** Because the *reverse* direction is not safe. An **older** VisaFlow strips a
field it does not know silently, so someone who imported a newer file there and re-exported it would
lose that data with nothing said. The version mismatch is what warns them first (ADR-043). The rule
is about meaning, not parsing.

## Root Structure

```json
{
  "schemaVersion": "1.4.0",
  "exportedAt": "2025-01-15T10:30:00.000Z",
  "applicant": { ... },
  "application": { ... },
  "documents": [ ... ],
  "sponsors": [ ... ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| schemaVersion | string | Yes | Schema version for migrations |
| exportedAt | string (ISO 8601) | Yes | Export timestamp |
| applicant | Applicant | Yes | Applicant information |
| application | Application | Yes | Visa application details |
| documents | Document[] | Yes | Array of documents |
| sponsors | Sponsor[] | Yes | Array of sponsors |

## Applicant Schema

```json
{
  "id": "applicant-001",
  "firstName": "Maria",
  "lastName": "Kowalski",
  "dateOfBirth": "1990-05-15",
  "nationality": "PL",
  "email": "maria@example.com",
  "phone": "+48123456789",
  "address": "ul. Example 123, Warsaw, Poland",
  "maritalStatus": "single",
  "occupation": "Software Engineer",
  "passport": { ... },
  "previousPassports": [ ... ],
  "previousVisas": [ ... ],
  "travelHistory": [ ... ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier |
| firstName | string | Yes | Given name |
| lastName | string | Yes | Family name |
| dateOfBirth | string (YYYY-MM-DD) | Yes | Date of birth |
| nationality | string | Yes | ISO country code |
| email | string | No | Email address |
| phone | string | No | Phone number |
| address | string | No | Full address |
| maritalStatus | string | No | single/married/divorced/widowed |
| occupation | string | No | Job title |
| passport | Passport | Yes | Current passport |
| previousPassports | Passport[] | No | Previous passports |
| previousVisas | Visa[] | No | Previous visa history |
| travelHistory | TravelEntry[] | No | Travel history |

## Passport Schema

```json
{
  "number": "AB1234567",
  "issueDate": "2020-01-15",
  "expiryDate": "2030-01-14",
  "issuingCountry": "PL",
  "passportType": "ordinary"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| number | string | Yes | Passport number |
| issueDate | string (YYYY-MM-DD) | Yes | Issue date |
| expiryDate | string (YYYY-MM-DD) | Yes | Expiry date |
| issuingCountry | string | Yes | ISO country code |
| passportType | string | Yes | ordinary/diplomatic/service/official |

## Application Schema

```json
{
  "applicationId": "app-001",
  "applicantId": "applicant-001",
  "destinationCountry": "GR",
  "visaType": "short_stay_tourism",
  "status": "in_progress",
  "createdAt": "2025-01-10T09:00:00.000Z",
  "appointment": { ... },
  "trip": { ... },
  "financing": { ... },
  "sponsorIds": [],
  "documentIds": [],
  "notes": [ ... ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| applicationId | string | Yes | Unique identifier |
| applicantId | string | Yes | Reference to applicant |
| destinationCountry | string | Yes | ISO country code |
| visaType | string | Yes | Type of visa |
| status | string | Yes | draft/in_progress/submitted/approved/rejected |
| createdAt | string (ISO 8601) | Yes | Creation timestamp |
| appointment | Appointment | No | Visa appointment details |
| trip | Trip | No | Trip information |
| financing | Financing | No | Financial information |
| sponsorIds | string[] | Yes | References to sponsors |
| documentIds | string[] | Yes | References to documents |
| notes | Note[] | Yes | Application notes |

## Appointment Schema

```json
{
  "date": "2025-05-15",
  "time": "10:00",
  "location": "Greek Embassy",
  "confirmationNumber": "CONF123456"
}
```

## Trip Schema

```json
{
  "entryDate": "2025-06-01",
  "exitDate": "2025-06-14",
  "firstEntryCountry": "GR",
  "mainDestinationCountry": "GR",
  "entryCity": "Athens",
  "exitCity": "Athens",
  "purpose": "Tourism and sightseeing",
  "route": [ ... ],
  "transportReservations": [ ... ],
  "accommodationReservations": [ ... ],
  "insurance": { ... },
  "estimatedBudget": 2000,
  "budgetCurrency": "EUR"
}
```

### Route Stop

```json
{
  "city": "Athens",
  "country": "GR",
  "arrivalDate": "2025-06-01",
  "departureDate": "2025-06-08",
  "nights": 7
}
```

### Transport Reservation

```json
{
  "type": "flight",
  "departureDate": "2025-06-01",
  "departureCity": "Warsaw",
  "arrivalCity": "Athens",
  "carrier": "Aegean Airlines",
  "bookingReference": "ABC123",
  "status": "confirmed"
}
```

### Accommodation Reservation

```json
{
  "name": "Athens Grand Hotel",
  "type": "hotel",
  "city": "Athens",
  "address": "Syntagma Square, Athens",
  "checkInDate": "2025-06-01",
  "checkOutDate": "2025-06-08",
  "bookingReference": "HTL456",
  "status": "confirmed"
}
```

### Insurance

```json
{
  "provider": "Allianz",
  "policyNumber": "INS789",
  "coverageStartDate": "2025-06-01",
  "coverageEndDate": "2025-06-14",
  "coverageAmount": 30000,
  "coverageCurrency": "EUR"
}
```

## Document Schema

```json
{
  "id": "doc-001",
  "code": "PASSPORT_CURRENT",
  "name": "Current Passport",
  "category": "passport",
  "ownerType": "applicant",
  "ownerId": "applicant-001",
  "required": true,
  "status": "ready",
  "requestedAt": "2025-01-10",
  "receivedAt": "2025-01-10",
  "issuedAt": "2020-01-15",
  "validUntil": "2030-01-14",
  "fileReference": "passport_scan.pdf",
  "notes": "Original passport",
  "verified": true,
  "satisfiedRevision": 2,
  "satisfiedContract": "PASSPORT_CURRENT@2"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier |
| code | string | Yes | Document type code |
| name | string | Yes | Display name |
| category | string | Yes | Document category |
| ownerType | string | Yes | applicant/sponsor |
| ownerId | string | Yes | Reference to owner |
| required | boolean | Yes | Is document required |
| status | string | Yes | Document status |
| requestedAt | string | No | Date requested |
| receivedAt | string | No | Date received |
| issuedAt | string | No | Document issue date |
| validUntil | string | No | Document expiry date |
| fileReference | string | No | Local file reference |
| notes | string | No | Additional notes |
| verified | boolean | Yes | Has been verified |
| satisfiedRevision | integer > 0 | No | How far the requirement's **base** contract had tightened when this document was claimed (1.2.0+) |
| satisfiedContract | string | No | **Which** acceptance contract it was claimed against, including any criteria the destination or filing jurisdiction adds (1.3.0+) |

### Document Status Values

- `not_started` - Not yet requested
- `requested` - Requested but not received
- `received` - Received, needs review
- `needs_update` - Requires updates
- `ready` - Ready for submission
- `not_applicable` - Not applicable to this application

### Document Categories

- `passport`
- `identity`
- `travel`
- `accommodation`
- `financial`
- `employment`
- `insurance`
- `sponsor`
- `supporting`

## Sponsor Schema

```json
{
  "id": "sponsor-001",
  "relationship": "friend",
  "firstName": "Nikos",
  "lastName": "Papadopoulos",
  "email": "nikos@example.com",
  "phone": "+306912345678",
  "address": "Athens, Greece",
  "nationality": "GR",
  "residenceCountry": "GR",
  "employmentStatus": "employed",
  "employerName": "Tech Company SA",
  "monthlyIncome": 3000,
  "currency": "EUR",
  "liquidAssets": 25000,
  "coveredExpenses": ["accommodation", "food"],
  "documentIds": ["doc-sponsor-invite", "doc-sponsor-id"]
}
```

## Example Complete Dossier

See `src/data/examples/example-dossier.json` for a complete example.

## What this file is, and is not

This file is the **portable dossier**. It is deliberately not a snapshot of the workspace around
it: the local name you gave a dossier, its `revision`, its `lastExportedAt`, its `storageVersion`
and which dossier was open are all workspace metadata, stored in this browser and never written
here (ADR-036, ADR-037, ADR-038). Two consequences worth stating:

- The same dossier exported from two browsers produces the same document, whatever it is called
  in each.
- Importing a file never restores a name or a revision. It creates a **new** dossier.

The export is also language-independent: only stable codes and raw values are written, never
translated prose, so the file does not change with the interface language (ADR-014).

## Validation, and what happens to a file that is not perfect

Import is **additive and forgiving**, by design. A file always becomes a *new* dossier — it never
replaces or merges into one you already have — and each top-level section is validated on its own:

| In the file | Result |
|---|---|
| a valid section | imported |
| an invalid `applicant` or `application` | that section is left out; the rest still imports |
| one invalid entry in `documents` / `sponsors` | that entry is left out; the others still import |
| `documents` / `sponsors` present but not an array | the whole collection is left out |
| a different `schemaVersion` | imported anyway, with a note |
| nothing valid at all, or not JSON | refused, with the parse errors |

Whenever anything is left out, the app says how many items it dropped, in your language, at the
point you imported (ADR-041). Rescuing four of five documents from a file you can no longer edit
is better than refusing the file — but only if you are told it was four of five.

## Migration Notes

### Document `name` deprecation (iteration 3, still 1.0.0)

`Document.name` is now optional and deprecated. Documents created from a
country template no longer store a display name — a stored name would make
exported JSON depend on the UI language. The stable `code` identifies the
document and the label is resolved through translation. Existing 1.0.0
exports that still contain `name` import unchanged; the value is used only as
a display fallback for codes with no translation. `schemaVersion` stays
`1.0.0`. See ADR-012.

### Retired requirement codes (template 1.2.0, `schemaVersion` was 1.1.0)

`TAX_RETURNS`, `BUSINESS_LICENSE` and `PENSION_STATEMENT` were retired from the Greece/Türkiye pack
and replaced by `TAX_PAYMENT_STATEMENT`, `COMPANY_ACTIVITY_CERTIFICATE` and `PENSIONER_BOOKLET`.
They were re-pointed at genuinely different documents by an earlier evidence sprint, and a `code` is
the identity of a persisted record — so reusing them would have changed what documents people
already held were taken to mean (ADR-049).

**Nothing about the format changes.** `code` is a free string, so codes are values rather than
schema. A file containing a retired code still parses, still round-trips byte-identically, keeps its
status, notes and dates, and still resolves to its **original** label — the retired translations were
restored for exactly that reason. A retired code is never mapped to its replacement: the replacement
is a separate requirement that starts unsatisfied.

That change moved neither `schemaVersion` nor `STORAGE_FORMAT_VERSION`; only the country pack's
`templateVersion` did.

### Version 1.4.0 (Current) — 2026-09-10

Adds `application.employment.occupationCode`, an optional string.

Occupation, one level finer than `employmentStatus`, where a consulate's checklist branches on it: a
public servant against an ordinary employee, a farmer against a company owner. The values this build
understands are `employee`, `public_servant`, `company_owner`, `independent_professional` and `farmer`.

**It is an open string on purpose, and it is not validated against that list.** The field is parsed as
`z.string()`, so a file may carry a code this build has never seen — written by a newer one, or by
hand. Such a value is **kept exactly as written and round-trips intact**, and it is **inert**: it
activates no requirement, because only a code this build knows *and* that is legal for the recorded
`employmentStatus` reaches the checklist. A code that contradicts the status is treated the same way —
preserved in the file, ignored by the checklist.

The reason for the shape is the parser, not taste. `application` is parsed as a single unit, so an
unknown *enum* value inside it would cost a reader the whole slice; an unknown *string* costs nothing.
That is also why **this is the last version bump occupation will ask for** — the vocabulary can grow
without the format changing. It says nothing about future bumps for anything else.

**Nothing is inferred.** A file without the field resolves to exactly the checklist it always did;
`employmentStatus`, `applicant.occupation` and `employment.jobTitle` are never read to guess it.

See ADR-053.

### Version 1.3.0 — 2026-09-08

Adds `document.satisfiedContract`, an optional string.

**Why a second field.** `satisfiedRevision` answers *how far had this requirement tightened?* — one
number on one scale. That is enough while a requirement asks the same thing of everybody. It stopped
being enough when a destination or filing jurisdiction gained the ability to add its own acceptance
criteria to a shared requirement: Greece asks for a recent photograph, Germany asks for one of
35 x 45 mm no older than six months, and both are the same requirement `PHOTOS`. Two different bars
can sit at the same number, and one did.

`satisfiedContract` answers the other question — *which* contract was it? It is an opaque identifier
of the effective contract in force when you confirmed the document, and it is only ever compared for
equality. Do not parse it; its shape is free to change.

**When it is written.** Alongside `satisfiedRevision`, when you mark a document ready, and removed
with it when you set any other status.

**What VisaFlow does with it.** If the identifier still matches, your claim stands. If it does not —
because the requirement gained criteria, or because you changed the destination of this dossier and
the other country judges the document differently — the document is shown as needing a check and
stops counting toward readiness. **Your status is never changed**: the file still says
`"status": "ready"`, because that is what you asserted.

**A file without it is not simply stale.** Documents exported before 1.3.0 carry no identifier, and
for a requirement that asks the same thing everywhere they keep counting exactly as before. For a
requirement that has since gained destination-specific criteria they are shown as needing a check,
because a claim made before those criteria existed cannot show that they were met. VisaFlow does not
guess which contract an older claim was made against.

---

### Version 1.2.0 — 2026-08-30

Adds `document.satisfiedRevision`, an optional positive integer.

**What it means.** Country-pack requirements carry a `revision` — an *acceptance contract* version,
not a content version. It moves only when a requirement keeps its identity but starts asking for
**stricter** evidence; wording fixes, translations, added citations and clarifications never move it.
`satisfiedRevision` records which revision a document is **currently claimed** to satisfy.

**When it is written.** When you mark a document ready. It is removed when you set any other status —
the field says what you are claiming now, never what you claimed once. Marking a document ready again
re-stamps it against today's requirement, which is how you tell VisaFlow you have obtained the newer
evidence too.

**What VisaFlow does with it.** If the requirement has since tightened, the document is shown as
needing an update and stops counting toward readiness — but **your status is never changed**. The
file still says `"status": "ready"`, because that is what you asserted, and it is yours to change.

**A file without it is not stale.** Documents exported before 1.2.0 carry no claim, and absence of a
claim is not evidence about your documents. They keep counting as ready, and stamp themselves the
next time you confirm one.

`revision` itself is **never** exported. It belongs to the country pack, not to your dossier, and
writing it into your file would freeze a copy of something that is meant to move.

### Version 1.1.0 — 2026-08-25

Adds `applicant.previousRefusals`, a list of refused visa applications:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| country | string (ISO 3166-1 alpha-2) | Yes | The country that refused the application |
| refusedOn | string (ISO date) | No | When it was refused, if the applicant recalls |
| visaType | string | No | The type applied for, as the applicant knew it |
| notes | string | No | Free text |

A refusal is **not** a `previousVisas` entry with a failed status: nothing was issued, so a visa's
issue date, expiry date and entry count are all meaningless for it. Modelling it that way would also
have been unsafe — `previousVisas` is nested inside the applicant, which import parses as one unit, so
a status an older build did not recognise would have made it drop the applicant's name, passport and
travel history along with the refusal (ADR-043).

VisaFlow records refusals so the applicant can declare them accurately. It **never** scores, counts,
compares or predicts anything from them (ADR-016).

### Version 1.0.0
- Initial schema version
- All fields and structures as documented above
- **Unchanged by application v1.1.0.** The saved-dossier workspace added local storage around the
  dossier, not inside the file. A v1.0 export imports into v1.1 unchanged, and a file exported by
  v1.1 is byte-compatible with what v1.0 wrote for the same data.

### Future Versions
- Schema migrations will be handled automatically
- Older exports will be upgraded to current version on import
- Breaking changes will increment the major version
