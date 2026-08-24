# Manual visual QA — status register

**What changed.** Iterations 20–22 could not open a browser, so this page was a list of 24
*speculations*. Iteration 23 drove the installed Chrome over the DevTools Protocol (Node built-ins
only, no new dependency) and finally looked at the running product. Iteration 24 closed the one
accessibility defect it left open. Every item below is marked **PASS**, **FIXED**, or **OPEN** — and
"OPEN" means genuinely unverified, not "probably fine".

Nothing here is speculation any more. Where a number appears, it was measured in Chrome 149 at that
exact viewport, theme and locale.

## Severity

These labels were used for two sprints before anyone defined them, which is how the phrase
"P1, shipped knowingly" got written down. It is now defined, and that phrase is a contradiction:

| | Meaning | Release |
|---|---|---|
| **P0** | Broken, unusable, or data-losing | **Blocks release** |
| **P1** | Violates a stated principle in [principles.md](./principles.md) — privacy, accessibility, i18n, determinism | **Blocks release** |
| **P2** | A real defect that degrades quality but violates no stated principle | Ships; tracked here |
| **P3** | Polish, or a judgement call with no single right answer | Backlog |

The P0/P1 line is deliberately not about how hard something is to fix. If a defect breaks a promise
the project has written down, it gates the tag.

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

> **QA methodology note — do not lose this.** *(Partly historical: dossiers now persist in IndexedDB
> (ADR-036), so a page load no longer wipes them. The rest still applies, and the note is kept
> because the failure signature is identical whenever the workspace happens to be empty.)* The
> dossier was in-memory only (ADR-006), so a full page
> load *wiped it* and every route silently rendered its empty state. A sweep that navigates with
> `Page.navigate` will report `h1: 0` on most routes and look like a catastrophic regression. Drive
> route changes **client-side** (`history.pushState` + a `popstate` event) after loading the example
> once. Likewise, two Chrome instances sharing one `--user-data-dir` corrupt each other's runs — the
> same `h1: 0` signature. Both were hit and diagnosed during this sprint.

---

## FIXED (evidence → change → re-measured)

Iteration 23 unless noted.

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

### FIXED — P1: dialogs and sheets did not return focus to their trigger

Closing with `Escape` dropped focus to `<body>`, so a keyboard user was dumped at the top of the
document and had to tab back through the whole page. Iteration 24 found the cause and fixed it.

**Root cause, read from `@radix-ui/react-dialog@1.1.19` on disk — not inferred.** Radix restores
focus to `context.triggerRef.current`, and `grep triggerRef` over that file shows the ref is written
from exactly one place: `<Dialog.Trigger>`. This app opens **11 of its 16 overlays controlled with no
Radix trigger**, because the opener is not a sibling button — `MobileNav` is opened by the header
hamburger in a different subtree, the document and sponsor panels by a **URL search param**, and the
import dialog by a **file-input change handler**. For all of those, `triggerRef.current` is `null`.

That alone would be harmless, because `FocusScope` captures `document.activeElement` itself on mount
and would restore it. The defect is that the modal close handler suppresses that fallback
*unconditionally* (lines 148–151):

```js
onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
  event.preventDefault();
  context.triggerRef.current?.focus();
}),
```

`preventDefault()` runs even with no trigger to focus, so FocusScope's
`focus(previouslyFocusedElement ?? document.body)` never executes and `?.focus()` no-ops. Nothing is
focused, the content unmounts, and the browser resets to `<body>`.

**Fix:** `src/components/ui/use-restore-focus.ts`, wired into `dialog.tsx`, `sheet.tsx` and
`alert-dialog.tsx`. It re-derives the value Radix already had — `onOpenAutoFocus` fires before focus
moves into the container, so `document.activeElement` there *is* FocusScope's
`previouslyFocusedElement` — and claims the close event so Radix's null-trigger branch never runs.
No timers, no per-page `.focus()`, no consumer changes.

**Verified in Chrome 149**, nine steps per overlay, trigger reached by `Tab` (not `.focus()`),
sampled at t+900ms and again at t+1500ms so a pass cannot be an exit-animation artifact:

