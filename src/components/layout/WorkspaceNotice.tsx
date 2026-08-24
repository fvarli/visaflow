import { useTranslation } from 'react-i18next'
import {
  Copy,
  Download,
  HardDriveDownload,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'

interface WorkspaceNoticeProps {
  /** The app's single export implementation, reused rather than duplicated. */
  onExport: () => void
}

/**
 * The one place that tells the user their work is at risk, and what to do.
 *
 * Every state below already had correct, translated copy in `workspace.json`
 * before this component existed — `errorHint`, `unavailableHint`,
 * `sessionOnlyHint` — and none of it was rendered anywhere. The user's only
 * signal was a caption-sized pill in the header that is hidden below 640px and
 * silent to screen readers. So the failure the app handles most carefully was
 * the failure it explained least.
 *
 * Deliberately calm and deliberately stuck: `role="status"` announces at the
 * next pause instead of interrupting, focus never moves (the user may be
 * mid-word), and nothing dismisses on a timer — a timer would hide the fact
 * that nothing is being saved. There is no retry button either: the failures
 * here are a browser refusing storage, not a flaky network, and a retry that
 * quietly fails again is worse than an honest sentence.
 *
 * Never "sync failed" — nothing was ever syncing, and nothing left the device.
 */
export function WorkspaceNotice({ onExport }: WorkspaceNoticeProps) {
  const { t } = useTranslation(['workspace', 'common'])
  const {
    conflict,
    status,
    sessionOnly,
    reloadLatest,
    saveAsNew,
    promoteToDevice,
    importReport,
    dismissImportReport,
  } = useWorkspace()

  /**
   * What the last import could not read.
   *
   * Deliberately first and deliberately *not* exclusive with the states below:
   * it is about the file that just arrived, and a browser that also refuses to
   * store it is a second, separate thing the user needs to know. It is also the
   * reason this lives here at all — a successful import swaps the dossier, which
   * remounts the page, so the importing screen cannot hold its own message
   * (ADR-041).
   */
  const report = importReport !== null && (
    <Notice
      title={t('common:import.omitted', { count: importReport })}
      body={t('common:import.omittedHint')}
      icon={<TriangleAlert />}
    >
      <Button size="sm" variant="outline" onClick={dismissImportReport}>
        {t('common:actions.dismiss')}
      </Button>
    </Notice>
  )

  // A conflict is the most specific thing that can be wrong, so it wins.
  if (conflict) {
    const deleted = conflict.kind === 'remote-delete'
    return (
      <>
        {report}
        <Notice
          title={
            deleted ? t('conflict.deletedTitle') : t('conflict.changedTitle')
          }
          body={deleted ? t('conflict.deletedBody') : t('conflict.changedBody')}
          footnote={t('conflict.exportHint')}
        >
          {/* Reloading is meaningless once the record is gone. */}
          {!deleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void reloadLatest()}
            >
              <RefreshCw />
              {t('conflict.reload')}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => void saveAsNew()}>
            <Copy />
            {t('conflict.saveAsNew')}
          </Button>
        </Notice>
      </>
    )
  }

  // Storage refusing to exist and a write going wrong are different problems,
  // and now that they are classified apart they can finally be worded apart.
  if (status === 'error' || status === 'unavailable') {
    return (
      <>
        {report}
        <Notice
          title={t(`status.${status}`)}
          body={t(
            status === 'unavailable'
              ? 'status.unavailableHint'
              : 'status.errorHint'
          )}
        >
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download />
            {t('backup.action')}
          </Button>
        </Notice>
      </>
    )
  }

  if (sessionOnly) {
    return (
      <>
        {report}
        <Notice title={t('session.title')} body={t('status.sessionOnlyHint')}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void promoteToDevice()}
          >
            <HardDriveDownload />
            {t('session.promote')}
          </Button>
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download />
            {t('backup.action')}
          </Button>
        </Notice>
      </>
    )
  }

  return report || null
}

function Notice({
  title,
  body,
  footnote,
  icon,
  children,
}: {
  title: string
  body: string
  footnote?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Alert
      variant="warning"
      role="status"
      // `aria-live` is implicit in `status`, but this appears while focus is
      // elsewhere entirely, so announce the whole thing rather than the diff.
      aria-atomic="true"
      className="mb-6"
    >
      {icon}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="gap-3">
        <p>{body}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {children}
        </div>
        {footnote && <p className="text-caption">{footnote}</p>}
      </AlertDescription>
    </Alert>
  )
}
