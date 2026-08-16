# Manual visual QA — status register

**What changed.** Iterations 20–22 could not open a browser, so this page was a list of 24
*speculations*. Iteration 23 drove the installed Chrome over the DevTools Protocol (Node built-ins
only, no new dependency) and finally looked at the running product. Every item below is now marked
**PASS**, **FIXED**, or **OPEN** — and "OPEN" means genuinely unverified or knowingly shipped, not
"probably fine".

Nothing here is speculation any more. Where a number appears, it was measured in Chrome 149 at that
exact viewport, theme and locale.

## Coverage actually run

| Cell | Routes | Result |
|---|---|---|
| 390 × TR × light | 14/14 | no horizontal overflow, exactly one `h1` |
| 390 × TR × dark | 14/14 | no horizontal overflow, exactly one `h1` |
| 390 × EN × light | 14/14 | no horizontal overflow, exactly one `h1` |
| 390 × EN × dark | 14/14 | no horizontal overflow, exactly one `h1` |
| 834 × TR × light | 14/14 | no horizontal overflow, exactly one `h1` |
| 1440 × TR × light | 14/14 | no horizontal overflow, exactly one `h1` |
| 1440 × EN × dark | 14/14 | no horizontal overflow, exactly one `h1` |

Not run: 1440 × TR × dark, 1440 × EN × light, 834 × dark. Desktop has 3.7× the content budget of
390px and both themes and both locales were exercised there; the risk sits at 390px, which has full
2 × 2 coverage.

> **QA methodology note — do not lose this.** The dossier is in-memory only (ADR-006), so a full page
> load *wipes it* and every route silently renders its empty state. A sweep that navigates with
> `Page.navigate` will report `h1: 0` on most routes and look like a catastrophic regression. Drive
> route changes **client-side** (`history.pushState` + a `popstate` event) after loading the example
> once. Likewise, two Chrome instances sharing one `--user-data-dir` corrupt each other's runs — the
> same `h1: 0` signature. Both were hit and diagnosed during this sprint.

---

## Fixed this sprint (evidence → change → re-measured)

- **FIXED — dangling breadcrumb separator below 640px.** `Header.tsx` rendered the `/` separator
  unconditionally while the crumb after it was `hidden sm:inline`. Every route at 390px showed a
  slash pointing at nothing. Separator and crumb now share one visibility gate.
- **FIXED — page title truncated to ~59px at 390px.** The header action cluster (Export label +
  language label) crushed the title: "Belgeler" rendered as "Belg…", and the longest Turkish title,
  "Tutarlılık kontrolleri" (22 chars, ~165px), was unreadable. The title is the *only* page
  indicator once the sidebar is hidden. Export and language collapse to icon-plus-`aria-label`
  below `sm`; all 13 titles now render in full.
- **FIXED — `ThemeToggle` shipped hardcoded English** ("Light" / "Dark" / "System", plus
  `aria-label="Change theme"`) in a Turkish-default product. The `theme.*` keys already existed in
  both locales and were simply never wired up.
- **FIXED — Settings mobile rail hid half the page.** The rail scrolled horizontally with **8**
  sections, no fade, no scrollbar and no partial-item hint; "Hakkında" and "Gelişmiş" were
  undiscoverable. It now wraps — all 8 visible, absorbed by existing dead space on that page
  (`docH` unchanged at 844).
- **FIXED — Timeline mode switcher read as clipped.** Measured TR@390: track `clientW 350`,
  `scrollW 511` — 161px hidden, so the third mode was entirely off-screen and cut mid-glyph.
  `SegmentedControl` now wraps instead of scrolling. This was the **only** overflowing control in the
  app: Review (295px), Documents and Settings all fit inside 350px and are visually unchanged.
- **FIXED — `DocumentsHero` broke its own headline.** `"%64 hazır"` wrapped with "hazır" stranded on
  line 2, in both themes, because the number and the summary shared a `justify-between` row. Stacked
  below `sm`.
