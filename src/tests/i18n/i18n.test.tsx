import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import i18n, {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  INTL_LOCALES,
  resolveInitialLocale,
} from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider } from '@/app/providers/DossierProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/layout/Sidebar'
import { LanguageSelect } from '@/components/ui/language-select'
import { SourceNote } from '@/components/ui/source-note'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import { documentLabel } from '@/lib/document-label'
import { renderFinding } from '@/lib/finding-text'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { ValidationFinding } from '@/domain/rules/types'
import type { RequirementSource } from '@/config/types'
import { greeceTourismTemplate } from '@/config/countries/greece'
import {
  DocumentStatusSchema,
  DocumentCategorySchema,
  SponsorRelationshipSchema,
} from '@/domain/types/common'

function renderInApp(ui: React.ReactNode, route = '/documents') {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
          </TooltipProvider>
        </DossierProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

afterEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe('locale resolution', () => {
  it('defaults to Turkish on first use', () => {
    expect(DEFAULT_LOCALE).toBe('tr')
    expect(resolveInitialLocale()).toBe('tr')
  })

  it('does not fall back to the browser language', () => {
    // jsdom reports an English navigator; Turkish must still win.
    expect(window.navigator.language.startsWith('en')).toBe(true)
    expect(resolveInitialLocale()).toBe('tr')
  })

  it('honours an explicitly stored preference', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    expect(resolveInitialLocale()).toBe('en')
  })

  it('ignores an unsupported stored value', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'de')
    expect(resolveInitialLocale()).toBe('tr')
  })

  it('supports exactly Turkish and English', () => {
    expect([...SUPPORTED_LOCALES]).toEqual(['tr', 'en'])
  })
})

describe('language selector', () => {
  it('switches visible navigation text and persists the choice', async () => {
    const user = userEvent.setup()
    renderInApp(
      <>
        <LanguageSelect />
        <Sidebar />
      </>
    )

    // Turkish first.
    expect(
      screen.getByRole('link', { name: i18n.t('navigation:items.documents') })
    ).toBeInTheDocument()
    expect(i18n.t('navigation:items.documents')).toBe('Belgeler')

    await user.click(screen.getByRole('button', { name: /Türkçe/ }))
    await user.click(screen.getByRole('menuitem', { name: /English/ }))

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Documents' })
      ).toBeInTheDocument()
    })
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
  })

  it('updates document.documentElement.lang', async () => {
    const user = userEvent.setup()
    renderInApp(<LanguageSelect />)

    await waitFor(() => expect(document.documentElement.lang).toBe('tr'))

    await user.click(screen.getByRole('button', { name: /Türkçe/ }))
    await user.click(screen.getByRole('menuitem', { name: /English/ }))

    await waitFor(() => expect(document.documentElement.lang).toBe('en'))
  })

  it('names languages as text, never by flag alone', () => {
    renderInApp(<LanguageSelect />)
    const trigger = screen.getByRole('button', { name: /Türkçe/ })
    expect(trigger).toHaveAccessibleName()
    expect(trigger.textContent).toContain('Türkçe')
  })
})

describe('locale-aware formatting', () => {
  it('formats dates per locale', () => {
    expect(formatDate('2026-08-12', INTL_LOCALES.tr)).toBe('12 Ağustos 2026')
    expect(formatDate('2026-08-12', INTL_LOCALES.en)).toBe('12 August 2026')
  })

  it('formats currency per locale, using the value’s own currency', () => {
    const tr = formatCurrency(98000, 'TRY', INTL_LOCALES.tr, {
      maximumFractionDigits: 0,
    })
    const en = formatCurrency(98000, 'TRY', INTL_LOCALES.en, {
      maximumFractionDigits: 0,
    })

    expect(tr).toContain('₺')
    expect(tr).toContain('98.000') // Turkish uses . as the thousands separator
    expect(en).toContain('98,000') // English uses ,
    expect(tr).not.toBe(en)

    // EUR must not be hardcoded anywhere in the helper.
    expect(formatCurrency(30000, 'EUR', INTL_LOCALES.tr)).toContain('€')
  })

  it('formats numbers per locale', () => {
    expect(formatNumber(1234.5, INTL_LOCALES.tr)).toBe('1.234,5')
    expect(formatNumber(1234.5, INTL_LOCALES.en)).toBe('1,234.5')
  })
})

