# Architectural Decisions

This document records key architectural decisions and their rationale.

## ADR-001: No Database

**Decision:** Store all data in browser memory with JSON export.

**Context:** Visa applications contain sensitive personal data. Users may not trust cloud services.

**Rationale:**
- Maximum privacy - data never leaves the device
- User has full control over storage location
- No backend infrastructure needed
- JSON files work anywhere

**Trade-off:** Data is lost on page refresh unless exported.

## ADR-002: Zod as Source of Truth

**Decision:** Use Zod schemas for both runtime validation and TypeScript types.

**Context:** We need to validate imported JSON and ensure type safety.

**Rationale:**
- Single source of truth for data shapes
- Runtime validation catches import errors
- `z.infer<>` generates TypeScript types automatically
- Self-documenting schemas

**Alternatives considered:**
- io-ts (more complex API)
- JSON Schema (separate from TypeScript)
- Manual validation (error-prone)

## ADR-003: Pure Function Validation Rules

**Decision:** All validation rules are pure functions returning findings arrays.

**Context:** We need composable, testable validation logic.

**Rationale:**
- Easy to test in isolation
- Easy to compose and extend
- No side effects
- Predictable behavior
- Rules can be added/removed without affecting others

**Example:**
```typescript
const passportValidAfterTrip = (dossier: Dossier): ValidationFinding[] => {
  // Pure logic, returns findings array
}
```

## ADR-004: Country Configuration, Not Code

**Decision:** Document requirements are configuration files, not hardcoded.

**Context:** Different countries have different requirements. Requirements change.

**Rationale:**
- Easy to add new countries
- Requirements can be updated without code changes
- Clear separation of rules from requirements
- Supports conditional requirements

**Location:** `src/config/countries/`

## ADR-005: React Context Over Redux

**Decision:** Use React Context with useReducer for state management.

**Context:** Application state is relatively simple (one dossier at a time).

**Rationale:**
- Sufficient for current needs
- Fewer dependencies
- Easier to understand
- No external library overhead

**When to reconsider:** If we add multi-application support with complex state relationships.

## ADR-006: No localStorage

**Decision:** Never use localStorage for personal data.

**Context:** Privacy-first design principle.

**Rationale:**
- localStorage persists after session ends
- Browser extensions may access localStorage
- Shared computers pose risk
- User may forget data is stored

**Exception:** Theme preference may use localStorage (non-personal).

## ADR-007: shadcn/ui Over Component Libraries

**Decision:** Use shadcn/ui (copy-paste components) instead of Chakra/MUI.

**Context:** Need consistent UI without heavy runtime.

**Rationale:**
- Components are owned, not dependencies
- Full customization control
- Smaller bundle size
- Based on Radix primitives (accessible)
- Tailwind CSS integration

## ADR-008: Lazy-Loaded Routes

**Decision:** Code-split pages using React.lazy().

**Context:** Reduce initial bundle size.

**Rationale:**
- Faster initial load
- Load only what user navigates to
- Simple to implement with React Router

**Implementation:** `src/app/router/routes.tsx`

## ADR-009: Branded Types for IDs

**Decision:** Use branded types (phantom types) for entity IDs.

**Context:** Prevent mixing up different ID types (ApplicantId vs DocumentId).

**Rationale:**
- Compile-time type safety
- Prevents `addDocument(applicantId)` mistakes
- Self-documenting code

**Implementation:** `src/domain/types/common.ts`

## ADR-010: JSON Schema Versioning

**Decision:** Include schema version in exported JSON.

**Context:** Schema may evolve; need migration path.

**Rationale:**
- Detect old exports
- Enable automatic migrations
- Clear compatibility signals

**Current version:** `1.0.0`
