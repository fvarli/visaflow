import type { RequirementSource } from '../types'

/**
 * The jurisdiction-level instrument for applications lodged in Türkiye.
 *
 * One record, and the authority is the **European Commission** — not any
 * member state. Article 14(5a) of the Visa Code has the Commission adopt, by
 * implementing act, a harmonised list of supporting documents for each
 * jurisdiction; this is that act for Türkiye.
 *
 * WHY THIS FILE CHANGED SHAPE. It previously held the Greek mission's two
 * publications, on the reasoning that a Türkiye-scoped source belongs to the
 * Türkiye layer. That was half right. The *jurisdiction* authority is the
 * Commission act; a mission's rendering of it is **destination**-specific, and
 * leaving Greek publications here would have made a second destination pack
 * cite the Hellenic Republic as its authority for SGK documents — ADR-048's
 * defect one layer up. The Greek renderings now live in
 * `gr-tr-mission.sources.ts`.
 *
 * The Commission act is also the stronger citation. The Greek mission page
 * records an HTTP 403 and a proxied read; this instrument was retrieved and
 * read directly.
 *
 * HONESTY RULES (ADR-015) unchanged: entered by hand from a document a
 * maintainer actually read, and `url` points at where it was genuinely
 * obtained.
 */
export const trFilingSources: RequirementSource[] = [
  {
    /**
     * Commission Implementing Decision C(2021) 5156 final of 29.7.2021 — the
     * ANNEX amending Annex III to Implementing Decision C(2011) 7192, "List of
     * supporting documents to be submitted by applicants for short stay visas
     * in Turkey".
     *
     * The `url` is the Czech Ministry of Foreign Affairs' publication of it,
     * because that is where this copy was actually retrieved and read, and it
     * resolves. A member state publishing the same act a Greek mission renders
     * is itself the evidence that the instrument is destination-neutral. The
     * act's own reference is carried in the title so a maintainer can find it
     * on any other official channel.
     */
    id: 'eu-c2021-5156-turkey-annex3',
    authority: 'European Commission',
    titleKey: 'visa-domain:sources.eu-c2021-5156-turkey-annex3.title',
    url: 'https://mzv.gov.cz/public/e3/a2/fb/4835381_2943202_Turecko_EN.PDF',
    sourceType: 'regulation',
    /**
     * The jurisdiction the list governs — where the application is lodged —
     * not the authority's own territory. The Commission is supra-national; the
     * list is for Türkiye.
     */
    jurisdiction: 'TR',
    language: 'en',
    lastVerifiedAt: '2026-09-06',
    retrievedAt: '2026-09-06',
    notesKey: 'visa-domain:sources.eu-c2021-5156-turkey-annex3.notes',
  },
]
