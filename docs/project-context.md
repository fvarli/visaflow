# Project Context

## What is VisaFlow?

VisaFlow is an organizational tool for managing Schengen visa applications. It helps applicants:

- Track required documents with a configurable checklist
- Validate data consistency (dates, coverage, completeness)
- Organize trip details, employment info, and sponsor data
- Export/import dossier data as portable JSON files

**VisaFlow does NOT:**
- Provide legal advice
- Submit applications to embassies
- Store data on any server
- Guarantee visa approval
- Estimate any approval probability or refusal-risk score (see ADR-016)

**What VisaFlow measures** is organization and internal consistency only:
dossier readiness, application completeness, missing required documents,
documents needing updates, and consistency findings. In Turkish: *dosya
hazırlık düzeyi, başvuru tamamlanma durumu, eksik zorunlu belgeler,
güncellenmesi gereken belgeler, tutarlılık bulguları*.

**Languages:** the UI is bilingual (Turkish and English), Turkish by default.

## Target Users

Individuals applying for short-stay Schengen visas who want to:
- Organize their documents systematically
- Catch common errors before submission
- Keep their sensitive data private

## Privacy Model

VisaFlow is designed for privacy-conscious users:

1. **No server** - Pure client-side application
2. **No localStorage** - Data lives only in browser memory
3. **No analytics** - No tracking, no cookies, no telemetry
4. **User-controlled export** - JSON file download on demand

When you close the browser, data is gone unless you exported it.

## Current Scope

The MVP supports:
- **One country**: Greece (Schengen tourism visa)
- **One application at a time**
- **Document tracking** with status updates
- **15+ validation rules** checking dates and consistency
- **JSON import/export** for data persistence

## Domain Concepts

| Term | Description |
|------|-------------|
| Dossier | Complete visa application package |
| Applicant | Person applying for the visa |
| Sponsor | Person financially supporting the trip |
| Trip | Travel details (dates, route, accommodations) |
| Document | Individual required document with status |
| Finding | Validation issue (error, warning, info) |

## Why This Approach?

Visa applications involve sensitive personal data:
- Passport numbers
- Financial information
- Employment details
- Travel history

Rather than trust a cloud service with this data, VisaFlow keeps everything local. Users export JSON files and store them however they prefer (encrypted drive, password manager, etc.).
