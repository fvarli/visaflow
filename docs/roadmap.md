# Roadmap

This document outlines planned features for future phases.

## Delivered

- **Visual foundation** — design tokens, theming, reusable UI primitives.
- **Internationalization** — Turkish/English UI, Turkish default (ADR-011).
- **Country → visa type → requirement** configuration with source metadata
  (ADR-014/ADR-015).

## Near-term follow-ups

- Add more visa types per country (business, visit) using the new hierarchy.
- Surface `SourceNote` inside the real Documents detail view (currently in the
  playground and ready to adopt during the Documents redesign).
- Verify the Greece template against a current official source and record real
  `lastVerifiedAt` dates, raising `reviewStatus` honestly.

## Phase 2: Enhanced Data Management

### Local File Adapter
- Save/load dossiers to local filesystem
- Watch for external changes
- Auto-save with confirmation

### Multiple Applications
- Support multiple dossiers
- Application list view
- Quick switch between applications

### PDF Generation
- Export dossier index as PDF
- Printable document checklist
- Summary page for reference

## Phase 3: Extended Features

### Encrypted Local Storage
- Optional encrypted persistence
- Password-protected data
- Still fully offline

### User-Defined Templates
- Create custom country configurations
- Share templates (without personal data)
- Community contributions

### Document Notifications
- Expiry date warnings
- Reminder system
- Timeline-based alerts

### Family/Group Applications
- Multiple applicants per dossier
- Shared documents
- Group validation

## Phase 4: Optional Collaboration

### Self-Hosted Backend
- Optional server deployment
- User-controlled infrastructure
- Full data ownership

### Encrypted Sync
- End-to-end encrypted sync
- Multiple device access
- Still privacy-first

### Collaborative Review
- Share dossier for review
- Role-based access
- Comment system

### Document Storage
- Encrypted file attachments
- Local or self-hosted storage
- Reference linking

## Non-Goals

These are explicitly **not planned**:

- Cloud-hosted SaaS
- Monetization through data
- Third-party integrations that leak data
- Mobile app (web app works on mobile)
- Automatic embassy submission

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to propose new features.

## Priority Notes

Phases are flexible. Priority depends on:
- User feedback
- Security considerations
- Maintainability
