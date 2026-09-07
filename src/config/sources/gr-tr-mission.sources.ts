import type { RequirementSource } from '../types'

/**
 * The Greek mission's own renderings of the Türkiye harmonised list.
 *
 * Both are published by the Hellenic Republic and govern applications lodged in
 * Türkiye, which is exactly why they are easy to misfile: the authority is
 * Greek, the scope is Turkish, and neither fact alone decides where they
 * belong. They are **destination-specific**, because they are one member
 * state's rendering of an instrument the Commission adopted for the whole
 * jurisdiction — so they attach to Greece's composition through refinement and
 * reach no other destination.
 *
 * Article 14(3) keeps Annex II non-exhaustive and leaves missions free to ask
 * for more, so a mission page is genuine evidence about what an applicant
 * actually faces. It is simply not evidence about what *every* mission asks.
 */
export const grTrMissionSources: RequirementSource[] = [
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
    lastVerifiedAt: '2026-09-07',
    retrievedAt: '2026-09-07',
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
    lastVerifiedAt: '2026-09-07',
    retrievedAt: '2026-09-07',
    notesKey: 'visa-domain:sources.gr-mfa-tr-visa-page.notes',
  },
]
