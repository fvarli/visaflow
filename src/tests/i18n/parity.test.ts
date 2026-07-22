import { describe, it, expect } from 'vitest'
import { resources, SUPPORTED_LOCALES } from '@/i18n'

type Tree = Record<string, unknown>

function flatten(obj: Tree, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return value && typeof value === 'object' && !Array.isArray(value)
      ? flatten(value as Tree, path)
      : [path]
  })
}

/**
 * The compiler types `t()` against the English resources, so only Turkish can
 * silently drift. These tests are the coverage for that gap — and for the
 * dynamic keys that opt out of typing via `dynamicT`.
 */
describe('translation parity', () => {
  const namespaces = Object.keys(resources.en) as (keyof typeof resources.en)[]

  it('ships the same namespaces for every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(resources[locale]).sort()).toEqual(
        [...namespaces].sort()
      )
    }
  })

  it.each(namespaces)('has identical keys in tr and en for "%s"', (ns) => {
    const en = flatten(resources.en[ns]).sort()
    const tr = flatten(resources.tr[ns]).sort()

    const missingInTr = en.filter((k) => !tr.includes(k))
    const missingInEn = tr.filter((k) => !en.includes(k))

    expect(missingInTr, `missing in tr/${ns}`).toEqual([])
    expect(missingInEn, `missing in en/${ns}`).toEqual([])
  })

  it.each(SUPPORTED_LOCALES)('has no empty strings in "%s"', (locale) => {
    const empties: string[] = []
    for (const ns of namespaces) {
      const tree = resources[locale][ns] as Tree
      for (const path of flatten(tree)) {
        const value = path
          .split('.')
          .reduce<unknown>((acc, key) => (acc as Tree | undefined)?.[key], tree)
        if (typeof value === 'string' && value.trim() === '') {
          empties.push(`${ns}:${path}`)
        }
      }
    }
    expect(empties).toEqual([])
  })

  it('uses Turkish characters rather than ASCII substitutes', () => {
    // A cheap guard against "Basvuru" style transliteration creeping in.
    const suspicious = [
      'Basvuru sahibi',
      'Belge kontrol listesi ',
      'Guncellenmeli',
      'Teslim alindi',
    ]
    const all = JSON.stringify(resources.tr)
    for (const term of suspicious) {
      expect(all).not.toContain(term)
    }
    // And confirm the real diacritics are present.
    expect(all).toContain('Başvuru sahibi')
    expect(all).toContain('Güncellenmeli')
  })
})
