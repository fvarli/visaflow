# Privacy Model

## Core Principles

VisaFlow is built on the principle that sensitive personal data should never leave your control.
This document is **the canonical privacy model** — the README and [SECURITY.md](../SECURITY.md)
summarize it and link here, and [principles.md](./principles.md) (#1 Privacy first, #2 The user
owns the data) states the commitments it fulfils.

## What Data VisaFlow Handles

Visa applications require sensitive personal information:

- Full legal name
- Date of birth
- Passport numbers and validity
- Employment details
- Financial information
- Travel history
- Sponsor information

This data requires careful handling.

## Our Approach

### 1. No Server Storage

VisaFlow has no backend server. There is:
- No database
- No user accounts
- No cloud storage
- No server-side processing

**Your data never leaves your browser.**

### 2. Local Browser Storage — On Your Device, Not On A Server

Since v1.1, VisaFlow saves your dossiers in **this browser**, using its built-in IndexedDB
database, so your work is still there when you come back (ADR-036). Two non-personal interface
preferences — `visaflow-theme` and `visaflow-locale` — remain in `localStorage` (ADR-013).

Since the cross-tab work in v1.1, open tabs also coordinate with each other through a
`BroadcastChannel`. That channel carries **only** a dossier id, a revision number, and a random
per-tab id — never applicant names, passport numbers, financial figures, or any part of a dossier.
It stays inside the browser, writes nothing to `localStorage`, and reaches no network (ADR-037).

What this does and does not mean:

- **Saved locally, never uploaded.** There is still no server, no account, and no network request
  carrying your data. "Stored" means stored on your own device.
- **Local storage is not encryption.** Anyone who can use this browser profile can open your
  dossiers, and so can a sufficiently privileged program on the machine. VisaFlow does not claim
  otherwise.
- **Clearing site or browser data deletes your dossiers.** So can a browser cleanup tool or a
  private-browsing session ending. **Export a JSON file to keep a real backup.** VisaFlow tracks
  this per dossier and tells you plainly whether each one has never been exported, is backed up, or
  has changed since your last export — the browser copy is never described as a backup, because it
  is not one (ADR-038).
- **You can opt out per dossier.** Choosing **Session only** when creating a dossier keeps it in
  memory exactly as v1.0 did: nothing is written, and it is gone when you close or refresh the
  tab. This is the right choice on a shared, library or family computer. VisaFlow says so on screen
  the whole time you are working, and offers both ways out — **Save on this device** or **Export
  backup** — rather than waiting for the work to disappear. Switching to another dossier asks first;
  refreshing or closing the tab still discards it, and no amount of interface can change that
  (ADR-039).
- **You can delete a saved dossier at any time** from the Dossiers page.

### 3. No External API Calls

VisaFlow makes:
- No analytics calls
- No tracking pixels
- No third-party API requests
- No CDN requests (all assets are bundled)

**No network requests for user data.**

### 4. User-Controlled Export

The only way data leaves your device is through explicit export:
- You click "Export Dossier"
- A JSON file downloads to your device
- You control where this file is stored

**You decide when and where to save your data.**

## Data Ownership

Privacy and ownership are two sides of the same design:

- **Your data is yours, in a file you hold.** The dossier is a single, documented, versioned
  JSON document ([json-schema.md](./json-schema.md)) — not a proprietary blob and not a row in
  someone else's database.
- **It is portable and language-independent.** The same dossier exports byte-identically whether
  the UI is in Turkish or English, so switching language never changes your file.
- **There is no lock-in.** VisaFlow is open source and self-hostable as static files; you can
  audit it, build it, or leave with your data at any time.

Ownership means the freedom to walk away — with everything.

