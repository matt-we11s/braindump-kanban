# Farm Kanban — Critique + Audit (review only)

Mode: **Operate**. Source: `main` @ local clone `/workspace/braindump-kanban-git` (pulled ff-only, already up to date). Live: https://matt-we11s.github.io/braindump-kanban/ (15 Oct 2026, ~10:15 CT).
I made no repo edits, commits, or deploys. Playwright blocked every non-GET request and every `?payload=` JSONP write, and none fired. Data was read only from the Apps Script endpoint (43 tasks).

Screenshots (`/workspace/kanban-review/`): `before-desktop.png`, `before-desktop-full.png`, `before-desktop-focus.png`, `before-desktop-edit-modal.png`, `before-mobile.png`, `before-mobile-edit-modal.png`, `before-mobile-townrun.png`, `before-mobile-settings.png`, `before-mobile-sun.png`, `before-mobile-sync-error.png`.

Line numbers refer to `index.html` (`braindump-kanban.html` is an identical copy).

## P0 — broken / blocking
1. **Primary green buttons fail contrast in dark theme.** `#ecfdf5` on `#10b981` = **2.41:1**. Normal text needs 4.5:1. This affects "Need supplies — tap when bought", Save Task, New, active chips, active status buttons and the install banner (L28–29, L82–86, L98, L123, L125). Fix: use a darker fill (e.g. emerald-700 `#047857`, 5.5:1 with white, which the sun theme already uses) or dark text on the green.
2. **Mobile card status row is clipped, and the FAB covers it.** At 390px the 4-column status grid (L770) is wider than the card. "Done" is cut off and sits under the + FAB (`before-mobile.png`). Fix: let the row wrap to 2×2 or make it a segmented control that fits the card. Add bottom padding equal to the FAB height (already `pb-24` on the list, but the FAB also overlaps the first card's controls).
3. **Modals are not real dialogs.** Esc does not close them (verified: still open after Esc on both sizes). There is no `role="dialog"`/`aria-modal`, no focus move into the dialog, no focus trap, and focus is not returned when it closes (L225–339, `openTaskModal` L904). Keyboard and screen-reader users can tab into the board behind. Fix: use `<dialog>` with `showModal()`, which gives Esc, inert background and focus handling.
4. **Board offers no keyboard path for moving tasks except the tiny buttons, and drag isn't announced.** That path works, so this is borderline P1. The bigger blocker: icon-only buttons (theme, town run, sync, settings, edit, modal close; L156–164, L229, L304, L762) rely on `title` only. None has an `aria-label`, so they get no accessible name on mobile screen readers. Fix: add `aria-label` to each icon-only button and `aria-hidden` to the icons.

## P1 — significant usability / accessibility
5. **Global focus ring is the browser default 1px auto outline**, which is nearly invisible on 2px `#334155` borders (`before-desktop-focus.png`; computed outline 1px, no box-shadow). Fix: `:focus-visible { outline: 3px solid var(--sky); outline-offset: 2px }`.
6. **Town-run badge: white on `#fb923c` = 2.26:1** at 10px font (L159). Fix: dark text (`#1a1408`) or a darker orange.
7. **Form labels aren't tied to their inputs.** No `for`/`id` pairs (L234–286, L318), so tapping a label does nothing and screen readers announce unlabeled fields. Search and the 3 filter selects have no labels at all (L186–191), only a placeholder or their first option. Fix: add `for=`, plus visually hidden labels or `aria-label` for search and filters.
8. **Card borders and dividers are 1.95:1** (`#334155` on `#020617`), below the 3:1 non-text minimum. Card and button edges blur outdoors. Fix: raise `--border` to ~`#64748b` (≈3.9:1).
9. **Sync state is easy to miss.** The status pill is 11px text (L149), the green dot pulses forever and shows the same colour in every state (L148), and the default text "Offline Caching Active" shows before JS runs. A failed sync is only red 11px text (`before-mobile-sync-error.png`: "Sync failed: Could not load sheet script"), with no retry button and no `aria-live`. Fix: `role="status" aria-live="polite"`, colour the dot by state, give the error a visible banner with a Retry button, and phrase errors as recovery ("Couldn't reach the sheet — your changes are saved on this phone. Retry").
10. **Install banner is always visible in a browser and eats ~90px on mobile** (`before-mobile.png`). It shows even when `beforeinstallprompt` never fires (L511), e.g. on iOS Safari/desktop, and its "Delete old icon" advice is irrelevant there. Fix: show it only after `beforeinstallprompt`, or once, then keep the instructions in Settings only.
11. **Mobile header truncates the app name** ("Farm Brain…") and squeezes the status into 3 lines (`before-mobile.png`). Fix: drop the `v.0` pill and task count on small screens, or move the status under the header row.
12. **Filter selects truncate on mobile** ("All Subjec", "All Priorit", "All Suppli"). Fix: put them in a horizontal scroll row with intrinsic width, or a single "Filters" sheet.
13. **Filter chips don't show which one is active.** `setFilter` (L787) never adds `.active` or `aria-pressed`, and "Need Supplies" opens Town Run instead of filtering, which is inconsistent with its siblings (L177). Also, "Total" doesn't change with search or filters. Fix: toggle `aria-pressed` and an active style, and make the behaviour consistent.
14. **Mobile tabs** are plain buttons with no `role="tablist"`/`aria-selected` (L669–677). Text is 10px (L201). Fix: proper tab semantics and ≥12px.
15. **Delete has no undo,** only a native `confirm()` (L1001). The sheet delete failure is swallowed silently (L1007 `.catch(()=>{})`), so the task vanishes locally but stays in the sheet and comes back on the next pull. Fix: optimistic delete with a 5s Undo toast, and surface failures.
16. **Merge can resurrect old or seed tasks.** On first load the 16 hard-coded `DEFAULT_TASKS` (L366–383) are seeded locally. `mergeTasks` (L1082–1084) keeps every local task not matched in the remote list, so tasks deleted or renamed in the sheet live on locally forever. Fix: track a `synced` flag and drop clean, unmatched local tasks after a successful pull. (App-side only; no sheet change needed.)

## P2 — polish
17. **Emoji/Unicode as icons** (✓ / ⚠ in the supplies button, L768). This mixes with the Lucide icons. Fix: use Lucide `check`/`alert-triangle`.
18. **Coloured 8px `border-left` on urgent cards** (L124). This is a craft-floor anti-pattern, and the "URGENT" badge already carries the meaning. Fix: drop the side stripe or use a 2px full urgent border.
19. **Sun theme uses a hard offset shadow** `0 4px 0 #1a1408` (L48). This is a craft-floor refusal unless the look is deliberately neobrutalist. If it is deliberate, keep it and document it; otherwise use a soft offset shadow.
20. **Card density is high.** Every card repeats a full-width supplies button and 4 status buttons, so only about 1 card fits per mobile screen (`before-mobile.png`). Fix: collapse the status row behind a "Move" control, or show it only on the expanded card. Make supplies a compact toggle chip.
21. **Uppercase micro-labels at 11px** in the forms (L234+), and 12px uppercase column headings. Fix: 12–13px sentence case.
22. **Copy is inconsistent.** "Active" vs "inprogress", "Need Supplies" vs "Needed" vs "Town Run", and "Raw Brain Dump Note"/"Push dirty tasks" are jargon. The settings modal exposes dev instructions (paste Apps Script, redeploy) to everyday use. Fix: move the developer section behind an "Advanced" disclosure.
23. **No loading state on first load.** Seed or cached data shows instantly as if it were live, then reflows to 43 tasks after about 3–6s. Fix: show "Updating from sheet…" and keep layout stable.
24. **"Reset to Default"** (L1053) replaces real data with August seeds and marks them dirty, so the next sync pushes 16 stale tasks to the sheet. Fix: remove it or rename it to "Clear local copy", without dirtying.
25. **The empty column says only "No tasks"** (L734). Fix: add a hint per column (e.g. "Drag a task here or tap + to add").
26. **Hard-coded category/effort options** (L262–279). `fetchSheetOptions` only syncs status, priority and subject. If the sheet's validation lists differ, the app can write values the sheet rejects. Fix: read these from the options endpoint too (read-only use of the existing validation; the sheet itself does not change).

## P3 — nice to have / performance
27. **Tailwind Play CDN in production** (L16). It runs a JIT compiler in the browser, the CDN warns against production use, and it slows first paint. **`lucide@latest` from unpkg** (L18) is unpinned, so a breaking release could kill all icons. Fix: build static Tailwind CSS and pin lucide to a version. Also precache these assets in `sw.js` (currently only runtime-cached, so the first offline launch may have no styles).
28. **`lucide.createIcons()` runs over the whole document on every render** (L741). Fix: scope it to new nodes.
29. **`sw.js` caches every GET** (L45–55), including Apps Script reads and the CDN. That's fine, but the cache is unbounded. Fix: limit to same-origin + pinned CDNs.
30. **Two identical manifests** (`manifest.json` and `manifest.webmanifest`). Fix: keep one. The manifest has no `screenshots` field (needed for the richer install UI).
31. **No `prefers-reduced-motion`** handling for the pulsing dot, the spinning sync icon or the rotated drag ghost (L148, L110).
32. **No `color-scheme` meta or CSS.** Native selects and scrollbars render light-styled in the sun theme. Fix: add `color-scheme: dark`/`light` per theme.
33. **Keyboard shortcuts for power use**: `/` for search, `n` for a new task.

## Sheet constraint (off-limits)
None of the fixes above need a change to the Google Sheet. Item 26 reads the sheet's existing validation lists through the options endpoint. **Do not add, rename or reorder tabs or columns, and do not change data validation to fit any recommendation.** If a fix ever seems to need that (e.g. a "deleted" column for item 16, or new category values), it is **off-limits**; solve it in the app or in local storage instead. `apps-script.js` changes would need a redeploy, which this review did not do.
