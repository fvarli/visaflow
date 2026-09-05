import type { RequirementSource } from '../types'

/**
 * Sources governing applications lodged in Türkiye.
 *
 * These sit apart from `greece.sources.ts` because they are not Greece's — they
 * are the filing jurisdiction's. Both are published *by* the Hellenic Republic,
 * which is exactly why the distinction is easy to lose: the authority is Greek,
 * the scope is Turkish. `jurisdiction` here means the applicant jurisdiction a
 * source governs, not the authority's own country (ADR-048).
 *
 * Keeping them in the destination file would have left the ownership lie in
 * place one level down: a second destination composing this overlay would take
 * these citations, and a second *jurisdiction* would have to unpick them from a
 * file named for Greece.
 *
 * HONESTY RULES (ADR-015) apply unchanged. VisaFlow never scrapes; every record
 * is entered by hand from something a maintainer actually read, and an absent
 * `lastVerifiedAt` is information rather than a gap to fill.
 */
export const trFilingSources: RequirementSource[] = [
  {
    /**
     * The harmonised list adopted under local Schengen cooperation for Türkiye
     * — the Annex III document the consular page links as "required supporting
     * documents". This is the strongest evidence in the pack: it names actual
     * Turkish document types and the periods they must cover.
     */
    id: 'gr-tr-harmonised-list',
    authority: 'Hellenic Republic — Ministry of Foreign Affairs',
    titleKey: 'visa-domain:sources.gr-tr-harmonised-list.title',
    url: 'https://www.mfa.gr/missionsabroad/images/visas/missions/Turkey/Harmonized_list_en.pdf',
    sourceType: 'government',
    jurisdiction: 'TR',
    language: 'en',
    lastVerifiedAt: '2026-08-29',
    retrievedAt: '2026-08-29',
    notesKey: 'visa-domain:sources.gr-tr-harmonised-list.notes',
  },
  {
    /**
     * The Ankara mission's own visa page. It restates the passport and
     * insurance criteria in the consulate's words, which is why those two
     * requirements now carry both the Regulation and this page: the EU rule is
     * the norm, this is the implementation the applicant actually meets.
     */
    id: 'gr-mfa-tr-visa-page',
    authority:
      'Hellenic Republic — Ministry of Foreign Affairs, Embassy in Ankara',
    titleKey: 'visa-domain:sources.gr-mfa-tr-visa-page.title',
    url: 'https://www.mfa.gr/turkey/visas.html?lang=extra1&mission=ank',
    sourceType: 'embassy',
    jurisdiction: 'TR',
    language: 'en',
    lastVerifiedAt: '2026-08-29',
    retrievedAt: '2026-08-29',
    notesKey: 'visa-domain:sources.gr-mfa-tr-visa-page.notes',
  },
]