## Data Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Device                              │
│                                                              │
│   ┌─────────────┐                                           │
│   │  JSON File  │◀───── Export ─────┐                       │
│   │  (on disk)  │────── Import ────▶│                       │
│   └─────────────┘                   │                       │
│                                     ▼                       │
│   ┌──────────────────────────────────────────┐              │
│   │              VisaFlow (browser)          │              │
│   │   edit · validate · timeline · documents │              │
│   └───────────────────┬──────────────────────┘              │
│                       │ autosave                            │
│                       ▼                                     │
│   ┌──────────────────────────────────────────┐              │
│   │   This browser's IndexedDB database      │              │
│   │   Saved dossiers — survive refresh and   │              │
│   │   restart. Deleted if you clear site     │              │
│   │   data, or if you delete them.           │              │
│   └──────────────────────────────────────────┘              │
│                                                              │
│   "Session only" dossiers skip this box entirely and are     │
│   discarded when the tab closes.                             │
│                                                              │
│   Nothing in this diagram crosses the edge of your device.   │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

### JSON File Security

Your exported JSON file contains sensitive data. We recommend:

1. **Store securely**: Use encrypted storage (encrypted drive, password manager)
2. **Don't share**: Never email or share your dossier file
3. **Delete when done**: Remove old exports after successful visa

### Browser Security

1. **Other sites**: Cannot access VisaFlow's stored data (same-origin isolation)
2. **Extensions**: Malicious extensions could potentially access page data and stored data
3. **Developer tools**: Data is visible in React DevTools and in the browser's storage inspector
4. **Anyone using this browser profile**: can open your saved dossiers — local storage is not a
   password. Use **Session only** on a shared computer.

### Recommendations

1. Use VisaFlow in a clean browser profile
2. Disable unnecessary extensions when working with sensitive data
3. Export and close when stepping away
4. Use **Session only**, or a private window, on shared computers
5. Delete saved dossiers from the Dossiers page when a visa process is finished

## What We Don't Do

To be completely transparent, VisaFlow will NEVER:

- Send your data to any server
- Use analytics or tracking
- Share data with third parties
- Create user accounts
- Require internet connection (after initial load)

## Open Source Transparency

VisaFlow is open source. You can:

1. **Audit the code**: Verify our privacy claims
2. **Build yourself**: Compile from source
3. **Self-host**: Run on your own infrastructure
4. **Modify**: Customize for your needs

## Future Considerations

Local persistence shipped in v1.1 with a session-only escape hatch rather than as an opt-in
(ADR-036): losing a half-finished visa dossier on a stray refresh was itself a harm, and a default
nobody notices is not a meaningful choice. If VisaFlow ever adds storage that leaves the device:

1. It will be strictly opt-in
2. Data will be encrypted
3. Local-only options will always remain the default
4. Privacy documentation will be updated first

## What VisaFlow deliberately does not ask for

A dossier field has to earn its place: it must be edited, validated, reviewed, printed, put on the
timeline, or required by a country pack (ADR-043). Anything else is personal data held for no reason.

VisaFlow previously collected a **national identity / social-security number** and a **tax ID** in the
employment wizard. Neither was ever displayed, validated, reviewed, printed, or required by any
country pack — they were stored and exported and used for nothing. Both inputs have been removed.

The two fields remain in the dossier schema, deprecated and optional, for one reason only: a dossier
that already holds them must still import and export unchanged. Deleting them from the format would
silently destroy data a user had given us, which is the opposite of the point. Nothing writes them any
more.

## Where this is surfaced in the app

The **Settings → Privacy** section restates this model to users in plain language: dossiers are saved in
this browser and never sent to a server; local storage is not encryption; clearing browser data deletes
them; export keeps a portable backup; and there are no accounts, servers, analytics, tracking, or
third-party requests. **Settings → Advanced** lists the exact two `localStorage` keys and names the
IndexedDB database separately. Settings itself is
pure presentation — it reads and reuses the existing import/export services and provider state and changes
nothing about how data is stored (ADR-030).

The **first-run `/welcome` flow** reinforces the same model before any data exists: it states that data stays
on this device and is never sent anywhere, and that VisaFlow never predicts an outcome. The create step asks
where the dossier should live — **Save on this device** (the default) or **Session only** — so the choice is
made before any personal data is entered, not buried in Settings afterwards. Onboarding still stores no
"completed" flag of its own (ADR-031).

## Questions?

If you have privacy concerns or questions, please open an issue on GitHub.
