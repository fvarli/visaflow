import type { RequirementSource } from '../types'

/**
 * What the German missions in Türkiye publish for applications lodged there.
 *
 * Both pages are Germany's — the Federal Foreign Office's site for its missions
 * in Türkiye — and both govern applications made in Türkiye. That combination
 * is the one the publisher/jurisdiction distinction exists for: `jurisdiction`
 * is `TR` for these exactly as it is for the Commission's harmonised list and
 * for the Greek mission's rendering of it, and the field that separates them is
 * who published them, which is stated in the tests rather than derived.
 *
 * They are **destination-specific**: evidence about what an applicant for
 * Germany faces in Türkiye, and evidence about nothing else. The proof that
 * they are not Germany-wide is direct rather than assumed — the German mission
 * in India publishes its own tourism checklist, and it requires neither the
 * ten-year visa copies nor the § 54 declaration.
 */
export const deTrMissionSources: RequirementSource[] = [
  {
    /**
     * "Turistik Amaçlı Vize" — the tourism checklist itself, listing the
     * documents every applicant brings and then the extra documents by
     * applicant category (employees, farmers, business owners, students,
     * minors, non-Turkish citizens).
     *
     * This is the pack's primary evidence for Germany. Everything the German
     * layers assert traces to a numbered item on this page, and every item on
     * it that VisaFlow has a code for is cited against that code.
     */
    id: 'de-tr-tourism-checklist',
    authority: 'Auswärtiges Amt — German missions in Türkiye',
    titleKey: 'visa-domain:sources.de-tr-tourism-checklist.title',
    url: 'https://tuerkei.diplo.de/tr-tr/service/05-visaeinreise/2768822-2768822',
    sourceType: 'embassy',
    jurisdiction: 'TR',
    language: 'tr',
    lastVerifiedAt: '2026-09-07',
    retrievedAt: '2026-09-07',
    notesKey: 'visa-domain:sources.de-tr-tourism-checklist.notes',
  },
  {
    /**
     * The general Schengen page the checklist links for the passport, the
     * photograph and the insurance. It restates the Visa Code criteria in the
     * mission's own words and adds the mission's own photograph instructions,
     * which is why the three requirements it covers carry both the Regulation
     * and this page: the article is the norm, this is the implementation the
     * applicant actually meets at the counter.
     */
    id: 'de-tr-schengen-general',
    authority: 'Auswärtiges Amt — German missions in Türkiye',
    titleKey: 'visa-domain:sources.de-tr-schengen-general.title',
    url: 'https://tuerkei.diplo.de/tr-tr/service/05-visaeinreise/2768812-2768812',
    sourceType: 'embassy',
    jurisdiction: 'TR',
    language: 'tr',
    lastVerifiedAt: '2026-09-07',
    retrievedAt: '2026-09-07',
    notesKey: 'visa-domain:sources.de-tr-schengen-general.notes',
  },
]