describe('stable values do not change with locale', () => {
  it('keeps enum members language-independent', async () => {
    const snapshot = () => ({
      status: DocumentStatusSchema.options,
      category: DocumentCategorySchema.options,
      relationship: SponsorRelationshipSchema.options,
    })

    await i18n.changeLanguage('tr')
    const tr = snapshot()
    await i18n.changeLanguage('en')
    const en = snapshot()

    expect(tr).toEqual(en)
    expect(tr.status).toContain('needs_update')
  })

  it('keeps requirement codes and template ids language-independent', async () => {
    const codes = () =>
      greeceTourismTemplate.documentRequirements.map((r) => r.code)

    await i18n.changeLanguage('tr')
    const tr = codes()
    await i18n.changeLanguage('en')
    const en = codes()

    expect(tr).toEqual(en)
    expect(greeceTourismTemplate.id).toBe('schengen-short-stay-tourism')
    expect(greeceTourismTemplate.visaType).toBe('short_stay_tourism')
  })
})

describe('requirement labels', () => {
  it('renders a requirement name from its translation key', async () => {
    await i18n.changeLanguage('tr')
    expect(documentLabel(i18n.t, 'EMPLOYMENT_LETTER')).toContain('İşveren')

    await i18n.changeLanguage('en')
    expect(documentLabel(i18n.t, 'EMPLOYMENT_LETTER')).toBe('Employment Letter')
  })

  it('falls back to a legacy stored name, then to the code', () => {
    expect(documentLabel(i18n.t, 'UNKNOWN_CODE', 'Legacy Name')).toBe(
      'Legacy Name'
    )
    expect(documentLabel(i18n.t, 'UNKNOWN_CODE')).toBe('UNKNOWN_CODE')
  })

  it('resolves every requirement in the Greece template in both locales', async () => {
    for (const locale of SUPPORTED_LOCALES) {
      await i18n.changeLanguage(locale)
      for (const req of greeceTourismTemplate.documentRequirements) {
        const name = dynamicT(i18n.t)(req.nameKey, { defaultValue: '' })
        expect(name, `${req.code} missing in ${locale}`).not.toBe('')
      }
    }
  })
})

describe('validation findings', () => {
  const finding: ValidationFinding = {
    id: 'passport-validity-insufficient',
    ruleId: 'passport.validAfterTrip',
    severity: 'error',
    messageKey: 'findings.passportValidityInsufficient',
    messageParams: {
      dates: { expiryDate: '2026-09-01', tripEnd: '2026-08-20' },
    },
    relatedFields: ['applicant.passport.expiryDate', 'trip.exitDate'],
  }

  const listFormatter = (locale: string) =>
    new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' })

  const renderIn = (locale: 'tr' | 'en') =>
    renderFinding(
      finding,
      i18n.t,
      {
        date: (v) => formatDate(v, INTL_LOCALES[locale]),
        currency: (a, c) => formatCurrency(a, c, INTL_LOCALES[locale]),
      },
      listFormatter(INTL_LOCALES[locale])
    )

  it('renders a representative finding in both languages', async () => {
    await i18n.changeLanguage('tr')
    const tr = renderIn('tr')
    await i18n.changeLanguage('en')
    const en = renderIn('en')

    expect(tr.title).toBe('Pasaport geçerlilik süresi yetersiz')
    expect(en.title).toBe('Passport validity insufficient')
    expect(tr.title).not.toBe(en.title)

    // Dates are interpolated and locale-formatted, not left as raw ISO.
    expect(tr.description).toContain('1 Eylül 2026')
    expect(en.description).toContain('1 September 2026')
    expect(tr.description).not.toContain('2026-09-01')

    expect(tr.suggestedAction).not.toBe('')
    expect(en.suggestedAction).not.toBe('')
  })

  it('keeps machine-readable identity identical across locales', async () => {
    await i18n.changeLanguage('tr')
    const trRendered = renderIn('tr')
    await i18n.changeLanguage('en')
    const enRendered = renderIn('en')

    // The finding object itself never changes — only its rendering does.
    expect(finding.id).toBe('passport-validity-insufficient')
    expect(finding.ruleId).toBe('passport.validAfterTrip')
    expect(finding.severity).toBe('error')
    expect(trRendered.title).not.toBe(enRendered.title)
  })

  it('translates every finding messageKey used by the rules', async () => {
    const keys = [
      'findings.tripDatesInvalid',
      'findings.appointmentAfterTrip',
      'findings.tripInPast',
      'findings.routeNightsMismatch',
      'findings.mainDestinationMismatch',
      'findings.firstEntryTransportMismatch',
      'findings.passportValidityInsufficient',
      'findings.passportBlankPages',
      'findings.noInsurance',
      'findings.insuranceDatesMissing',
      'findings.insuranceStartsLate',
      'findings.insuranceEndsEarly',
      'findings.insuranceCoverageLow',
      'findings.noAccommodation',
      'findings.accommodationGap',
      'findings.accommodationNameMismatch',
      'findings.requiredDocSkipped',
      'findings.docExpiresBeforeAppointment',
      'findings.missingRequiredDocs',
      'findings.docsNeedUpdate',
      'findings.noApprovedLeave',
      'findings.leaveStartsLate',
      'findings.leaveEndsEarly',
      'findings.sponsorNoDocuments',
      'findings.sponsoredNoSponsor',
      'findings.sponsorsNoFinanceInfo',
      'findings.sponsorRelationshipProof',
    ]

    for (const locale of SUPPORTED_LOCALES) {
      await i18n.changeLanguage(locale)
      for (const key of keys) {
        for (const part of ['title', 'action']) {
          const value = dynamicT(i18n.t)(`validation:${key}.${part}`, {
            defaultValue: '',
          })
          expect(value, `${key}.${part} missing in ${locale}`).not.toBe('')
        }
      }
    }
  })
})

