# Manual visual QA checklist

**Why this exists.** Iteration 22 was a release-candidate hardening sprint, but browser automation
was unavailable (`list_connected_browsers` → `[]`; the Claude Chrome extension is not paired). Every
defect fixed in that sprint was one whose failure could be proven from arithmetic or structure.
Everything on *this* page is a judgement that genuinely needs eyes, and **has never been visually
verified**.

Run it with `pnpm dev`. Nothing here is known-broken — these are the open questions.

## Matrix

Prioritise **TR at 390px**, the highest known risk. Then EN 390, TR 1440, EN 1440. 834px if time.

| Viewport | Why |
|---|---|
| **390px** | Layout budget is **350px** of content (310px inside a `Card`, 278px inside a nested `p-4` panel) |
| 834px | Tablet; the `sm:`/`md:` breakpoints change hands here |
| 1440px | Content caps at `max-w-[1120px]` |

Each × `tr` / `en` × light / dark. Toggle language in Settings → Language, theme in Settings → Appearance.

## Global checks on every route

- [ ] **No horizontal page scroll at 390px.** `<main>` computes `overflow-x: auto`, so overflow shows
      a scrollbar rather than clipping. If you can scroll sideways, something exceeded 350px.
- [ ] Keyboard-only: `Tab` from the top reaches the skip link first, then nav, then content. Focus is
      always visible. No tab traps.
- [ ] Dialogs/sheets return focus to their trigger on close (`Esc` and the close button).
- [ ] With OS "reduce motion" on, nothing animates (a global `!important` rule handles this).

---

## Open questions — vertical density (never measured)

These are estimates from class analysis, not measurements.

- [ ] **`DocumentsHero`** (`/documents`) ≈420–460px tall at 390px. The 7 quick-filter chips wrap to
      **4 rows** at 310px. Does the hero eat the fold before any document is visible?
- [ ] **`ReadinessHero`** (`/dashboard`) ≈420px for a single number — the ring is a fixed **188px**
      (set via inline style, so no breakpoint applies). Should it shrink below `sm`?
- [ ] **`DepartureCheck`** (`/review?mode=departure`) ≈600–750px: 5 blocks + 3 separators. This view
      exists to be glanceable at the door. Is one screen of scroll acceptable?
- [ ] **`ReadinessRing` caption** — at `size=188` the inner text box gets ~156px. Does a long Turkish
      verdict wrap to 3 lines and crowd the percentage?

## Open questions — dark mode (arithmetic says OK, eyes may disagree)

- [ ] **`BAR_SEGMENTS` polarity inversion.** In the Documents/Dashboard readiness bar, `obtained`
      (`bg-primary/70`) is *lighter* than `requested` (`bg-info`) in light mode (L 0.672 vs 0.55) and
      *darker* in dark (0.530 vs 0.68). They are only 14° apart in hue and unlabelled inside the bar.
      Distinguishable in both themes, but the learned cue reverses. Is that confusing in practice?
- [ ] **`SegmentedControl` selected chip in dark.** Selected is `bg-card` (L 0.185) on a `bg-muted`
      track (L 0.225) — the selected segment is **darker** than the track, and `shadow-xs` is
      imperceptible at `--shadow-color: 264 40% 2%`. Does the selection still read as selected?
- [ ] **Borderless muted surfaces** are ΔL≈0.02 in *both* themes — effectively invisible:
      `ui/guidance-note.tsx:41` (`bg-muted/50`, a `role="note"` with no border) and
      `trip/CoverageSummary.tsx:56`. Should they gain a border?
- [ ] **`trip/DestinationCard.tsx:50`** `bg-primary/[0.02]` is a no-op tint (ΔL 0.009). The
      `border-primary/40` is doing all the work of marking the main destination. Remove or raise?
- [ ] Verify the new modal scrim: open any dialog/sheet in **dark** mode. It must *darken* the page.
      (It previously used `bg-foreground/25`, which lightened it — now `--overlay`.)

## Open questions — touch targets in the 24–44px band

All pass WCAG 2.5.8 AA (24px); none reach the 44px mobile guideline. Anything **below** 24px was
already fixed.

- [ ] Documents quick-filter chips ≈30px tall — the primary filter affordance on that page.
- [ ] `SegmentedControl` segments 28px (`sm`) / 32px (default).
- [ ] Mobile nav trigger (`Header.tsx`, `size-8` = 32px) — the only way to open navigation on a phone.

## Open questions — per route

- [ ] **`/timeline`** — the mode selector now scrolls horizontally inside its own track at 390px
      (3 segments measure ~447px EN / ~496px TR). Is that discoverable, or does it look cut off?
- [ ] **`/review`** — same control, 2 segments; TR measured ~334px vs 350px available.
- [ ] **`/documents`** — the **table** view offers 5 nowrap columns at 390px and will always scroll
      sideways inside its container. Should `table` be hidden below `md`, or should mobile default to
      `cards`?
- [ ] **`/settings`** — the mobile section rail scrolls horizontally with **8** sections and no fade
      or affordance. Are "About" and "Advanced" discoverable?
- [ ] **`/welcome`** — the `Stepper` renders two separate trees (compact bar below `lg`, vertical rail
      above). Check the compact bar with long Turkish step titles.
- [ ] **Wizards** (`/applicant`, `/trip`, `/employment`, `/finance`) — step navigation, progressive
      disclosure, and no horizontal scroll at 390px in Turkish.
- [ ] **`/sponsors`** — the editor `Sheet` is full-screen on mobile; check focus trap and Escape.
- [ ] **`/notes`** — newly moved onto `PageHeader`/`PageBody` this sprint. Confirm it now matches the
      other pages' rhythm.

## Known-latent (not currently rendering)

- `--chart-1` … `--chart-5` are defined only in `:root` with no `.dark` override. The first chart
  added will render light-mode colours on a dark canvas.
- `--sidebar-primary-foreground` is a literal `oklch(0.99 0 0)` with no `.dark` override; its sibling
  `--primary-foreground` *is* correctly flipped. Currently unused.

## Verified good (static analysis — no need to re-check unless something changes)

Zero hardcoded palette classes, hex/rgb literals, or colour inline styles anywhere in `src/`.
All six `StatusBadge` tones clear ≥0.38 ΔL in **both** themes, and every one is equal-or-better in
dark. No border token weakens in dark (the faintest border in the app is `--sidebar-border` in
*light*). Perfect i18n key parity (1884/1884) and all 47 plural bases complete in both locales.
`Table` self-wraps in `overflow-x-auto`. `Stepper`, `SettingsPage` and `SubmissionChecklist` are the
reference responsive implementations.

> A recurring finding worth remembering: **for this design system, light mode is usually the weaker
> theme, not dark.** `--muted`, `--accent`, `--border`, `--border-strong`, `--brand-subtle` and
> `text-muted-foreground` all separate from their surfaces better in dark.
