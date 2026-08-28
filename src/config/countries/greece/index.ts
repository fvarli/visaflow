import type { CountryConfig } from '../../types'
import { euSources } from '../../sources/eu.sources'
import { greeceSources } from '../../sources/greece.sources'
import { greeceTourismTemplate } from './tourism'

export const greeceConfig: CountryConfig = {
  countryCode: 'GR',
  nameKey: 'visa-domain:countries.GR',
  schengenMember: true,
  visaTypes: [greeceTourismTemplate],
  /**
   * EU records first, because the requirements citing them come from the
   * shared Schengen array. `sourceRefs` resolve against this list, so a pack
   * that composes `commonSchengenDocuments` must also carry `euSources` or its
   * citations would dangle — which the provenance invariants catch.
   */
  sources: [...euSources, ...greeceSources],
}

export { greeceTourismTemplate }
