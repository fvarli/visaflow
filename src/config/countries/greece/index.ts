import type { CountryConfig } from '../../types'
import { greeceSources } from '../../sources/greece.sources'
import { greeceTourismTemplate } from './tourism'

export const greeceConfig: CountryConfig = {
  countryCode: 'GR',
  nameKey: 'visa-domain:countries.GR',
  schengenMember: true,
  visaTypes: [greeceTourismTemplate],
  sources: greeceSources,
}

export { greeceTourismTemplate }
