# Contributing to VisaFlow

Thank you for your interest in contributing to VisaFlow! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributions from everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. Create a new issue with a clear title and description
3. Include steps to reproduce the bug
4. Include expected vs actual behavior
5. Include browser and OS information

### Suggesting Features

1. Check if the feature has already been requested
2. Create a new issue with the "feature request" label
3. Clearly describe the problem the feature would solve
4. Propose a solution if you have one

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes following the coding standards below
4. Write or update tests as needed
5. Run linting and tests (`pnpm lint && pnpm test`)
6. Commit with a clear message
7. Push to your fork and create a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/visaflow.git
cd visaflow

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint
```

## Coding Standards

### TypeScript

- Use strict TypeScript settings
- Define types explicitly (avoid `any`)
- Use Zod schemas for runtime validation
- Use branded types for IDs

### React

- Use functional components with hooks
- Keep components focused and small
- Use React Hook Form for forms
- Separate business logic from UI components

### Validation Rules

- Keep validation rules as pure functions
- Each rule should return an array of findings
- Include clear, actionable error messages
- Add unit tests for all rules

### Country Configurations

- Keep country requirements in configuration files
- Do not hardcode requirements in components
- Include clear disclaimers
- Document sources where applicable

## Adding a New Country

See [docs/adding-a-country.md](docs/adding-a-country.md) for detailed instructions.

## Testing

- Write unit tests for validation rules
- Write tests for schema validation
- Aim for meaningful test coverage
- Use Vitest for testing

## Documentation

- Update README.md for significant changes
- Add JSDoc comments for public functions
- Document new features in appropriate docs/
- Keep documentation concise and practical

## Privacy Considerations

When contributing, please keep privacy in mind:

- Do not add analytics or tracking
- Do not add external API calls without discussion
- Do not store personal data in localStorage
- Keep example data fictional

## Questions?

Open an issue for questions or clarification.

Thank you for contributing!
