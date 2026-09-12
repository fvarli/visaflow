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
  {
    /**
     * The checklist an applicant filing for Greece in Türkiye actually works
     * from — and the first source in this pack the mission does not publish.
     *
     * THE RELATIONSHIP MATTERS AND IS EASY TO OVERSTATE. The Ankara mission
     * states it has "outsourced the collection of all Schengen visa
     * applications and biometric data to Kosmos Vize" and names that site for
     * further information; the site's footer links back to `mfa.gr/turkey`.
     * That makes this **mission-directed**, not mission-published: the operator
     * is a contractor, the text is its own, and describing it as the Hellenic
     * Republic's publication would claim an authority nobody has asserted.
     *
     * IT IS A GENERATOR, NOT A PAGE. The list is produced from a residence
     * province, a consular branch and six applicant axes, so there is no stable
     * per-combination URL to cite. The homepage is the entry point the mission
     * names and the one from which the checklist is reached by following the
     * site's own navigation; the combinations actually read, and what each
     * licenses, are recorded in ADR-047's third and fourth evidence passes.
     *
     * WHAT IT MAY BE ATTACHED TO. Only a requirement whose *rendered contract*
     * this checklist supports — the document and the population it is asked of
     * — because a citation vouches for the condition as well as the prose
     * (ADR-048). Sharing a block with a document is not evidence about that
     * document's own contract, which is why two rows in that same block still
     * carry no reference to this source.
     */
    id: 'gr-tr-visa-centre-checklist',
    authority:
      'Kosmos Vize — authorized visa centre for the Hellenic Republic in Türkiye',
    titleKey: 'visa-domain:sources.gr-tr-visa-centre-checklist.title',
    url: 'https://www.kosmosvize.com.tr/',
    sourceType: 'authorized_visa_center',
    jurisdiction: 'TR',
    language: 'tr',
    lastVerifiedAt: '2026-09-12',
    retrievedAt: '2026-09-12',
    notesKey: 'visa-domain:sources.gr-tr-visa-centre-checklist.notes',
  },
]
