import { useEffect, useRef, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/page-header'
import { PageBody } from '@/components/ui/section'
import {
  SETTINGS_SECTION_IDS,
  resolveSection,
  type SettingsSectionId,
} from '@/features/settings/settings-model'
import { SettingsNav } from '@/components/settings/SettingsNav'
import { SettingsSection } from '@/components/settings/SettingsSection'
import { AppearanceSection } from '@/components/settings/AppearanceSection'
import { LanguageSection } from '@/components/settings/LanguageSection'
import { CountryPacksSection } from '@/components/settings/CountryPacksSection'
import { PrivacySection } from '@/components/settings/PrivacySection'
import { DataSection } from '@/components/settings/DataSection'
import { ImportExportSection } from '@/components/settings/ImportExportSection'
import { AboutSection } from '@/components/settings/AboutSection'
import { AdvancedSection } from '@/components/settings/AdvancedSection'

const CONTENT: Record<SettingsSectionId, ReactNode> = {
  appearance: <AppearanceSection />,
  language: <LanguageSection />,
  countryPacks: <CountryPacksSection />,
  privacy: <PrivacySection />,
  data: <DataSection />,
  importExport: <ImportExportSection />,
  about: <AboutSection />,
  advanced: <AdvancedSection />,
}

/**
 * Settings — the application control center. A responsive two-pane shell (a calm
 * section rail on desktop, a scrollable selector on mobile) over pure derivation
 * in `src/features/settings/*`. The active section is an additive `?section=`
 * deep-link (invalid falls back safely); focus moves to the section heading on
 * change. This page owns only orchestration — it changes no data, storage, or
 * validation behaviour.
 */
export default function SettingsPage() {
  const { t } = useTranslation('settings')
  const [searchParams, setSearchParams] = useSearchParams()
  const current = resolveSection(searchParams.get('section'))
  const headingRef = useRef<HTMLHeadingElement>(null)

  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    headingRef.current?.focus()
  }, [current])

  const setSection = (id: SettingsSectionId) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('section', id)
      return next
    })

  return (
    <PageBody>
      <PageHeader title={t('title')} description={t('description')} />

      <div className="grid gap-8 lg:grid-cols-[14rem_1fr] lg:gap-12">
        <div className="lg:pt-1">
          <SettingsNav
            sections={SETTINGS_SECTION_IDS}
            current={current}
            onSelect={setSection}
          />
        </div>

        <div key={current} className="min-w-0 animate-fade-in">
          <SettingsSection
            ref={headingRef}
            title={t(`${current}.title`)}
            description={t(`${current}.description`)}
          >
            {CONTENT[current]}
          </SettingsSection>
        </div>
      </div>
    </PageBody>
  )
}
