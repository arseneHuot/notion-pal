# Bugs

Reported during automated and manual testing. Each entry includes a timestamp, severity, repro steps, expected behavior, and current status (open / wip / fixed).

Severity: P0 (blocker) · P1 (major) · P2 (minor) · P3 (nit).

---

## 2026-05-12 — Initial smoke test

### B-001 — Hover handle is always invisible until hover (P3, fixed)
- The drag handle and "+" buttons only appear on hover. On small screens or touch this is hard to discover.
- Fix: add subtle persistent visibility or expose via long-press / context menu later.

### B-002 — Slash menu does not strip the "/" prefix when inserting an "insert" block (P2, fixed)
- Steps: type "/" then "image" and select Image; the leading "/image" text remains in the previous block.
- Expected: when converting/inserting, clear the block content (or remove the "/query" prefix at minimum).
- Fix: handleSlashSelect now clears `ref.current.innerHTML` before applying the new block type.

### B-003 — Slash menu propagates ArrowDown/Up only via window.addEventListener with capture; conflict with native form nav (P2, open)
- Sometimes the slash menu intercepts keys outside the editor. Need to scope keyboard handler to focused contenteditable.

### B-004 — Numbered list resets to 1 after a non-numbered block (P2, open)
- Visible because NumberPrefix counts only the consecutive run. Spec says numbered lists should be grouped — but Notion-style we want per-level numbering. Acceptable for now.

### B-005 — Stale Supabase auth state may transiently log a render-loop warning on the first load (P3, fixed)
- Mitigated by idempotent `initializeForUser` and id-equality guard in `useAuth.onAuthChange`.

### B-006 — `useStore` selector hook recreates a new array each render, which causes Object.is mismatch in useSyncExternalStore (P0, fixed)
- Switched to manual subscribe + shallowEqual cache so selectors returning Object.values/filter results don't re-render every cycle.

## 2026-05-12 — Iteration 1 testing pass

### B-007 — Calendar uses UTC ISO date as key but grid uses local dates (P1, fixed)
- Steps: load a calendar view; observe which day is highlighted as "today".
- On 12 May 2026 evening in CEST timezone, the calendar highlights 13 May because `keyForDate` uses `toISOString().slice(0, 10)` which converts to UTC.
- Expected: today's local date should match the highlighted cell.
- Fix: replace `keyForDate` in CalendarView (inline) and app.calendar route with a local-date formatter.

### B-008 — Empty contenteditable doesn't show the data-placeholder text (P2, fixed)
- Steps: focus an empty paragraph block.
- Expected: a faded "Type / for commands" hint, like Notion.
- Fix: add CSS `[contenteditable][data-placeholder]:empty::before { content: attr(data-placeholder); color: var(--muted-foreground); pointer-events: none; }`.

### B-009 — Inline toolbar disappears on selection change while clicking a button on the toolbar itself (P2, open)
- Steps: select text → toolbar appears → click Bold.
- The selectionchange fires while clicking, toolbar disappears before the mouseDown triggers. Mitigated by `onMouseDown preventDefault` but can still race.

## 2026-05-12 — Tester batch 1 findings (manual log on behalf of background agent)

### B-100 — Clicking the "Calendar" view tab inside an inline database may route to /app/calendar instead of switching the database view (P1, open)
- Steps: open a page with an inline database that has a Calendar view → click the "📅 Calendar" tab in the view bar.
- Observed: the page navigated to /app/calendar (the standalone Calendar page) instead of switching the in-page database view.
- Expected: view tab should only call setActiveViewId(viewId).
- Hypothesis: event bubbles up to a parent button OR there is a click handler on the chevron icon that confuses the page navigation. Inspect InlineDatabase.tsx and confirm only one onClick fires on the tab button.

## 2026-05-12 14:38 — Test agent batch 2

### B-200 — Direct navigation to /app/home renders "Not Found" while the Home sidebar button routes to /app (P2, open)
- Steps: in the address bar set location to `http://localhost:8080/app/home`.
- Observed: main area shows "Not Found".
- Expected: either redirect `/app/home` to `/app`, or use `/app/home` as the Home URL consistently. The sidebar Home button navigates to bare `/app`.
- Discoverability issue if a user bookmarks `/app/home` or refreshes after the click.

### B-201 — Markdown shortcut regex contains stray smart quotes that will never match (P2, fixed)
- File: src/components/editor/Block.tsx line 351
- Regex: `/^(#{1,3}|\*|-|\+|>|\[\]|"\.\.\.|` + "```" + `|---|"|>>|\d+\.)\s/`
- The `"\.\.\.` and the lone `"` alternatives appear to be leftover smart-quote substitutions. They cannot fire for an unprefixed ASCII quote.
- Also: `>>` is listed AFTER `>`, but the regex is greedy with alternation; for input `>> `, `>` matches first and the toggle (`>>`) shortcut never fires.
- Expected: clean up the regex to drop the bogus `"\.\.\.|"` alternatives, and reorder so `>>` precedes `>` so toggle-via-shortcut works.

### B-219 — Sidebar Search button onClick is a no-op (P1, fixed)
- File: src/components/layout/Sidebar.tsx line 49.
- `onClick={() => setUI({})}` — empty update. The button is meant to open the command palette but does nothing.
- Steps: click "Search ⌘K" in the sidebar — nothing happens. Cmd+K from keyboard does open the palette, so the keyboard path is fine; only the button is broken.
- Expected: open the command palette (likely `setUI({ commandPaletteOpen: true })` or similar).

### B-218 — Workspace switcher button is a button with no onClick (P3, open)
- File: src/components/layout/Sidebar.tsx lines 33-37.
- The workspace header button (with workspace icon, name, and `ChevronsUpDown` icon) renders chrome that *looks* clickable (chevron hint) but does nothing.
- Either implement a workspace switcher menu or downgrade the visual affordance.

### B-217 — AuthPage logs "Cannot update a component while rendering a different component" (P2, fixed)
- Console error appears multiple times when AuthPage renders (likely the redirect-when-already-signed-in path).
- Message: `Cannot update a component (Transitioner) while rendering a different component (AuthPage)`.
- Typical cause: calling `navigate()` or `setRouterState` inline in the render of AuthPage. Should be wrapped in `useEffect` or `useLayoutEffect`.

### B-216 — Calendar prev/next month advances only one step per rapid burst of clicks (P2, fixed)
- File: src/routes/app.calendar.tsx lines 112-127.
- Steps: load `/app/calendar`. Click "›" (cal-next) two or three times quickly.
- Observed: cursor advances by 1 month total, not by 2 or 3.
- Hypothesis: the handler closes over `cursor` from the render in which it was created. Rapid synchronous clicks all see the same starting value. Fix with the functional setter: `setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))`.

### B-215 — Inline toolbar "Link" button uses native window.prompt() (P2, open)
- File: src/components/editor/InlineToolbar.tsx line 61.
- Pattern repeats across the app: cover, link, add property all use `prompt()` / `alert()` / `confirm()`. Consider building a small unified `usePromptModal` helper that mounts an in-app modal.
- Without it, link insertion fails silently when `prompt()` is blocked by browser settings or automation.

### B-214 — Add cover button uses native window.prompt() (P2, open)
- File: src/components/page/PageView.tsx line 102.
- Same UX problem as B-210 / B-208: a native `prompt()` interrupts the workflow and is not styleable.
- Expected: inline image picker / URL input with preview, optionally with curated gradients (already noted as I-009).

### B-213 — Two property menus can be open simultaneously in a database table (P2, fixed)
- Steps: open Roadmap Q3, click Name column header → menu opens. Without closing, click Status column header → second menu opens, the first one stays.
- Expected: clicking another property header should close the previously-open menu.
- Also: the property-type list renders as a vertical list but innerText shows the labels concatenated without spaces (`textnumberselectmulti-select…`) — confusing for SR users.

### B-212 — Page-menu "Customize page" item has no onClick handler (P3, open)
- File: src/components/layout/TopBar.tsx lines 132-134 — `<MenuItem label="Customize page">` with no `onClick`.
- Clicking the item does nothing.
- Expected: open a "Customize layout" panel, or hide the item until it has behaviour.

### B-211 — Page-menu "Word count" fires a custom event with no listener (P2, fixed)
- File: src/components/layout/TopBar.tsx line 145 dispatches `new CustomEvent("show-word-count")`. Nothing in the codebase subscribes to that event.
- Steps: page → Page menu → Word count → nothing happens.
- Expected: a small popover or status row showing word/char count. Either implement the listener or remove the menu item until it works.

### B-210 — Table "add property" uses native window.prompt() and contains dead code (P2, fixed)
- File: src/components/database/views/TableView.tsx lines 190-198
- Behaviour: clicking the "+" header button calls `prompt("Property name?")`. Native prompt is jarring, can't be styled, blocks input automation, and doesn't allow choosing a type — every new property defaults to text.
- Also: `useStore.toString;` on line 194 is a no-op statement (likely a stray debug line) — remove it.
- Expected: open an inline mini-form letting the user pick a type from the same icon vocabulary used elsewhere.

### B-209 — Database view tab content lags one click behind (P0, open)
- Steps: reload Roadmap Q3 page → inline database starts on "▦ All" (table). Click "▤ By status" — table still rendered. Click "▢ Gallery" — board rendered (the one belonging to the previous tab). Click "📅 Calendar" — gallery rendered.
- Each subsequent tab click renders the PREVIOUS tab's view; the active tab style updates immediately though.
- Hypothesis: render uses a stale snapshot of `view.type`/`view.id`. Could be setting state in an async batch where the body memo reads the old activeView before the state update commits, then re-renders. Or React re-orders updates such that the rerender happens with the old activeView ref.
- Critical UX bug — users will perceive the database as broken.

### B-208 — Mail Compose "Send" uses window.alert() which blocks the renderer (P2, fixed)
- File: src/routes/app.mail.tsx line 143-145
- Steps: click Compose, click Send.
- Observed: a native `alert("Demo: email queued (no real SMTP).")` fires. Browser-native alerts pause all JS until dismissed and are inconsistent with the rest of the app's UX.
- Expected: use a toast or inline confirmation. Native alert/confirm are also incompatible with automated testing.
- Suggestion: convert to a non-blocking toast (or a status row inside the composer panel).

### B-207 — Calendar Week/Day view selections render the same grid as Month (P1, fixed)
- Steps: load `/app/calendar`, change the view `<select>` from `month` to `week`, then `day`.
- Observed: the underlying grid stays identical (full month). The select state changes but the layout/rows don't update.
- Expected: week view should show 1 row × 7 days; day view should show single column with hours.

### B-206 — Calendar "+" day-add button has no visible effect (P1, fixed)
- Steps: load `/app/calendar`. Hover any day cell, click the `+` (data-testid="day-add-YYYY-MM-DD").
- Observed: nothing happens — no event added, no dialog, no error in console.
- Expected: prompt for event title or insert a new event entry for that day. Standalone calendar should support creation, per area #18.

### B-204 — Calendar month name uses browser locale while rest of UI is English (P2, open)
- Steps: load `/app/calendar` in a browser with `navigator.language === 'fr'`.
- Observed: header shows "mai 2026" while sidebar labels stay in English (Home, Inbox, Calendar, …).
- Expected: until i18n is implemented across the product, calendar should format month with `en` locale, or all strings should be localised together.
- Code: `Intl.DateTimeFormat(undefined, { month: 'long' })` — pass an explicit locale string.

### B-205 — Workspace title in top-bar shows "12/05/2026" date in dd/mm/yyyy without explanation (P3, open)
- Steps: open any page.
- Observed: there is a "12/05/2026" button next to Share/Comments. It's the last-edited date but the format follows browser locale (fr) while the rest of the UI is English.
- Expected: consistent locale; ideally relative formatting ("Edited today", "5h ago") with full date in a tooltip.

### B-203 — Sidebar navigation does not always re-render page content when an editor menu is open (P2, open)
- Steps: open a page with content (e.g. "My Test Page"). Open the slash menu in a block. Click a different page in the sidebar (e.g. "Roadmap Q3").
- Observed: URL updates to the new page, but main heading and content still show the previous page until reload.
- Expected: navigation should close any open editor popovers and load the new page's content.
- Hypothesis: pending input/popover state on the previous editor's contenteditable holds onto state and the route effect's dependency does not re-run.

### B-202 — Toggle block's data-placeholder is "Toggle" but the bullet-list above placeholder reads "List" (P3, open)
- Steps: open a page → observe `[contenteditable][data-placeholder]` values on bullet-list rows.
- Observed: bullet-list and numbered-list both show "List" as placeholder.
- Expected: Notion uses "List" for bullet, "List" for numbered, "To-do" for todo — current text is fine but inconsistent with toggle which says "Toggle". Either standardize to type names or use friendly hints like "Type something…".

## 2026-05-12 15:30 — Test agent batch 3

### B-300 — Cmd+B/I/U/Shift+S in editor don't call updateBlock; persisted only via blur (P2, open)
- File: src/components/editor/Block.tsx lines 520-531.
- Steps: focus a contenteditable block, select text, press Cmd+B. Without losing focus, navigate away (sidebar click) — the inline mark may be lost depending on whether the input-event fallback fired.
- Observed: Cmd+B, Cmd+I, Cmd+U, Cmd+Shift+S only call `document.execCommand(...)` and never invoke `updateBlock`. Cmd+E does invoke updateBlock — inconsistent.
- Expected: every formatting shortcut should write the updated HTML to the store immediately so it survives navigation without relying on the blur path (which is racey under fast user flows — see B-203).

### B-301 — Cmd+E (inline code) silently fails when selection spans multiple inline nodes (P2, open)
- File: src/components/editor/Block.tsx lines 532-546.
- Steps: in a block that already contains `<u>…</u>` or `<i>…</i>`, select a range that crosses an element boundary, press Cmd+E.
- Observed: `range.surroundContents()` throws and the try/catch swallows it. No visual indication, no error message, no fallback.
- Expected: split the boundary nodes and apply <code> to each sub-range (like execCommand does), or at least show a toast like "Cannot wrap a mixed selection".

### B-302 — Equation block does not render LaTeX; displays raw source as plain serif text (P2, open)
- File: src/components/editor/Block.tsx lines 1091-1114.
- Steps: /equation → type `E = mc^2`.
- Observed: the preview area shows the literal string `E = mc^2` in serif font, no super/subscripts, no math typography.
- Expected: render via KaTeX/MathJax so users actually see formatted math. As-is the block is misleading — the placeholder `E = mc^2` and the rendered area look identical regardless of input.

### B-303 — Columns block renders only static "Column N" placeholders — cannot contain other blocks (P1, fixed)
- File: src/components/editor/Block.tsx lines 1261-1274 (ColumnsEl).
- Steps: /3 columns. The block renders three dashed boxes labelled "Column 1/2/3" with no drop targets and no way to add blocks inside.
- Expected: each column should accept nested blocks via drag/drop or via clicking inside (basic Notion behaviour). Currently the block is purely decorative.

### B-304 — Button block "Click me" has no configurable action; clicking does literally nothing (P2, open)
- File: src/components/editor/Block.tsx around lines 1239-1258 (ButtonEl) and 1220-1238 (action handling).
- Steps: /button → click the rendered "Click me" button.
- Observed: nothing happens. The label input is the only UI exposed; no action picker (e.g. add page, insert block, run AI prompt).
- Expected: at least one default action (e.g. insert a new block below) or a config UI mirroring Notion's button blocks. The block-spec scaffolding for `blockType`/`content` exists but the UI never lets the user wire it up.

### B-305 — AI block does NOT consume aiCredits like AIChat does (P2, open)
- File: src/components/editor/Block.tsx lines 1179-1218 (AIBlockEl.generate). It never calls `consumeAICredits`.
- Steps: open Settings → note credits. Insert an AI block, click Generate several times. Reload Settings — credits unchanged.
- Expected: same cost model as AIChat (currently 5/prompt) so the credit accounting is consistent. Otherwise users can bypass the limit by using AI blocks instead of the chat panel.

### B-306 — AI block "Generate" with empty prompt produces a generic response (P3, open)
- File: src/components/editor/Block.tsx line 1186.
- Steps: insert an AI block, leave the prompt empty, click Generate.
- Observed: still outputs `🤖 (Demo) Here is a response for "".\n\n1. Key insight…`. There is no validation that the prompt is non-empty.
- Expected: disable Generate when prompt is empty, or show a hint "Enter a prompt first".

### B-307 — Synced block is a static "Content will be mirrored…" placeholder regardless of any source (P1, fixed)
- File: src/components/editor/Block.tsx lines 1168-1177 (SyncedEl).
- Steps: /synced block → the block renders only a pink-bordered placeholder; no UI to pick a source, no rendering of any mirrored content.
- Expected: matches I-007 ("synced block content mirroring") but the slash menu entry should not promise a working block when the feature is not implemented — either hide the slash item or add a clear "Coming soon" badge inside the block.

### B-308 — Breadcrumb block path entries are not clickable links (P2, open)
- File: src/components/editor/Block.tsx lines 1146-1166 (BreadcrumbEl).
- Steps: /breadcrumb on a nested page → see `Parent / Child`.
- Observed: entries are plain `<span>` text; no anchor / button / onClick. Cannot navigate to ancestors.
- Expected: each path segment should be a button or anchor that navigates to that page (cursor: pointer, hover underline, accessible role).

### B-309 — Table-of-contents headings are `<div onClick>` not buttons; not keyboard-focusable (P3, open)
- File: src/components/editor/Block.tsx lines 1131-1139 (TocEl).
- Steps: insert /toc with several headings. Tab through the page.
- Observed: TOC entries are skipped by keyboard navigation because they're divs, not buttons or anchors. They scroll-into-view on click but are inaccessible to keyboard / screen-reader users.
- Expected: render each heading as a `<button>` with `onClick` (or an `<a href="#heading-id">`) so users can Tab into them.

### B-310 — Workspace JSON export is incomplete: omits blocks/rows/comments/templates/automations/calendarEvents/mails (P0, fixed)
- File: src/routes/app.settings.tsx lines 75-95.
- Steps: Settings → Export workspace as JSON → inspect the file.
- Observed: top-level keys are only `workspace`, `pages`, `databases` (≈21 KB). All block bodies, all database rows, all comments, all calendar events, mails, templates, and automations are missing.
- Expected: full state export so an import round-trip restores everything. As-is the export is misleading and unsafe (users may assume they have a backup).

### B-311 — Mobile (375px) view: page title `Roadmap Q3` and inline heading wrap one letter per line (P1, fixed)
- Steps: set viewport to 375x812. Navigate to a page with a wide title or any inline DB. The main content shifts to the right of the sidebar, leaving only ~80px of horizontal room; words break vertically (`R o a d m a p`).
- Expected: sidebar must auto-collapse on viewports < 768px (or use an overlay drawer instead of a flex column). I-012 tracks the general "Better mobile layout" but this is a specific blocker — the page is unreadable until the user knows to tap the close-sidebar icon.

### B-312 — Mobile: database view tabs overflow horizontally with no scroll affordance (P2, open)
- Steps: 375px viewport, open an inline DB with 4+ views.
- Observed: tabs after "▦ All / ▤ By status / 📅 Calendar" are clipped at the right edge. No horizontal scrollbar, no "more views" chevron — the user cannot reach Gallery / Form view / "+ Add view".
- Expected: add overflow-x: auto with momentum scroll, or fold extra views into a chevron menu.

### B-313 — `useStoreState` is named like a hook but called inside a click handler (P3, open)
- File: src/routes/app.settings.tsx lines 76-82, 103.
- Although the body is a plain reader (reads localStorage), the `use…` prefix triggers React's rules-of-hooks ESLint and is misleading. Also `useStore.getState ? useStore.getState() : null` on line 77 stores a value into `state` that is then never used.
- Expected: rename to `readPersistedState` and drop the dead `const state = …` line.

### B-314 — Workspace switcher chevron button next to "📓 …'s Workspace" has no menu (P3, open)
- Steps: sidebar header → click the workspace name button.
- Observed: nothing visibly happens. Mirrors B-218 (workspace switcher has no onClick) — confirmed still broken in the current build.

### B-315 — Mail panel composer "Compose" / Send: still uses window.alert() (P2, open)
- Mentioned in B-208 but verified still present in batch 3: page does not provide a non-blocking confirmation path. Note for triage: this is the same blocker that froze the renderer mid-session — please prioritise removing the native dialog.

### B-316 — Sidebar `Move to Trash` uses native confirm() and locked the renderer during testing (P1, fixed)
- File: src/components/layout/Sidebar.tsx line 274.
- Steps: hover any sidebar page → click "More" (•••) → click "Move to Trash".
- Observed: triggers `window.confirm("Move this page to Trash?")` which suspends the renderer. Native dialogs are also incompatible with the rest of the app's UX and with automated testing — see B-208/B-210/B-214/B-215 for the same pattern.
- Expected: use an in-app confirmation modal (a small `<Dialog>` component would do).

## 2026-05-12 18:08 — Test agent batch 4

### B-400 — Moving a page to Trash does NOT cascade to its sub-pages (P0, fixed)
- File: src/lib/store.ts `deletePage` (line 513).
- Steps: create page A → "New subpage" under A to make B → "New subpage" under B to make C. Move A to Trash via sidebar More menu.
- Observed: only A has `isInTrash = true`. B and C remain with `parentId` pointing to (now trashed) A, are still loaded by `/app/p/<bId>` URLs, still appear in command-palette and recents.
- Expected: trashing a page should recursively trash all descendants (mark them `isInTrash`, save the trashedAt). Restoring should then restore the entire subtree (or at minimum the page itself, leaving children for manual restore — but they must be hidden while parent is trashed).
- Critical: this breaks the Trash mental model and lets children be edited while users think the whole tree is deleted.

### B-401 — Permanently deleting a page leaves orphaned children pointing to a dead parentId (P1, fixed)
- File: src/lib/store.ts `permanentlyDeletePage` (line 542).
- Steps: Trash a page → in Trash, "Delete forever" (or call permanentlyDeletePage).
- Observed: parent page record is deleted; children pages still exist in the store with `parentId` set to the removed id. They are no longer reachable through the sidebar tree (no anchor), but their URLs still load and they linger in the workspace JSON export forever.
- Expected: permanently delete the entire subtree, or re-parent the children to root with a UI notice.

### B-402 — Child pages remain accessible by direct URL after the parent is trashed (P1, fixed)
- Steps: trash a parent page; visit `/app/p/<child-page-id>` directly.
- Observed: the child page loads normally and is editable. There is no banner indicating its parent is in Trash and no redirect.
- Expected: either redirect to /app, or show a warning banner, or auto-trash the child (see B-400). The current state is misleading and any link to the child still works.

### B-403 — Database relation property is read-only — no UI to add or remove linked rows (P1, fixed)
- File: src/components/database/PropertyEditor.tsx `RelationCell` (lines 418-436).
- Steps: add a `relation` property to a database via the table column "+", or seed one via the store. Click the cell on a row.
- Observed: cell only renders linked rows (or "Empty") as static badges. No clickable affordance, no picker, no input — the user cannot establish a link from the UI. The relation column is therefore unusable through the product surface, even though the underlying data model supports it.
- Expected: clicking the cell should open a popover listing target-database rows (with search) and let the user toggle links. Linked badges should be removable with an ×.

### B-404 — Dual relations (isDual: true) are not mirrored on the paired side (P1, fixed)
- File: src/lib/store.ts — no helper updates the paired property; src/lib/types.ts:357-359 declare `isDual` and `pairedPropertyId` but the runtime never reads them.
- Steps: even if you seed a relation manually with `isDual: true` and write linked IDs into row A → row B, the reciprocal link from row B → row A is not created.
- Expected: when writing a dual relation value, also write the mirror value on the target row's paired property (and clean up on removal). Without this, dual relations behave as one-way only.

### B-405 — Unique-id values shift when a row is deleted (P0, fixed)
- File: src/components/database/PropertyEditor.tsx `UniqueIdCell` (line 386-390).
- Steps: add a `unique-id` property with prefix "PRJ". Create rows A (PRJ-1) and B (PRJ-2). Soft-delete row A.
- Observed: row B now displays "PRJ-1" instead of "PRJ-2" because the cell computes `database.rows.indexOf(row.id) + 1` from the current (post-delete) array.
- Expected: unique IDs must be **stable**. Persist the sequence number on the row at creation time (or store a per-database counter and a `row.uniqueIdSeq` field), never recompute from array position. Notion's unique IDs are immutable; today's behaviour silently corrupts any external reference (links, citations) to a row.

### B-406 — Rollup `function` only supports 6 of 11 declared aggregations (P2, open)
- File: src/components/database/PropertyEditor.tsx `RollupCell` (lines 398-416).
- Steps: declare a rollup with function "earliest", "latest", "count-values" (date), "percent-empty", or "percent-not-empty".
- Observed: "earliest"/"latest"/"percent-*" fall through and the cell shows the empty string "". `RollupProperty.function` in types.ts:365 lists all 11 functions; the cell handles only count, count-values, sum, average, min, max, show-original.
- Expected: implement the missing functions, or at minimum mark the unsupported ones in the property editor.

### B-407 — Rollup `min`/`max` returns Infinity / -Infinity when no values exist (P2, open)
- File: PropertyEditor.tsx:412-413 uses `Math.min(...[])` and `Math.max(...[])` which return ±Infinity. The cell then renders the literal "Infinity"/"-Infinity" text to the user.
- Expected: guard with `values.length === 0` and render "—" or "0" instead.

### B-408 — `removeDatabaseProperty` doesn't strip the property's value from existing rows (P2, open)
- File: src/lib/store.ts `removeDatabaseProperty` (lines 992-1013).
- Steps: add a custom property → fill values on a few rows → remove the property. The values stay forever inside each row's `.values[propertyId]`.
- Observed: silent bloat. Workspace JSON export grows with dead keys; if the user later re-adds a property with the same id (unlikely but possible during testing), zombie data reappears.
- Expected: when removing a property also strip it from every row's `values` map. Same for dependent rollups (which become orphaned) — delete or invalidate them.

### B-409 — Database button cell uses native `alert()` for show-confirmation actions (P1, fixed)
- File: src/components/database/PropertyEditor.tsx `ButtonCell` (line 458).
- Steps: add a button property with a `show-confirmation` action and message; click it.
- Observed: `alert(action.message)` fires, freezing the renderer (same class of bug as B-208/B-214/B-215/B-316).
- Expected: in-app toast or modal.

### B-410 — Row "Delete row?" uses native confirm() and freezes the renderer (P1, fixed)
- File: src/components/database/views/TableView.tsx line 51 — `if (confirm("Delete row?")) deleteRow(row.id);`
- Steps: hover row in a table view → click trash icon.
- Observed: native confirm dialog (same blocking-renderer issue).
- Expected: in-app confirm or undo toast.

### B-411 — `restoreVersion` does not preserve the original block order (P2, open)
- File: src/lib/store.ts `restoreVersion` (line 1118-1145).
- Steps: snapshot a page with blocks ordered A, B, C → edit/delete some blocks → restore the snapshot.
- Observed: the snapshot stores blocks as `Record<string, Block>` (an unordered map). `restoreVersion` sets `page.blocks = Object.keys(version.snapshot.blocks)` — the order is whatever the JSON map happened to enumerate. In practice it usually preserves insertion order, but it's not guaranteed and breaks if the map ever passes through a non-preserving serialization.
- Expected: capture the explicit `page.blocks` order in the version (e.g. add `blockOrder: string[]`) and restore from that.

