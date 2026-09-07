import type { RequirementSource } from '../types'

/**
 * Germany's own law, as distinct from what any German mission asks for.
 *
 * One record. It is the destination's statute — published by the federal
 * ministry, in force for every German visa procedure wherever it is lodged —
 * which is why it sits in the destination layer while the checklists that name
 * a document to bring sit with the mission that publishes them.
 *
 * The distinction is load-bearing for `DE_S54_DECLARATION`, the one requirement
 * citing both: **the mission's checklist is the authority that an applicant
 * must submit the declaration here; the statute is the legal basis the
 * declaration refers to.** Neither substitutes for the other, and the statute
 * alone would not establish that any document must be handed over — § 54 says
 * what constitutes an interest in expulsion, not what belongs in an envelope.
 */
export const germanySources: RequirementSource[] = [
  {
    /**
     * § 54 AufenthG — "Ausweisungsinteresse". Cited for subsection (2) no. 8,
     * which makes false or incomplete statements in a Schengen visa procedure a
     * serious interest in expulsion, and whose point (b) requires that the
     * person "zuvor auf die Rechtsfolgen solcher Handlungen hingewiesen wurde"
     * — was informed of those consequences beforehand.
     *
     * That prior notice is what the declaration records. Read directly at the
     * Federal Ministry of Justice's own publication of the consolidated law.
     */
    id: 'de-aufenthg-54',
    authority: 'Bundesministerium der Justiz — Aufenthaltsgesetz',
    titleKey: 'visa-domain:sources.de-aufenthg-54.title',
    url: 'https://www.gesetze-im-internet.de/aufenthg_2004/__54.html',
    sourceType: 'regulation',
    /** German law, in force for German visa procedures anywhere. */
    jurisdiction: 'DE',
    language: 'de',
    lastVerifiedAt: '2026-09-07',
    retrievedAt: '2026-09-07',
    notesKey: 'visa-domain:sources.de-aufenthg-54.notes',
  },
]