| Overlay | Path | Cell | Escape close | Visible close |
|---|---|---|---|---|
| Dialog | `/documents` "Belge ekle" | 1440 light | ✅ trigger, `:focus-visible`, `outline solid 2px` | ✅ trigger |
| Sheet | `/sponsors` card "Sponsoru düzenle" | 1440 light | ✅ trigger, `:focus-visible`, `outline solid 2px` | ✅ trigger |
| Sheet | `MobileNav` — hamburger in `Header.tsx`, sheet in `AppLayout.tsx` | **390 dark** | ✅ trigger, `outline solid 2px` | — |
| AlertDialog | `/sponsors` "Sponsoru kaldır" | 1440 light | ✅ trigger, `outline solid 2px` | — |

Focus entered the overlay and the trap held (verified with two `Tab`s inside) in every case. The
`MobileNav` row is the hardest case in the app and the reason the fix lives in the primitives: its
opener and its sheet are in **completely different component subtrees**, so no Radix trigger is
possible. The AlertDialog row also confirms that composing rather than replacing left its own
`onOpenAutoFocus` intact — focus landed on "İptal" (Cancel) on open.

After a **mouse** close the restored trigger reports `focusVisible=false` and no ring. That is correct
browser behaviour — `:focus-visible` is not meant to fire for pointer interaction — not a defect.

Guarded by `src/tests/ui/overlay-focus-restore.test.tsx`, verified non-vacuous: with the restoration
neutered, 4 of its 5 cases fail.

---


### FIXED — P2: Sponsors first-create left focus on `<body>`

Closed in Iteration 25. The v1.0 note said the empty-state CTA "unmounts in the same commit"; the
mechanism is sharper than that. `SponsorsPage.handleAdd` dispatches `addSponsor` **and**
`openEditor` in one batched commit, so `model.count` flips 0 → 1 and the
`count === 0 ? <EmptyState/> : <grid/>` ternary swaps two *different element types* — React unmounts
the CTA rather than reconciling it. The header "Add" is gated `count > 0`, so during the empty state
the CTA is the only opener on the page.

Two consequences that only surfaced under measurement:

1. The CTA is detached **before `onOpenAutoFocus` runs**, so the shared hook never records a
   connected opener on this path — `document.activeElement` is already `<body>`.
2. `<body>` *is* `isConnected`, so an `isConnected`-only guard treats it as a valid opener and
   focuses it. That is precisely the outcome the hook exists to prevent, so `body` is now treated as
   "no opener".

**Fix:** `useRestoreFocusOnClose` gained an optional `restoreFocusFallback: () => HTMLElement | null`
— a callback, never a selector string, so the overlay primitives never learn what a sponsor is.
`SponsorsPage` owns the destination: a ref map of card edit buttons keyed by sponsor id, plus the
last-opened id (the URL param is cleared before Radix's close-autofocus step, so `selectedId` is
already `null` by then). Without a fallback, Dialog / Sheet / AlertDialog behaviour is unchanged.

**Verified in Chrome 149**, 1440 × TR, sampled at t+1100ms and t+1700ms:

| Path | CTA still in DOM | Focus after Escape | Ring |
|---|---|---|---|
| First-create (empty-state CTA) | **false** | "Sponsoru düzenle" on the new card | `:focus-visible`, `outline solid 2px` |
| Normal edit (opener survives) | n/a | original trigger — unchanged | `:focus-visible`, `outline solid 2px` |

Covered by `sponsors-deeplink.test.tsx` (both paths) and two cases in
`overlay-focus-restore.test.tsx`. Note the jsdom harness must swap **different element types** on the
two arms; same-type arms let React reuse the DOM node, the opener survives, and the test passes
without exercising the bug at all.

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
- **PASS — overlays trap focus on open, close on `Escape`, and return focus to their opener** —
  the last of those was the Iteration 24 fix; see FIXED above.

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

### FIXED — P1: the overlay close button had no visible focus indicator

