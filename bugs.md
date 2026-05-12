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

### B-911 — Mobile sidebar overlays content and never auto-closes (P2, open)
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

### B-1117 — No per-page export to PDF or Markdown (P3, open)
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

### B-1123 — Cmd+D duplicate-block keybinding still missing (P3, open) — overlap with I-719
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

### B-1127 — Mobile sidebar still overlays (B-911) and there is no scrim (P2, open) — verified
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
