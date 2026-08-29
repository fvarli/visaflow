import type { RequirementSource } from '../types'

/**
 * Source records for the Greece template.
 *
 * HONESTY RULES (see ADR-015):
 *  - VisaFlow never scrapes or calls official sites. Every record here is
 *    entered by hand from something a maintainer actually looked at.
 *  - `lastVerifiedAt` is set ONLY when a maintainer has confirmed the
 *    requirement list against that source on that date. It is absent below
 *    because no such verification has been recorded in this repository.
 *  - An absent source or absent verification date is meaningful information,
 *    not a gap to be filled with a plausible-looking value.
 *
 * JURISDICTION. `jurisdiction` here means *the applicant jurisdiction the
 * source governs*, not the authority's own country. Both Türkiye records below
 * are published by the Hellenic Republic but govern applications lodged in
 * Türkiye, so they carry `TR`. The provenance invariants use exactly that to
 * tell a jurisdiction-scoped source from an EU-wide one (ADR-048).
 */
export const greeceSources: RequirementSource[] = [
  {
    id: 'gr-mfa-general',
    authority: 'Hellenic Republic — Ministry of Foreign Affairs',
    titleKey: 'visa-domain:sources.gr-mfa-general.title',
    url: 'https://www.mfa.gr/en/',
    sourceType: 'government',
    jurisdiction: 'GR',
    language: 'en',
    // Deliberately no lastVerifiedAt: this is a general ministry entry point
    // carried over from the previous configuration, not a verified
    // document-list publication.
    notesKey: 'visa-domain:sources.gr-mfa-general.notes',
  },
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
