import { useTranslation } from 'react-i18next'
import { CoverageSummary } from '@/components/trip/CoverageSummary'
import { useFindingText } from '@/lib/finding-text'
import { dynamicT } from '@/lib/i18n-dynamic'
import { useFinanceModel } from '@/features/finance/finance-model'
import { useFormatters } from '@/lib/format'
import type { ConsistencyTone } from '@/features/finance/finance-consistency'

type Tone = 'success' | 'warning' | 'danger' | 'neutral'

const SEVERITY_TONE: Record<string, Tone> = {
  error: 'danger',
  warning: 'warning',
  info: 'neutral',
}

const OBSERVATION_TONE: Record<ConsistencyTone, Tone> = {
  ok: 'success',
  attention: 'warning',
  neutral: 'neutral',
}

/**
 * Step 5 — consistency. Factual relationships only: the money-relevant findings
 * (surfaced straight from the engine, never re-judged) and calm net-new
 * observations. Nothing here predicts an outcome or scores financial strength
 * (ADR-016). When there is nothing to flag, it reassures.
 */
export function ConsistencyStep() {
  const { t } = useTranslation('finance')
  const td = dynamicT(t)
  const findingText = useFindingText()
  const format = useFormatters()
  const model = useFinanceModel()
  const { findings, observations } = model.consistency

  const nothingToShow = findings.length === 0 && observations.length === 0

  return (
    <div className="flex flex-col gap-3">
      {nothingToShow && (
        <CoverageSummary tone="success" title={t('consistency.allClear')} />
      )}

      {findings.map((finding) => {
        const text = findingText(finding)
        return (
          <CoverageSummary
            key={finding.id}
            tone={SEVERITY_TONE[finding.severity] ?? 'warning'}
            title={text.title}
            description={text.description}
          />
        )
      })}

      {observations.map((observation) => {
        // Params were declared on the interface from the start and never
        // passed, so the first observation to use them would have rendered its
        // placeholders raw. Amounts arrive as numbers + a currency code and are
        // formatted here, at the UI boundary.
        const params = observation.params
        const money =
          params && typeof params.currency === 'string'
            ? {
                ...params,
                declared: format.currency(
                  Number(params.declared),
                  params.currency
                ),
                budget: format.currency(Number(params.budget), params.currency),
              }
            : params
        return (
          <CoverageSummary
            key={observation.id}
            tone={OBSERVATION_TONE[observation.tone]}
            title={td(observation.messageKey, money)}
          />
        )
      })}
    </div>
  )
}
