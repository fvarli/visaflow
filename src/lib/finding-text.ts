import { useTranslation } from 'react-i18next'
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FindingParams, ValidationFinding } from '@/domain/rules/types'
import { useFormatters } from '@/lib/format'
import { documentLabel } from '@/lib/document-label'
import { dynamicT } from '@/lib/i18n-dynamic'

export interface RenderedFinding {
  title: string
  description: string
  suggestedAction: string
}

/**
 * Turn a machine-readable finding into localized prose.
 *
 * This is the whole i18n boundary for validation: rules emit stable keys and
 * raw values, and every locale-specific decision — date format, currency
 * symbol, list separator, document label — is made here.
 */
export function renderFinding(
  finding: ValidationFinding,
  t: (...args: any[]) => any,
  format: {
    date: (value: string) => string
    currency: (amount: number, currency: string) => string
  },
  listFormatter: Intl.ListFormat
): RenderedFinding {
  const interpolation = buildInterpolation(
    finding.messageParams,
    t,
    format,
    listFormatter
  )

  const base = finding.messageKey
  const actionKey = finding.suggestedActionKey ?? `${base}.action`
  const td = dynamicT(t)

  return {
    title: td(`validation:${base}.title`, interpolation),
    description: td(`validation:${base}.description`, interpolation),
    suggestedAction: td(`validation:${actionKey}`, {
      ...interpolation,
      defaultValue: '',
    }),
  }
}

function buildInterpolation(
  params: FindingParams | undefined,
  t: (...args: any[]) => any,
  format: {
    date: (value: string) => string
    currency: (amount: number, currency: string) => string
  },
  listFormatter: Intl.ListFormat
): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  if (!params) return out

  for (const [key, value] of Object.entries(params.values ?? {})) {
    out[key] = value
  }
  for (const [key, iso] of Object.entries(params.dates ?? {})) {
    out[key] = format.date(iso)
  }
  for (const [key, codes] of Object.entries(params.documentCodes ?? {})) {
    // Intl.ListFormat gives a correct conjunction per locale rather than a
    // hardcoded ", " join.
    out[key] = listFormatter.format(codes.map((code) => documentLabel(t, code)))
  }
  for (const [key, money] of Object.entries(params.money ?? {})) {
    out[key] = format.currency(money.amount, money.currency)
  }
  for (const [key, translationKey] of Object.entries(params.enumKeys ?? {})) {
    out[key] = dynamicT(t)(translationKey)
  }

  return out
}

/** Component-facing wrapper; keeps pages free of formatter plumbing. */
export function useFindingText() {
  const { t } = useTranslation()
  const formatters = useFormatters()

  const listFormatter = new Intl.ListFormat(formatters.intlLocale, {
    style: 'long',
    type: 'conjunction',
  })

  return (finding: ValidationFinding): RenderedFinding =>
    renderFinding(
      finding,
      t,
      {
        date: (value) => formatters.date(value),
        currency: (amount, currency) => formatters.currency(amount, currency),
      },
      listFormatter
    )
}
