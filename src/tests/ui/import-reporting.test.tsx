import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import i18n from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider } from '@/app/providers/DossierProvider'
import { WorkspaceProvider } from '@/app/providers/WorkspaceProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MemoryDossierRepository } from '@/features/workspace/adapters/memory-adapter'
import { ImportExportSection } from '@/components/settings/ImportExportSection'
import { OnboardingCreateStep } from '@/components/onboarding/OnboardingCreateStep'
import { WorkspaceNotice } from '@/components/layout/WorkspaceNotice'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import exampleJson from '@/data/examples/example-dossier.json'

/**
 * What an import tells the user afterwards.
 *
 * The service has always been additive and forgiving, and that is right. The
 * bug was in the reporting: of six production import entry points, five said
 * "Dossier loaded." or nothing at all while quietly leaving items behind
 * (ADR-041). These tests are about the sentence, not the parse.
 */

/** The example dossier with one document deliberately unreadable. */
function fileWithOneBadDocument(): string {
  const file = JSON.parse(JSON.stringify(exampleJson)) as Record<
    string,
    unknown
  >
  const documents = (file.documents as Record<string, unknown>[]).slice(0, 3)
  documents[1]!.status = 'chewed-by-the-dog'
  file.documents = documents
  return JSON.stringify(file)
}

/**
 * jsdom has `File` and `FileReader`, but `fireEvent.change` cannot populate a
 * real `files` list, so the chosen file is planted on the input directly.
 */
function chooseFile(input: HTMLInputElement, contents: string) {
  const file = new File([contents], 'dossier.json', {
    type: 'application/json',
  })
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
}

/**
 * `WorkspaceNotice` is mounted alongside, exactly as `AppLayout` mounts it:
 * *above* the page. That placement is the fix, not an incidental detail — in
 * the real app a successful import swaps the dossier, which remounts the page
 * and would take any message the importing screen was holding with it.
 */
/** Exposes the fact that an import actually landed, so absences can be timed. */
function ActiveProbe() {
  const { activeId } = useWorkspace()
  return <span data-testid="active">{activeId ?? 'none'}</span>
}

function mount(ui: React.ReactNode) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <WorkspaceProvider repository={new MemoryDossierRepository()}>
            <TooltipProvider>
              <WorkspaceNotice onExport={() => {}} />
              <ActiveProbe />
              {ui}
            </TooltipProvider>
          </WorkspaceProvider>
        </DossierProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}

const fileInput = (container: HTMLElement) => {
  const input = container.querySelector('input[type="file"]')
  if (!input) throw new Error('no file input rendered')
  return input as HTMLInputElement
}

beforeEach(() => {
  if (i18n.language !== 'tr') void i18n.changeLanguage('tr')
})

const omittedOne = () => i18n.t('common:import.omitted', { count: 1 })

describe('Settings → import', () => {
  it('reports how much of the file was left out', async () => {
    const { container } = mount(<ImportExportSection />)
    chooseFile(fileInput(container), fileWithOneBadDocument())

    await waitFor(() =>
      expect(screen.getByText(omittedOne())).toBeInTheDocument()
    )
    // The dossier still arrived — this is a partial success, not a failure.
    expect(
      screen.queryByText(i18n.t('settings:importExport.importError'))
    ).not.toBeInTheDocument()
  })

  it('says nothing at all when the file came back whole', async () => {
    const { container } = mount(<ImportExportSection />)
    chooseFile(fileInput(container), JSON.stringify(exampleJson))

    // Wait for the import to actually land before asserting an absence.
    await waitFor(() =>
      expect(screen.getByTestId('active').textContent).not.toBe('none')
    )
    expect(screen.queryByText(omittedOne())).not.toBeInTheDocument()
  })
})

describe('Onboarding → import', () => {
  it('reports what was dropped without stranding the flow', async () => {
    const onCreated = vi.fn()
    const { container } = mount(
      <OnboardingCreateStep country="GR" onCreated={onCreated} />
    )
    chooseFile(fileInput(container), fileWithOneBadDocument())

    await waitFor(() =>
      expect(screen.getByText(omittedOne())).toBeInTheDocument()
    )
    // The step still advances: the message lives above the page precisely so
    // it survives the remount that finishing the step causes.
    expect(onCreated).toHaveBeenCalled()
  })

  it('advances with nothing to say when the file came back whole', async () => {
    const onCreated = vi.fn()
    const { container } = mount(
      <OnboardingCreateStep country="GR" onCreated={onCreated} />
    )
    chooseFile(fileInput(container), JSON.stringify(exampleJson))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(screen.queryByText(omittedOne())).not.toBeInTheDocument()
  })
})
