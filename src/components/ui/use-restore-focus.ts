import * as React from 'react'

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
 * If the opener is gone from the DOM by the time the overlay closes, we do
 * **not** claim the event and behaviour is left exactly as Radix defines it. It
 * is better to leave one path unchanged than to guess at a replacement target.
 * The known case is Sponsors: `handleAdd` creates a sponsor *and* opens the
 * sheet, so the empty-state button that was clicked unmounts in the same commit
 * as the card grid replaces it.
 *
 * A caller may still opt out entirely by calling `preventDefault()` in its own
 * `onCloseAutoFocus`; its handler runs first and wins.
 */
export function useRestoreFocusOnClose(
  onOpenAutoFocus?: (event: Event) => void,
  onCloseAutoFocus?: (event: Event) => void
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

      // `isConnected` covers the opener being unmounted while the overlay was
      // open — restoring focus to a detached node would silently land on
      // `<body>` anyway, and is indistinguishable from doing nothing.
      if (!opener?.isConnected) return

      event.preventDefault()
      opener.focus()
    },
    [onCloseAutoFocus]
  )

  return {
    onOpenAutoFocus: handleOpenAutoFocus,
    onCloseAutoFocus: handleCloseAutoFocus,
  }
}
