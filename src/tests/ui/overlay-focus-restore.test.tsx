import { useRef, useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * Overlays must return focus to whatever opened them.
 *
 * Radix restores focus only to a `<Dialog.Trigger>`, and 11 of this app's 16
 * overlays are controlled without one — the opener lives in another subtree, or
 * is a URL search param, or is a file-input change handler. Radix's modal close
 * handler calls `event.preventDefault()` unconditionally, which also suppresses
 * `FocusScope`'s own correct fallback, so focus was landing on `<body>` and a
 * keyboard user was dropped at the top of the document on every dismiss.
 * `src/components/ui/use-restore-focus.ts` fixes it for all three primitives.
 *
 * **What this file proves:** that `document.activeElement` is the opener again
 * after close, for Dialog / Sheet / AlertDialog, via `Escape` and via the
 * visible close action, and that an opener which unmounted while the overlay
 * was open degrades safely instead of throwing.
 *
 * **What it cannot prove:** that the restored element shows a *visible* focus
 * ring. jsdom resolves no cascade layers and does not implement the
 * `:focus-visible` heuristic. That half is measured in real Chrome over CDP and
 * recorded in `docs/manual-qa.md`.
 *
 * These overlays are deliberately rendered the way the real pages render them:
 * always mounted, `open` passed as a prop, and the opening button a sibling
 * rather than a Radix trigger.
 */

function ControlledDialog({ withOpener = true }: { withOpener?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {(withOpener || !open) && (
        <button type="button" onClick={() => setOpen(true)}>
          Open dialog
        </button>
      )}
      <button type="button">Unrelated</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
          <button type="button">Inside dialog</button>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ControlledSheet() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open sheet
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet title</SheetTitle>
            <SheetDescription>Sheet description</SheetDescription>
          </SheetHeader>
          <button type="button">Inside sheet</button>
        </SheetContent>
      </Sheet>
    </>
  )
}

/**
 * Mirrors Sponsors precisely: the button that opens the sheet is replaced by a
 * "card" in the same commit, so the opener is already detached before
 * `onOpenAutoFocus` runs. The page — not the primitive — names where focus
 * should land instead.
 */
function SelfDestructingOpenerSheet({
  withFallback,
}: {
  withFallback: boolean
}) {
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState(false)
  const cardAction = useRef<HTMLButtonElement | null>(null)
  return (
    <>
      {created ? (
        // Different element types on the two arms, exactly as SponsorsPage
        // swaps `<EmptyState>` for the card grid. Same-type arms would let
        // React reuse the DOM node instead of unmounting it, and the opener
        // would survive — which is not the situation being tested.
        <div>
          <button type="button" ref={cardAction}>
            Card action
          </button>
        </div>
      ) : (
        <section>
          <button
            type="button"
            onClick={() => {
              setCreated(true)
              setOpen(true)
            }}
          >
            Create and open
          </button>
        </section>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          restoreFocusFallback={
            withFallback ? () => cardAction.current : undefined
          }
        >
          <SheetHeader>
            <SheetTitle>Sheet title</SheetTitle>
            <SheetDescription>Sheet description</SheetDescription>
          </SheetHeader>
          <button type="button">Inside sheet</button>
        </SheetContent>
      </Sheet>
    </>
  )
}

function ControlledAlertDialog() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open alert
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alert title</AlertDialogTitle>
            <AlertDialogDescription>Alert description</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * The overlay close control is localized (`common:actions.close`), so it is
 * looked up through i18n rather than hardcoded — asserting "Close" here would
 * only pass in English, and Turkish is the default.
 */
const closeName = () => i18n.t('common:actions.close')

describe('overlay focus restoration', () => {
  it('returns focus to the opener when a Dialog closes with Escape', async () => {
    const user = userEvent.setup()
    render(<ControlledDialog />)
    const opener = screen.getByRole('button', { name: 'Open dialog' })

    opener.focus()
    await user.click(opener)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toContainElement(document.activeElement as HTMLElement)

    await user.keyboard('{Escape}')

    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('returns focus to the opener when a Dialog closes with its close button', async () => {
    const user = userEvent.setup()
    render(<ControlledDialog />)
    const opener = screen.getByRole('button', { name: 'Open dialog' })

    await user.click(opener)
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: closeName() }))

    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('returns focus to the opener when a Sheet closes with Escape', async () => {
    const user = userEvent.setup()
    render(<ControlledSheet />)
    const opener = screen.getByRole('button', { name: 'Open sheet' })

    await user.click(opener)
    const sheet = await screen.findByRole('dialog')
    expect(sheet).toContainElement(document.activeElement as HTMLElement)

    await user.keyboard('{Escape}')

    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('returns focus to the opener when an AlertDialog is cancelled', async () => {
    const user = userEvent.setup()
    render(<ControlledAlertDialog />)
    const opener = screen.getByRole('button', { name: 'Open alert' })

    await user.click(opener)
    await screen.findByRole('alertdialog')
    // AlertDialog supplies its own `onOpenAutoFocus` to focus Cancel; composing
    // rather than replacing must leave that intact.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Cancel' })
      )
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('does not restore focus to an opener that unmounted while open', async () => {
    const user = userEvent.setup()
    // Mirrors Sponsors: the clicked button is replaced in the same commit that
    // opens the overlay, so there is nothing left to restore focus to. The
    // requirement is that closing stays safe, not that we invent a target.
    render(<ControlledDialog withOpener={false} />)
    const opener = screen.getByRole('button', { name: 'Open dialog' })

    await user.click(opener)
    await screen.findByRole('dialog')
    expect(opener.isConnected).toBe(false)

    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(document.activeElement).not.toBe(opener)
  })
  it('falls back to a page-named target when the opener destroyed itself', async () => {
    const user = userEvent.setup()
    render(<SelfDestructingOpenerSheet withFallback />)

    await user.click(screen.getByRole('button', { name: 'Create and open' }))
    await screen.findByRole('dialog')
    // The opener is gone before the sheet even took focus.
    expect(
      screen.queryByRole('button', { name: 'Create and open' })
    ).not.toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Card action' })
      )
    )
  })

  it('ignores a fallback that resolves to nothing', async () => {
    const user = userEvent.setup()
    // Same flow, no fallback supplied: behaviour must be exactly as before.
    render(<SelfDestructingOpenerSheet withFallback={false} />)

    await user.click(screen.getByRole('button', { name: 'Create and open' }))
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(document.activeElement).not.toBe(
      screen.getByRole('button', { name: 'Card action' })
    )
  })
})