Found while verifying the focus-restoration fix, and it is the *same defect class* as the P0 above —
it survived that sweep only because `focus-visible.test.ts` exempted `dialog.tsx` and `sheet.tsx` as
"containers". They are containers, but each renders a real close button inside itself.

That button carried `focus:outline-hidden` (killing the global ring) plus
`focus:ring-2 focus:ring-ring focus:ring-offset-2`, which resolved to a **fully transparent**
shadow. Measured in Chrome with the button keyboard-focused:

```
focusVisible: true   outline: NONE   boxShadow: rgba(0,0,0,0) 0px 0px 0px 0px
```

No indicator at all, on the one control every overlay has. The dead classes were removed so the
global `:focus-visible` rule applies; re-measured `outline: solid 2px` in both locales. The guard was
the real failure, so it was tightened: exempt files may keep a plain `outline-none` on the content
element (a focus trap should not ring itself) but may no longer suppress the ring **on focus**.

### FIXED — P1: the overlay close button was hardcoded English

`<span className="sr-only">Close</span>` in both `dialog.tsx` and `sheet.tsx`, plus a latent third in
`DialogFooter`. A Turkish screen-reader user heard "Close". `common:actions.close` already existed in
both locales. Verified in Chrome: **"Kapat"** in `tr`, **"Close"** in `en`.

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

---

## Cross-tab safety — real Chrome, two tabs (v1.1, ADR-037)

Driven through CDP against two real tabs sharing one browser profile and one IndexedDB, using
fictional data only. The scenario is scripted rather than clicked by hand so it can be repeated:
create → edit in A → observe in B → make B stale → let B write → resolve → rename → delete →
import → reload both.

**Making a tab genuinely stale.** With both tabs live, `BroadcastChannel` delivers and a clean tab
just catches up, which is the *good* path and proves nothing about safety. Tab B is therefore run a
second time with `BroadcastChannel` forced to `undefined` before any app code loads — the exact
state of a tab that missed the message, or of a browser that never had the API. Everything below
still held.

| Check | Result |
|---|---|
| Record carries `revision`, `storageVersion: 2` in real IndexedDB | PASS |
| Both tabs open the same dossier | PASS |
| A edits; clean B adopts it with no prompt and no conflict | PASS |
| Blindfolded B still hydrates (persistence never needed the channel) | PASS |
| **Stale B writes → A's data survives, revision unmoved** | **PASS** |
| B is told in plain language, and never blames a "sync" | PASS |
| B's own edit stays on screen — nothing discarded behind the user | PASS |
| "Open the saved version" clears the conflict and resumes autosave | PASS |
| Rename in A appears in B | PASS |
| Delete in A → B is told; stale B cannot resurrect the record | PASS |
| "Keep my version as a new dossier" writes a fresh id, never the deleted one | PASS |
| Import in A is discovered by B; both tabs agree after reload | PASS |
| No console errors in either tab | PASS |

**What this found.** Two real defects that no jsdom test would have caught:

1. **The notification channel was dead in development.** The `BroadcastChannel` was built in a
   `useMemo` and closed by a separate cleanup effect, so React 19's StrictMode remount closed the
   only instance the memo would ever produce. Writes stayed safe — revisions do that — but every
   cross-tab hint was silently lost. Now created and destroyed by the same effect, with a
   StrictMode regression test that fails against the old shape.
2. **A replaced dossier left stale values in mounted forms.** Form fields read their initial values
   once, at mount, so "Open the saved version" (and switching dossiers, which shipped in v1.1)
   changed the state without changing what was on screen. The page is now keyed on a `generation`
   counter that only a wholesale swap increments.

**390px, both languages, both themes.** The rename editor and the conflict banner were measured at
390 × 844 in TR and EN, light and dark: no horizontal overflow, no element extending past the
viewport, buttons stacking rather than truncating.

---

## Backup, recovery & session-only — real Chrome (v1.1, ADR-038/ADR-039)

Driven through CDP against real Chrome 149 and real IndexedDB, fictional data only. Scripted so it
can be repeated: create → autosave → reload → export → edit → export a *different* dossier →
session-only → promote.

