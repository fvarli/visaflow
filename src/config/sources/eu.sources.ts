import type { RequirementSource } from '../types'

/**
 * EU-level source records: the Schengen Visa Code.
 *
 * These are shared, not Greek. The requirements they support live in
 * `countries/common/schengen-short-stay.ts`, so the evidence belongs beside
 * them — every Schengen pack that composes those requirements spreads these
 * records into its own `sources` and inherits the citations with them.
 *
 * HONESTY RULES (ADR-015, ADR-047), same as every source file:
 *  - Nothing is scraped. Each record below was opened and read by hand on the
 *    date recorded, and cites a provision whose text was checked against the
 *    requirement wording it is attached to.
 *  - Three records rather than one, because these are three distinct
 *    provisions. `titleKey` is the only field the model has for saying *which*
 *    provision is cited, and a requirement that cites "the Visa Code" would
 *    vouch for far more than the article actually read.
 *  - They deliberately do NOT cover Greece-specific practice. The Visa Code
 *    says what every Member State requires; what the Hellenic Republic asks for
 *    on top of it is a separate question, and the Greek ministry's own
 *    publication is what would answer it (see `greece.sources.ts`).
 */

/** Consolidated text as at 2020-02-02, the version in force when read. */
const VISA_CODE_URL =
  'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02009R0810-20200202'

const AUTHORITY = 'European Union — Visa Code (Regulation (EC) No 810/2009)'

/**
 * `EU` is the ISO 3166-1 alpha-2 code exceptionally reserved for the European
 * Union, so it is a truthful value for a jurisdiction field documented as
 * alpha-2 rather than a stretch of one.
 */
const EU = 'EU'

export const euSources: RequirementSource[] = [
  {
    id: 'eu-visa-code-art11',
    authority: AUTHORITY,
    titleKey: 'visa-domain:sources.eu-visa-code-art11.title',
    url: VISA_CODE_URL,
    sourceType: 'regulation',
    jurisdiction: EU,
    language: 'en',
    lastVerifiedAt: '2026-08-29',
    retrievedAt: '2026-08-29',
    notesKey: 'visa-domain:sources.eu-visa-code-art11.notes',
  },
  {
    id: 'eu-visa-code-art12',
    authority: AUTHORITY,
    titleKey: 'visa-domain:sources.eu-visa-code-art12.title',
    url: VISA_CODE_URL,
    sourceType: 'regulation',
    jurisdiction: EU,
    language: 'en',
    lastVerifiedAt: '2026-08-28',
    retrievedAt: '2026-08-28',
    notesKey: 'visa-domain:sources.eu-visa-code-art12.notes',
  },
  {
    id: 'eu-visa-code-art15',
    authority: AUTHORITY,
    titleKey: 'visa-domain:sources.eu-visa-code-art15.title',
    url: VISA_CODE_URL,
    sourceType: 'regulation',
    jurisdiction: EU,
    language: 'en',
    lastVerifiedAt: '2026-08-28',
    retrievedAt: '2026-08-28',
    notesKey: 'visa-domain:sources.eu-visa-code-art15.notes',
  },
  {
    id: 'eu-visa-code-annex2',
    authority: AUTHORITY,
    titleKey: 'visa-domain:sources.eu-visa-code-annex2.title',
    url: VISA_CODE_URL,
    sourceType: 'regulation',
    jurisdiction: EU,
    language: 'en',
    lastVerifiedAt: '2026-08-28',
    retrievedAt: '2026-08-28',
    notesKey: 'visa-domain:sources.eu-visa-code-annex2.notes',
  },
]