- **FIXED — the example dossier presented itself as a failed application.** Dated Feb–Apr 2025, it
  read as **547 days overdue** against today: "Randevu tarihiniz geçti", overdue badges across
  Timeline, and "Seyahat tarihi geçmişte" offered as the recommended next step. This is the primary
  onboarding path. Trip and appointment dates moved forward two years; evidence-already-obtained
  dates (bank statement, issued/requested/received) moved forward eighteen months so they stay in the
  recent past. The dossier now reads as a healthy application ~6 months from its appointment.

### FIXED — P0: no visible keyboard focus indicator on any primitive control

The most serious defect found this sprint, and invisible to every static pass that preceded it.

`index.css` defines one focus ring in `@layer base`. Tailwind v4 orders utilities **after** base, so
the `outline-none` utility on `Button`, `Input`, `Textarea`, `Checkbox`, `Select` trigger and
`Accordion` trigger silently beat it. Measured over CDP, the split was exact:

| Element | `:focus-visible` | `outline-style` |
|---|---|---|
| shadcn-derived control (`data-slot` present) | `true` | **`none`** |
| hand-written `<button>` on the same page | `true` | `solid 2px` |

Keyboard users had **no** focus indicator on the export button, language and theme menus, "Belge
ekle", the search input or any of the three filter selects — while the ad-hoc filter chips beside
them highlighted correctly. WCAG 2.4.7 Focus Visible (AA).

`outline-none` was removed from those six control primitives. Containers (`dialog`, `sheet`,
`popover`, `scroll-area`) and menu items keep theirs — a focus trap is not a control, and menu items
indicate focus with `focus:bg-accent`. Re-measured: **37/37 controls across `/applicant`,
`/documents` and `/settings` now draw the ring.** Guarded by `src/tests/ui/focus-visible.test.ts`,
which was itself checked against a deliberately reintroduced regression.

---

## OPEN — known defect, shipped knowingly

### P1 — dialogs and sheets do not return focus to their trigger

Closing with `Escape` drops focus to `<body>`, so a keyboard user is dumped at the top of the
document and must tab back through the whole page.

Measured on `/documents` ("Belge ekle") and `/sponsors`, both light and 1440px, sampled at t+0,
t+400ms and t+1200ms — stable at `BODY` every time, so it is not an animation race. On `/documents`
the trigger **is still in the DOM** (`triggerStillInDom: true`) and focus is still not restored.

Dialogs are fully controlled (`open` / `onOpenChange`) with no `DialogTrigger`, which is the likely
reason Radix's restore does not fire. Not fixed here: the correct fix is real focus-management work
in the shared `DialogContent` / `SheetContent`, and shipping an unverified focus hack at the end of a
QA sprint is worse than shipping a documented defect. Everything else about the overlays is correct —
they trap focus on open, close on `Escape`, and the scrim is right in both themes.

**This is the one accessibility caveat on the v1.0 recommendation.**

---

## PASS — verified, no change needed

### Vertical density (previously estimates; now measured `main.scrollHeight` at 390px TR)

| Surface | Estimated | Measured | Verdict |
|---|---|---|---|
| `DocumentsHero` | 420–460px | ~1000px to the first document | **PASS with note** — tall, but the readiness bar, the five labelled counts and the next-document card are all genuinely useful; nothing is hidden |
| `DepartureCheck` | 600–750px | 2130px | **PASS with note** — 2.5 screens, not "glanceable at the door"; see P2 below |
| `ReadinessHero` | ~420px | ring 188px, next action at ~1340px | **PASS with note** — see P2 below |
| `ReadinessRing` caption | might wrap to 3 lines | 2 lines ("Toplanacak belgeler var"), uncrowded | **PASS** |

### Dark mode

- **PASS — the modal scrim darkens.** Measured live: overlay `oklch(0.09 0.01 264 / 0.6)` against
  body `oklch(0.145 0.007 264)`. The `--overlay` token is correct; the old `bg-foreground/25` would
  have lightened the page.