| Check | Result |
|---|---|
| Dossier autosaves and survives a reload | PASS |
| A never-exported dossier says so | PASS |
| Export is recorded against the record and shown as "Backed up" | PASS |
| **Exporting does not bump `revision`** | **PASS** |
| **Exporting does not touch `updatedAt`** | **PASS** |
| Backup status survives a reload (it lives in the record, not in memory) | PASS |
| Editing after a backup reports "Changed since your backup on …" | PASS |
| Two dossiers keep independent backup history | PASS |
| Exporting a dossier you are *not* in backs it up | PASS |
| …and does not change which dossier is open | PASS |
| …and moves no revision or `updatedAt` on either record | PASS |
| A session-only dossier writes nothing to IndexedDB | PASS |
| The tab states plainly that it is not saved, at every width | PASS |
| Switching away asks first instead of discarding | PASS |
| "Save on this device" promotes with the work intact | PASS |
| Promotion creates exactly one record, under the id it already had | PASS |
| A promoted dossier starts with no export history | PASS |
| No console errors | PASS |

**A limitation worth stating rather than hiding.** A *full page load* discards a session-only
dossier and restores the previously persisted one. That is inherent — the whole point of
session-only is that nothing is written — and it is why the on-screen notice, with both escape
routes, matters more than any unload hook could. It also bit this harness: the first run drove
routes with `Page.navigate` and silently measured the wrong dossier. Drive session-only scenarios
**client-side** (`history.pushState` + `popstate`), exactly as the older note above says.

**Storage-failure recovery** is proven at the adapter/provider seam (an injected failing repository,
and a typed `StorageUnavailableError`), not in the browser: forcing a genuine quota or private-mode
refusal in headless Chrome would have meant hacking production code to fake it, which proves
nothing. Stated plainly rather than implied.

**390px, both languages, both themes** — `/dossiers`, Settings, the session-only notice and the
leave dialog: no horizontal overflow, nothing past the viewport, buttons stacking rather than
truncating. The leave dialog's action order was changed after looking at the screenshot: the footer
is `flex-col-reverse` on narrow screens, which had put the destructive "Discard and continue" at the
top of the stack, under the user's thumb.

---

## Returning-user journey — real Chrome (v1.1, ADR-040)

Three saved dossiers created through the real UI with distinguishable names and deliberately
different backup states (never exported / backed up / changed since backup), then a full reload.

| Check | Result |
|---|---|
| Reload `/` with three dossiers never lands in onboarding | PASS |
| …it lands on the dashboard of the dossier that was open | PASS |
| The heading names the dossier, not the person | PASS |
| The browser tab names the dossier | PASS |
| "Your dossiers" is a navigation entry | PASS |
| …and sits above Dashboard | PASS |
| The switcher marks the open dossier with `aria-checked`, not a hidden icon | PASS |
| Switching changes the heading | PASS |
| …and the tab title | PASS |
| …and leaves exactly one `h1` | PASS |
| Close the open dossier → reload → lands on `/dossiers` | PASS |
| …all three dossiers still there | PASS |
| …nothing auto-reopened (`activeDossierId` stays null) | PASS |
| An empty active-dossier page keeps its `h1` | PASS |
| …and offers "Open a saved dossier" | PASS |
| No console errors | PASS |

**The bug this closes.** Before: reload `/` → `/welcome`, headed *"Let's prepare your visa
application"*, every time, because the index route decided from the in-memory editor before
IndexedDB had answered. And Settings → "Close the open dossier" left a user with saved dossiers no
route to them at all, while the confirmation promised "you can open it again from the Dossiers page".

**Responsive.** 390 × 844 in TR and EN, light and dark, plus 1440 × 950 TR light and EN dark, over
the landing surface and `/dossiers`: no horizontal overflow, exactly one `h1` everywhere. Exercised
with a deliberately punishing 66-character Turkish title — *"Yunanistan Schengen kısa süreli turistik
başvuru dosyası — Eylül 2026"* — which wraps to three lines as the dashboard `h1` without crushing
the page or the header.

