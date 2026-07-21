# Adding a New Country Configuration

This guide explains how to add support for a new country's visa requirements to VisaFlow.

## Overview

Country configurations are located in `src/config/countries/`. Each country has its own configuration file that defines:

- Basic information (name, visa type)
- Document requirements
- Optional country-specific validation rules

## Step 1: Create the Configuration File

Create a new file in `src/config/countries/`:

```typescript
// src/config/countries/france.ts

import type { CountryConfig, DocumentRequirement } from '../types'

const documentRequirements: DocumentRequirement[] = [
  // Define requirements here
]

export const franceConfig: CountryConfig = {
  id: 'FR',
  name: 'France',
  visaType: 'Schengen Short-Stay (Tourism)',
  documentRequirements,
}
```

## Step 2: Define Document Requirements

Each document requirement has the following structure:

```typescript
interface DocumentRequirement {
  code: string                           // Unique identifier
  name: string                           // Display name
  category: DocumentCategory             // Category for grouping
  required: boolean | ConditionalRequirement  // Is it required?
  description?: string                   // Detailed description
  notes?: string                         // Additional notes
}
```

### Categories

Available categories (from `src/domain/types/common.ts`):

- `passport` - Passport-related documents
- `identity` - ID cards, photos, etc.
- `travel` - Itinerary, bookings, tickets
- `accommodation` - Hotel bookings, invitations
- `financial` - Bank statements, proof of funds
- `employment` - Employment letters, leave approval
- `insurance` - Travel insurance
- `sponsor` - Sponsor documents
- `supporting` - Other supporting documents

### Conditional Requirements

For documents that are only required in certain situations:

```typescript
{
  code: 'SPONSOR_INVITATION',
  name: 'Sponsor Invitation Letter',
  category: 'sponsor',
  required: {
    condition: 'has_sponsor',
    value: true,
  },
  description: 'Invitation letter from your sponsor',
}
```

Available conditions:
- `has_sponsor` - Applicant has a sponsor
- `employed` - Applicant is employed
- `self_employed` - Applicant is self-employed
- `student` - Applicant is a student
- `retired` - Applicant is retired

## Step 3: Example Configuration

Here's a complete example for France:

```typescript
// src/config/countries/france.ts

import type { CountryConfig, DocumentRequirement } from '../types'

const documentRequirements: DocumentRequirement[] = [
  // Passport
  {
    code: 'PASSPORT_CURRENT',
    name: 'Current Passport',
    category: 'passport',
    required: true,
    description: 'Valid passport with at least 3 months validity after return date',
    notes: 'Must have at least 2 blank pages',
  },
  {
    code: 'PASSPORT_COPIES',
    name: 'Passport Copies',
    category: 'passport',
    required: true,
    description: 'Photocopies of all passport pages with stamps/visas',
  },

  // Identity
  {
    code: 'PHOTOS',
    name: 'Passport Photos',
    category: 'identity',
    required: true,
    description: '2 recent passport-size photos',
    notes: 'White background, 35x45mm',
  },
  {
    code: 'APPLICATION_FORM',
    name: 'Visa Application Form',
    category: 'identity',
    required: true,
    description: 'Completed and signed Schengen visa application form',
  },

  // Travel
  {
    code: 'FLIGHT_RESERVATION',
    name: 'Flight Reservation',
    category: 'travel',
    required: true,
    description: 'Round-trip flight reservation',
  },
  {
    code: 'TRAVEL_ITINERARY',
    name: 'Travel Itinerary',
    category: 'travel',
    required: true,
    description: 'Day-by-day travel plan',
  },

  // Accommodation
  {
    code: 'HOTEL_BOOKING',
    name: 'Hotel Booking',
    category: 'accommodation',
    required: true,
    description: 'Confirmed hotel reservations for entire stay',
  },

  // Financial
  {
    code: 'BANK_STATEMENTS',
    name: 'Bank Statements',
    category: 'financial',
    required: true,
    description: 'Last 3 months bank statements',
    notes: 'Must show sufficient funds for the trip',
  },

  // Employment
  {
    code: 'EMPLOYMENT_LETTER',
    name: 'Employment Letter',
    category: 'employment',
    required: {
      condition: 'employed',
      value: true,
    },
    description: 'Letter from employer stating position, salary, and approved leave',
  },

  // Insurance
  {
    code: 'TRAVEL_INSURANCE',
    name: 'Travel Insurance',
    category: 'insurance',
    required: true,
    description: 'Travel medical insurance with minimum 30,000 EUR coverage',
    notes: 'Must cover entire Schengen area',
  },

  // Sponsor (conditional)
  {
    code: 'SPONSOR_INVITATION',
    name: 'Sponsor Invitation Letter',
    category: 'sponsor',
    required: {
      condition: 'has_sponsor',
      value: true,
    },
    description: 'Invitation letter from sponsor in France',
  },
  {
    code: 'SPONSOR_ID',
    name: 'Sponsor ID Copy',
    category: 'sponsor',
    required: {
      condition: 'has_sponsor',
      value: true,
    },
    description: 'Copy of sponsor\'s ID or residence permit',
  },
]

export const franceConfig: CountryConfig = {
  id: 'FR',
  name: 'France',
  visaType: 'Schengen Short-Stay (Tourism)',
  documentRequirements,
}
```

## Step 4: Register the Configuration

Add your country to the registry in `src/config/countries/index.ts`:

```typescript
import { greeceConfig } from './greece'
import { franceConfig } from './france'
import type { CountryConfig } from '../types'

export const countryConfigs: Record<string, CountryConfig> = {
  GR: greeceConfig,
  FR: franceConfig,  // Add new country
}

export function getCountryConfig(countryCode: string): CountryConfig | undefined {
  return countryConfigs[countryCode]
}

export function getAvailableCountries(): CountryConfig[] {
  return Object.values(countryConfigs)
}
```

## Step 5: Add Country-Specific Rules (Optional)

If the country has unique validation requirements:

1. Create a new rule file:

```typescript
// src/domain/rules/france.rules.ts

import type { ValidationRule } from './types'

export const franceSpecificRule: ValidationRule = (dossier) => {
  // Country-specific validation
  return []
}
```

2. Add to the runner conditionally:

```typescript
// src/domain/rules/runner.ts

import { franceSpecificRule } from './france.rules'

export function runValidation(dossier: Dossier): ValidationFinding[] {
  const rules = [...commonRules]

  if (dossier.application.destinationCountry === 'FR') {
    rules.push(franceSpecificRule)
  }

  return rules.flatMap(rule => rule(dossier)).sort(bySeverity)
}
```

## Step 6: Test Your Configuration

1. Add unit tests for any new validation rules
2. Test the document checklist displays correctly
3. Test conditional requirements work as expected
4. Verify the configuration loads without errors

## Best Practices

1. **Use official sources**: Base requirements on official embassy websites
2. **Include disclaimers**: Requirements can change; note the source date
3. **Be specific**: Include document specifications (size, format, etc.)
4. **Add notes**: Help users understand requirements
5. **Test thoroughly**: Ensure all conditions work correctly

## Common Schengen Requirements

For Schengen countries, you can extend the common configuration:

```typescript
import { commonSchengenRequirements } from './common-schengen'

const documentRequirements: DocumentRequirement[] = [
  ...commonSchengenRequirements,
  // Country-specific additions
  {
    code: 'FRANCE_SPECIFIC',
    name: 'France-Specific Document',
    // ...
  },
]
```
