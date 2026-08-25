# Changelog

Notable changes to VisaFlow are documented here. The format is inspired by
[Keep a Changelog](https://keepachangelog.com/), and VisaFlow follows
[Semantic Versioning](https://semver.org/).

> **Four independent versions.** This file tracks the **application** version. The dossier JSON
> format carries its own `schemaVersion`, documented in [docs/json-schema.md](docs/json-schema.md);
> country packs carry a `templateVersion`; and the local storage format carries a
> `STORAGE_FORMAT_VERSION` that never appears in an exported file. They move independently: as of
> application v1.1.0 the dossier schema is `1.1.0` and the storage format is `2`, and no two of the
> four have ever moved together.

## [1.1.0] - 2026-08-25

The saved-dossier workspace. v1.0 kept everything in memory, so closing the tab cost you your work
unless you had exported first; this release makes VisaFlow remember — several dossiers, side by
side, in your own browser and nowhere else. The new surface area is all about being honest about
where your data is: saved is not backed up, two tabs is not collaboration, and a browser's copy is
not a copy you own.

### Added

- **Multiple saved dossiers.** Dossiers are stored in this browser's IndexedDB behind a repository
  port and survive refresh, restart and navigation. Create, open, rename and delete them from a
  new **Your dossiers** page, or switch from the header. One is open at a time; nothing anywhere
  aggregates across them.
- **A name of your own.** Rename any dossier inline on its card. The name is local workspace
  metadata — it is never written into the exported JSON, so the same dossier exports identically
  whatever you call it.
- **Session only.** Any dossier can be created — or an import adopted — without being written to
  this browser at all, for a shared or library computer. It can be promoted to a saved dossier
  later, keeping the same identity, and is never discarded without being asked first.
- **Two tabs are safe.** Every dossier carries a revision and every write is a compare-and-swap, so
  a tab that has fallen behind is told rather than allowed to overwrite. You choose: open the saved
  version, or keep yours as a separate dossier. There is deliberately no field-level merging.
- **Backup freshness, per dossier.** VisaFlow now tracks whether you have ever exported a dossier
  and whether it has changed since, and says which on the Dossiers page and in Settings. Any
  dossier can be exported without opening it — and doing so moves neither its revision nor its
  modification time.
- **A workspace home.** `/dossiers` is what you have; the dashboard is how the one you are inside
  is doing. Entry is derived from what is actually saved, so a returning user reaches their
  dossier, someone who closed one reaches the list, and only a genuinely empty workspace sees
  onboarding. The dashboard is headed by the dossier's own name, and the browser tab carries it too.
- **One guard for work that is not in storage.** Every operation that replaces or empties the
  editor — open another dossier, create one, adopt an import, close — asks first if what is on
  screen is not saved, and offers the way out the situation allows: save it here, keep it as a new
  dossier, or take a file.
- **Imports say what they could not read.** A file with one unreadable document still imports the
  rest, and now tells you how many items were left out, in your language, wherever you imported it.

### Changed

- **Local persistence replaces the in-memory-only model** of ADR-001/ADR-006 for dossiers
  ([docs/decisions.md](docs/decisions.md)).
  `localStorage` is still limited to exactly two non-personal keys; dossier data goes to IndexedDB
  and only to IndexedDB.
- **"Saved" no longer means "exported."** v1.0's status line was driven by fields that only moved
  on export, so a never-exported dossier could report both "no changes since your last export" and
  a recent save. Local save state and backup freshness are now separate facts, both read from the
  stored record.
- **Closing a dossier keeps it.** The old Reset cleared the editor and looked like deletion;
  closing now leaves the saved record untouched, stops it reopening automatically, and returns you
  to your dossiers. Deletion lives on the Dossiers page and nowhere else.
- Storage failures explain themselves and offer an export, rather than reporting a save that did
  not happen. A browser that refuses storage entirely is worded differently from a write that
  failed, because they are different problems.

### Fixed

- A dossier written by the previous storage format could be opened but **never saved again** — the
  first edit reported a conflict with a second tab that did not exist. Such records now migrate and
  heal on their first write.
- Exporting a dossier could be silently forgotten by the next keystroke, so "Never exported"
  reappeared on a dossier exported a minute earlier.
- Focus fell to the page body after deleting a dossier and after closing one, stranding keyboard
  and screen-reader users. Both confirmations now hold until their work has committed, and the skip
  link works for the first time.
- A `documents` or `sponsors` value that was not a list was dropped from an import with no error
  recorded anywhere.

### Accessibility

- The main content region is properly focusable, which fixes both the skip link and every
  focus-restoration path that names it as a destination.
- The conflict and leave dialogs open with the safe choice focused, never the destructive one, and
  order their actions so a phone user's thumb does not land on the irreversible one.

### Privacy / Security

- **Dossiers are now written to this browser.** This is the one privacy-relevant change in the
  release, and it is stated plainly everywhere it matters: local storage is not encryption, anyone
  who can use this browser profile can open your dossiers, and clearing browser data deletes them
  permanently. **Session only** exists for when that is not acceptable.
- The exported JSON file remains the only copy you own. The browser's is not a backup.
- Cross-tab coordination sends dossier ids and revision numbers over a `BroadcastChannel` within
  this browser. No dossier contents are ever broadcast, and nothing leaves the device.
- Still no server, no account, no analytics, no third-party or CDN requests, and no approval or
  refusal prediction.

### Known boundaries in 1.1.0

Saved in one browser profile only — this is not sync, and there is no cloud copy · local storage is
not encrypted · a refresh still discards a session-only dossier, by design · deleting a dossier is
authoritative and cannot be undone · no field-level merging between tabs · document references are
text, not uploaded files · Greece Schengen short-stay tourism is still the only production country
pack · no offline PWA.

VisaFlow is an organizational tool. It does not provide legal advice, represent any embassy or visa
center, submit applications, generate official forms, or predict a visa decision — and it never
will estimate an approval probability or refusal-risk score.

## [1.0.0] - 2026-08-16

First public release. VisaFlow is a private-by-architecture workspace for preparing an
international visa application: a structured dossier, deterministic consistency checks, a
preparation timeline, and country-specific requirements — with every byte of personal data staying
on your own device.

### Added

- **Privacy-first, client-only architecture.** No server, no account, no database, no analytics, no
  third-party or CDN requests. The dossier lives in browser memory and in a JSON file you own.
- **Structured dossier** — applicant, trip, employment, finances, sponsors, documents, appointment
  and notes as first-class, schema-validated data.
- **Greece Schengen short-stay tourism country pack** — the first production pack, authored as
  `country → visa type → requirements` data with conditional logic and honest source metadata.
  Requirements are translation keys, never baked-in prose; unverified sources say so plainly.
- **Deterministic consistency validation** — pure `(Dossier) => ValidationFinding[]` rules composed
  by a runner with a stable severity order. Same input, same findings, always. Findings carry
  stable keys and typed parameters, so they render identically in either language.
- **Canonical dossier readiness** — one shared derivation behind every surface, so the dashboard,
  documents workspace, timeline, validation center and final review can never disagree about how
  ready the dossier is.
- **Command-center dashboard** — readiness, the recommended next action, upcoming dates and open
  findings at a glance.
- **Guided workflows** for Applicant, Trip, Employment and Finance, with contextual guidance at the
  point of entry rather than in a manual.
- **Sponsor workspace** — add, edit and link sponsors and their supporting evidence.
- **Documents workspace** — status tracking, requirement matching, filtering, and a recommended
  next document.
- **Timeline** — appointment, preparation milestones, trip dates and document expiry, presented as
  a recommended plan rather than official deadlines.
- **Validation Center** — every consistency finding grouped and explained, with a route to the
  field that resolves it.
- **Final Review and departure check** — a pre-submission review plus a focused "before you leave
  for the appointment" view.
- **Settings and first-run onboarding** — appearance, language, country packs, privacy, local data,
  import/export and about, plus a guided first run that can load a fictional example dossier.
- **Open JSON import/export** — one documented, versioned, language-independent document. The same
  dossier exports byte-identically whether the interface is Turkish or English.
- **Turkish and English throughout**, Turkish by default. Language is a non-personal interface
  preference and never changes exported data.
- **Responsive light/dark design system** built on design tokens, developed and demonstrated in an
  in-app Playground before use.

### Accessibility

- A single global focus system: one `:focus-visible` ring for every control in the app.
- Overlays (dialogs, sheets, alert dialogs) trap focus while open, close on `Escape`, and return
  focus to whatever opened them — including overlays opened from a different component subtree, a
  URL parameter, or a file input.
- Keyboard-operable navigation with a skip link, visible focus throughout, and no tab traps.
- Verified in a real browser at 390px, 834px and 1440px, in both themes and both languages.

### Privacy / Security

- Personal data is never written to browser storage. The only keys VisaFlow persists are
  `visaflow-theme` and `visaflow-locale`, both non-personal interface preferences.
- Data leaves the browser only when you explicitly export a JSON file. Closing or refreshing the
  tab discards the in-memory dossier by design — export first.
- All assets are bundled locally; the application makes no network requests.

### Known boundaries in 1.0.0

One application at a time · the dossier exists only in memory until exported · document references
are text, not uploaded files · Greece Schengen short-stay tourism is the only production country
pack · no offline PWA.

VisaFlow is an organizational tool. It does not provide legal advice, represent any embassy or visa
center, submit applications, generate official forms, or predict a visa decision — and it never
will estimate an approval probability or refusal-risk score.

[1.1.0]: https://github.com/fvarli/visaflow/releases/tag/v1.1.0
[1.0.0]: https://github.com/fvarli/visaflow/releases/tag/v1.0.0
