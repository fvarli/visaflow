import { useTranslation } from 'react-i18next'

/**
 * First tab stop on every page. Visually hidden until focused, then it
 * becomes a normal button pinned to the top-left — so keyboard users can jump
 * past 13 navigation links to reach the content.
 */
export function SkipLink() {
  const { t } = useTranslation('common')

  return (
    <a
      href="#main"
      className="bg-card text-foreground text-body sr-only rounded-md border px-4 py-2 font-medium shadow-md focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-100"
    >
      {t('a11y.skipToContent')}
    </a>
  )
}
