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

## Requirement vs document instance

- **Document requirement** (`src/config/types.ts`) — template/configuration
  stating what an application *may* need.
- **Document instance** (`src/domain/schemas/document.schema.ts`) —
  applicant-specific record of whether that document is prepared. Identified by
  stable `code`; its display label is derived via translation.
