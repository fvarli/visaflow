import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import i18n, { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/i18n'
import { exportDossier } from '@/features/import-export/services/export.service'
import { importDossier } from '@/features/import-export/services/import.service'
import { resolveVisaTemplate } from '@/config/countries'
import { isRequirementApplicable } from '@/config/types'
import { DocumentSchema } from '@/domain/schemas/document.schema'
import type { Document } from '@/domain/schemas/document.schema'

/**
 * The central compatibility guarantee of this iteration: what you export must
 * not depend on the language you happened to be using.
 */

/** Mirrors how DocumentsPage instantiates documents from a template. */
function buildDocumentsFromTemplate(): Document[] {
  const template = resolveVisaTemplate('GR', 'short_stay_tourism')
  if (!template) throw new Error('Greece tourism template missing')

  const context = { employment: { employmentStatus: 'employed' } }

  return template.documentRequirements
    .filter((req) => isRequirementApplicable(req, context))
    .map((req) => ({
      id: 'fixed-id-for-comparison',
      code: req.code,
      category: req.category,
      ownerType: req.ownerType,
      ownerId: 'applicant-1',
      required: req.required,
      status: 'not_started' as const,
      verified: false,
    }))
}

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

afterEach(async () => {
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe('exported JSON is language-independent', () => {
  it('produces byte-identical documents in Turkish and English', async () => {
    await i18n.changeLanguage('tr')
    const inTurkish = buildDocumentsFromTemplate()

    await i18n.changeLanguage('en')
    const inEnglish = buildDocumentsFromTemplate()

    expect(JSON.stringify(inTurkish)).toBe(JSON.stringify(inEnglish))
  })

  it('never writes a display name into a template-derived document', () => {
    for (const doc of buildDocumentsFromTemplate()) {
      expect(doc.name).toBeUndefined()
      // `code` carries the identity instead.
      expect(doc.code).toMatch(/^[A-Z_]+$/)
    }
  })

  it('produces an identical export payload regardless of locale', async () => {
    const strip = (json: string) =>
      JSON.parse(json) as Record<string, unknown> & { exportedAt?: string }

    await i18n.changeLanguage('tr')
    const tr = strip(
      exportDossier(null, null, buildDocumentsFromTemplate(), [])
    )
    await i18n.changeLanguage('en')
    const en = strip(
      exportDossier(null, null, buildDocumentsFromTemplate(), [])
    )

    // exportedAt is a timestamp, not a translation — compare everything else.
    delete tr.exportedAt
    delete en.exportedAt

    expect(tr).toEqual(en)
    expect(tr.schemaVersion).toBe('1.0.0')
  })
})

describe('backward compatibility with existing exports', () => {
  it('still imports a legacy 1.0.0 document that carries a name', () => {
    const legacy = {
      id: 'doc-1',
      code: 'EMPLOYMENT_LETTER',
      name: 'Employment Letter',
      category: 'employment',
      ownerType: 'applicant',
      ownerId: 'applicant-1',
      required: true,
      status: 'ready',
      verified: true,
    }

    const parsed = DocumentSchema.safeParse(legacy)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.name).toBe('Employment Letter')
      expect(parsed.data.code).toBe('EMPLOYMENT_LETTER')
    }
  })

  it('accepts a new document that omits the deprecated name', () => {
    const modern = {
      id: 'doc-2',
      code: 'BANK_STATEMENTS',
      category: 'financial',
      ownerType: 'applicant',
      ownerId: 'applicant-1',
      required: true,
      status: 'not_started',
      verified: false,
    }

    const parsed = DocumentSchema.safeParse(modern)
    expect(parsed.success).toBe(true)
  })

  it('round-trips a full legacy dossier through the import service', () => {
    const legacyDossier = JSON.stringify({
      schemaVersion: '1.0.0',
      exportedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      applicant: {
        id: 'a1',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        nationality: 'TR',
        countryOfResidence: 'TR',
        passport: {
          number: 'X0000000',
          issueDate: '2020-01-01',
          expiryDate: '2030-01-01',
          issuingCountry: 'TR',
          passportType: 'ordinary',
        },
        previousPassports: [],
        previousVisas: [],
        travelHistory: [],
      },
      application: {
        applicationId: 'app-1',
        applicantId: 'a1',
        destinationCountry: 'GR',
        visaType: 'short_stay_tourism',
        status: 'draft',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        notes: [],
      },
      documents: [
        {
          id: 'doc-1',
          code: 'PASSPORT_CURRENT',
          name: 'Current Passport',
          category: 'passport',
          ownerType: 'applicant',
          ownerId: 'a1',
          required: true,
          status: 'ready',
          verified: true,
        },
      ],
      sponsors: [],
    })

    const result = importDossier(legacyDossier)
    expect(result.success, JSON.stringify(result.errors)).toBe(true)
    expect(result.data?.documents[0]?.code).toBe('PASSPORT_CURRENT')
  })
})
