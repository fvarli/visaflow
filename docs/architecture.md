# Architecture

## Overview

VisaFlow follows a domain-driven, modular architecture designed for:
- Privacy (no server, no persistent storage)
- Testability (pure functions for business logic)
- Maintainability (clear separation of concerns)
- Extensibility (configurable country requirements)

## Directory Structure

```
src/
├── app/                    # Application bootstrap
│   ├── providers/          # React Context providers
│   └── router/             # Route definitions
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── layout/             # App shell components
│   └── shared/             # Reusable business components
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

## Key Architectural Decisions

### 1. No Database

**Decision**: Store all data in browser memory with JSON export.

**Rationale**:
- Maximum privacy - data never leaves the device
- Portability - JSON files work anywhere
- Simplicity - no backend infrastructure needed
- User control - explicit export action

**Trade-off**: Data is lost on page refresh unless exported.

### 2. Domain-Driven Structure

**Decision**: Organize code by domain concepts, not technical layers.

**Rationale**:
- Business logic is co-located and discoverable
- Changes to a feature are isolated
- Easier to understand the system
- Facilitates testing

### 3. Pure Function Validation Rules

**Decision**: All validation rules are pure functions that take a Dossier and return findings.

**Rationale**:
- Easy to test in isolation
- Easy to compose and extend
- No side effects
- Predictable behavior

**Example**:
```typescript
type ValidationRule = (dossier: Dossier) => ValidationFinding[]

const passportValidAfterTrip: ValidationRule = (dossier) => {
  // Pure logic, no side effects
  // Returns array of findings
}
```

### 4. Zod Schemas as Source of Truth

**Decision**: Use Zod schemas for both validation and TypeScript type inference.

**Rationale**:
- Single source of truth for data shapes
- Runtime validation for imports
- Compile-time type safety
- Self-documenting

### 5. Country Configuration

**Decision**: Document requirements are configuration, not code.

**Rationale**:
- Easy to add new countries
- Requirements can be updated without code changes
- Clear separation of rules from requirements
- Supports conditional requirements

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌──────────┐     ┌───────────────┐     ┌──────────────┐   │
│  │   UI     │────▶│ DossierContext │────▶│   Reducer    │   │
│  │  Forms   │     │   (State)     │     │   Actions    │   │
│  └──────────┘     └───────────────┘     └──────────────┘   │
│       │                  │                                   │
│       │                  ▼                                   │
│       │           ┌───────────────┐                         │
│       │           │  Validation   │                         │
│       │           │    Rules      │                         │
│       │           └───────────────┘                         │
│       │                                                      │
│       ▼                  ▼                                   │
│  ┌──────────┐     ┌───────────────┐                         │
│  │  Import  │◀────│    Export     │────────▶ JSON File      │
│  │ Service  │     │   Service     │                         │
│  └──────────┘     └───────────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## State Management

### DossierContext

The central state container using React's useReducer:

```typescript
interface DossierState {
  dossier: Dossier | null
  isDirty: boolean
  lastSaved: Date | null
}

type DossierAction =
  | { type: 'LOAD_DOSSIER'; payload: Dossier }
  | { type: 'UPDATE_APPLICANT'; payload: Partial<Applicant> }
  | { type: 'UPDATE_APPLICATION'; payload: Partial<Application> }
  // ...more actions
```

### Why Not Redux/Zustand?

- Application state is relatively simple
- React Context + useReducer is sufficient
- Fewer dependencies
- Easier to understand

## Validation Architecture

### Rule Composition

Rules are composed in the runner:

```typescript
const allRules: ValidationRule[] = [
  tripDatesValid,
  appointmentBeforeTrip,
  passportValidAfterTrip,
  // ...more rules
]

export function runValidation(dossier: Dossier): ValidationFinding[] {
  return allRules
    .flatMap(rule => rule(dossier))
    .sort(bySeverity)
}
```

### Finding Structure

```typescript
interface ValidationFinding {
  id: string           // Unique identifier
  severity: 'error' | 'warning' | 'info'
  title: string        // Short description
  description: string  // Detailed explanation
  relatedFields: string[]  // Affected fields
  suggestedAction: string  // What to do
}
```

## Component Architecture

### Page Components

Each page follows a consistent pattern:
1. Fetch data from DossierContext
2. Render form with React Hook Form
3. Validate with Zod schema
4. Dispatch updates on change

### UI Components

Using shadcn/ui provides:
- Accessible by default
- Consistent styling
- Customizable primitives
- No heavy runtime

## Performance Considerations

1. **Memoization**: Validation runs only when dossier changes
2. **Lazy Loading**: Pages could be code-split (not implemented yet)
3. **Efficient Updates**: Reducer updates only changed portions
4. **No Network**: Zero latency for all operations

## Testing Strategy

### Unit Tests
- All validation rules
- Schema validation
- Utility functions

### Integration Tests (Future)
- Import/export flow
- Form submissions
- Navigation

### E2E Tests (Future)
- Complete user flows
- Cross-browser testing

## Extension Points

### Adding Validation Rules
1. Create rule function in `src/domain/rules/`
2. Add to runner
3. Add tests

### Adding Countries
1. Create config in `src/config/countries/`
2. Register in index
3. See [adding-a-country.md](./adding-a-country.md)

### Adding Document Types
1. Update country configuration
2. Add to DocumentCategory enum if new category
