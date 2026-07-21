# Privacy Model

## Core Principles

VisaFlow is built on the principle that sensitive personal data should never leave your control. This document explains our privacy model in detail.

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

### 2. No Persistent Browser Storage

Unlike many web apps, VisaFlow does NOT use:
- localStorage
- sessionStorage
- IndexedDB
- Cookies (except potentially for theme preference)

**When you close your browser, data is gone.**

### 3. No External API Calls

VisaFlow makes:
- No analytics calls
- No tracking pixels
- No third-party API requests
- No CDN requests (all assets are bundled)

**No network requests for user data.**

### 4. User-Controlled Export

The only way data leaves your browser is through explicit export:
- You click "Export Dossier"
- A JSON file downloads to your device
- You control where this file is stored

**You decide when and where to save your data.**

## Data Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Device                              │
│                                                              │
│   ┌─────────────┐                                           │
│   │  JSON File  │◀──────────────────────┐                   │
│   │  (on disk)  │                       │                   │
│   └──────┬──────┘                       │                   │
│          │                              │                   │
│          │ Import                Export │                   │
│          │                              │                   │
│          ▼                              │                   │
│   ┌──────────────────────────────────────────┐              │
│   │              Browser Memory              │              │
│   │                                          │              │
│   │    ┌────────────────────────────────┐    │              │
│   │    │       VisaFlow Application     │    │              │
│   │    │                                │    │              │
│   │    │    - Edit forms               │    │              │
│   │    │    - Run validations          │    │              │
│   │    │    - View timeline            │────┼──────────────┘
│   │    │    - Track documents          │    │
│   │    │                                │    │
│   │    └────────────────────────────────┘    │
│   │                                          │
│   └──────────────────────────────────────────┘              │
│          │                                                   │
│          │ Close browser / Refresh                           │
│          ▼                                                   │
│   ┌──────────────┐                                          │
│   │   Data Lost  │  (unless exported)                       │
│   └──────────────┘                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

### JSON File Security

Your exported JSON file contains sensitive data. We recommend:

1. **Store securely**: Use encrypted storage (encrypted drive, password manager)
2. **Don't share**: Never email or share your dossier file
3. **Delete when done**: Remove old exports after successful visa

### Browser Security

While in memory:

1. **Other tabs**: Cannot access VisaFlow data (browser isolation)
2. **Extensions**: Malicious extensions could potentially access page data
3. **Developer tools**: Data is visible in React DevTools if open

### Recommendations

1. Use VisaFlow in a clean browser profile
2. Disable unnecessary extensions when working with sensitive data
3. Export and close when stepping away
4. Use incognito mode on shared computers

## What We Don't Do

To be completely transparent, VisaFlow will NEVER:

- Send your data to any server
- Store your data in browser storage
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

If VisaFlow adds optional features requiring storage:

1. They will be strictly opt-in
2. Data will be encrypted
3. Local-only options will always be available
4. Privacy documentation will be updated

## Questions?

If you have privacy concerns or questions, please open an issue on GitHub.
