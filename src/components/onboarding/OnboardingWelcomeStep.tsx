import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Ban, Save, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * The first onboarding step: what VisaFlow is, and the three promises that
 * matter on sight — local-first privacy, never predicts an outcome, autosave.
 * One clear primary action (get started) plus a calm escape (explore first).
 */
export function OnboardingWelcomeStep({
  onGetStarted,
}: {
  onGetStarted: () => void
}) {
  const { t } = useTranslation('onboarding')

  const points = [
    { icon: ShieldCheck, text: t('welcome.privacy') },
    { icon: Ban, text: t('welcome.noPrediction') },
    { icon: Save, text: t('welcome.autosave') },
  ]

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {points.map(({ icon: Icon, text }) => (
          <li key={text} className="flex gap-3">
            <Icon
              className="text-muted-foreground mt-0.5 size-5 shrink-0"
              aria-hidden
            />
            <span className="text-body text-muted-foreground text-pretty">
              {text}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-start gap-3">
        <Button onClick={onGetStarted}>
          {t('welcome.getStarted')}
          <ArrowRight />
        </Button>
        <Link
          to="/dashboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-sm text-sm"
        >
          {t('welcome.exploreFirst')}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