describe('source metadata', () => {
  const verified: RequirementSource[] = [
    {
      id: 'demo',
      authority: 'Example Consulate',
      titleKey: 'playground:i18n.demoSourceTitle',
      sourceType: 'consulate',
      lastVerifiedAt: '2026-07-15',
    },
  ]

  it('renders authority and last-verified date when a source is verified', () => {
    renderInApp(<SourceNote sources={verified} reviewStatus="verified" />)

    expect(screen.getByText('Example Consulate')).toBeInTheDocument()
    expect(screen.getByText('15 Temmuz 2026')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('sources.lastVerified'))).toBeInTheDocument()
  })

  it('shows the unverified notice when there is no verified source', () => {
    renderInApp(<SourceNote sources={[]} reviewStatus="unverified" />)
    expect(
      screen.getByText(i18n.t('sources.unverifiedNotice'))
    ).toBeInTheDocument()
  })

  it('does not treat a source without a verification date as verified', () => {
    const unverified: RequirementSource[] = [
      {
        id: 'no-date',
        authority: 'Example Ministry',
        titleKey: 'playground:i18n.demoSourceTitle',
        sourceType: 'government',
      },
    ]
    renderInApp(
      <SourceNote sources={unverified} reviewStatus="partially_verified" />
    )
    expect(
      screen.getByText(i18n.t('sources.unverifiedNotice'))
    ).toBeInTheDocument()
  })

  it('keeps the Greece template honestly marked unverified', () => {
    // Guard against someone marking the template verified without evidence.
    expect(greeceTourismTemplate.reviewStatus).toBe('unverified')
    for (const source of greeceTourismTemplate.sourceIds ?? []) {
      expect(typeof source).toBe('string')
    }
  })
})

describe('playground renders in both locales', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders every section in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      const { default: PlaygroundPage } = await import('@/pages/PlaygroundPage')
      renderInApp(<PlaygroundPage />, '/playground')

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: i18n.t('playground:title'),
        })
      ).toBeInTheDocument()

      for (const section of [
        'i18n',
        'foundations',
        'typography',
        'buttons',
        'badges',
        'forms',
        'feedback',
        'data',
        'overlays',
        'composition',
      ]) {
        expect(
          screen.getByRole('heading', {
            level: 2,
            name: dynamicT(i18n.t)(`playground:sections.${section}`),
          }),
          `section ${section} missing in ${locale}`
        ).toBeInTheDocument()
      }

      // The source-metadata demo must show both states.
      expect(
        screen.getAllByText(i18n.t('sources.unverifiedNotice')).length
      ).toBeGreaterThan(0)
    }
  )
})
