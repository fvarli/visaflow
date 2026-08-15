import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, FolderClosed, Printer } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { PrintPackage as PrintPackageModel } from '@/features/review/review-print'
import {
  BUNDLE_STATE_ICON,
  BUNDLE_STATE_TONE,
  PRINTABLE_STATE_TONE,
} from './state-meta'

interface PrintPackageProps {
  print: PrintPackageModel
}

/**
 * The print package — two deliberately different things, never blended.
 *
 * **Pages VisaFlow can generate** are built from dossier data VisaFlow holds; a
 * generated sheet is structurally incapable of being one of the applicant's own
 * documents (see `review-print.ts`). **Your physical dossier** is the folder the
 * applicant assembles from their own files — VisaFlow only tracks whether they
 * have them, at bundle granularity, because the item-level detail already lives
 * in the checklist above.
 *
 * This is a read-only preview. There is no Print button, because printing does
 * not exist yet and a button that does nothing is worse than none.
 */
export function PrintPackage({ print }: PrintPackageProps) {
  const { t } = useTranslation('review')
  const td = dynamicT(t)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="space-y-1">
          <h3 className="text-body text-foreground flex items-center gap-2 font-semibold">
            <Printer aria-hidden className="text-muted-foreground size-4" />
            {t('print.generated.title')}
          </h3>
          <p className="text-caption text-muted-foreground text-pretty">
            {t('print.generated.description')}
          </p>
        </CardHeader>
        <CardContent>
          <ul className="divide-border divide-y">
            {print.generatedSheets.map((sheet) => (
              <li
                key={sheet.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-body text-foreground">
                    {td(`print.generated.${sheet.id}`)}
                  </p>
                  <p className="text-caption text-muted-foreground text-pretty">
                    {td(`print.generated.${sheet.id}Hint`)}
                    {sheet.itemCount !== undefined && sheet.itemCount > 0 && (
                      <>
                        {' · '}
                        {t('print.generated.itemCount', {
                          count: sheet.itemCount,
                        })}
                      </>
                    )}
                  </p>
                </div>
                <StatusBadge tone={PRINTABLE_STATE_TONE[sheet.state]}>
                  {td(`print.state.${sheet.state}`)}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <h3 className="text-body text-foreground flex items-center gap-2 font-semibold">
            <FolderClosed
              aria-hidden
              className="text-muted-foreground size-4"
            />
            {t('print.physical.title')}
          </h3>
          <p className="text-caption text-muted-foreground text-pretty">
            {t('print.physical.description')}
          </p>
        </CardHeader>
        <CardContent>
          {print.physicalBundles.length === 0 ? (
            <p className="text-body text-muted-foreground">
              {t('checklist.empty')}
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {print.physicalBundles.map((bundle) => {
                const Icon = BUNDLE_STATE_ICON[bundle.state]
                return (
                  <li
                    key={bundle.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Icon
                        aria-hidden
                        className="text-muted-foreground size-4 shrink-0"
                      />
                      <div className="min-w-0">
                        <Link
                          to={bundle.to}
                          className="text-body text-foreground hover:text-primary inline-flex items-center gap-1 rounded-sm underline-offset-4 hover:underline"
                        >
                          {td(`print.physical.${bundle.id}`)}
                          <ArrowUpRight
                            aria-hidden
                            className="text-muted-foreground size-3.5 shrink-0"
                          />
                        </Link>
                        <p className="text-caption text-muted-foreground">
                          {t('print.physical.bundleSummary', {
                            ready: bundle.counts.ready,
                            total: bundle.counts.actionable,
                          })}
                        </p>
                      </div>
                    </div>
                    <StatusBadge tone={BUNDLE_STATE_TONE[bundle.state]}>
                      {td(`print.state.${bundle.state}`)}
                    </StatusBadge>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-caption text-muted-foreground">{t('print.notYet')}</p>
    </div>
  )
}