**Harness note.** `\s` inside an untagged JS template literal collapses to `s`, so a probe doing
`.replace(/\s+/g, ' ')` through `Runtime.evaluate` silently replaces every letter *s* with a space
("Dashboard" → "Da hboard"). Cosmetic in logging, but it made one check look like a failure. Escape
it as `\\s` in CDP-evaluated strings.

## v1.1.0 release verification — real Chrome against `vite preview`

The production build, served by `vite preview` on a fresh profile, driven over CDP. All storage
assertions read IndexedDB directly rather than trusting the interface.

### Workspace lifecycle

| Check | Result |
|---|---|
| An empty workspace lands on `/welcome` | PASS |
| Creating a dossier writes exactly one record | PASS |
| An edit survives a full reload | PASS |
| …and a returning user reloads straight into `/dashboard` | PASS |
| `document.title` carries route and dossier | PASS |
| An inline rename commits, survives a reload and is shown | PASS |
| …and the local name is nowhere inside the exported payload | PASS |
| Exporting a dossier records a backup timestamp | PASS |
| **A content write afterwards does not erase the backup mark** | PASS |
| Closing a *saved* dossier is not guarded — no friction | PASS |
| …the record is kept and the reopen pointer is cleared | PASS |
| A closed workspace lands on `/dossiers` | PASS |
| A session-only dossier writes nothing to storage, and says so | PASS |

### Storage format v1 → v2

A dossier created by the running build, then demoted to the previous storage format — deliberately
not a hand-written fixture, which proves only that the fixture was wrong.

| Check | Result |
|---|---|
| A v1 record hydrates and opens | PASS |
| Its first edit saves and heals it to `sv: 2, rev: 2` | PASS |
| …without fabricating a cross-tab conflict | PASS |
| A record from a *newer* build is never destroyed, and is surfaced | PASS |

### Two tabs

Tab B blindfolded (`BroadcastChannel` removed before any app code runs): safety must not depend on
a message arriving.

| Check | Result |
|---|---|
| The stale tab is refused, not allowed to overwrite | PASS |
| …and is told | PASS |
| The banner no longer claims "Nothing has been thrown away" | PASS |
| The reload action says what it discards | PASS |
| Reload-latest clears the conflict and adopts the stored version | PASS |
| …and the tab can save again afterwards | PASS |
| Switching away from a conflicted dossier is guarded, offering a fork | PASS |
| The fork is saved and neither version is lost (3 records, both payloads) | PASS |

### The leave guard (ADR-041)

| Check | Result |
|---|---|
| Storage refuses the write → closing is guarded, not silent | PASS |
| …the offer is "Export a backup" | PASS |
| …the destructive choice is explicit and destructive-styled | PASS |
| …initial focus is "Stay here", never the destructive action | PASS |
| …nothing is discarded while the dialog is up | PASS |
| Taking the destructive branch completes the close | PASS |
| …and focus lands on `main`, not `<body>` | PASS |
| …and the saved record was never deleted by any of it | PASS |
| Unsaved session-only work offers "Save on this device" | PASS |
| Deleting a dossier leaves focus somewhere real | PASS |

### Import

| Check | Result |
|---|---|
| A canonical v1.0 export imports as a *new* dossier, replacing nothing | PASS |
| A clean import reports no loss | PASS |
| A file with one unreadable document keeps the other two | PASS |
| …and says "1 item in that file could not be read and was left out." | PASS |
| …and that report survives the remount **and** a route change | PASS |

**The bug this last row closes.** The first implementation put the count in each entry point's own
state. It unit-tested green and did nothing in a real browser: a successful import swaps the
dossier, `AppLayout` remounts the page on `state.generation`, and the message went with it — the
pre-existing "Dossier loaded." was never visible either. The count now lives in `WorkspaceProvider`,
above the remount. **Only the browser found this.**

### Responsive

`/dossiers` at 390 × 844 in TR and EN, light and dark: no horizontal overflow, exactly one `h1`, no
raw translation key on screen, in all four combinations. No console errors or uncaught exceptions in
any scenario above.
