# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within VisaFlow, please take the following steps:

1. **Do Not** open a public issue
2. Email the maintainers with details of the vulnerability
3. Include steps to reproduce if possible
4. Allow reasonable time for a response before any public disclosure

## Security Model

### Data Storage

VisaFlow is designed with privacy as a core principle:

- **No Server Storage**: All data remains in your browser's memory
- **No localStorage**: Personal data is never written to browser storage
- **No Cookies**: No tracking or session cookies
- **No External APIs**: No network requests to third-party services
- **Session-Only**: Data exists only during your browser session

### Data Flow

```
User Input -> Browser Memory -> JSON Export (user-initiated download)
                                     |
                                     v
                              Local File System (user-controlled)
```

### What This Means

1. **Closing the browser clears all data** - Export before closing
2. **Refreshing the page clears all data** - Export before refreshing
3. **Your data never leaves your device** - Unless you explicitly share the JSON file
4. **No account required** - No registration, no login, no tracking

### Potential Risks

While VisaFlow minimizes data exposure, users should be aware:

1. **JSON files contain personal data** - Store exported files securely
2. **Browser memory is not encrypted** - Other browser extensions may have access
3. **Screenshots may capture sensitive data** - Be cautious when sharing screens
4. **Shared computers** - Ensure you export and close properly on shared machines

### Best Practices

1. **Export regularly** - Avoid data loss from accidental closures
2. **Secure your exports** - Store JSON files in an encrypted location
3. **Use incognito mode** - For additional privacy on shared computers
4. **Clear browser data** - If concerned about memory forensics

## Dependencies

We monitor dependencies for known vulnerabilities using:
- GitHub Dependabot
- npm audit

## Content Security

- No inline scripts
- No external resources loaded
- All assets bundled locally
