import { describe, it, expect } from 'vitest'
import {
  DossierSchema,
  SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
  isSupportedSchemaVersion,
} from '@/domain/schemas/dossier.schema'
import { ApplicantSchema } from '@/domain/schemas/applicant.schema'
import {
  importPartial,
  importDossier,
} from '@/features/import-export/services/import.service'
import { exportDossier } from '@/features/import-export/services/export.service'
import { STORAGE_FORMAT_VERSION } from '@/features/workspace/saved-dossier'
import legacyDossier from '@/tests/fixtures/dossier-schema-1.0.0.json'

/**
 * The dossier format's compatibility contract (ADR-043).
 *
 * Dossier schema 1.1.0 adds `applicant.previousRefusals`; 1.2.0 adds
 * `document.satisfiedRevision`. Nothing changed meaning and nothing was
 * removed, so a 1.0.0 document is already a valid 1.2.0 document — but "the
 * parser accepts it" is not the same promise as "no meaning is lost", and these
 * tests are about the second one.
 *
 * Each bump follows the same rule, which is about meaning rather than parsing:
 * an older build strips the unknown key silently, so someone who imports the
 * newer file there and re-exports loses the field with nothing said. The
 * version is what lets that build warn first.
 */

/**
 * A genuine 1.0.0 export — the example dossier exactly as application v1.1.0
 * shipped it, taken from that release and frozen here. Deliberately a real
 * artifact rather than the current example with fields removed: a hand-trimmed
 * fixture only proves the trimming was right.
 */
const V1_0 = JSON.parse(JSON.stringify(legacyDossier)) as Record<
  string,
  unknown
>

describe('the version contract', () => {
  it('writes 1.2.0 and reads every version it claims to', () => {
    expect(SCHEMA_VERSION).toBe('1.2.0')
    expect(SUPPORTED_SCHEMA_VERSIONS).toContain('1.0.0')
    expect(SUPPORTED_SCHEMA_VERSIONS).toContain('1.1.0')
    expect(SUPPORTED_SCHEMA_VERSIONS).toContain(SCHEMA_VERSION)
    expect(isSupportedSchemaVersion('0.9.0')).toBe(false)
  })

  it('never drops a version it once wrote', () => {
    // Every version this project has shipped stays readable. Removing one
    // would turn a file already on somebody's disk into an unopenable file.
    for (const version of ['1.0.0', '1.1.0', '1.2.0']) {
      expect(isSupportedSchemaVersion(version)).toBe(true)
    }
  })

  it('is independent of the workspace storage format', () => {
    // Different axes. The dossier gained a field; the IndexedDB record that
    // wraps it did not change shape, so this must not move (ADR-036/043).
    expect(STORAGE_FORMAT_VERSION).toBe(2)
  })
})

describe('reading a 1.0.0 dossier', () => {
  it('imports without a version warning, because this build reads 1.0.0', () => {
    const result = importPartial(JSON.stringify(V1_0))
    expect(result.success).toBe(true)
    expect(result.omitted).toBeUndefined()
    // The bump must not turn every existing export into a false alarm.
    expect(result.warnings).toBeUndefined()
  })

  it('keeps every field it recorded, and adds only an empty refusal list', () => {
    const parsed = DossierSchema.parse(V1_0)
    const original = V1_0.applicant as Record<string, unknown>

    // Field-by-field: nothing the user wrote may change on the way in.
    for (const [key, value] of Object.entries(original)) {
      expect({
        [key]: parsed.applicant[key as keyof typeof parsed.applicant],
      }).toEqual({ [key]: value })
    }
    expect(parsed.applicant.previousRefusals).toEqual([])
    expect('previousRefusals' in original).toBe(false)
  })

  it('survives a full round-trip through this build unchanged', () => {
    const imported = importPartial(JSON.stringify(V1_0))
    const data = imported.data
    if (!data) throw new Error('expected the example to import')

    const exported = exportDossier(
      data.applicant ?? null,
      data.application ?? null,
      data.documents ?? [],
      data.sponsors ?? []
    )
    const reimported = importPartial(exported)

    expect(reimported.success).toBe(true)
    expect(reimported.omitted).toBeUndefined()
    // The payload the second import produces is the payload the first did.
    expect({
      applicant: reimported.data?.applicant,
      application: reimported.data?.application,
      documents: reimported.data?.documents,
      sponsors: reimported.data?.sponsors,
    }).toEqual({
      applicant: data.applicant,
      application: data.application,
      documents: data.documents,
      sponsors: data.sponsors,
    })
  })

  it('still accepts a 1.0.0 file through the strict schema', () => {
    // `importDossier` is not on a production path, but the contract it encodes
    // should not quietly stop being true.
    expect(importDossier(JSON.stringify(V1_0)).success).toBe(true)
  })
})

describe('a 1.1.0 dossier carrying refusals', () => {
  const withRefusals = () => {
    const file = JSON.parse(JSON.stringify(V1_0)) as typeof V1_0
    file.schemaVersion = '1.1.0'
    ;(file.applicant as Record<string, unknown>).previousRefusals = [
      { country: 'FR', refusedOn: '2024-03-12', visaType: 'Schengen Type C' },
    ]
    return file
  }

  it('round-trips the refusal losslessly', () => {
    const imported = importPartial(JSON.stringify(withRefusals()))
    expect(imported.success).toBe(true)
    expect(imported.data?.applicant?.previousRefusals).toEqual([
      { country: 'FR', refusedOn: '2024-03-12', visaType: 'Schengen Type C' },
    ])

    const exported = JSON.parse(
      exportDossier(
        imported.data?.applicant ?? null,
        imported.data?.application ?? null,
        imported.data?.documents ?? [],
        imported.data?.sponsors ?? []
      )
    ) as { schemaVersion: string; applicant: { previousRefusals: unknown } }
    // Re-exported at the current version — the refusals survive the bump
    // untouched, which is the whole claim.
    expect(exported.schemaVersion).toBe(SCHEMA_VERSION)
    expect(exported.applicant.previousRefusals).toEqual([
      { country: 'FR', refusedOn: '2024-03-12', visaType: 'Schengen Type C' },
    ])
  })

  it('accepts a refusal with no date, because an applicant may not recall one', () => {
    const file = JSON.parse(JSON.stringify(V1_0)) as typeof V1_0
    ;(file.applicant as Record<string, unknown>).previousRefusals = [
      { country: 'DE' },
    ]
    const parsed = ApplicantSchema.safeParse(file.applicant)
    expect(parsed.success).toBe(true)
  })
})

