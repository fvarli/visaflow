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
]