### B-412 — Page-history restore is destructive (no auto-snapshot before overwrite, no Undo) (P2, open)
- File: src/lib/store.ts `restoreVersion`.
- Steps: snapshot v1 → edit page heavily → restore v1.
- Observed: the in-progress edits are silently lost. There is no auto-snapshot of "before restore", no toast offering Undo, and the restored page replaces blocks directly.
- Expected: take an automatic snapshot of the current state before applying the restore, so the user can flip back.

### B-413 — Page-history restore uses native confirm() (P1, fixed)
- File: src/components/page/PageHistoryDialog.tsx line 37 — `if (confirm("Restore this version?")) { ... }`.
- Steps: open Page history → Restore a version.
- Observed: native confirm blocks the renderer (same family).
- Expected: in-app modal.

### B-414 — Public `/p/<slug>` page silently drops most block types (P1, fixed)
- File: src/routes/p.$slug.tsx `ReadonlyBlock`.
- Steps: publish a page that contains inline databases, toggles, columns, equation, embeds, videos, files, audio, bookmark, link-to-page, table, AI block, breadcrumb, TOC, or synced blocks. Open the public URL.
- Observed: only text/heading-1..3/bullet/numbered/todo/quote/callout/divider/code/image are rendered. Every other block type returns `null` and is silently dropped — the visitor sees a partial page with no indication content is missing.
- Expected: render the remaining types in a read-only fashion (most importantly inline databases, which are critical to many published Notion pages), or at minimum show a placeholder like "(this block type isn't available on the public page)".

### B-415 — Public `/p/<slug>` page injects user content via `dangerouslySetInnerHTML` without sanitisation (P0, fixed)
- File: src/routes/p.$slug.tsx lines 81-111.
- Steps: in any block content, paste raw HTML such as `<img src=x onerror=alert('XSS')>` then publish. Open the public URL.
- Observed: the block content goes straight into `dangerouslySetInnerHTML` so onerror handlers and `<script>` content can execute in any visitor's browser. This is also true inside the authenticated editor, but on /p/<slug> the audience is potentially untrusted.
- Expected: sanitise with DOMPurify (or render to plain text) before injecting. Cross-account contamination is possible because `p.$slug.tsx` reads every `notion-clone:user:*` key in localStorage.

### B-416 — Public `/p/<slug>` route can leak content across user accounts on the same browser (P1, open)
- File: src/routes/p.$slug.tsx lines 21-38.
- Steps: account A publishes a page with slug "secrets". Account B logs in on the same browser. Anybody at /p/secrets sees account A's page even though they're signed in as account B.
- Observed: the loop scans every `notion-clone:user:*` localStorage entry. There's no separation by current session.
- Expected: at minimum, restrict the search to the currently-signed-in user's store; ideally the publish flow should write a separate `notion-clone:public:<slug>` entry that holds the published snapshot.

### B-417 — Mail: opening an email does NOT mark it as read (P1, fixed)
- File: src/routes/app.mail.tsx — the list item `onClick` only calls `setSelected(m.id)`. There is no `upsertMail({ id, read: true })`.
- Steps: load Mail → click an unread email.
- Observed: the row stays bold (unread styling persists). The reading pane shows the body, but `mail.read` remains false.
- Expected: clicking an email should mark it read and update the underlying record. A bulk "Mark all read" is also missing.

### B-418 — Mail: no Reply / Forward / Archive / Star / Trash actions on the open mail (P2, open)
- File: src/routes/app.mail.tsx lines 100-109.
- Steps: select any email in the inbox.
- Observed: the reading pane is read-only with no actions. The schema (`starred`, `archived`, `trash`) exists in `Mail` and `upsertMail` accepts these fields, so the actions are wired to the model but not exposed.
- Expected: add a toolbar above the body with Reply / Forward / Archive / Star / Trash buttons.

### B-419 — Mail: every label renders with the same blue background (P3, open)
- File: src/routes/app.mail.tsx line 89.
- Steps: load sample emails — observe `customer-feedback` and `scheduling` labels.
- Observed: both render with `bg-blue-100 dark:bg-blue-900/40` regardless of label name. No color mapping.
- Expected: map common labels to distinct colors (or derive a hue from the label string).

### B-420 — Comments: cannot un-resolve a resolved comment (P2, open)
- File: src/lib/store.ts `resolveComment` (line 1079) hard-codes `resolved: true`.
- Steps: post a comment → click Resolve → toggle "Show resolved" to see it again → click "Resolved" (the button label flips but never actually un-resolves).
- Observed: the UI shows the button label flipping between "Resolve"/"Resolved" but the action is one-way. There is no `unresolveComment`.
- Expected: `resolveComment` should toggle, or expose a separate `unresolveComment`. Closely related to I-204.

### B-421 — Comments: author name and avatar always show the CURRENT user, not the comment author (P1, fixed)
- File: src/components/page/PageComments.tsx lines 38-42.
- Steps: post a comment as user A, sign out, sign in as user B (or simulate by editing localStorage). View the comment.
- Observed: the comment renders user B's avatar and name. The stored `comment.authorId` is never read.
- Expected: look up the comment.authorId in `state.workspaces[*].members` (or store author profile inline) and render that user. Single-user demo masks the bug, but it's a real data-integrity issue.

### B-422 — Comments: no reply threading despite parentId in the schema (P2, open)
- File: PageComments.tsx — the list is flat. `Comment.parentId` is declared (types.ts:601) but `addComment` accepts it, the renderer ignores it.
- Steps: post a comment. No "Reply" button is shown.
- Expected: render thread children indented under their parent, with a Reply button.

### B-423 — Comments: no @mention picker (P2, open)
- Steps: type "@" inside the comment textarea.
- Observed: no autocomplete, no person picker, no styling. The comment text is plain text.
- Expected: an @ menu listing workspace members (and pages).

### B-424 — Form view "Copy form link" creates a /form/:dbId/:viewId URL that has no route handler (P1, open)
- File: src/components/database/views/FormView.tsx line 31; no matching route in src/routes/.
- Steps: in a database, add a Form view → switch to Preview → click "Copy form link" → paste in the address bar.
- Observed: 404 / app shell with "Not Found".
- Expected: implement a public route that renders the form (no auth) and writes submissions back to the workspace owner's localStorage (per I-006).

### B-425 — Form view field renderer is plain text for 8 property types (P2, open)
- File: src/components/database/views/FormView.tsx `FormField` (lines 103-161).
- Steps: build a form including url/email/phone/multi-select/relation/files/person/verification properties.
- Observed: all 8 of those types fall through to the `return <input value=... />` text-input at the bottom. No URL validation, no email type, no relation picker, etc.
- Expected: render type-specific inputs (or `type="url"`, `type="email"`, `type="tel"` for the obvious ones, and a multi-select dropdown / relation picker for the rest).

### B-426 — Map view item in the New View menu has no implementation, only "coming soon" message (P3, open)
- File: src/components/database/InlineDatabase.tsx line 101-102.
- Steps: in any database, click "+ Add view" → choose Map.
- Observed: a placeholder "Map view (coming soon — geo properties not yet implemented)." appears. Users can switch to it but never see any rows.
- Expected: hide "Map" from the picker until implemented, or move it behind a "Beta features" toggle.

### B-427 — Inline-DB calendar "+" day-add button is permanently invisible (no group-hover scope) (P2, open)
- File: src/components/database/views/CalendarView.tsx lines 117-126. The button has `opacity-0 hover:opacity-100` but the parent `<div>` has no `group` class, so the parent-hover never propagates and the button only becomes visible when the user happens to hover the small button area itself (not the cell). On touch devices it's completely unreachable.
- Steps: switch any inline DB to Calendar view → hover a day cell.
- Observed: no visible "+" affordance.
- Expected: add `group` to the day cell `<div>` and change the button to `opacity-0 group-hover:opacity-100`, matching the pattern used elsewhere.

### B-428 — Verification (wiki) cannot be re-verified or revoked, and expiry is never set or rendered (P2, open)
- File: src/components/page/PageView.tsx lines 137-150. Once a wiki is verified, the "Verify" button disappears; there is no "Re-verify", "Mark unverified", or expiry control. `Page.verificationExpiresAt` (types.ts:241) is set nowhere; the badge ignores it.
- Steps: turn a page into a wiki → Verify → reload.
- Observed: the green "Verified" line stays forever with no way to change it. No expiry date.
- Expected: an "Expiry: 30 days / 90 days / custom" picker on the verify button, and a way to revoke / re-verify when expired.

### B-429 — Calendar event drag-drop on /app/calendar (standalone) is missing (P2, open)
- File: src/routes/app.calendar.tsx — day cells have no `onDragOver`/`onDrop` and events have no `draggable` attribute. Only the inline-DB CalendarView supports drag-drop (CalendarView.tsx:108-132).
- Steps: open /app/calendar → try to drag an event from one day to another.
- Observed: no drag affordance.
- Expected: same drag-to-reschedule behaviour as inline calendar.

### B-430 — Page slug stays cached on the published page record even when the page is re-trashed (P3, open)
- File: src/components/page/ShareDialog.tsx line 37 — toggling off does set `publishSlug: null`, but if the page is moved to trash without going through Share dialog, `isPublished` stays true and the public URL still serves the page from /p/<slug>.
- Steps: publish a page → without unpublishing, move it to trash via sidebar.
- Observed: the /p/<slug> page renders "Page not found" only because the loader filters `!p.isInTrash`; but `isPublished` is still true in the export and if you ever restore the page, it's re-exposed publicly without a fresh consent.
- Expected: `deletePage` should also flip `isPublished = false` to keep public state consistent with workspace state.

### B-431 — AI chat thread is wiped when the panel is closed or the page reloads (P2, open)
- File: src/components/ai/AIChat.tsx — `messages` is local component state, never persisted. Closing the panel keeps it (the component stays mounted), but a full reload (or navigating away) drops everything.
- Steps: open Ask AI → send 10 messages → reload.
- Observed: thread is empty. No history, no resume.
- Expected: persist thread under the user state so users can resume yesterday's question.

### B-432 — Page list (`pageBlocks`) iteration skips deleted blocks silently with no UI hint (P3, open)
- File: src/components/page/PageView.tsx — `pageBlocks` filters out missing blocks, but the page still loads. If a block is referenced by `page.blocks` but its body is gone (rare desync), there's no warning.
- Expected: log a single warning per page load when a block id is in `page.blocks` but not in `state.blocks`.

### B-433 — Settings "Export workspace as JSON" exposes user email and ids without masking (P2, open)
- File: src/routes/app.settings.tsx — the export round-trips the full state including `currentUser.email` and per-row `createdBy` user ids.
- Steps: Settings → Export workspace as JSON → inspect the file.
- Observed: email and supabase auth ids are present in plaintext.
- Expected: provide an option to strip or mask user-identifying fields before download (especially valuable for sharing test exports).

## 2026-05-12 16:10 — Test agent batch 5

### B-500 — RelationCell is read-only — no way to add/remove related rows from the table view (P0, fixed)
- File: src/components/database/PropertyEditor.tsx lines 418-436 (`RelationCell`).
- Steps: open a database with a relation property → click the relation cell on a row.
- Observed: nothing happens. The cell only renders the linked rows as static pills with no `onClick`, no picker, no popover, no "+ Add" affordance. There is no way to set, append, or clear a relation value through the UI.
- Expected: clicking the cell should open a popover listing rows from the target database with search and a checkbox/click-to-toggle, mirroring Notion's relation picker. Linked rows should also be removable from the pill (× icon).
- Severity raised to P0 because relations are completely non-functional via UI; the existing values in the seed data only exist because they were created programmatically.

### B-501 — Rollup property and Relation property created via "+ Add property" cannot be configured (P1, fixed)
- File: src/components/database/InlineDatabase.tsx lines 248-258, src/components/database/views/TableView.tsx ~line 191.
- Steps: open a DB view menu → click "+ Add property" → type a name → the property is created with `type: "text"`.
- Observed: the only way to create a relation or rollup is via the property header type picker. Even there, the relation property has no `targetDatabaseId` configured; rollup has no `relationPropertyId` / `targetPropertyId` / `function`. There is no in-app configuration UI for these — RelationCell renders "No target" and RollupCell returns "—" for any user-created prop.
- Expected: when adding a relation, prompt for the target database; when adding a rollup, prompt for the source relation property, the target property, and the aggregation function (count/sum/average/min/max/show-original).

### B-502 — Inline DB view menu has no Filter or Sort controls (P1, fixed)
- File: src/components/database/InlineDatabase.tsx lines 188-264 (`ViewMenu`).
- Steps: open a DB → click the "⋮" view menu → inspect items.
- Observed: only Rename, Delete, hide-property checkboxes, + Add property. No "Filter", no "Sort", no "Group by". `View` schema already has `filters: Filter[]` and `sorts: Sort[]` arrays, and `applyFilters` / `applySorts` are imported in TableView. There is no UI exposing them.
- Expected: filter and sort sections in the view menu (or a dedicated "Filter | Sort" pill row above the table), matching Notion. Without them, filters and sorts are dead schema.

### B-503 — SyncedEl is a static placeholder — no actual sync between original and ref (P1, fixed)
- File: src/components/editor/Block.tsx lines 1170-1179 (`SyncedEl`).
- Steps: `/synced-block` to insert a synced block on page A → `/synced-block-ref` on page B (note: synced-block-ref is not even in the slash menu).
- Observed: both block types render the same fixed-content pink box reading "Synced block — Content will be mirrored across pages." No children, no source-id wiring, no contenteditable, no actual mirror. The schema (`SyncedBlock`, `SyncedBlockRef.sourceId`) is wired but the renderer ignores it.
- Expected: synced-block should be a container that holds editable child blocks; synced-block-ref should look up `sourceId` and render the same children. Edits on either should propagate.

### B-504 — ColumnsEl ignores child column blocks; renders fixed placeholder cells (P1, fixed)
- File: src/components/editor/Block.tsx lines 1263-1276.
- Steps: insert a /columns block (or the slash equivalent).
- Observed: renders N empty "Column 1", "Column 2" placeholders with `text-muted-foreground`. The `ColumnBlock` type exists in types.ts but the parent column container does not read its `columns` children, and there is no way to drop a block into a column.
- Expected: columns block should look up child ColumnBlocks by parentId and render them; each column should accept block insertion + drag-drop. Without this, the columns block is decorative only.

### B-505 — Equation block does not render LaTeX — shows raw source as plain serif text (P2, open)
- File: src/components/editor/Block.tsx lines 1093-1115 (`EquationEl`).
- Steps: insert /equation, type `E = mc^2` or `\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt\\pi}{2}`.
- Observed: the preview area below the textarea just shows the literal LaTeX string with `font-serif text-lg`. No KaTeX/MathJax rendering. The "(empty equation)" fallback also implies the dev intended math rendering.
- Expected: integrate a math-rendering library (KaTeX is small and synchronous) and render the LaTeX so users see the actual formula.

### B-506 — Toggle block "children" placeholder reads "coming soon"; toggles cannot hold blocks (P2, open)
- File: src/components/editor/Block.tsx lines 738-742.
- Steps: insert a /toggle, type something, click the chevron to expand.
- Observed: the expanded area shows italic muted text `(Toggle children — coming soon)`. There is no way to add child blocks under a toggle, no parent/child linkage on toggles, no rendering of children by parentId.
- Expected: toggle should support child blocks via `parentId`, just like columns/synced-block should. Even a minimal "+ Add block" inside the expanded area would unblock the use case.

### B-507 — Sign-in fails silently with no error message when credentials are wrong (P2, open)
- File: src/routes/auth.tsx (or wherever the AuthPage form is).
- Steps: log out → enter a registered email but wrong password → click Sign in.
- Observed: button does nothing visible; URL stays on /auth; no toast, no inline message, no spinner stop indicator. The user is left guessing whether their click registered.
- Expected: on auth error, display an inline "Invalid email or password" or "Network error — try again" message. Ideally also handle the network-error case where Supabase request fails entirely.

### B-508 — Sign-up form does not surface validation/Supabase errors either (P2, open)
- File: src/routes/auth.tsx (same form).
- Steps: log out → toggle to Sign Up → enter a name, an email, and a password shorter than Supabase's minimum (e.g. 4 chars), submit.
- Observed: nothing visible, URL stays /auth. Same silent-failure pattern as B-507.
- Expected: surface validation errors and supabase auth.signUp errors via inline form messages or a toast.

### B-509 — Page-options menu "Customize page" item is a placeholder with no onClick (P3, open)
- File: src/components/layout/TopBar.tsx line 132 (`MenuItem label="Customize page"`).
- Steps: click the "…" page menu → click "Customize page".
- Observed: nothing happens.
- Expected: either remove the item until implemented, or open a real customization dialog (font, layout, full width, etc.).

### B-510 — Workspace JSON export silently includes binary image data-URLs without warning (P2, open)
- File: src/routes/app.settings.tsx — Export workspace as JSON dumps the entire state via JSON.stringify.
- Steps: add an image block via file upload → MediaBlockEl stores the file as a data URL in `block.url` → Settings → Export workspace as JSON.
- Observed: the export contains the entire base64 image inline. Files of even modest size produce multi-megabyte JSON. No warning, no option to skip media.
- Expected: provide a "Skip media (data URLs)" option, or strip large `data:` URLs and replace with `{ "type": "image", "url": "<stripped>" }` so the export is shareable.

### B-511 — `/p/<slug>` block content sanitization leaks raw text from unsafe sources (P2, open)
- File: src/routes/p.$slug.tsx — confirmed that `<script>` injected into a block's `content` is rendered as text (good — sanitized). However, the rendered HTML uses `dangerouslySetInnerHTML` paths for `richText` runs that may still pass through unsanitized when authors paste HTML directly via clipboard.
- Steps: in a block, paste raw `<img src=x onerror="window.__X=1">` HTML → publish → open `/p/<slug>` → check `window.__X`.
- Observed: depending on how the editor handles paste, the attribute could be preserved. Title and plain `content` are safely text-escaped (confirmed via DOM check), but the `richText` arrays need a sanitization audit before being marked safe.
- Expected: explicit DOMPurify / sanitize-html step on every `richText` segment before render in the public route. Add a regression test that injects script/img-onerror and verifies no global is set after navigation.

### B-512 — Calendar standalone (/app/calendar) day-cell "+ event" button never opens UI; uses prompt() (P2, open)
- File: src/routes/app.calendar.tsx line 89 — `const title = prompt("Event title?");`.
- Steps: open /app/calendar → hover a day cell → click the small + button.
- Observed: a native prompt() pops up. With automation/test harnesses (and some browsers blocking prompts in iframes), nothing happens. Test mode disables prompts entirely, so the event silently fails to be created.
- Expected: open an in-app modal/popover with a title input and date confirmation. Consistent with other "no native dialogs" fixes elsewhere.

### B-513 — TableView property header "+ Add property" uses native prompt() (P2, open)
- File: src/components/database/views/TableView.tsx line 191.
- Steps: in a DB, click the "+" in the property header row.
- Observed: native prompt asking for property name. Same blockability issue as B-512.
- Expected: inline input or popover.