describe('reading a 1.1.0 dossier under the 1.2.0 build', () => {
  const v1_1 = () => {
    const file = JSON.parse(JSON.stringify(V1_0)) as typeof V1_0
    file.schemaVersion = '1.1.0'
    return file
  }

  it('imports with no warning — 1.1.0 is still a version this build reads', () => {
    const result = importPartial(JSON.stringify(v1_1()))
    expect(result.success).toBe(true)
    expect(result.warnings).toBeUndefined()
    expect(result.omitted).toBeUndefined()
  })

  it('needs no migration — its claims are simply unrecorded', () => {
    // A 1.1.0 file is a 1.2.0 file whose documents make no statement about
    // which requirement definition they satisfied. Absence of the field is not
    // a defect to repair, and inventing a value for it would be a claim the
    // user never made (ADR-051).
    const result = importPartial(JSON.stringify(v1_1()))
    const documents = result.data?.documents ?? []
    expect(documents.length).toBeGreaterThan(0)
    expect(documents.every((d) => d.satisfiedRevision === undefined)).toBe(true)
  })

  it('carries a stamped document through export and back unchanged', () => {
    const file = v1_1()
    const documents = file.documents as Record<string, unknown>[]
    documents[0]!.satisfiedRevision = 2

    const imported = importPartial(JSON.stringify(file))
    expect(imported.data?.documents?.[0]?.satisfiedRevision).toBe(2)

    const round = importPartial(
      exportDossier(
        imported.data?.applicant ?? null,
        imported.data?.application ?? null,
        imported.data?.documents ?? [],
        imported.data?.sponsors ?? []
      )
    )
    expect(round.data?.documents).toEqual(imported.data?.documents)
  })

  it('rejects a stamp that is not a revision number', () => {
    // The field is an integer above zero or it is absent. A malformed value
    // must not be coerced into a claim.
    for (const bad of [0, -1, 1.5, '2', null]) {
      const file = v1_1()
      ;(file.documents as Record<string, unknown>[])[0]!.satisfiedRevision = bad
      const result = importPartial(JSON.stringify(file))
      expect({ bad, kept: result.data?.documents?.length ?? 0 }).toEqual({
        bad,
        kept: (file.documents as unknown[]).length - 1,
      })
    }
  })
})

describe('why the refusal is a separate list and not a visa status', () => {
  it('an unknown enum value would cost the applicant their whole record', () => {
    // The load-bearing reason for the shape (ADR-043). `previousVisas` is
    // nested inside the applicant, and `importPartial` parses the applicant as
    // one unit — so a status an older build does not know is not "ignored", it
    // takes the name, passport and travel history down with it.
    const file = JSON.parse(JSON.stringify(V1_0)) as typeof V1_0
    const applicant = file.applicant as Record<string, unknown>
    ;(applicant.previousVisas as Record<string, unknown>[])[0]!.status =
      'refused'

    const result = importPartial(JSON.stringify(file))
    expect(result.data?.applicant).toBeUndefined()
    expect(result.omitted).toBe(1)
  })

  it('an unknown key, by contrast, is merely dropped', () => {
    const file = JSON.parse(JSON.stringify(V1_0)) as typeof V1_0
    ;(file.applicant as Record<string, unknown>).somethingFromTheFuture = true

    const result = importPartial(JSON.stringify(file))
    expect(result.data?.applicant).toBeDefined()
    expect(result.omitted).toBeUndefined()
  })
})

describe('the format only moves when meaning moves (ADR-044)', () => {
  it('leaves the storage envelope alone across dossier-format bumps', () => {
    // Deeper Trip/Finance/Sponsor added editors and read surfaces over fields
    // that already existed, and did not bump anything. `satisfiedRevision`
    // added a field to the dossier, so 1.2.0 was earned — but the IndexedDB
    // record wrapping the dossier still did not change shape, and this axis
    // must stay still (ADR-036/043).
    expect(STORAGE_FORMAT_VERSION).toBe(2)
  })

  it('exports a document with the same shape as before the sprint', () => {
    const imported = importPartial(JSON.stringify(V1_0))
    const data = imported.data
    if (!data) throw new Error('expected the legacy fixture to import')

    const exported = JSON.parse(
      exportDossier(
        data.applicant ?? null,
        data.application ?? null,
        data.documents ?? [],
        data.sponsors ?? []
      )
    ) as Record<string, unknown>

    // The exact top-level key set the format has always had.
    expect(Object.keys(exported).sort()).toEqual(
      [
        'applicant',
        'application',
        'documents',
        'exportedAt',
        'schemaVersion',
        'sponsors',
      ].sort()
    )
    // And no new key appeared inside the trip or the financing.
    const application = exported.application as Record<string, unknown>
    const trip = application.trip as Record<string, unknown> | undefined
    if (trip) {
      expect(Object.keys(trip)).not.toContain('legs')
      expect(Object.keys(trip)).not.toContain('journey')
      expect(Object.keys(trip)).not.toContain('itinerary')
    }
  })
})
