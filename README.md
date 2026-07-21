# VisaFlow

A privacy-first visa application dossier and document checklist manager.

**VisaFlow is an organizational tool. It does not provide legal advice, represent any embassy or visa center, or guarantee a visa decision. Always verify requirements using current official sources.**

## Features

- **Document Checklist** - Track all required documents for your visa application
- **Consistency Validation** - Automated checks for common issues (dates, coverage, etc.)
- **Timeline View** - Visual timeline of important dates and milestones
- **Privacy-First** - All data stays in your browser; nothing is sent to any server
- **JSON Import/Export** - Full control over your data with portable JSON format
- **Multiple Countries** - Configurable requirements (starting with Greece Schengen tourism)

## Screenshots

_Screenshots coming soon_

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- pnpm 11+ (enforced via `packageManager` field)

### Installation

```bash
# Clone the repository
git clone https://github.com/fvarli/visaflow.git
cd visaflow

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Development Commands

```bash
# Start development server
pnpm dev

# Run linting
pnpm lint

# Run tests
pnpm test

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Usage

### Starting a New Application

1. Open VisaFlow in your browser
2. Click "Start New Greece Application" on the Dashboard
3. Fill in your applicant information
4. Add trip details and appointment date
5. Track your documents on the Documents page
6. Use Consistency Checks to find potential issues

### Import/Export Workflow

VisaFlow uses JSON files for data storage. This gives you full control over your data.

**To save your work:**
1. Click "Export Dossier" in the sidebar
2. A JSON file will be downloaded
3. Store this file securely (it contains personal information)

**To resume your work:**
1. Click "Import Data" in the sidebar
2. Select your previously exported JSON file
3. Your data will be loaded into the application

**Example Data:**
Click "Load Example Data" to see how VisaFlow works with fictional sample data.

## Privacy Model

VisaFlow is designed with privacy as a core principle:

- **No Server Storage** - All data remains in your browser's memory
- **No Analytics** - No tracking, no cookies, no telemetry
- **No External APIs** - No network requests to third-party services
- **You Control Your Data** - Export anytime, delete by closing the browser

**Important:** Data is NOT persisted to localStorage. When you close the browser or refresh the page, data is lost unless you export it first.

## Technology Stack

- React 19
- TypeScript (strict mode)
- Vite
- Tailwind CSS v4
- shadcn/ui
- React Router
- React Hook Form + Zod
- date-fns
- Vitest

## Project Structure

```
src/
├── app/                    # App configuration
│   ├── providers/          # React Context providers
│   └── router/             # Route definitions
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # App shell components
│   └── shared/             # Shared business components
├── features/               # Feature modules
│   └── import-export/      # JSON import/export
├── domain/
│   ├── schemas/            # Zod validation schemas
│   ├── types/              # TypeScript types
│   └── rules/              # Validation rules
├── config/
│   └── countries/          # Country configurations
├── data/
│   └── examples/           # Example JSON data
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities
├── pages/                  # Page components
└── tests/                  # Test files
```

## Current Limitations

1. **No Persistent Storage** - Data must be exported manually
2. **Single Application** - One application at a time
3. **No File Uploads** - Document references are text-only
4. **Limited Countries** - Only Greece configuration included
5. **No Offline Support** - Requires browser session

## Roadmap

### Phase 2
- Local Node.js file adapter for automatic saving
- Multiple saved applications
- PDF dossier index generation
- Printable checklist export

### Phase 3
- Optional encrypted local database
- User-defined country templates
- Document expiry notifications
- Family/group applications

### Phase 4
- Optional self-hosted backend
- Encrypted file storage
- Collaborative dossier review
- Role-based access control

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for security policy.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Disclaimer

VisaFlow is provided "as is" without warranty of any kind. The document checklists and validation rules are for organizational purposes only and should not be considered official requirements. Always verify requirements with the official embassy, consulate, or authorized visa center for your application.