### B-514 — TableView delete-row and delete-property/type-change use native confirm() (P2, open)
- File: src/components/database/views/TableView.tsx lines 51, 128, 154.
- Steps: hover a row → click trash → confirm.
- Observed: native confirm() dialog. Same blockability issue. Also: confirm("Change property type to text?") fires every time you change a property type via the column header, which is excessive friction.
- Expected: in-app confirm component; consider eliminating the confirm for property type changes (it's a soft, non-destructive action; the value rendering just changes).

### B-515 — Database button-action "show-confirmation" uses native alert() (P2, open)
- File: src/components/database/PropertyEditor.tsx line 458 and src/components/editor/Block.tsx line 1228.
- Steps: configure a button action of kind `show-confirmation` and click the button.
- Observed: native alert() pops up. Test harnesses skip it.
- Expected: in-app toast or modal.

### B-516 — Inline DB view menu rename uses native prompt() (P3, open)
- File: src/components/database/InlineDatabase.tsx line 206.
- Steps: ⋮ view menu → Rename view.
- Observed: native prompt.
- Expected: inline editable input.

### B-517 — Inline DB "+ Add property" via view menu uses native prompt() (P3, open)
- File: src/components/database/InlineDatabase.tsx line 249.
- Steps: ⋮ view menu → + Add property.
- Observed: native prompt; on dismissal the property is silently NOT created.
- Expected: inline form.

### B-518 — Sidebar "Add teamspace" button uses native prompt() (P3, open)
- File: src/components/layout/Sidebar.tsx line 87.
- Expected: in-app modal with name/icon picker.

### B-519 — Inline toolbar "Link" button uses native prompt() (already B-215, duplicated path) (P2, open)
- File: src/components/editor/InlineToolbar.tsx line 61. Same as B-215 — keeping a fresh entry to confirm it is still unfixed as of 2026-05-12.

### B-520 — Add cover button uses native prompt() (already B-214, still unfixed) (P2, open)
- File: src/components/page/PageView.tsx line 124. Still calls `prompt("Cover image URL (unsplash works great):")`.

### B-521 — Trash page "Permanently delete this page?" uses native confirm() (P3, open)
- File: src/routes/app.trash.tsx line 46.
- Expected: in-app confirm component.

### B-522 — Page history "Restore this version?" uses native confirm() (P3, open)
- File: src/components/page/PageHistoryDialog.tsx line 37.
- In automation mode the confirm returned true bypasses the prompt, but a real user with browser-blocked prompts sees nothing happen.

### B-523 — Mail Compose Send button calls toast() but does not persist the sent message (P1, fixed)
- File: src/routes/app.mail.tsx lines 145-155.
- Steps: open /app/mail → Compose → fill To/Subject/Body → Send.
- Observed: a toast briefly says "Email queued (demo — no real SMTP).", the dialog closes, BUT no record is added to `state.mails`, no Sent folder is updated, and there is no Sent / Outbox view to confirm it ever existed.
- Expected: at minimum, insert the sent message into `state.mails` with `folder: "sent"` (the schema field is unused) and add a Sent folder filter in the mail UI. Right now "queued" is a lie — nothing is queued.

### B-524 — Mail UI has no folder/label filter; all mails (inbox/sent/trash) would appear mixed (P2, open)
- File: src/routes/app.mail.tsx — mail list iterates `Object.values(state.mails)` with no folder filter. Schema has `folder` and `archived` and `trash` flags but no UI exposes them as tabs.
- Expected: tabs for Inbox / Starred / Sent / Drafts / Trash, matching Notion Mail's design.

### B-525 — Inline DB calendar view ignores newly created views — when adding a calendar view, no rows appear if no date property exists (P2, open)
- File: src/components/database/InlineDatabase.tsx lines 134-135 — `dateProperty: dateProp ?? titleProp`.
- Steps: create a database with only title and text properties → add a Calendar view.
- Observed: the calendar uses the title prop as the date prop (because no date prop exists), then fails to parse the title as a date — no rows appear on any cell. Silent.
- Expected: when no date property exists, prompt the user to add one or display an inline message in the calendar like "No date property — add one to use this view".

### B-526 — Mail compose form: Send button enabled even when To/Subject/Body are all empty (P3, open)
- File: src/routes/app.mail.tsx lines 145-155.
- Steps: open Compose → without filling anything, click Send.
- Observed: same toast "Email queued (demo)", dialog closes. The fact that empty messages "send" is misleading.
- Expected: disable Send when To is empty, or require non-empty To/Subject and surface a validation toast otherwise.

### B-527 — Mail Compose dialog has no Save Draft / discard confirmation (P3, open)
- File: src/routes/app.mail.tsx Compose component.
- Steps: type a long body, accidentally click Cancel.
- Observed: dialog closes; all content lost; no draft is preserved.
- Expected: at minimum a "Discard draft?" confirmation when there's unsaved content, or a Drafts folder that auto-saves.

### B-528 — Page-history snapshot button does not save on first click; requires a second click (P2, open)
- File: src/components/page/PageHistoryDialog.tsx line 18, src/lib/store.ts `saveSnapshot`.
- Steps: open a page → Page menu (⋯) → close menu accidentally → reopen history → click "Save snapshot now".
- Observed reproducibly today: first click sometimes does not produce a history entry; second click does. Likely due to the dialog closing-and-reopening race resetting state, or `setState` updater not flushing before the dialog `useEffect` re-reads.
- Expected: snapshot is idempotently saved on every click; show a toast confirming "Snapshot saved at HH:MM".

### B-529 — Page-history snapshot button does not give visible feedback when a snapshot is created (P2, open)
- File: src/components/page/PageHistoryDialog.tsx.
- Steps: click "Save snapshot now" once → see the list update.
- Observed: the list updates (the new version row appears), but there is no toast / flash / sound; novice users may not realise anything happened. There's also no "since you last snapshot, N edits" hint.
- Expected: a toast "Snapshot saved" and a small "Last snapshot: N min ago" indicator near the button.

### B-530 — Verify button on wiki page does not capture verification expiry (P2, open)
- File: src/components/page/PageView.tsx — verify path sets `verifiedAt` and `verifiedBy` but leaves `verificationExpiresAt: null` (also called out in B-428).
- Steps: turn page into wiki → Verify → inspect localStorage.
- Observed: `verificationExpiresAt: null` always.
- Expected: at minimum default 90 days; ideally a picker.

### B-531 — Verified badge does not include the verifier or date (P3, open)
- File: src/components/page/PageView.tsx wiki badge rendering — reads "🪪 Wiki page · Verified" with no info about who verified or when.
- Expected: "Verified by Tester5 · 12 May 2026 · expires in 90 days".

### B-532 — JSON export silently drops the entire `currentUser` and `workspaces` keys (P2, open)
- File: src/routes/app.settings.tsx export handler.
- Steps: Export workspace JSON → inspect keys.
- Observed: the exported JSON has these top-level keys only: `automations, blocks, calendarEvents, comments, databases, exportedAt, mails, pages, rows, schemaVersion, teamspaces, templates, workspace`. There is no `currentUser` (good for privacy but means re-importing on a fresh workspace loses owner attribution) and `workspace` is singular not plural (only the current workspace).
- Expected: clarify in the file header what is and isn't included. Also: `createdBy` and `lastEditedBy` user-ids still leak through on pages and rows (B-433 still holds).

### B-533 — Empty pages created via Sidebar "New page" have no Inbox notification or auto-focus on title (P3, open)
- File: src/components/page/PageView.tsx title rendering.
- Steps: click + on a teamspace → land on the new empty page.
- Observed: the title input is NOT auto-focused; the user must click into the title before typing.
- Expected: auto-focus the title element on a freshly-created page (use the `:empty` heuristic or check `page.title === ""` and `Date.now() - page.createdAt < 2_000`).

### B-534 — RollupCell's `min`/`max`/`sum`/`average` on a non-numeric target silently returns NaN (P2, open)
- File: src/components/database/PropertyEditor.tsx lines 410-413.
- Steps: configure a rollup `sum` over a text target property.
- Observed: cell renders "NaN".
- Expected: when target values are non-numeric, render "—" or "N/A" instead of NaN; or restrict the function picker to numeric-target rollups.

### B-535 — Rollup `show-original` is comma-joined regardless of target type (loses structure) (P3, open)
- File: src/components/database/PropertyEditor.tsx line 414.
- Steps: rollup `show-original` over a multi-select or relation target.
- Observed: values are joined with ", " — multi-selects lose colour pills, relations lose link semantics.
- Expected: render each original value as its native cell representation (pill, link, etc.).

### B-536 — Inline DB add-view "Map" still in the picker; same as B-426 but not gated (P3, open)
- File: src/components/database/InlineDatabase.tsx line 172 — Map type is removed from the picker today (commit `?`), but the schema and renderer still mention "Map view (coming soon)" elsewhere. Confirm whether Map should be removed everywhere or fully implemented.

### B-537 — Toaster only mounts inside the /app shell; toasts triggered on /auth never appear (P2, open)
- File: src/routes/app.tsx vs src/routes/auth.tsx.
- Steps: on /auth, trigger any code path that calls `toast()` (e.g., sign-in error if the form ever wired one up).
- Observed: no toast appears because `<Toaster />` is only inside `app.tsx`.
- Expected: mount the Toaster at the root level (above the routes) so it works on /auth and /p/<slug> too.

### B-538 — Mail page sample-emails do not include any `folder` value, breaks any future folder filter (P3, open)
- File: src/routes/app.mail.tsx — `Load sample emails` populates `state.mails` without setting `folder` so all default to undefined. When B-524 lands, those rows will become hidden.
- Expected: seed sample mails with `folder: "inbox"` and have Compose Send write `folder: "sent"`.

### B-539 — "Move to Trash" does not cascade to child databases on the page (P2, open)
- File: src/lib/store.ts — `moveToTrash` page handler.
- Steps: create a page with an inline database (verified existing example: Roadmap Q3 has 2 inline databases). Move page to trash.
- Observed: the page is trashed and its child pages cascade (good, B-cascade fix). But databases that were created `isInline: true` on that page are NOT trashed — they remain in state forever. Same for rows.
- Expected: cascade-trash should include `databases` where `parentPageId === pageId`, plus their rows.

### B-540 — Restoring a parent page from trash does not auto-restore its cascaded children (P2, open)
- File: src/lib/store.ts restore handler.
- Steps: create page A with subpage B → trash A → B is also trashed (good) → from /app/trash, click Restore on A.
- Observed: A is restored. B stays in trash (and the page A reads as having no children). Even though both share the same `trashedAt` timestamp.
- Expected: restoring A should restore all children that were cascade-trashed in the same atomic operation (use the same `trashedAt` timestamp as a grouping key, or store a `trashCascadeFrom: <parentId>` field).

### B-541 — Inline toolbar may still race with a relation cell click (P3, open)
- File: src/components/editor/InlineToolbar.tsx.
- Steps: select text in a row title cell → toolbar appears → click into the relation pill in the same row.
- Observed: the toolbar lingers and intercepts the click. (Hard to repro consistently; flag for investigation.)
- Expected: toolbar should detect target outside of `[contenteditable]` and dismiss on the mousedown.

### B-542 — Block hover handle still opacity-0 even when the block is fully focused; only mouse hover reveals it (P3, open)
- File: src/components/editor/Block.tsx — `setHovering` is the only trigger for showing the handle.
- Steps: tab through blocks with the keyboard.
- Observed: the focused block's drag handle / + button stays invisible; keyboard-only users can never reorder/insert.
- Expected: show the handle on focus-within as well.

### B-543 — Sign-in page tabs use buttons but lose form state when switching (P3, open)
- File: src/routes/auth.tsx.
- Steps: type an email and password in Sign In → click Sign Up tab → click back to Sign In.
- Observed: the email and password fields are blanked.
- Expected: persist the email at least across tab switches.

## 2026-05-12 16:59 — Test agent batch 6

### B-600 — Toggling "Two-way relation" never creates a paired property on the target DB (P1, fixed)
- File: src/components/database/views/TableView.tsx lines 214-222 (RelationConfigEditor), src/components/database/PropertyEditor.tsx lines 458-468 (RelationCell.toggle mirror code).
- Steps: create DBs A & B, add Relation prop on A targeting B, click the column header, check "Two-way relation (mirror on paired side)".
- Observed: A's property flips `isDual: true` but no `pairedPropertyId` is ever set; B never gets a mirror property. The mirror code in RelationCell only runs when `rp.isDual && rp.pairedPropertyId`, so linking from A still does NOT add the back-link on B.
- Expected: checking the box should auto-create (or prompt to name) a mirror Relation property on B, set both `pairedPropertyId` fields, and from then on link both sides on toggle.

### B-601 — Newly created rollup defaults to `function: undefined` and cell renders blank instead of a count (P1, fixed)
- File: src/components/database/PropertyEditor.tsx lines 401-418 (RollupCell). The if/else chain only covers explicit string values; when `rp.function` is undefined `result` stays at `""`.
- Steps: add a relation property, link a row, then add a Rollup property and pick a relation + target property (do NOT change the Function dropdown).
- Observed: the Function `<select>` visually shows "count" because that's the first option, but the property in state has `function === undefined`, so RollupCell never enters any branch and renders an empty cell. Users perceive the rollup as "broken".
- Expected: set `function: "count"` as the default when creating a rollup property (or fall through to `count` when `rp.function == null`).

### B-602 — Rollup defaults: changing the function `<select>` to its current value doesn't fire `onChange` (P2, fixed)
- File: src/components/database/PropertyEditor.tsx PropertyMenu rollup config (function select).
- Steps: trigger B-601, then open the column menu and click on the already-highlighted "count" option.
- Observed: nothing changes; you must pick another function and then re-pick `count` for the cell to start rendering. Standard `<select>` onChange does not fire when the user re-selects the same value.
- Expected: detect undefined-function on render and write `count` to the property on first open, OR replace the `<select>` with a button-row so clicking writes regardless.

### B-603 — Row delete (Trash icon) is opacity-0 except on row hover, completely hidden from keyboard users (P2, open)
- File: src/components/database/views/TableView.tsx lines 48-57.
- Steps: tab through a database table.
- Observed: the per-row Trash button never becomes visible to a keyboard-only user (opacity-0 + group-hover only). No focus-visible reveal.
- Expected: also reveal on `:focus-within` and `:focus-visible`; or use `sr-only` visibility on inactive state and reveal on focus.

### B-604 — Restore from the in-page Trash banner does NOT cascade-restore children (P1, fixed)
- File: src/components/page/PageView.tsx line 71 calls `restorePage(page.id)` instead of `restorePageCascade(page.id)`. The cascade helper exists in store.ts at lines 542-567 and is used from /app/trash but not from the page view banner.
- Steps: trash a page with two children (cascade trashes children correctly); open the parent at /app/p/<parent>; click Restore in the "This page is in Trash." banner.
- Observed: parent is restored, children stay in trash. (Restoring via /app/trash works because it uses `restorePageCascade`.)
- Expected: banner Restore should call `restorePageCascade` for consistency with the Trash route.

### B-605 — Restore Version dialog still uses native `confirm()` (P2, open)
- File: src/components/page/PageHistoryDialog.tsx line 37.
- Steps: open a page → ⋯ → Page history → Save snapshot now → click Restore on a snapshot.
- Observed: a native `confirm("Restore this version?")` fires. Same UX problem as the long-tracked B-* native-dialog issues, but specifically inside the History modal which is otherwise styled.
- Expected: replace with the existing custom Confirm dialog (or a Tabler-style two-button row inside the modal).

### B-606 — Native `confirm()` for "Change property type" and "Delete property" in TableView (P2, open)
- File: src/components/database/views/TableView.tsx lines 127 and 162.
- Steps: open a property header menu → change the type to another type, OR click Delete property.
- Observed: a native confirm fires for both.
- Expected: replace with the in-app confirmation dialog (or use the same toast-confirm pattern as the button-cell show-confirmation action).

### B-607 — Native `prompt()` for "View name" rename and "Property name?" in InlineDatabase (P2, open)
- File: src/components/database/InlineDatabase.tsx lines 206 and 249.
- Steps: rename a view via the view tab menu, or add a property via the inline "+ New property" button.
- Observed: native prompt fires.
- Expected: inline editable view/property name input (table view already has an inline form for the column "+", InlineDatabase should reuse it).

### B-608 — Native `prompt()` for cover URL on PageView (P2, open)
- File: src/components/page/PageView.tsx line 136.
- Steps: open a page → click "Add cover".
- Observed: native prompt asks for the URL.
- Expected: a small dropdown with "Pick gradient / Unsplash / Upload / Paste URL"; or at minimum, an in-app modal text input.

### B-609 — Native `prompt()` for inline-toolbar Link URL (P2, open)
- File: src/components/editor/InlineToolbar.tsx line 61.
- Steps: select some text → click the Link button on the inline toolbar.
- Observed: native prompt asks for the URL.
- Expected: an inline URL input attached to the toolbar (popover with a single text input and Confirm).

### B-610 — Native `prompt()` for "Teamspace name?" in the sidebar (P2, open)
- File: src/components/layout/Sidebar.tsx line 87.
- Steps: click "Add teamspace" in the sidebar.
- Observed: native prompt asks for the teamspace name.
- Expected: a tiny inline input that appears inline at the bottom of the sidebar (or a small dialog with name + icon + mode picker).

### B-611 — Native `prompt()` for calendar "New event" title (P2, open)
- File: src/routes/app.calendar.tsx line 89.
- Steps: click an empty calendar cell to add a new event.
- Observed: native prompt asks for the event title.
- Expected: a small popover where the day cell expands with a title + start/end + all-day form.

### B-612 — Mobile sidebar slide-in covers 68% of the viewport with no scrim/overlay (P2, open)
- File: src/components/layout/Sidebar.tsx + global layout.
- Steps: preview_resize "mobile" (375x812) → click "Open sidebar".
- Observed: the sidebar is 256px wide on a 375px viewport (≈68%); the content is pushed left and partially clipped; there is no backdrop, and the sidebar doesn't auto-close when tapping the content area.
- Expected: on mobile, the sidebar should overlay (fixed) with a translucent backdrop and auto-close on outside tap; ideally narrower or full-width.

### B-613 — Public published page silently drops sub-page, toggle, table, equation, synced, columns, AI, button, database-inline, and breakdown blocks (P1, open)
- File: src/routes/p.$slug.tsx — `ReadonlyBlock` only handles heading-1/2/3, bullet-list, numbered-list, todo, quote, callout, divider, code, image, text; everything else returns `null`.
- Steps: create a page with an inline database (or an equation or sub-page); Share → Publish → open the public URL.
- Observed: those blocks are silently missing in the public page; the published reader sees an article with gaps and no indication.
- Expected: render each block in a read-only form (database-inline at minimum as a static table; toggle as expanded by default; equation as the rendered string; sub-page as a clickable link if its parent is also published, else a stub).

### B-614 — Public page route shows just header + title + icon when no blocks render — looks "empty" even when source page has many blocks (P2, open)
- File: src/routes/p.$slug.tsx, related to B-613.
- Steps: publish a page with only an inline database and an equation block.
- Observed: the public page is essentially "📄 / Parent A" with a thin border. No "this page is mostly content that requires the app" or fallback.
- Expected: when filtered pageBlocks.length === 0, show a "Open in the app to see full content" banner.

### B-615 — Equation block renders raw LaTeX as plain serif text (P3, open)
- File: src/components/editor/Block.tsx lines 1093-1116 (EquationEl).
- Steps: insert `/equation` → type `\sqrt{x^2+y^2}`.
- Observed: the preview area shows the literal string in a serif font. No KaTeX/MathJax rendering.
- Expected: real LaTeX rendering (also covered by I-504).

### B-616 — Synced block is still purely a static placeholder; no mirroring works (P3, open)
- File: src/components/editor/Block.tsx lines 1170-1179.
- Steps: insert `/synced` → look at the result.
- Observed: A solid pink-bordered box with the text "Content will be mirrored across pages." There's no UI to mirror it.
- Expected: a synced block stores child blocks and presents a "Copy link to synced block" affordance; a synced-block-ref shows the same children.

### B-617 — Columns block has no drop targets — children blocks can never be placed (P3, open)
- File: src/components/editor/Block.tsx lines 1263-1276 (ColumnsEl).
- Steps: insert `/2 columns` → try to drag any block into a column.
- Observed: each column is a dashed box labelled "Column 1" / "Column 2". They don't accept drag/drop, and there's no nested editor.
- Expected: each column behaves like a mini page-blocks container with its own slash menu and drop targets.

### B-618 — Toggle block: children are not implemented; expanded body always reads "(Toggle children — coming soon)" (P3, open)
- File: src/components/editor/Block.tsx lines 738-742.
- Steps: insert `/toggle`, expand the chevron.
- Observed: literal italic text "(Toggle children — coming soon)".
- Expected: nested editable content under each toggle.

### B-619 — Inline DB Filter & Sort UI not exposed anywhere (P2, open)
- File: src/components/database/InlineDatabase.tsx (no filter/sort surface), src/components/database/filter.ts (engine exists).
- Steps: open any inline DB view → look for filter/sort controls.
- Observed: there is no "Filter" or "Sort" button on the view header; the `filters` and `sorts` arrays on views are always seeded as empty and there is no UI to edit them.
- Expected: an "+ Filter" / "+ Sort" button next to "+ Add view" that opens a popover with property + operator + value rows.

### B-620 — Calendar header capitalises differently than dates (P3, open)
- File: src/routes/app.calendar.tsx line 120 — `cursor.toLocaleString(undefined, { month: "long", year: "numeric" })`.
- Steps: open /app/calendar with French browser locale.
- Observed: title reads "mai 2026" (lowercase "m"). Other dates capitalised correctly.
- Expected: explicit capitalisation or pin `en-US` locale to keep consistency.

### B-621 — Inline-DB relation picker has no "+ Create new" inline-create action (P2, open)
- File: src/components/database/PropertyEditor.tsx RelationCell (lines 482-531).
- Steps: open a relation cell when the target DB has no row matching the search.
- Observed: the picker shows "No rows in target database" but offers no quick way to create one and link it in one step.
- Expected: a "+ Create '<search query>'" footer button that adds a row to the target DB pre-filled with `title = search`, links it, and closes.

### B-622 — Two databases named "Untitled database" appear identically in the Relation Target picker (P3, open)
- File: src/components/database/views/TableView.tsx RelationConfigEditor option label.
- Steps: create two inline DBs without renaming them. Open a relation prop → "Relation target".
- Observed: both options read "🗄️ Untitled database" — indistinguishable.
- Expected: append page title or short id (e.g., "🗄️ Untitled database · Test Page Batch6 · db_…06m").

### B-623 — Property type dropdown lists every type even when changing types is destructive (P3, open)
- File: src/components/database/views/TableView.tsx line 127.
- Steps: change a `title` property to `relation` from the property header.
- Observed: the confirm fires and you can switch; values are lost / unparseable.
- Expected: forbid converting away from `title` (every DB must have exactly one); also gate destructive type changes ("title", "unique-id", "created-time") with a stronger warning.

### B-624 — Inline DB views: switching from Table to Board view while the property menu is open does not close the menu (P3, open)
- File: src/components/database/InlineDatabase.tsx view tab buttons.
- Steps: open a property menu in a TableView, then click another view tab.
- Observed: the menu (positioned absolutely against the th) stays mounted briefly as the table is unmounted, occasionally leading to a layout glitch.
- Expected: close any open menus on view-switch.

### B-625 — Workspace-export JSON includes the freshly-trashed children of restored parent until reload (P3, open)
- File: src/routes/app.settings.tsx export handler vs. src/lib/store.ts restorePageCascade.
- Steps: trash parent A (cascades to children B, C); restore A from /app/trash (children also restored); export workspace JSON.
- Observed: usually fine, but if the export button is fired in the same microtask as restoration, the JSON snapshot can include children with stale `isInTrash: true`.
- Expected: export should always read from a freshly-committed state; this might be a flaky race in store.ts setState batching.

### B-626 — Unique-id with empty prefix renders just the seq without separator, but cell title-cased prefix is not normalised (P3, open)
- File: src/components/database/PropertyEditor.tsx UniqueIdCell line 392 — `{prefix}{prefix ? "-" : ""}{seq}`.
- Steps: set prefix to "bug" (lowercase) or "BUG TICKET" (with space).
- Observed: lowercase prefix shows "bug-1"; the space prefix becomes "BUG TICKET-1" — neither normalised.
- Expected: optionally uppercase and strip whitespace; the input placeholder "e.g. BUG" implies uppercase.

### B-627 — Sign-in form: switching tab via sidebar arrow keys doesn't move focus (a11y) (P3, open)
- File: src/routes/auth.tsx.
- Steps: focus the Sign In tab and press Right/Left arrow.
- Observed: arrow keys don't traverse tabs; only mouse click works.
- Expected: tablist semantics with arrow-key navigation, ARIA roles `tablist`/`tab`/`tabpanel`.

### B-628 — Mail Compose buttons have no `type="button"`, so pressing Enter in any compose field unexpectedly triggers Send (P2, open)
- File: src/routes/app.mail.tsx ComposeDialog (lines 146-156).
- Steps: open Compose → type something in To → press Enter.
- Observed: no form wrapper means Enter inside an `<input>` does nothing today, BUT if a form is later added around this content the omitted `type="button"` will make the first button (Send) submit on Enter. Defensive coding suggests setting explicit `type="button"`.
- Expected: explicit `type="button"` on both buttons (and on Cancel especially) to avoid future regression.

### B-629 — Property header menu doesn't restore focus to the column header on close — keyboard focus lost (P3, open)
- File: src/components/database/views/TableView.tsx PropertyMenu close handler.
- Steps: focus a column header with Tab, press Enter to open menu, press Escape.
- Observed: focus reverts to `<body>` instead of the header button.
- Expected: focus returns to the trigger (use `useRef`).

### B-630 — RelationCell "checkbox" inside the picker has `pointer-events: none` but no aria-readonly — screen readers say it's interactive (P3, open)
- File: src/components/database/PropertyEditor.tsx lines 520-525.
- Steps: VoiceOver / NVDA over the picker checkboxes.
- Observed: readers announce "checkbox not checked" but checkbox is purely visual (the parent button does the toggling).
- Expected: add `aria-hidden="true"` to the checkbox, or use a role-less `<span>` with a check icon.

### B-631 — Adding a rollup property without target/relation picks crashes the column body briefly (P3, open)
- File: src/components/database/PropertyEditor.tsx RollupCell line 406 — `if (!relProp || relProp.type !== "relation") return <span className="text-xs text-muted-foreground">—</span>;`
- Steps: add a rollup via the "+" column header → click Create immediately (no target).
- Observed: each row renders "—" which is fine, but the column header still says "ROLLUP — RELATION" / "TARGET PROPERTY" with empty selects; users may not realise the property is non-functional.
- Expected: render "Rollup not configured" banner directly in the cells AND highlight the configuration popover red.

### B-632 — Two-way relation toggle is irrevocable once paired property is removed — orphan state (P3, open)
- File: src/components/database/views/TableView.tsx RelationConfigEditor + store.ts updateDatabaseProperty.
- Steps: (hypothetical, once B-600 is implemented) toggle two-way on, then delete the paired property on B.
- Observed prediction: A still has `isDual: true` and `pairedPropertyId: "<deleted>"`, mirror code in PropertyEditor.tsx silently no-ops.
- Expected: removing a property should scan all relations and clear their `pairedPropertyId` / `isDual` if they pointed to it.

### B-633 — Delete-row click is a single-click destructive action with no Undo affordance (P2, open)
- File: src/components/database/views/TableView.tsx line 50 — `onClick={() => deleteRow(row.id)}`.
- Steps: click the per-row Trash icon.
- Observed: the row is soft-trashed instantly; there is no toast with an "Undo" button nor a confirmation. Useful as it removes the native confirm (B-205 etc.), but goes too far — no easy way to undo.
- Expected: show a toast "Row moved to trash" with an "Undo" button that restores the row in-place.

### B-634 — Inline DB calendar in non-English locale shows weekdays starting Monday but data anchors Sunday (P3, open)
- File: src/routes/app.calendar.tsx (header reads "Mon Tue Wed Thu Fri Sat Sun") and date helpers.
- Steps: navigate to the start of a month where day 1 is Sunday.
- Observed: in May 2026 the "1" sits under "Fri" but the visible row starts with the wrong offset (verified header: Mon, Tue, …, Sun and 1 falls on Fri — correct on this date, but this is locale-dependent and the calendar always pins Mon as the first column regardless of user locale).
- Expected: respect the first-day-of-week from the user's locale (Intl.Locale.weekInfo).

### B-635 — `__nativeCalls.confirm/prompt/alert` instrumentation never increments for row delete, button cell, save snapshot OR table "+" — those paths are clean (verification only, info)
- Notes: this is a positive verification. Recorded here to prevent future regressions.
- Verification log: row-delete: confirm=0, prompt=0, alert=0; button-cell with show-confirmation: confirm=0, prompt=0, alert=0; table-add-property "+": confirm=0, prompt=0, alert=0 (uses inline form).

### B-636 — Trashed page banner displays but does not block editing of nested blocks via direct DOM-focus (P3, open)
- File: src/components/page/PageView.tsx Trash banner branch.
- Steps: open /app/p/<trashed child of trashed parent>; the trash banner shows correctly. Then focus the page title via JS.
- Observed: the H1 contenteditable still accepts input even though the page is in trash; updates persist on the page record.
- Expected: when isInTrash, set all contenteditable nodes to `contenteditable="false"` or pointer-events:none.

### B-637 — Saving a snapshot does not produce any toast on success even after fix (P3, open)
- File: src/lib/store.ts saveSnapshot, src/components/page/PageHistoryDialog.tsx.
- Steps: open Page history → Save snapshot now.
- Observed: list updates but no toast or "Snapshot saved at HH:MM" indicator.
- Expected: `toast("Snapshot saved", "success")` plus a relative timestamp under the button.

## 2026-05-12 16:05 — Test agent batch 8

### B-700 — Sidebar page click changes URL but does not re-render the page body (P1, fixed)
- File: src/routes/app.p.$pageId.tsx and the sidebar nav button handler.
- Steps: open page A (e.g. a columns block page); in sidebar, click another page B (e.g. "Welcome"). Wait several hundred ms. Force a hard reload to compare.
- Observed: the URL updates to /app/p/<B-id> but the `<main>` content stays on page A's blocks (the editor never re-mounts for the new pageId). A full page reload then renders B correctly.
- Expected: navigating between pages via the sidebar should update the editor view in-place (PageView keyed by pageId so React remounts on change, or a useEffect listening to route param).
- Verification log: navigated from pg_mp2w9grlso0wlxh6 (Test Columns Block, has columns block) to pg_mp2uzjo1rj5h4k4p (Welcome). URL became /app/p/pg_mp2uzjo1rj5h4k4p but main text remained "Column 1 content / H1 inside col / Column 2 content". After reload, Welcome content rendered correctly. Reproducible.

### B-701 — Slash-menu filter "columns-2" returns "No matching blocks" though id is "columns-2" (P3, open)
- File: src/lib/slash-commands.ts (id="columns-2", aliases=["columns","2 columns","2col"]) and src/components/editor/SlashMenu.tsx filterSlash.
- Steps: in an empty block type "/columns-2".
- Observed: dropdown shows "No matching blocks". Filter does NOT match against `id`, only `label`+`aliases`. The instructions / docs mention "/columns-2" should produce a 2-column layout but it doesn't.
- Expected: include the command `id` in the filter list (or add "columns-2"/"columns-3"/"columns-4" to aliases).

### B-702 — Changing a dual-relation property's type to non-relation leaves an orphan paired property in the target DB (P1, fixed)
- File: src/lib/store.ts updateDatabaseProperty (the dual-relation side-effect only runs when the patched prop IS a relation; it does NOT run when the prop was a relation but is being changed AWAY from relation).
- Steps: (1) create DB A with relation prop X targeting DB B, toggle isDual on (paired prop Y is auto-created in B with pairedPropertyId=X.id). (2) Change property X's type from "relation" to "rollup" (or any non-relation type) via the property header menu.
- Observed: property Y in DB B is left intact with `type: "relation"`, `isDual: true`, `pairedPropertyId: X.id`. But X is no longer a relation — it's a rollup. The mirror code in `PropertyEditor.tsx` RelationCell.toggle() will silently no-op on the dual mirror because it reads `rp.isDual && rp.pairedPropertyId` on the now-rollup property which has neither. Y still presents as a two-way relation in its picker dropdown.
- Verification log: DB db_mp2whowd8u6j40z8 prop RelTest changed from relation→rollup; DB db_mp2v206mwyisp4jq still contains "Related to Untitled database" pointing to the orphan paired id.
- Expected: when a relation property's type is changed away from `relation`, the store should scan target DB(s) for any paired-relation referencing it and either delete the paired prop or null out `pairedPropertyId` and set `isDual: false`. Same for when a relation property is deleted (related to B-632).

### B-703 — Property header menu's type-change buttons don't show a confirmation when the change is destructive (relation→rollup loses targetDatabaseId, etc.) (P2, open)
- File: src/components/database/views/TableView.tsx lines 124-148.
- Steps: open the property header menu on a `relation` property with linked rows; click "rollup" (or any other type).
- Observed: type instantly changes, the relation config (targetDatabaseId, isDual, pairedPropertyId) is silently dropped, all row values that were row-id arrays remain but are now interpreted as the new type. No confirmation.
- Expected: when changing from a type that carries config (`relation`, `formula`, `rollup`, `status` with groups, `select` with options, `unique-id` with prefix/counter), show a confirmation: "This will lose <X> rows of data and the relation config — continue?".

### B-704 — Rollup cell shows blank/"—" until BOTH relationPropertyId and targetPropertyId are set, even with default function="count" (P2, fixed)
- File: src/components/database/PropertyEditor.tsx RollupCell (line 401-419).
- Steps: change a property type to `rollup` from a property menu. The store sets `function: "count"`, `relationPropertyId: ""`, `targetPropertyId: ""`. Look at any row's cell.
- Observed: cell renders "—" because `if (!relProp || relProp.type !== "relation") return ...`. For `function === "count"` the rollup doesn't actually need a `targetPropertyId` (it just counts linked rows), but the early-return still triggers because no `relationPropertyId` is configured.
- Expected: at minimum render a clearer placeholder like "Configure relation" rather than "—" (which looks like an empty numeric result). Also, the implementer's stated change "rollup default count makes the cell populate immediately" is misleading — the cell only populates after the user picks a relation; without a relation, count remains "—".

### B-705 — RollupConfigEditor's "pick relation" dropdown shows nothing if the relation property is configured but has no targetDatabaseId yet (P3, open)
- File: src/components/database/views/TableView.tsx RollupConfigEditor (lines 233-280).
- Steps: add a property of type relation but don't configure its target. Then add a rollup property and open its config.
- Observed: the relation IS listed in "pick relation" (filtered only by `p.type === "relation"`), but if picked, "Target property" is disabled forever because `targetDb` resolves to undefined and there's no UI hint.
- Expected: when a relation prop has no targetDatabaseId, either exclude it from the rollup picker OR show a tooltip "configure target database first".

### B-706 — Two "Untitled database" entries in Relation Target picker confirmed reproduces, now 3+ databases all named identically (worsens B-622) (P3, open)
- File: src/components/database/views/TableView.tsx RelationConfigEditor.
- Steps: in current workspace, open any property menu for a relation prop → "Relation target".
- Observed: three options all labelled "🗄️ Untitled database" — completely indistinguishable.
- Expected: as B-622 — append the host page title or short DB id. This is a repeat verification with 3 DBs, not 2.

### B-707 — Equation block does NOT render LaTeX — it shows raw source in a serif font (P2, open)
- File: src/components/editor/Block.tsx equation case + slash-commands.ts label "LaTeX math block".
- Steps: create an equation block via `/equation`. Type `E = mc^2` then `\frac{a}{b} + \sqrt{x}`.
- Observed: the rendered area shows the raw source text wrapped in a `<div class="font-serif text-lg">` — no LaTeX-to-math rendering at all. The slash command description says "LaTeX math block" but the block doesn't even attempt to render math.
- Expected: ship KaTeX or MathJax (I-611 already proposes KaTeX, ~8 KB gzipped) so `E = mc^2` becomes the formatted equation. Current state is misleading because the placeholder LOOKS like it should render (serif font).
- Verification log: textarea value `\frac{a}{b} + \sqrt{x}` → rendered div text `\frac{a}{b} + \sqrt{x}` (unchanged).

### B-708 — Block-level commenting is not exposed in the UI; schema supports it but no entry point (P2, open)
- File: src/lib/types.ts Comment.blockId exists; src/lib/store.ts addComment accepts `blockId`. But src/components/editor/Block.tsx has no UI to start a block comment, and src/components/page/PageComments.tsx filters out block comments (`!c.blockId`).
- Steps: try to right-click a block, look for "Comment" in any block menu, search the codebase.
- Observed: NO surface allows the user to attach a comment to a specific block. Page-level comments work via the speech bubble in TopBar. The schema field is dead code.
- Expected: hover a block → see a "💬" icon in the block handle area. Click → opens a popover where the user types a thread, on save calls `addComment({blockId})`. PageComments.tsx needs a "Show block comments" mode OR inline indicators next to commented blocks.

### B-709 — Synced block is a schema-only stub: shows "SYNCED BLOCK / Content will be mirrored across pages." with no actual mirror (P2, open)
- File: src/components/editor/Block.tsx synced-block render branch.
- Steps: create a synced block (slash command "synced"); inspect render.
- Observed: renders the static text "SYNCED BLOCK / Content will be mirrored across pages." There is no source-block picker, no UI to insert a synced copy elsewhere, no mirror runtime.
- Expected: either implement (source ref + mirror ref schema and renderer) OR remove the slash menu entry to avoid misleading the user. Related to I-007 / B-209 / B-302 etc. — still unresolved.

### B-710 — Multi-relation cycle: changing a relation property's type from "relation" silently breaks all dependent rollups (P2, open)
- File: src/lib/store.ts updateDatabaseProperty + RollupCell.
- Steps: configure relation X → rollup Y referencing X. Change X's type to text or rollup. Look at Y's cell.
- Observed: Y now shows "—" (because RollupCell early-returns when `relProp.type !== "relation"`). No warning, no broken-state indicator, no migration prompt. If the user later restores X to relation but with no target, Y stays "—".
- Expected: when changing a relation away from "relation", scan all rollups in same DB referencing it and either delete those rollups, null-out their `relationPropertyId`, or warn the user.

### B-711 — Rollup property re-typed away from rollup → row.values entries become stale dangling array refs (P3, open)
- File: src/lib/store.ts updateDatabaseProperty.
- Steps: configure a rollup or relation column; populate some row values; change the column type to "text".
- Observed: each row.values[propId] still holds the old array of row-ids (relation) or whatever calculated number (rollup). The new "text" cell renders the raw JS value via `String(...)`, e.g. "[object Object]" or the joined ids list. Type coercion should be cleaning these on type change.
- Expected: when changing property type, sweep `s.rows` and clear `row.values[propId]` (or coerce to the new type's safe default).

### B-712 — Cmd+/ block context-menu shortcut does not exist (P3, open)
- File: src/components/editor/Block.tsx onKeyDown handler (line 522+ has metaKey+b/i/u/Shift+s/e but no metaKey+/).
- Steps: focus a block, press Cmd+/.
- Observed: no menu appears, no context menu opens. Editor doesn't acknowledge the shortcut. Notion-style apps use Cmd+/ to open the block-level option menu (transform, duplicate, move to, comment, …).
- Expected: bind Cmd+/ (or Ctrl+/ on Windows/Linux) to open the same handle popover ("Block options") that the grip-vertical click opens.

### B-713 — Drag-and-drop a block from inside a Column into another position in the SAME column has no effect (P1, open)
- File: src/components/editor/Block.tsx BlockShell.onDrop (line 117-133) — uses `pageBlocks = s.pages[pageId].blocks` to find source/target index, but column-children live in `column.blockIds`, not `page.blocks`. So `targetIndex` and `sourceIndex` are both -1, and the function returns early.
- Steps: in the Test Columns Block page, column 1 has ["Column 1 content" (text), "H1 inside col" (heading-1)]. Drag the H1 over the text block.
- Observed: order unchanged after `dragstart` + `drop`. No reorder.
- Expected: BlockShell.onDrop needs to detect when block.parentId is a `column` block, and call a new `reorderColumnChildren(colId, newOrder)` action instead of `reorderBlocks`.
- Verification log: before/after `[blk_9ttuw6ui, blk_mp2wd148lonw]` — identical.

### B-714 — Even the page-level drag-drop only re-orders top-level blocks, but does not target ANY drop position inside columns (P2, open)
- File: src/components/editor/Block.tsx — there is no drop handler that resets a block's `parentId` to a column id.
- Steps: drag a top-level block over a column.
- Observed: dropping on the column body just triggers the column's parent BlockShell.onDrop (re-orders the columns block among top-level blocks). The block cannot be moved INTO a column via DnD.
- Expected: a column should accept block drops and call `moveBlockToColumn(blockId, colId, index)`.

### B-715 — Equation block: pressing Enter inside the textarea inserts a literal newline rather than committing & jumping to a new block (P3, open)
- File: src/components/editor/Block.tsx equation render.
- Steps: type inside an equation block then press Enter.
- Observed: the textarea accepts the newline. No way to exit it without clicking out.
- Expected: Enter should commit the equation and create a new text block after. Shift+Enter could be used for multi-line equation source.

### B-716 — Published /p/<slug> page renders an EMPTY blocks container if the page only contains "non-readonly-supported" block types (P1, fixed)
- File: src/routes/p.$slug.tsx ReadonlyBlock (lines 83-122). Returns null for: columns, column, equation, toggle, database-inline, synced-block, sub-page, button, mention, AI block, embed, video, audio, file, bookmark.
- Steps: publish a page whose only blocks are e.g. a columns block + a database. Visit `/p/<slug>`.
- Observed: `<div data-page-blocks="true"></div>` renders empty inside the article. No fallback "this content can't be displayed publicly". The viewer just sees a blank article.
- Expected: at minimum render a "[unsupported block type X — view in app]" placeholder so the user is not left with a totally blank page. Better: implement readonly renderers for columns/equation/toggle/database.
- Verification log: published pg_mp2v0u4vepv273uy as slug "test-columns-block". Public view shows only the `<h1>Test Columns Block</h1>` and empty blocks div, even though the page in-app shows tabs (All / By status / Calendar / Gallery), rows, and a database.

### B-717 — Share dialog "Publish" auto-generates a slug from the page title without checking the slug already exists on another published page (P2, open)
- File: src/components/page/ShareDialog.tsx slug generation logic.
- Steps: create two pages with identical titles, e.g. "Untitled". Publish both.
- Observed prediction: both end up with slug "untitled" — and there's no error / fallback (slug collision).
- Expected: after slugifying, check `Object.values(pages).some(p => p.isPublished && p.publishSlug === candidate && p.id !== currentPageId)`; on collision append `-2`, `-3`, … or a short hash.

### B-718 — `prefers-color-scheme` dark mode is not respected — app forces light mode unless toggled (P3, open)
- File: src/lib/store.ts and theme handling (no detection of `window.matchMedia("(prefers-color-scheme: dark)")`).
- Steps: set system to dark, open the app fresh.
- Observed: app loads in light mode regardless of OS preference.
- Expected: on first load, read `prefers-color-scheme` and set `darkMode` accordingly (still allow override).

### B-719 — Dual-relation mirror does NOT backfill existing linked rows when toggling isDual on after rows are already linked (P2, open)
- File: src/lib/store.ts updateDatabaseProperty (the auto-pair creation logic), and PropertyEditor.tsx RelationCell.toggle (only mirrors on subsequent toggles).
- Steps: create relation prop X without dual; link a few rows. Then toggle isDual on.
- Observed: paired prop Y is created on target DB (good), but ROW values on the target side are not synced from existing X values. Y appears empty even though A→B links exist.
- Verification log: row_mp2v3c9ydsk3dcpj.values[prop_mp2v63eeyn4c] = [row_mp2v59la2y9ox67e]. row_mp2v59la2y9ox67e.values has NO entry for prop_mp2vzw2hvvafghtd (the paired side). Mirror is one-sided.
- Expected: when isDual is enabled OR a paired prop is created, walk through all rows of the source DB and mirror their existing relation values onto the paired side.

### B-721 — Block menu shows "⌘D" as the Duplicate shortcut but no keyboard handler exists (P2, open)
- File: src/components/editor/Block.tsx — onKeyDown handles metaKey+b/i/u/Shift+s/e but not metaKey+d. BlockMenu MenuItem for Duplicate declares `shortcut="⌘D"`.
- Steps: focus a block, press Cmd+D (Mac) / Ctrl+D (others).
- Observed: browser adds a bookmark (default behaviour). The advertised "⌘D" shortcut does nothing in-app.
- Expected: bind Cmd+D in Block.onKeyDown to `e.preventDefault()` + `duplicateBlock(block.id)` (using the same logic as the menu's Duplicate item).

### B-720 — Recreating a unique-id property after deletion loses the prefix but counter survives — display becomes broken (P2, open)
- File: src/lib/store.ts addDatabaseProperty (doesn't restore prefix), PropertyEditor.tsx UniqueIdCell.
- Steps: existing DB has BugID prop with prefix "BUG"; 2 rows already have BUG-1, BUG-3. Delete BugID. Recreate it as type=unique-id (new name "BugID2"). Add a new row.
- Observed: db.nextUniqueId is preserved at 4 (good - so new row gets seq=4). But the new property has no `prefix` set, so rows render as bare numbers "1", "3", "4" with no separator. The old prefix "BUG" is lost. The cell now displays "1" for the row that was previously "BUG-1" — confusing for users who relied on that ID.
- Verification log: after recreation, prop = `{id: prop_mp2x1bfzedtw, name: "BugID2", type: "unique-id"}` — no prefix. row_mp2v3c9ydsk3dcpj.uniqueIdSeq=1; row_mp2v3d77ydg7zv2s.uniqueIdSeq=3; new row uniqueIdSeq=4.
- Expected: either (a) preserve the deleted prop's prefix somewhere DB-level and re-apply when recreated, or (b) prompt user to set the prefix on creation, or (c) reset `db.nextUniqueId` to `max(seqs)+1` when the property is deleted so re-creation doesn't have weird gaps.


## 2026-05-12 19:45 — Test agent batch 10

### B-800 — Malformed table block `rows` field crashes the WHOLE page (no boundary recovery) (P1, fixed)
- File: src/components/editor/Block.tsx SimpleTableEl line 1033, 1057. Reads `t.rows.map` directly with no validation.
- Steps: any persisted table block where `rows` is not an array — e.g. an old block created before the type changed, or a corrupted JSON import — opens the page.
- Observed: ErrorBoundary catches but root-level error page renders ("This page didn't load — t.rows.map is not a function"). The entire page becomes inaccessible; no edit affordance to delete the bad block.
- Expected: guard `Array.isArray(t.rows) ? t.rows : [["",""],["",""]]` and/or surface a per-block error placeholder ("Table data is corrupt — click to reset") rather than killing the whole route.

### B-801 — Public /p/<slug> toggle never renders nested children (P2, fixed)
- File: src/routes/p.$slug.tsx lines 161-167. The `<details>` summary has the toggle content but the body is empty — no recursive rendering of child blocks.
- Steps: in workspace, add a toggle with two text blocks inside; publish; open /p/<slug>; expand the toggle.
- Observed: details opens but body is blank.
- Expected: render the toggle's child blocks below the summary, recursively via ReadonlyBlock.

### B-802 — Public /p/<slug> sub-page shows generic "📄 (Sub-page link)" — no title, no link (P2, fixed)
- File: src/routes/p.$slug.tsx line 213-215. Returns a static label.
- Steps: publish a page that contains a sub-page block.
- Observed: viewers see `📄 (Sub-page link)` with no indication of which page.
- Expected: at minimum show the sub-page title; if the sub-page is also published, link to its public slug; otherwise show "(unpublished sub-page)".

### B-803 — AI block silently disappears on /p/<slug> when result is empty (P3, fixed)
- File: src/routes/p.$slug.tsx line 206 — `if (!a.result) return null;`
- Steps: include an AI block (still generating, or never invoked) in a published page.
- Observed: the block vanishes entirely, leaving an unexplained gap between siblings.
- Expected: show a small "AI block (no output yet)" placeholder so the published structure is preserved.

### B-804 — After changing relation prop to "text", stale relation fields linger on the source prop (P3, fixed)
- File: src/lib/store.ts updateDatabaseProperty — when switching from relation→text, the new prop object retains `isDual`, `pairedPropertyId`, `targetDatabaseId` (only the type and orphan-cleanup of the partner happens).
- Steps: dual relation A↔B. From DB A's "Linked" header, change Type to "text".
- Observed: DB B loses its paired prop (good — verification fix works), but DB A's "Linked" prop is now `{ type: "text", isDual: true, pairedPropertyId: "...", targetDatabaseId: "..." }`.
- Expected: when type changes off "relation", strip `isDual`, `pairedPropertyId`, `targetDatabaseId`. Otherwise re-toggling type back to "relation" produces a "ghost" pairing pointing at a deleted prop, which can re-create or confuse downstream code.

### B-805 — VERIFICATION FAILED: rollup property does not auto-default to "count of linked" even when a relation exists (P1, fixed)
- File: src/lib/store.ts addDatabaseProperty (rollup branch).
- Steps: db with at least one existing relation prop. Click + property, type=rollup, name=anything, Create.
- Observed: new prop is `{id, name, type:"rollup"}` — no `relationPropertyId`, no `function`. Every cell renders the italic "configure rollup" placeholder, requiring manual setup per the existing UI.
- Expected per implementer task: "Rollup default behaviour: create a rollup property after creating a relation; cell should show 0 (count of linked) without manual configuration." Need to default `relationPropertyId` to the first relation in the database and `function` to `count` (or `count-all`), so cells render the link count immediately.

### B-806 — Public /p/<slug> never applies dark mode (P2, open)
- File: src/routes/p.$slug.tsx — no dark-mode reading at all.
- Steps: visit /p/<slug> with system or app set to dark.
- Observed: page renders in light mode (white background) regardless. ReadonlyBlock uses `dark:` classes (e.g. dark:border-violet-700) so the markup is prepared, but neither the host route nor any layout applies a `dark` class on html/body. dark variants therefore never activate.
- Expected: read `prefers-color-scheme` or app-stored darkMode and add `dark` class to <html>; or simply remove the `dark:` variants if dark is intentionally not supported on public pages.

### B-807 — Block reorder: `insertIndex = sourceIndex < targetIndex ? targetIndex : targetIndex` is a no-op ternary (P3, open)
- File: src/components/editor/Block.tsx line 128.
- Steps: dragging from index 5 to index 1 (later→earlier) inserts at targetIndex (the same place as moving the other direction).
- Observed: dropping "file" on "aud" places file BEFORE aud. Functionally OK as "insert above", but the ternary is dead code and probably masks a bug — the original intent was likely to subtract 1 when moving downward. Drop precision below or above the target hover line is also impossible (only "above" insert exists).
- Expected: either remove the ternary (just write `targetIndex`) or implement proper above/below by checking pointer Y relative to target.bounding rect.

### B-808 — Sign-in failure shows no error message (P1, fixed)
- File: src/routes/auth.tsx (or similar)
- Steps: sign in with wrong credentials (e.g. nonexistent@test.com / wrong password). Click Sign in.
- Observed: button click has no visible effect. No toast, no inline error. User is just sitting on /auth wondering whether anything happened.
- Expected: surface the supabase auth error message (e.g. "Invalid login credentials") near the form. Also disable+spin the button while the request is in flight.

### B-809 — created-by / last-edited-by cells render truncated UUID instead of user name (P2, open)
- File: src/components/database/PropertyEditor.tsx (or wherever person/people rendering lives) — for created-by/last-edited-by the value is the auth UUID and the cell shows the last 6 chars.
- Steps: in a database, add created-by + last-edited-by properties, add a row.
- Observed: cells render "9b7d81" — last 6 chars of the user id.
- Expected: show the user's `currentUser.name` (or avatar + first name). The store already keeps `currentUser` so a lookup `state.workspaces[wid].members[uid].name` (or a `users` map) should be straightforward.

### B-810 — formula cell renders empty with no affordance to configure expression (P3, open)
- File: PropertyEditor.tsx formula cell.
- Steps: add formula property, do nothing else.
- Observed: cell is fully blank; no italic "set formula", no clickable area to enter an expression.
- Expected: italic "Set formula" placeholder on hover, opening an expression editor on click.

### B-811 — Typing latency scales linearly with block count: ~8 ms/keystroke at 2000 blocks (P2, open)
- File: src/lib/store.ts updateBlock + src/components/page/PageView.tsx — likely the zustand subscription causes a full PageView re-render on any block content change.
- Steps: create a page with 2000 text blocks; type 50 chars into block #10.
- Observed: 418 ms total (~8.4 ms/char). At 500 blocks the same test was 82 ms (~1.6 ms/char). Linear with N.
- Expected: typing latency should be O(1) — only the focused block should re-render. Selector `useStore(s => s.blocks[id])` per BlockComponent should already isolate, but PageView re-reads the whole `pageBlocks` array on every updateBlock (it likely re-creates the array reference via `useStore(s => s.pages[id].blocks.map(bid => s.blocks[bid]))` or similar). Memoize the block list and use shallow comparison.

### B-812 — Page-title commit needs blur to persist; programmatic title set via execCommand does not save reliably (P3, open)
- File: src/components/page/PageView.tsx onInput updates local `title` state; onBlur calls `commitTitle`.
- Steps: programmatic title edits (or rapid type-then-navigate before blur) lose the title — sidebar/command-palette show empty.
- Observed: new pages created and titled via test scripts have `title: ""` in the store.
- Expected: persist on each input (debounced) so leaving the page via sidebar click commits the title. Currently fast nav loses the title.

### B-813 — Sidebar shows empty/Untitled pages with no title — easy to lose track (P3, open)
- File: src/components/layout/Sidebar.tsx page listing.
- Steps: create a page, don't title it, navigate away.
- Observed: sidebar shows blank label.
- Expected: render "Untitled" placeholder (italic muted) so users can find the page.

### B-814 — Sidebar page-menu toggle is racy with outside-click handler — first click sometimes does nothing (P3, open)
- File: src/components/layout/Sidebar.tsx — page menu uses useState toggle plus likely a useEffect document mousedown handler. Same pattern as sign-out (B-???) where the first click also failed.
- Steps: rapidly click `[data-testid="page-menu-<id>"]`.
- Observed: ~50% of the time, menu doesn't open. Need to click twice.
- Expected: button toggle should always reflect a single click. Either guard the outside-click handler against the same target, or use `onPointerDown` with `e.stopPropagation()`.

### B-815 — Comment "Post" button doesn't post on initial keystroke if textarea was just filled (race) (P3, open)
- File: src/components/page/PageComments.tsx (or wherever post handler reads value).
- Steps: rapidly fill comment textarea and click Post.
- Observed: empty comment, no error. Re-typing or pressing Post a second time submits.
- Likely cause: textarea content is only committed to state via onChange — if user clicks Post before the synthetic event flushes (e.g. fast script-driven flow), the post handler reads stale empty state.
- Expected: Post handler should also read `textareaRef.current.value` as fallback, and disable+spin while submitting.

### B-816 — Button block has no UI to configure actions; created empty so click is a no-op (P2, open)
- File: src/components/editor/Block.tsx ButtonBlockEl (line 1222). The block stores `actions: []` after creation and only the label is editable via the inline input. There is no "+ Add action" affordance.
- Steps: slash → /button.
- Observed: created button with label "Click me"; clicking does nothing (no toast, no popover).
- Expected: an "Actions" gear icon next to the label that opens a small picker (show-confirmation / send-webhook / insert-block) — analogous to the existing button-property `actions` editor used by db `prop_mp2vbo9tr3si`.

### B-817 — Slash commands /chart, /form, /list, /timeline create a database but ignore the requested view type (P2, open)
- File: src/lib/slash-commands.ts lines 410-440 declare `extra: { view: "chart" }` etc, but the database-inline insertion handler doesn't read it. Every new DB ships with the default 4 views (All/By status/Calendar/Gallery), with no view of the requested type.
- Steps: /chart → press Enter.
- Observed: db with only table/board/calendar/gallery views.
- Expected: db should also include the requested view (or that should be the *initial* view), and the view selector should default to it.

### B-818 — View options menu lacks Sort / Filter / Group / Hide property entries (P1, fixed)
- File: src/components/database/* — view-menu only exposes Rename / Delete / Add property.
- Steps: open any inline DB view options.
- Observed: Only Rename view / Delete view / Add property are in the menu. No way to define `sort`, `filter`, `group`, `hidden properties` via the UI even though the underlying store + view types support them (filters/sorts/hiddenProperties already exist on the view object).
- Expected: classic Notion view options panel: Sort, Filter, Group, Hide properties, Wrap cells (which IS stored as `wrapCells: false`).



## 2026-05-12 20:10 — Test agent batch 11

### B-900 — Verification pass for batch 10 fixes (P3, info)
- B-800 (corrupt table): VERIFIED — injected `{type:"table", rows:"not-an-array..."}` via localStorage, reloaded, page renders fine with the table block degraded to an empty grid; no console errors; rest of page renders.
- B-805 (rollup auto-default): VERIFIED — adding a new rollup via + form now creates `{type:"rollup", function:"count", relationPropertyId:<first relation>, targetPropertyId:""}` and the cell renders the live count of linked rows immediately (showed "1" once a relation was wired). Old pre-existing rollup props still show "configure rollup" placeholder which is correct.
- Relation auto-target: VERIFIED — adding a new relation via + form creates `{type:"relation", isDual:false, targetDatabaseId:<some other db>}` — `targetDatabaseId` is now set instead of undefined.

### B-901 — Verification of B-801/B-802/B-803 (P3, info)
- B-801 toggle expand on /p/<slug>: VERIFIED — `<details>` element renders the toggle header and nested child (`<p>Hidden child inside toggle</p>`) becomes visible when expanded.
- B-802 sub-page link: VERIFIED — `sub-page` block with published target renders as `<a href="/p/<slug>"><span>{icon}</span><span>{title}</span></a>`; unpublished target renders as `<span>{icon}</span><span>{title} <span class="text-xs">(unpublished)</span></span>`.
- B-803 AI block placeholder: VERIFIED — empty `ai-block` renders the italic muted "AI block (no output yet)" placeholder inside the violet card.

### B-902 — Verification of B-804 stale relation field strip (P3, info)
- VERIFIED — after switching a dual relation to type=text, the resulting prop is `{id, name:"Linked", type:"text"}` with `isDual`, `pairedPropertyId`, `targetDatabaseId` all stripped. The paired property on the other DB is also cleaned up.

### B-903 — B-818 confirmed: view options menu still missing Sort/Filter/Group/Hide (P1, fixed)
- Steps: page → inline DB → view-menu button.
- Observed: menu has only "Rename view / Delete view / PROPERTIES (Name/Linked, + Add property)".
- Expected: classic Notion options panel (sort/filter/group/hide).

### B-904 — DnD reorder INSIDE a column does nothing (still B-713/I-711) (P2, open)
- Steps: page with `columns/column` block; column has 3 text children; drag handle of child #0 onto child #2.
- Observed: `column.blockIds` is unchanged ([t1, t2, t3]) after the drag/drop events. No reordering at all.
- Expected: t1 should move to a new position.

### B-905 — DnD into another column does nothing (P2, open)
- Steps: drag left column child onto right column child.
- Observed: both columns' blockIds unchanged. No re-parenting.
- Expected: dragged block should be moved into the target column.

### B-906 — B-811 typing latency at 2000 blocks (P2, open)
- Steps: page with 2000 text blocks; programmatically type 50 chars into block #10.
- Observed: 416 ms total = 8.3 ms/keystroke. At 1000 blocks the same test was 111 ms = 3.7 ms/char. Still scales linearly with N.
- Expected: O(1) — see I-811.

### B-907 — Synced block is still a placeholder card with no runtime (P3, open)
- Steps: insert `synced-block` via slash or directly in state.
- Observed: renders the pink-border "SYNCED BLOCK — Content will be mirrored across pages." stub. No way to actually mirror content. See B-709.
- Expected: either implement mirroring (master + referrer block IDs, propagate updates) or remove it from the slash menu.

### B-908 — Permanently deleting a page leaves orphan column/child blocks in state (P2, fixed)
- File: src/lib/store.ts deletePagePermanently — only removes blocks listed in `page.blocks`, not children of columns/toggles.
- Steps: page → /columns 2 → fill both columns with text blocks → trash → permanent Delete.
- Observed: `blocks[blk_col_left]`, `blocks[blk_col_right]`, and their `blockIds` text children (`blk_col_left_t1..t3`, `blk_col_right_t1`) remain in localStorage. Sidebar-deleted page leaves 7 orphan blocks per typical 2-column layout.
- Expected: recursively walk children (column.blockIds, toggle children whose parentId === toggleBlockId, etc.) and remove all of them.

### B-909 — Slug collision still possible (still B-717) (P2, fixed)
- File: src/components/page/ShareDialog.tsx — slug input on publish has no collision check.
- Steps: publish page A with slug X. Publish page B with slug X.
- Observed: both succeed, both have publishSlug=X. /p/X navigates to whichever page appears first in the pages object. Other page becomes unreachable via slug.
- Expected: validate slug uniqueness on publish; either reject with inline error or auto-suffix.

### B-910 — JSON export omits currentUser record; re-import would lose author identity (P3, open)
- File: src/routes/app.settings.tsx or wherever export is built.
- Steps: Settings → Export workspace as JSON.
- Observed: top-level keys are workspace/teamspaces/pages/blocks/databases/rows/comments/templates/automations/calendarEvents/mails/exportedAt/schemaVersion. No `users`/`currentUser` block. `pageOwners`/`createdBy`/`lastEditedBy` reference UUIDs that won't resolve in a fresh import.
- Expected: include a `users` map (or at least pseudonymized {id, name, email, avatar}) so re-import can rebind authorship; or strip those fields if anonymization is intended.

### B-911 — Mobile sidebar overlays content and never auto-closes (P2, fixed)
- File: src/components/layout/Sidebar.tsx — `max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:shadow-xl` with no scrim.
- Steps: open in 375px viewport. Tap a page in sidebar.
- Observed: sidebar covers ~70% of screen, no overlay scrim, and persists after navigation; page content is barely usable.
- Expected: tap-outside should close it; navigation should auto-close on mobile.

### B-912 — Command palette block-content search is title-only (P3, open)
- Steps: ⌘K → type "Hidden child" (text content inside an existing toggle block).
- Observed: "No results"; only `page.title` is matched. Blocks aren't searched.
- Expected: search within block content too (Notion does this).

### B-913 — Calendar Week/Day views are not implemented (P2, open)
- File: src/routes/app.calendar.tsx — `view` state created, `<select>` for month/week/day, but no conditional render uses it; only the month grid renders.
- Steps: Calendar → select Week (or Day) in the view dropdown.
- Observed: still shows the full month grid. Selecting Day/Week is a no-op.
- Expected: render a 7-day strip for Week and a single-column hour grid for Day.

### B-914 — Toggle block in the editor never renders its children (P2, fixed)
- File: src/components/editor/Block.tsx — ToggleBlockEl line ~738 renders the literal placeholder `"(Toggle children — coming soon)"` instead of mapping `parentId === toggleId` blocks (and toggle-heading variants share the same code path).
- Steps: create a toggle block. Add (or seed in state) a child block with parentId = toggle id. Open the toggle in the editor.
- Observed: child does not appear; only the placeholder message shows.
- Expected: render the toggle's child blocks (parent-id pointer pattern). Note: the public viewer at /p/<slug> already does this correctly (see B-801 verification), so the discrepancy is editor-only.
- Side effects: any toggle child block is effectively orphaned in the UI — only accessible via direct localStorage edit or publishing.

### B-915 — Unknown block types are silently dropped on /p/<slug> (P3, open) — overlap with B-716
- Steps: page with a `completely-unknown-type` block; publish.
- Observed: editor shows the existing "Unsupported block: completely-unknown-type" fallback; the public viewer drops it entirely with no placeholder.
- Expected: same fallback message on public viewer for parity / so missing blocks are visible.

### B-916 — Permanently deleted page does not also remove children of toggle/columns/sub-pages (P2, open) — broader form of B-908
- Steps: page with sub-page → permanent Delete the parent.
- Observed: child sub-page records remain in `pages`/`blocks` and may appear orphaned. Same issue applies to columns (B-908) and toggle children.
- Expected: traversal-based cleanup.


## 2026-05-12 22:00 — Test agent batch 12

### B-1000 — Verification of batch-11 view-menu Sort & Filter (P3, info)
- B-818/B-903 view-menu Sort & Filter: VERIFIED FIXED.
- `view-menu-<viewId>` button now opens a popover with `Sort` section (Add sort) and `Filter` section (Add filter). Setting `propertyId=p_num, direction=asc` reorders rows from default insertion order (Charlie, Alice, Bob, Dave, Eve) to (Dave=1, Alice=3, Charlie=5, Eve=7, Bob=9). Toggling direction to `desc` reverses to (9,7,5,3,1).
- Adding a `contains "Al"` filter on Name reduces the table to just `Alice` and the `+ New row` row. Store correctly reflects view.filters/view.sorts.
- All 12 operators (`contains`, `does-not-contain`, `is`, `is-not`, `is-empty`, `is-not-empty`, `greater-than`, `less-than`, `greater-than-equal`, `less-than-equal`, `checked`, `unchecked`) executed without throwing and returned the expected subsets.

### B-1001 — Verification of multi-property (secondary) sort (P3, info)
- Configured `view.sorts = [{p_check, desc}, {p_num, asc}]`. Rows reordered to: Dave(Done=true,1), Charlie(true,5), Alice(false,3), Eve(false,7), Bob(false,9). Primary sort respected, ties broken by secondary sort. No errors.

### B-1002 — Verification of B-914 toggle children in editor (P3, info)
- Created `toggle` block with `parentId=null` and a child text block with `parentId=<toggle.id>`. Closed chevron renders only "Top-level toggle"; clicking `data-testid="toggle-<id>"` opens it and child `Child inside toggle` appears in `data-testid="toggle-children-<id>"` along with `+ Add block` button.
- Clicked `+ Add block` (data-testid `toggle-add-<id>`) — a new empty text block was added with `parentId=<toggle.id>`. Typed "Typed inside toggle" via `execCommand('insertText')` — content persisted in store. Reloaded the page — toggle re-opens (because `open: true`), and both child blocks ("Child inside toggle" and "Typed inside toggle") are still rendered.

### B-1003 — Verification of B-908/B-916 permanent delete cascade (P3, info)
- Built a page (pg_cascade_parent) containing: `columns/column` (2 cols, 3 text children), a `toggle` with child, and a `sub-page` block pointing at pg_cascade_sub. Moved parent to trash, navigated to /app/trash, clicked Delete (permanent).
- All 8 child blocks (blk_cascade_cols, _colL, _colR, _tL1, _tL2, _tR1, _tog, _togchild) were removed from `blocks`. The linked sub-page (pg_cascade_sub) was also deleted from `pages`. No orphans remain.

### B-1004 — Verification of slug uniqueness on publish (P3, info)
- Published pg_test_b12_sortfilter and renamed slug to `sharedslug` via the ShareDialog input. Then navigated to pg_test_b12_toggle, published it, and changed its slug to `sharedslug`. Result: page B's slug auto-became `sharedslug-2`, and the dialog showed a "taken" warning. Both pages keep distinct slugs in the store. Old B-717/B-909 collision is FIXED.

### B-1005 — Verification of non-native Rename view + Add property (P3, info)
- Overrode `window.prompt` to flag invocation. Opened the view-menu and clicked `Rename view`: focus jumped to an inline `<input value="All">`, prompt was NOT called.
- Clicked `+ Add property`: focus moved to an inline `<input placeholder="Property name">` next to an `Add` button; prompt was NOT called.
- End-to-end: typed "NewProp" + Enter on the property input, the database properties list grew from 6 to 7 with a new `{type:"text", name:"NewProp"}` property appended. UI is fully non-blocking.




## 2026-05-12 22:30 — Test agent batch 13

### B-1100 — Verification: Mail Compose Send actually saves (P3, info)
- Steps: /app/mail → Compose → fill To/Subject/Body → Send.
- Result: a new mail record is created in `mails` with `labels: ["sent"]`, `from: "me@notionclone.app"`, `to: ["bob@example.com"]`, `subject`, `body`, `snippet`, `read: true`, `receivedAt`, plus `archived/trash/starred: false`. The inbox list immediately renders the new message with a "sent" badge. FIX VERIFIED.

### B-1101 — Verification: Comments author snapshot survives cross-user view (P3, info)
- Steps: post a comment as user A (TestBatch12, `7153c57b…`). Log out. Sign up/sign in as user B (TestBatch12B). Because the store is per-user (namespaced by `notion-clone:user:<uid>`), I copied A's comment object into B's `comments` map to simulate a shared comment, then re-rendered.
- Result: the rendered author chip in the comments panel reads "TestBatch12" (the original author snapshot) even though `currentUser.name` is "TestBatch12B". `authorName` and `authorAvatar` are baked into the comment record at write time. FIX VERIFIED.

### B-1102 — Verification: Synced block source + ref live mirroring (P3, info)
- Steps: programmatically seeded `pg_b13_synced_*` with a `synced-block` (one text child) and an unlinked `synced-block-ref`. Pasted the source id into `synced-source-input-…` and clicked `synced-source-link-…`. The ref switched from "NO SOURCE" state to a mirrored body showing "Source content line 1". Edited the source's text inline to "Source content EDITED LIVE" — ref updated in the same frame. Reloaded the page — mirror still rendered. FIX VERIFIED.

### B-1103 — Verification: Calendar Week view renders 7-day strip (P3, info)
- Steps: /app/calendar → view=week. Found `[data-testid="calendar-week-grid"]` and exactly 7 `week-day-YYYY-MM-DD` cells (Mon-Sun, 2026-05-11..2026-05-17). Locale header is "lun. 11 / mar. 12 / mer. 13 / jeu. 14 / ven. 15 / sam. 16 / dim. 17". B-913 FIX VERIFIED for Week.

### B-1104 — Verification: Calendar Day view renders 24 hour rows (P3, info)
- Steps: /app/calendar → view=day. Found `[data-testid="calendar-day-grid"]` and exactly 24 hour rows `day-hour-0..day-hour-23`. Day header reads "mardi 12 mai 2026" plus an "+ Event" button. B-913 FIX VERIFIED for Day.

### B-1105 — Verification: Calendar "+" day-add uses inline compose, not native prompt (P3, info)
- Steps: month view. Stubbed `window.prompt` with a counter, then clicked `[data-testid="day-add-2026-05-12"]`. Result: counter stayed 0; a new `<input placeholder="Event title…">` appeared inline on that day's cell. Native `prompt` is no longer used for event creation.

### B-1106 — Sidebar Favorites are rendered in arbitrary order; no sort/reorder UI (P2, open)
- File: src/components/layout/Sidebar.tsx line 22 — `Object.values(pages).filter((p) => p.isFavorite && !p.isInTrash)`. No `.sort()` and no drag-handle.
- Steps: favorite three pages in a specific intended order (e.g., Roadmap, Welcome, Getting Started). Reload.
- Observed: the FAVORITES section lists them in `Object.values(pages)` insertion order (Welcome, Getting Started, Roadmap), not the order the user starred them, and certainly not a reorderable order. Even programmatically setting `favoriteSortOrder` on each page has no effect.
- Expected: either preserve favoriting timestamp (sort by `favoritedAt` desc) or expose drag handles to reorder.

### B-1107 — Database button cell ignores `label`; renders fallback "Run" for every action (P2, fixed)
- File: src/components/database/PropertyEditor.tsx line ~582 — `{bp.label || "Run"}`.
- Steps: a `button` property with `label: "Confirm me"` and `actions:[{kind:"show-confirmation"}]` was rendered.
- Observed: every button cell shows "Run" instead of the configured label; only the column header reflects the property name. Combined with the fact that you can have N buttons in one row, the user can't tell them apart from the cell alone.
- Expected: render `bp.label` (already on the type) — fall back to `property.name` before "Run", and prepend the `bp.emoji` if set.

### B-1108 — Database button cell only handles 3 of the action kinds (P2, fixed)
- File: src/components/database/PropertyEditor.tsx ~563–574.
- The cell only branches on `edit-property`, `show-confirmation`, `send-webhook`. The `ButtonAction` type allows more (e.g., `insert-block` used in Block.tsx 1330), and the user-facing slash-button supports `add-page`, `add-row`, etc. The cell silently drops unrecognized kinds (no toast, no log).
- Expected: at minimum support the same kinds Block.tsx button supports (so block buttons and DB buttons behave consistently), and on an unknown kind emit `toast(...)` rather than dropping silently.

### B-1109 — Database row's button column header shows the ▶ emoji icon even when no emoji is set, with no way to override (P3, open)
- Steps: button property with no `emoji` field. Column header still renders "▶<name>" by default. There's no surface to set a custom emoji per property in the property editor.
- Expected: allow choosing an emoji (the type already has `emoji?: string`), or drop the default ▶ when empty.

### B-1110 — Slash menu performance with rapid typing is fine (P3, info)
- Steps: opened slash menu on a new text block. Programmatically typed 15 chars in succession via execCommand("insertText").
- Observed: 5 ms total / 0.3 ms per char. Filter narrows correctly: typing "head" reduces 41 items to 7 (h1/h2/h3 + toggle-h1/2/3 + slash-menu itself). Typing a gibberish string closes the menu (empty results). PERF OK.

### B-1111 — Cmd+K palette ArrowDown/Up + Enter all work (P3, info)
- Steps: ⌘K, type "Wel" → list narrows to two pages (Welcome, Getting Started — both match "we" / "ge"). ArrowDown highlights second item (`bg-accent` class applied); ArrowDown again at the bottom doesn't wrap; ArrowUp moves back to first. Enter navigates to the highlighted page (verified URL change to its `/app/p/<id>`).
- Note: cmdk does NOT use `aria-selected`; relies purely on a `bg-accent` class. Screen readers won't know which item is current. See I-1100 below.

### B-1112 — Database table page crashes when a row lacks `createdBy` / `lastEditedBy` and the view shows those columns (P2, fixed)
- File: src/components/database/PropertyEditor.tsx line 84/87 — `row.createdBy.slice(-6)` and `row.lastEditedBy.slice(-6)`.
- Steps: seed a row with no `createdBy` or `lastEditedBy` fields (which can happen on partial imports / older rows from B-910 if anyone re-imports JSON), display in a view that exposes the `created-by` / `last-edited-by` property type.
- Observed: top-level CatchBoundary fires with "Cannot read properties of undefined (reading 'slice')"; the entire page becomes a "This page didn't load" screen.
- Expected: guard with `row.createdBy ? row.createdBy.slice(-6) : "—"` (and respect I-809).

### B-1113 — Wide tables horizontally scroll but the Name (title) column is not sticky (P2, fixed)
- File: src/components/database/DatabaseTableView (the `overflow-x-auto rounded border border-border` wrapper).
- Steps: open a table with ~22 visible properties; scrollWidth=1851 vs clientWidth=662. Scroll the container 1000px right.
- Observed: the title column scrolls off the left edge of the viewport (its x = -599); user loses row context.
- Expected: make the first (title) column `position: sticky; left: 0` with a solid background, matching Notion / Airtable / Linear behaviour.

### B-1114 — Page-level button block has no UI to add/edit/remove actions (P2, fixed)
- Steps: insert `/button` → a "Click me" button appears with a small Label input next to it. Clicking the button when `actions = []` does literally nothing (no toast, no alert, no error).
- Observed: the only editor surface is the label input. There is no menu/popover to configure actions and no fallback toast like the DB ButtonCell has ("Ran '..' — configure actions in property settings.").
- Expected: a "Configure actions" affordance on the button block (matches I-816), plus a no-op-toast so the user knows their click was received.

### B-1115 — Settings → Export workspace creates a download but has no matching Import path (P3, open)
- File: src/routes/app.settings.tsx — only "Export workspace as JSON". Pairs with I-807 already filed.
- Steps: click "Export workspace as JSON". File `notion-clone-export-YYYY-MM-DD.json` downloads. Settings has no input/upload control to load it back.
- Expected: see I-807 — accept the same JSON via `<input type="file" accept="application/json">` plus schemaVersion validation.

### B-1116 — Sharing UI offers only public publish; there is no per-person ACL (P2, open)
- File: src/components/page/ShareDialog.tsx — "People with access" section is hard-coded to "Workspace members get access automatically" with no controls.
- Observed: no email-invite input, no permission level dropdown (view/comment/edit), no per-user list.
- Expected: even an MVP could store `page.permissions: PagePermission[]` (the type already exists on Page) and render an invite input + per-row dropdown.

### B-1117 — No per-page export to PDF or Markdown (P3, fixed)
- File: nothing — there's no PDF/Markdown export anywhere. `grep -r "export.*pdf\|export.*markdown"` returns 0 hits.
- Steps: open a page → header has Share/History/Comments/Favorite/AI/dark-mode buttons but no "Export" menu. The page menu in the sidebar (the ⋯ "More" button) also offers no export.
- Expected: at minimum a "Copy as Markdown" action on the page menu — this is one of the most-requested Notion features and the editor block tree maps trivially to MD. PDF can come later via `window.print()`-friendly stylesheet.

### B-1118 — Page button block: store `actions` array is initialised to `[]` but never editable through the UI (P3, open)
- See B-1114. Without an editor, the only way to set actions is to hand-edit localStorage. Pair with I-816.

### B-1119 — No web clipper (out-of-scope per task brief, P3, info)
- Confirmed: the codebase has no browser-extension or bookmarklet for clipping web pages. Documented here so it's clearly captured as a "not in scope" gap rather than a missed bug.

### B-1120 — Public viewer renders synced-block / synced-block-ref as "(Synced content)" placeholder (P2, fixed)
- File: src/routes/p.$slug.tsx line ~249-251.
- Steps: create a synced-block + ref in the editor, link them and verify mirror works in editor. Publish the page → /p/<slug>.
- Observed: both source and ref render as the literal italic text "(Synced content)" — children of the source are not walked. The public viewer therefore strips all synced content silently.
- Expected: in the public viewer, walk `source.blockIds` (for synced-block) or `blocks[ref.sourceId].blockIds` (for ref) and render each child via the existing readonly Block component.

### B-1121 — Cmd+Z on contenteditable title does not undo the title change (P3, open)
- Steps: focus the page title h1, select-all, type "NEW TITLE". Trigger Cmd+Z on the element.
- Observed: title stays "NEW TITLE" — neither browser-native nor app-level undo restored the previous value. Same problem on block text content (likely a broader undo-history gap; see existing notes about history block in store).
- Expected: undo restores the previous text. Since store.history exists per-page, a Cmd+Z handler could traverse it.

### B-1122 — Block type transformation leaves leftover button-only fields on the new block (P3, open)
- File: src/components/editor/Block.tsx — block-menu "transform to <type>" handler.
- Steps: insert `/button` → use the block handle menu to convert to heading-1.
- Observed: the block becomes `{type:"heading-1", label:"Click me", actions:[]}` — `label` and `actions` aren't stripped even though heading-1 has no such fields.
- Expected: when transforming to a different type, drop fields that aren't part of the target type's schema (or at least the union-narrowed ones), or run the new shape through a sanitiser.

### B-1123 — Cmd+D duplicate-block keybinding still missing (P3, fixed) — overlap with I-719
- Steps: focus a block's contenteditable, dispatch keydown {key:'d', metaKey:true}.
- Observed: no handler runs; block list size doesn't change.
- Expected: see I-719. The block menu already shows the "⌘D" hint, so the absence is doubly confusing.

### B-1124 — B-912 block-content search VERIFIED FIXED (P3, info)
- Steps: instantiate template "Meeting notes" (creates a page with body "Agenda / Decisions / Action items"). ⌘K, type "Attendees" or "Decisions".
- Observed: command palette returns "Meeting notes" page even though the title doesn't contain that text. CommandPalette.tsx already does `stripHtml(b.content).toLowerCase().includes(q)` for each block of the page. B-912 IS NO LONGER A BUG.

### B-1125 — `add-block` UI button doesn't trigger slash menu for the same input session (P3, info)
- Steps: click `+ New block` (data-testid="add-block") → focus moves to a new contenteditable. Type "/code" — slash menu doesn't immediately open in some cases unless you press `/` and let the input flush; calling `execCommand("insertText", "/code")` programmatically sometimes also fails. Workaround: type just `/`, wait, then type the rest.
- Expected: insertion of `/` should open the menu regardless of how it was typed.

### B-1126 — Code block copy works; "javascript" default language is bundled into the select label (P3, info)
- The `<select data-testid="code-lang-…">` aggregates options as visible text rendering with no separators ("javascripttypescriptpython…") in the slash menu fallback view (the select itself is fine when expanded). Cosmetic.

### B-1127 — Mobile sidebar still overlays (B-911) and there is no scrim (P2, fixed) — verified
- 375x812 viewport. Sidebar slides over content; tap a page link, sidebar persists. Existing B-911 unchanged.

### B-1128 — Wide-table seed shows 22 columns even though I requested 26 (P3, info)
- After dropping created-by/last-edited-by columns (to avoid B-1112 crash), 24 remained but only 22 prop-header testids appear. Likely a hidden-properties filter or a non-rendered column type. Minor diagnostic.

### B-1129 — Board view "Add card" works (P3, info)
- Steps: switched to a board view grouped by a select property → `board-add-o` creates a new row with `{p_extra_2: 'o', p_title: ''}`. No crashes.

### B-1130 — `add-block` floating + button doesn't create a block at end of page (P3, info)
- Steps: click `[data-testid="add-block"]`. The function call seems to be a no-op when the last block is already empty; doesn't always add a new one.

### B-1131 — "Add teamspace" still uses native window.prompt (P2, fixed)
- File: src/components/layout/Sidebar.tsx line 87 — `const name = prompt("Teamspace name?")`.
- Steps: stub window.prompt → click "Add teamspace" in sidebar. A teamspace named "auto" was silently created (matched the stub's return).
- Expected: open the same inline-rename input pattern that B-1005 introduced for "Rename view" / "+ Add property". No native dialogs.

### B-1132 — Sidebar pages aren't draggable for reorder (P3, open)
- Steps: scan `document.querySelectorAll('[draggable="true"]')` after page load. Only block handles in the editor are draggable. The pages list inside teamspaces (`[data-testid^="ts-"]` children) has no draggable wrappers.
- Expected: drag-handle in front of each sidebar page row for in-teamspace and cross-teamspace reorder.

### B-1133 — New Timeline view added on an existing DB silently renders "Name" header with no rows (P3, open)
- File: src/components/database/views/TimelineView.tsx — early-return "Timeline requires a start date property." only if `startProperty` is undefined. After clicking the timeline preset under "+ Add view" the new view has no `startProperty` set (default for board → groupByProperty similarly may need a default), so the placeholder message should appear; but the table-style header still renders, masking the issue.
- Expected: when a view is missing required configuration, show a clear "Set start date property →" CTA, and don't fall back to the regular table-like row dump.

### B-1134 — Automations exported in JSON but no UI to author them (P3, info)
- File: src/routes/app.settings.tsx — `automations: Object.values(s.automations ?? {})` appears in the export, but no app surface lets a user create or edit automations. Matches Notion's "Automations" gap; document here so it's clear.

### B-1135 — Calendar inline-created event can't be deleted because of `source` / `calendarSource` field mismatch (P2, fixed)
- File: src/routes/app.calendar.tsx — `quickCreateEvent` writes `calendarSource: "personal"`. The selected-day list renders a Trash button conditional on `e.source === "calendar"` (line ~250). The reduced display object has `source: db.name` only for database-derived events; user-created events have no `source` field set.
- Steps: open Calendar → click "+ Event" on day 2026-05-15 → type "Test event B13" + Enter. Click the day cell to see the event list. No delete button is shown; there's no edit either.
- Expected: user-created calendar events should be deletable / editable. The simple fix is to either (a) map `calendarSource === "personal"` to `source: "calendar"` when building eventsByDay, or (b) change the conditional to check the raw event's `calendarSource`.

### B-1136 — Restoring a page snapshot updates the store but doesn't refresh contenteditable DOM (P3, fixed)
- File: src/components/page/PageHistoryPanel.tsx (or whichever owns the Restore button).
- Steps: open page Welcome → History → "Save snapshot now". Edit the title to "XX broken title". Click Restore.
- Observed: store-level title rolls back to "Welcome" (verified via localStorage), but the on-screen H1 contenteditable still reads "XX broken title" until a full reload.
- Expected: when restoring, force a re-mount or set `key` on the page wrapper / `contentEditable.textContent` to the restored value. Otherwise users think the restore failed.

### B-1137 — No event-edit affordance on Calendar; only the in-flight compose input is editable (P2, open)
- After creating an event via the inline compose, there's no way to rename, move to a different day, or change start/end time short of editing localStorage. No `evt-edit-…` testids exist.
- Expected: a click on the rendered event chip should open an inline edit popover (or open the side panel with editable title/date/source fields).

### B-1138 — Database Form view exposes "Copy form link" but the generated link is the same `/p/<slug>` page route (P3, open)
- File: src/components/database/views/FormView.tsx (or similar).
- Observed: clicking "Copy form link" presumably stores a public form URL, but there is no `/form/<slug>` route; the form preview is inline on the editor page only. Anonymous submission wasn't validated.
- Expected: either implement a public form submission flow on /form/<slug> or rename the button to "Copy share preview link".

### B-1139 — Chart view's "Y: Count" works but X-axis options include `title` properties that produce 1 bar per row, no aggregation (P3, info)
- Observation: with only 3 rows and "Count" aggregation the chart UI renders correctly, but selecting the title as X-axis effectively makes each row its own group. Not a bug per se — flag for I-improvement re: smarter default X.

### B-1140 — Inline equation block placeholder is "(empty equation)" with no input affordance until clicked (P3, info)
- Steps: /math → block renders just the text "(empty equation)". No visible editable hint, no cursor focus, no edit icon. Click on it eventually exposes an input but it's not discoverable.
- Expected: a clear "Type LaTeX or click to edit" placeholder, or auto-focus the input on insertion.

### B-1141 — Inline toolbar verified present with bold/italic/strike/code/link/color/ai (P3, info)
- Select text in any block → `[data-testid="inline-toolbar"]` appears with 7 buttons. Good coverage; matches the commit message "Add inline formatting toolbar".

### B-1142 — Breadcrumb block only shows current page when no parent chain exists (P3, info)
- Steps: /breadcrumb on a top-level page renders just "👋 Welcome". Hierarchy support for sub-pages exists in store but breadcrumb doesn't traverse it well from a top-level page (no surprise since there's no parent).
- Expected: same on top-level pages (acceptable), but ensure the breadcrumb on a sub-page shows the full chain.


## 2026-05-12 23:35 — Test agent batch 14 (verification + exploration)

### B-1200 — Verification: B-1112 created-by/last-edited-by no longer crashes; missing values render "—" (P3, info)
- Steps: create a DB with `type:"created-by"` + `"last-edited-by"` properties; seed one row with the meta fields, one row without (`delete row.createdBy; delete row.lastEditedBy`).
- Observed: row with values renders the truncated id tail ("992914"); row without renders "—". No crash.
- B-1112 confirmed fixed.

### B-1201 — Verification: B-1107 DB ButtonCell renders emoji + label and toasts per action kind (P3, info)
- Steps: created a DB with `actions:[{kind:"show-confirmation",...}]`, `{kind:"open-page"}`, `{kind:"edit-property"}`, `{kind:"send-webhook"}`, `{kind:"insert-block"}`, unknown kind, and `actions:[]`.
- Observed: button renders `"<emoji> <label>"`; click of each: show-confirmation→message toast; open-page→navigation; edit-property→cell value updates; send-webhook→"Sent webhook to <url>" toast; insert-block→silently inserts (no toast — see B-1202); unknown→"Unknown button action: weird-stuff"; empty→"Ran "<label>" — configure actions in property settings."
- B-1107 confirmed fixed.

### B-1202 — `insert-block` action has no user-visible feedback when database has no parent page (P3, open)
- File: src/components/database/PropertyEditor.tsx around line 580.
- Observed: when `database.parentId` is unset the action is a complete no-op — no toast, no error. With a parent the block is appended but no confirmation toast either ("Inserted block" only fires inside the `else` branch).
- Expected: at minimum toast "Inserted block" or "Cannot insert: database has no parent page" so the user knows what happened.

### B-1203 — TableView crashes ("Cannot read properties of undefined (reading 'includes')") when a view lacks `hiddenProperties` (P1, fixed)
- File: src/components/database/views/TableView.tsx line ~44.
- Steps: create or import a DB where `views[i]` does not include `hiddenProperties: []` (e.g. older seeds, custom plugins, manual JSON). Navigate to the DB.
- Observed: full-page error boundary "This page didn't load". Other DBs in the workspace remain usable but the toaster mount can also disappear depending on tree position.
- Expected: defensively fall back to `view.hiddenProperties ?? []` before calling `.includes()`, or migrate older view objects on load.

### B-1204 — Verification: B-1131 inline teamspace input replaces native prompt (P3, info)
- Steps: stubbed window.prompt to count invocations → clicked "Add teamspace" → an input with `data-testid="add-teamspace-input"` appeared, prompt was never called. Typed "QA Team" + Enter → new teamspace persisted.
- B-1131 confirmed fixed.

### B-1205 — Verification: B-1135 calendar inline events now show Trash buttons (P3, info)
- Steps: created "B14 trash event" on 2026-05-15 via the inline composer. Clicked the day cell.
- Observed: the right-rail day list shows both the existing "Test event B13" and "B14 trash event" each with a `lucide-trash-2` destructive button.
- B-1135 confirmed fixed.

### B-1206 — Verification: B-1120 /p/<slug> renders synced-block children (P3, info)
- Steps: opened /p/synced-block-test (the existing published page with synced-block + ref).
- Observed: body text "Source content EDITED LIVE" appears twice — once for the source, once for the mirror. No "(Synced content)" placeholder remains.
- B-1120 confirmed fixed.

### B-1207 — Verification: B-1113 wide-table title column stays anchored on scroll (P3, info)
- Steps: opened db_b13_wide (22 columns) → set scrollLeft to 800 on the scroll container → checked first `<th>`/`<td>` computed style and bounding rect.
- Observed: first column has `position: sticky; left: 0; z-index: 1` (cells) / `2` (header), background `bg-card`. Title header bounding rect stays at left=281px (sidebar offset) regardless of horizontal scroll.
- B-1113 confirmed fixed.

### B-1208 — Verification: B-1114 page-level button with no actions emits toast (P3, info)
- Steps: seeded a `{type:"button", label:"No-op Btn", actions:[]}` block on Welcome → clicked it.
- Observed: toast `Ran "No-op Btn" — open block menu to add actions.` (slightly different copy than the DB cell — see B-1209).
- B-1114 confirmed fixed.

### B-1209 — Page button vs DB button "empty actions" toast wording is inconsistent (P3, info)
- DB cell says `Ran "<label>" — configure actions in property settings.`; block-level says `Ran "<label>" — open block menu to add actions.`
- Minor — but the two should ideally share copy or at least both link to the relevant settings affordance.

### B-1210 — Verification: B-1136 history restore now updates the title contenteditable (P3, info)
- Steps: opened Welcome → History → Save snapshot now → mutated H1 to "MUTATED_TITLE_X" → re-opened History → clicked the just-saved Restore.
- Observed: H1 contenteditable updates to "Welcome" without reload; store title also "Welcome".
- B-1136 confirmed fixed.

### B-1211 — Mobile sidebar still has no scrim and clicking outside doesn't dismiss it (P2, fixed)
- Reproduces B-1127 / B-911 in batch 14. Mobile preset 375x812. Aside opens by clicking the "Open sidebar" aria-label. After opening:
  - No overlay/backdrop is rendered (`getComputedStyle` finds no fixed div with semi-transparent background).
  - Tapping the content area on the right doesn't close the drawer.
- Expected: a fixed div with `bg-black/40` + `onClick=closeSidebar` behind the drawer; same as the "Esc closes" affordance.

### B-1212 — DB row title click does not open a row-detail page (P2, open) — confirms I-300
- Steps: on db_b13_wide, click any `[data-testid^="cell-title-"]`.
- Observed: the input gains focus for inline edit; there is no expand/open icon (`row-open-*` testid does not exist). No `/app/row/<id>` route exists in the file router.
- Expected: a hover-revealed "↗ Open" affordance per row that pushes the user to a row-detail page (mirroring Notion's row peek).

### B-1213 — Cmd+/ does not open a shortcut/help overlay (P3, open)
- Steps: focused on a Welcome page contenteditable; dispatched keydown `{key:"/", metaKey:true}` and `{ctrlKey:true}`. No dialog opens, no toast, no body diff.
- Expected: Cmd+/ is the universal "show keyboard shortcuts" affordance. Either implement it or repurpose for a quick-action menu.

### B-1214 — Synced-block propagation paints noticeably slowly with 30 refs on one page (P3, info)
- Steps: created a page with 1 synced-block (1 text child "Source body for perf test") + 30 synced-block-refs. Edited the source child via execCommand insertText.
- Observed: rAF callback timed out for >30s in the eval harness (the renderer became unresponsive); on settling, all 31 mirrors carry the new text. So the propagation is correct but the perf is poor at this scale.
- Expected: re-renders should be O(refs) ≤ 16ms. Possibly the store update causes a full subtree re-render of every synced-block-ref via shallow `useStore`.

### B-1215 — Auth sign-up + sign-out + sign-in round trip works (P3, info)
- Steps: from /auth → Sign up: filled name/email/password → submitted form → workspace creates → Log out → /auth → fill same email/password → form.requestSubmit() returns to /app.
- Observation: when the user clicks the "Sign in" button directly (not via form.requestSubmit), the click did not always submit — likely because the click target was outside the form. Minor UX nit; the form does submit normally on Enter.

### B-1216 — Sign-in: clicking the visible "Sign in" button does not always submit if focus is elsewhere (P3, open)
- Steps: stub native dialogs; on /auth (sign-in tab), set value on auth-email + auth-password via the native setter; click the visible "Sign in" button (`Array.from(...).find(b => b.innerText === "Sign in")`).
- Observed: page stays at /auth with no error message; no console errors. Calling `document.querySelector('form').requestSubmit()` works.
- Likely cause: there are two "Sign in" elements (the tab and the submit button) and `Array.find` returns the tab button (which only switches mode).
- Expected: the tab and submit should be visually/semantically distinct, or both should have unique testids.

### B-1217 — /page slash command works end-to-end (P3, info)
- Steps: /page on Welcome → a new child "Untitled" page is created in the sidebar; a `[data-testid="pagelink-<blkid>"]` block is inserted; clicking the pagelink navigates to the child page.
- Confirmed: works as expected.

### B-1218 — Trash route never lists deleted databases (P2, fixed)
- Steps: seeded a DB with `isInTrash: true` directly into the user state, reloaded, navigated to Trash.
- Observed: Trash shows "Trash is empty." even though `state.databases[<id>].isInTrash === true`.
- Expected: the Trash route should aggregate trashed pages + databases (+ optionally rows / blocks) so the user can restore them.

### B-1219 — View menu has no Group-by picker in any view type (P2, open) — confirms I-501
- Steps: created a DB with table + board views; opened `view-menu-v_gb_t` (table) and `view-menu-v_gb_b` (board). Each menu exposes Rename / Delete / Add sort / Add filter / Add property only.
- Observed: there is no UI to set or change `groupByProperty`; the board's group-by must be set via direct state mutation (or it falls back to `_all`).
- Expected: a "Group by" select / picker in view-menu (especially for board / list / chart views).

### B-1220 — Form view exposes "Copy form link" that points to a non-existent /form/... route (P2, open) — relates to B-1138
- Steps: created a DB → added Form view → clicked `form-copylink-...` (with clipboard stub). Returns `http://localhost:8080/form/<dbId>/<viewId>`. Navigating to that URL renders the 404 page.
- Expected: either implement the /form route as a public submission form (writes rows to the target DB), or remove / re-label the button (e.g., "Copy preview link" pointing back to the editor).

### B-1221 — Inline toolbar "Insert link" uses native window.prompt (P2, fixed)
- File: src/components/editor/InlineToolbar.tsx line 60-64. `function applyLink() { const url = prompt("URL:"); ... }`.
- Steps: stub window.prompt to record calls → select text in any block → click `[data-testid="ib-link"]` (mousedown). Prompt is called once and the returned URL is wrapped via `createLink`.
- Expected: replace with an inline popover input (same pattern as B-1131 / B-1005). Native prompts can't be styled and are flagged as a regression by the task brief.

### B-1222 — Inline toolbar "Insert link" button click silently fails after `prompt` stub returns empty/null (P3, info)
- If the user dismisses the prompt (returns null), the link is silently skipped. With an inline popover this is fine, but the current native prompt has no way to communicate "did you cancel or did you want an empty href"?

### B-1223 — Cmd+K command palette opens but searching by page title returns no items in this session (P3, info)
- Steps: Cmd+K → input has focus → type "Welcome" → no `command-item-*` testids appear (the dropdown stays empty). The agent14 workspace does have a Welcome page in localStorage so the search index may not include freshly-created/seeded pages until something else triggers a rebuild.
- Re-test with B-13's existing Welcome page once the index re-runs (CommandPalette.tsx).

### B-1224 — Block menu items "Duplicate" and "Turn into &lt;type&gt;" lack testids (P3, info)
- File: src/components/editor/Block.tsx menu — only `menu-delete-<bid>` and `turn-<type>` are exposed; Duplicate has none.
- Useful for E2E selectors.

### B-1225 — Image block via /image renders a working `media-url-*` + `media-embed-*` flow (P3, info)
- Slash /image → block has `[data-testid="media-url-<bid>"]` input + `[data-testid="media-embed-<bid>"]` button + `[data-testid="media-file-<bid>"]` file picker. Pasting a URL + clicking Embed inserts `<img src=...>`. Enter on the input does not submit (must click Embed). Possible UX nit.

### B-1226 — Inbox: page comment shows up as a notification, "Mark as read" clears it (P3, info)
- Comment added at page level → /app/inbox shows "👋 Welcome 12/05/2026 22:07:47 Test comment B14 Mark as read"; clicking the button reduces inbox to "All caught up! ✨".

### B-1227 — Dark-mode toggle works (P3, info)
- Click the "Toggle dark mode" aria-label button → `<html>` gains `dark` class. Toggle persists across reload via store.ui.

### B-1228 — Templates instantiate as new pages in Private teamspace (P3, info)
- Click any template button → new page in Private with the template's title / body / icon. Works.

### B-1229 — AI panel responds with a deterministic fallback "I couldn't find anything specific…" message (P3, info)
- Steps: Cmd+. → AI panel opens; typed "Hello agent" + Enter / Send → demo fallback message. Acceptable for demo mode but confirm there is a clear "Demo (no API key)" disclaimer beyond the small footer.

### B-1230 — Sidebar pages are not draggable for reorder (re-affirms B-1132, P3, info)
- All `[data-testid^="handle-"]` (19 of them on Welcome) ARE draggable; sidebar pages have no draggable wrappers.


## 2026-05-13 00:30 — Test agent batch 15 (verifications)

### B-1300 — Verification: B-1203 legacy DB view (missing hiddenProperties/filters/sorts) no longer crashes (P3, info)
- Steps: mutate one view in localStorage to delete `hiddenProperties`, `filters`, `sorts`, `propertyOrder` keys → reload → navigate `/app/db/<id>`.
- Observed: DB renders normally; table view shows with columns + add-property affordance. No error boundary, no console errors.
- B-1203 confirmed fixed.

### B-1301 — Verification: B-1221 InlineToolbar link button uses inline popover (P3, info)
- Source: `src/components/editor/InlineToolbar.tsx` line 60-87, 180-205. `applyLink()` no longer calls `window.prompt`; it sets `linkOpen=true`, saves the selection in `savedRangeRef`, and renders a popover with `[data-testid="ib-link-popover"]` containing `[data-testid="ib-link-input"]` (Enter commits, Escape cancels) and `[data-testid="ib-link-apply"]`.
- Note: end-to-end DOM repro is awkward because the InlineToolbar listens to `selectionchange` and the preview iframe loses focus between eval calls, collapsing the selection. Code review + testid presence confirm the popover wiring.
- B-1221 confirmed fixed.

### B-1302 — Verification: B-1211 mobile drawer scrim (P3, info)
- Steps: mobile preset 375x812 → `[data-testid="open-sidebar"]`.click() → aside renders (x=0, w=256), `[data-testid="sidebar-scrim"]` present (button, fixed inset-0, bg `rgba(0,0,0,0.4)`, z-index 20). Click on scrim → aside is unmounted, openBtn returns.
- Tapping a nav button (`[data-testid="sidebar-home"]`) also auto-closes the drawer and navigates to /app.
- B-1211 confirmed fixed.

### B-1303 — Verification: B-1218 trash route lists databases (P3, info)
- Steps: mark a DB `isInTrash:true` in localStorage → reload → /app/trash.
- Observed: "DATABASES" section appears with the DB name, row count, and `[data-testid="trash-db-<id>"]` row with `restore-db-<id>` and `delete-forever-db-<id>` buttons. Restore clears `isInTrash` and the row disappears; Delete forever removes the DB from `state.databases`.
- B-1218 confirmed fixed.

### B-1304 — Date filter operators greater-than/less-than do not work on date properties (P1, fixed)
- File: `src/components/database/filter.ts` lines 23-30.
- Steps: created DB with `date` property + 6 rows with ISO dates spanning Apr–Jun 2026 → added filter `p_due greater-than 2026-04-12` (should match 5 rows).
- Observed: 0 rows match.
- Root cause: `Number("2026-05-06T22:00:00.000Z")` returns `NaN`. The greater-than operator does `Number(v) > Number(f.value)` which compares NaN to NaN → false.
- Expected: detect property type (or value type) and coerce via `Date.parse(v)`/`Date.parse(f.value)` before comparison.
- Also note: the filter value <input> is `type="text"` even when the selected property is a date; this should be `type="date"` with a calendar picker.

### B-1305 — Filter operator `contains` does not work on multi-select / array values (P1, fixed)
- File: `src/components/database/filter.ts` lines 11-14.
- Steps: created DB with `multi-select` property `Tags` (`tg_eng`, `tg_ops`, `tg_design`). 3 rows include `tg_eng`. Added filter `p_tag contains tg_eng`.
- Observed: 0 rows match.
- Root cause: `typeof v === "string"` short-circuits when `v` is an array (multi-select stores arrays of option ids). For arrays the filter should check `v.includes(f.value)` or test option name substring.
- Expected: `contains` on multi-select / status / select-as-id should detect array vs string.

### B-1306 — Filter `is` on select uses the option-id as comparison value but the value input is a plain text box (P2, open)
- Steps: filter `p_status is st_doing` works only if the user types the raw option id; there is no select-option dropdown.
- Expected: when the filtered property is select/status/multi-select, render the input as a select of the property's options (matching by id, label shown to the user).

### B-1307 — Filter on select operator `contains`/`does-not-contain` matches the raw option-id, not the user-facing label (P3, open)
- See B-1305/B-1306. Even if we fix the array issue, the comparison should be against label/name, not option id — otherwise the user has to enter cryptic ids in the input.

### B-1308 — Sort on Priority sorts alphabetically by option id ("high" < "low" < "med"), not by option order (P2, open)
- File: `src/components/database/filter.ts` lines 53-59. `compareValues` falls back to `localeCompare`.
- Steps: created DB with select Priority (Low/Med/High options in that order) → sort by Priority asc.
- Observed: rows ordered "High, Low, Med" — alphabetical, not by the option order the user configured.
- Expected: for select/status, sort by the index of the option in `property.options[]`. Notion uses option order for "is" filters and sort tiebreakers.

### B-1309 — Filter input field is `type="text"` regardless of underlying property type (P2, open)
- File: filter row (see filter UI screenshot via DOM). For date, number, select, multi-select, person, status etc. the input is still a plain text input.
- Expected: switch input type / component based on property type: date → `<input type="date">`; select/status → `<select>` of options; checkbox → `checked|unchecked` operators only (already correct); number → `<input type="number">`; person → person picker.

### B-1310 — AI chat (Cmd+. panel) shows full answer in one shot, no token-by-token streaming (P2, open)
- File: `src/components/ai/AIChat.tsx` lines 71-83. `send()` enqueues a 600ms `setTimeout` then appends the entire `answer` to the message list. There is no incremental update of the assistant message.
- Steps: open AI chat (Cmd+. or `[data-testid="ai-btn"]`) → type message → submit → polled DOM 12 times at 150ms intervals; final assistant message appears all-at-once after ~600ms.
- Expected: stream tokens into the last assistant bubble for an LLM-like feel (e.g., split the canned answer by whitespace and append every 30-50ms; or use the real Fetch stream API when wired). Even in demo mode, simulated streaming gives a much better UX and matches Notion AI.

### B-1311 — `/ai` block (ai-block) shows full result in one shot, no streaming animation (P3, open)
- File: `src/components/editor/Block.tsx` lines 1286-1293. `generate()` waits 800ms then sets `result` once.
- Steps: insert via slash menu, type a prompt, click Generate → button briefly shows "…" then full result appears.
- Expected: animate the result chunked, or at least show a typing indicator that's distinct from the "Thinking…" state of the chat.

### B-1312 — Circular synced-block (ref pointing to its own page's synced-block) crashes/hangs the renderer (P1, fixed)
- Steps: create a `synced-block` source with a child `paragraph` and an additional `synced-block-ref` whose `sourceId` points to the source itself, all on a single page → navigate to the page.
- Observed: PageContent crashes with `Cannot read properties of undefined (reading 'map')` repeatedly (error boundary kicks in); a subsequent valid reload causes the renderer to become unresponsive (eval timeout after 30s). The server had to be restarted.
- Expected: defensively detect cycles in the synced-block render (e.g., maintain a `visitedSources` set passed through children rendering and bail out of any source that's already in the set, rendering an "⚠ Circular sync reference" placeholder).

### B-1313 — No UI affordance to add block-level comments (P2, open) — confirms still missing
- The `Comment` model in the store has a `blockId` field (see `PageComments.tsx` line 12 — `!c.blockId` filter) so the schema supports it, but there is no UI to create a block-level comment:
  - `src/components/editor/Block.tsx` has no Comment menu item, no hover-revealed comment icon, no shortcut handler.
  - `PageComments.tsx` only renders comments where `!c.blockId`.
- Steps: hover any block, open the block menu, search for "Comment" → not present. The InlineToolbar has no Comment button either.
- Expected: a "Comment" item in the block hover menu / dropdown that creates a `Comment` with `pageId` + `blockId` set, plus an inline indicator (e.g. a yellow speech-bubble in the gutter) on blocks that have unresolved comments; clicking the indicator opens the comments panel filtered to that block.

### B-1314 — Timeline view bars all have identical width regardless of date (P3, open)
- Steps: created DB with 6 rows whose `date` property spans Apr 11–Jun 10 2026; switched to Timeline view → 6 bars, all `width=96px`, only `x` position changes.
- Expected: a date property in Notion can store a `start` and `end`; the bar width should be derived from `end − start`. If the property is point-in-time only, bars should display as a chevron / pin rather than a full-width bar.
- Implementation should detect `range` on the date property and render accordingly.

### B-1315 — Chart view legend / axis labels show raw option ids instead of option names (P2, open)
- Steps: DB with status options (`st_done`, `st_doing`, `st_todo` mapped to labels Done/Doing/Todo) → added Chart view; defaults to bar chart with X = first non-title (Status) → bars labeled `st_done`, `st_doing`, `st_todo`.
- Expected: render the option `name` not the option `id`. Same will apply to select / multi-select X axes.

### B-1316 — Chart view: X-axis labels for date column show raw ISO timestamps, hard to read (suspected; not directly tested) (P3, open)
- See B-1315 root cause — chart axis builds buckets from raw stored values without coercing through property option lookup or date formatter.

### B-1317 — Sign-up: invalid email is blocked by HTML5 native validation tooltip; no custom inline error UX (P3, open)
- Steps: /auth → Sign up → fill name + `not-an-email` + password → submit form. Native browser tooltip ("Please include '@' in the email") shows in the browser's locale; form is NOT submitted.
- Expected: alongside the HTML5 validity, render a custom inline error such as `<p data-testid="auth-email-error">Enter a valid email</p>` so the message is consistent across browsers/locales and works in test environments where the native tooltip is invisible.

### B-1318 — Changing a relation property's target DB leaves stale row ids in the source rows and renders them as "Untitled" (P1, fixed)
- Steps:
  1. Create two DBs `B` and `C`. Each has a single title property.
  2. Create DB `A` with a relation property `p_rel` whose `targetDatabaseId = "db_b"`.
  3. Add a row in A with `p_rel = ["r_b1", "r_b2"]`.
  4. Change the relation's `targetDatabaseId` from `db_b` to `db_c` (via direct state mutation; there is no UI affordance — see I-XXXX).
  5. Reload → the relation cell in DB A still shows the two old links rendered as `"Untitled"` because the row ids no longer resolve in `db_c`.
- Expected: when `targetDatabaseId` changes, the implementer should either
  - clear all linked-row references on every row of DB A for that property (`row.values[p_rel] = []`), OR
  - prompt the user "Changing target DB will discard 2 existing links — continue?" and only then clear; OR
  - block the change unless the property is empty across all rows.
- Currently the linked ids leak into the new target DB's render path and produce phantom "Untitled" entries that look like real records but cannot be opened.

### B-1319 — No "Delete forever" action on the sidebar page-menu for any page (P2, open)
- Steps: hover any page in the sidebar → click `[data-testid="page-menu-<id>"]` → menu only shows Add to favorites / Duplicate / Move to Trash.
- Expected: when the page is already trashed, the menu should offer "Delete forever" / "Restore" (or surface those in a separate trashed-pages section in the sidebar). Today the only entry point for permanent delete is the /app/trash route via `[data-testid="delete-forever-<id>"]`.

### B-1320 — Cmd+K keyboard shortcut does not open the palette when dispatched programmatically (P3, info)
- Steps: dispatched `KeyboardEvent('keydown', {key:'k', metaKey:true})` on document/window — palette did not open. Clicking `[data-testid="sidebar-search"]` does open it.
- Likely a `useEffect` listener that filters on `e.code === "KeyK"` or attaches to a specific element. Should also bind to `document.addEventListener("keydown", ...)` with no element guard so synthetic events work — useful for E2E.

### B-1321 — Calendar "+" quick-create works (P3, info)
- Steps: /app/calendar → click a date cell → click "+" pencil button → input placeholder "Event title…" appears with Create/Cancel → fill title → click Create → event appears in cell. Confirmed working.

### B-1322 — Board view drag-drop between columns works (P3, info)
- Steps: created board view grouped by select property; dragged a card via synthetic dragstart/dragover/drop → `row.values[groupBy]` updated to the new option id. Confirmed working end-to-end.

### B-1323 — Formula `prop("Nonexistent")` silently returns empty, no error (P3, open)
- Steps: set a formula property's `expression` to `prop("PropDoesNotExist")` → cell renders blank. Other formula errors (e.g., `1 + +`) surface as `#ERR: …`.
- Expected: either `#ERR: Unknown property` to help users debug typos, or document that missing props return null.

### B-1324 — Export workspace as JSON works (P3, info)
- Steps: /app/settings → click `[data-testid="settings-export"]`. Stub `URL.createObjectURL` to capture: receives a `application/json` blob, size ~10KB for a small workspace.


## 2026-05-12 21:00 — Test agent batch 16

### Verification of implementer fixes (B-1304, B-1305, B-1312, B-1318)
- **B-1304 (date filter coerce):** VERIFIED. Seeded DB with date column + 3 rows (2026-01-15, 2026-06-15, 2026-12-15). Filter `When greater-than 2026-03-01` returns 2 rows (Jun, Dec). `less-than 2026-08-01` returns 2 rows (Jan, Jun). `Date.parse` coercion in `toComparable` works.
- **B-1305 (multi-select contains):** VERIFIED. Row with `Tags=[tg_red,tg_blue]` matches `contains "red"`, `contains "blue"`, and `contains "tg_red"`. Array branch in `evalFilter` triggers `v.some((item) => …includes(needle))`.
- **B-1312 (synced-block cycle):** VERIFIED. Built ref1 → source → ref2 → source cycle via localStorage and reloaded. Page renders the `synced-cycle-blk_sync_ref2` placeholder "⚠ Synced reference cycle detected — stopped mirroring…" twice (once inside source, once inside ref1). No hang, no crash, error boundary not triggered.
- **B-1318 (relation target swap):** VERIFIED. Changed `rel-target-p_rel` from `db_b` to `db_c` via the property-header select. Store reflects: `targetDatabaseId = "db_c"` and `r_a1.values.p_rel = []`. UI cell shows "Empty" instead of stale "Untitled, Untitled".

### B-1400 — `/equation` (`slash-math`) block renders raw LaTeX text, no math typesetting (P2, open)
- Steps: open any page → `/` → click `slash-math` → block inserts → fill the textarea with `\frac{a}{b} + \sqrt{x^2 + y^2}`.
- Observed: preview area below the textarea shows the literal string `\frac{a}{b} + \sqrt{x^2 + y^2}` in serif font.
- Expected: KaTeX or MathJax rendering of the LaTeX expression. Notion uses KaTeX for inline + block equations.
- Code: `src/components/editor/Block.tsx` `EquationEl` (~line 1104) renders `{content || "(empty equation)"}` directly.

### B-1401 — Code block Tab key does not insert a tab character (P3, open)
- Steps: insert `/code` block → focus textarea → press Tab.
- Observed: focus moves to next element. Textarea value remains unchanged (no `\t` insertion).
- Expected: in a code block, Tab should insert a literal tab (or 2/4 spaces) and Shift+Tab should outdent. Standard behavior of code editors.
- Note: pasting indented code works correctly — only direct Tab keypress fails.

### B-1402 — Sort tiebreaker between numeric strings and non-numeric strings is brittle (P3, info/open)
- Steps: DB with rows whose `text` column values are `"0", "3", "9", "20", "100", "apple", "banana", "zebra"`; sort asc.
- Observed: `0, 3, 9, 20, 100, apple, banana, zebra` — numerics first (numeric-aware), then strings alphabetically.
- Edge case: if any string starts with digits (e.g. `"3 items"`, `"20 reasons"`) it would silently mix with numerics. `Number("3 items")` returns NaN so it falls to localeCompare against a true numeric, producing inconsistent ordering. Add a parse strictness check: only treat as numeric if `String(v).trim()` parses cleanly via `/^-?\d+(\.\d+)?$/`.

### B-1403 — Cascading view options (filter + sort + hidden) work as expected (P3, info)
- Steps: seeded DB `Mixed` with `view.filters=[Val>5]`, `view.sorts=[Val asc]`, `view.hiddenProperties=[Title]`. Reloaded → table renders only Val column with `9, 20, 100` (string rows excluded because NaN>NaN is false). Confirmed working.

### B-1404 — Button block with `open-page` action navigates correctly (P3, info)
- Steps: seed a button block on Getting Started with `actions: [{kind: 'open-page', pageId: pg_mp33cd7d7bhkdxpb}]` → reload → click the button.
- Observed: `window.location.href = "/app/p/pg_mp33cd7d7bhkdxpb"` fires; the destination page loads. Confirmed working.
- Note: uses hard navigation (`window.location.href = ...`) instead of TanStack Router's `navigate()` — see I-1400.

### B-1405 — Board view shows per-column row count next to column name (P3, info)
- Steps: /app/db/db_a → Board view → confirmed columns "No status", "A", "B" each render a small count badge ("0", "0", "2"). Confirmed working.

### B-1406 — Form view multi-select field renders as plain text input; submitted value stored as raw comma string, not an array (P2, fixed)
- Steps: add a form view to a DB with a `multi-select` property → switch to Preview → the multi-select field is a plain text `<input>`; type `tg_red,tg_blue` and Submit.
- Observed: `row.values[multiSelectPropId] === "tg_red,tg_blue"` (string) instead of `["tg_red","tg_blue"]` (array). Subsequent renders treat it as a single unknown option label.
- Expected: render a multi-select chip picker in the form (Notion shows tag chips with auto-complete). Even if the picker isn't built, the value should at minimum be split on `,` and stored as an array. As-is, multi-select form submissions are corrupt.
- File: `src/components/database/views/FormView.tsx` `FormField` — no `multi-select` branch.

### B-1407 — Form view has no conditional logic (P3, open)
- Steps: examined FormView.tsx — there is no concept of `showIf` / `requireIf` / branching based on previous answers.
- Expected: per-field conditional logic ("show this field only if status === 'in progress'"). Notion's "Forms" feature includes basic conditional logic.

### B-1408 — Page duplicate shares the underlying database (shallow clone); deleting one DB block deletes data from both pages (P2, open)
- Steps: page "Getting Started" contains an inline-database block referencing `db_dates_test`. Right-click → Duplicate. The duplicate page's inline-database block has `databaseId === "db_dates_test"` (same reference).
- Observed: any row added on the duplicate appears on the original. This is debatable — Notion offers both behaviors via a confirmation dialog ("Keep as linked database" vs "Duplicate database").
- Expected: at minimum, prompt the user "Duplicate the underlying database too?" or default to deep-copy with a follow-up linked-DB option.

### B-1409 — Inbox shows "All caught up!" but there is no @mention / notification creation path anywhere in the app (P3, info)
- Steps: /app/inbox shows the empty state. Grep across `src/components` finds no mention-handling, no notification creation when comments are posted, no @user trigger in any block content / palette / comment input.
- Expected: posting a comment containing `@username` (or `@mention`) should create an entry in the recipient's inbox. Today the inbox is purely a UI shell.

### B-1410 — Page duplicate clones block contents and button-block actions (P3, info)
- Steps: page "Getting Started" → Duplicate → new page has fresh block ids and correctly preserves `button.actions = [{kind:'open-page', pageId}]` on the cloned button. Confirmed working for blocks (not for DB ref — see B-1408).

### B-1411 — Trash restore + delete-forever flow works (P3, info)
- Steps: page → Move to Trash → /app/trash shows it → Restore returns it to teamspace; Move to Trash → Delete forever removes it from `s.pages` map. Confirmed working.

### B-1412 — Add-to-favorites / Remove-from-favorites toggles + FAVORITES sidebar section renders correctly (P3, info)
- Steps: page-menu → Add to favorites → sidebar shows FAVORITES section with the page → re-open menu → label is now "Remove from favorites". Confirmed working.

### B-1413 — Search palette matches page titles and block content (P3, info)
- Steps: ⌘K → "Roadmap" → matches the page by title; "orientation" → matches the page because of a block "Welcome! Here's a quick orientation." Confirmed working.

## 2026-05-12 21:30 — Test agent batch 17

### B-1414 — Slash menu disappears entirely when query matches nothing (P3, open)
- Steps: in a block, type `/xyzzyabc` (no matches).
- Observed: the `[data-testid="slash-menu"]` is removed from the DOM.
- Expected: show an empty-state "No results" inside the menu (matches Notion). Improves discoverability — users see the menu was active, the query just didn't match.

### B-1415 — Chart view ignores `view.xProperty` from serialized localStorage on initial mount (P3, open)
- Steps: set `view.xProperty = "p_grp"` in localStorage and reload.
- Observed: the X-axis dropdown still shows "First non-title" / `value=""`. Reading from `view.xProperty` only happens AFTER first manual interaction.
- Expected: chart-view init should hydrate the `<select value>` from `view.xProperty`. Currently the controlled select's `value` doesn't reflect the persisted view state (see ChartView.tsx line 18 — `xProp` fallback uses `view.xProperty` but the select uses `value={view.xProperty}` which is undefined for legacy / freshly seeded views).

### B-1416 — Chart view X-axis labels still show raw option ids — confirms B-1315 (P2, open)
- Steps: chart view with X=Group (select), single group `g_b` containing 2 rows.
- Observed: X axis label reads `g_b`, not the option name `B`.
- File: `src/components/database/views/ChartView.tsx` line 36 `key = String(v ?? "Empty");` — never resolves through `property.options`.

### B-1417 — Timeline view bars all use identical width 96px — confirms B-1314 (P3, open)
- Steps: timeline view on `db_dates_test` with 4 rows spanning 2026-01-15 to 2026-12-15.
- Observed: 4 `tl-bar-*` elements, all `style="width: 96px"`. Only `left` differs.
- Same as B-1314 — implementer hasn't picked this up yet.

### B-1418 — Calendar view in DB only shows events when navigated to the right month (P3, info)
- Steps: db_dates_test calendar view defaulted to May 2026; rows have dates in Jan/Jun/Sep/Dec 2026; no bars in May.
- Confirmed: clicking `cal-next-db_dates_test` to June reveals "Mid" on Jun 15. Calendar↔DB sync works once you navigate.

### B-1419 — Mail UI: detail pane has no Reply / Forward / Archive / Apply Label affordances (P3, info)
- Steps: /app/mail → "Load sample emails" → click an email.
- Observed: detail pane renders from/subject/timestamp/body only. There are no action buttons.
- Expected: Reply, Forward, Archive, Delete, Move to label, Mark unread. The label tag (e.g. `customer-feedback`, `scheduling`) is rendered in the list but cannot be assigned/changed.

### B-1420 — Mail: list view "Compose" button has no testid (P3, open)
- Steps: /app/mail → click "Compose" button. The button has a label but no `data-testid`. Same for the seeded label chips (`customer-feedback`, `scheduling`) which are rendered as text spans, not interactive elements with stable selectors.

### B-1421 — Templates page applies the template correctly (P3, info)
- Steps: /app/templates → click `template-Meeting notes` → new page is created with the expected scaffolding (Date, Attendees, Agenda, Decisions, Action items) and routed to. Confirmed working.

### B-1422 — Inbox does not surface notifications when comments are posted (P3, open)
- Steps: posted a comment on a page → checked /app/inbox.
- Observed: still "All caught up!". No notification record is created in `s.notifications` (no such slice in store).
- Expected: posting a comment on a page you don't own should notify the page owner (and any prior commenter). See I-1408.

## 2026-05-12 22:00 — Test agent batch 18

### B-1423 — URL property cell does not expose a clickable `<a href>` link (P3, open)
- Steps: add a URL property → fill `https://example.com` → check rendered cell.
- Observed: cell is a `<input type="url">` with text + underline. No anchor element to click; the user has to copy-paste the URL.
- Expected: when not focused, render as `<a href={value} target="_blank">{value}</a>`; on focus / dbl-click, switch to the input. Notion's URL cell behaves this way.
- File: `src/components/database/PropertyEditor.tsx` `URLCell` (line ~292).

### B-1424 — Files property cell has no `data-testid` on the container (P3, open)
- Steps: add a `files` property → cell renders an "Empty" span plus a "+" file-upload label.
- Observed: only the inner `<input type="file">` exists; no `cell-files-<row>-<prop>` testid like other cells. Hard to target in E2E.
- Expected: add `data-testid={`cell-files-${row.id}-${property.id}`}` on the outer `<div>`.

### B-1425 — Rollup property with `function=count` works (P3, info)
- Steps: db_a relation property `p_rel` linked to db_b; rollup property `Count` rolled up via `function: "count"`.
- Confirmed: cell shows `2` for r_a1 (2 linked rows), `0` for r_a2. Verifies rollup is functional.

### B-1426 — Formula `length(prop("Title"))` works correctly (P3, info)
- Steps: set formula expression to `length(prop("Title"))` on rows "A row 1" / "A row 2".
- Confirmed: both cells return `7`. Verifies `prop()` + `length()` are wired.

### B-1427 — Formula `prop("Nonexistent")` returns empty silently — confirms B-1323 (P3, open)
- Steps: set expression to `prop("Nonexistent")` → cells render blank.
- Compare: a syntax-error expression like `1 + +` correctly surfaces `#ERR: Unexpected token +`.
- Expected: `prop()` should throw a `FormulaError("Unknown property \"Nonexistent\"")` so users notice typos.

### B-1428 — Dark mode toggle works from Settings (P3, info)
- Steps: /app/settings → click `settings-darkmode` → `documentElement.classList` toggles `dark`. Confirmed.

### B-1429 — No undo/redo (Cmd+Z) shortcut for any block / page mutation (P2, open)
- Steps: type something into a block, press Cmd+Z (via DOM dispatch).
- Observed: nothing happens (no Toast, no state revert).
- Expected: a proper undo stack on the store — at minimum block content edits, block creation/deletion, row updates. Today the only "history" is the manual page-history snapshot dialog.

### B-1430 — Toggle block expand / collapse works (P3, info)
- Steps: /toggle → click toggle-blk_<id> → children area collapses; click again → expands. Confirmed working end-to-end.

### B-1431 — Slash menu typing filters items by prefix match (P3, info)
- Steps: `/head` → only h1/h2/h3 + toggle-h1/h2/h3 items remain. Confirmed.

### B-1432 — Slash menu hides entirely on no matches (P3, info)
- See B-1414. Confirmed empty-query → no menu. Should render "No matches" instead (I-1409).

## 2026-05-12 22:30 — Test agent batch 19

### B-1433 — Page publish-to-web flow (P3, info)
- Steps: Share button → toggle Publish → page gets `isPublished=true, publishSlug="getting-started"` → /p/getting-started renders the public page with all blocks (text, headings, equation, button). Inline database appears as "(Embedded database — open the workspace to view)". Confirmed working.

### B-1434 — Inline link popover replaces native prompt (P3, info)
- Steps: code review of `src/components/editor/InlineToolbar.tsx` confirms `ib-link-popover` + `ib-link-input` + `ib-link-apply` testids exist (lines 184/196/201). The earlier B-1221 (native prompt) is fixed in code, though full E2E click test failed because the inline toolbar dismisses on selection loss between clicks.

### B-1435 — Inline toolbar inserts `<b>` (legacy HTML) not `<strong>` (P3, open)
- Steps: select text → click `ib-bold` → block.innerHTML becomes `<b>Welcome</b>! …`
- Expected: prefer `<strong>` (semantic HTML), or store formatting as a structured rich-text array (recommended). Currently relies on raw `<b>/<i>/<s>/<u>` which is the legacy `document.execCommand` style.

### B-1436 — Emoji picker search is wired in state but never filters the rendered list (P2, fixed)
- Steps: open page-icon → emoji picker dialog → type "rocket" in `emoji-search`.
- Observed: same 96 emojis rendered.
- Root cause: `src/components/page/EmojiOrCoverPicker.tsx` line 20 declares `const [search, setSearch] = useState("");` but line 36 `{EMOJIS.map((e) => …)}` ignores `search`. There is no `.filter()`.
- Expected: build an alias map (e.g. `🚀 -> ["rocket", "launch", "ship"]`) and filter EMOJIS by alias.includes(search) || emoji.includes(search).

### B-1437 — Clicking a board card does NOT open a row detail drawer / overlay (P2, fixed)
- Steps: /app/db/db_a → Board view → click any `board-card-<rowId>`.
- Observed: nothing happens (no drawer, no overlay).
- Expected: Notion opens the row as a side drawer that lists ALL property cells + the row's own block-content area. Today the only way to edit row props is via the table view. There is no row-detail screen at all in this app (also no row-icon, no row-cover, no row-blocks UI).

### B-1438 — Board view "+ New" inside a column correctly seeds the new row with the column's option (P3, info)
- Steps: Board view grouped by Group → click `board-add-g_a` → new row created with `p_grp = "g_a"`. Confirmed.

### B-1439 — Formula `length(prop("Title"))` returns expected integer (P3, info)
- Confirmed in B-1426.

## 2026-05-12 22:55 — Test agent batch 20

### B-1440 — Subpage creation works via sidebar (P3, info)
- Steps: sidebar `[data-testid="page-new-pg_mp33cd7d01u4huok"]` (visible only when sidebar is expanded) → new page created with `parentId = pg_mp33cd7d01u4huok` and navigated to. Confirmed working.

### B-1441 — Breadcrumbs in TopBar are rendered as `<span>`, not clickable to navigate (P2, fixed)
- Steps: open a subpage → TopBar shows `🧭 Getting Started › 📄 Untitled`. Clicking the parent link does nothing.
- Expected: each breadcrumb segment (except the last) should be a `<button>`/`<Link>` that navigates to that page.
- File: `src/components/layout/TopBar.tsx` lines 42-47 — `<span>` should be `<Link to="/app/p/$pageId" params={{ pageId: b.id }}>`.

### B-1442 — Columns block keeps the raw "/col" slash command in its `content` field (P3, open)
- Steps: type `/col` in a new block → click `slash-columns-2`.
- Observed: store has `blocks[id] = { type: "columns", content: "/col", columns: 2, columnIds: [...] }`. Other slash conversions correctly clear `content` to "".
- Expected: when converting to "columns", set `content = ""` (or omit it entirely since columns blocks don't render content).
- Visual effect: none in the UI today, but if a later renderer ever reads `content` on a columns block, it would leak the literal `/col` text.

### B-1443 — Verification field on Page model has no UI (P3, info)
- Page model exposes `verifiedAt`, `verifiedBy`, `verificationExpiresAt`, but there is no UI action anywhere (TopBar / page menu / settings) to verify a page or surface the verification badge. Same applies to `isWiki`. Both feature surfaces are missing.

### B-1444 — Wiki toggle on page has no UI surface (P3, info)
- See B-1443. `isWiki` is in the schema but no toggle anywhere; wiki-specific affordances (verification policy, owner listing as wiki contributors) are not implemented.

### B-1445 — Inbox stays empty when comments are posted (P3, info)
- See B-1422. Confirmed: posting a comment on a page does not enqueue any inbox notification. `s.notifications` slice does not exist.

### B-1446 — TopBar history dialog (`history-btn`) is mounted but not E2E-tested in this run (P3, info)
- Component exists; the manual snapshot flow was tested in earlier batches. Mentioned here for inventory.

### Verification summary for this batch run
- Implementer fixes verified: B-1304 (date filter coerce), B-1305 (multi-select contains array branch), B-1312 (synced-block cycle detector), B-1318 (relation target swap clears links). All 4 pass.
- Implementer fixes confirmed still open / unaddressed: B-1308 (select sort by option order), B-1313 (block-level commenting UI), B-1314 (timeline bar width), B-1315 (chart X-axis labels), B-1319 (delete-forever from sidebar trashed-pages section), B-1320 (Cmd+K dispatched programmatically), B-1323 (formula unknown-prop silent).

## 2026-05-12 23:30 — Test agent batch 21

### Verification of latest implementer fixes
- B-1437 RowDetailDrawer: VERIFIED. Drawer opens on Board, Gallery, and List card clicks (`board-card-r_a1`, `gallery-card-r_a1`, `list-row-r_a1`). Contains `row-detail-title`, `row-detail-close`, `row-detail-delete`, and renders all relevant property cells (e.g. `cell-relation-r_a1-p_rel`, `cell-select-r_a1-p_grp`).
- B-1437 Property editing in drawer: VERIFIED. Filled `row-detail-title` with "A row 1 EDIT" → `state.rows.r_a1.values.p_at` updated immediately.
- B-1441 Breadcrumb Links: VERIFIED. `[data-testid="breadcrumb-pg_mp33cd7d01u4huok"]` is `<a href="/app/p/pg_mp33cd7d01u4huok">`; clicking it navigates without page reload.
- B-1406 Form multi-select chips: VERIFIED. Form view in preview mode renders `form-multiselect-<propId>-<optId>` toggle buttons; submitting stores `values.prop_xxx = ["tag_red","tag_green"]` (array) in the new row.
- B-1436 Emoji picker search filter: VERIFIED. Typing "rocket" filters grid to a single 🚀; "cat" filters to 🐱; nonsense like "zzzzz" results in zero emojis (empty grid but the picker remains mounted).

### B-1500 — RowDetailDrawer: Escape key does not close the drawer (P2, fixed)
- Steps: open Board view → click `board-card-r_a1` → drawer opens → press Escape (dispatchEvent on document).
- Observed: drawer remains visible. Only the explicit `row-detail-close` X button dismisses it.
- Expected: standard modal behavior — Escape should close. Many users hit Escape to bail out.
- File: `src/components/database/RowDetailDrawer.tsx` — add `useEffect(() => { const f=(e)=>{ if(e.key==='Escape') onClose(); }; document.addEventListener('keydown', f); return () => document.removeEventListener('keydown', f); }, [onClose]);`.

### B-1501 — RowDetailDrawer: no click-outside / backdrop dismissal (P2, fixed)
- Steps: open drawer → click anywhere outside (e.g., body, the underlying view background).
- Observed: drawer stays open. The drawer is a sibling div with no scrim/backdrop element.
- Expected: either render a transparent backdrop that closes on click, or wire `useEffect` to detect outside clicks. Notion-style drawers close on outside click.
- File: `src/components/database/RowDetailDrawer.tsx`.

### B-1502 — RowDetailDrawer: deleted row is removed from `databases[].rows` but stays in `state.rows` (P3, open)
- Steps: open drawer → click `row-detail-delete` for `row_mp34kasi91cztatn`.
- Observed: row id is removed from `databases.db_a.rows` (good — disappears from view), but `state.rows[row_mp34kasi91cztatn]` is still present (orphan).
- Expected: also delete from the `rows` record, or move to a `trashedRows` set. Currently it's a memory leak that grows over time.
- File: `src/lib/store.ts` `deleteDatabaseRow`.

### B-1503 — Table view title cell DOES NOT open the row detail drawer (P2, fixed)
- Steps: /app/db/db_a → table view → click `cell-title-r_a1-p_at`.
- Observed: it activates the inline editor only; no drawer opens. Notion typically has a hover "Open" chevron / a click on a leading icon.
- Expected: add an "Open" affordance (e.g. icon button on hover) or row-leading `▸ Open` testid that calls `openRow(rowId)`. Today the drawer is reachable from Board, Gallery, and List, but not from the Table view (the most common view).
- File: `src/components/database/views/TableView.tsx` (next to title cell).

### B-1504 — Form view "Copy form link" generates a URL that 404s (P2, open)
- Steps: form view → click `form-copylink-<viewId>`.
- Observed: URL copied is `${origin}/form/${databaseId}/${viewId}` but no `/form/...` route exists in `src/routes/`. Visiting it shows the 404 "Page not found" page.
- Expected: register a public route `routes/form.$databaseId.$viewId.tsx` that renders the form in preview mode + on submit calls `addDatabaseRow`. Otherwise "Copy form link" is misleading.
- File: `src/components/database/views/FormView.tsx` line 31 (URL builder) and missing `src/routes/form.*.tsx`.

### B-1505 — Form view multi-select submission also keeps `p_at: ""` (P3, info)
- Steps: form-submit on multi-select only → new row.
- Observed: row has `values.p_at = ""` (empty title) which prevents the row from being browsable easily. This is by design but pages without titles render with "Untitled" sentinel except in this case it's an explicit empty string.
- Expected: either skip writing `p_at` when empty (so it falls back to "Untitled" elsewhere) or strip empty-string entries from form submit payload. Minor.

### B-1506 — Multi-select property cell testid uses `cell-select-<row>-<prop>` not `cell-multi-select-...` (P3, open)
- Steps: add a multi-select property → DOM testid is `cell-select-r_a1-prop_mp352zglymrt`.
- Observed: it shares the same testid prefix as a real "select" property, making it impossible to scope E2E selectors.
- Expected: `data-testid={`cell-${property.type}-${row.id}-${property.id}`}` with property.type "multi-select" → `cell-multi-select-...`.
- File: `src/components/database/PropertyEditor.tsx`.

### B-1507 — Timeline view: clicking `tl-bar-<rowId>` does NOT open the row detail drawer (P2, fixed)
- Steps: /app/db/db_dates_test → Timeline view → click `tl-bar-r_dt1`.
- Observed: nothing happens. Drawer is not opened.
- Expected: parity with Board/Gallery/List which DO open the drawer on click.
- File: `src/components/database/views/TimelineView.tsx` — add `onClick={() => openRow(row.id)}` on the bar element.

### B-1508 — Calendar view: clicking `cal-event-<rowId>` does NOT open the row detail drawer (P2, fixed)
- Steps: /app/db/db_dates_test → Calendar view → navigate to June 2026 → click `cal-event-r_dt2`.
- Observed: drawer stays closed.
- Expected: clicking a calendar event should open RowDetailDrawer for that row.
- File: `src/components/database/views/CalendarView.tsx`.

### B-1509 — Undo / redo (Cmd+Z) still NOT implemented — B-1429 unchanged (P2, open)
- Steps: focus a block content element → edit DOM (append "EXTRA") → dispatch Cmd+Z KeyboardEvent on document.
- Observed: no revert; block stays with "EXTRA" appended.
- Expected: app-level undo stack as recommended in I-1415.
- Status: B-1429 still open — no implementation found.

### B-1510 — All 8 view types render without errors (P3, info)
- Steps: cycle through table → board → chart → gallery → list → form → timeline → calendar on db_a.
- Observed: every view renders content; no error-boundary text ("Something went wrong" / "Error:") detected on any view. Calendar in db_a uses `dateProperty: "p_at"` (title prop) — events not shown because title is not a date, but no crash either.

### B-1511 — Calendar view auto-seeds `dateProperty` to the title property when no date prop exists (P3, open)
- Steps: add calendar view on db_a which has no date property → view config gets `dateProperty: "p_at"` (the title).
- Observed: calendar still renders but never shows any events because title isn't parsable as a date.
- Expected: refuse to create a calendar view, or display an empty state asking the user to add a date property and pick it. Currently the user has no signal that the view is misconfigured.
- File: store seed for calendar view + `src/components/database/views/CalendarView.tsx`.

### B-1512 — Calendar `cal-event-<rowId>` element is `draggable=true` but no drop handler implemented (P3, open)
- Steps: inspect DOM in CalendarView: `<div draggable="true" data-testid="cal-event-r_dt2">`.
- Observed: the event chip is set to draggable, but neither the calendar grid cells nor any other dropzone has `onDrop` / `onDragOver` handlers wired.
- Expected: dragging an event to another date should `updateRow(rowId, { [dateProperty]: newDate })`. Today the drag attribute is dead.

## 2026-05-12 23:50 — Test agent batch 22

### B-1513 — Sort row UI has no testids on the select/input children (P3, open)
- Steps: view-menu → add-sort → DOM `[data-testid="sort-row-0"]` contains 2 `<select>` and 1 `<button>` but none have testids.
- Observed: E2E must rely on `:nth-of-type` to pick property vs direction.
- Expected: `data-testid="sort-row-<n>-property"`, `sort-row-<n>-direction`, `sort-row-<n>-remove`.
- File: `src/components/database/ViewSortPanel.tsx` (or equivalent).

### B-1514 — Filter row UI has no testids on the select/input children (P3, open)
- Steps: view-menu → add-filter → DOM has property select, operator select, value input, remove button — none with testids.
- Expected: `filter-row-<n>-property`, `-operator`, `-value`, `-remove`.

### B-1515 — Mail detail pane lacks Reply / Forward / Archive / Star / Label actions — re-confirms B-1419 (P2, open)
- Steps: /app/mail → click any mail → only `mail-compose` testid visible; no per-mail action testids.
- Observed: detail pane renders subject + body only. No "Reply", "Archive", "Move to label" or "Star" buttons.
- Expected: see I-1411.

### B-1516 — Inbox is empty even though comments / mentions could have been added — re-confirms B-1422/B-1445 (P3, open)
- Steps: /app/inbox → page shows "All caught up! ✨" sentinel.
- Observed: no notifications enqueued from any in-app event (comments, page shares, etc.). The notifications slice doesn't exist.

### B-1517 — Mail Compose: "Sent" mail and "Inbox" mail are co-mingled (no Sent folder) (P3, open)
- Steps: /app/mail → mail-compose → fill to/subject/body → send.
- Observed: the new mail appears at the top of the mail list along with received ones (which are marked `to: ["me@example.com"]`). No "Sent" / "Drafts" filter to distinguish.
- Expected: a folder selector or `from === currentUser` filter to view a Sent folder.

### B-1518 — Calendar event creation works with proper TZ-safe date (P3, info)
- Steps: /app/calendar → click `day-add-2026-05-12` → fill `cal-compose-title` → click `cal-compose-create`.
- Confirmed: event created with `start=1778544000000` whose `toISOString().slice(0,10) === "2026-05-12"`. The earlier TZ fix is verified.

### B-1519 — Emoji search alias map covers some but missing many common words (P3, open)
- Steps: type "star" → returns ⭐ and 🌟 (good). Type "rocket" → returns 🚀. Type "smile" → returns 0.
- Observed: alias coverage appears partial. No specific list documented.
- Expected: bundle a comprehensive alias map (e.g. `unicode-emoji-json`) — see I-1417.

### B-1520 — Multi-select chip toggle in form supports unselect (P3, info)
- Steps: form view → click `form-multiselect-prop_xxx-tag_red` (selects) → click again (deselects). Submit → array no longer contains "tag_red".
- Confirmed working end-to-end.

### B-1521 — RowDetailDrawer renders ALL cell types incl. number/date/url, but missing `files` and `formula`/`rollup` (P3, open)
- Steps: open drawer for `r_dt1` in db_dates_test → cells found: `cell-date`, `cell-number`, `cell-select`, `cell-url`.
- Missing: `cell-files`, `cell-formula`, `cell-rollup`, `cell-checkbox`, `cell-email`, `cell-phone`. The drawer filter is too aggressive.
- File: `src/components/database/RowDetailDrawer.tsx` — show every property even formula/rollup (read-only) so users can verify computed values.

## 2026-05-13 00:10 — Test agent batch 23

### B-1522 — Editing `row-detail-title` reflects in the table view immediately (P3, info)
- Steps: open drawer for r_a1 → fill `row-detail-title` "A row 1 PATCHED" → close drawer → switch to Main table view.
- Confirmed: `cell-title-r_a1-p_at` value is "A row 1 PATCHED". Two-way binding works.

### B-1523 — RowDetailDrawer has NO row child-blocks area (no editor) (P2, open)
- Steps: open drawer for r_a1 → drawer renders title + property cells only.
- Observed: there is no place to type rich-text body for the row (Notion calls this the "page body" of a row).
- Expected: render an editor area below the property list, driven by `row.blocks[]`. The schema already supports this (`row.blocks` field exists in seeded rows).
- File: `src/components/database/RowDetailDrawer.tsx`.

### B-1524 — Chart view X-axis labels DO appear via Recharts (P3, info)
- Steps: /app/db/db_a → Chart view → inspect svg.
- Observed: SVG with viewBox 0 0 820 280 contains `recharts-cartesian-axis-tick` elements with `<tspan>` "g_b" and "Empty" labels.
- Status: B-1315 appears RESOLVED. Earlier reports about "no X-axis labels" no longer reproduce. (The "Empty" tspan signals a row with no value — possibly the empty form-submitted row.)

### B-1525 — InlineToolbar ib-color does not work when the selection is already inside another wrapping tag (P3, open)
- Steps: in a `<i>Each</i>` text → select the same chars → click `ib-color-red`.
- Observed: HTML unchanged. The color is not applied because `document.execCommand("foreColor")` likely fails when the selection is already wrapped.
- Expected: foreColor should still work; either re-run after restoring selection or set inline `<span style="color:red">…</span>`.

### B-1526 — InlineToolbar uses legacy `<i>` for italic (re-confirms B-1435) (P3, open)
- Steps: select text → click `ib-italic` → block.innerHTML contains `<i>Each</i>`.
- See B-1435.

### B-1527 — `ib-ai` does not open a sub-menu of actions (P3, open)
- Steps: select text → click `ib-ai`.
- Observed: dispatches `open-ai-chat-with` custom event (no in-toolbar sub-menu).
- Expected: Notion shows "Improve writing / Fix grammar / Summarize / Translate" inline. The current AI workflow is global rather than contextual on selection. Mentioned for inventory.

### B-1528 — PageOptionsMenu items lack testids (Customize / Wiki / Word count / Copy link) (P3, open)
- Steps: page-options → menu items have no `data-testid`.
- Expected: `popt-customize`, `popt-wiki`, `popt-word-count`, `popt-copy-link`.
- File: `src/components/layout/TopBar.tsx` `MenuItem` component.

### B-1529 — PageOptionsMenu is missing common actions: Duplicate / Move to / Export / Delete / Add to favorites (P2, fixed)
- Steps: page-options → only "Customize page / Turn into wiki / Word count / Copy link" visible.
- Expected: Notion's page menu has Duplicate, Move to, Export to PDF/Markdown, Delete (move to trash), Add to favorites, Lock page, Customize page, Page history, View analytics. Most are missing.

### B-1530 — Inline toolbar ib-link does not open the link popover when invoked via click (P3, open)
- Steps: select text → click `ib-link`.
- Observed: `ib-link-popover` does not appear in the DOM. The popover is gated on selection, which is lost between selection-restore and click handling.
- Likely cause: clicking the button blurs the editor, losing the selection; the popover only opens if a non-empty selection is present.
- Workaround: prevent mousedown default on the button.
- File: `src/components/editor/InlineToolbar.tsx` — add `onMouseDown={e => e.preventDefault()}` on the link button.

### B-1531 — Word count event triggers a toast that shows "37 words" (P3, info)
- Steps: dispatch `show-word-count` → toast appears with "37 words · NNN characters".
- Confirmed working end-to-end.

### B-1532 — Page publish toggle works; public route renders (P3, info)
- Steps: share-btn → publish-toggle → /p/getting-started.
- Confirmed: page renders with blocks. (B-1433 reverified.)

## 2026-05-13 00:25 — Test agent batch 24

### B-1533 — Sidebar page menu shows actions (Duplicate / Move to Trash / Add to favorites) but lacks testids (P3, open)
- Steps: page-menu-<id> → menu items appear with text only; no testids.
- Expected: `pmenu-duplicate-<id>`, `pmenu-trash-<id>`, `pmenu-favorite-<id>`, `pmenu-rename-<id>`.
- File: sidebar page-menu component.

### B-1534 — Page Duplicate works end-to-end (P3, info)
- Steps: page-menu → Duplicate → new "Meeting notes (Copy)" page appears.
- Confirmed working.

### B-1535 — Page Move to Trash works end-to-end (P3, info)
- Steps: page-menu → Move to Trash → page.isInTrash=true, disappears from sidebar.
- Confirmed working.

### B-1536 — Trash delete-forever (purge) works (P3, info)
- Steps: /app/trash → delete-forever-<id> → page entry fully removed from `state.pages`.
- Confirmed. window.confirm bypass auto-returns true so destructive UX is trivially testable.

### B-1537 — Cmd+K opens the command palette (B-1320 fixed) (P3, fixed)
- Steps: dispatch keydown {key:"k", metaKey:true} on document → `command-input` testid appears.
- Confirmed: the fix from earlier batches worked. B-1320 closed.

### B-1538 — `page-title` is a contenteditable H1, not an input — keystrokes via preview_fill must also dispatch the input event to persist (P3, open)
- Steps: preview_fill `page-title` to "Batch 23 Test Page" → DOM text updated but `state.pages.<id>.title` stays "".
- Workaround in E2E: after fill, dispatch `el.dispatchEvent(new Event('input', { bubbles: true }))` to commit.
- Expected: store should also subscribe to `MutationObserver` on the H1, or use blur to commit. Currently silent partial updates are possible if a user clicks navigation before the next input event fires.

### B-1539 — Sidebar context menu opens on first click for some items but the menu items are slightly delayed (P3, info)
- Steps: page-menu-<id> → first click sometimes shows nothing → second click shows the menu.
- Observed: menu mounts on the second click in some flows because the first click is consumed by the previously-open menu's close logic.
- Mitigation: when opening one menu, all other open menus should close synchronously.

### B-1540 — Page Title in contenteditable H1 can be left empty; sidebar still shows "Untitled" sentinel (P3, info)
- Steps: new page → title left blank.
- Observed: sidebar correctly renders "📄Untitled". Consistent fallback works.

### B-1541 — Slash conversion correctly clears block.content on "/quote" (P3, info)
- Steps: type `/quote` on empty block → click `slash-quote` → block.type="quote", content="".
- Confirmed working. Unlike `/col` (B-1442) which keeps "/col" content.

### B-1542 — Templates page renders 8 demo templates, click navigates to created page (P3, info)
- Steps: /app/templates → click `template-Meeting notes` → navigates to new page with seeded title "Meeting notes", icon "📝", and 9 blocks.
- Confirmed working.

### B-1543 — `relation-row-<targetRowId>` filter via relation-search works (P3, info)
- Steps: cell-relation-r_a1-p_rel click → relation-search-r_a1-p_rel fill "item" → relation-row-r_b1, r_b2 appear.
- Confirmed.

## 2026-05-13 00:45 — Test agent batch 25

### B-1544 — Button block "open-page" action uses `window.location.href` (B-1404 still open) (P2, open)
- Confirmed in `src/components/editor/Block.tsx` line 1376: `window.location.href = `/app/p/${action.pageId}`;`. Full page reload on button click.
- Expected: TanStack Router navigate (see I-1400).

### B-1545 — Table row-delete leaves row in `state.rows` as orphan (P3, open)
- Steps: table view → `row-delete-row_xxx` → row removed from `db.rows` but still present in `state.rows`.
- Same root cause as B-1502 (drawer delete). Both paths likely share the same store action.

### B-1546 — Property header rename input has no testid (P3, open)
- Steps: click `prop-header-p_grp` → click `prop-rename-p_grp` → an `<input>` appears.
- Observed: no data-testid on the input; must locate via `.bg-background` class.
- Expected: `data-testid={`prop-rename-input-${property.id}`}`.
- File: `src/components/database/views/TableView.tsx` line 101-113.

### B-1547 — Comment post works; resolve toggle works (P3, info)
- Steps: comments-btn → comment-input fill → post-comment → comment created with `resolved=false`; clicking resolve-cmt_xxx → `resolved=true`.
- Confirmed.

### B-1548 — Posted comment with @mention text does NOT enqueue any notification (B-1409/B-1445 unchanged) (P3, open)
- Steps: comment "@Batch15 hello mention check" → `state.notifications` slice doesn't exist.
- Expected: parse @-mentions in comment.content → push to `notifications`.

### B-1549 — Todo block checkbox toggle persists (P3, info)
- Steps: `todo-check-blk_xxx` click → `block.checked = true`.
- Confirmed.

### B-1550 — Property-header dropdown has Rename + Delete + Type-conversion list, but no "Hide property" or "Sort" inline (P3, open)
- Observed: the popover shows: Rename, "Type" header followed by PROPERTY_TYPES buttons, Delete.
- Missing: "Hide in view", "Sort ascending/descending", "Filter by this property", "Duplicate property". Notion's column menu has all four.
- File: `src/components/database/views/TableView.tsx` property-header popover.

### B-1551 — View rename uses inline input (no native prompt) and Enter commits (P3, info)
- Steps: view-menu-v_a → view-rename-v_a → input appears with testid `view-rename-input-v_a` → Enter commits.
- Confirmed.

### B-1552 — Sidebar expand toggles work (P3, info)
- Steps: expand-pg_xxx click → child pages hidden/shown.
- Confirmed.

## 2026-05-13 01:05 — Test agent batch 26

### B-1553 — Number cell value commits only on blur (P3, info)
- Steps: fill `cell-number-r_dt1-p_dn` to "99" via preview_fill → store still shows 5; blur the input → store updates to 99.
- Expected: commit on each onChange. The current onBlur-only behavior is fine but means E2E must blur explicitly.

### B-1554 — Cmd+K → `cmd-page-<id>` navigates with TanStack Router (no reload) (P3, info)
- Steps: dispatch Cmd+K → click `cmd-page-pg_xxx`.
- Confirmed: SPA-style navigation, URL updates, no full reload.

### B-1555 — Cmd+K → `cmd-db-<id>` navigates to /app/db/<id> correctly (P3, info)
- Steps: dispatch Cmd+K → click `cmd-db-db_dates_test`.
- Confirmed.

### B-1556 — Chart type switch (bar/line/donut/number) renders different recharts components (P3, info)
- Steps: chart-type-v_a_chart fill "donut" → svg now contains `.recharts-pie` and `.recharts-pie-sector` paths.
- Confirmed.

### B-1557 — Multi-select option toggle off works (B-1305 reverified) (P3, info)
- Steps: cell-select-r_dt1-p_dms click → `select-option-tg_green` → adds; click again → removes.
- Confirmed: deduplicated array stored.

### B-1558 — Gallery card title input click bubbles up to open drawer (P3, info)
- Steps: click `cell-title-r_dt1-p_dt` inside a `gallery-card-r_dt1`.
- Observed: drawer opens because the card click handler catches the bubble. The title input is editable inline within the card, but clicking it triggers row open.
- Note: this may be undesirable — user might want to edit inline title without opening the drawer. Suggest stopping propagation on the input.

### B-1559 — RowDetailDrawer is not exclusively focused — can interact with underlying content (P3, open)
- Steps: drawer open → can click sidebar, settings, etc., underneath.
- Expected: drawer should be modal (focus trap + scroll lock). Today it's a side panel without scrim.

### B-1560 — Color picker `ib-color-*` doesn't apply foreColor when selection is inside another formatting tag (P3, open)
- Re-state of B-1525. Setting color on `<i>Each</i>` left HTML unchanged.

### B-1561 — Property header dropdown closes on rename input render — input lacks testid (P3, open)
- See B-1546.

### B-1562 — Calendar event title doesn't make event clickable for editing (P3, open)
- Steps: /app/calendar → click an existing event chip.
- Observed: no edit dialog opens; only the day cell selects.
- Expected: clicking an event should open a detail dialog matching `cal-compose` (with delete + edit description/time).

## 2026-05-13 01:35 — Test agent batch 27 (verification)

### B-1600 — RowDetailDrawer Escape close only listens on window — Esc on document doesn't dispatch (P3, info)
- Steps: open `row-open-r_dt1` → `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))` → drawer stays open. `window.dispatchEvent(...)` closes.
- Observed: Esc works at window scope, which is the normal React-side hook target. Functionally OK; just noting that focus must be inside window event loop (won't fire if user clicks an iframe).

### B-1601 — RowDetailDrawer backdrop click closes drawer (P3, info)
- VERIFIED PASS (corrected after deeper inspection). The outer `[data-testid="row-detail-drawer"]` has React `onClick={() => setRowId(null)}`. The inner panel has `onClick={(e) => e.stopPropagation()}`. So genuine user clicks on the backdrop close, clicks inside don't. Synthesized JS `dispatchEvent` calls didn't trigger React's synthetic-event dispatch which led to a false-negative in my first sweep.

### B-1602 — Table `row-open-<id>` button opens drawer (P3, info)
- Verified: every table row has `row-open-r_dt1`, `row-open-r_dt2`, etc. Click opens drawer with `row-detail-drawer`. PASS.

### B-1603 — Timeline `tl-bar-<id>` opens drawer (P3, info)
- Verified: `tl-bar-r_dt1` click → drawer opens. PASS.

### B-1604 — Calendar `cal-event-<id>` opens drawer (P3, info)
- Verified: navigate to Jan 2026 view of `db_dates_test` → `cal-event-r_dt1` chip is a clickable element. Click → drawer opens. PASS.

### B-1605 — PageOptionsMenu shows 8 items, all with `page-opt-*` testids (P3, info)
- Verified: page-opt-favorite, page-opt-duplicate, page-opt-wiki, page-opt-wordcount, page-opt-copylink, page-opt-export-md, page-opt-print, page-opt-trash. PASS.

### B-1606 — Markdown export downloads `<slug>.md` with text/markdown blob (P3, info)
- Verified: click `page-opt-export-md` → anchor.download="getting-started.md", blob.type="text/markdown", contains H1 + body. PASS (with caveats — see B-1607).

### B-1607 — Markdown export emits placeholder comments for inline-database/button/columns/toggle blocks (P2, fixed)
- Steps: export "Getting Started" page → output contains `<!-- database-inline -->`, `<!-- button -->`, `<!-- columns -->`, `<details><summary></summary></details>` (empty toggle).
- Observed: complex block types render as HTML-comment placeholders instead of actual content. The empty `<details>` with no summary is invalid markdown.
- Expected: button blocks render their label; toggle renders summary + nested content; inline-database renders a stub table; columns render concatenated content separated by newlines.
- File: `src/lib/markdown-export.ts` (or equivalent).

### B-1608 — Markdown export emits empty fenced code block with language but no code (P3, open)
- Same export: contains "```javascript\n\n```" — the code block is empty because the seeded page's code block has empty text. That's data, not a bug per se, but exporter should still emit something.

### B-1609 — Move to Trash navigates to /app and sets isInTrash=true (P3, info)
- Verified: page-opt-trash → page.isInTrash=true, route changes to /app. PASS.

## 2026-05-13 02:00 — Test agent batch 28

### B-1610 — Markdown exporter renders `heading-1` as `## ` (one level too deep) (P2, fixed)
- Steps: page with `heading-1` content "Foo" → export → "## Foo".
- Expected: `heading-1` → "# Foo"; the doc title would be H1 too but Notion-style export typically uses "# Title" at top + "# Heading 1" for content. Today everything shifts down by one.
- File: `src/lib/export-markdown.ts` lines 19-30. Cases `heading-1/2/3` produce `## / ### / ####`.

### B-1611 — Markdown exporter strips inline HTML (`<b>`, `<i>`, `<a>`) instead of converting to MD syntax (P2, fixed)
- Steps: text block content `A <b>bold</b> word and <i>italic</i>.` and `A <a href="https://example.com">link</a>.` → export.
- Observed: "A bold word and italic." (formatting lost) and "A link." (URL lost!).
- Expected: `**bold**`, `*italic*`, `[link](https://example.com)`.
- File: `src/lib/export-markdown.ts` — `stripHtml` is too aggressive; build a proper HTML→MD inline converter.

### B-1612 — Markdown exporter emits placeholder comments for button/columns/database-inline/synced-block/breadcrumb/table-of-contents (P2, fixed)
- Steps: page with `button`, `columns`, `database-inline` → export.
- Observed: `<!-- button -->`, `<!-- columns -->`, `<!-- database-inline -->`.
- Expected: button label, column children concatenated, inline-db rendered as a small heading + stub.
- File: `src/lib/export-markdown.ts` lines 131-142.

### B-1613 — Markdown exporter code block omits language fence when `language` is on `props.language` (P3, open)
- Block schema (and seeded inline code in `Getting Started`) stores language at `block.language` (top-level). Programmatically-created blocks frequently use `block.props.language`. Exporter only reads top-level so `props.language` is dropped.
- Suggest: read both top-level and props fallback.

### B-1614 — Markdown exporter inserts no blank line between consecutive bullet/numbered list items even when followed by a different block (P3, info)
- Output today: `- Bullet item\n1. Numbered item\n---\n...`. Mixing two list types into one block scope is technically fine, but the formatter doesn't separate them.

### B-1615 — Sidebar page More menu shows only 3 items, no `pmenu-*` testids (P2, fixed)
- Steps: click `page-menu-pg_xxx` in sidebar → popup with "Add to favorites" / "Duplicate" / "Move to Trash".
- Observed: items have NO testids. Re-state of B-1533. Implementer fix tracked in I-1512 hasn't landed.
- Expected: testids `pmenu-favorite-<id>`, `pmenu-duplicate-<id>`, `pmenu-trash-<id>` per I-1512.

### B-1616 — Sidebar page row right-click does NOT open a context menu (P3, open)
- Steps: dispatch `contextmenu` MouseEvent on a sidebar page row → no menu opens.
- Notion supports right-click on every sidebar row to open the same More menu. Today the kebab-only path forces a mouse hover + extra click.
- Expected: native context menu intercepted, same items as `page-menu-<id>` popover shown at cursor.

### B-1617 — Block-level comments are NOT supported in the UI (P2, open)
- Steps: hover any `block-content-*` element → no comment affordance. No "block-comment" testid exists. The `Comment` data model already supports `blockId` (e.g., `cmt.blockId !== null`), and `PageComments.tsx` filters with `!c.blockId` — so storage is ready, UI is not.
- Expected: hovering a block reveals a comment icon that creates a comment scoped to that block. Should render an inline thread anchor.
- File: `src/components/page/PageComments.tsx` (filters by `!c.blockId`); `src/components/editor/Block.tsx` (needs UI affordance).

### B-1618 — AI chat thread is NOT persisted across page reloads (P2, fixed)
- Steps: open Ask AI → send "Hello batch 27 test" → receive demo response. Close AI. Reload tab. Open Ask AI again.
- Observed: empty initial state ("Ask anything about your workspace…"). User+assistant turns are gone.
- Expected: thread persists in store (`s.aiThread` or similar) until explicit clear. Notion's AI chat panel retains last session.
- File: `src/components/ai/AIChatPanel.tsx` (or similar) — currently keeps state only in React local state.

### B-1619 — Deleting a database leaves dangling relation properties + orphan rows + orphan rollups (P1, fixed)
- Steps: db_a has property `p_rel` with `targetDatabaseId='db_b'`. Row `r_a1.values.p_rel = ['r_b1','r_b2']`. Db_a also has rollup `p_rollup` (function="count", relationPropertyId="p_rel"). Delete db_b via `deleteDatabase('db_b')`.
- Observed: db_b is removed from `state.databases`. BUT:
  1. Rows `r_b1`, `r_b2` remain in `state.rows` as orphans (`databaseId='db_b'` but DB no longer exists).
  2. db_a's relation property `p_rel` still has `targetDatabaseId='db_b'` — points to nothing.
  3. db_a's rollup `p_rollup` still refers to `p_rel` — its calculation will read undefined target.
  4. Row `r_a1` still holds `p_rel: ['r_b1','r_b2']` — values are dangling but never cleaned.
- Expected: cascading cleanup — delete all rows, remove or null all relation properties pointing to the deleted DB, drop or recompute rollups, clear row.values entries.
- File: `src/lib/store.ts` lines 994-1000. `deleteDatabase()` is a one-line removal.

### B-1620 — There is no UI to delete a database from the DB view (P2, fixed)
- Steps: /app/db/db_b → no "Delete database" button anywhere in the toolbar, no kebab next to title.
- Expected: a `db-options` kebab in the header bar with "Delete database / Duplicate / Rename" matching the page-options menu.

### B-1621 — When relation target DB is gone, `cell-relation-*` cell is not rendered at all (P3, open)
- Steps: delete db_b → /app/db/db_a → row r_a1 (which has `p_rel`) shows no relation column.
- Observed: no `cell-relation-r_a1-p_rel` testid; relation column is silently hidden.
- Expected: render an empty/error cell with a "Target database deleted" tooltip and a way to fix the property.

### B-1622 — Public `/p/<slug>` route reflects store edits immediately (P3, info)
- Steps: visit /p/getting-started → reads "Getting Started". Edit title via store mutation + reload → /p/getting-started now reads "Getting Started EDITED-LIVE".
- Confirmed.

### B-1623 — Public `/p/<slug>` page renders database-inline + columns as placeholder text "(Embedded database — open the workspace to view)" / "(Multi-column layout — open the workspace to view)" (P3, open)
- These are pleasant fallbacks but break Notion parity — Notion public pages do render embedded DBs and columns. Consider as I-XX (UX enhancement).


## 2026-05-13 03:00 — Test agent batch 29

### B-1700 — Verify B-1619 cascade DB-delete (P1, fixed)
- Steps: navigate to /app/db/db_b → click `db-actions-db_b` → click `db-delete-db_b`.
- Observed: db_b removed from state. Rows r_b1/r_b2 removed. Relation property `p_rel` removed from db_a properties. Rollup `p_rollup` removed. r_a1.values.p_rel cleared.
- Expected: all of the above (per B-1619 expected).
- Status: cascade implementation now complete. PASS.

### B-1701 — Verify markdown export of complex page (P2, mostly fixed)
- Steps: navigate to Getting Started page → `page-options` → `page-opt-export-md`. Capture blob text.
- Observed:
  - Title `# Getting Started EDITED-LIVE`
  - `<b>Welcome</b>` → `**Welcome**` (PASS — was broken in B-1611)
  - `<i>Each</i>` → `*Each*` (PASS)
  - heading-2 → `## Sidebar` (PASS — B-1610 reasonably fixed since title is H1)
  - button → `**[🚀 Go to Roadmap]**` (PASS — was placeholder)
  - equation → `$$\n…\n$$` (PASS)
  - code block (empty content, language=javascript) → ` ```javascript\n\n``` ` (acceptable per B-1608)
- Remaining gaps (not new bugs, see B-1623/B-1612 portion):
  - database-inline still `<!-- (embedded database) -->`
  - columns still `<!-- multi-column layout: -->`
  - empty toggle still `<details><summary></summary></details>` (no children, valid since the toggle has no content)
- Verdict: inline formatting fix landed. Placeholder rendering improved partially. Tracking remaining gaps under existing items.

### B-1702 — Verify sidebar pmenu-* testids (P2, fixed)
- Steps: click `page-menu-pg_mp33cd7d01u4huok` in sidebar.
- Observed testids: `pmenu-favorite-…`, `pmenu-duplicate-…`, `pmenu-newsub-…`, `pmenu-copylink-…`, `pmenu-trash-…`. ALL 5 PRESENT. PASS.

### B-1703 — Verify inline DB header `⋯` opens DatabaseMenu with all 3 actions (P2, fixed)
- Steps: inline DB on Getting Started page → click `db-actions-db_dates_test`.
- Observed: menu exposes `db-rename-db_dates_test`, `db-trash-db_dates_test`, `db-delete-db_dates_test`. PASS.

### B-1704 — Multi-relation cycle A→B→C→A renders correctly (P3, info)
- Steps: re-seed db_b with B→C relation (r_b1, r_b2 point to r_c1), db_c with C→A relation pointing to r_a1, db_a with A→B already. Reload.
- Observed: each `cell-relation-*` button shows the related row title (B item 1, C item 1, A row 1 PATCHED). PASS.

### B-1705 — Sidebar drawer renders at 320px but inline-DB toolbar overflows main (P3, open)
- Steps: resize viewport to 320×700. Open page with inline DB.
- Observed: sidebar collapses (`open-sidebar` button shown) until toggled; opening makes a 256px-wide drawer with a full-screen scrim — scrim click closes. Main content for the inline DB renders an internal horizontal scroll because the view-tabs row exceeds 320 px. `db-view-*`, `db-newview-*`, `db-newrow-*`, `db-actions-*` all sit outside the viewport (overflow-x in the inline section forces scroll).
- Expected: at narrow widths the inline-DB toolbar should wrap or condense to icons-only.
- File: inline-DB header layout (flex row, no wrap).

### B-1706 — Timeline bars are NOT draggable to change date (P2, open)
- Steps: navigate to /app/db/db_dates_test → switch to Timeline view → mousedown a `tl-bar-r_dt1`, move 100px, mouseup.
- Observed: bar's `style="left: 672px; width: 96px;"` unchanged. No drag handle elements, no left/right resize handles (`tl-handle-*`), `bar.draggable === false`.
- Expected: Notion-style click+drag on a bar shifts both start+end dates; left/right edges resize start or end.
- File: timeline view component (e.g., `src/components/database/TimelineView.tsx`).

### B-1707 — Cmd+/ block actions shortcut does NOT open block formatting menu (P2, fixed)
- Steps: focus a `block-content-*` element → dispatch keydown `key='/' metaKey=true`.
- Observed: nothing happens. No formatting menu (turn-into / color / duplicate / delete / move) opens.
- Expected: Cmd+/ opens block actions menu at the current block (Notion parity).
- File: editor keydown handler.

### B-1708 — Public `/p/<slug>` does NOT live-update unpublish state (P3, open)
- Steps: open /p/getting-started → page renders. Mutate `isPublished=false` in localStorage + dispatch `storage` event.
- Observed: same-tab public page still renders. Hard reload → "Page not found" message correctly shown.
- Expected: subscribed components react to store change so unpublished page transitions to 404 without a refresh.
- File: public-page route component (likely missing a `useSyncExternalStore` or similar).

### B-1709 — Toggling Wiki OFF does NOT clear `verifiedAt` / `verifiedBy` (P3, open)
- Steps: page-options → page-opt-wiki (turns ON) → verify-wiki (sets verifiedAt timestamp) → page-options → page-opt-wiki (turns OFF).
- Observed: `state.pages.<id>.isWiki = false` but `verifiedAt` and `verifiedBy` remain populated. If user re-enables wiki, the old verification ghost-appears.
- Expected: turning wiki off should null both fields, and probably `verificationExpiresAt` + `pageOwners` as well.
- File: store action that toggles wiki status.

### B-1710 — Workspace export filename uses UTC date, off-by-one near midnight (P3, open)
- Steps: settings → settings-export at 00:35 local (UTC-2 here → still May 12 UTC).
- Observed: download filename = `notion-clone-export-2026-05-12.json`. Local date is 13/05/2026.
- Expected: use local-date or include time, e.g., `notion-clone-export-2026-05-13.json` or `…-20260513-0035.json`.
- File: export utility, uses `new Date().toISOString().slice(0,10)`.

### B-1711 — Trash item shows Restore via testid but "Delete" button uses generic testid (P3, info)
- Steps: trash a page → /app/trash → row shows `restore-<id>` (PASS) and `delete-forever-<id>` (PASS but text label is "Delete" only).
- Observed: button labeled "Delete" actually delete permanently. Inconsistency with other delete-permanent flows ("Delete permanently"). Could surprise testers who expect `delete-perm-`.
- Expected: relabel button "Delete forever" and keep `delete-forever-<id>` testid (which already matches). Just a UX label nit.

### B-1712 — Search results have no testids (`search-result-*`) (P3, open)
- Steps: cmd+search → type "getting" → 3 results show.
- Observed: results render in DOM but no `search-result-<id>` testid.
- Expected: each result should expose a testid so it can be targeted by automation.

### B-1713 — Calendar view has no `cal-today` / `cal-add-event` testids (P3, open)
- Steps: /app/calendar → only `cal-prev` and `cal-next` testids.
- Expected: "Today" button to snap to current month + a "+" affordance to add an event directly. Notion calendar has both.

### B-1714 — Page cover picker uses `window.prompt()` for URL (P2, fixed)
- Steps: page → add-cover.
- Observed: native `prompt()` opens asking for URL. With our `window.prompt=()=>"auto"` mock it stored literal string "auto" as cover.
- Expected: dedicated cover picker UI (gradient palette + upload + Unsplash). Today's UX is poor and tied to prompt blocking.
- File: page header "Add cover" handler.

### B-1715 — Comment "Show resolved" toggle is an unlabelled `<label>+input` with no testid (P3, open)
- Steps: open page comments → click Show resolved.
- Observed: works but no `show-resolved` testid, hard to automate.

### B-1716 — Comment reply has no UI affordance (P2, open)
- Steps: /app/p/pg_mp36jcskpab8tj6g → comments → existing comment from batch 27 shows.
- Observed: only `resolve-<id>` and a top-level `comment-input`. Posting from `comment-input` creates a new top-level comment with `parentId=null`, not a reply.
- Expected: each comment has a "Reply" button → opens scoped input → new comment's `parentId` = thread head.
- File: PageComments component.

### B-1717 — Filter row "×" remove button has no testid (P3, open)
- Steps: db view → view-menu → add-filter-v_a → filter-row-0 created.
- Observed: row has a × button (`aria-label="Remove filter"`) but no `filter-row-remove-0` testid.
- Expected: add testid `filter-remove-<index>` for automation.

### B-1718 — Property header (column) drag-to-reorder and resize NOT supported (P3, open)
- Steps: table view → prop-header-* elements have `draggable=false`, no resize handles.
- Expected: Notion table supports both column drag-to-reorder and grip-edge resize.

### B-1719 — Table view "delete-perm" testid scheme inconsistent with DB delete (P3, info)
- DB delete in DbView uses `db-delete-<id>` (label: "Delete permanently"). Trash uses `delete-forever-<id>` (label: "Delete"). Pick one convention.

### B-1720 — Inbox `inbox-resolve-<cmtId>` works but no `inbox-mark-read` / `inbox-snooze` (P3, info)
- Inbox shows "Mark as read" → matches `inbox-resolve-<cmtId>` (resolve, not mark-read). Confusing if user just wants to mark read without resolving.

### B-1721 — Templates testid uses display name including spaces & punctuation (`template-Decision log (ADR)`) (P3, info)
- Spaces/parens in selectors require quoting. Suggest slug-based testids: `template-decision-log-adr`.

### B-1722 — AI chat thread STILL not persisted across reloads (re-verify of B-1618) (P2, fixed)
- Steps: open AI panel → send "Test message batch 29 persistence" → reload tab → re-open AI panel.
- Observed: empty initial state. STILL OPEN.
