import type { CountryConfig } from '../../types'
import { germanyTourismComposition, germanyTourismTemplate } from './tourism'

export const germanyConfig: CountryConfig = {
  countryCode: 'DE',
  nameKey: 'visa-domain:countries.DE',
  schengenMember: true,
  visaTypes: [germanyTourismTemplate],
  /**
   * Taken from the composition, exactly as Greece's is: the composer already
   * merges every layer's records in layer order and refuses to compose a
   * citation no layer provides, so reading the list from it keeps one source of
   * truth and makes a dangling reference impossible rather than unlikely.
   *
   * The order that produces: the five Visa Code records from the common layer,
   * Germany's own statute from the destination layer, the Commission act from
   * the filing jurisdiction, then the two mission pages.
   */
  sources: germanyTourismComposition.sources,
}

export { germanyTourismTemplate }
