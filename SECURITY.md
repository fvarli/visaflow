# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :x:                |

## Reporting a Vulnerability

Please report suspected vulnerabilities privately through GitHub — **not** in a public issue:
**Security → Report a vulnerability** on this repository
(<https://github.com/fvarli/visaflow/security/advisories/new>).

Where possible, include:

- the affected version (Settings → About in the app, or `package.json`)
- steps to reproduce
- the impact you believe it has
- any supporting evidence

Please allow reasonable time to investigate before public disclosure. Ordinary bugs and feature
requests are not security reports — open a normal issue for those.

## Security Model

### Data Storage

VisaFlow is designed with privacy as a core principle:

- **No Server Storage**: all data remains on your device; there is no backend
- **Local Storage On Your Device**: dossiers are saved in this browser's IndexedDB database so they
  survive a refresh. `localStorage` holds only `visaflow-theme` and `visaflow-locale` —
  non-personal interface preferences
- **Not Encrypted**: local storage is not a password. Anyone who can use this browser profile can
  open saved dossiers. A **Session only** mode keeps a dossier in memory for shared computers
- **No Cookies**: No tracking or session cookies
- **No External APIs**: No network requests to third-party services

### Data Flow

```
User Input -> Browser Memory -> IndexedDB in this browser profile
                    |            (saved dossiers; cleared with site data)
                    |
                    +---------> JSON Export (user-initiated download)
                                     |
                                     v
                              Local File System (user-controlled)
```

A dossier can also be opened in **Session only** mode, in which the IndexedDB branch above does
not happen at all and the dossier exists solely in memory until the tab is closed.

### What This Means

1. **Your dossiers survive closing and refreshing** - they are saved in this browser
2. **Clearing browser or site data deletes them** - export a JSON backup you control
3. **Your data never leaves your device** - unless you explicitly share the JSON file
4. **On a shared computer** - use Session only, or delete saved dossiers when finished
5. **No account required** - No registration, no login, no tracking

### Potential Risks

While VisaFlow minimizes data exposure, users should be aware:

1. **JSON files contain personal data** - Store exported files securely
2. **Browser storage is not encrypted** - other profile users and extensions may have access
3. **Screenshots may capture sensitive data** - Be cautious when sharing screens
4. **Shared computers** - Ensure you export and close properly on shared machines

### Best Practices

1. **Export regularly** - Avoid data loss from accidental closures
2. **Secure your exports** - Store JSON files in an encrypted location
3. **Use Session only, or a private window, on a shared computer** - in either case the dossier
   is not written to that browser profile. Note that a private window also means nothing you do
   there survives closing it, so export before you finish
4. **Clear browser data when you are done with a device** - this permanently deletes every saved
   dossier in that browser profile. Export the JSON files you want to keep first; there is no
   other copy

## Dependencies

Dependencies are pinned in `pnpm-lock.yaml` and reviewed with `pnpm audit`.

GitHub Dependabot vulnerability alerts are enabled, so known advisories affecting the lockfile are
flagged automatically. Dependabot does **not** open pull requests here: neither automated security
fixes nor scheduled version updates are enabled, so upgrades are always applied deliberately rather
than on a timer. Alerts are reviewed and acted on by hand.

## Content Security

- **No external resources loaded** - no CDN, no web fonts, no analytics, no third-party frames
- **All assets bundled locally** and served from the app's own origin
- **One inline script**, in `index.html`: it applies the stored theme and language before first
  paint, reads only the two non-personal preference keys, and touches no dossier data. It is
  called out here rather than described away, because it is the reason a `script-src 'self'`
  Content-Security-Policy would need a hash or a nonce
- **No Content-Security-Policy is currently shipped.** VisaFlow serves no user content and makes
  no third-party requests, so there is nothing for one to constrain today — but the absence is a
  gap, not a control, and it is recorded as one rather than claimed as a feature
