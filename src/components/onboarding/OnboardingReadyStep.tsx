import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, FileText, LayoutDashboard, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * The final step: a one-line orientation to the three places the user will spend
 * their time, then a single calm hand-off into the Dashboard. No feature tour —
 * just enough to know where to look next.
 */
export function OnboardingReadyStep() {
  const { t } = useTranslation('onboarding')

  const items = [
    { icon: LayoutDashboard, text: t('ready.dashboard') },
    { icon: FileText, text: t('ready.documents') },
    { icon: ListChecks, text: t('ready.validation') },
  ]

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {items.map(({ icon: Icon, text }) => (
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

      <Button asChild>
        <Link to="/dashboard">
          {t('ready.continue')}
          <ArrowRight />
        </Link>
      </Button>
    </div>
  )
}
