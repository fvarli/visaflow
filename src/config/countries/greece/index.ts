import type { CountryConfig } from '../../types'
import { greeceTourismComposition, greeceTourismTemplate } from './tourism'

export const greeceConfig: CountryConfig = {
  countryCode: 'GR',
  nameKey: 'visa-domain:countries.GR',
  schengenMember: true,
  visaTypes: [greeceTourismTemplate],
  /**
   * Derived from the composition, not concatenated a second time.
   *
   * These used to be written out as `[...euSources, ...greeceSources]`, which
   * meant the pack stated its source list in two places: once here, and once
   * implicitly in whichever citations its requirements happened to use. The
   * composer already merges every layer's records in layer order, and it fails
   * the build if a requirement cites something no composed layer provides — so
   * taking the list from it keeps one source of truth and makes a dangling
   * citation impossible rather than merely unlikely.
   *
   * The order is unchanged: common (the four Visa Code records) → destination
   * (the ministry's general page) → filing jurisdiction (the harmonised list
   * and the Ankara mission's visa page).
   */
  sources: greeceTourismComposition.sources,
}

export { greeceTourismTemplate }