- **PASS — `BAR_SEGMENTS` polarity inversion is a non-issue.** The lightness relationship between
  `obtained` and `requested` does reverse between themes, but the bar is never read alone: the five
  labelled, icon-bearing counts sit directly beneath it, and segment *order* is fixed. Confirmed by
  eye in both themes.
- **PASS — the selected `SegmentedControl` chip reads as selected in dark**, despite being darker
  than its track (checked on Settings → Tema and the Timeline switcher).
- **PASS — borderless `bg-muted` surfaces are legible** in both themes (`GuidanceNote` on
  `/employment`, the disclaimer on `/settings`). Low contrast is the intent; they are supporting
  notes, not controls.

### Keyboard

- **PASS — `Tab` from a true document start reaches the skip link first** ("İçeriğe geç"), and it is
  the one element that already drew a visible ring before the P0 fix.
- **PASS — tab order follows visual order** with no traps, across `/applicant`, `/documents`,
  `/settings`.
- **PASS — overlays trap focus on open and close on `Escape`.** (Focus *return* is the P1 above.)

### Per route

- **PASS — `/review` segmented control.** Predicted ~334px vs 350px available; measured 295px.
- **PASS — `/settings`.** All 8 sections now visible (fixed above).
- **PASS — `/timeline`.** All 3 modes now visible (fixed above).
- **PASS — wizards** (`/applicant`, `/trip`, `/employment`, `/finance`). One step at a time, so the
  short `docH` (844) is correct, not a broken render. No overflow in Turkish at 390px.
- **PASS — `/notes`** matches the other pages' `PageHeader`/`PageBody` rhythm.
- **PASS — `/welcome`** compact stepper with long Turkish titles.
- **PASS — touch targets.** Every tab stop measured ≥32px tall. Still short of the 44px mobile
  guideline, but above WCAG 2.5.8 AA (24px) everywhere.

---

## OPEN — P2/P3, documented not fixed (would be redesign, not polish)

- **P2 — `/review?mode=departure` is 2130px at 390px.** It exists to be checked at the door and is
  2.5 screens deep. Reducing it means deciding what a departure check omits — a product decision, not
  CSS.
- **P2 — the dashboard's recommended next action sits below the fold at 390px.** The 188px ring
  (fixed inline, no breakpoint) plus greeting, two buttons and a three-line disclaimer push it to
  ~1340px. Shrinking the ring below `sm` is the obvious lever.
- **P2 — the readiness verdict appears three times on one dashboard screen**: page eyebrow, inside
  the ring, and as the hero title ("Kalan zorunlu belge: 4"). Correct, but repetitive.
- **P3 — zero-count chips render** ("0 Güncellenmeli" on `/documents`). Arguably honest inventory;
  arguably noise.
- **P3 — `/review` is 6564px at 390px.** Expected for a full review, but it is eight phone screens.
- **P3 — `country-combobox.tsx` keeps `outline-hidden`** on its in-popover search field. It is
  auto-focused as the only control in an open popover, so "where am I?" never arises — but it is the
  one control deliberately left outside the focus-ring guard.

## Known-latent (still true, still not rendering)

- `--chart-1` … `--chart-5` are defined only in `:root` with no `.dark` override. The first chart
  added will render light-mode colours on a dark canvas.
- `--sidebar-primary-foreground` is a literal `oklch(0.99 0 0)` with no `.dark` override; its sibling
  `--primary-foreground` *is* correctly flipped. Currently unused.

## Verified good (static analysis, unchanged)

Zero hardcoded palette classes, hex/rgb literals, or colour inline styles anywhere in `src/`. All six
`StatusBadge` tones clear ≥0.38 ΔL in **both** themes. No border token weakens in dark. Perfect i18n
key parity and all 47 plural bases complete in both locales. `Table` self-wraps in `overflow-x-auto`.

> A recurring finding worth remembering: **for this design system, light mode is usually the weaker
> theme, not dark.** The browser pass did not contradict this.
