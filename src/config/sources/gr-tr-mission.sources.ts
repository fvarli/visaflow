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
     * The visa centre's own required-documents checklist — the operative list
     * an applicant filing in Türkiye actually meets, and the one the Ankara
     * page directs them to.
     *
     * IT IS A GENERATOR, NOT A DOCUMENT, WHICH IS WHY THE URL LOOKS THIN. The
     * page asks six questions — visa category, means of travel, accommodation,
     * **occupation**, travelling with children, nationality — and composes a
     * list from the answers. There is no stable per-combination URL, so this
     * cites the generator and the requirements citing it record which branch
     * they came from. Everything cited here was read on the tourism · air ·
     * hotel · no-children · Turkish-national path with only the occupation
     * axis varied, so the branches are directly comparable.
     *
     * WHY IT IS CITABLE AT ALL, HAVING BEEN READ IN H4a AND CITED BY NOTHING.
     * H4b left all five candidates uncited, and none of those reasons was
     * "the centre is not an authority" — each was specific, and the recurring
     * one was that the pack's condition did not match the branch the checklist
     * raises the document from. A citation vouches for the condition too
     * (ADR-048), so a row that fires on the wrong population cannot cite a
     * source that asks it of a different one. The occupational vocabulary is
     * what closes that gap for these rows: they fire on exactly the branch
     * they were read from. The five older gaps are unaffected and stay
     * recorded.
     *
     * `authorized_visa_center` is its own source type, below a mission's own
     * publication in the evidence hierarchy and above nothing. It is the
     * contractor the Hellenic Republic appointed, not the Hellenic Republic.
     */
    id: 'gr-kosmos-checklist',
    authority: 'Kosmos Vize Hizmetleri',
    titleKey: 'visa-domain:sources.gr-kosmos-checklist.title',
    url: 'https://www.kosmosvize.com.tr/tr-tr/gerekli-belgeler',
    sourceType: 'authorized_visa_center',
    jurisdiction: 'TR',
    language: 'tr',
    lastVerifiedAt: '2026-09-09',
    retrievedAt: '2026-09-09',
    notesKey: 'visa-domain:sources.gr-kosmos-checklist.notes',
  },
]
