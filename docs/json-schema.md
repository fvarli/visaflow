# JSON Schema Documentation

This document describes the JSON format used by VisaFlow for importing and exporting dossier data.

## Schema Version

Current version: `1.0.0`

The schema version is included in every exported file to enable future migrations.

## Root Structure

```json
{
  "schemaVersion": "1.0.0",
  "exportedAt": "2025-01-15T10:30:00.000Z",
  "applicant": { ... },
  "application": { ... },
  "documents": [ ... ],
  "sponsors": [ ... ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| schemaVersion | string | Yes | Schema version for migrations |
| exportedAt | string (ISO 8601) | Yes | Export timestamp |
| applicant | Applicant | Yes | Applicant information |
| application | Application | Yes | Visa application details |
| documents | Document[] | Yes | Array of documents |
| sponsors | Sponsor[] | Yes | Array of sponsors |

## Applicant Schema

```json
{
  "id": "applicant-001",
  "firstName": "Maria",
  "lastName": "Kowalski",
  "dateOfBirth": "1990-05-15",
  "nationality": "PL",
  "email": "maria@example.com",
  "phone": "+48123456789",
  "address": "ul. Example 123, Warsaw, Poland",
  "maritalStatus": "single",
  "occupation": "Software Engineer",
  "passport": { ... },
  "previousPassports": [ ... ],
  "previousVisas": [ ... ],
  "travelHistory": [ ... ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier |
| firstName | string | Yes | Given name |
| lastName | string | Yes | Family name |
| dateOfBirth | string (YYYY-MM-DD) | Yes | Date of birth |
| nationality | string | Yes | ISO country code |
| email | string | No | Email address |
| phone | string | No | Phone number |
| address | string | No | Full address |
| maritalStatus | string | No | single/married/divorced/widowed |
| occupation | string | No | Job title |
| passport | Passport | Yes | Current passport |
| previousPassports | Passport[] | No | Previous passports |
| previousVisas | Visa[] | No | Previous visa history |
| travelHistory | TravelEntry[] | No | Travel history |

## Passport Schema

```json
{
  "number": "AB1234567",
  "issueDate": "2020-01-15",
  "expiryDate": "2030-01-14",
  "issuingCountry": "PL",
  "passportType": "ordinary"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| number | string | Yes | Passport number |
| issueDate | string (YYYY-MM-DD) | Yes | Issue date |
| expiryDate | string (YYYY-MM-DD) | Yes | Expiry date |
| issuingCountry | string | Yes | ISO country code |
| passportType | string | Yes | ordinary/diplomatic/service/official |

## Application Schema

```json
{
  "applicationId": "app-001",
  "applicantId": "applicant-001",
  "destinationCountry": "GR",
  "visaType": "short_stay_tourism",
  "status": "in_progress",
  "createdAt": "2025-01-10T09:00:00.000Z",
  "appointment": { ... },
  "trip": { ... },
  "financing": { ... },
  "sponsorIds": [],
  "documentIds": [],
  "notes": [ ... ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| applicationId | string | Yes | Unique identifier |
| applicantId | string | Yes | Reference to applicant |
| destinationCountry | string | Yes | ISO country code |
| visaType | string | Yes | Type of visa |
| status | string | Yes | draft/in_progress/submitted/approved/rejected |
| createdAt | string (ISO 8601) | Yes | Creation timestamp |
| appointment | Appointment | No | Visa appointment details |
| trip | Trip | No | Trip information |
| financing | Financing | No | Financial information |
| sponsorIds | string[] | Yes | References to sponsors |
| documentIds | string[] | Yes | References to documents |
| notes | Note[] | Yes | Application notes |

## Appointment Schema

```json
{
  "date": "2025-05-15",
  "time": "10:00",
  "location": "Greek Embassy",
  "confirmationNumber": "CONF123456"
}
```

## Trip Schema

```json
{
  "entryDate": "2025-06-01",
  "exitDate": "2025-06-14",
  "firstEntryCountry": "GR",
  "mainDestinationCountry": "GR",
  "entryCity": "Athens",
  "exitCity": "Athens",
  "purpose": "Tourism and sightseeing",
  "route": [ ... ],
  "transportReservations": [ ... ],
  "accommodationReservations": [ ... ],
  "insurance": { ... },
  "estimatedBudget": 2000,
  "budgetCurrency": "EUR"
}
```

### Route Stop

```json
{
  "city": "Athens",
  "country": "GR",
  "arrivalDate": "2025-06-01",
  "departureDate": "2025-06-08",
  "nights": 7
}
```

### Transport Reservation

```json
{
  "type": "flight",
  "departureDate": "2025-06-01",
  "departureCity": "Warsaw",
  "arrivalCity": "Athens",
  "carrier": "Aegean Airlines",
  "bookingReference": "ABC123",
  "status": "confirmed"
}
```

### Accommodation Reservation

```json
{
  "name": "Athens Grand Hotel",
  "type": "hotel",
  "city": "Athens",
  "address": "Syntagma Square, Athens",
  "checkInDate": "2025-06-01",
  "checkOutDate": "2025-06-08",
  "bookingReference": "HTL456",
  "status": "confirmed"
}
```

### Insurance

```json
{
  "provider": "Allianz",
  "policyNumber": "INS789",
  "coverageStartDate": "2025-06-01",
  "coverageEndDate": "2025-06-14",
  "coverageAmount": 30000,
  "coverageCurrency": "EUR"
}
```

## Document Schema

```json
{
  "id": "doc-001",
  "code": "PASSPORT_CURRENT",
  "name": "Current Passport",
  "category": "passport",
  "ownerType": "applicant",
  "ownerId": "applicant-001",
  "required": true,
  "status": "ready",
  "requestedAt": "2025-01-10",
  "receivedAt": "2025-01-10",
  "issuedAt": "2020-01-15",
  "validUntil": "2030-01-14",
  "fileReference": "passport_scan.pdf",
  "notes": "Original passport",
  "verified": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier |
| code | string | Yes | Document type code |
| name | string | Yes | Display name |
| category | string | Yes | Document category |
| ownerType | string | Yes | applicant/sponsor |
| ownerId | string | Yes | Reference to owner |
| required | boolean | Yes | Is document required |
| status | string | Yes | Document status |
| requestedAt | string | No | Date requested |
| receivedAt | string | No | Date received |
| issuedAt | string | No | Document issue date |
| validUntil | string | No | Document expiry date |
| fileReference | string | No | Local file reference |
| notes | string | No | Additional notes |
| verified | boolean | Yes | Has been verified |

### Document Status Values

- `not_started` - Not yet requested
- `requested` - Requested but not received
- `received` - Received, needs review
- `needs_update` - Requires updates
- `ready` - Ready for submission
- `not_applicable` - Not applicable to this application

### Document Categories

- `passport`
- `identity`
- `travel`
- `accommodation`
- `financial`
- `employment`
- `insurance`
- `sponsor`
- `supporting`

## Sponsor Schema

```json
{
  "id": "sponsor-001",
  "relationship": "friend",
  "firstName": "Nikos",
  "lastName": "Papadopoulos",
  "email": "nikos@example.com",
  "phone": "+306912345678",
  "address": "Athens, Greece",
  "nationality": "GR",
  "residenceCountry": "GR",
  "employmentStatus": "employed",
  "employerName": "Tech Company SA",
  "monthlyIncome": 3000,
  "currency": "EUR",
  "liquidAssets": 25000,
  "coveredExpenses": ["accommodation", "food"],
  "documentIds": ["doc-sponsor-invite", "doc-sponsor-id"]
}
```

## Example Complete Dossier

See `src/data/examples/example-dossier.json` for a complete example.

## Validation

All imported JSON is validated against Zod schemas before being loaded. Invalid data will be rejected with detailed error messages indicating which fields failed validation.

## Migration Notes

### Version 1.0.0 (Current)
- Initial schema version
- All fields and structures as documented above

### Future Versions
- Schema migrations will be handled automatically
- Older exports will be upgraded to current version on import
- Breaking changes will increment the major version
