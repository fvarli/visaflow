import { describe, it, expect } from 'vitest'
import { importPartial } from '@/features/import-export/services/import.service'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import exampleJson from '@/data/examples/example-dossier.json'

/**
 * The production import path, which had no tests at all.
 *
 * Every user-facing import in the app goes through `importPartial` — the file
 * picker, Settings, onboarding, the example loader. It is deliberately
 * forgiving: it keeps whatever validates and drops the rest, which is the right
 * behaviour for a file the user can no longer edit. What was wrong is that it
 * reported that outcome as an unqualified success, and five of the six callers
 * repeated the claim without mentioning the loss (ADR-041).
 *
 * So these are about `omitted`: the count of things a person would recognise as
 * missing, in the units they would count them in.
 */

const example = () =>
  JSON.parse(JSON.stringify(exampleJson)) as Record<string, unknown>

describe('importPartial', () => {
  it('imports a clean file whole, and admits nothing was dropped', () => {
    const result = importPartial(JSON.stringify(example()))

    expect(result.success).toBe(true)
    expect(result.omitted).toBeUndefined()
    expect(result.errors).toBeUndefined()
    expect(result.data?.applicant).toBeDefined()
    expect(result.data?.application).toBeDefined()
  })

  it('keeps the readable documents and counts the one it left behind', () => {
    // The worked case: three documents, one of them unusable.
    const file = example()
    const documents = file.documents as unknown[]
    const kept = documents.slice(0, 3)
    ;(kept[1] as Record<string, unknown>).status = 'chewed-by-the-dog'
    file.documents = kept

    const result = importPartial(JSON.stringify(file))

    expect(result.success).toBe(true)
    expect(result.data?.documents).toHaveLength(2)
    // One *document*, not one per Zod issue: the count is the sentence the
    // user reads, so it has to be in their units.
    expect(result.omitted).toBe(1)
  })

  it('counts a whole collection that is not a list, which used to vanish', () => {
    const file = example()
    file.documents = 'four passports and a bank statement'

    const result = importPartial(JSON.stringify(file))

    // The applicant and the trip still come back — the file is not a write-off.
    expect(result.success).toBe(true)
    expect(result.data?.applicant).toBeDefined()
    // …but the documents are gone, and saying so is the whole point. Before
    // this, the branch produced no error, no count and no message at all.
    expect(result.omitted).toBe(1)
    expect(result.errors?.some((e) => e.path === 'documents')).toBe(true)
  })

  it('counts a malformed applicant while keeping the rest of the dossier', () => {
    const file = example()
    file.applicant = { firstName: 42 }

    const result = importPartial(JSON.stringify(file))

    expect(result.success).toBe(true)
    expect(result.data?.applicant).toBeUndefined()
    expect(result.data?.application).toBeDefined()
    expect(result.omitted).toBe(1)
  })

  it('fails outright when nothing at all survived', () => {
    const result = importPartial(
      JSON.stringify({ applicant: 1, application: 2 })
    )

    expect(result.success).toBe(false)
    expect(result.data).toBeUndefined()
    expect(result.omitted).toBe(2)
  })

  it('fails on something that is not JSON, without pretending otherwise', () => {
    const result = importPartial('{ not json')

    expect(result.success).toBe(false)
    expect(result.errors?.[0]?.path).toBe('root')
  })

  it('treats a different schema version as a note, never as a refusal', () => {
    const file = example()
    file.schemaVersion = '0.9.0'

    const result = importPartial(JSON.stringify(file))

    // A dossier the user exported from an older build still opens. Refusing it
    // would strand exactly the person the export format exists for.
    expect(result.success).toBe(true)
    expect(result.data?.schemaVersion).toBe('0.9.0')
    expect(result.warnings).toHaveLength(1)
    expect(result.omitted).toBeUndefined()
  })

  it('says nothing about the version when the file matches this build', () => {
    const file = example()
    file.schemaVersion = SCHEMA_VERSION

    expect(importPartial(JSON.stringify(file)).warnings).toBeUndefined()
  })
})
