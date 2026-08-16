import { describe, it, expect } from 'vitest'

/**
 * Guards the app's single focus system.
 *
 * VisaFlow paints exactly one focus ring, from a `:focus-visible` rule in
 * `@layer base` in `index.css`. Tailwind v4 orders utilities *after* base, so
 * an `outline-none` / `outline-hidden` utility on a control silently wins and
 * the control ends up with no visible keyboard focus indicator (WCAG 2.4.7
 * Focus Visible, AA).
 *
 * That is not hypothetical: it shipped. Measured in Chrome over CDP, every
 * shadcn-derived control — Button, Input, Select trigger, dropdown triggers —
 * reported `:focus-visible` matching with `outline-style: none`, while
 * hand-written buttons on the same page drew the ring correctly. Keyboard
 * users had no focus indicator on the app's primary controls.
 *
 * jsdom does not resolve cascade layers, so this cannot be asserted from a
 * rendered tree. It is asserted against the sources instead, read through
 * Vite's `?raw` loader so the test needs no Node type definitions.
 */

const UI_SOURCES: Record<string, string> = import.meta.glob(
  '../../components/ui/*.tsx',
  { query: '?raw', import: 'default', eager: true }
)

/** Primitives a keyboard user focuses directly. These must never suppress it. */
const CONTROLS = [
  'button.tsx',
  'input.tsx',
  'textarea.tsx',
  'checkbox.tsx',
  'accordion.tsx',
  'segmented-control.tsx',
]

/**
 * Containers and menu items may keep `outline-hidden`: a focus-trap container
 * is not a control, and menu items indicate focus with `focus:bg-accent`.
 * `select.tsx` holds both — its trigger is a control, its items are not — so it
 * is checked by section rather than as a whole file.
 */
const CONTAINER_EXEMPT = [
  'dialog.tsx',
  'sheet.tsx',
  'popover.tsx',
  'scroll-area.tsx',
]

const SUPPRESSORS = /outline-none|outline-hidden/

/**
 * Comments are stripped before matching: several of these files *discuss*
 * `outline-none` in a note explaining why it must not come back, and the guard
 * must read the classes, not the prose.
 */
function read(file: string): string {
  const key = Object.keys(UI_SOURCES).find((path) => path.endsWith(`/${file}`))
  if (!key) throw new Error(`no such ui source: ${file}`)
  return (UI_SOURCES[key] ?? '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
}

describe('focus visibility', () => {
  it.each(CONTROLS)('%s does not suppress the global focus ring', (file) => {
    expect(read(file)).not.toMatch(SUPPRESSORS)
  })

  it('the Select trigger keeps its ring while Select items may opt out', () => {
    const source = read('select.tsx')
    const trigger = source.slice(
      source.indexOf('function SelectTrigger'),
      source.indexOf('function SelectContent')
    )
    expect(trigger).not.toMatch(SUPPRESSORS)
    // The item still highlights via `focus:bg-accent`, so it is allowed to.
    expect(source).toMatch(/focus:bg-accent/)
  })

  // The other half of the invariant — that `index.css` still defines the ring
  // in `@layer base` — is deliberately not asserted here: Vitest stubs CSS
  // imports, so the stylesheet reads back empty and the assertion would pass
  // vacuously. It is covered by the CDP focus sweep documented in
  // `docs/manual-qa.md`.

  it('exempt containers are containers, not controls', () => {
    // A guard on the guard: if one of these ever becomes focusable-as-a-control
    // it must be moved into CONTROLS rather than left silently exempt.
    for (const file of CONTAINER_EXEMPT) {
      expect(read(file)).not.toMatch(/data-slot="(button|input|checkbox)"/)
    }
  })
})
