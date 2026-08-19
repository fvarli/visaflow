import * as React from 'react'

/**
 * Supplies a focus destination for the case where the element that opened an
 * overlay no longer exists when it closes.
 *
 * Deliberately a callback returning an element, never a selector string or an
 * id: the overlay primitives must not learn how any particular page identifies
 * its own content. The primitive knows only "the opener is unavailable — caller,
 * give me a target"; *what* that target means stays with the caller.
 */
export type RestoreFocusFallback = () => HTMLElement | null

/**
 * Returns focus to whatever opened an overlay when that overlay closes.
 *
 * ## Why this exists
 *
 * Radix restores focus to `context.triggerRef.current` — and that ref is
 * written from exactly one place, `<Dialog.Trigger>`. VisaFlow opens 11 of its
 * 16 overlays *controlled*, with no Radix trigger at all, because the thing
 * that opens them is not a sibling button: `MobileNav` is opened by the header
 * hamburger in another subtree, the document and sponsor panels are opened by a
 * **URL search param**, and the import dialog is opened by a **file-input
 * change handler**. For all of those `triggerRef.current` is `null`.
 *
 * That alone would be harmless — `FocusScope` captures `document.activeElement`
 * itself on mount and restores it on unmount. The defect is that Radix's modal
 * close handler suppresses that fallback *unconditionally*
 * (`@radix-ui/react-dialog@1.1.19`, lines 148–151):
 *
 * ```js
 * onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
 *   event.preventDefault();
 *   context.triggerRef.current?.focus();
 * }),
 * ```
 *
 * `preventDefault()` runs even when there is no trigger to focus, so
 * `FocusScope`'s own `focus(previouslyFocusedElement ?? document.body)` never
 * executes and `?.focus()` no-ops. Nothing receives focus, the content
 * unmounts, and the browser resets `document.activeElement` to `<body>` —
 * measured in Chrome, stable across 1.2s, so it is not an animation race.
 * A keyboard user is dropped at the top of the document every time they dismiss
 * a dialog. `docs/principles.md` §8 calls focus management a requirement.
 *
 * ## How it works
 *
 * We re-derive the value Radix already had. `onOpenAutoFocus` is dispatched by
 * `FocusScope`'s mount effect *before* focus moves into the container, so
 * `document.activeElement` at that instant is exactly the element `FocusScope`
 * captured as `previouslyFocusedElement`. On close we restore it and claim the
 * event, which — because `composeEventHandlers` runs the caller's handler first
 * and skips its own once `defaultPrevented` is set — means Radix's null-trigger
 * branch never runs.
 *
 * No timers, no stored DOM nodes in application state, no per-page `.focus()`.
 *
 * ## Deliberate limits
 *
 * If the opener is gone from the DOM by the time the overlay closes, the caller
 * may supply `restoreFocusFallback` to name a replacement destination. Without
 * one we still do **not** claim the event, and behaviour is exactly as Radix
 * defines it — guessing a target is worse than doing nothing.
 *
 * The motivating case is Sponsors: `handleAdd` creates a sponsor *and* opens the
 * sheet, so the empty-state button that was clicked unmounts in the same commit
 * as the card grid replaces it. It is already detached before `onOpenAutoFocus`
 * runs, so `openerRef` never holds a connected node on that path — no amount of
 * generic bookkeeping can recover it, which is why the destination has to come
 * from the page that knows what was created.
 *
 * A caller may still opt out entirely by calling `preventDefault()` in its own
 * `onCloseAutoFocus`; its handler runs first and wins.
 */
export function useRestoreFocusOnClose(
  onOpenAutoFocus?: (event: Event) => void,
  onCloseAutoFocus?: (event: Event) => void,
  restoreFocusFallback?: RestoreFocusFallback
): {
  onOpenAutoFocus: (event: Event) => void
  onCloseAutoFocus: (event: Event) => void
} {
  const openerRef = React.useRef<HTMLElement | null>(null)

  const handleOpenAutoFocus = React.useCallback(
    (event: Event) => {
      const active = document.activeElement
      openerRef.current = active instanceof HTMLElement ? active : null
      onOpenAutoFocus?.(event)
    },
    [onOpenAutoFocus]
  )

  const handleCloseAutoFocus = React.useCallback(
    (event: Event) => {
      // The caller goes first and may take the event over completely.
      onCloseAutoFocus?.(event)
      if (event.defaultPrevented) return

      const opener = openerRef.current
      openerRef.current = null

      // Two ways to have no usable opener, and both must reach the fallback:
      //
      //  - the recorded node was unmounted while the overlay was open, so it is
      //    no longer `isConnected`;
      //  - the opener was *already* gone when the overlay took focus, in which
      //    case `document.activeElement` was `<body>`. Body is connected, so it
      //    passes an `isConnected` check while being exactly the outcome this
      //    hook exists to avoid — treat it as "no opener", never as a target.
      const hasOpener =
        opener !== null && opener.isConnected && opener !== document.body

      const target = hasOpener ? opener : (restoreFocusFallback?.() ?? null)

      if (!target?.isConnected) return

      event.preventDefault()
      target.focus()
    },
    [onCloseAutoFocus, restoreFocusFallback]
  )

  return {
    onOpenAutoFocus: handleOpenAutoFocus,
    onCloseAutoFocus: handleCloseAutoFocus,
  }
}
