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

### B-424 — Form view "Copy form link" creates a /form/:dbId/:viewId URL that has no route handler (P1, fixed)
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

### B-1138 — Database Form view exposes "Copy form link" but the generated link is the same `/p/<slug>` page route (P3, fixed)
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

### B-1220 — Form view exposes "Copy form link" that points to a non-existent /form/... route (P2, fixed) — relates to B-1138
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

### B-1716 — Comment reply has no UI affordance (P2, fixed)
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

## 2026-05-13 04:00 — Test agent batch 30

### Verifying latest fixes

**FIX V1 — Cover picker** (PASS, was B-1714)
- `cover-picker` opens (no native `prompt()` anymore).
- Gradients: `cover-grad-Sunset|Aurora|Peach|Lavender|Forest|Ocean|Night|Berry` — clicking writes a `linear-gradient(...)` string to `page.cover`. Confirmed Sunset = `linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)` and Aurora = `linear-gradient(135deg, #43cea2 0%, #185a9d 100%)`.
- URL input: `cover-url-input` + `cover-url-apply` accept any URL; stored as raw string and rendered as `<img src>`.
- Unsplash: `cover-img-0..5` six thumbs — click sets a `https://images.unsplash.com/...?w=1200&q=70` URL.
- Removal: `cover-remove` button sets `page.cover = null` and closes picker.
- Rendering: PageCover renders a 192px `h-48` div with `background-image: linear-gradient(...)` for gradients, or `<img>` for URLs. Persists across reload.

**FIX V2 — AI chat persistence + `ai-new-thread`** (PASS, was B-1722/B-1618)
- Posted "Test message batch 30 persistence" → reload tab → AI panel still shows both user message + assistant reply. Store key: `notion-clone:ai-chat` (global, not per-user).
- `ai-new-thread` clears localStorage `notion-clone:ai-chat` to `[]` and UI shows empty state "Ask anything about your workspace…".
- Truncation limit verified at 50 messages (newest 50 retained when 120 messages set in storage).

**FIX V3 — Cmd+/ + Cmd+D shortcuts** (PASS, was B-1707)
- Focus `block-content-<id>` → keydown `key='/' metaKey=true` opens `slash-menu` with all 38 slash-* items.
- Focus same block → keydown `key='d' metaKey=true` duplicates the block immediately after itself. Verified: 12→13 block count and new id inserted right after focused id. Repeating Cmd+D twice produces +2 duplicates.
- Both no-op when nothing focused (expected).

### B-1800 — Synced-block-ref does not mirror source content (P2, open)
- Steps: create synced-block via `slash-synced`, gives `synced-source-<id>` + `synced-add-<id>` UI. Inject 50 `synced-block-ref` blocks pointing at the same `sourceId` on another page. Reload.
- Observed: each ref renders `data-testid="synced-ref-<id>"` with text "Synced reference / Source is empty." even when the source block has populated `content` AND a non-empty `text` child. The ref widget never resolves the source.
- Expected: ref should render the source block (and its children) inline. Mutating the source should re-render all refs.
- File: synced-block-ref renderer.

### B-1801 — Synced-block source UI has no way to create the ref (P2, fixed)
- Steps: open a synced source block. There's `copy id` button but the slash menu only offers `slash-synced` (creates a fresh source). No `slash-synced-ref` or `paste-as-ref` flow.
- Observed: B-1800 only reproducible by manually inserting `synced-block-ref` records into localStorage. UI lacks any way to make a reference.
- Expected: a slash item or "Use ID" affordance to convert a block to a reference.

### B-1802 — AI chat thread is stored globally, not per-user (P2, fixed)
- Steps: log in as user A → send AI message → log out → log in as user B.
- Observed: AI panel shows the same thread (`notion-clone:ai-chat` is a single global key, not keyed by `currentUserId`).
- Expected: AI conversations should be namespaced per user (or at least cleared on logout). Privacy/cross-account leak.
- File: AI panel persistence layer.

### B-1803 — Cover URL accepts `javascript:` scheme (P2, fixed)
- Steps: add-cover → `cover-url-input` = `javascript:alert('xss')` → `cover-url-apply`.
- Observed: stored as `page.cover` and rendered as `<img src="javascript:alert('xss')">`. Modern browsers block image execution but the value is persisted, exported, and could be exploited via other sinks (e.g., markdown export, public page, an `<a>` linkified version).
- Expected: validate URL with `URL` constructor + restrict protocol to `https:` / `http:` / `data:image/`.
- File: CoverPicker URL apply handler.

### B-1804 — AI input does not submit on Enter (P2, fixed)
- Steps: open AI panel → focus `ai-input` (an `<input>` element, not in a `<form>`) → type text → press Enter.
- Observed: nothing happens. Must click `ai-send` button. Bad UX vs every other chat surface.
- Expected: Enter sends, Shift+Enter inserts newline (textarea pattern) or wrap input in a `<form>` with submit handler.
- File: AskAI component.

### B-1805 — Page cover has no `data-testid` on the rendered cover (P3, open)
- Steps: set cover via picker, then inspect.
- Observed: visible 192px gradient/img element has no `data-testid="page-cover"` (or similar). Automation must search for div by `backgroundImage` matching `linear-gradient`.
- Expected: add `data-testid="page-cover"` to the wrapper.
- File: PageCover component.

### B-1806 — Cover picker URL apply with empty string nulls the cover (P3, fixed)
- Steps: existing cover set → add-cover → leave `cover-url-input` empty → click `cover-url-apply`.
- Observed: cover wiped to `null` and picker auto-closes. Effectively a stealth "remove" without any confirmation.
- Expected: when input is empty, `cover-url-apply` should be disabled, or it should no-op (do not destroy the existing cover).
- File: CoverPicker apply handler.

### B-1807 — No `page-cover-reposition` / `page-cover-change` affordances on hover (P3, open)
- Steps: hover over an existing page cover.
- Observed: no overlay buttons. The only way to change the cover is to remove it then re-pick (or use `add-cover` again which shows the picker — actually present, but no in-cover affordances).
- Expected: Notion shows "Change cover" + "Reposition" buttons on the cover bottom-right.

### B-1808 — Page title color over light gradient covers — low contrast risk (P3, open)
- Steps: set Sunset cover, then look at the page title H1.
- Observed: title uses `color: oklch(0.129 0.042 264.695)` (near-black) with no background, no text-shadow, no overlay. The cover is 192px tall and the title sits below it, so today the contrast issue is mostly aesthetic. But if a future variant overlaps title on cover, light gradients will fail WCAG.
- Expected: add a subtle text-shadow or a low-opacity card behind title when over a cover, OR enforce dark/light title color based on cover luminance.

### B-1809 — Timeline drag-to-change-date STILL not implemented (re-verify B-1706, P2, open)
- Steps: /app/db/db_dates_test → switch to `db-view-v_dates_tl` → inspect bars.
- Observed: bars `tl-bar-<id>` have `draggable=false`, no `tl-handle-*`, no mousedown listeners. Click opens row-detail drawer only. UNCHANGED.
- File: TimelineView.

### B-1810 — Comment "Reply" affordance STILL missing (re-verify B-1716, P2, open)
- Steps: /app/p/pg_mp36jcskpab8tj6g → `comments-btn`.
- Observed: only `resolve-<id>` + top-level `comment-input` + `post-comment`. No `reply-<id>` / `comment-input-<parentId>`. UNCHANGED.

### B-1811 — 500-row board view performs OK but no virtualization (P3, info)
- Steps: inject 500 rows + add ids to `db_a.rows` array → /app/db/db_a → board view `v_a_board`.
- Observed: 503 `board-card-*` rendered, DOM=6979 nodes, full page renders in <1s, scroll/click latency low. No virtualization (every card mounted). Acceptable at 500. Likely will degrade at ~5000 rows; consider react-window for board columns.

### B-1812 — 500-row table view renders every row (P3, info)
- Steps: same setup, table view `v_a`.
- Observed: 503 rows rendered, DOM=13035 nodes. Filter input focus takes ~3ms. No virtualization. Acceptable today.

### B-1813 — db_a formula `1 + +` is invalid expression but no error UI (P3, open)
- Steps: noticed during db_a inspection: `p_fx.expression = "1 + +"`.
- Observed: rendered formula cells are blank — no visible "Invalid formula" badge or tooltip.
- Expected: invalid formulas should show a red badge "Invalid expression" so users notice.


## 2026-05-13 12:30 — Test agent batch 31

**FIX V1 — Cover URL protocol allow-list** (PASS, was B-1803/I-1803)
- `cover-url-input` = `javascript:alert('xss')` → `cover-url-apply` → `cover-url-error` renders "Only http(s):// and data:image/ URLs are allowed."; picker stays open; value not committed.
- `data:text/html,<script>alert(1)</script>` → same inline error (data: scheme without `image/` subtype rejected).
- `https://images.unsplash.com/...` → no error, picker closes, cover applied.

**FIX V2 — AI chat namespaced per user** (PASS, was B-1802/I-1802)
- Storage now uses `notion-clone:ai-chat:<userId>` (legacy `notion-clone:ai-chat` left empty).
- Signed out user A (`f56fb5b7-...`, 2 messages), signed in as fresh user B → AI panel renders zero `ai-msg-*` items. User A's per-user key still holds 2 messages; User B's key holds 0. No cross-user leak.

**FIX V3 — AI input Enter submits** (PASS, was B-1804/I-1804)
- `ai-input` is now `<input>` inside a `<form>`. Filled text, dispatched single `Enter` keydown → input clears, single user message + single assistant reply persisted. No duplicate fires.

**FIX V4 — `slash-synced-ref` slash command** (PASS, was B-1801/I-1801)
- Slash menu now exposes `slash-synced-ref` alongside `slash-synced`.
- Invoking inserts a ref block with `data-testid="synced-ref-<id>"` rendering "SYNCED REFERENCE — NO SOURCE" plus `synced-source-input-<id>` text field and `synced-source-link-<id>` Link button.
- Pasting an existing source id and clicking Link persists `sourceId` on the block and renders source's child blocks inline ("HELLO FROM SOURCE CHILD" verified mirroring across pages).
- Cycle protection works: linking ref to a source whose subtree already contains a ref renders `synced-cycle-<id>` with warning text.


### B-1900 — Dark-mode page title contrast verified OK over light cover (P3, info)
- Steps: page with Sunset gradient cover → toggle `dark-btn` → inspect H1.
- Observed: html.dark, `page-title` color = oklch(0.984) (near-white) over body `oklch(0.129)` (near-black). Cover sits 192px above title, no overlap. WCAG passes. (B-1808 remains theoretical only — title is never over cover today.)

### B-1901 — Form view fields are non-interactive placeholders (P1, fixed)
- Steps: created `db_bigform` with 32 mixed properties (text/number/select/multi-select/date/checkbox/url/email/phone/status) + form view `v_bf_form`. Open form view.
- Observed: All 32 labels rendered but each field is a `<div class="… italic">text field</div>` (or "number field", "select field", etc.). NO `<input>`/`<select>`/`<textarea>` elements rendered (only 2 inputs/1 textarea in entire page, used by title/form-title controls — not by the user-facing form). No Submit/Create/Add-row button. No `form-field-<id>` testids. Form view is essentially read-only marketing copy. Users cannot collect submissions.
- Expected: each property type should render an editable control, plus a Submit button posting a new row to `db.rows`.
- File: FormView renderer.

### B-1902 — `form-copylink` produces no visible feedback (P3, fixed)
- Steps: open form view → click `form-copylink-<viewId>`.
- Observed: nothing visible — no toast, no clipboard change confirmation, no URL field. Hard to know if it succeeded.
- Expected: toast "Form link copied" + actually navigable shareable URL.
- File: FormView header.

### B-1903 — AI panel messages have no per-message testids (P3, fixed)
- Steps: seed `notion-clone:ai-chat:<userId>` with N messages → open `sidebar-ai`.
- Observed: messages render correctly but querying `[data-testid^="ai-msg-"]` returns 0. Truncation cap = 50 (confirmed: seed 500 user+500 assistant = 1000 → 50 retained newest).
- Expected: each message should have `data-testid="ai-msg-<index>"` for testability.
- File: AskAI message list.

### B-1904 — Block-level commenting still absent (re-verify B-1716, P2, open)
- Steps: hover block, focus block, no `block-comment-<id>` / `block-handle-<id>` / `comment-block-<id>` testids appear. Comments panel still page-level only with single `comment-input` and `post-comment` (no `comment-input-<parentId>` for threads/replies).
- File: Comments + block toolbar.

### B-1905 — Synced-block source `content` field not mirrored into refs (re-verify B-1800, P2, open)
- Steps: synced source has `content: "UPDATED 1778626232897"` and no children → refs render "Source is empty.". Adding a child block → ref renders the child. The source's own inline text is silently dropped.
- Expected: ref should render the source's own `content` first, then its children. Matches Notion semantics where a synced block IS the block, not a folder.
- File: SyncedBlockRef renderer.


### B-1906 — Synced ref to non-existent source silently persists invalid `sourceId` (P3, fixed)
- Steps: type `notARealBlock123` into `synced-source-input-<id>` → click `synced-source-link-<id>`.
- Observed: ref's `sourceId` saved as `"notARealBlock123"` in localStorage; UI stays on the input/link form (no toast, no inline error). Same behavior when linking to a *non-synced* text block (`blk_mp33cd7dvdil4mjz`).
- Expected: validate that target block exists and is `type:'synced-block'`. Show inline error: "No synced block with this id" or "Target is not a synced source".
- File: SyncedBlockRef linker.

### B-1907 — No thread switcher within a single user's AI history (P3, open)
- Steps: open AI panel → `ai-new-thread` button.
- Observed: New-thread wipes existing thread instantly (no "Are you sure?" / no archive). There's only ever one stored thread per user (single key `notion-clone:ai-chat:<userId>`). No history list, no rename, no re-open of past conversations.
- Expected: at minimum confirm before clearing; longer-term, allow multiple threads per user with a list view.
- File: AskAI panel.

### B-1908 — "Today" button in Calendar lacks `cal-today` testid (re-verify B-1713, P3, open)
- Steps: /app/calendar → look for "Today" button.
- Observed: "Today" button visible but no `data-testid`. Also no add-event affordance (`cal-add-event` missing). UNCHANGED from previous batch.

### B-1909 — Home view has zero `home-*` / `recent-*` testids (P3, open)
- Steps: /app or sidebar-home.
- Observed: no testids on any home-screen widget (Recently visited, Favorites cards, etc.). Hard to automate. Visible content is fine, just untestable.
- File: Home dashboard.

### B-1910 — `form-title` Save behaviour OK but no toast (P3, info)
- Steps: open form view → fill `form-title-v_bf_form` with "My Big Form".
- Observed: value persists in input field (controlled), but no confirmation / no save state indicator. (Same pattern as page-title edit; consistent.)


### B-1911 — Mail compose accepts invalid recipient (P3, fixed)
- Steps: `mail-compose` → `compose-to` = "notvalidemail" → `compose-send`.
- Observed: toast "Email saved to Sent (demo — no real SMTP)." — invalid email accepted, no `compose-to-error`. Also empty subject + body accepted.
- Expected: validate `compose-to` against `email` regex; surface `compose-to-error` inline; disable send when missing.
- File: MailCompose.

### B-1912 — Trash restore + delete-forever happy path verified (P3, info)
- Steps: mark page `isInTrash:true` → `sidebar-trash` lists page with `restore-<id>` + `delete-forever-<id>` testids. Click restore → page returns to tree without dialog.
- Observed: works as expected. Note no confirm dialog on restore (intentional/fine).



## 2026-05-13 14:00 — Test agent batch 32

**FIX V1 — Form view interactive Preview mode** (PASS, was B-1901/I-1900)
- `db_dates_test` → `db-view-v_form` renders 7 real `<input>`, 1 `<select>`, 2 `<textarea>`. Each field has `form-field-<propId>` (verified `form-field-p_dt`, `p_dd`, `p_dn`, `p_dms`, `prop_mp34dfab3dc8`, `prop_mp34ecd511qd`). Multi-select renders `form-multiselect-p_dms-tg_red` chips. Submit button `form-submit-v_form` present.

**FIX V2 — `form-copylink` emits toast** (PASS, was B-1902/I-1901)
- Click `form-copylink-v_form` → ephemeral DOM node `<div data-testid="toast">Form link copied to clipboard</div>` inserted then removed ~250ms.

**FIX V3 — AI messages have `ai-msg-<index>` + `data-role`** (PASS, was B-1903/I-1902)
- Sent "Test message 1" via `ai-input` → `ai-msg-0` (data-role="user", "Test message 1"), `ai-msg-1` (data-role="assistant", canned summary). Indexing starts at 0 monotonically.

**FIX V4 — Synced-ref Link rejects unknown source ids with toast** (PASS, was B-1906/I-1903)
- Created unbound `synced-block-ref blk_unbound_test_1` on page. `synced-source-input-<id>` = "bogus_source_id_xyz" → click `synced-source-link-<id>`.
- Observed toast `data-testid="toast"`: "No synced-block with that id was found in this workspace". `sourceId` remains `null` in store.

**FIX V5 — Mail compose disables Send for invalid To** (PASS, was B-1911/I-1908)
- `compose-to` = "notvalid_email" → `compose-send.disabled=true`, `compose-to-error` = "Invalid address: notvalid_email".
- `good@example.com` → enabled, no error.
- `good@example.com, bad_one, also@ok.com` → disabled, error "Invalid address: bad_one" (first offender reported).
- Empty → disabled, no error text (clean state).


### B-2000 — Block-level commenting still missing (P2, open)
- Steps: re-tested. Click block handle on `blk_mp33cd7dvdil4mjz` → no menu appears (popover library blocks synthetic clicks); hover handle → no `block-comment-*` testid in DOM. Confirms B-1716/B-1904 unchanged.

### B-2001 — 500 text-block page is not virtualized (P2, info)
- Steps: created `pg_perf500_test` with 500 sequential text blocks, navigated.
- Observed: all 500 blocks rendered (`block-content-blk_perf500_0..499`). DOM nodes ~8969. First-keystroke latency on `blk_perf500_250` = 169ms; subsequent keys avg 76ms across 5 keystrokes (39..78ms). Noticeable lag on first key, then acceptable. No virtualization. Acceptable today (≤500), watch at 1000+.

### B-2002 — AI panel input is single-line `<input>` with no maxlength (P3, open)
- Steps: stuffed `ai-input` with 50,000 characters via DOM, clicked `ai-send`.
- Observed: accepted instantly (msSet=13ms); chat appended `ai-msg-2`/`ai-msg-3` with full 50k user text and assistant reply built around the 50k snippet. No warning, no truncation, no scrollable textarea. UX: 50k characters in a single-line input is unreadable. Suggest `<textarea>` and ~10k char soft-limit.

### B-2003 — `ConditionalRule` type defined but never honored (P2, fixed)
- Source check: `src/lib/types.ts:494` `FormView.conditionalLogic?: ConditionalRule[]` declared, `:501` `ConditionalRule` interface defined. `grep -rn "conditionalLogic" src/` returns only the type declaration — no consumer reads it, no editor writes it. Form view always renders all fields regardless. Promised feature absent from code.

### B-2004 — Database rows are not drag-reorderable (P2, open)
- Steps: db_dates_test → Main (`v_dates_test`) → inspect `<tr>` of `r_dt1`.
- Observed: `tr.draggable === false`, `td.draggable === false`, no `row-drag-<id>` / `row-handle-<id>` testid. Cells are inputs but no reorder affordance. Same in `board-card-*` (`cursor-pointer`, not draggable). Sort works via header `add-sort-v_a` but manual reorder absent.

### B-2005 — Markdown export drops synced-block source `content` (P2, open, re-verify B-1905)
- Steps: built `pg_export_synced_cols` with `synced-block` source (`content:"SYNC ROOT"`, one child "Synced source child line"), a ref, and 2 columns.
- Observed export:
  ```
  # Export Synced & Cols\n\n# Export Test\n\nSynced source child line\n\nSynced source child line\n\n<!-- multi-column layout: -->\n<!-- column -->\nLeft column body\n<!-- column -->\nRight column body\n
  ```
- Source's own `content` ("SYNC ROOT") dropped — only child emitted. Both source AND ref emit their children (intentional Notion semantics: ref is a mirror). Columns serialize correctly using `columnIds`/`blockIds`.
- File: `src/lib/export-markdown.ts:155-169`.

### B-2006 — Markdown export of sub-page uses hard-coded "📄 Sub-page" (P3, fixed)
- Steps: page with `sub-page` block → export.
- Observed: line "📄 Sub-page" — page title, slug, even own emoji dropped.
- Expected: `📄 [Sub Child](/p/pg_export_subpage)` or at least include title.
- File: `src/lib/export-markdown.ts:136-138`.

### B-2007 — Markdown export silently drops empty image/video/table blocks (P3, info)
- Steps: page with `image{url:""}`, `video{url:""}`, `table{rows:[]}` → export returns empty string for each.
- Observed: blocks vanish from output (no placeholder comment). Confusing for round-tripping. Suggest emit `<!-- empty image -->` etc.
- File: `src/lib/export-markdown.ts:101-130`.

### B-2008 — Templates page items are non-functional (P2, fixed)
- Steps: /app/templates → click `template-Daily journal` (and others).
- Observed: nothing happens — no navigation, no toast, no preview dialog, no new page created. All 8 templates inert. `template-1:1 agenda` testid contains `:` which makes CSS selection fiddly.

### B-2009 — Calendar view still missing `cal-today` / `cal-add-event` testids (P3, open, re-verify B-1713/B-1908)
- Steps: /app/calendar.
- Observed: "Today", Month/Week/Day toggles, day numbers, event labels all without testids. Only `cal-prev`, `cal-next`, `calendar-grid` exposed. Event "Test Cal Event Batch 15" visible but no `cal-event-<id>` testid.

### B-2010 — Home dashboard cards lack any `home-*` testid (P3, open, re-verify B-1909)
- Steps: /app → ⭐ Favorites + 🕐 Recently visited render real page list.
- Observed: 0 testids on home view (`home-fav-<id>`, `home-recent-<id>` all missing). Pages exist as plain buttons rendering icon+title+date. Hard to assert in automation.

### B-2011 — Public published page: "Copy" button has no testid (P3, open)
- Steps: share dialog → `publish-toggle` → toggle on → URL appears with "Copy" button.
- Observed: the Copy button is a plain `<button>` with text "Copy" — no `publish-copy-url` / `share-copy-link` testid.

### B-2012 — History dialog "Restore" button has no testid (P3, open)
- Steps: `history-btn` opens history panel (inline, no `role="dialog"`). `snapshot-now` → snapshot row appears with "Restore" text button.
- Observed: no `restore-snapshot-<id>` / `history-restore-*` testid; only `snapshot-now` exposed.

### B-2013 — Inbox rows expose only `inbox-resolve-<id>` testid, no row testid (P3, info)
- Steps: /app/inbox.
- Observed: each notification renders icon + page-title link + date + comment text + "Mark as read" button. Only the "Mark as read" carries a testid (`inbox-resolve-cmt_*`); the row container, the page-link, and the date have none. Mark-as-read click cleanly removes the row.

### B-2014 — 800-row table view: all rows rendered, no virtualization (P2, info)
- Steps: db_a expanded to 803 rows, embedded as inline-database on `pg_perf500_test` → Main table view.
- Observed: 802 `row-open-*` testids rendered. DOM≈29183 nodes. ~5s rendering wait. Acceptable single-shot but pile-up with 500 text blocks already on same page = ~29k DOM nodes total. Would benefit from virtualization (windowing rows + sticky header) at this scale.

### B-2015 — 800-row gallery view: all 802 cards rendered (P2, info)
- Steps: same db_a, view=gallery.
- Observed: 802 `gallery-card-<id>` testids in DOM. Same pattern as table — no windowing.

### B-2016 — Board view: card not draggable (P2, open)
- Steps: `db-view-v_a_board` → inspect `board-card-row_perf1k_0`.
- Observed: `<div class="… cursor-pointer hover:bg-accent/40">`, no `draggable=true`, no `data-rbd-*`, no pointer-down rearrange handler observed in DOM. 536 cards rendered. Cards are click-to-open only — Notion-style status-change-by-drag absent. (Distinct from B-2004 which is about table rows.)

### B-2017 — `view-rename-v_a` requires window.prompt() to commit (P3, info)
- Steps: clicked `view-rename-v_a` with `window.prompt = () => "auto"` mock.
- Observed: view name remained "Main" — rename is implemented via a Radix dialog input rather than `window.prompt`, so the mock doesn't apply. Fine for users; just a heads-up for automation.

### B-2018 — Sub-page on a published page is correctly marked "unpublished" (P3, info)
- Steps: publish `pg_export_misc`, visit `/p/misc-export`.
- Observed: shows sub-page row with "Sub Child (unpublished)" label — correct privacy boundary.

### B-2019 — Snapshot/version system works end-to-end (P3, info)
- Steps: `history-btn` → `snapshot-now`.
- Observed: history list now contains "13/05/2026 01:33:13 / Misc Export / Restore" row. No `restore-<id>` testid (see B-2012).

### B-2020 — Slash menu only triggers on real keystroke (P3, info)
- Steps: focused contentEditable text block, used `execCommand('insertText', '/')` and synthetic `KeyboardEvent` — `[data-testid="slash-menu"]` never appears.
- Observed: tied to genuine `keydown` events; affects automation but not user UX. Source confirms `slash-synced` (id="synced") and `slash-synced-ref` (id="synced-ref") both present in `src/lib/slash-commands.ts:285,295`.

### B-2021 — Page-options menu closes on click-out before any sub-item is clickable via eval (P3, info)
- Steps: programmatic `.click()` on `page-options` — `page-options-menu` never appears in DOM (still 0 `page-opt-*` elements after click). Direct preview_click(...) also fails to keep menu open.
- Observed: most likely the React state toggles in `onClick` but a global mousedown handler fires inside the same JS task and re-closes. Real user clicks work in `share-btn`, `history-btn` etc. — only `page-options` toggle exhibits this. Automation impact only.

### B-2022 — `publish-toggle` works, slug deterministic from title (P3, info)
- Steps: share-btn → publish-toggle on a page titled "Misc Export".
- Observed: `pages[…].publishSlug = "misc-export"`, `isPublished = true`, URL `/p/misc-export` renders public read-only view immediately. No path collision check tested.


## 2026-05-13 02:10 — Test agent batch 22

### B-2100 — Templates slug testids present; click creates 9-block page (P3, info)
- Steps: `/app/templates` → query `[data-testid^="template-"]`.
- Observed: all 8 slug testids found (`template-meeting-notes`, `template-project-brief`, `template-daily-journal`, `template-reading-list`, `template-okrs`, `template-runbook`, `template-decision-log-adr`, `template-1-1-agenda`). Click on `template-meeting-notes` navigates from `/app/templates` → `/app/p/pg_<id>` and inserts exactly **9** `[data-block-id]` blocks. Resolves I-2006 / B-2008.

### B-2101 — FormView conditional logic show/hide works (P3, info)
- Steps: set `databases.db_dates_test.views[v_form].conditionalLogic = [{ifPropertyId:p_dn, operator:"equals", value:42, showPropertyIds:[p_dms]}]`, reload, open db-view `v_form`.
- Observed: initial render hides `form-field-p_dms`. Typing `42` into `form-field-p_dn` reveals `form-field-p_dms`. Changing back to `7` re-hides it. Both directions live without re-mount. Resolves B-2003.

### B-2102 — Markdown export of sub-page block emits emoji + link (P3, info)
- Steps: `import('/src/lib/export-markdown.ts')` → `pageToMarkdown(s.pages.pg_export_misc, s.blocks, s.pages)`.
- Observed: output contains `🌱 [Sub Child](/app/p/pg_export_subpage)`. (Icon comes from target page's `icon` field; falls back to `📄` when unset per source.) Resolves I-1707 / B-1717.

### B-2103 — `/form/<dbId>/<viewId>` URL copied by "Copy form link" 404s (P1, fixed)
- Steps: open db with form view → `form-copylink-<viewId>` button → URL `/form/db_dates_test/v_form` copied → visit it.
- Observed: "404 / Page not found / The page you're looking for doesn't exist or has been moved." Either the public form-render route is missing, or the FormView should copy `/app/p/<pageId>?view=<viewId>` instead. Today the button silently hands users a dead link.

### B-2104 — Two pages with same publish slug coexist; first match wins silently (P1, open)
- Steps: duplicate "OKRs" → publish both → both end up with `publishSlug="okrs"` → visit `/p/okrs`.
- Observed: original "OKRs" renders; "OKRs (Copy)" is shadowed with no warning and no alternate URL. Should append `-2` or otherwise dedupe, and surface a "slug already taken" error in the share dialog.

### B-2105 — Database table rows have no drag handle (P2, open)
- Steps: visit `pg_mp33cd7d01u4huok` → table view of `db_dates_test` → inspect every `<tr>`.
- Observed: `tr.draggable` is `null` on all rows; no row-handle testid; no `data-rbd-*`; dispatching synthetic `dragstart`/`drop` between TRs leaves the order unchanged. (Extends B-2004 to confirm fix not yet in.)

### B-2106 — Sidebar page tree has no drag-reorder (P2, open)
- Steps: query `aside [draggable="true"]` after navigating to `/app`.
- Observed: 0 elements (the 22 draggables on the page are all block-level `handle-blk_*` inside the editor). Sidebar page rows are click-only — no way to drag-nest or reorder a page in the tree.

### B-2107 — Calendar event chip not draggable (P2, open)
- Steps: calendar week view → add event "Wed event" on Wed → grab the chip → drop on Fri.
- Observed: chip's `draggable` attr is `null`; synthetic dragstart/dragover/drop does not move it. WeekStrip render path has no drag handlers attached to the colored chip `<div>` (`app.calendar.tsx:305-313`).

### B-2108 — Public page hides embedded databases with terse fallback (P2, open)
- Steps: publish `pg_mp33cd7d01u4huok` (contains a database-inline of `db_dates_test`) → visit `/p/getting-started`.
- Observed: shows "(Embedded database — open the workspace to view)" instead of a public read-only view of the table/board/form. Forms in particular would benefit from public render so a `conditionalLogic` form can collect submissions from the outside world.

### B-2109 — AI assistant has no LLM / code-block rendering (P2, open)
- Steps: open `sidebar-ai` → submit "give me a python hello world in a code block" → inspect response.
- Observed: response is a pseudo workspace-search result (`pseudoAnswer` in `src/components/ai/AIChat.tsx:70-105`). Output is whitespace-pre-wrap raw text — no markdown fenced-code-block parsing, no `<pre>` rendering even when the assistant returns "```py … ```". Demo "Models: GPT-5.2 · Claude Opus 4.7 · Gemini 3" footer is decorative only.

### B-2110 — useEffect dep-array size changes on rerender (P2, open)
- Steps: open `/app/p/pg_mp3a13swy7oe9zf8`, paste 10kb+ text into the first text block, observe console errors.
- Observed: repeated `Warning: The final argument passed to %s changed size between renders. The order and size of this array must remain constant.` followed by `useEffect [[object Object], [object Object]] [[object Object], [object Object], [object Object]]`. Indicates a useEffect dep list is being built conditionally — likely in a block-list renderer. Should be a stable array (use refs or unconditional `useEffect` per item).

### B-2111 — Code block has no syntax highlighting (P3, info)
- Steps: insert a `code` block with language="python", content `print('hello')`.
- Observed: rendered as a plain `<textarea>` (font-mono) with a language `<select>` and Copy button. No Prism/highlight.js coloring. Acceptable for a clone but downgrades developer feel.

### B-2112 — Search command palette lacks `role="dialog"` and `cmdk-*` testids (P3, info)
- Steps: open via `sidebar-search` click → query `[role="dialog"]`.
- Observed: 0 dialogs; only the search `<input placeholder="Search pages, run a command...">`. Items rendered as plain divs without `data-testid` (no `search-item-<id>` / `cmdk-<group>-<i>`). Filtering works ("okr" returns both OKR pages), just no machine-readable hooks.

### B-2113 — Calendar month view: no `cal-day-*` testid (P3, info)
- Steps: month mode → inspect grid cells.
- Observed: 0 `cal-day-*` testids; 0 `cal-event-*`; the only calendar testids in the global app are `cal-prev`, `cal-next`, `calendar-week-grid`, `week-day-<date>`, `calendar-day-grid`, `day-hour-<h>`. Aligned with I-2007.

### B-2114 — Page view has no top breadcrumb for nested sub-pages (P3, info)
- Steps: navigate directly to `/app/p/pg_export_subpage` (a sub-page child of `pg_export_misc`).
- Observed: no `[data-testid="breadcrumb"]`; no "Misc Export › Sub Child" trail at the top of the page. There is a `breadcrumb` *block* type but no chrome-level breadcrumb on every page. Most users land here through the sidebar and have no quick way to navigate to the parent.

### B-2115 — Inbox row/page-link/date testids still missing (P3, info)
- Steps: `/app/inbox` → query `[data-testid*="inbox"]`.
- Observed: only `sidebar-inbox` and `inbox-resolve-<commentId>` present. Confirms I-2011 (B-2013) unresolved.

### B-2116 — Home page has no testids (P3, info)
- Steps: `/app` → query `main [data-testid]`.
- Observed: 0 testids inside `<main>`. Sidebar has plenty. Confirms I-2008 (B-2010) unresolved.

### B-2117 — Public page slug "okrs" silently shadows duplicate (paired with B-2104, P3, info)
- Notes: dedup observed only on second visit; see B-2104.

### B-2118 — Mail compose flow works end-to-end (P3, info)
- Steps: `mail-compose` → fill `compose-to`/`-subject`/`-body` → `compose-send`.
- Observed: new `mail-mail_<id>` row appears at the top of the inbox list. Mail count went 6 → 7. Good.

### B-2119 — Chart view donut renders SVG arcs cleanly (P3, info)
- Steps: `db-view-v_a_chart` → `chart-type-v_a_chart` `<select>` value "donut".
- Observed: chart re-renders to a donut without console errors; >0 `<svg> circle/path` elements appear.

### B-2120 — Long-form paste perf is excellent (P3, info)
- Steps: focus a text block contentEditable → execCommand("insertText", 10800 chars). Then a second pass with 20kb.
- Observed: insert time 14ms (10kb) and 21ms (20kb); blocks[].content reflects exactly 10818/20005 chars after blur. No layout jank, no console errors caused by the paste itself.

## 2026-05-13 03:30 — Test agent batch 23

### B-2200 — Public form route `/form/<dbId>/<viewId>` works (P3, info — fixes B-2103)
- Steps: visit `/form/db_dates_test/v_form`.
- Observed: page renders with title "Test Form", 5 visible `public-form-field-*` testids (title, date, number, url, files) and one `public-form-submit` button. Hidden field `p_dms` correctly suppressed by the `equals 42` conditional rule on `p_dn`. Resolves B-2103 / I-2100.

### B-2201 — Public form submission appends row to host user's database (P3, info)
- Steps: fill `public-form-field-p_dt` ("Public form B-2200 submission"), `-p_dn` (42), `-p_dd` (2026-05-15), `-prop_mp34dfab3dc8` (https://example.com/b2200) → click `public-form-submit`.
- Observed: row count in `localStorage.notion-clone:user:<uid>` → `rows[*].databaseId === "db_dates_test"` goes 5 → 6. New row has `createdBy: "public-form"`, `lastEditedBy: "public-form"`, `values` contains all four filled fields. Form route then renders `public-form-thanks` confirmation.

### B-2202 — Public form conditional logic honored on equals/is-empty operators (P3, info — extends B-2101)
- Steps: edit `views[v_form].conditionalLogic = [{ifPropertyId:"p_dn", operator:"equals", value:42, showPropertyIds:["p_dms"]}]` → reload `/form/db_dates_test/v_form` → type "42" into `p_dn`.
- Observed: `p_dms` field appears live (without re-mount). Also verified `is-empty` operator: rule `{ifPropertyId:"p_dt", operator:"is-empty", showPropertyIds:["p_dms"]}` initially shows `p_dms` (title empty) and hides it after typing "hello".

### B-2203 — Conditional-logic operators `greaterThan` / `contains` are silently no-ops (P2, fixed)
- File: src/routes/form.$dbId.$viewId.tsx lines 72-75.
- Steps: set rule `{operator:"greaterThan", value:50}` then type "60" into `p_dn`. Set `{operator:"contains", value:"admin"}` then type "admin test" into `p_dt`.
- Observed: neither rule fires; only `equals`, `not-equals`, `is-empty`, `is-not-empty` are implemented. Schema documents more operators (or the in-app form-rule editor lets you select them), but at runtime they are dropped without warning. Either add the operators or reject unknown ones at save time.

### B-2204 — Public form for a non-form view 404s correctly (P3, info)
- Steps: visit `/form/db_dates_test/v_dates_list` (real db, real view, but type="list") and `/form/db_not_exists/v_x`.
- Observed: both render the "Form not found / This form may have been removed or the link is wrong / Go home" empty state. Good.

### B-2205 — Sub-page markdown export resolves linked page title + icon (P3, info — fixes B-1717)
- Steps: `pageToMarkdown(pg_export_misc, blocks, pages)` where `blk_export_sub` is `type:"sub-page", pageId:"pg_export_subpage"`.
- Observed: output contains `🌱 [Sub Child](/app/p/pg_export_subpage)` — icon from the target page, title from the target page, link to /app route. Resolves I-1707.

### B-2206 — Sub-page export with missing target page emits generic "Sub-page" link (P3, info)
- Steps: synth block `{type:"sub-page", pageId:"pg_does_not_exist"}` → markdown export.
- Observed: line becomes `📄 [Sub-page](/app/p/pg_does_not_exist)` — graceful fallback but the link is dead. Acceptable; would be nicer to either skip or annotate "(missing)".

### B-2207 — Empty-URL image block silently dropped from markdown (P3, fixed)
- Steps: `pageToMarkdown(pg_edge_export, ...)` where `b_img_empty` has `url:""`.
- Observed: image block produces 0 output. No placeholder, no `<!-- image -->`. With a valid url ("Complex Export Test" page) export emits `![](https://placekitten.com/200)` correctly. Probably intentional but worth noting — a partially-filled image block round-trip is destructive.

### B-2208 — Public form `BigForm` renders all 32 field types and submission persists (P3, info)
- Steps: visit `/form/db_bigform/v_bf_form` → 32 `public-form-field-p_big_*` testids appear; each input/select/checkbox-button matches the property type (text, number, select, multi-select, date, checkbox, url, email, tel, status). Fill 9 fields + one multi-select option → submit.
- Observed: new row appears in `rows` with `databaseId: "db_bigform"`, `createdBy: "public-form"`, and `values` keyed by all filled props including the multi-select as an array `["o1"]`. Row count went 11 → 12.

### B-2209 — Public form checkbox `onChange` driven by React synthetic; programmatic dispatch isn't recorded (P3, info)
- Steps: in B-2208 toggled `p_big_5` checkbox via `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'checked').set(el, true)` + `dispatchEvent(new Event('change'))`.
- Observed: server-side row is missing `p_big_5: true`. The other inputs respond to the same synthetic-event recipe; checkbox seems to require React's synthetic-event path (no `onClick` handler attached). Manual user click is unaffected. Minor automation/QA gotcha; not a real-user bug.

### B-2210 — Inbox `Mark as read` resolves the comment but the row stays until a manual reload (P2, fixed)
- Steps: `/app/inbox` with an unresolved comment → click `inbox-resolve-cmt_<id>`.
- Observed: localStorage `comments[*].resolved` flips to `true`, but the inbox list does NOT re-render — the row is still visible. After full page reload the list shows "All caught up! ✨". Likely a useStore selector missing `comments` dependency or `Inbox.tsx` reading from a stale closure.

### B-2211 — useEffect dep-array size warning still fires on page load (P2, open — extends B-2110)
- Steps: open any `/app/p/<pageId>` with rich content (Meeting notes, Misc Export, etc.) → check console.
- Observed: 8+ consecutive `Warning: The final argument passed to %s changed size between renders. ... useEffect [[object Object], [object Object]] [[object Object], [object Object], [object Object]]` errors on the very first paint. Going 2 → 3 deps. No tests around the source effect; React 19 will turn this into a hard runtime error.

### B-2212 — TanStack notFoundComponent missing on `/app` route (P3, info)
- Steps: any in-app navigation that resolves to `/app` not-found path (observed during reload of a deleted page).
- Observed: console emits `Warning: A notFoundError was encountered on the route with ID "/app", but a notFoundComponent option was not configured, nor was a router level defaultNotFoundComponent configured. Consider configuring at least one of these...`. Fix is one-line: pass `notFoundComponent` to `createRoute`.

### B-2213 — Sidebar page rows still have no drag affordance (P2, open — extends B-2106)
- Steps: `/app` → query `aside [draggable="true"]`.
- Observed: 0 draggable elements. Sidebar rows (`expand-pg_*`, `page-menu-pg_*`, `page-new-pg_*`) are click-only. No HTML5 DnD wiring, no DnD library import in `Sidebar.tsx`. Notion's most-used drag target is still inaccessible.

### B-2214 — Database table rows still have no drag handle (P2, open — extends B-2105)
- Steps: visit `pg_mp33cd7d01u4huok` → inspect first `tbody tr` of the table view (4 rows).
- Observed: 0 cells with `draggable="true"`, 0 `data-reorder-*` attributes, no row-handle testid. `rows.order` cannot be changed via UI today.

### B-2215 — Calendar week-view event chip still not draggable (P2, open — extends B-2107)
- Steps: `/app/calendar` → switch `main select` to "week" → inspect `[data-testid="week-day-2026-05-13"]`.
- Observed: the colored chip `<div>` ("Wed event") inside the day cell has no `draggable` attribute. 7 week-day cells render, 1 event chip; no drag handlers in the WeekStrip path.

### B-2216 — Comment-input has no reply / thread testids; data model lacks threading (P2, fixed)
- Steps: open `comments-btn` panel on any page; query `[data-testid*="comment"]`. Examine `localStorage.comments[*]`.
- Observed: only `comment-input`, `post-comment`, `close-comments`, `comments-btn`. All `comments[*]` rows have `parentId: null` and there is no `threadId` field. Source: `src/components/page/PageComments.tsx` has no `parentId` references. Threaded replies still unimplemented (last batches B-2050+).

### B-2217 — AI chat still returns templated pseudo-answers; no LLM, no markdown rendering (P2, open — extends B-2109)
- Steps: open `sidebar-ai` → type "python code" → `ai-send`.
- Observed: response is the search-result template `Based on your workspace, here's what I found about "python code": 1. **Edge Export** — ⚠️ (relevance 1) ...`. Submitting "```python\\nprint(1)\\n```" also produces template output; no fenced-code-block parsing, no `<pre>` element in the rendered chat.

### B-2218 — Public form does not persist sub-page / block content of the submitted row (P3, info)
- Steps: B-2201 / B-2208 — inspect newly-created row.
- Observed: `row.blocks = []` even though the host db has rows whose `blocks` array contains text blocks for inline expansion. Acceptable for now — public submission is "values only" — but worth mentioning if forms ever support a "comments / description" field.

### B-2219 — Calendar event chip lives only in `calendarEvents`, not synced to rows of a date-bound db (P3, info)
- Steps: `t.calendarEvents` has 3 entries; `t.databases.db_dates_test.views[v_dates_cal]` is a calendar view, but its rows are NOT shown on `/app/calendar` either.
- Observed: `/app/calendar` only renders `calendarEvents.*` items. Database-driven calendar events should also appear; today there are two parallel sources (`calendarEvents` and db-row date columns) with no merge, breaking the "Two-way synced with database date properties" tagline shown atop the page.

### B-2220 — Breadcrumb chrome IS present (revises B-2114) (P3, info)
- Steps: open `/app/p/pg_export_subpage` (sub-page of `pg_export_misc`).
- Observed: `<TopBar>` renders `[data-testid="breadcrumbs"]` with `breadcrumb-pg_export_misc → breadcrumb-pg_export_subpage` linked. Earlier B-2114 was wrong — the breadcrumb component does exist; what's missing is rendering ABOVE the page title (it's only in the top bar, which the prior tester missed). Closes that aspect of B-2114 / I-2111.

### B-2221 — Board card drag between groups WORKS end-to-end (P3, info)
- Steps: `db_a` board view → grab `board-card-r_a1` (group `g_a`) → drop onto `g_b` column → synthetic dragstart/dragover/drop with `text/x-row-id` payload.
- Observed: `rows.r_a1.values.p_grp` updated from `"g_a"` → `"g_b"` in localStorage. Source `BoardView.tsx:46-53` reads `text/x-row-id` from dataTransfer and writes via `updateRow`. The relevant DnD interaction works for board view (only).

### B-2222 — Trash → Restore round-trip works (P3, info)
- Steps: `/app/p/<id>` → `page-options` → `page-opt-trash` → `/app/trash` → `restore-<id>`.
- Observed: `pages[<id>].isInTrash` flips `false → true → false`. Trash list shows `📄 1:1 agenda` with timestamp "Trashed 13/05/2026 02:12:06", plus `restore-<id>` and `delete-forever-<id>` buttons.

### B-2223 — Database table view renders 803 rows un-virtualized (P2, open, extends I-2012)
- Steps: open `pg_perf500_test` → switch to db_a Main view (`db-view-v_a`).
- Observed: `table tbody tr` count is 803. No virtualization, no pagination. Combined with sidebar's 30 page rows + 1037 board draggables on a sibling view, the page maintains noticeable input lag for slash menu open/close.

### B-2224 — Page-options menu has `page-opt-trash` but no `page-opt-publish` / `page-opt-duplicate` testids (P3, info)
- Steps: open page-options popover and inspect testids.
- Observed: only `page-opt-trash`. Publish, duplicate, move-to, copy-link etc. either live on separate buttons (`share-btn` for publish) or have no QA hook. Document for the next test pass.

### B-2225 — Formula property cell prints `#ERR: Unexpected token +` literally (P3, info)
- Steps: db_a property `p_fx` has `expression: "1 + +"` (malformed). View row in table.
- Observed: cell shows `#ERR: Unexpected token +` on every row (×803). Error mode is appropriate but the formula editor should let the user see a parser error inline rather than only in the cell.

### B-2226 — Chart view "line" type renders correctly (P3, info)
- Steps: db_a chart view → `chart-type-v_a_chart` → "line".
- Observed: a `<svg class="recharts-surface">` with `g.recharts-cartesian-grid` + polyline ↗ path rendered cleanly. Donut, bar, line all functional. Chart UI is solid.

## 2026-05-13 02:35 — Test agent batch 25

### B-2400 — Comment threading wired end-to-end (P2, fixed — closes B-2216) (info)
- File: src/components/page/PageComments.tsx lines 12-114.
- Steps: open `/app/p/pg_mp349of8lvv9kk0m` → `comments-btn` → post `Top-level comment for threading test` via `comment-input` + `post-comment`. Click `reply-cmt_<id>` button on the new comment row → `reply-input-cmt_<id>` textarea appears → type `This is a child reply` → click `reply-submit-cmt_<id>`.
- Observed: child comment row saved to `comments` with `parentId: cmt_<parentId>`, `resolved:false`. UI renders `reply-row-cmt_<childId>` nested under the parent. localStorage confirmed `{id:"cmt_mp3brkgorfagvv78", parentId:"cmt_mp3breeekodbyvwk", content:"This is a child reply"}`. Top-level resolve / reply / reply-row testids all exist.

### B-2401 — AI assistant renders fenced code block as `<pre><code>` when prompt mentions "code" (P2, fixed — closes B-2217) (info)
- File: hint in AI assistant render path; observed downstream.
- Steps: `/app/p/pg_mp349of8lvv9kk0m` → `sidebar-ai` → `ai-new-thread` → ai-input "show me a python code snippet" → `ai-send`.
- Observed: assistant message HTML contains `<pre class="bg-card border border-border rounded p-2 my-1 overflow-x-auto text-xs"><code class="font-mono"># adjust to your data\nprint('found ' + str(${matches.length}) + ' results')\n</code></pre>`. Both `pre` and `code` elements present.

### B-2402 — AI fenced block only fires when the user prompt contains the literal token "code" (P3, info)
- Same test setup as B-2401.
- Steps: send prompt `hello world response` after the threading test → message rendered with no `<pre>` element, just the "Based on your workspace…" search template.
- Observed: code-block emission appears prompt-keyword-gated rather than driven by detecting actual code in the (still-templated) response. Acceptable, but if the AI ever returns real fenced output the renderer needs to detect ```…``` markers in the text, not the prompt. Re-files as a follow-up to I-2106.

### B-2403 — AI assistant `${matches.length}` is rendered literally instead of interpolated (P2, fixed)
- Same `<pre>` block as B-2401: the code shows `print('found ' + str(${matches.length}) + ' results')`. The template author meant `${matches.length}` to be a JS template-literal substitution, but the source string uses single quotes / regular concat, so the placeholder leaks into the UI.
- Expected: either inline the actual hit count (`matches.length`) at render time, or replace with a static "N" placeholder.

### B-2404 — Resolving a parent comment hides its child replies even when child.resolved=false (P2, open)
- File: src/components/page/PageComments.tsx line 18 + 24-25.
- Steps: after B-2400, click `resolve-cmt_mp3breeekodbyvwk` (parent). With `showResolved=false` (default), the parent row disappears AND `reply-row-cmt_mp3brkgorfagvv78` also disappears. The child's `resolved` flag in localStorage is still `false` though.
- Expected: either cascade-resolve the children (set `child.resolved=true` when parent resolves) so the state is consistent, OR keep them visible as orphans. Today the child is "alive but orphaned/invisible" — when the user later toggles `showResolved`, an unresolved child re-appears nested under a resolved parent.

### B-2405 — Sidebar pages still un-draggable (P2, open — extends B-2213)
- Steps: `/app` → `aside [draggable="true"]` returns 0. 44 page-row buttons exist with no DnD wiring in `Sidebar.tsx` (lines 220-310 are only click handlers).
- Same status as last batch; no progress shipped here.

### B-2406 — Calendar week-view event chips still un-draggable (P2, open — extends B-2215)
- Steps: `/app/calendar` → switch to "week" view → 4 event chips render in week-day cells; none has `draggable="true"`. Drag-to-move of events still unsupported.

### B-2407 — Database table rows still un-draggable (P2, open — extends B-2214)
- Steps: `/app/p/pg_mp33cd7d01u4huok` table view → 4 `<tbody><tr>` rows, none has `draggable` attribute, no `row-handle-*` testid. `rows.order` cannot be changed via UI.

### B-2408 — Gallery cards are not draggable for reorder (P2, open)
- Steps: db_dates_test gallery view → 7 `gallery-card-r_<id>` cards rendered; `card.draggable === false` for every card. Notion gallery supports drag-to-reorder; this app does not.

### B-2409 — No "Move to teamspace" action anywhere in the page-menu (P2, fixed)
- Files: `src/components/layout/Sidebar.tsx:218-310`, `src/components/page/PageView.tsx` (page-options popover).
- Steps: sidebar `page-menu-pg_<id>` exposes `pmenu-favorite`, `pmenu-duplicate`, `pmenu-newsub`, `pmenu-copylink`, `pmenu-trash`. The chrome `page-options` popover exposes `page-opt-favorite`, `page-opt-duplicate`, `page-opt-wiki`, `page-opt-wordcount`, `page-opt-copylink`, `page-opt-export-md`, `page-opt-print`, `page-opt-trash`.
- Observed: no `move-to`, `change-teamspace`, or similar. Pages are pinned to their original teamspaceId for life; the data model supports the operation (`pages[id].teamspaceId`), but no UI surfaces it. With 3 teamspaces in seed data (`Private`, `Engineering`, `Shared`) this is a notable gap.

### B-2410 — Database view tabs lack row-count badges (P3, fixed)
- Steps: open `/app/p/pg_mp33cd7d01u4huok` → inspect `[data-testid^="db-view-"]` tabs.
- Observed: tab text is just `▦ Main`, `🧾 Form`, `≣ List`, `▢ Gallery`, `📅 Calendar`, `⇆ Timeline`. No count next to the name (Notion shows e.g. `Main · 7`). With per-view filters/sorts, the count would help — verified `db_dates_test` Main view filter `Tags contains blue` cuts 7 rows → 4 with no visible indication that filtering is active.

### B-2411 — Synced-block-ref pages render the mirrored content correctly (P3, info)
- Steps: `/app/p/pg_mp36yevcqwbxc3v0` (OKRs) — page has 54 `synced-block-ref` rows referencing source `blk_mp33cd7dvdil4mjz` / `blk_mp33cd7dwqtkopvq`.
- Observed: 50 `synced-ref-blk_<id>` containers rendered, each showing the source's current children including the live-updated text `LIVE-MIRROR-1778627431314`. Source block also rendered with `synced-source-*` testid. Synced-block path works.

### B-2412 — Public form submission round-trip succeeds (P3, info — closes B-2209 with a real click)
- Steps: `/form/db_bigform/v_bf_form` → 32 fields → fill text `p_big_0` and toggle the actual `<input type="checkbox">` inside `public-form-field-p_big_5` via `.click()` (NOT programmatic descriptor) → `public-form-submit`.
- Observed: db_bigform row count 13 → 14. New row `row_mp3bukh5bhzp` carries `values:{p_big_0:"Form submission test batch 25", p_big_5:true}`, `createdBy:"public-form"`. Checkbox is recorded when toggled via real click — B-2209 was an automation gotcha only.

### B-2413 — Public form `/form/<dbId>/<viewIndex>` 404s; only `/form/<dbId>/<viewId>` works (P3, info — clarifies B-2200)
- Steps: visit `/form/db_bigform/0` (using the view's array index `0`) → "Form not found" empty state. Visit `/form/db_bigform/v_bf_form` (using `view.id`) → renders the 32-field form.
- Observed: the public-form route requires the literal `view.id` string, not the position. Users who guess the URL from the view tabs (which have no exposed id) won't get the right link. Together with `share-btn → Copy form link` (cf. I-2100), this is the main UX risk for forms.

### B-2414 — Command palette has comprehensive testids but no `role="dialog"` (P3, info — extends I-2109)
- Steps: `sidebar-search` click → palette opens with `cmd-new-page`, `cmd-calendar`, `cmd-mail`, `cmd-inbox`, `cmd-trash`, `cmd-settings`, `cmd-dark-mode`, `cmd-ai`, plus `cmd-page-pg_<id>` for each page. Typing "meeting" filters down to 5 results. Esc closes the palette.
- Observed: no `[role="dialog"]`, no `[cmdk-root]` / `[cmdk-input]` testids. Functionally great, screen-reader announcement is poor.

### B-2415 — Trash delete-forever immediately removes the page (P3, info)
- Steps: trash a new template-created page → `/app/trash` → click `delete-forever-pg_<id>`.
- Observed: `pages[id]` deleted from localStorage without an explicit confirmation modal (we auto-stubbed `window.confirm = () => true`; the source likely uses the native one). UX note: with no in-app confirm dialog, automation tests that mock `confirm` lose the modal entirely. Acceptable given the trash gate, but worth noting for I-2215-style coverage.

### B-2416 — Templates panel — Decision log (ADR) template instantiates a new page (P3, info)
- Steps: `sidebar-templates` → `template-decision-log-adr`.
- Observed: page count 21 → 22; new page `Decision log (ADR)` opened, fully populated with the template's blocks. All 8 listed templates (`template-meeting-notes`, `…-project-brief`, `…-daily-journal`, `…-reading-list`, `…-okrs`, `…-runbook`, `…-decision-log-adr`, `…-1-1-agenda`) are wired.

### B-2417 — Filter cuts visible row count from 7 → 4 with no on-screen indicator (P3, info — extends B-2410)
- Steps: `db_dates_test` has 7 rows total. Main table view has filter `Tags contains blue` → 4 rows render. No `filter-active-*` badge, no row count, no "filtered" label.
- Expected: a visible badge "Filtered (4 of 7)" or row count "7" / "4" next to the view name.

### B-2418 — Timeline view renders 360 bars for a 7-row database (P2, open)
- Steps: `db_dates_test` → `db-view-v_dates_tl`.
- Observed: 360 `[data-testid^="timeline-bar-"]` (likely one per day in the visible range × 7 rows). Reasonable for an empty Gantt grid but performance impact when many DBs render in one page; consider virtualizing the day cells.

### B-2419 — AI assistant returns templated workspace-search response, not real LLM (P2, open — confirms B-2217 still applies)
- Steps: prompts "hello world response" and "show me a python code snippet" → both produce the `Based on your workspace, here's what I found about "<query>": 1. <strong>X</strong> — icon (relevance N)…` template.
- Observed: same as B-2217; the markdown-code-block path (B-2401) is a band-aid that injects a python `print()` template when "code" is in the query.

## 2026-05-13 04:50 — Test agent batch 26

### B-2500 — AI code snippet renders the real `{matches.length}` value (P2, fixed — closes B-2403)
- File: AI assistant render path.
- Steps: `/app/p/pg_mp33cd7d01u4huok` → `sidebar-ai` → `ai-new-thread` → input "show me python code" → `ai-send`.
- Observed: assistant message contains `<pre>` with `print(f'found {3} results')` — the `${matches.length}` template-literal leak is gone and the real workspace-hit count is substituted (3 hits in this run). Now uses Python f-string syntax.

### B-2501 — `page-opt-move-<teamspaceId>` items added to page-options menu and work end-to-end (P2, fixed — closes B-2409)
- File: page-options popover in `PageView`.
- Steps: `/app/p/pg_mp33cd7d01u4huok` → `page-options` → menu now lists 3 extra rows: `page-opt-move-ts_mp33cd7d0vluy2hb` (🔒 Private), `page-opt-move-ts_mp33cd7d93hf4pw9` (⚙️ Engineering), `page-opt-move-ts_mp33cd7dj3ceg3gi` (🤝 Shared).
- Observed: clicking `page-opt-move-ts_mp33cd7d93hf4pw9` flips `pages["pg_mp33cd7d01u4huok"].teamspaceId` from `ts_mp33cd7d0vluy2hb` → `ts_mp33cd7d93hf4pw9` in localStorage. UI sidebar also re-groups under Engineering immediately.

### B-2502 — `db-view-count-<viewId>` badges added on view tabs; show "N" or "K/N" when filtered (P3, fixed — closes B-2410 / B-2417)
- File: database view-tab strip.
- Steps: `db_dates_test` → 7 rows total; Main view (`v_dates_test`) has filter "Tags contains blue" cutting to 3 rows.
- Observed: tab text now `▦ Main` + `3/7` for the filtered view; the other 5 views render `7` (no filter). All 6 views expose `db-view-count-v_<id>` testids. Filter-active state is now visible at a glance.

### B-2503 — XSS via raw HTML in text-block `content` (P0, fixed) — critical
- Files: text-block renderer (uses `innerHTML`/`dangerouslySetInnerHTML` instead of escaping). Demonstrable on `pg_edge_export` block `b_text_html`.
- Steps: set `blocks["b_text_html"].content = '<img src=x onerror="window.__XSS_TRIGGERED=1">PAYLOAD'` in localStorage → reload `/app/p/pg_edge_export`.
- Observed: rendered DOM contains `<img src="x" onerror="window.__XSS_TRIGGERED=1">PAYLOAD` and `window.__XSS_TRIGGERED` evaluates to `1` (handler fired). Any user typing HTML in a text block (or whose content syncs across collaborators) can run arbitrary JS in another user's session. Sanitize at render time (`dompurify` or simple text-only render with whitelisted `<b>/<i>/<s>/<code>/<a>` produced by the toolbar).

### B-2504 — Synced source block does NOT render its own `content` field; only its children render (P2, open)
- File: synced-block source render path.
- Steps: `blocks["blk_mp33cd7dwqtkopvq"]` is `type:"synced-block"` with `content:"UPDATED 1778626232897"` and one child `blk_syncedchild_1778627070687`. Visit `/app/p/pg_mp33cd7d01u4huok`.
- Observed: `[data-testid="synced-source-blk_mp33cd7dwqtkopvq"]` shows only `"SYNCED BLOCK (SOURCE)\ncopy id\nLIVE-MIRROR-1778627431314"` — the child's `content` field renders, but the source block's own `content` "UPDATED 1778626232897" is invisible. Either drop the field at the data layer or render it (Notion synced source can hold inline text). 0 `synced-ref-blk_mp33cd7dwqtkopvq` mirror containers were also found when visiting the page that uses it as a source — refs may have been re-keyed.

### B-2505 — AI markdown rendering: bullet/numbered lists do NOT render as `<ul>`/`<ol>` (P2, open — extends B-2402)
- Steps: `sidebar-ai` → `ai-new-thread` → send `- first\n- second\n- third bullet list`.
- Observed: response keeps the `- ` markers in plain `whitespace-pre-wrap` text; no `<ul>`/`<ol>` is emitted. Same for numbered lists (assistant's own response uses `1. **X** — …` and renders the digit literally, not as `<li>`).

### B-2506 — AI markdown: `_underscore italic_` does not render as `<em>` (P3, open — extends B-2505)
- Steps: send `tell me with *italic* and _underscore italic_ words`.
- Observed: `*italic*` → `<em>italic</em>` (works). `_underscore italic_` → rendered literally with `_` characters. Underscore-flavoured emphasis is unsupported.

### B-2507 — Real-time collab via `storage` event does NOT refresh page title (P2, open)
- Steps: in one tab, mutate `state.pages[pageId].title` in localStorage then dispatch `new StorageEvent("storage", {...})` (simulates other tab writing). Re-check `[data-testid="page-title"]` and sidebar row.
- Observed: localStorage value updates but UI does not re-render. Page title and sidebar still show old text. Zustand `persist` middleware is not subscribing to cross-tab `storage` events, so opening two tabs of the same workspace yields stale views until manual reload. Either enable `persist`'s cross-tab sync or manually `window.addEventListener("storage", rehydrate)`.

### B-2508 — Sidebar pages still un-draggable (P2, open — extends B-2405 / B-2213)
- Steps: `/app` → query `aside [draggable="true"]` → 0 elements; 22 sidebar rows are click-only.
- Observed: no progress this batch. Pages cannot be reordered or re-parented via DnD.

### B-2509 — Calendar week-view event chips still un-draggable AND empty (P2, open — extends B-2406)
- Steps: `/app/calendar` → switch select to `week` → 7 `week-day-2026-05-1X` cells render, **0** event chips appear (the 3 `calendarEvents` rows have no `.date` field, so they cannot be placed on any day).
- Observed: even ignoring drag, the week-view shows no events at all because all events were created without a `date` value. Defect compounds: data-shape gap + missing DnD.

### B-2510 — Database table rows still un-draggable (P2, open — extends B-2407)
- Steps: `/app/p/pg_mp33cd7d01u4huok` → db_dates_test table view → `tbody tr` count 4; 0 `tr[draggable="true"]`, 0 `row-handle-*`.
- Observed: no row reorder UX.

### B-2511 — Gallery cards still un-draggable (P2, open — extends B-2408)
- Steps: `db_dates_test` gallery view → 7 `gallery-card-*` cards; `.draggable === false` for every one.
- Observed: same as last batch.

### B-2512 — Slash menu still gated on physical keystroke (P2, open — extends B-2020)
- Steps: focus a `[contenteditable="true"]` element → dispatch `KeyboardEvent('keydown', {key:'/'})` and `document.execCommand('insertText','/')`.
- Observed: `[data-testid="slash-menu"]` does NOT appear. Programmatic keystrokes can't open the menu, blocking E2E coverage.

### B-2513 — Inline-formatting toolbar present, but Bold button click does nothing (P2, open)
- Files: `InlineToolbar` (recent commit "Add inline formatting toolbar"). Buttons: `ib-bold`, `ib-italic`, `ib-strike`, `ib-code`, `ib-link`, `ib-color`, `ib-ai`.
- Steps: on `/app/p/pg_mp349of8lvv9kk0m`, programmatically set a selection of 3 chars on the H1 contenteditable; the toolbar appears at `(281, 128)` (visible). Click `[data-testid="ib-bold"]`.
- Observed: block `innerHTML` is unchanged (`"/Meeting notes"` before and after); no `<strong>` wrapper added. Either the toolbar's bold handler relies on `document.execCommand("bold")` (deprecated, requires non-collapsed Selection at click time and DOM focus the click consumes) or the selection is lost when the toolbar gains focus. Toolbar UI exists but does not actually wrap selection in formatting.

### B-2514 — Public form `<select>` for select-type properties uses `option.value=<id>`; if the form is filled via API/automation, name-based fills silently drop (P3, info)
- Steps: 32-field submission test. Setting `select.value = "Red"` (option name) leaves it at empty string; setting `select.value = "o1"` (option id) works.
- Observed: `p_big_2, _9, _12, _19, _22, _29` (all 6 select fields) submitted as `""` despite "filled" automation, while same-batch multi-selects (`o1` button click) succeeded. Documenting because batch-25's earlier "form submit works" report did not exercise selects. Real users see correct UI (option text); only programmatic fills are affected.

### B-2515 — Edge-export page only renders 2 of 9 blocks (image, video, table, button, code, ToC, breadcrumb missing) (P2, open)
- Steps: `/app/p/pg_edge_export` → page has 9 blocks per store; only `b_callout_no_emoji` and `b_text_html` produce a `block-content-*` element. `[data-testid="plus-b_<id>"]` wrappers exist for the missing 7, but their renderers emit no inner content.
- Observed: empty image / video / table / button / ToC / breadcrumb / code-no-lang blocks render only the `+ Add block` plus-button row with no body. No fallback "Image" placeholder, no empty-state. Users see "phantom" blocks they cannot interact with.

### B-2516 — Settings page has only 3 testids (P3, info)
- Steps: `/app/settings`.
- Observed: `settings-signout`, `settings-darkmode`, `settings-export`. No `settings-workspace`, `settings-profile`, `settings-billing`, `settings-language`, etc. Surface is sparse; appropriate for an MVP but flag for roadmap.

### B-2517 — AI link parser leaves trailing `)` and rewrites disallowed URLs to `#` (P3, info — safe behavior)
- Steps: send `[XSS](javascript:alert(1))` to AI.
- Observed: rendered HTML emits `<a href="#" ...>XSS</a>)` — `javascript:` URL is correctly rejected (escaped to `#`), preventing XSS. But the trailing closing-paren character is leaked into the body, and there's no visible UI hint that the link was disabled. Acceptable but not great.

### B-2518 — AI input is HTML-escaped before quoting (P3, info — good)
- Steps: send `<img src=x onerror="window.__AI_XSS=1">`.
- Observed: response contains `&lt;img src=x onerror="window.__AI_XSS=1"&gt;`; `window.__AI_XSS` stays at `0`. AI assistant's prompt-echo is safe (contrast with B-2503 block render which is unsafe).

### B-2519 — Inbox refresh on resolve works (P3, info — closes B-2210 / I-2201)
- Steps: `/app/inbox` shows `inbox-resolve-cmt_mp3brkgorfagvv78` from prior batch's threaded reply. Click it.
- Observed: row disappears from the DOM immediately; `comments["cmt_mp3brkgorfagvv78"].resolved` flips to `true` in localStorage. No reload needed — the regression in B-2210 is gone.

### B-2520 — Command palette still lacks `role="dialog"` (P3, open — confirms B-2414 still applies)
- Steps: open command palette via `[data-testid="sidebar-search"]`.
- Observed: 8 base `cmd-*` items render; no `role="dialog"`, no `aria-modal`. Same status as batch 25.

### B-2521 — Public-form select value persistence works at user-level but stores option IDs (not names) (P3, info)
- Same submission as B-2514 / B-2412. Server-side stored `values.p_big_3 = ["o1"]` for multi-select and `values.p_big_2 = "o1"` (when filled correctly by clicking the actual option) → opening the row in the table renders the colored "Red" chip correctly.
- Observed: data model uses option IDs, UI maps to names — consistent with Notion. Documenting because it interacts with the export path (CSV export of "o1" instead of "Red" if the exporter doesn't dereference).

### B-2522 — Persisted `state` not split per workspace (P3, info)
- Steps: `Object.keys(localStorage)` shows 10 `notion-clone:user:<uuid>` keys (multiple test accounts), each carrying a full `{pages, blocks, databases, rows, ...}` snapshot. Switching the auth token loads the right one.
- Observed: per-user persistence is fine, but no per-workspace persist key — if a user has multiple workspaces, the entire `workspaces` map lives in one blob. Minor scaling concern.



## 2026-05-13 01:10 — Test agent batch 27

### B-2600 — XSS guard for text-block content holds against `<img>`, `<svg>`, `<iframe>`, `javascript:` (P0, fixed — closes B-2503) — verified
- Steps: set `blocks["b_text_html"].content = '<img src=x onerror="window.__XSS__=1">PAYLOAD_TEST'` → reload `/app/p/pg_edge_export`; also tried `<svg onload="…">`, `<iframe src="javascript:…">`, and `<a href="javascript:…">`.
- Observed: rendered DOM contains only `PAYLOAD_TEST` (img/svg/iframe stripped). `<a>` retained but `href` attribute removed. `window.__XSS__`, `__XSS_SVG__`, `__XSS_HREF__`, `__XSS_IFR__` all remain `undefined`. Sanitizer is now in place at render time.

### B-2601 — AI markdown lists now render as `<ol>`/`<ul>` and `_underscore_` becomes `<em>` (P2, fixed — closes B-2505 / B-2506) — verified
- Steps: send "give me 3 bullet steps for python code" → response has `<ol class="list-decimal">` with three `<li>`s plus a `<pre>` code block (real python f-string). Send `[v](vbscript:alert(1)) [f](file:///etc/passwd) [c](https://safe.example.com)` → response renders `<ul class="list-disc">` for ideas list. Send `repeat back _italic_ and *star italic*` → two `<em>` elements with correct text.
- Observed: list rendering and italic parsing both fixed in `AIChat.tsx`. Code path: `tokenRe` regex now handles `_x_` AND `*x*` AND `__x__` AND `**x**`.

### B-2602 — AI link parser rewrites `vbscript:`, `file:`, `data:` to `#` (P3, info — confirms B-2517 still applies)
- Steps: send `[v](vbscript:alert(1)) and [f](file:///etc/passwd) plus [c](https://safe.example.com)`.
- Observed: rendered links — `v` → `href="#"`, `f` → `href="#"`, `c` → `href="https://safe.example.com"`. Safe. Trailing `)` characters still leak into body (B-2517).

### B-2603 — Block drag handles now exist on every page block (P2, fixed — closes I-2505) — verified
- Steps: `/app/p/pg_mp349of8lvv9kk0m` → `[data-testid^="handle-"]` returns 9 cursor-grab handles (one per block). Fire `dragstart` on `handle-blk_mp349of9q9vilh1g`, `dragover` + `drop` on `handle-blk_mp349of9r46xq8h4` (position 2). Re-read `pages.pg_mp349of8lvv9kk0m.blocks` from localStorage.
- Observed: order changed — `blk_mp349of9q9vilh1g` moved from index 0 to index 2; other blocks shifted up. DnD reorder works.

### B-2604 — Block-level edge-export blocks now render real UI (image/video/table/button/code/ToC/breadcrumb) (P2, fixed — closes B-2515)
- Steps: `/app/p/pg_edge_export` → inspect each block's `outerHTML`.
- Observed: `b_img_empty` → "Add image / Embed" placeholder. `b_video_empty` → "Add video / Embed". `b_table_empty` → "+ Row / + Column" controls. `b_button` → "🎯 Click me" rendered button. `b_code_no_lang` → language picker (javascript, typescript, …, plain text) + Copy + `x = 1` content. `b_toc` → "Table of contents / No headings yet" (and on a page with headings, lists them: "Untitled heading / Agenda / Decisions / Action items"). `b_breadcrumb` → "⚠️ Edge Export" (current page). Note: `block-content-<id>` testid is still absent for these block types — they expose `data-block-id` and `data-block-type` attrs instead.

### B-2605 — Inline-toolbar `ib-italic`, `ib-strike`, `ib-code`, `ib-color-*` actually mutate the selection now (P2, fixed — closes I-2506 partially)
- Steps: select 3 chars on a `[contenteditable="true"]` block; fire `mousedown` on `ib-italic` → block HTML becomes `Meeting <i>notes</i>`. `ib-strike` → `<strike>Hello</strike> world testing`. `ib-code` → `plain <code class="bg-muted px-1 rounded text-xs font-mono">code</code> text`. `ib-color-red` → `<font color="#dc2626">colorf</font>ul text`.
- Observed: italic / strike / code / color all work. Toolbar uses `mousedown` event so selection is preserved.

### B-2606 — Inline-toolbar `ib-bold` still inverts to `font-weight:normal` instead of bold (P2, open — partial regression of B-2513)
- Steps: select "Meeting" (chars 0–7) on an unbolded H1 `[contenteditable="true"]` block, fire `mousedown` on `[data-testid="ib-bold"]`.
- Observed: block HTML becomes `<span style="font-weight: normal;">Meeting</span> notes` — not `<strong>Meeting</strong>` or `<b>Meeting</b>`. The current toggle logic appears to read computed style (which inherits from H1's `font-weight: bold`), decides the selection IS bold, and emits the "un-bold" branch. Other 3 buttons (italic/strike/code) don't have this issue because their default state is "off".

### B-2607 — Inline-toolbar `ib-link` does nothing (P2, open — extends I-2506)
- Steps: select 5 chars, fire `mousedown` on `[data-testid="ib-link"]`.
- Observed: no link-input popover appears. Block HTML unchanged ("click here"). No `link-popover` or `ib-link-input` testid in DOM. Feature wired up visually but no handler / popover.

### B-2608 — Inline-toolbar `ib-ai` does nothing (P3, fixed)
- Steps: select text, mousedown on `[data-testid="ib-ai"]`.
- Observed: no popover, no inline-AI panel, no Improve/Translate/Summarize menu. Button is decorative.

### B-2609 — Slash menu now opens via programmatic `/` insertion (P2, fixed — closes B-2512) — verified
- Steps: focus a `[contenteditable="true"]` block, fire `keydown { key: '/' }`, then `execCommand('insertText', '/')`, then `input` event.
- Observed: `[data-testid="slash-menu"]` appears with full block-type list — `slash-text`, `slash-h1`, `slash-h2`, `slash-h3`, `slash-bulleted-list`, `slash-numbered-list`, `slash-todo`, `slash-toggle`, `slash-quote`, `slash-divider`, `slash-callout`, `slash-page`, `slash-code`, plus toggle-headings. Menu trigger works via either real keystroke or programmatic input dispatch. Closes E2E gap.

### B-2610 — Calendar week view now renders chips for events whose `start` is in the visible week (P2, fixed — closes B-2509 partially)
- Steps: `/app/calendar` → select=week. The 3 seeded `calendarEvents` rows have `start` timestamps 2026-05-12 / 13 / 15.
- Observed: `week-day-2026-05-12` shows "Test event B21"; `week-day-2026-05-13` shows "Wed event" + an "Untitled" db-row; `week-day-2026-05-15` shows "Test Cal Event Batch 15"; `week-day-2026-05-14` shows "Untitled". Renderer is using `e.start` as the date key now (not a missing `e.date` field) — bug B-2509's premise was incorrect. Chips still un-draggable (B-2611).

### B-2611 — Calendar week-event chips still un-draggable AND no `[data-testid^="week-event-"]` (P2, open — extends B-2509)
- Steps: same as B-2610 → 4 chips render but `chip.draggable === false`. No DnD; no testid prefix exposed for individual chips so E2E can't even click them to edit/delete.
- Observed: chips are plain `<div>`s with truncate styling. No drag handles, no testids, no click-to-edit affordance.

### B-2612 — Sidebar pages still un-draggable (P2, open — extends B-2508)
- Steps: `/app` → `aside [draggable="true"]` returns 0. No `sidebar-page-row-*` testid; sidebar uses `expand-/page-menu-/page-new-` triplets that don't carry `draggable`.
- Observed: no progress this batch — page reorder / re-parent via DnD still unimplemented.

### B-2613 — Database table rows still un-draggable (P2, open — extends B-2510)
- Steps: `/app/p/pg_mp33cd7d01u4huok` → table view → 0 `tr[draggable]`, 0 `row-handle-*`, 0 `row-drag-*`.
- Observed: no row reorder; only block-handle DnD exists (B-2603) and that's per-block, not per-DB-row.

### B-2614 — Gallery cards still un-draggable (P2, open — extends B-2511)
- Steps: gallery view of `db_dates_test` → 7 `gallery-card-*` cards; all have `card.draggable === false`.
- Observed: no progress.

### B-2615 — Cross-tab realtime sync still broken (P2, open — extends B-2507)
- Steps: in tab A mutate `pages.pg_mp33cd7d01u4huok.title = "CROSS_TAB_TEST_*"` in localStorage and `dispatchEvent(new StorageEvent("storage", …))`.
- Observed: `[data-testid="page-title"]` keeps showing the old title; sidebar text DOES eventually show the new title (the next time the React tree re-renders for any reason), but the active page detail does not. Half-broken.

### B-2616 — Pasted rich HTML via `execCommand('insertHTML', …)` executes `onerror` (P1, fixed) — transient XSS
- Steps: focus a `[contenteditable="true"]` block, call `document.execCommand('insertHTML', false, '<img src=x onerror="window.__INSERT_XSS__=1">')`.
- Observed: `window.__INSERT_XSS__` becomes `1` (the handler fired) and innerHTML contains the raw `<img onerror=…>`. After `blur()` and re-read of the store, the block's persisted `content` is `""` — so the XSS is NOT stored (the blur-write path strips it). But the JS already ran in the active tab. Real-world trigger: paste rich HTML copied from a malicious page into a Notion block. The paste handler does NOT sanitize at the moment of insertion; it only sanitizes at persist/render. The block's `[contenteditable]` accepts arbitrary HTML through the browser's paste pipeline + insertHTML. Mitigation: intercept `paste` and `beforeinput` to strip dangerous tags before they hit the DOM.

### B-2617 — Performance: 1500-block page loads in ~144 ms with 62 FPS scroll (P3, info — closes I-2214 partially for non-timeline use)
- Steps: seed a `pg_perf1500_test` page with 1500 plain text blocks via store mutation, then reload.
- Observed: `performance.navigation.loadEventEnd ≈ 144 ms`; `[data-block-id^="b_perf1500_"]` returns all 1500; total DOM nodes 26,093. RequestAnimationFrame test during 60×scroll yields 78 frames in 1264 ms → ~62 FPS — no jank. Typing 20 chars in the title with 1500 blocks present takes ~45 ms. No virtualization, but performance is acceptable up to this volume.

### B-2618 — Mail page renders user-provided subject/body as text (no XSS) (P3, info — good)
- Steps: compose with subject `XSS-Subject <img src=x onerror="window.__MAIL_XSS__=1">end` and body `Body with <script>window.__MAIL_BODY_XSS__=1</script> end`; send; open the message.
- Observed: subject and body display the literal angle-bracketed text; `window.__MAIL_XSS__` and `window.__MAIL_BODY_XSS__` remain `undefined`. Mail is rendered safely.

### B-2619 — Trash restore works; `restore-<pageId>` / `delete-forever-<pageId>` testids exposed (P3, info — closes I-2519 path)
- Steps: set `pages.pg_mp349of8lvv9kk0m.isInTrash = true` in localStorage, navigate `/app/trash`, click `restore-pg_mp349of8lvv9kk0m`.
- Observed: page leaves trash, store flag flips back to `false`, sidebar / page-view re-renders normally. Trash UI is functional.

### B-2620 — Templates page instantiates a new page on click (P3, info)
- Steps: `/app/templates` → `[data-testid="template-meeting-notes"]` etc. exist for all 8 templates. Click `template-meeting-notes`.
- Observed: navigates to `/app/p/pg_<new>` with title "Meeting notes" and the canonical block template. Working as expected.

### B-2621 — Cmd+K opens command palette (P3, info)
- Steps: `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true }))`.
- Observed: palette opens with 23 items: `cmd-new-page`, `cmd-calendar`, `cmd-mail`, `cmd-inbox`, `cmd-trash`, `cmd-settings`, `cmd-dark-mode`, `cmd-ai`, plus `cmd-page-*` for every page. Search input filters by typed text. Escape closes. Still no `role="dialog"` (B-2520).

### B-2622 — DB table `db-newrow` adds to store but not always visible (filter masks new row) (P3, info)
- Steps: `/app/p/pg_mp33cd7d01u4huok` (db_dates_test, filter "Tags contains blue"), click `db-newrow-db_dates_test`.
- Observed: store `databases.db_dates_test.rows.length` goes from 7 → 8 → 9 (this batch's previous "12" claim came from earlier sessions), but the rendered tbody still shows 4 (the filter excludes rows with empty Tags). Expected behavior — bug is documentation-only: there's no UI hint that the just-created row was filtered out.

### B-2623 — Settings → Export downloads full JSON (~540 KB) (P3, info — closes I-2516)
- Steps: `/app/settings` → click `settings-export`; intercept `URL.createObjectURL` and read the blob.
- Observed: exports a 540,206-byte JSON containing `workspace`, `teamspaces`, `pages`, `blocks`, `databases`, `rows`, etc. Top-level shape matches in-memory store. Works.

### B-2624 — Settings page surface unchanged (P3, open — extends B-2516)
- Steps: `/app/settings`.
- Observed: still only `settings-signout`, `settings-darkmode`, `settings-export`. No `settings-workspace`, `settings-profile`, `settings-billing`, `settings-language` rows. Same as last batch.

### B-2625 — DB column-header click only exposes "Rename"; no Sort / Filter / Hide / Delete (P3, open)
- Steps: `/app/p/pg_mp33cd7d01u4huok` → click `[data-testid="prop-header-p_dt"]` (Title column).
- Observed: opens a Rename input only. Notion-equivalent column header should offer Sort ascending/descending, Filter, Hide column, Duplicate, Delete. None present.

### B-2626 — DB `db-actions-<id>` popover empty / non-functional (P3, open)
- Steps: click `[data-testid="db-actions-db_dates_test"]` (the `⋯` button at the right of the database name row).
- Observed: no menu opens; no `[role="menu"]` or popover content appears. Button is a no-op stub.

### B-2627 — Public form select / multi-select rendering works visually (P3, info)
- Steps: `/form/db_dates_test/v_form` → main text includes "TitleWhenScoreTagsredbluegreen…".
- Observed: form lists property labels and multi-select option chips. Fillable via the standard form-fill testids (B-2412 covers automation gap).

### B-2628 — Page favorite toggle works via `pmenu-favorite-<id>` (P3, info)
- Steps: click `page-menu-pg_mp349of8lvv9kk0m`, then `pmenu-favorite-pg_mp349of8lvv9kk0m`.
- Observed: `pages.pg_mp349of8lvv9kk0m.isFavorite` flips true. Sidebar Favorites section re-renders.

### B-2629 — 25 buttons in main app lack accessible name / aria-label (P3, info — a11y)
- Steps: query all `<button>` on `/app/p/pg_mp33cd7d01u4huok` after data hydrates → 185 total; 25 have neither text content nor `aria-label` nor `title`.
- Observed: most are icon-only buttons (drag handles, plus buttons, dropdown carets). Screen readers will announce them as "button" with no purpose. Add `aria-label` per icon button.

### B-2630 — Color formatting writes deprecated `<font color="…">` (P3, info)
- Steps: select text → `ib-color-red` → block HTML becomes `<font color="#dc2626">colorf</font>ul text`.
- Observed: `<font>` is deprecated in HTML5; use `<span style="color: …">` or a class instead. Renders fine in browsers, but invalid HTML.


## 2026-05-13 12:00 — Test agent batch 28

### B-2700 — Paste-XSS now blocked: `<img onerror>`, `<svg onload>`, `<iframe>`, `<script>`, `javascript:` href all neutered (P1, fixed — closes B-2616, I-2600) — verified
- Steps: focus `[data-testid="block-content-blk_mp39bwborucqkom3"]`, invoke the bound React `onPaste` prop with a synthetic event whose `clipboardData` carries `text/html: <img src=x onerror=window.__PASTE_XSS=1>`.
- Observed: handler calls `preventDefault()` (returns `prevented:true`), nothing injected, `window.__PASTE_XSS` remains `undefined`. Repeated for `<svg onload>`, `<iframe srcdoc>`, `<script>`, `<a href="javascript:">` — none execute, and the inserted HTML for `<a>` is `<a>click</a>` with the unsafe `href` stripped. The `<script>` body is kept as inert text content only. Allowlist confirmed: `<b>bold</b><i>italic</i>` paste yields `<b>bold</b><i>italic</i>` in the DOM with `target.querySelector('b/strong')` and `(i/em)` both truthy.

### B-2701 — Plain-text paste relies on default browser behavior, no-op for synthetic events (P3, info)
- Steps: invoke `onPaste` prop with only `text/plain` set in `clipboardData`.
- Observed: handler returns without calling `preventDefault()` (`prevented:false`) AND no insertion happens because the synthetic event path can't trigger the browser's default text insertion. In a real browser paste (Cmd+V) this would still work because the default action runs. Pure E2E note — not a user-visible bug, but means automation must use real keyboard paste to reach this code path.


### B-2702 — Page-title contenteditable has NO `onPaste` handler — XSS via `execCommand('insertHTML', …)` executes immediately (P0, fixed) — SECURITY REGRESSION
- Steps: `/app/p/pg_<id>`, focus `[data-testid="page-title"]` (the `<h1 contenteditable="true">`), select all, then `document.execCommand('insertHTML', false, '<img src=x onerror="window.__TITLE_INSERT_XSS=1">')`.
- Observed: `window.__TITLE_INSERT_XSS === 1` (handler fired), `innerHTML` becomes `Getting Started EDITED-LIVE<img src="x" onerror="…">`. The block-content path (B-2700) was fixed by adding an `onPaste` listener that strips dangerous tags. The page-title H1 has only `onInput`/`onBlur`/`onKeyDown` — no paste interception — so the same sanitization path was never applied here. Real-world trigger: paste a malicious image element into a page title from a copied web page. Same fix as B-2700 needs to be replicated on title editors. Found via the same pattern that fixed B-2616.

### B-2703 — DB column-header dropdown still missing Sort / Filter / Hide / Duplicate (P3, open — extends B-2625)
- Steps: click `[data-testid="prop-header-p_dn"]` (Score column).
- Observed: dropdown DID grow — now exposes `prop-rename-p_dn`, a "Type" switcher row with all 23 property types (text/number/select/multi-select/status/date/person/files/checkbox/url/email/phone/formula/relation/rollup/created-time/created-by/last-edited-time/last-edited-by/unique-id/verification/button), and `prop-delete-p_dn`. Still missing the four most common Notion column actions: Sort ascending / Sort descending / Filter on this column / Hide column. Duplicate / Insert left / Insert right also absent.

### B-2704 — DB `db-actions-<id>` popover now opens and exposes Rename / Move-to-Trash / Delete-permanently (P3, fixed — closes B-2626)
- Steps: click `[data-testid="db-actions-db_dates_test"]` (⋯ next to DB title).
- Observed: a `[data-testid="db-menu-db_dates_test"]` popover renders with three items: `db-rename-db_dates_test`, `db-trash-db_dates_test`, `db-delete-db_dates_test`. Working. Still no Export-CSV / Edit-schema / Duplicate-DB, but the no-op state is closed.

### B-2705 — Slash menu opens via programmatic `onInput` only when invoking the bound React prop directly; native event chain still no-op (P3, info — clarifies B-2609)
- Steps: clear `[data-testid="block-content-blk_<id>"]`, place caret, `document.execCommand('insertText','/')`, then dispatch `new InputEvent('input', {bubbles:true})`.
- Observed: native event path no longer triggers the menu (regression vs. last batch). However calling `target[__reactPropsKey].onInput({currentTarget: target, target, nativeEvent: {data: '/'}})` directly DOES open the menu with 42 items. So the menu works but the input listener might be relying on synthetic event fields not present in a vanilla DOM `InputEvent`. Only affects programmatic / E2E paths; real typing still works.

### B-2706 — Slash menu lacks `role="menu"` and `aria-label` (P3, info — a11y)
- Steps: open slash menu.
- Observed: `[data-testid="slash-menu"]` is a `<div>` with no role or `aria-label`. Screen readers see it as a generic group. Menu items also lack `role="menuitem"`.

### B-2707 — DB cells have no Tab / Arrow-key navigation (P3, info — UX)
- Steps: focus `[data-testid="cell-title-r_dt1-p_dt"]`, dispatch Tab / ArrowRight / ArrowDown keydown.
- Observed: focus stays on the original cell — no horizontal/vertical traversal. Notion-equivalent grid lets Tab move to next cell and arrow keys move directionally. Today the only way to enter the next cell is to click it.

### B-2708 — `row-open-<id>` button is a no-op stub (P2, open)
- Steps: click `[data-testid="row-open-r_dt1"]` (the ⤢ button at the row's left edge).
- Observed: button is `<button aria-label="Open row" data-testid="row-open-r_dt1" title="Open row">⤢</button>`. Clicking it does nothing — no drawer, no navigation, no popover. The classic Notion "open row as page" action is missing.

### B-2709 — Calendar week event chips still have no DnD / testid / click handler (P2, open — extends B-2611)
- Steps: `/app/calendar`, select "week" in the view dropdown.
- Observed: chips render with text like "Test event B21" / "Wed event" / "Untitled" / "Test Cal Event Batch 15" inside `week-day-YYYY-MM-DD` containers; none of them carry `data-testid`, none are `draggable`, and the React props of the chip elements list no `on*` handlers (`handlers: []`). So users cannot click to edit or drag to reschedule.

### B-2710 — AI markdown link allows `javascript:` href to be rewritten to `#` but leaves orphan `)` + extra text (P3, open — extends B-2517)
- Steps: Ask AI: `Give me a link [click](javascript:alert(1)) please`.
- Observed: assistant response includes `... about "Give me a link <a href="#" target="_blank" rel="noopener noreferrer" class="underline">click</a>) please":` — the `javascript:` href is correctly neutered to `#`, but the trailing `)` and the user-prompt-leak remain (the markdown link's closing paren stays after the closing tag). Cosmetic, but exposes broken parser behavior to the user.

### B-2711 — Settings page testids unchanged: only `settings-signout` / `settings-darkmode` / `settings-export` (P3, info — extends B-2624)
- Steps: `/app/settings`.
- Observed: no progress in this batch. Workspace/Profile/Billing/Language sub-sections still missing.

### B-2712 — Sidebar / table-rows / gallery-cards DnD unchanged this batch (P2, open — extends B-2612/B-2613/B-2614)
- Steps: home page → `document.querySelectorAll('aside [draggable="true"]').length` → 0. Table view → 0 `tr[draggable]`. Gallery view of `db_dates_test` (`db-view-v_dates_gallery`) → 8 `gallery-card-*`, all `draggable === false`.
- Observed: the only `[draggable="true"]` elements in the entire app are the per-block `handle-blk_*` drag handles (22 found). Sidebar pages, DB rows, and gallery cards still un-draggable.

### B-2713 — Cmd+K palette has no `role="dialog"` (P3, info — extends B-2520)
- Steps: dispatch `keydown {key:'k', metaKey:true, ctrlKey:true}`.
- Observed: palette opens with 23 `cmd-*` items but the wrapper has no `role` attribute — screen readers won't treat it as a modal dialog. Escape correctly closes it.

### B-2714 — `ib-bold` toggle on H1 still emits `<span style="font-weight: normal;">` (P2, open — extends B-2606) — verified
- Steps: select first 4 chars of `<h1 contenteditable="true">Getting Started EDITED-LIVE</h1>`, dispatch `selectionchange` + `mouseup`, then `mousedown` on `[data-testid="ib-bold"]`.
- Observed: HTML becomes `<span style="font-weight: normal;">Gett</span>ing Started EDITED-LIVE`. The bold toggle still reads H1's inherited `font-weight: bold` and emits the wrong branch. Not fixed.

### B-2715 — `ib-link` still inert (P2, open — extends B-2607) — verified
- Steps: select 5 chars in `[data-testid="block-content-blk_mp39bwborucqkom3"]`, fire mouseup+selectionchange, then `mousedown` on `[data-testid="ib-link"]` + `.click()`.
- Observed: no link-popover, no `[data-testid="link-popover"]`, no `[role=dialog/menu]`, block HTML unchanged. Not fixed.

### B-2716 — Synthetic `paste` ClipboardEvent doesn't reach React onPaste (P3, info — E2E gap)
- Steps: dispatch `new ClipboardEvent('paste', {clipboardData: dt, bubbles: true})` on a `[contenteditable="true"]` block.
- Observed: handler does not fire; need to invoke `target[__reactPropsKey].onPaste({…})` directly with a synthetic event object. Only relevant to E2E automation — real Cmd+V paste in the user's browser triggers the React path correctly.


## 2026-05-13 13:00 — Test agent batch 29

### B-2800 — Title `<h1>` paste-XSS now blocked: `<img onerror>` in `text/html` paste neutered (P0, fixed — closes B-2702) — verified
- Steps: focus `[data-testid="page-title"]`, invoke React `onPaste` prop with a synthetic event whose `clipboardData` carries `text/html: <img src=x onerror=window.__TITLE_XSS=1>`.
- Observed: handler calls `preventDefault()` (returns `prevented:true`), title `innerHTML` unchanged (`Getting Started EDITED-LIVE`), `window.__TITLE_XSS` remains `undefined`. Source confirmed (`src/components/page/PageView.tsx:184-192`): the new `onPaste` forces a plain-text path — reads `text/plain` (or strips tags from `text/html` if plain absent) and inserts via `execCommand("insertText",…)`. No HTML is ever passed to the DOM.

### B-2801 — Title plain-text paste still inserts (P3, fixed — closes B-2701 for the title) — verified
- Steps: focus `[data-testid="page-title"]`, place caret at start, invoke React `onPaste` with `clipboardData.text/plain = "INJECTED PLAIN TEXT "`.
- Observed: handler `preventDefault()`s but immediately calls `execCommand("insertText", …)`, so the title `innerHTML` becomes `"INJECTED PLAIN TEXT Getting Started EDITED-LIVE"`. Plain-text paste works AND XSS is blocked.

### B-2802 — Block-content paste sanitizer still holds — no regression (P1, fixed) — verified
- Steps: invoke React `onPaste` prop on `[data-testid="block-content-blk_mp39bwborucqkom3"]` with `clipboardData.text/html = "<img src=x onerror=window.__PASTE_XSS=1>"`.
- Observed: `prevented:true`, block HTML unchanged (`"/"`), `window.__PASTE_XSS` remains `undefined`. The earlier B-2700 fix at the block layer is still in place alongside the new title fix.

### B-2803 — Title `execCommand('insertHTML', …)` payload STILL executes — paste fix doesn't cover this vector (P0, open — partial fix of B-2702) — SECURITY
- Steps: focus `[data-testid="page-title"]`, `selectNodeContents` + `execCommand('insertHTML', false, '<img src=x onerror="window.__TITLE_INSERT_XSS=1">')`.
- Observed: `execCommand` returns `true`, `__TITLE_INSERT_XSS === 1`. The new `onPaste` handler is the ONLY guard. Any code path that ends up calling `execCommand("insertHTML", …)` (e.g. a malicious browser extension, a future feature, an attacker who triggers `insertHTML` via a custom event) re-opens the same XSS. Real fix needs an `onInput`-side sanitizer that walks the title's child nodes after every mutation and strips non-text descendants (mirroring the model where titles are always text-only).

### B-2804 — Sidebar pages STILL not draggable (P2, open — extends B-2612, B-2712)
- Steps: home page, `document.querySelectorAll('aside [draggable="true"]').length` → 0. All `page-menu-*`, `expand-*`, `ts-*` buttons in the sidebar have `draggable === null`.
- Observed: sidebar pages, top-level sections (Private / Engineering / Shared / Favorites) and team-section dividers cannot be reordered or moved between sections.

### B-2805 — Table rows STILL not draggable (P2, open — extends B-2613, B-2712)
- Steps: focus inline DB on `pg_mp33cd7d01u4huok`, query `[data-testid^="row-"]` and parent `<tr>`s.
- Observed: 0 draggable rows; `row-open-r_dt1` and `row-delete-r_dt1` are leaf buttons only. Notion-equivalent row reorder via drag is missing.

### B-2806 — Gallery cards STILL not draggable (P2, open — extends B-2614, B-2712)
- Steps: switch to `db-view-v_dates_gallery`.
- Observed: 8 `gallery-card-*` cards, all `draggable === null`. Card-to-section reorder is unavailable.

### B-2807 — Calendar week chips STILL no testid / no draggable / no onClick (P2, open — extends B-2709)
- Steps: `/app/calendar`, select `week` in view dropdown, inspect `week-day-*` children.
- Observed: 7 week-day cells contain 5 visible chips (text "Test event B21", "Wed event", "Untitled", "Untitled", "Test Cal Event Batch 15"). None has `data-testid`, none has `draggable`, no React props on the chip nodes. Users still can't drag-reschedule or click-to-edit events.

### B-2808 — Timeline bars (`tl-bar-*`) have onClick but click is a no-op + not draggable (P2, open — new)
- Steps: switch to `db-view-v_dates_tl`, find `tl-bar-r_dt1`, click it.
- Observed: bar React props show `onClick` registered (so the bar is wired up) but clicking does nothing — no row drawer, no popover, URL unchanged. Also `draggable === null`, so users cannot drag the bar to reschedule. Timeline visually rendered but read-only.

### B-2809 — List view rows (`list-row-*`) not draggable (P2, open — new)
- Steps: switch to `db-view-v_dates_list`.
- Observed: 8 `list-row-*` items, all `draggable === null`. Reorder via drag missing on List view.

### B-2810 — `ib-link` still inert (P2, open — extends B-2607, B-2715) — verified via mousedown+click
- Steps: select 5 chars in a block, dispatch `selectionchange` + `mouseup`, then `mousedown` and `.click()` together on `[data-testid="ib-link"]`. As an alternative, invoked React's `onMouseDown` prop directly with `preventDefault` mocked.
- Observed: source confirmed (`InlineToolbar.tsx:154`): `onMouseDown` calls `applyLink()` which sets `linkOpen` true → a `[data-testid="ib-link-popover"]` SHOULD render. In practice the popover never appears in automated tests because the toolbar component itself unmounts on the next selection-change tick (e.g. when the mousedown is processed, focus shifts and the selection collapses, triggering `setOpen(false)` in the toolbar's check). Real-mouse users would see this too if they release outside the toolbar. Mousedown + click on the same tick does not produce a stable popover.

### B-2811 — `ib-ai` likewise inert under synthetic dispatch (P2, open — extends B-2608)
- Steps: same setup as B-2810, click `[data-testid="ib-ai"]`.
- Observed: source dispatches `window.dispatchEvent(new CustomEvent("open-ai-chat-with", { detail: { selected: txt } }))`. No listener was registered on `window` for that event in the live page (probed via `window.eventListeners` — `'open-ai-chat-with'` has 0 listeners). So even when the mousedown fires, the AI side-panel does not open.

### B-2812 — `ib-bold` on H1 selection still emits `font-weight: normal` span (P2, open — extends B-2606, B-2714) — verified
- Steps: select 4 chars inside `[data-testid="page-title"]` (an H1 with `font-weight: 700` from `font-bold`), fire `selectionchange` + `mouseup`. (Toolbar appears under real mouse-driven selection; synthetic dispatch could not stabilize it for direct click — verified via source.)
- Observed: `InlineToolbar.tsx:103` calls `exec("bold")` → `execCommand("bold")`. Chrome's bold toggle reads inherited `font-weight: bold` from the H1 styling and inserts `<span style="font-weight: normal;">` instead of `<b>` because it interprets the existing weight as "already bold". No special-case in the toolbar to invert bold cleanly on heading blocks. Fix needs a custom bold implementation that wraps with `<b>` / `<strong>` regardless of inherited styling.

### B-2813 — Cross-tab sync STILL absent — no BroadcastChannel / storage-event listeners (P2, open — extends B-2615) — verified
- Steps: `grep -rn "BroadcastChannel\|onstorage\|addEventListener.*storage" src/` returns 0 hits.
- Observed: the app never listens to `storage` events nor uses `BroadcastChannel`. Two open tabs of the same workspace remain isolated. State changes in tab A do not propagate to tab B without a manual reload.

### B-2814 — Settings page testids unchanged: still only signout / darkmode / export (P3, info — extends B-2624, B-2711)
- Steps: `/app/settings`, list all `[data-testid^="settings-"]`.
- Observed: 3 testids: `settings-signout`, `settings-darkmode`, `settings-export`. Workspace, Profile, Billing, Language, Connections, Notifications sub-sections still missing from the route.

### B-2815 — 25 / 181 buttons on `/app/p/<id>` still lack accessible name (P3, info — extends B-2629)
- Steps: post-hydration on `pg_mp33cd7d01u4huok`, filter `<button>`s with no text, no `aria-label`, no `title`, no `aria-labelledby`.
- Observed: 25 unlabeled (same as last batch); all are sidebar `expand-pg_*` chevron icon buttons holding only an inline `<svg>`. The other icon buttons (`page-menu-*`, `page-new-*`, `close-sidebar`, …) have labels. Add `aria-label="Expand"` / `"Collapse"` to the chevrons.

### B-2816 — Cmd+K palette wrapper still lacks `role="dialog"` / `aria-modal` (P3, info — extends B-2520, B-2713)
- Steps: dispatch Cmd+K, walk up from `[data-testid="cmd-new-page"]` to BODY.
- Observed: every ancestor up to BODY has `role===null`, `aria-modal===null`, `data-testid===null`. Palette opens (24 cmd-* items including new `cmd-page-*` and `cmd-db-*` entries) but is announced as a plain `<div>` group by screen readers.

### B-2817 — Timeline bar `tl-bar-*` is the FIRST DB view-item with an `onClick`, but the handler is a no-op (P2, open — new)
- Steps: click `[data-testid="tl-bar-r_dt1"]`.
- Observed: React props expose `onClick`, but firing it does not navigate, open a drawer, or open a popover. URL unchanged, no `[role=dialog]` appears. Compare with `gallery-card-*` / `list-row-*` which have no onClick at all — timeline at least wired it up, but the action is missing.

### B-2818 — Empty page title now shows `Untitled` placeholder (P3, fixed — closes part of placeholder UX) — verified
- Steps: navigate to `/app` → click sidebar "📄Untitled" page → inspect `[data-testid="page-title"]::before` pseudo.
- Observed: `getComputedStyle(title, '::before').content === '"Untitled"'` when `innerText` is empty. The CSS-pseudo placeholder fix (af7eeae) is live and visible.

### B-2819 — `row-open-<id>` button still no-op (P2, open — extends B-2708)
- Steps: click `[data-testid="row-open-r_dt1"]` on the inline DB.
- Observed: still does nothing — no drawer, no nav, no popover. Same status as last batch.

### B-2820 — Synthetic React-`onMouseDown` direct invocation on `ib-link` opens linkPopover state but the toolbar unmounts before the popover renders (P3, info — E2E gap)
- Steps: select 5 chars, hook the inline toolbar's `useState`, call `[data-testid="ib-link"]` `__reactProps.onMouseDown({preventDefault: ()=>{}, …})`.
- Observed: `applyLink()` fires (sets internal `linkOpen=true`), but the next React render sees an empty selection (the synthetic mousedown event doesn't keep selection alive in the React lifecycle), so the parent `InlineToolbar` returns `null` and unmounts. The popover never reaches the DOM. Real mouse-driven flow would keep selection — purely an E2E observation.

### B-2821 — `open-ai-chat-with` window event has 0 listeners (P2, open — root cause for B-2811)
- Steps: probe `window`'s registered listeners for `open-ai-chat-with` after page load.
- Observed: 0 listeners. The AI chat panel never subscribes to the event that `ib-ai` dispatches. Fix: add a listener in the AI chat / global app shell that opens the panel with the selected text prefilled.


## 2026-05-13 15:30 — Test agent batch 30

### B-2900 — Title `onInput` sanitizer NOW flattens HTML on every input (P0, fixed — closes B-2803) — verified
- Steps: focus `[data-testid="page-title"]`, `selectNodeContents` + `execCommand('insertHTML', false, '<img src=x onerror="window.__TITLE_INPUT_XSS=1"><b>BOLDED</b>')`, then dispatch a synthetic `InputEvent('input')`.
- Observed: `execCommand` returned `true`, but resulting `title.innerHTML` was plain text only (`"BOLDEDINJECTED PLAIN TEXT Getting Started EDITED-LIVE"` — no `<b>`, no `<img>`), and `window.__TITLE_INPUT_XSS` remained `undefined`. Repeated with `<i>ITAL</i><span style="color:red">RED</span>` → title's `childNodes` collapsed to a single `#text` node (`hasI=false`, `hasSpan=false`). The onInput sanitizer correctly walks descendants and strips all non-text content. B-2803 vector (`execCommand('insertHTML', …)`) is now closed at the input layer, not just the paste layer.

### B-2901 — Inline toolbar `ib-ai` NOW opens the AI chat panel with pre-filled prompt (P2, fixed — closes B-2811 + B-2821) — verified
- Steps: select 7 chars in `[data-testid="block-content-blk_mp33cd7dvdil4mjz"]` ("! Here'"), dispatch `selectionchange` + `mouseup` to surface toolbar, then invoke `[data-testid="ib-ai"]` `__reactProps.onMouseDown({preventDefault:()=>{}, stopPropagation:()=>{}})`.
- Observed: After ~400ms the AI side panel is mounted — new testids visible in the DOM: `ai-new-thread`, `ai-msg-0…3`, `ai-input`, `ai-send`, `close-ai`. `ai-input.value === "Ask AI about: \"! Here'\""` — the selected text is exactly pre-filled. The window listener for `open-ai-chat-with` is now wired and the panel reacts. Closes both the toolbar dispatcher (B-2811) and the listener-side gap (B-2821).

### B-2902 — Bold button is NOW disabled in heading-2 blocks (P2, fixed — closes B-2606/B-2714/B-2812) — verified
- Steps: select 5 chars in `[data-testid="block-content-blk_mp33cd7dvqv4tzkr"]` (heading-2: "Sidebar"), dispatch `selectionchange` + `mouseup`. Probe `[data-testid="ib-bold"]`.
- Observed: `boldBtn.disabled === true`, `boldBtn.title === "Already bold (heading)"`, button class includes `disabled:opacity-40 disabled:cursor-not-allowed`. Regression check on paragraph `blk_mp33cd7dvdil4mjz`: `boldBtn.disabled === false`, `boldBtn.title === "Bold (Cmd+B)"` — paragraph bold still works. Fix correctly conditioned on heading detection.

### B-2903 — Gallery cards NOW have click → row drawer (P2, fixed — partially closes B-2806) — verified
- Steps: switch to `db-view-v_dates_gallery`, click `[data-testid="gallery-card-r_dt1"]`.
- Observed: `[data-testid="row-detail-drawer"]` mounts immediately. All 8 cards have `onClick: true`. Drag-to-reorder still missing (`draggable: false`, `onDragStart: false`), so the original B-2806 "not draggable" complaint remains — but the click path is functional now.

### B-2904 — List rows NOW have click → row drawer (P2, fixed — partially closes B-2809) — verified
- Steps: switch to `db-view-v_dates_list`, click `[data-testid="list-row-r_dt1"]`.
- Observed: All 8 list rows have `onClick: true` and clicking opens `row-detail-drawer`. Drag-to-reorder still missing (`draggable: false`).

### B-2905 — Timeline bar `tl-bar-*` click NOW opens row drawer (P2, fixed — closes B-2808/B-2817) — verified
- Steps: switch to `db-view-v_dates_tl`, click `[data-testid="tl-bar-r_dt1"]`.
- Observed: `row-detail-drawer` opens. The previously-no-op `onClick` is now wired. Drag-to-reschedule still missing (`draggable: false`).

### B-2906 — Calendar event chips NOW draggable (P2, fixed — partially closes B-2807) — verified
- Steps: switch to `db-view-v_dates_cal`, inspect `[data-testid^="cal-event-"]`.
- Observed: 1 visible chip (`cal-event-row_mp3anff62apy`, "Public form B-2200 submission") has `draggable: true`, `onDragStart: true`, `onClick: true`. NEW testid prefix `cal-event-` (was untestid'd in batch 29). Chip is wired as a drag source.

### B-2907 — Calendar day cells have NO drop targets — drag-reschedule incomplete (P2, open — extends B-2906)
- Steps: scan all elements with React `onDrop` / `onDragOver` props after switching to calendar view; filter by testid containing "cal".
- Observed: 0 cal-prefixed drop targets. Total page-wide drop zones: 57, all inline-block reorder regions (class `group/block relative …`). Calendar chips are draggable sources but there's no destination — dragging onto a date cell does nothing. Fix: wire `onDragOver` + `onDrop` on month/week day cells to reassign the event's date property.

### B-2908 — Sidebar pages STILL not draggable (P2, open — extends B-2612/B-2712/B-2804)
- Steps: query `aside [draggable="true"]` and React-prop `draggable: true` / `onDragStart` after opening sidebar.
- Observed: 0 draggable elements in the sidebar; 0 React props with drag handlers. Sidebar reordering remains absent.

### B-2909 — Table rows in inline DB STILL not draggable (P2, open — extends B-2613/B-2805)
- Steps: inline DB on `pg_mp33cd7d01u4huok`, inspect all `<tr>` and `[data-testid^="row-"]`.
- Observed: 5 `<tr>`, 0 with `draggable: true`, 0 with `onDragStart` React prop. Row-reorder via drag still missing in Main/Table view.

### B-2910 — Block-handle drag IS functional (P1, fixed — baseline)
- Steps: invoke `[data-testid^="handle-blk_"]` React `onDragStart` with a fake `DataTransfer`.
- Observed: handler runs, `dataTransfer.effectAllowed = "move"`, no exceptions. 22 block handles, each with `draggable: true` and `onDragStart`. 57 drop zones registered on block-row containers. Block drag-to-reorder is the only fully-functional DnD surface in the app.

### B-2911 — Cmd+K palette NOW has `role="dialog"` + `aria-modal` + `data-testid="command-palette"` (P3, fixed — closes B-2520/B-2713/B-2816) — verified
- Steps: dispatch Cmd+K, walk up from `[data-testid="cmd-new-page"]` to BODY.
- Observed: 4th ancestor has `tag=DIV`, `role="dialog"`, `aria-modal="true"`, `data-testid="command-palette"`. Screen readers will now announce the palette properly.

### B-2912 — Sidebar `expand-pg_*` chevrons NOW labeled (P3, fixed — closes B-2629/B-2815) — verified
- Steps: after opening sidebar, query `[data-testid^="expand-"]` and check `aria-label` + `title`.
- Observed: 23 expand buttons, all 23 labeled. Sample: `aria-label="Expand OKRs"`, `title="Expand"`. Per-page descriptive labels included.

### B-2913 — Only 4 unlabeled icon-buttons remain page-wide (P3, info — extends B-2629/B-2815)
- Steps: filter all `<button>` with no textContent, no aria-label, no title, no aria-labelledby.
- Observed: 4 / 202 unlabeled — `view-menu-v_dates_cal`, `cal-prev-db_dates_test`, `cal-next-db_dates_test`, `toggle-blk_mp34ax5iwusd0425`. Down from 25 / 181 in batch 29. Calendar nav icons and the toggle-block twirl are the last gaps.

### B-2914 — Cross-tab sync STILL absent — no BroadcastChannel, no `storage` listener (P2, open — extends B-2615/B-2813)
- Steps: `grep -rn "BroadcastChannel\|addEventListener.*'storage'\|window.onstorage" src/` → 0 hits. Dispatch a synthetic `StorageEvent` on `window` → title text unchanged (no re-render).
- Observed: localStorage holds 10+ keys including `notion-clone:user:<uid>` (per-user zustand state) and `notion-clone:global`. Two tabs would write to the same keys but neither tab listens for changes. Tab A's title edit will be silently overwritten when Tab B's debounced write lands. Fix: add a `window.addEventListener('storage', …)` in the zustand persistence layer, or use BroadcastChannel for fan-out.

### B-2915 — Title input performance is excellent (P3, info)
- Steps: focus `[data-testid="page-title"]`, run 200 `execCommand("insertText", "x")` calls in a tight loop.
- Observed: 46.8 ms total, 0.234 ms / char average, no UI hitch. The onInput sanitizer (B-2900 fix) does not add measurable per-keystroke cost. Title scales fine to long pasted texts.

### B-2916 — Cmd+K palette open/close stress: 20 round trips in 2.4 ms (P3, info)
- Steps: dispatch `keydown Cmd+K` then `keydown Escape` 20× in a loop.
- Observed: 2.4 ms total. Palette re-mount / unmount is cheap. No leaks observed after 20 cycles.

### B-2917 — Block render scale: page renders 15 visible blocks of ~22 total (P3, info)
- Steps: count `[data-testid^="block-content-"]` on `pg_mp33cd7d01u4huok`.
- Observed: 15 visible blocks of 22 created (a few are nested under collapsed toggles). No virtualization observed in source — rendering all blocks works at this size, but a 1000-block page would likely jank. Recommend adding virtualization (react-window / TanStack Virtual) before users author large docs.

### B-2918 — `view-menu-v_dates_cal` icon button still unlabeled (P3, open — extends B-2913)
- Steps: filter unlabeled icon buttons on calendar view.
- Observed: `view-menu-v_dates_cal` (an ellipsis kebab) has only an inline `<svg>`, no `aria-label`. Other view-menu buttons across views were not checked but likely have the same pattern. Add `aria-label="View options"` or similar.

### B-2919 — Calendar prev/next buttons unlabeled (P3, open — extends B-2913)
- Steps: same scan as B-2918.
- Observed: `cal-prev-db_dates_test` and `cal-next-db_dates_test` are bare-svg icon buttons with no `aria-label`/`title`. Screen-reader users can't tell which one advances the month. Add `aria-label="Previous month"` / `"Next month"`.

### B-2920 — `toggle-blk_*` twirl icon-button unlabeled (P3, open — extends B-2913)
- Steps: same scan.
- Observed: collapsed-toggle block's expand triangle (`toggle-blk_mp34ax5iwusd0425`) is an icon-only button with no `aria-label`. Sidebar pages got per-name labels (B-2912) but inline toggle blocks didn't. Add `aria-label="Toggle <block-summary>"` or at least `aria-expanded` + `aria-label="Toggle"`.

### B-2921 — Row-detail-drawer DOES open from gallery, list, AND timeline now (P1, fixed — meta) — verified
- Steps: validated three independent entry points (B-2903, B-2904, B-2905). Each opens `[data-testid="row-detail-drawer"]`.
- Observed: Consistent drawer testid across all DB view types. Drawer dismisses on `[aria-label*="Close"]` click. This unblocks several previously-no-op interactions (B-2708, B-2806, B-2808, B-2809, B-2817, B-2819). The remaining gap is `row-open-r_dt1` button — last batch reported it as still no-op, today's testing didn't re-verify so it's possible the table-view row-open button is wired by the same drawer mount — needs explicit check in next batch.

### B-2922 — Inline-toolbar Ask-AI uses `Ask AI about: "…"` prefix (P3, info — UX detail)
- Steps: after B-2901 verification, inspected `ai-input.value`.
- Observed: prefill is `Ask AI about: "<selected text>"`. Includes the literal `Ask AI about:` prefix. If users want a clean continuation they have to manually strip the prefix. Consider making the prefill just the selected text and using placeholder/system-prompt to indicate the "ask about" framing — or at least put the prefix into a non-editable chip in the UI rather than the input value.

### B-2923 — AI panel pre-existing `ai-msg-0` contains XSS-looking placeholder strings (P2, info — leftover from prior tests)
- Steps: after opening AI panel in B-2901, read `ai-msg-0` textContent.
- Observed: `"[v](vbscript:alert(1)) and [f](file:///etc/passwd) plus [c](https://safe.example.com)"`. These are test-fixture chat messages from previous markdown-XSS testing (B-2400s era). They render as plain text (good) but persist in the AI chat history and may confuse fresh users. Consider clearing or seeding cleaner default messages.

### B-2924 — `[data-testid="command-palette"]` newly exposed — useful for E2E (P3, info)
- Steps: walk DOM after Cmd+K.
- Observed: New top-level wrapper testid `command-palette` makes it easy to assert palette presence in tests. Combined with `role="dialog" aria-modal="true"`, this is a clean a11y+test surface. Worth documenting in any E2E guide.

### B-2925 — Form view button present but not exercised (P3, info)
- Steps: noticed `[data-testid="db-view-v_form"]` in view selector with count 8.
- Observed: not tested in this batch. Should add to next batch's coverage (form submission, validation, draggable form fields, etc.).

### B-2926 — Synced-block surface still present (`blk_syncedchild_*`) — appears to mirror live (P3, info)
- Steps: noticed `block-content-blk_syncedchild_1778627070687` with text "LIVE-MIRROR-1778627431314".
- Observed: A synced-block child is in the page and contains text that looks like a mirror of an earlier paragraph. Sync direction / persistence wasn't tested. Worth a dedicated batch: create source, sync to another page, edit either side, confirm bidirectional propagation.

### B-2927 — Sidebar shows persisted "INJECTED PLAIN TEXT …" title from earlier test (P3, info)
- Steps: sidebar lists "🧭INJECTED PLAIN TEXT Getting Started EDITED-LIVE" for `pg_mp33cd7d01u4huok`.
- Observed: B-2801's plain-text paste from batch 29 has persisted across reloads and is now polluting the sidebar. Confirms persistence works, but also that the test fixtures are accumulating cruft. Consider a "reset workspace" affordance for QA, or seed-data isolation per session.

### B-2928 — Block-row drop zones have NO testid — hard to assert specific drop targets in E2E (P3, info)
- Steps: query all React elements with `onDrop` or `onDragOver` props.
- Observed: 57 drop zones, all share class `group/block relative flex items-start gap-1 py-0.5` and none have a `data-testid`. Block-handle drag works (B-2910) but E2E tests can't target a specific drop slot. Add `data-testid="block-drop-<blockId>"` or `data-drop-target="block"` to enable deterministic drag-drop tests.

### B-2929 — Drag-drop coverage summary (P2, info — meta)
- Steps: aggregate across batches 28-30.
- Observed:
  - Block handles: DRAG WORKS (B-2910).
  - Calendar event chips: DRAG SOURCE WORKS, NO DROP TARGET (B-2906 + B-2907).
  - Sidebar pages: NO DRAG (B-2908).
  - Table rows: NO DRAG (B-2909).
  - Gallery cards: NO DRAG, CLICK WORKS (B-2806 + B-2903).
  - List rows: NO DRAG, CLICK WORKS (B-2809 + B-2904).
  - Timeline bars: NO DRAG, CLICK WORKS (B-2808 + B-2905).
  - Recommended priority: calendar drop targets (closest to working), then table rows (high user value for DB reordering), then sidebar pages.



## 2026-05-13 14:00 — Implementer batch (commit 14baeb8)

### B-2803 — Title execCommand insertHTML XSS — fixed at persistence layer
- Fix: PageView.tsx mounts a MutationObserver on the title `<h1>` that flattens any non-text child the instant it appears, then re-emits `innerText` to state.
- Verified: `execCommand('insertHTML', …, '<b>X</b><i>Y</i><span style="color:red">Z</span>')` ends with `childCount: 0`, `innerHTML: "XYZ"`. Persisted store state never contains rich content for the title.
- Caveat: inline `<img onerror>` still fires once during HTML parse (browsers parse before any JS observer can intercept `execCommand`). Closes the persistence vector — real-world attacker calling `execCommand` already has JS execution.

### B-2630 — Color tool emitted deprecated `<font color>` — fixed (commit 14baeb8) — closes I-2608
- Fix: `applyColor` in InlineToolbar.tsx now wraps the selection range in `<span data-color="1" style="color: …">` via `range.surroundContents` (with fallback to extract+wrap when the selection crosses boundaries). "Default" picker now unwraps any `span[data-color]`, legacy `<font>`, or stray `span[style*="color"]` inside the range.
- Sanitizer updated to allow the `data-color` marker on `<span>` so the unwrap selector keeps working after persist + reload.
- Verified: applying red to "/" yields `<span data-color="1" style="color: rgb(220, 38, 38);">/</span>`. No `<font>` in output.

### B-2810 / B-2715 / B-2607 — ib-link popover unmounted before render — fixed (commit 14baeb8) — closes I-2602
- Fix: InlineToolbar's selectionchange listener now bails out when `linkOpenRef.current === true`, so the toolbar (and its link popover) stays mounted when focus moves to the URL input and the selection collapses. The Enter / Escape / Apply / empty-URL paths all reset `linkOpenRef.current = false` before closing the popover.
- Note: this addresses the symptom seen in tester repro (synthetic mousedown / focus shifts collapse selection → toolbar unmounts). Real-mouse-driven flow already worked because the browser preserves the selection during a mousedown that calls `preventDefault()`.

### B-2814 / B-2624 / B-2516 — Settings page sub-section testids — fixed (commit 14baeb8) — closes I-2511 / I-2808
- Added: `settings-profile`, `settings-workspace`, `settings-billing`, `settings-language`, `settings-notifications`, `settings-connections`. Workspace plan now lives inside the workspace section under a nested `settings-billing` div. Language / Notifications / Connections render as stubs with the canonical testids so E2E suites can assert presence and future work can fill them out without churn.

### B-2815 / B-2629 — Sidebar chevrons unlabeled (25 buttons) — fixed (commit 14baeb8) — closes I-2807 / I-2609 (chevron subset)
- Fix: `expand-${page.id}` buttons in Sidebar.tsx now receive `aria-label={expanded ? \`Collapse <title>\` : \`Expand <title>\`}`, `aria-expanded`, and a `title` attribute. Verified: all 23 chevrons now report a non-null `aria-label`; `unlabeled` count dropped from 25 → 0 for that subset.

### B-2816 / B-2713 / B-2520 — Cmd+K palette lacked dialog semantics — fixed (commit 14baeb8) — closes I-2707
- Fix: the inner palette panel now has `role="dialog"`, `aria-modal="true"`, `aria-label="Command palette"`, and a `command-palette` testid. The outer scrim still closes the palette on click. Verified via preview: `[data-testid="command-palette"]` returns matching role/aria attributes.

### B-2913 / B-2918 / B-2919 / B-2920 — Remaining icon-button labels — fixed (commit f62df5c)
- view-menu-<viewId> → "View options"
- cal-prev-<dbId> → "Previous month", cal-next-<dbId> → "Next month"
- toggle-<blockId> → "Expand toggle"/"Collapse toggle" + aria-expanded
- Down from 4 → 0 unlabeled icon buttons on a typical page render.

### B-2914 — Cross-tab sync — fixed (commit f62df5c) — closes I-2503 / I-2607 / I-2806
- Fix: `src/lib/store.ts` attaches a `window` `storage` event listener AND a BroadcastChannel("notion-clone") on first `initializeForUser`. When another tab writes to `notion-clone:user:<uid>`, we parse the incoming JSON, replace `_state`, and notify subscribers. `setState` posts a `{type:"rehydrate"}` BroadcastChannel message after every write for lower-latency fan-out within one browser.
- Verified: synthetic `StorageEvent` with `key: notion-clone:user:<uid>` is received; `BroadcastChannel` is supported in the preview browser.
- Caveat: last-write-wins. Two tabs concurrently editing the same field will clobber each other's in-flight edits — full CRDT semantics are out of scope. Good enough for the typical "edit in one tab, see in another" use case.


## 2026-05-13 ~15:00 — QA agent verification batch (commits 14baeb8 + f62df5c)

### B-3000 — B-2803/I-2800 title execCommand insertHTML flattening — verified FIXED (P0, fixed)
- Repro: focus h1 page-title, select all, `execCommand('insertHTML', false, '<b>X</b><i>Y</i><span style="color:red">Z</span>')`.
- Observed: `childCount: 1` (text node only), `innerHTML: "XYZ"`, `innerText: "XYZ"`. MutationObserver flattens within the same microtask.
- Expected: flatten to plain text. PASS.

### B-3001 — B-2630/I-2608 color tool emits span data-color — verified FIXED (P1, fixed)
- Repro: select text "COLORME" in a paragraph block, open inline toolbar, click ib-color (mousedown), click ib-color-red (mousedown).
- Observed: HTML becomes `<span data-color="1" style="color: rgb(220, 38, 38);">COLORME</span>`. No `<font>` tag emitted.
- Expected: span wrapper with data-color marker. PASS.

### B-3002 — B-2810/B-2715/B-2607/I-2602 ib-link popover renders & persists — verified FIXED (P1, fixed)
- Repro: select text, open inline toolbar, mousedown ib-link, then focus the URL input (which triggers selectionchange).
- Observed: `[data-testid="ib-link-popover"]` renders with input + apply button. Popover survives selectionchange when input gains focus.
- Expected: popover persists. PASS.

### B-3003 — B-2814/I-2808 settings subsection testids — verified FIXED (P2, fixed)
- Repro: navigate to /app/settings, query for testids.
- Observed: all 6 testids found — settings-profile, settings-workspace, settings-billing, settings-language, settings-notifications, settings-connections.
- Expected: present. PASS.

### B-3004 — B-2815/I-2807 sidebar chevron aria-labels — verified FIXED (P2, fixed)
- Repro: sample `[data-testid^="expand-pg_"]` buttons.
- Observed: aria-label set (e.g. "Expand BOLDEDITALRED"), aria-expanded="false", title="Expand". 0 unlabeled in sample.
- Expected: labeled chevrons. PASS.

### B-3005 — B-2816/I-2707 Cmd+K palette dialog semantics — verified FIXED (P2, fixed)
- Repro: click `sidebar-search` (Cmd+K key shortcut also exists; see B-3006).
- Observed: `[data-testid="command-palette"]` has role="dialog", aria-modal="true", aria-label="Command palette". PASS.

### B-3006 — Cmd+K keyboard shortcut does NOT trigger command palette (P2, open) — regression / never wired
- Repro: dispatch `new KeyboardEvent('keydown', { key:'k', metaKey:true, ctrlKey:true })` to window+document.
- Observed: palette does NOT open. Only clicking `sidebar-search` opens it.
- Expected: ⌘K (or Ctrl+K) should open the palette per the displayed `<kbd>⌘K</kbd>` shortcut hint in the sidebar.

### B-3007 — B-2914/I-2806 cross-tab sync via StorageEvent — verified FIXED (P2, fixed)
- Repro: synthetic `StorageEvent('storage', { key: 'notion-clone:user:<uid>', oldValue, newValue })` with a tweaked page title, then navigate.
- Observed: `BroadcastChannel` is supported. Rendered title updates to the new value pushed by the event.
- Expected: rehydrate on storage event. PASS.

### B-3008 — B-2918/B-2919/B-2920 view-menu / cal-prev / cal-next / toggle-blk aria — verified FIXED (P2, fixed)
- Repro: open page with DB calendar view + a toggle block.
- Observed: view-menu-<viewId> aria="View options", cal-prev-<dbId> aria="Previous month", cal-next-<dbId> aria="Next month", toggle-blk_* aria="Expand toggle" + aria-expanded. All labeled.
- Expected: labeled. PASS.

### B-3009 — Inline toolbar `ib-color` button missing aria-label (P3, open) — a11y nit
- Repro: inspect `[data-testid="ib-color"]` outerHTML in inline toolbar.
- Observed: button has `title="Text color"` but NO `aria-label`. Other ib-* buttons (ib-bold, ib-italic, ib-link, etc.) all have aria-label.
- Expected: aria-label="Text color" for screen-reader parity.

### B-3010 — Inline toolbar Apply-link button no-op via .click() (P2, open) — possible regression
- Repro: open ib-link popover, set input.value="https://example.com" via native setter + dispatch input event, click `[data-testid="ib-link-apply"]`.
- Observed: nothing happens, block HTML stays "LINKME", popover stays open.
- Expected: link applied (anchor tag) AND/OR popover closes. Likely needs mousedown handler instead of click — matches the ib-color toolchain.

### B-3011 — Cmd+K palette block-content search does not surface block snippets (P2, open)
- Repro: open command palette, type "orientation" (substring of a block's text "Here's a quick orientation").
- Observed: shows the parent page TestColor under Pages group. NO separate Blocks group or snippet shown.
- Expected: per spec "two result groups appear" (pages AND blocks) when query matches both.


### B-3012 — Sidebar pages still not draggable (P2, open) — confirms B-2908 still open
- Repro: inspect sidebar `[data-testid="page-menu-pg_*"]` row's parent `.group` div.
- Observed: `draggable` attr is null. No `onDragStart`/`onDragOver`/`onDrop` listeners on row.
- Expected: pages reorder via drag.

### B-3013 — Table rows still not draggable (P2, open) — confirms B-2909 still open
- Repro: switch to table view for db_dates_test, inspect `tr` elements.
- Observed: `draggable` attr null on every `tr`, no drag handlers.
- Expected: rows reorderable via DnD.

### B-3014 — Calendar day cells lack drop targets (P2, open) — confirms B-2907 still open
- Repro: open db calendar view (e.g. db_dates_test/v_dates_cal). Cells have testid `cal-add-YYYY-MM-DD`.
- Observed: React props on cell are `onClick, className, data-testid, children`. No `onDragOver`/`onDrop`. Chips ARE draggable but nothing accepts the drop.
- Expected: drag a chip to a new day to reschedule.

### B-3015 — Public-form submit creates row — verified WORKS (P2, fixed/info)
- Repro: visit /form/db_dates_test/v_form, fill `public-form-field-p_dt` (Title) + p_dn (Score), click `public-form-submit`.
- Observed: row count for db_dates_test went 8 -> 9. Last row has values { p_dn: 42, p_dt: "QA_FORM_TEST" }, createdBy: "public-form", uniqueIdSeq: 9. UI shows "Thanks for submitting!".
- Expected: row created in host's localStorage. PASS.

### B-3016 — AI chat sanitizes vbscript / file / javascript hrefs — verified WORKS (P0, fixed/info)
- Repro: send `Test [v](vbscript:alert(1)) and [f](file:///etc/passwd) and [j](javascript:alert(1)) links` in ai-input.
- Observed: assistant reply renders the link text only with `<a href="#">` placeholders. No vbscript:, file://, or javascript: appears in rendered HTML.
- Expected: dangerous protocols stripped to "#". PASS.

### B-3017 — Markdown export covers most block types — verified WORKS (P2, fixed/info)
- Repro: page-options → "Export as Markdown" on pg_mp33cd7d01u4huok. Captured blob via URL.createObjectURL interceptor.
- Observed: 544-byte text/markdown blob. Includes # title, ##/heading, **bold**, *italic*, `<!-- synced reference: no source -->` for empty synced refs, `<!-- (embedded database) -->`, `$$ … $$` for equations, ``` fenced code, button `[🚀 Go to Roadmap]`, `<details>/<summary>` for toggles, `<!-- multi-column layout: -->` for columns.
- Gap: code block content was empty in this sample even though page has a code block; the leading `/` from the empty `/`-block leaks as plain text. Worth a follow-up — see I-3001.

### B-3018 — Cmd+K keyboard shortcut DOES work via document/body — false alarm on earlier B-3006
- Re-verified by dispatching `keydown` with key:'k', metaKey:true on document.body — palette opens. Strike B-3006.

### B-3019 — Cmd+B / Cmd+I / Cmd+/ / Cmd+D / Cmd+K shortcuts all functional (P2, fixed/info)
- Repro: paragraph block keydown for each.
- Observed: Cmd+B wraps `<b>`; Cmd+I wraps `<i>`; Cmd+/ opens `[data-testid="slash-menu"]`; Cmd+D duplicates block (block-content count 15→16); Cmd+K opens palette.
- Expected: all work. PASS.

### B-3020 — Public published page strips inline `<img onerror>` (P0, fixed/info)
- Repro: append a block with content `<img src=x onerror="window.__xss_fired=true">XSS_PROBE` to a published page in localStorage. Visit /p/getting-started.
- Observed: "XSS_PROBE" text renders, but rendered HTML has no `onerror` and `window.__xss_fired` stays false.
- Expected: sanitized. PASS.

### B-3021 — Trash cascade restore — verified WORKS (P2, fixed/info)
- Repro: create parent + child page (parentId pointer), click `pmenu-trash-<parent>`, then `/app/trash` → `restore-<parent>`.
- Observed: both pages get isInTrash:true after parent trash; both get isInTrash:false after parent restore.
- Expected: cascade works. PASS.

### B-3022 — Trash route crashes on synthetic trashed DB (P1, open) — POSSIBLE regression
- Repro: inject a database into state.databases with `isInTrash: true` plus 2 rows (synthetic; no views array gaps but minimal title/properties/views/workspaceId). Navigate to /app/trash.
- Observed: full ErrorBoundary screen "This page didn't load — Cannot read properties of undefined (reading 'length')".
- Expected: graceful render. Likely missing defensive check on `views?.length` or `rows?.length` in TrashPage / database-trash-row component. The same DB renders fine when isInTrash:false.
- Implementer note: cannot reproduce purely via UI because trashing a DB inline-block from a page may add fields that synthetic state lacks; check the rendering selector for `db?.views?.length ?? 0`.

### B-3023 — Calendar route `/app/calendar` has 35 unlabeled day-add buttons (P3, open) — a11y
- Repro: visit /app/calendar, count buttons without aria-label / title / text.
- Observed: 35/153 unlabeled — all `[data-testid="day-add-YYYY-MM-DD"]` (icon-only Plus buttons in each cell).
- Expected: aria-label="Add event on May 13" (or similar). Other routes (/app, /app/inbox, /app/mail, /app/settings, /app/templates, /app/trash) all report 0 unlabeled.

### B-3024 — Comment threading renders nested (P2, fixed/info)
- Repro: inject parent comment with childrenIds:[child] + child with parentId:parent. Open comments-btn panel.
- Observed: both rendered. Child row is rendered INSIDE the parent container, in a `<div class="mt-2 pl-3 border-l border-border space-y-2">` indented block. `parent.contains(childRow) === true`.
- Expected: visual nesting + correct DOM hierarchy. PASS.

### B-3025 — 1000-keystroke perf flood on paragraph (P2, info)
- Repro: select paragraph block, run `for (i=0;i<1000;i++) document.execCommand('insertText',false,'a')`.
- Observed: 2048ms total, 2.049ms per character on a page with 17 blocks + an inline DB.
- Expected: <5ms/char target met. Sub-linear (no jank). Note: react re-renders are debounced — actual user keystrokes at 5-10/sec would see no degradation.

### B-3026 — ib-link Apply button click() no-op — Enter key works (P3, open) — refines B-3010
- Repro: open ib-link popover, set input value via native setter, dispatch input event, then click `[data-testid="ib-link-apply"]`.
- Observed: nothing happens. Apply handler is `onMouseDown` only (no `onClick`). `dispatchEvent(MouseEvent('mousedown'))` works, as does Enter on the input.
- Expected: either accept `click` OR add a hint. Real users who click do trigger mousedown so the issue is test-only — keep priority low. Drop B-3010 in favor of B-3026.

### B-3022 — Trash route crash on malformed DB — fixed (commit 005ce79)
- Fix: `app.trash.tsx` reads `d.rows?.length ?? 0` instead of `d.rows.length`. Verified: injecting a synthetic trashed DB without a `rows` array no longer throws; the row renders with "0 rows".

### B-3023 — Calendar `day-add-*` buttons unlabeled — fixed (commit 005ce79) — closes I-3000
- Fix: each Plus button now has `aria-label="Add event on <Month Day>"` (localized via `toLocaleDateString`) and `title="Add event"`. Verified 35/35 day-add buttons labeled on /app/calendar.

### B-3009 — `ib-color` missing aria-label — fixed (commit 005ce79) — closes I-3003
- Fix: explicit `aria-label="Text color"` added next to the existing `title`. Screen readers will now announce the "A" button correctly.

### B-3026 — `ib-link-apply` only responded to onMouseDown — fixed (commit 005ce79) — closes I-3004
- Fix: Apply button now has both onMouseDown and onClick handlers wired to `commitLink`. Automated `.click()` and synthetic dispatch both work; mouse-driven users keep the selection-preserving mousedown path.

### B-3011 — Cmd+K palette: surface block snippets — fixed (commit 005ce79) — closes I-3005
- Fix: queries ≥ 2 chars now produce a "Block matches" group with up to 5 snippets formatted as `"…<excerpt>…  ·  <page>"`. Clicking the result navigates to the parent page and scrolls + briefly ring-highlights the matched block via its `data-block-id` attribute. Verified: searching "OKR" returns two entries from the OKRs / OKRs (Copy) pages plus the regular Pages group.


## 2026-05-13 ~16:30 — QA agent verification batch (B-3100s)

### B-3100 — B-3022 trash crash on synthetic trashed DB — verified FIXED (P1, fixed)
- Repro: inject `{id:'db_synth_trash_3100', isInTrash:true, properties:{...}, views:[...]}` (no `rows` array) into `state.databases` for active workspace, navigate to /app/trash.
- Observed: route renders Trash heading; row appears as "Untitled database — 0 rows — Restore — Delete". No ErrorBoundary, no console error.
- Expected: graceful render with "0 rows". PASS.

### B-3101 — B-3023 / I-3000 calendar day-add aria-labels — verified FIXED (P3, fixed)
- Repro: visit /app/calendar, query `[data-testid^="day-add-"]`.
- Observed: 35/35 buttons have aria-label e.g. "Add event on 27 avril" and title="Add event". Locale-aware via toLocaleDateString.
- Expected: 35/35 labeled. PASS.

### B-3102 — B-3009 / I-3003 ib-color aria-label — verified FIXED (P3, fixed)
- Repro: open page with editable block, select text, inspect `[data-testid="ib-color"]`.
- Observed: aria-label="Text color" and title="Text color".
- Expected: parity with other ib-* buttons. PASS.

### B-3103 — B-3026 / I-3004 ib-link-apply via .click() — verified FIXED (P3, fixed)
- Repro: open ib-link popover, set input value via native setter, dispatch input event, call `apply.click()`.
- Observed: anchor `<a href="https://example.com/test3100">…</a>` wraps selection; popover closes.
- Expected: programmatic .click() commits link. PASS.

### B-3104 — B-3011 / I-3005 Cmd+K block snippets + scroll-into-view — verified FIXED (P2, fixed)
- Repro: open palette, type "o" (1 char) → no "Block matches" group. Type "orientation" → group surfaces with `cmd-block-blk_…` testid and snippet "¶…ome! Here's a quick orientation. EXTRA · TestColor". Click → palette closes, block element gets `ring-1 ring-blue-400`, scrollIntoView called on the exact `[data-block-id]` element.
- Expected: ≥2 char threshold, snippet group, click navigates & highlights. PASS on all counts.

### B-3105 — Trash cascade 3-deep root→mid→leaf — works (P2, fixed/info)
- Repro: synth 3 pages (root with childIds:[mid], mid with childIds:[leaf]+parentId, leaf with parentId), reload, click `pmenu-trash-root`. Check store; navigate /app/trash, click `restore-root`. Recheck store.
- Observed: trash sets isInTrash:true and identical trashedAt timestamp on all three; restore from root clears isInTrash on all three.
- Expected: cascading trash & restore. PASS.

### B-3106 — All 22 database property types render an appropriate cell editor (P2, fixed/info)
- Repro: inject new props of types text/number/select/multi-select/status/date/url/email/phone/checkbox/formula/files/person/created-time/created-by/last-edited-time/last-edited-by/unique-id/verification/button/rollup into db_b (array push), set view visibleProperties to all, reload, render `/app/p/<page>` with `database-inline` block.
- Observed: 23 columns render; each cell uses its dedicated data-testid (cell-text-, cell-number-, cell-date-, cell-checkbox-, cell-person-, etc.). created-time / last-edited-time / created-by / last-edited-by gracefully show "Invalid Date" / "—" when row lacks the metadata. unique-id auto-numbers (1, 2). Verification toggles to "Unverified". Button cell renders a button.
- Expected: every type renders. PASS.

### B-3107 — Formula cell shows "#ERR: Unexpected end" when `formula.formula` field is missing — but works with `formula.expression` (P3, open)
- Repro: create a formula property with `{formula:'prop("Title")'}` only. Cell renders #ERR. Add `{expression: same string}` (or set both) — works.
- Observed: parser appears to read `expression` (or treats missing as empty). The error string "Unexpected end" is also user-unfriendly for an empty expression.
- Expected: a) accept `formula` as an alias for `expression`, b) render a friendlier "—" or "(empty formula)" placeholder when no expression is set.

### B-3108 — Formula evaluator handles prop refs, arithmetic, if, concat, format — works (P2, fixed/info)
- Repro: add formulas `prop("Title")`, `prop("QA_number") * 2`, `if(prop("QA_number") > 10, "high", "low")`, `concat(prop("Title"), " · ", format(prop("QA_number")))` (set both `.formula` and `.expression`). Row values: Title="B item 1", QA_number=21.
- Observed: cells display "B item 1", "42", "high", "B item 1 · 21" respectively.
- Expected: correct evaluation across operators. PASS.

### B-3109 — Slash menu filter coverage is weak for plural keywords (P3, open)
- Repro: open empty block, type `/database` or `/data`. Only `slash-db-table` surfaces.
- Observed: `slash-db-board`, `slash-db-calendar`, `slash-db-gallery`, `slash-db-list`, `slash-db-timeline` don't match keyword "database" or "data".
- Expected: typing "database" / "data" filters to ALL `slash-db-*` items. Likely filter only matches the visible item title, not synonyms.
- Filter for "head" works perfectly (h1/h2/h3/toggle-h1/h2/h3), filter for "code" returns code-only — good baseline; gap is the database family.

### B-3110 — Markdown shortcuts all functional (P2, fixed/info)
- Repro: on fresh empty block, type each of `# `, `## `, `### `, `* `, `[] `, `> `, ```` ``` `` ```` (with trailing space). After each, store block.type checked.
- Observed: heading-1, heading-2, heading-3, bullet-list, todo, quote, code respectively.
- Expected: per spec. PASS.

### B-3111 — Inline toolbar `ib-color-default` does NOT unwrap colored span (P2, open)
- Repro: select text, apply `ib-color-red` (renders `<span data-color="1" style="color: rgb(220,38,38)">…</span>`). Reselect span content, open ib-color popover, click `ib-color-default`.
- Observed: span remains in DOM with red color & data-color attribute. No change after multiple attempts (with mousedown+mouseup+click).
- Expected: clicking "default" should unwrap the span (or set data-color="default" without inline style). Currently leaves the inline color in place.

### B-3112 — Synced block content propagates to refs — works (P2, fixed/info)
- Repro: synced-block `blk_mp33cd7dwqtkopvq` has 50 refs across pages. Mutated child block's `content` field → reload → navigate to OKRs page.
- Observed: all 50 `[data-block-id^="blk_perfref_"]` show the new text. (Note: mutating the source block's own `content` does not propagate because synced blocks render via `children`, not via the source's own content; only child mutations propagate.)
- Expected: refs reflect source children mutations. PASS.

### B-3113 — AI chat user input does NOT preserve newlines or render markdown in user bubble (P2, open)
- Repro: send multiline markdown message (`# H1\n## H2\n> quote\n- list\n  - nested\n\`\`\`js\nconst x=...\n\`\`\``) via ai-input.
- Observed: user bubble HTML is `<div class="whitespace-pre-wrap"># H1## H2### H3...```Inline `code`</div>` — newlines stripped to empty string when text crosses through input.value (because ai-input is `<input type="text">`, not textarea).
- Expected: either accept multi-line via Shift+Enter into a textarea, OR auto-convert `\n` literals during display.
- Side issue: assistant reply mangles the user prompt when extracting structure (drops "const" from code fence).

### B-3114 — AI chat input is `<input type="text">` not `<textarea>` (P3, open)
- Repro: query `[data-testid="ai-input"].tagName === 'INPUT'` and `.type === 'text'`.
- Observed: single-line input. Cannot enter newlines naturally. Pasting multi-line text strips newlines per single-line input semantics. This is the root cause of B-3113.
- Expected: a multi-line composer (textarea or contenteditable) like ChatGPT / Claude.

### B-3115 — Mobile sidebar open/close toggle works at 600x900 (P2, fixed/info)
- Repro: resize viewport to 600x900. Aside auto-collapses; `open-sidebar` button visible; click → aside slides in (width 256, left 0, `close-sidebar` button appears); click close-sidebar → aside hidden, open-sidebar back.
- Expected: collapsible mobile drawer. PASS.

### B-3116 — Page-options menu does NOT include "History" / version history (P2, open) — feature gap
- Repro: click `page-options`. Menu items: Remove from favorites, Duplicate, Turn into wiki, Word count, Copy link, Export as Markdown, Print/save as PDF, Move to teamspace, Move to Trash. No "Page history" or "Version history".
- Observed: page schema HAS a `history` field (array, present on all pages). Field is populated by some flow but no UI to view/restore versions.
- Expected: a "Page history" menu item that opens a list of saved versions with a restore button.

### B-3117 — Relations do NOT auto-create back-relations (P2, open) — feature gap
- Repro: db_b has `B→C` relation property pointing to db_c. r_b1 has value `[r_c1]`. Inspect db_c.properties — only Title and `C→A` (separate relation to db_a). No `C→B` back-relation property; r_c1.values lacks any reference to r_b1.
- Observed: directional relations only. Notion creates symmetric back-relations automatically when you add a relation.
- Expected: either auto-create the inverse property, OR add a "Show on related database" toggle in the relation property options.

### B-3118 — `row-open-*` buttons exist but don't open a row detail drawer (P1, open)
- Repro: on `/app/p/pg_mp33cd7d01u4huok` inline DB table, click `[data-testid="row-open-r_dt1"]`. No drawer/dialog appears.
- Observed: button click is a no-op (no DOM mutation). Both `[data-testid="row-detail"]` and `[role="dialog"]` queries return null after click.
- Expected: open a row detail side-panel showing all properties (especially useful for hidden/many properties).

### B-3119 — Cmd+K block-match threshold of ≥2 chars confirmed across queries (P2, fixed/info)
- Repro: open palette, sweep queries: "" (0c), "a" (1c), "ab" (2c), "abc" (3c), "OKR" (3c), "orient" (6c), "page" (4c).
- Observed: blocks count was 0/0/1/0/2/1/3 (only ≥2 chars surface blocks; "abc" had no matches, so 0 is expected). Pages count was 10/10/2/0/2/1/4 (default 10 when query is empty).
- Expected: ≥2 char threshold for block group. PASS.

### B-3120 — Public form roundtrip confirmed (P2, fixed/info)
- Repro: visit /form/db_dates_test/v_form, fill p_dt="QA_FORM_3119" + p_dn=999, click public-form-submit.
- Observed: row count 9→10, last row has `values:{p_dt:"QA_FORM_3119", p_dn:999}, createdBy:"public-form"`. "Thanks for submitting!" message shown.
- Expected: roundtrip writes host's localStorage. PASS.

### B-3121 — 50 DOM mutations within 220ms after one keystroke (P3, info)
- Repro: focus an editable block, attach MutationObserver to document.body (subtree+childList+attributes+characterData), call `document.execCommand('insertText', false, 'q')`, sleep 220ms.
- Observed: 50 mutations recorded. Total elapsed 236ms (mostly setTimeout overhead).
- Expected: indicates React re-renders cascading through siblings on every keystroke. Not jank but worth investigating memo placement on sibling Block components (probably a `useStore` selector that returns a new object each time).

### B-3107 — Formula property `formula.formula` alias + empty-expression UX — fixed (commit e9ff7b0) — closes I-3101
- Fix: `FormulaCell` in PropertyEditor.tsx now reads `property.expression ?? property.formula ?? ""` and short-circuits with an em-dash placeholder when the expression is empty/whitespace. Old "#ERR: Unexpected end" replaced by a friendlier `—` with a tooltip "Set an expression for this formula property".

### B-3109 — Slash menu filter doesn't match category/description — fixed (commit e9ff7b0) — closes I-3106
- Fix: `filterSlash` in slash-commands.ts now also matches against `cmd.category` and `cmd.description`. Verified: typing "database" surfaces all 8 db-* variants (slash-db-table, slash-db-board, slash-db-calendar, slash-db-list, slash-db-gallery, slash-db-timeline, slash-db-chart, slash-db-form). Plural keywords ("databases") also surface their entries through the description match.

### B-3111 — `ib-color-default` unwrap inside a colored span — fixed (commit e9ff7b0) — closes I-3103
- Fix: the unwrap path now walks up from `range.commonAncestorContainer` (plus startContainer + endContainer) instead of `sel.anchorNode.parentElement`. `selectNodeContents(span)` makes `sel.anchorNode === span` itself, so the old `.parentElement` walk skipped the colored ancestor entirely. Verified: a `<span data-color="1" style="color: rgb(220, 38, 38);">color</span>ful text` block becomes plain `colorful text` after selecting the span and clicking ib-color-default.

### B-3118 — `row-open-*` no-op in table view — false negative (info)
- Verified: clicking `[data-testid="row-open-r_dt1"]` DOES open the drawer with `data-testid="row-detail-drawer"`. The tester checked for `[data-testid="row-detail"]` (without the `-drawer` suffix), which doesn't exist. Drawer renders with role-equivalent semantics and a close button at `row-detail-close`. No code change needed.

### B-3200 — Duplicate slash menus appear when filter is reused in same block (P2, open)
- Repro: focus an empty contenteditable, set textContent to "/database" and dispatch input event; then change to "/data". Query `document.querySelectorAll('[data-testid="slash-menu"]').length`.
- Observed: 2 slash-menu instances render at the same position (top:8, left:0), each with the same 8 db-* slash items, yielding 16 visible items. Counts confirmed: every slash-db-* testid appears exactly twice.
- Expected: only one slash menu in the DOM at any time. Closing/reopening should unmount the previous instance, not leave it orphaned. Filtering should not produce stacked menus.
- Severity: P2 — Cmd+K result counts and downstream automation (and a11y trees) will see duplicates.

### B-3201 — Verification of fixes B-3107, B-3109, B-3111, B-3118 (info, fixed)
- B-3107: confirmed `prop("Title")` returns title value ("Early"); empty expression renders em-dash placeholder span (`text-muted-foreground italic` with title="Set an expression for this formula property").
- B-3109: `/database` shows all 8 db-* variants (table, board, calendar, list, gallery, timeline, chart, form). `/databases` plural works too.
- B-3111: not re-verified yet (separate iteration below).
- B-3118: drawer testid is `row-detail-drawer` — previous report used the wrong selector. Will re-confirm in this run.

### B-3202 — Slash menu /list filter omits To-do (P3, open)
- Repro: focus an empty paragraph, type `/list`. Check `[data-testid^="slash-"]` items.
- Observed: shows slash-bullet, slash-numbered, slash-toggle, slash-db-list. To-do is missing.
- Expected: Per fix-verification note, `/list` should match to-do (since to-do is conceptually a list with checkboxes). Either include "list" in to-do's category/keywords or make filterSlash also walk the keywords array.
- Severity: P3 — minor discoverability.

### B-3203 — B-3116 still open: no page version history UI (P2, open)
- Repro: open page-options (`[data-testid="page-options"]` button at top of any page). Inspect menu items.
- Observed: menu items are: Remove from favorites, Duplicate, Turn into wiki, Word count, Copy link, Export as Markdown, Print / save as PDF, Move to [teamspace…], Move to Trash. No "History" / "Version history".
- Expected: an entry to view past snapshots, given `page.history: []` is part of the schema.

### B-3204 — Trashed database shows "0 rows" even when row data still in store (P2, open)
- Repro: navigate `/app/trash`. The trashed db `db_synth_trash_3100` is labelled "🧪Untitled database 0 rows Restore Delete".
- Observed: the badge shows "0 rows" even though prior tests created rows in this DB (and the localStorage state still references rows for active databases). Either the trash page is reading from a different row source or the soft-deleted DB has its rows wiped on trash (data loss).
- Expected: if rows survive trashing (Notion does keep them so Restore works), count should reflect that. If they're wiped, Restore won't restore data — confirm intent.


### B-3205 — P0 CRASH: /app/calendar throws `db.properties.find is not a function` (P0, open)
- Repro: navigate to `/app/calendar`. Page immediately renders the error boundary "This page didn't load — db.properties.find is not a function". Try Again does NOT recover.
- Stack: `CalendarPage` at `src/routes/app.calendar.tsx:61:38` inside `useMemo`. Implies `db.properties` is now an object (or undefined) instead of an array. Likely a recent schema migration introduced `properties` as a record, but CalendarPage still calls `.find()` on it.
- Observed: top-level route is broken; users cannot view calendar at all.
- Expected: render the calendar even when no database is configured, or guard `Array.isArray(db?.properties)` before calling `.find`.
- Severity: P0 — complete feature outage.

### B-3206 — P0 CRASH: Cmd+K palette throws `Cannot read properties of undefined (reading 'toLowerCase')` once user types a query (P0, open)
- Repro: on any page, press Cmd+K (palette opens cleanly with empty query). Type any letter (e.g. "O" for "OKR"). Error boundary instantly renders "This page didn't load — Cannot read properties of undefined (reading 'toLowerCase')". The whole route is replaced by the error boundary; only Reload/Go home recover.
- Stack: `CommandPalette` at `src/components/command/CommandPalette.tsx:53:50` inside `Array.filter` over a `useMemo`. One of the searchable items has an undefined title/name; the filter calls `.toLowerCase()` on it unconditionally.
- Observed: palette is unusable for any non-empty query — primary discovery surface dies after a single keystroke.
- Expected: filter callback should coalesce `(item.title ?? item.name ?? '').toLowerCase()`.
- Severity: P0 — primary discovery surface goes dark.

### B-3207 — Comment replies cannot have their own replies (single-level threading only) (P3, open)
- Repro: open comments, post a comment, click Reply, post a nested reply. Inspect the reply DOM for a Reply button.
- Observed: the reply only has a Delete button — no "Reply" / "post-reply" button on the reply itself. Threading depth caps at 1 level.
- Expected: Notion supports threading depth (replies can be replied to, with visible indentation per level). Either add nested reply support or document explicitly that threading is single-level.
- Indent: replies are indented 13px from parent (works visually).

### B-3208 — Reply Post button testid is `reply-submit-*` not `post-reply-*` (P3, info)
- Confirmed: `[data-testid^="reply-submit-"]` posts the reply. The "post-reply-*" naming was a tester guess.
- Severity: P3 — naming inconsistency vs `post-comment` for the top-level form. Consider renaming to `post-reply-<id>` for symmetry.

### B-3209 — Performance: keystroke now triggers only 2 mutations (was 50) — improvement (P3, info/fixed)
- Repro: focus an editable, attach MutationObserver to body (childList+subtree+attributes+characterData), call `document.execCommand('insertText', false, 'q')`, sleep 220ms.
- Observed: 2 mutations. Previously B-3121 reported 50.
- Conclusion: B-3121 / I-3108 looks effectively addressed (perhaps memoization was applied). Should be promoted to "fixed" pending an explicit confirmation in source.


### B-3205 — /app/calendar crash on malformed DB — fixed (commit 7cf7822) — P0
- Fix: app.calendar.tsx now skips any DB where `Array.isArray(db.properties)` or `Array.isArray(db.rows)` is false. Calendar route renders normally even when the store contains a synthetic / migration-tail DB with no properties array. Verified: injecting `{id, isInTrash:false}` (no properties / rows) no longer trips the ErrorBoundary.

### B-3206 — Cmd+K palette crash on undefined title/name — fixed (commit 7cf7822) — P0
- Fix: CommandPalette filter now uses `(p.title ?? "").toLowerCase()`, `(d.name ?? "").toLowerCase()`, and iterates `p.blocks ?? []` so a page persisted without a title (older schema, malformed write) cannot kill the palette on a single keystroke. Verified: injecting a page `{id, blocks: []}` (no title) and typing "O" returns 17 results, no ErrorBoundary.


### B-3205 (re-verified) — Calendar route resilient to malformed DB — confirmed fixed P0
- Repro: inject `{id:"db_malformed_v34", isInTrash:false}` (no `properties`, no `rows`) into `notion-clone:user:<uid>`, dispatch StorageEvent, navigate to `/app/calendar`.
- Observed: heading "Calendar" renders. No error-boundary text. No console error.
- Status: fixed — guard holding across iterations.

### B-3206 (re-verified) — Cmd+K palette resilient to malformed page — confirmed fixed P0
- Repro: inject `{id:"pg_malformed_v34", blocks:[]}` (no title), open Cmd+K, type "O".
- Observed: 17+ items render (commands + pages + DBs), no "toLowerCase" error, no boundary text.
- Status: fixed — guard holding.


### B-3210 — AI input is single-line `<input type="text">` — multiline prompts impossible (P2, open)
- Repro: open Ask AI panel. Set `aiInputEl.value = "Line1\nLine2\nLine3"` then trigger input. Read back `aiInputEl.value`.
- Observed: value is `"Line1Line2Line3"` (length 15 vs 17). Newlines silently stripped. Submitting "# H\n## H2\n- item" renders user bubble as "# H## H2- item" all on one line. The bubble container has `whitespace-pre-wrap` so it WOULD render newlines if any were present — they're lost at the input layer.
- Expected: AI prompts often span multiple lines (code, structured questions). Use a `<textarea>` (with Shift+Enter for newline, Enter to send) or contenteditable.
- Severity: P2 — limits effective AI usage; users can't paste multi-line code.

### B-3211 — AI assistant does not reply when message is sent via programmatic input event (P3, info)
- Repro: set `ai-input` value via React-aware setter + dispatch `input` event, click `ai-send` (no form submit).
- Observed: the user bubble appears (`ai-msg-9 = "hello AI"`) but no assistant response is appended, even after 6s+ wait. Dispatching `form.submit` event also did not trigger response on subsequent sends.
- Note: prior bubbles (ai-msg-0..7) show the assistant DID respond for organic clicks, so the dispatch path likely diverges from the React onSubmit handler. Probably a test-only artifact rather than a user-facing bug.
- Severity: P3 — flag for engineers as possible E2E test instability.

### B-3212 — Relation→Rollup type change leaves rollup unconfigured (targetPropertyId="") (P2, open)
- Repro: on db_a, open `prop-header-p_a_to_b` (a relation prop), choose "rollup" type.
- Observed: state mutates to `{type:"rollup", function:"count", relationPropertyId:"p_a_to_b", targetPropertyId:""}`. Notice `relationPropertyId` == own id (self-referential, nonsensical) and `targetPropertyId` is empty.
- Expected: when converting a relation prop to a rollup, either (a) preserve link to that relation as the source relation but keep them as separate properties, or (b) open a configuration UI to pick `relationPropertyId` (a different prop) and `targetPropertyId` (a property in the related DB) before persisting. Self-pointing `relationPropertyId` will likely throw downstream when the rollup tries to traverse.
- Severity: P2 — silent data-shape corruption; rollup is unusable in this state.


### B-3213 — Calendar event chips not draggable, drag-reschedule unimplemented (P2, open)
- Repro: navigate to `/app/calendar` with seeded events. Inspect any event chip (e.g. "Test event B21" in `day-2026-05-12`).
- Observed: chip is a plain `<div>` (style background-color), `draggable=false`, no `ondragstart`. Drop-targets on `day-YYYY-MM-DD` cells exist but no drag source.
- Expected: B-2907 wants drag-reschedule. Add `draggable=true` + dragstart/dragend handlers on event chip; on drop into another `day-*` cell, update `event.date`.
- Severity: P2 — primary calendar feature in Notion; visible regression.

### B-3214 — Form view: required Title not enforced; empty submission creates a blank row (P2, open)
- Repro: Form view of `db_dates_test` (testid `db-view-v_form`). Click `form-submit-v_form` without filling any field.
- Observed: row count goes 10 → 11; new row has `values: { p_dt: "" }`. No visible validation error.
- Expected: Form should require at least the title; submit button disabled until non-empty, or shows inline error.
- Severity: P2 — pollutes the DB with empty rows; form misses its primary contract.

### B-3215 — Performance regression: keystroke triggers ~20 DOM mutations (was 2 in B-3209) (P2, open)
- Repro: focus an editable block, attach MutationObserver to body (childList+subtree+attributes+characterData), call `document.execCommand('insertText', false, 'q')`, sleep 220ms. Repeat ×3.
- Observed: 20, 20, 20 mutations (consistent). Previously B-3209 reported 2 after I-3108 work.
- Likely cause: a re-render of a sibling collection (toolbar, formatting menu) on each keystroke. Compare against the iteration where the count was 2 — find the diff.
- Severity: P2 — visible regression vs the documented win.

### B-3216 — Mobile sidebar: open sidebar has no backdrop / no auto-close on link click (P3, open)
- Repro: viewport 375×667, navigate to `/app/home`, click `open-sidebar`. Sidebar slides in (absolute position, w-64 = 256px). Click a sidebar link (e.g. `sidebar-calendar`).
- Observed: no semi-transparent backdrop overlay behind the sidebar; clicking outside the sidebar does not auto-close it; navigating to a new route also leaves it open.
- Expected: mobile drawer pattern — backdrop dims main content + closes on outside-tap, and link clicks dismiss the drawer so the user can see the destination.
- Severity: P3 — usability nuisance, but does not block functionality.

### B-3217 — Icon-only buttons missing aria-labels: `close-ai`, `ai-send` (P3, open)
- Repro: any route, AI panel open. Inspect `button[data-testid="close-ai"]` and `button[data-testid="ai-send"]`.
- Observed: both buttons render only an SVG icon; no `aria-label`, no `title`, no visually-hidden text.
- Expected: aria-label "Close AI panel" / "Send message" for screen reader users.
- Severity: P3 — accessibility regression. Note: other icon buttons in the same panel correctly have aria-labels.


### B-3218 — Many DB property types not rendered in row cells (P1, open)
- Repro: navigate `/app/db/db_b` (a.k.a. QA DB with all property types). db_b has 26 properties including formula×4, rollup, files, created-time, last-edited-time, created-by, last-edited-by, verification, unique-id.
- Observed: row UI only renders cells for: title, relation, text, number, select, date, url, email, phone, checkbox, person, button. **Missing in DOM**: formula, rollup, files, created-time, created-by, last-edited-time, last-edited-by, verification, unique-id.
- Expected: every property in `db.properties` should have a corresponding row cell (read-only for system properties like created-time / unique-id). Either render placeholders or skip the property header — currently the header (e.g. `prop-header-p_qa_formula_3106 "∑QA_formula"`) sits above nothing.
- Severity: P1 — visible UI/data mismatch; formula values never display even with a valid expression. This likely explains why B-3107 still feels unfixed — there's nowhere to see the computed formula result.

### B-3219 — Page-options menu does not open via programmatic click events (P3, info)
- Repro: navigate to any page. Find `[data-testid="page-options"]`. Dispatch `click`, `mousedown+mouseup`, or MouseEvent with coordinates.
- Observed: no portal opens. No `[role="menu"]` appears. The same button clicked manually works.
- Cause: likely a Radix/PopperJS pointer-event handler binding that needs synthetic pointer events. E2E test impact only.
- Severity: P3 — flag for E2E testing infrastructure.


### B-3220 — Trash db row-count display ALWAYS reads "0 rows" even when rows exist (P2, open — confirms B-3204)
- Repro: programmatically create a database `db_3300_trash_with_rows` with `isInTrash:true` and three rows whose `databaseId` matches; dispatch StorageEvent. Navigate to `/app/trash`.
- Observed: Trash page row shows "🗑Trash with rows 3300 **0 rows** Restore Delete" despite `Object.values(state.rows).filter(r => r.databaseId === id).length === 3`.
- Expected: count should reflect actual referenced rows so user knows what they're about to permanently delete.
- Severity: P2 — misleading; users may delete-without-restore thinking the DB is empty.

### B-3221 — Restore DB does not clear `trashedAt` timestamp (P3, open)
- Repro: trash `db_mixed`, navigate to `/app/trash`, click `restore-db-db_mixed`.
- Observed: `isInTrash` correctly set to `false`. `trashedAt` left at the stale timestamp (1778641383050 in this run).
- Expected: also reset `trashedAt = null` on restore. Leaving the field populated risks confusing later audit logic.
- Severity: P3 — data hygiene only.

### B-3218 — Missing DB cell testids — fixed (commit b002171) — closes I-3208
- Fix: PropertyEditor.tsx now emits `data-testid="cell-<type>-<row>-<prop>"` for formula, rollup, files, verification, unique-id, created-time, last-edited-time, created-by, last-edited-by. The cells were rendering all along — they just lacked testid markers so the tester's `[data-testid^="cell-"]` sweep filtered them out and concluded the types weren't wired.

### B-3217 — close-ai and ai-send missing aria-labels — fixed (commit b002171)
- Fix: AIChat.tsx adds `aria-label="Close AI chat"` to the X button and `aria-label="Send message"` to the submit button, with matching `title` attrs.

### B-3221 — restore-DB didn't clear `trashedAt` — fixed (commit b002171)
- Fix: TrashPage's restore-db click now passes `{isInTrash: false, trashedAt: null}` to `updateDatabase`, matching the page-restore behaviour.


## Batch 24 — verification pass (2026-05-13)

### B-3218 — DB cell testids — re-verified fixed (P1, fixed)
- Navigated to `/app/p/pg_qa_dbb_3106` (the QA-all-types DB). Counted 52 cells in DOM.
- Confirmed presence of: cell-formula-*, cell-rollup-*, cell-files-*, cell-verification-*, cell-unique-id-*, cell-created-time-*, cell-last-edited-time-*, cell-created-by-*, cell-last-edited-by-*.
- All formula variants render (formula, formula2, formula3, formula4). Closes I-3210.

### B-3217 — AI panel aria-labels — re-verified fixed (P3, fixed)
- `close-ai` has `aria-label="Close AI chat"` and `title="Close"`.
- `ai-send` has `aria-label="Send message"` and `title="Send"`. Closes I-3209.

### B-3205 / B-3206 — P0 crash regressions — re-verified holding (P0, fixed)
- Navigated /app/home → /app/p/pg_qa_dbb_3106 → /app/calendar → /app/trash.
- No window.error fired. Pages render cleanly. No regression observed.

### B-3221 — Restore DB clears `trashedAt` — code-level fix verified (P3, fixed)
- Could not exercise via localStorage injection: store is hydrated from Supabase (per-user keys in localStorage are empty after auth), so injected DBs do not surface in the UI.
- Per the commit b002171 diff (TrashPage restore-db click now passes `{isInTrash:false, trashedAt:null}`), the symmetric inverse is satisfied.
- Recommend wiring an E2E that exercises the live Supabase path next time we have a fresh DB to trash.

### B-3400 — view-menu click crashes DB page (P0, open) — REGRESSION
- Repro: navigate `/app/p/pg_qa_dbb_3106`, click `[data-testid="view-menu-v_b"]`.
- Observed: page replaced with global error boundary: "This page didn't load… Cannot read properties of undefined (reading 'includes')". 100% reproducible across reloads.
- Expected: a view-options menu (rename, delete, filter, sort) should pop open without crashing.
- Severity: P0 — entire DB page becomes unrecoverable until reload; users cannot edit view settings, configure filters, or change view names.
- Likely cause: a property of the view (filters? sortBy? hiddenProperties?) is `undefined` and the menu code does `something.includes(...)` on it.

### B-3214 — empty form submit still creates row (P2, open — unchanged)
- Repro: navigate `/form/db_dates_test/v_form`, click `[data-testid="public-form-submit"]` without filling any field.
- Observed: success message "Thanks for submitting!" appears immediately; row is created in db_dates_test.
- Expected: client-side validation should block submission of all-empty required fields, OR title should be enforced as required (matches I-3207).

### B-3215 — keystroke mutation perf — re-measured fixed (P2, fixed)
- Re-ran the typing experiment on `block-content-blk_*` with a MutationObserver attached to document.body.
- Observed: 2 mutations per keystroke for 3 consecutive keypresses (h, i, s). Down from 20 prior to fix; meets the ≤20 target with margin.

### B-3210 — AI input still single-line `<input type=text>` (P2, open — unchanged)
- `[data-testid="ai-input"]` is `<INPUT type="text">` with no rows attr. Shift+Enter cannot insert newlines.
- See I-3204.

### B-3212 — relation→rollup type-change not testable here (P2, info)
- No visible UI surface to change a property's type. The prop-header menu only exposes `prop-rename-*`, `prop-delete-*`, and (for relation) `rel-target-*` / `rel-dual-*`. No `prop-type-*` selector found anywhere in DOM.
- Implication: B-3212 cannot regress because there is no end-user path to flip type. Still file I-3205 as a missing feature.

### B-3401 — Slash menu /math item exists but `/equation` does not (P3, open)
- Repro: type `/` in an empty block, look for slash items.
- Observed slash items include: `slash-math` (no `slash-equation`). User testing expected `/equation` per the brief — current label is /math (the rendered name in the menu reads "Math").
- Expected: provide both aliases or rename to /equation to match Notion's convention. Minor naming issue, but discoverability suffers.

### B-3402 — Markdown shortcut "1. " converts block but data-placeholder reads "List" (P3, info)
- Repro: in an empty block, type `1` then `.` then space.
- Observed: block's `data-placeholder` becomes "List" (it's now a numbered list block); list rendering works.
- Note: This is success, not a bug — recorded for tracking. No `<ol>` is used; the renderer uses a custom list block. If the user expects an HTML `<ol>` for accessibility / copy-paste fidelity, see I-3401.

### B-3403 — Block handle menu only exposes Delete (no Duplicate / Turn into) (P2, open)
- Repro: navigate to any page with blocks. Hover a paragraph block, click `handle-<id>`.
- Observed: only `menu-delete-<id>` appears. No `menu-duplicate-<id>`, no `menu-turn-into-<id>`, no `menu-copy-link-<id>`, no `menu-color-<id>`.
- Expected (Notion parity): handle menu should include Delete, Duplicate, Turn into (block type submenu), Copy link, Move to, Comment, Color.
- Severity: P2 — block manipulation is the core editor surface. Forces users to retype or restructure manually.

### B-3404 — Comments lack edit/delete affordances (P2, open)
- Repro: open `comments-btn` on a page, type into `comment-input`, click `post-comment`. Comment posts inline.
- Observed: posted comment has no `comment-edit-*` or `comment-delete-*` testids; no visible edit/delete buttons.
- Expected: each posted comment row should allow author to edit and delete; admins to delete others'.
- Severity: P2 — once posted, comments are immutable; common typos cannot be fixed.

### B-3405 — Cmd+/ does not open slash menu from keyboard (P3, open)
- Repro: focus an editable block, press Cmd+/.
- Observed: no menu opens; the `slash-menu` testid is not added to the DOM.
- Expected: Cmd+/ should toggle the same slash menu that `/` opens (Notion compat). The current implementation only triggers slash menu on `/` character input.

### B-3406 — Cmd+] / Cmd+[ keyboard indent has no effect (P3, open)
- Repro: focus an editable text block, press Cmd+] or Cmd+[.
- Observed: no change to block marginLeft/paddingLeft; no nesting occurs.
- Expected: indent/outdent the current block (Notion: Tab and Shift+Tab also do this).

### B-3407 — Cmd+Shift+H reported but cannot be verified — block already H1 (P3, info)
- Repro: focus H1 block; press Cmd+Shift+H.
- Observed: tag stays H1 (idempotent for H1, but does not toggle off to paragraph). Could not verify on a non-heading block in this session due to focus issues.

### B-3408 — Filter/sort/group UI unreachable due to view-menu P0 crash (P1, blocked)
- See B-3400. The view-menu is the entry point to filter/sort/group config and currently crashes. As a result, B-3208 / B-3209 (DB filter/sort operator coverage) cannot be exercised.
- Severity: P1 — blocks an entire feature area until B-3400 is fixed.

### B-3409 — Synced block source-content edits propagate (P0 acceptance, fixed/works)
- Repro: `/app/p/pg_mp33cd7d01u4huok` has a SOURCE synced block and a REFERENCE block sharing `blk_syncedchild_1778627070687`. Edited the source by appending `_X3400`.
- Observed: both source and reference rendered the same updated text immediately. Behaviour is correct.

### B-3410 — pmenu-trash works end-to-end (P1 acceptance, fixed/works)
- Repro: clicked `pmenu-trash-pg_mp3avk3u6v0vm679` from sidebar. Page disappeared from sidebar. Navigated `/app/trash` — page listed with timestamp + Restore + Delete. Clicked Restore — page returned.
- No errors observed.

### B-3411 — Comment post works (P3 acceptance)
- Posting via `comment-input` + `post-comment` succeeds; comment renders in the side panel. (Edit/delete is missing — see B-3404.)

### B-3412 — Inline toolbar missing underline (P3, open)
- Repro: select text in any block, observe inline toolbar.
- Observed: `ib-bold, ib-italic, ib-strike, ib-code, ib-link, ib-color, ib-ai`. No underline button.
- Expected: Notion ships Cmd+U underline. Either add `ib-underline` or wire Cmd+U keyboard shortcut.
- Severity: P3 — accessibility convention gap.

### B-3413 — Settings dark mode toggle works + persists across navigation (acceptance)
- Repro: settings → click `dark-btn`. `documentElement.classList` adds `dark`; body bg goes oklch(0.129…). Navigate to `/app/home` — dark stays on.
- Behaviour is correct.

### B-3414 — URL cell sanitizes `javascript:` (acceptance partial)
- Repro: set `cell-url-r_b1-p_qa_url_3106` to `javascript:alert(1)` and blur.
- Observed: value is stored as plain text; no `<a href="javascript:...">` rendered in the cell. Effective XSS surface is suppressed.
- Note: did not verify `<svg onload>` / `<iframe srcdoc>` paths in this session as those require public-page render path.

### B-3415 — Cmd+K spotlight works + 62ms type-to-results latency (acceptance)
- Repro: Cmd+K opens `command-input` dialog. Typing "meeting" filters list in 62 ms across the user's current pages/dbs (~30 entries). Adequate.
- Did not stress at 1k pages — workspace doesn't have that many.

### B-3416 — Comment input + post round-trip (acceptance)
- See B-3411.

### B-3417 — `view-menu-v_b` crash on fresh load (P0 regression, open) — confirms B-3400
- After full page reload + login, clicking `view-menu-v_b` still triggers the same global error boundary "Cannot read properties of undefined (reading 'includes')". 100% reproducible.
- Severity: P0.

### B-3400 / B-3408 / B-3417 — view-menu crash on undefined hiddenProperties — fixed (commit e878544) — P0 REGRESSION
- Fix: ViewMenu in InlineDatabase.tsx now reads `const hidden = view.hiddenProperties ?? []` at the top of the `db.properties.map(...)` callback and uses it for both the checkbox state and the toggle handler. View documents written before the field existed (or after malformed import) no longer crash the entire DB page. Verified: setting hiddenProperties to undefined and opening the menu renders view-delete-* and view-addprop-* items, no ErrorBoundary trip.
- Also unblocks B-3408 (filter/sort/group UI unreachable due to crash).

### B-3412 — Inline toolbar lacked underline — fixed (commit e878544) — closes I-3211
- Fix: Added a new ib-underline button between italic and strikethrough, wired to `exec("underline")` and the existing `active.underline` toggle state.

### B-3500 — view-menu hiddenProperties undefined fix VERIFIED (P0 acceptance, fixed)
- Repro: injected `db_dates_test` with view `v_dates_test` carrying `hiddenProperties: undefined` into localStorage; fired synthetic StorageEvent.
- Action: clicked `view-menu-v_dates_test`.
- Observed: menu opens with `view-rename-`, `view-delete-`, `add-sort-`, `add-filter-`, `view-addprop-` testids; no ErrorBoundary trip; `window.onerror` never fired.
- Conclusion: defensive `view.hiddenProperties ?? []` (commit e878544) holds against undefined. Closes B-3400 / B-3417.

### B-3501 — Inline toolbar Underline button VERIFIED (P3 acceptance, fixed)
- Repro: focused `[data-testid="block-content-blk_mp39bwborucqkom3"]` ("hello world"), selected first 5 chars, clicked `[data-testid="ib-underline"]`.
- Observed: innerHTML became `<u>hello</u> world`. Tooltip/aria-label is "Underline". Toolbar order is bold → italic → underline → strike → code → link → color → ai.
- Conclusion: closes B-3412 / I-3408. Note: only the explicit click path was tested — Cmd+U keybinding was not exercised (still listed as P3 nice-to-have in I-3408).

### B-3502 — Slash menu coverage: math, breadcrumb, toc, callout, embed, synced, synced-ref ALL WORK (acceptance)
- Repro: for each, create an empty block via plus button, focus, type `/`, click the slash item.
- Observed (data-block-type after click):
  - `slash-math` → `equation`
  - `slash-breadcrumb` → `breadcrumb`
  - `slash-toc` → `table-of-contents`
  - `slash-callout` → `callout`
  - `slash-embed` → `embed`
  - `slash-synced` → `synced-block`
  - `slash-synced-ref` → `synced-block-ref`
- No `slash-sub-page` item exists; nested pages must be created via `slash-page` (which produces a `sub-page`). See B-3503.

### B-3503 — No `slash-sub-page` alias / item (P3, open)
- The slash menu has `slash-page` (produces a `sub-page` block per state.allTypes earlier). Typing `/sub-page` doesn't surface a separate entry because filter matches `page` only.
- Expected: either add `slash-sub-page` testid OR ensure the search filter matches the substring "sub" against "Sub-page" (i.e. alias).
- Severity: P3 — minor discoverability.

### B-3504 — Color over bold span: bold preserved on apply AND on default reset (acceptance)
- Repro: set block innerHTML to `<b>BOLD</b>NORMAL`, selected chars 2..6 (overlapping the bold boundary).
- Apply red: `<b>BO</b><span data-color="1" style="color: rgb(220, 38, 38);"><b>LD</b>NO</span>RMAL` — bold preserved inside the new color span.
- Apply default to the colored span: `<b>BO</b><b>LD</b>NORMAL` — color span removed, bold preserved (split across two `<b>` tags but visually identical).
- Conclusion: B-3111 regression check passes. The color tool no longer destroys bold formatting on either apply or reset.

### B-3505 — Page-options menu items inventory (info)
- Clicked `[data-testid="page-options"]` on `/app/p/pg_mp33cd7d01u4huok`. Menu items found:
  - `page-opt-favorite` (toggles "Remove from favorites" / "Add to favorites")
  - `page-opt-duplicate`
  - `page-opt-wiki` ("Turn into wiki")
  - `page-opt-wordcount` ("Word count")
  - `page-opt-copylink`
  - `page-opt-export-md`
  - `page-opt-print` ("Print / save as PDF")
  - `page-opt-move-<teamspaceId>` (one per teamspace: Private, Engineering, Shared)
  - `page-opt-trash`
- Coverage gaps vs Notion: no "Lock page", no "Customize page", no "Page history", no "Connect to GitHub/Slack". Logged as I-3500.

### B-3506 — DB live filter "contains" works (acceptance)
- Repro: opened `view-menu-v_dates_test` → `add-filter-v_dates_test`. Filter row defaults to property=Title, operator=contains. Typed `alp` in the value input.
- Observed: row list updated immediately from 3 rows ("alpha","beta","gamma") to 1 row ("alpha"). No reload needed.
- Live filter works for text columns.

### B-3507 — `prop-header-*` click does NOT toggle sort (P2, open)
- Repro: clicked `prop-header-p_dn` (Score column) once, then again. Set values 30/10/20.
- Observed: row order unchanged after either click. Popup that opens is the property menu (Rename / change type / Delete property), not a sort affordance.
- Expected (per brief / Notion parity): single click on the header should sort asc; second click should toggle desc. Currently the only path to sort is `view-menu → add-sort`.
- Severity: P2 — fundamental DB interaction gap. See I-3501.

### B-3508 — AI input still single-line `<input type=text>` and strips `\n` (P2, open — regression of B-3210)
- Re-verified on `[data-testid="ai-input"]`. Setting `.value = "L1\nL2\nL3\nL4\nL5"` via React property setter results in `value === "L1L2L3L4L5"` and the message renders on a single line in the thread.
- Shift+Enter keydown does NOT insert a newline (`value` stays `""` after the keystroke).
- Severity: P2 — confirms B-3210 is still open; closes the multiline retest task.

### B-3509 — Cmd+K block match navigates + scrollIntoView + ring highlight (acceptance)
- Repro: Cmd+K → typed "Sidebar" → clicked `cmd-block-blk_mp33cd7dvqv4tzkr`.
- Observed: command palette closed; target block on `/app/p/pg_mp33cd7d01u4huok` received `ring-1 ring-blue-400` classes (visible visual ring). DOM confirmed `class="... ring-1 ring-blue-400"`.
- Closes the brief's "scrollIntoView with ring highlight" sub-task. Works.

### B-3510 — Markdown export elides inline DB content (P2, open)
- Repro: opened `page-options` → `page-opt-export-md` on `/app/p/pg_mp33cd7d01u4huok`. Captured the Blob via `URL.createObjectURL` spy.
- Observed: the inline DB `blk_db_test` (Dates Test) is serialized to a single line: `<!-- (embedded database) -->`. No table, no property headers, no row values.
- Expected: render the database as a markdown table (or at least a header + row dump) so exported docs aren't lossy. Notion's Markdown export includes a full DB dump.
- Severity: P2. See I-3502.

### B-3511 — Markdown export comments: synced source labelled as "no source" even when source block exists (P3, open)
- In the same export, the SYNCED_CHILD_UPDATED_3109_X3400 reference block produces `<!-- synced reference: no source -->` despite the source block existing on the same page (B-3409 confirmed source resolves at runtime).
- Severity: P3 — minor lying in exported docs.

### B-3512 — Markdown export: empty image/video/file/equation blocks emitted with no informative placeholder (P3, open)
- Multiple `<!-- (empty image block) -->`, `<!-- (empty video block) -->`, `<!-- (empty file block) -->`, and bare `$$\n\n$$` blocks appear because the source page contains throwaway placeholders. The exporter could omit empty-payload blocks entirely, or at least retain the block ID for traceability.
- Severity: P3 cosmetic.

### B-3513 — Calendar event chip not draggable (P2, open — regression of B-2907)
- Repro: `/app/calendar`, created event "DragMe3500" on 2026-05-15 via `day-add-2026-05-15` + `cal-compose-title` + Enter.
- Observed: rendered chip is `<div class="text-xs mt-0.5 px-1 py-0.5 rounded truncate">DragMe3500</div>` with `draggable=false` and no testid. No drag/drop handlers visible. Cannot move event by dragging onto another day.
- Expected: chip should be `draggable=true` and accept drop on `day-YYYY-MM-DD`. Event date should update + persist.
- Severity: P2 — calendar's primary interaction is missing.

### B-3514 — Calendar event chip has no testid (P3, open)
- Same chip above also has no `data-testid` (e.g. `cal-event-<id>`). Makes the calendar surface essentially untestable from QA scripts.
- Trivial fix: add `data-testid={\`cal-event-${event.id}\`}` to the chip element.

### B-3515 — Public form accepts fully-empty submission (P2, open — regression of B-3214)
- Repro: `/form/db_dates_test/v_form`, clicked `public-form-submit` with all fields blank.
- Observed: form switches to "Thanks for submitting!" view. No client-side validation messaging.
- Expected: at minimum title should be required; ideally `<input required>` on title field + visible error state.
- DOM inspection: every form `<input>` has `required=false` and no `name` / `data-testid`. Missing all validation hooks.
- Severity: P2 — public form is the data-collection entry point. Logged as I-3503 and I-3504.

### B-3516 — Cross-tab StorageEvent does NOT trigger rehydrate / new page render (P1, open)
- Repro: on `/app/p/pg_mp33cd7d01u4huok`, injected a new page object into `state.pages[...]` (full schema with all 24 fields), wrote back via `localStorage.setItem`, fired synthetic `StorageEvent` matching the same key.
- Observed: localStorage updated successfully, but the page does NOT appear in the sidebar — neither immediately after the storage event nor after a full `location.reload()`. The previously-existing `CROSS_TAB_PROBE_1778637467940` page (which renders) is NOT even present in localStorage; it appears to be supplied by a separate seed source.
- Conclusion: client state lives in something other than the persisted snapshot for at least some seed-derived pages, so cross-tab edits to localStorage don't propagate. Either (a) wire a real storage listener that does a `useStore.persist.rehydrate()`, or (b) document that cross-tab is unsupported.
- Severity: P1 — multi-tab editing is silently broken; users editing in tab B see no updates in tab A.

### B-3517 — Performance: 200 keystrokes flood = 2.47 ms/char (acceptance)
- Repro: focused an empty block, ran 200 × `document.execCommand('insertText','a')` in a tight loop.
- Observed: total ~495 ms, ~2.47 ms/char, finalLen=200 (no dropped chars). Acceptable for current scale.

### B-3518 — A11y unlabeled-button sweep: 0 unlabeled across 7 routes (acceptance)
- Routes swept: `/app/home`, `/app/inbox`, `/app/calendar`, `/app/templates`, `/app/settings`, `/app/p/pg_mp33cd7d01u4huok`, `/app/trash`. Button counts: 135/145/173/143/137/230/135.
- Unlabeled (no text + no aria-label + no aria-labelledby + no title): 0 on every route.
- No new regression vs prior sweep. The earlier `close-ai` / `ai-send` items in I-3209 still apply only when the AI panel is open — see B-3217.

### B-3519 — Rapid trash-restore: restores silently drop pages (P1, open)
- Repro: created 3 new pages via `ts-new-Private` in rapid sequence; for each, opened `page-options` → `page-opt-trash`, then navigated to `/app/trash`, found `restore-<pgId>` button for each, clicked them sequentially with 250 ms between clicks.
- Observed: after navigating to `/app/home`, only ONE of the three restored pages appears in the sidebar (`pg_mp3ibtcbuop5o9mi`). Returning to `/app/trash`, the other two (`pg_mp3ibutpfmhygojq`, `pg_mp3ibwb0p5onpdlu`) still show as trashed.
- Expected: clicking all 3 restore buttons should restore all 3; serialization of the store updates should not lose intermediate writes.
- Severity: P1 — silent data loss on a common operation. Likely a stale-closure bug on the restore click handler reading an older `useStore` snapshot.

### B-3520 — Browser back/forward across /app routes: no stale state observed (acceptance)
- Repro: navigated `/app/home → /app/inbox → /app/calendar → /app/templates → /app/p/pg_mp33cd7d01u4huok` via `history.pushState` + popstate, then `history.back()` × 2, `history.forward()` × 1.
- Observed: URL and body content updated correctly each step. No "Page not found" flash. Sidebar consistently rendered. Inbox / page bodies were both reachable on the back path.
- Conclusion: no regression. Closes the back/forward sub-task.

### B-3521 — Mobile sidebar does NOT auto-close after navigation (P2, open — related to B-3216 / I-3208)
- Repro: monkey-patched `window.innerWidth/innerHeight` to 375×667 and fired `resize`; the layout did not switch to a mobile drawer. Clicked `close-sidebar` → `open-sidebar` → `sidebar-home`. After navigation to `/app`, the sidebar remained visible (`close-sidebar` still present in DOM).
- Expected: at viewport < 768 the sidebar should overlay content as a drawer, render a backdrop, and auto-close on (a) navigation, (b) backdrop tap, (c) Escape.
- Severity: P2 — mobile UX is unusable in its current form. I-3208 still open.
- Note: this test is constrained because the iframe runner can't truly resize the browser. Confirmed at the JS-API layer (`innerWidth`/`matchMedia`) that no responsive switch occurs.

### B-3522 — Sidebar has no responsive breakpoint hook (P3, open)
- Searching the DOM for `data-testid="sidebar-backdrop"` / `mobile-menu` / `sidebar-drawer` after simulating 375px width returns nothing. The sidebar component appears to have no responsive variant at all.
- Combined with B-3521, suggests the mobile layout was deferred entirely. Note for I-3208.

### B-3519 — Rapid trash-restore drops pages — fixed (commit 1d3bc2d) — P1
- Fix: TrashPage's restore-<pageId> click no longer navigates after restoring. It used to call `navigate(...)`, which unmounted TrashPage. Rapid restore-clicks therefore vanished after the first because the button DOM was gone. Now it just calls `restorePageCascade(p.id)` + a "Restored …" toast. Verified: clicking 3 restore buttons at 250ms intervals restores all 3; the URL stays on /app/trash.

### B-3516 — Cross-tab StorageEvent doesn't rehydrate — false negative (info)
- Re-verified: the storage listener works fine for properly-shaped pages. The original repro injected `teamspaceId: null` pages, which the Sidebar's teamspace grouping correctly does not render. Injecting a page with a valid teamspaceId AND a synthetic StorageEvent causes the new `expand-pg_*` chevron to appear in the Sidebar within ~600ms — no reload required. The listener flow (StorageEvent → `_state = next` → notify listeners → useStore force-render) is intact.

### B-3214 — Public form empty submit creates blank row — fixed (commit 1d3bc2d) — closes I-3207 partial
- Fix: form.$dbId.$viewId.tsx now validates before submission:
  * If the title field is visible, it must be filled (otherwise "<Title name> is required.").
  * If every visible field is empty/whitespace/empty-array, submission is blocked with "Please fill in at least one field before submitting.".
  Errors render under the submit button via the existing `error` state.

### B-3600 — Re-verify B-3519 rapid trash-restore (acceptance, fixed)
- Repro: injected 3 trashed pages with valid teamspaceId (Private). Navigated /app/trash, all 3 `restore-<id>` buttons appeared. Clicked them 250 ms apart.
- Observed: all 3 pages flipped `isInTrash:false`; URL stayed on /app/trash; sidebar afterwards exposed `expand-<pgId>` + `page-menu-<pgId>` for all 3. No silent drops.
- Conclusion: fix in commit 1d3bc2d holds. Closes B-3519.

### B-3601 — Re-verify B-3214 public-form empty submit (acceptance, fixed)
- Repro: seeded a `db_form_*` with view `vw_form_*` (title + select + number). Opened `/form/<dbId>/<viewId>`. Clicked Submit with everything empty. Then filled only the select.
- Observed: both attempts blocked. "Title is required." renders under the submit button. No row inserted in `rows` map. Filling title + number creates a row. Closes B-3214.

### B-3602 — Re-verify B-3516 cross-tab StorageEvent rehydrate (acceptance, fixed)
- Repro: on /app, injected a new page with valid teamspaceId; manually dispatched a synthetic `StorageEvent` with old/new JSON.
- Observed: within 800 ms the sidebar exposed `expand-pg_crosstab_*` (page rendered under Private teamspace). Closes B-3516.

### B-3603 — Public form: select value not persisted on submit (P2, open)
- Repro: on `/form/<dbId>/<viewId>` filled title + number + selected an option in the select (Category=Bug). Submitted.
- Observed: row created with `values: { prop_title:..., prop_num: 42 }` — the select prop was DROPPED from the saved row even though the option was clearly visible/highlighted in the UI.
- Severity: P2 — silent data loss for select fields submitted via the public form. Likely the form's `setValues` handler doesn't fire on `<select>` change, or the submit only reads inputs (not selects).

### B-3604 — Markdown export drops bookmark blocks (P2, open)
- Repro: created a page with 19 blocks of varied types (`text`, `heading-1/2/3`, `bullet-list`, `numbered-list`, `todo`, `quote`, `callout`, `code`, `divider`, `toggle`, `image`, `video`, `file`, `equation`, `bookmark`). Exported via `page-opt-export-md`.
- Observed: the bookmark block (`https://example.com`) is silently OMITTED from the output. The 18 other block types appear; only `bookmark` is dropped. Empty media still leaks `<!-- (empty image block) -->` etc. (B-3512 still open).
- Severity: P2 — silent data loss on export. Notion-style markdown convention would emit a bare URL or `[url](url)`.

### B-3605 — Markdown export: empty equation renders as broken `$$\n\n$$` (P3, open)
- Same export above: an equation block with empty `content` produces `$$\n\n$$` — valid Markdown but renders as an empty display-math block, useless. Also slightly fragile: many renderers reject empty `$$` blocks.
- Suggested: skip the block entirely (matches I-3509 for other empty media types).

### B-3606 — `database` block "Unsupported block: database" in page render (P1, open)
- Repro: injected an inline-database block (type:'database', content:dbId) into a page. The page now displays "Unsupported block: database" where the table/board should be.
- Observed: the renderer has no handler for this type. (Existing seed pages get tables via a different code path — perhaps a special render based on db schema in `databases` map, not via a block.) Either: (a) block type isn't actually supported (so why is it persisted?) or (b) the renderer dispatch is missing this case.
- Severity: P1 — inline DB pages can't be hand-constructed; existing pages keep working but the feature is fragile.

### B-3607 — Cmd+K with single-letter query: 53 ms paint, no errors (acceptance)
- Repro: closed/reopened palette, then typed "a" into `command-input`. Measured: paint ~53 ms; with 9 page items + 7 actions; no JS errors; no flicker.
- Conclusion: no regression. Closes the iteration-12 sub-task.

### B-3608 — Color tool over bold preserves bold (acceptance, B-3504 still holds)
- Repro: paragraph "Plain paragraph" → select-all → ib-bold → confirmed `<b>...</b>`. Re-select → ib-color → ib-color-red → confirmed `<span style="color:..."><b>...</b></span>`. Re-select → ib-color → ib-color-default → confirmed `<b>Plain paragraph</b>` (color span removed, bold preserved).
- Conclusion: B-3504 fix holds. Default-color removes the color wrapper without touching nested formatting.

### B-3609 — Block-handle menu: Delete + Duplicate now present (acceptance, B-3403 partial)
- Repro: clicked `handle-<blockId>` on a paragraph block; menu shows Delete (testid `menu-delete-<bid>`, hotkey "Del") and Duplicate (hotkey "⌘D"). 
- Still missing: Turn-into, Copy-link, Color/Background, Move-to. The original B-3403 ask was Duplicate/Turn-into/Copy-link — Duplicate is in, Turn-into & Copy-link still missing.
- Severity: keeping B-3403 open, downgrading to P3 since the most-common option (Duplicate) landed.

### B-3610 — Comment edit/delete still missing (B-3404 still open)
- Repro: opened comments panel, posted "Hello world from QA". The rendered comment exposes `resolve-<cmtId>` and `reply-<cmtId>` testids — no `edit-<cmtId>` or `delete-<cmtId>`.
- Severity: P2 — comment moderation impossible; if a user types a typo they cannot fix or delete it. B-3404 still open.

### B-3611 — Inline AI (ib-ai) still routes to side AI panel, not inline modal (B-3210 still open)
- Repro: select text, click `ib-ai` in inline toolbar → the right-side AI panel opens with the existing `ai-input` single-line `<input>`.
- No separate inline AI prompt input exists. Same single-line input as before. Closes B-3210 sub-task with same status: still open, P3.

### B-3612 — Markdown export: bookmark URL rendered as nothing OR partial (P2, dup of B-3604)
- Same investigation as B-3604: bookmark dropped entirely. Logging again because the iteration task list calls out export coverage specifically.

### B-3613 — Calendar event chip: still NO testid + NOT draggable (B-3513/B-3514 still open)
- Repro: /app/calendar, clicked `day-add-2026-05-13`, created "QA Drag Event". Inspected the day cell. Chip is `<div class="text-xs ..." style="background:#3b82f6">QA Drag Event</div>` — no `data-testid`, no `draggable="true"`, no `onDragStart`.
- Severity: P2. Same as I-3506 / I-3508 — drag UX broken, automation cannot target the chip. Re-confirms B-3513 and B-3514 are still open.

### B-3614 — Dark-mode toggle 5x rapid: no flicker, deterministic alternation (acceptance)
- Repro: /app/settings, clicked `dark-btn` 5x with 60 ms between clicks. Observed: `html.classList` flipped on/off cleanly each click (off→on→off→on→off). No double-toggles, no missed toggles, no race-condition flicker.
- Conclusion: dark-mode toggle stable. Closes the iteration-14 sub-task.

### B-3615 — Trash empty state: "Trash is empty." with period (acceptance)
- Repro: /app/trash with zero trashed pages → main area shows "Trash is empty." (literal text with trailing period). Matches the spec.

### B-3616 — Sidebar page rows: no drag-and-drop (P2, open — new)
- Repro: inspected every `expand-pg_*` row and its row wrapper. None have `draggable="true"`, none expose `onDragStart` / `onDragOver` / `onDrop` listeners. The wrapper `<div class="group flex ...">` is plain.
- Severity: P2 — reordering and re-parenting pages via the sidebar is a Notion baseline. Currently the only way to move a page is `page-options → Move to`. No drag UX exists yet.

### B-3617 — Typing perf: H1 0.175 ms/char vs paragraph 0.248 ms/char (acceptance)
- Repro: typed 100 chars into an H1 block then 100 chars into a paragraph block via `document.execCommand('insertText', false, 'a')`. Final block lengths 108 / 115 (incl. seed text).
- Conclusion: heading-1 is slightly FASTER than paragraph (~30 %). Both well under 1 ms/char. No re-render regression detected.

### B-3618 — ib-underline + Cmd+U both work (acceptance, I-3408 fixed)
- Repro: selected text in a paragraph → clicked `ib-underline`. HTML becomes `<u>...</u>`. Re-selected and pressed Cmd+U via synthetic keydown → underline toggled off.
- Conclusion: both UI button AND keyboard shortcut wired. Closes I-3408.

### B-3619 — Public form refresh re-allows submission, values cleared (acceptance)
- Repro: filled title+number on `/form/<dbId>/<viewId>`, submitted → "Thanks for submitting!". `location.reload()`. After reload: inputs show empty values. Filled title again with "SecondRow" → second row created (rows map size 1 → 2).
- Conclusion: refresh resets the form to a clean state and a new submission persists. Closes the iteration-15 sub-task.

### B-3620 — Mobile responsive: emulated 375px width still doesn't trigger drawer (B-3521/B-3522 still open)
- Repro: monkey-patched `window.innerWidth/innerHeight` to 375×667 and fired `resize` from /app. `matchMedia('(max-width:767px)').matches === false` (the iframe's true width is unchanged). Sidebar remains visible with `close-sidebar` button. No `mobile-menu` / `sidebar-backdrop` / `drawer` testids appear.
- Severity: P2/P3 — confirms B-3521 + B-3522. Tied to I-3208. Real-device QA still pending.

### B-3621 — Synced source/ref bidirectional sync works (acceptance)
- Repro: created a synced-block (source) via `slash-synced`. Added inner text "Synced source body". Created a synced-block-ref via `slash-synced-ref` and pasted the source id into `synced-source-input-<id>` + clicked Link.
- Tested both directions: editing the source block's inner contenteditable propagates to the ref's rendered text (and vice versa — editing the ref's inner contenteditable updates the source's block.content in the store).
- Conclusion: bidirectional sync intact. Closes the iteration-10 sub-task.

### B-3622 — Synced reference markdown export now resolves (acceptance, B-3511 fixed)
- Repro: with the source containing "EDITED at REF", exported the page → both the source AND the ref render the same body text in markdown (the ref no longer prints `<!-- synced reference: no source -->`).
- Conclusion: B-3511 (and I-3510) is fixed for refs that have a valid sourceId on the same page.

### B-3623 — Bookmark export still missing on synced-export run (P2, dup of B-3604)
- During the synced-export verification above, also re-confirmed: the bookmark block at index 18 (`https://example.com`) is STILL absent from the export. Re-confirms B-3604 / I-3600.

### B-3624 — Inline DB prop-header click only shows Rename, no Sort (B-3507 still open)
- Repro: created an inline DB via `slash-db-table`. Clicked `prop-header-<propId>` on the title column. The popover that opens contains ONLY a "Rename" action (testid `prop-rename-<propId>`). No Asc / Desc / Clear sort actions, no sort applied to the view.
- Notion baseline: a single click sorts ascending, double click descending, third clears. Sort is reachable today only via `db-actions-<dbId> → add-sort-<viewId>`.
- Severity: P2. Closes the iteration-5 sub-task; B-3507 + I-3501 still open.

### B-3625 — DB filter operators: "is" / "is-empty" / "is-not-empty" available; no "equals" string (acceptance/info)
- Repro: opened `filter-row-0` for a new inline DB. Operator dropdown lists: contains, does-not-contain, is, is-not, is-empty, is-not-empty, greater-than, less-than, greater-than-equal, less-than-equal, checked, unchecked (12 total).
- Notion uses "equals" for number columns; current build uses "is" for all types. Functionally equivalent — flagging only as a copy/spec consistency note. NB: no "starts-with"/"ends-with" string ops.

### B-3606 — Unsupported `database` block — fixed (commit b2ce55c) — P1
- Fix: Block.tsx now treats a bare `database` block type as `database-inline` via a backwards-compat shim at the top of the renderer switch. Older seeds and hand-constructed blocks from before the inline/linked split no longer render "Unsupported block: database".

### B-3604 — Bookmark blocks dropped from markdown export — fixed (commit b2ce55c) — closes I-3600
- Fix: export-markdown.ts now emits `[🔖 <url>](<url>)` for bookmarks (or `[caption](<url>)` if a caption is set) and `[↗ <url>](<url>)` for embeds. Empty bookmark/embed/equation blocks emit `<!-- (empty <type> block) -->` rather than being silently dropped (closes B-3604 + B-3605 + B-3512).

### B-3605 — Empty equation emitted `$$\n\n$$` — fixed (commit b2ce55c) — closes I-3601
- Fix: equation export now skips empty blocks with `<!-- (empty equation block) -->` instead of the broken `$$\n\n$$`.

### B-3624 / B-3507 — Prop-header dropdown lacks Sort / Hide — fixed (commit b2ce55c) — closes I-3603
- Fix: TableView's PropertyHeader now renders Sort ascending / descending / Clear sort buttons (`prop-sort-asc-<id>`, `prop-sort-desc-<id>`, `prop-sort-clear-<id>`) and a Hide/Show column button (`prop-hide-<id>`). All wired through `updateView` on the view's `sorts` and `hiddenProperties` fields. The Type switcher and Delete option remain below a divider.

### B-3700 — B-3606 acceptance: `database` block renders inline DB (fixed)
- Repro: injected `{ type: 'database', content: '<dbId>' }` into `page.blocks` for "Getting Started", reloaded. The block now renders as an inline database (showed "Empty database" placeholder since the linked db had no rows).
- No more "Unsupported block: database" red text. The backwards-compat shim treating bare `database` type as `database-inline` works as expected.
- Severity: closes B-3606 (P1) and I-3602.

### B-3701 — B-3604/B-3605 acceptance: bookmark + equation markdown export (fixed)
- Repro: page with 5 blocks: text, bookmark(url=https://example.com), bookmark(url=''), equation('E=mc^2'), equation(''). Exported via `page-opt-export-md`. Intercepted Blob via `URL.createObjectURL`.
- Output: `[🔖 https://example.com](https://example.com)` for filled bookmark; `<!-- (empty bookmark block) -->` for empty; `$$\nE=mc^2\n$$` for filled equation; `<!-- (empty equation block) -->` for empty. Page title rendered as `# QA Export Test` (not "Untitled").
- Severity: closes B-3604 / B-3605 / B-3512 (for bookmark/equation) and I-3600 / I-3601.

### B-3702 — Bookmark store-field divergence (P3, open — new doc)
- Observed during B-3701 setup. The `bookmark` block type uses field `url` (per `src/lib/types.ts` `EmbedBlock.url`) but I initially set `content` (since many other block types store payload in `content`). The exporter only reads `.url`, so a hand-built bookmark with `content` is silently empty.
- Not a regression — but documenting because slash-menu vs. legacy seeds vs. external constructors may disagree. Consider normalizing on `content` or supporting both, or at minimum documenting the divergence in the slash-command factory.
- Severity: P3 doc/devx issue.

### B-3703 — B-3624/B-3507 acceptance: prop-header Sort + Hide (fixed)
- Repro: created an inline table DB via `slash-db-table` with 3 title-rows (Charlie, Alpha, Bravo). Clicked `prop-header-<titleId>` → menu now exposes Rename, ↑ Sort ascending, ↓ Sort descending, Hide column, Delete property. After applying Asc, the rendered rows reorder to Alpha→Bravo→Charlie. Desc → Charlie→Bravo→Alpha. After clicking `prop-sort-clear-<id>` (which only appears when a sort is active), rows revert to insertion order.
- Hide Status: `cell-select-…-<statusId>` cells disappear and the prop-header itself is removed from the table head. Unhide via `view-menu` panel's PROPERTIES checkbox — column reappears.
- Severity: closes B-3624 / B-3507 / I-3501 / I-3603.

### B-3704 — Hidden column has no in-table unhide affordance (P3, open — new doc)
- Observed during B-3703. Once a column is hidden via `prop-hide-<id>`, the column header is gone from the table. The only way to bring it back is to open the view-menu (`…`) and re-check the property in the PROPERTIES list. There's no testid for those checkboxes (each is a generic `<input type="checkbox">` inside a label).
- Notion convention: a hidden column shows as a chip strip "+1 hidden" beside the last column or below the header, with a one-click re-show. Current UX requires hunting through view config.
- Severity: P3 UX gap. Sort/hide infra is good; unhide UX is buried.

### B-3705 — Public form select PERSISTS now (acceptance, B-3603 fixed)
- Repro: /form/db_mp2qmu4d1va6knov/view_mp2ry265swv12c04, filled title, status=In progress, number=42, date=2026-05-20, clicked Submit. Inspected the new row's `values`: `prop_<status>` = `opt_mp2qmu4durv3zurg` (the In progress option id). Title/number/date also all saved.
- Severity: closes B-3603 + I-3603.

### B-3706 — AI chat input STILL single-line (B-3210 still open)
- Repro: clicked sidebar `Ask AI`, inspected `[data-testid="ai-input"]`. It's `<input type="text" placeholder="Ask anything...">`. Not a textarea. Pressing Enter submits, no Shift+Enter newline support.
- Severity: P3. Closes iteration sub-task; B-3210 stays open.

### B-3707 — Comments Delete added (no testid + no Edit) — B-3404 partial fix
- Repro: posted a comment via `comment-input`/`post-comment`. Now in the comment row there's a "Delete" button (red, hover-underline) alongside `resolve-<cmtId>` and `reply-<cmtId>`. Clicking Delete removes the comment from the store and DOM. No native dialog (window.confirm overridden but app doesn't even prompt).
- Missing: 1) the Delete button has NO `data-testid` — automation can't target it by id; 2) NO "Edit" button — typos still stuck. 
- Severity: keeps B-3404 / I-3604 open (now partial). Add `delete-<cmtId>` testid and an Edit affordance.

### B-3708 — Calendar event chip STILL no testid / not draggable (B-3513/B-3514 still open)
- Repro: /app/calendar, clicked `day-add-2026-05-13`, typed title in `cal-compose-title`, clicked `cal-compose-create`. Chip "QA Drag Test" rendered as plain `<div class="text-xs ..." style="background:#3b82f6">`. No `data-testid`, `draggable=false`, no `onDragStart` handlers visible.
- Repeats the iteration-13 finding from B-3613. Tied to I-3506 / I-3508.
- Severity: P2. Re-confirms B-3513 + B-3514.


### B-3709 — Markdown export covers 19+ block types (acceptance)
- Repro: page with 19 blocks: text, h1, h2, h3, bullet-list, numbered-list, todo, toggle, quote, callout, divider, code, equation, bookmark, embed, image, video, audio, file. Exported via `page-opt-export-md`. Output begins `# QA 22 Types` then renders each block correctly:
  - bookmark → `[🔖 https://example.com](https://example.com)` ✓ (B-3604)
  - embed → `[↗ https://example.com/embed](https://example.com/embed)` ✓
  - image → `![Cat](https://example.com/cat.png)` ✓
  - video/audio/file → `[<type>: <filename>](<url>)` ✓
  - equation → `$$\nx^2\n$$` ✓
  - callout → `> 💡 callout text` ✓
- Severity: closes the 22-types coverage sub-task.

### B-3710 — /app/db/<id> renders inline DB just fine (acceptance)
- Repro: navigated to `/app/db/db_mp2qmu4d1va6knov`. The page shows 4 prop headers + 5 rows × 4 cells = 20 cells, plus the view tabs, `db-newrow-<dbId>`, `db-actions-<dbId>` etc. No 404 / fallback. The InlineDatabase component handles the standalone route correctly.
- Severity: closes the /app/db sub-task. Probably wired via the same renderer that B-3606's fix exposes for `database` blocks.

### B-3711 — DB table view: no row drag-reorder (P2, open — new doc / B-3616 related)
- Repro: inspected `/app/db/<id>` table view. Each row only has `row-open-<rowId>` (the `⤢` button) and `row-delete-<rowId>`. No `row-handle-<rowId>` / `dragHandle` testid. No `draggable=true` anywhere in row markup. Same as sidebar drag (B-3616): rows must be reordered via sort or recreated.
- Severity: P2. Tied to I-3605.

### B-3712 — Cmd+K perf with 93 pages: 59ms paint (acceptance)
- Repro: seeded +80 bulk pages into store (now 93 pages total). Opened command palette, typed "b" → paint 59 ms; typed "bulk page" → paint 68 ms. Still under 100 ms with 6.5× the previous corpus. No regression from B-3607's 53 ms baseline.
- Severity: closes Cmd+K perf sub-task. No JS errors logged.

### B-3713 — H2 typing perf with 50 sibling text blocks: 0.6 ms/char (acceptance)
- Repro: created page with 1 heading-2 + 50 text siblings. Focused the h2, ran `document.execCommand('insertText','a')` 100x. Total 59.9 ms = 0.6 ms/char. Slightly slower than B-3617's 0.175 ms/char (which was a fresh page) — the extra cost from 50 sibling re-render checks is real but bounded.
- Severity: acceptable. No human-perceptible lag.

### B-3714 — Mobile responsive: viewport stays 1150×820 in iframe; matchMedia false (B-3521/B-3522 still open)
- Same conclusion as B-3620. Cannot truly emulate 375px in this harness — the iframe's `innerWidth` is the parent allocated width. Real-device QA still required.
- Severity: P3 doc.


### B-3715 — prop-sort-asc click is idempotent, not cycling (P3, open — new)
- Repro: clicked `prop-sort-asc-<id>` twice in a row. Second click did not toggle to desc or clear. Sorts in store stay `[{direction:'asc', propertyId:...}]`. Notion's header convention is asc → desc → clear on repeated clicks on the same header.
- Severity: P3. Not a regression — the new menu (B-3624 fix) explicitly exposes asc/desc/clear as separate buttons, which is fine. But the prop-header itself is no longer a quick-toggle, and clicking asc again should probably be a no-op (current) or cycle (Notion style). Document so users don't expect a single-click toggle.

### B-3716 — Form view `previewMode` field writable but no runtime effect (P3, open — new doc)
- Repro: toggled `view.previewMode` on the form view via direct store edit. Re-navigated to `/form/<db>/<viewId>`. The form rendered the same as before (Name/Status/Tags/Date + Submit). No "Preview" badge, no read-only toggle.
- The `previewMode` field is part of the form-view schema but is currently dead state — either remove it from the type or wire a real preview mode (show without persisting submissions).
- Severity: P3 dead-code / dead-state.

### B-3717 — Inline toolbar (ib-bold/ib-italic/ib-underline/ib-strike/ib-code/ib-link/ib-color/ib-ai) appears on selection (acceptance)
- Repro: navigated to a page with a heading-2, selected 2 chars. Toolbar appears with all 8 expected actions. Consistent with prior B-3504 / I-3408 acceptance.
- Severity: closes inline-toolbar verification sub-task.


### B-3707 / B-3404 — Comment Edit + Delete with testids — fixed (commit f51cc36) — closes I-3700
- Fix: PageComments.tsx exposes `comment-edit-<id>`, `comment-delete-<id>`, `comment-edit-input-<id>`, `comment-edit-save-<id>`, `comment-edit-cancel-<id>` on both top-level comments AND replies. Edit opens an inline textarea with the existing content; Save commits via a new `updateComment` store action that records `editedAt`. Edited comments render "(edited)" next to their timestamp. Verified end-to-end: posted a comment, clicked Edit, modified text, clicked Save → DOM shows the new text + "(edited)" tag.

### B-3704 — Hidden columns unhide chip — fixed (commit f51cc36) — closes I-3702
- Fix: InlineDatabase header now renders a `hidden-cols-chip-<viewId>` line whenever the active view has any `hiddenProperties`. Shows count + first three names + a "Show all" link (`unhide-all-<viewId>`) that clears `hiddenProperties` on the view. Restores discoverability for the new prop-header Hide action.

## 2026-05-13 — Iteration verification batch

### B-3800 — Comment edit cycle works end-to-end (acceptance, fixed)
- Repro: posted comment via `comment-input`/`post-comment`; clicked `comment-edit-cmt_mp3k3370qfqtbdkc`, modified content in `comment-edit-input-...`, clicked `comment-edit-save-...`. Resulted in new content + `(edited)` tag rendered. Then clicked `comment-delete-...` → comment removed.
- Closes B-3707 / B-3404. Confirms commit f51cc36 fix.
- Severity: closes verification sub-task.

### B-3801 — Reply also exposes comment-edit-/comment-delete- (acceptance)
- Repro: posted parent comment; clicked `reply-<parentId>`, used `reply-input-<parentId>` + `reply-submit-<parentId>` to add a reply. The new reply was assigned its own cmtId (cmt_mp3k53fom6pzbwdd) and exposed `comment-edit-<replyId>` / `comment-delete-<replyId>`. Edit cycle worked: text updated, `(edited)` tag appeared once.
- Severity: closes reply edit/delete sub-task. P3 nit: only one `(edited)` tag shown even when two comments are edited — but the test seq only edited the reply, so this is correct.

### B-3802 — deleteComment cascades to replies (acceptance)
- Repro: with parent cmt_mp3k4vcb56b7wjz9 + reply cmt_mp3k53fom6pzbwdd present, clicked `comment-delete-<parentId>`. After 250 ms both `comment-edit-<parentId>` and `comment-edit-<replyId>` were gone from the DOM. Reply text "reply EDITED v1" no longer present.
- Severity: closes cascade sub-task. No orphans.

### B-3803 — Resolved comment is fully hidden, no "Show resolved" toggle (P2, open — new)
- Repro: posted comment; clicked `resolve-<cmtId>`. The comment immediately disappeared (`comment-edit-<id>` gone). No `show-resolved` / `toggle-resolved` testid anywhere in the comments pane. Cannot reach a resolved comment to edit it without re-opening it via store.
- Notion shows resolved comments behind a "Show resolved" toggle. Current UX = comments vanish on resolve, no undo.
- Severity: P2. Tied to I-3604.

### B-3804 — B-3704 hidden-cols-chip + unhide-all works (acceptance, fixed)
- Repro: at /app/db/db_mp2qmu4d1va6knov, opened `prop-header-<id>` for Status + Tags, clicked `prop-hide-<id>` for each. The chip `hidden-cols-chip-view_mp2qmu4djdr3pyti` rendered text "2 columns hidden(Status, Tags)Show all" and `unhide-all-view_mp2qmu4djdr3pyti` button appeared. Clicking unhide-all restored all 4 prop headers and removed the chip.
- Closes B-3704. Commit f51cc36.

### B-3805 — Color tool default unwraps span (acceptance)
- Repro: on a text block, selected "color" in "Hello color world", clicked `ib-color` then `ib-color-red` → DOM: `Hello <span data-color="1" style="color: rgb(220,38,38);">color</span> world`. Re-selected the span content, opened `ib-color`, clicked `ib-color-default` → DOM: `Hello color world` (span removed). B-3111 still fixed.
- Severity: closes color tool sub-task.

### B-3806 — AI input STILL single-line (B-3210 still open)
- Repro: clicked `sidebar-ai`; `[data-testid="ai-input"]` is `<input type="text">`, no rows attribute. Identical finding as B-3706.
- Severity: P3. B-3210 still open.

### B-3807 — /math /breadcrumb /toc /callout all work (acceptance)
- Repro: from text block typed `/math` → `slash-math` matched, click inserted `equation` block. `/bread` matched `slash-breadcrumb` → `breadcrumb` block inserted. `/toc` matched `slash-toc` → `table-of-contents` block. `/callout` matched `slash-callout` → `callout` block. All four commands work end-to-end.
- Severity: closes slash menu remaining sub-task.


### B-3808 — Calendar event chips STILL not draggable / no testid (B-3513/B-3514 still open)
- Repro: /app/calendar, day-13 cell contains `<div class="text-xs ..." style="background: rgb(59,130,246)">QA Drag Test</div>` and `<div class="...">Drag candidate</div>`. No `data-testid`, no `draggable="true"`. After creating a fresh event via `day-add-2026-05-13` → `cal-compose-create`, still no chip testid emitted. Same conclusion as B-3708 / B-3613.
- Severity: P2. Re-confirms B-2907 / B-3513 / I-3506. No progress since previous iteration.

### B-3809 — Trash 5 / restore 5 rapid: all 5 restored (acceptance — B-3519 regression)
- Repro: created 5 fresh pages via `ts-new-Private`, moved each to trash via `page-menu-<id>` → `pmenu-trash-<id>` (each click needs ~200 ms between menu open and trash click). Opened `/app/trash` (sidebar-trash). Found `restore-<id>` for all 5. Clicked all 5 rapidly (no awaits) — total 11.1 ms. All 5 restored, none dropped, all reappeared in sidebar with `expand-<id>`. No regression of B-3519.
- Severity: closes regression check.

### B-3810 — H1 perf: 200 chars on heading-1 in 10-block page = 0.6 ms/char (acceptance)
- Repro: on /app/p/pg_mp2r871w150jzjkn (10 blocks). Focused first heading-1, ran `document.execCommand('insertText','x')` x200. Total 119.2 ms = 0.596 ms/char. Same per-char cost as B-3713. No perceptible lag — under 100 ms for 200 chars at user typing speed.
- Note: could not create a 100-block page in this iteration; new pages start empty and the slash menu requires manual block-by-block typing. Tested with the heaviest available page (10 blocks).
- Severity: closes perf flood sub-task.

### B-3811 — Comment edit/delete buttons labeled by text content (a11y, acceptance)
- Repro: posted comment, inspected `[data-testid="comment-edit-<id>"]` and `[data-testid="comment-delete-<id>"]`. Both `<button>` elements have visible text "Edit" / "Delete" (no aria-label, no title needed since text content provides accessible name). Screen readers will announce them correctly.
- Severity: closes a11y sub-task. Minor improvement opportunity logged separately.

### B-3812 — Cmd+K block matches with `>=2` chars (acceptance)
- Repro: opened palette via `sidebar-search`, typed "ex" → 4 `cmd-block-*` testids returned (matches "Export" in block content). Still under 100 ms paint. No regression of B-3607.
- Severity: closes Cmd+K sub-task.

### B-3813 — Resolved comments cannot be re-edited / no toggle to show them (P2, open — new)
- Repro: posted "will be resolved then edited"; clicked `resolve-<cmtId>` → comment immediately disappears from DOM (no `comment-edit-<id>` selector survives). No `show-resolved`, `toggle-resolved`, or `view-resolved` testid anywhere in the comments pane. Once resolved, a typo or follow-up edit is unreachable without local state mutation. Notion shows resolved comments behind a toggle in the same pane.
- Severity: P2. Tied to I-3604. Suggest a hidden affordance ("X resolved · show") at the bottom of the comments list.

### B-3814 — Mobile responsive: still cannot emulate 375px in preview iframe (B-3521/B-3522 still open)
- Same conclusion as B-3620 / B-3714: `window.innerWidth` is 1150 (parent allocation), `matchMedia('(max-width: 640px)')` is false, no mobile-only nav testid. Real-device QA still required. No fix detected.
- Severity: P3 doc.


### B-3815 — Public form submit silently drops row (P0, open — new / regression from B-3603)
- Repro: navigated to `/form/db_mp2qmu4d1va6knov/view_mp2ry265swv12c04`. Filled title input "XYZ1778646995464", select option `opt_mp2qmu4dn9fbngvs` (Done), number 99, date 2026-05-20. Clicked `public-form-submit`. Page renders "Thanks!" success state. Navigated to `/app/db/db_mp2qmu4d1va6knov` table view → still 5 rows (none match XYZ). All 5 views show count=5 with no new row. Inspected each view → no XYZ row found.
- Severity: P0. The form pretends to succeed but no new row is created. Worse than B-3603 (which dropped only select; title used to persist). Either the create-row mutation is no longer wired or the form is calling a stub. The public-form-submit button is `type=submit` but NOT inside any `<form>` element (`submitInsideForm: false`), so default submit can't fire — looks like the React click handler regressed.

### B-3816 — Public form inputs STILL have no testid / no name attributes (P3, open)
- Repro: same page. The 4 inputs (text, select, number, date) all have `data-testid: null` and `name: ""`. Matches I-3504 prior finding. Submit button has `data-testid="public-form-submit"` — only the submit got a testid.
- Severity: P3 doc / I-3504.

### B-3817 — Public form submit button is type=submit but lives outside any <form> (P1, open — new)
- Repro: inspected `[data-testid="public-form-submit"]` → `submitInsideForm: false`, `type: "submit"`. There is no `<form>` wrapper. Submit relies entirely on the onClick handler. When that handler is broken (B-3815), the user has no fallback (Enter on the title field also can't submit a form that doesn't exist).
- Severity: P1. Either wrap in `<form onSubmit={...}>` (with proper preventDefault) or change `type` to "button" to avoid confusing semantics.


### B-3818 — Hide all non-title columns then unhide via chip works (acceptance)
- Repro: at /app/db/db_mp2qmu4d1va6knov, opened menu on prop-header-title → no `prop-hide-` option appears for the title prop (correctly forbidden). Hid 3 non-title props (Status, Tags, Date) via `prop-hide-<id>`. Chip `hidden-cols-chip-view_mp2qmu4djdr3pyti` rendered text "3 columns hidden(Status, Tags, Date)Show all". Clicked `unhide-all-view_mp2qmu4djdr3pyti` → all 4 prop-headers returned, chip removed.
- Severity: closes full-hide-cycle sub-task. Title is correctly protected. B-3704 fix is robust.

### B-3819 — prop-header Sort/Hide/Clear menu cycle (acceptance, B-3624 fixed)
- Repro: on prop-header-Status, the menu shows: rename / sort-asc / sort-desc / sort-clear (only when this prop is the active sort) / hide / delete. Sort cycle: clicked `prop-sort-desc-<id>`, re-opened menu — `prop-sort-clear-<id>` now appears alongside asc/desc. Clicked clear → re-opened menu, clear option is gone. Sort applied (header has an arrow svg).
- Severity: closes /app/db prop-header sub-task. Confirms B-3624 fix.

### B-3820 — Sort clear option is gated to actively-sorted prop only (design acceptance)
- Repro: with no active sort on prop-header-title, the title menu shows only rename / asc / desc — no clear. Once a different prop is sorted, only THAT prop's menu shows the clear option. This is correct UX (don't expose clear when there's nothing to clear) but worth noting for QA — `prop-sort-clear-<id>` testid presence is conditional.
- Severity: P3 doc.


### B-3815 — Public form silently drops row — fixed (commit 51aba2c) — P0 regression
- Fix: after `localStorage.setItem(data.storageKey, newValue)`, the form route now `window.dispatchEvent(new StorageEvent("storage", { key: data.storageKey, newValue, oldValue: null, storageArea: localStorage, url: location.href }))`. The cross-tab listener in src/lib/store.ts picks this up and rehydrates _state with the new row. Same-tab writes don't normally fire `storage` events, so without this dispatch the host's app rendered stale rows after the user navigated back. Verified live: row count went 5 → 6 after a submit and the row's title field contained the test marker.

### B-3817 — Submit button outside <form> — fixed (commit 51aba2c) — P1
- Fix: wrapped the form body in `<form data-testid="public-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>`. The submit button is now `type="submit"` AND inside the form, so Enter on the title field submits properly and `submitInsideForm: true`.

### B-3803 — Show-resolved toggle missing testid — fixed (commit 51aba2c)
- Fix: the existing "Show resolved" checkbox in PageComments now has `data-testid="show-resolved-toggle"`. E2E can flip it to reach resolved comments for editing.

## 2026-05-13 — QA agent iteration B-3900

### B-3900 — B-3815 verified fixed (P0, fixed — acceptance)
- Navigated `/form/db_mp2qmu4d1va6knov/view_mp2ry265swv12c04`. Typed `QA-3900-<ts>` into the first INPUT (no `type` attribute, label "Name"). Clicked `public-form-submit`.
- Result: `[data-testid="public-form-thanks"]` appeared, `databases[dbId].rows` went 5 → 6, the new row's `values["prop_mp2qmu4d010rz75j"]` matched the typed text exactly.
- `createdBy: "public-form"` on the new row — correct.

### B-3901 — B-3817 verified fixed (P1, fixed — acceptance)
- `document.querySelector('[data-testid="public-form-submit"]').closest('form')` returns the FORM element with `data-testid="public-form"`. The submit button is `type="submit"` and lives inside the form. `form.requestSubmit()` triggers a row insert + Thanks panel (confirming Enter-in-title would submit too).
- Caveat: dispatching a synthetic KeyboardEvent("keydown", "Enter") on the title input does NOT trigger submit — that's a JSDOM/browser-spec behavior (synthetic key events don't fire native form submission). In a real browser, pressing Enter in a single-line input submits because the form is native. The fix is correct.

### B-3902 — B-3803 verified fixed (P2, fixed — acceptance)
- `[data-testid="show-resolved-toggle"]` exists in PageComments. (See iteration B-39xx below for behavior validation.)

### B-3903 — Public form required-field validation works (P2 → fixed, new acceptance)
- Marked title prop `required: true` directly in localStorage and reloaded. Submitted empty: `"Name is required."` appears in the form, row count did not increment, `public-form-thanks` did not appear.
- Gap: the label "Name" has no asterisk/visual "required" indicator. See I-3900 below.

### B-3904 — Public form select-field value persists on submit (P3 → fixed, I-3603 closes)
- Set Status `<select>` to opt_mp2qmu4durv3zurg ("In progress") + typed a title + `form.requestSubmit()`. New row stored `values["prop_mp2qmu4drjrtqmer"] === "opt_mp2qmu4durv3zurg"`. Confirms I-3603 fixed (select persistence works for status-typed fields).

### B-3905 — Comment delete cascades to replies (P3, fixed — acceptance)
- Posted parent + 2 replies on `pg_mp2pz5zw6oflgc0j`. Verified all 3 in `data.comments` with `parentId` chain.
- Clicked `[data-testid="comment-delete-cmt_mp3kt7d4njalusi6"]` (parent). After delete: 0 of the 3 remained in `data.comments`.
- Cascade works. (Stub passes the original delete-cascade contract.)

### B-3906 — Resolved comments: edit works, but resolve button is one-way (P2, open — re-confirms I-204/B-3813)
- Posted `Resolve me B-3906`, clicked `resolve-<id>`. Comment vanishes from default pane. Toggled `show-resolved-toggle` ON → row reappears with class `opacity-50`. Clicked `comment-edit-<id>` → `comment-edit-input-<id>` textarea appears with original content. Saved new content → `data.comments[id].content` updated AND `resolved` stayed true.
- BUG: With resolved=true, the `resolve-<id>` button text reads "Resolved" but clicking it DOES NOT toggle resolved back to false (clicked twice; both times `resolved: true` persisted). No way to un-resolve a resolved comment short of deleting it. Aligns with I-204 ("Resolved" reads as status, not action) — but worse: action is dead. Recommend: when resolved, render the button as "Re-open" or "Unresolve" and actually toggle the field.
- Severity P2 because the workaround is delete+re-post.

### B-3907 — Calendar event chips STILL not draggable (P2, open — B-2907/B-3513/B-3514 still open)
- Repro: `/app/calendar`, 2 events found in `data.calendarEvents` rendered into `day-2026-05-13`. Each chip is a `<div>` (not draggable element), has no `data-testid`, `el.draggable === false`. No `cal-event-<id>` testid. Drag-reschedule remains unimplemented.

### B-3908 — Cmd+K open/close 5 rapid cycles (acceptance, fixed)
- `/app/calendar` with 101 pages + 141 blocks in workspace. 5 keydown(meta+k) + Escape cycles, each ~52ms (51.1, 52.5, 52.5, 52.7, 55.3). Palette opens, Escape closes consistently. No regression.

### B-3909 — Trash + restore-db round trip (acceptance)
- Marked `db_mp3jj2jnavmaxi0e` as `isInTrash=true` in localStorage, navigated `/app/trash`. `restore-db-db_mp3jj2jnavmaxi0e` testid renders along with `trash-db-` and `delete-forever-db-`. Clicked restore — `isInTrash` flipped to false. Parent page `pg_qa_db_uhgak1` (title "QA DB Test") visible in sidebar again. Round trip clean.

### B-3910 — Hide columns + chip unhide + re-hide (acceptance)
- On `db_mp2qmu4d1va6knov` table view, opened prop-header on Status → clicked `prop-hide-prop_mp2qmu4drjrtqmer`. Chip `hidden-cols-chip-view_mp2qmu4djdr3pyti` appeared reading "1 column hidden(Status) Show all". Clicked "Show all" → chip gone. Re-hid → chip back. Show all again → chip gone. State stable across the cycle.

### B-3911 — AI input STILL single-line (B-3210/B-3806 still open)
- Opened `/app/db/...` with `ai-btn`. `[data-testid="ai-input"]` is `<input>` (not textarea), placeholder "Ask anything...". Pressing Enter still submits as single line, Shift+Enter cannot insert newline. Recommend swap to autosizing `<textarea>`.

### B-3912 — Sort cycle asc → desc → clear on title prop (acceptance)
- prop-header on `prop_mp2qmu4d010rz75j`. Clicked `prop-sort-asc-` → view.sorts = [{direction:'asc',propertyId:...}]. Re-opened, clicked `prop-sort-desc-` → desc. Re-opened — `prop-sort-clear-` testid present (because sort is active). Clicked → view.sorts = []. Aligns with B-3820 design.

### B-3913 — `view-rename-<id>` rename flow uses in-app input, not native prompt (acceptance)
- Clicked `view-menu-view_mp2qmu4djdr3pyti` → menu showed `view-rename-`, `view-delete-`, `view-addprop-`. Clicked rename → `view-rename-input-view_mp2qmu4djdr3pyti` input appeared with current name. Typed "Renamed-3907", pressed Enter → view.name updated. Restored to "All" via direct write. Good — no native prompt.

### B-3914 — Markdown export bookmark uses URL only, ignores bookmarkTitle (P2, open — re-confirms I-3600)
- Repro: built a page with a bookmark block `{url: 'https://example.com', bookmarkTitle: 'Example site', bookmarkDescription: 'Hello'}`. Triggered `page-opt-export-md`.
- Output: `[🔖 https://example.com](https://example.com)` — the title and description are dropped, only the URL appears as both link text and href.
- Expected: emit `[Example site](https://example.com)` (title as link text) or include the description on the next line.
- Severity P2: bookmark export is rendered but data is lost.

### B-3915 — Markdown export of subpage emits only an HTML comment (P2, open)
- Same page included a `subpage` block referencing child page "Child page 3914". Export wrote `<!-- subpage -->\n` and nothing else — neither the child page title, nor a markdown link/heading, nor the inlined child content.
- Expected: at minimum `[Child page 3914](child-page-3914.md)` (link to a sibling export) or an inline heading + children, like Notion's "include subpages" option.
- Severity P2. Equation block however correctly emitted `$$\nE = mc^2\n$$`.

### B-3916 — Unauthenticated /app redirects to /auth (acceptance)
- Wiped `sb-...-auth-token` from localStorage and cleared `notion-clone:global.currentUserId`, then `location.href = '/app'`. Page redirected to `/auth`, `document.title === 'Sign in — NotionClone'`. Re-signing in restored normal workspace.
- Also verified `/app/p/pg_mp2pz5zw6oflgc0j` direct deep link while signed out → also redirected to `/auth`. Permissions gate works for nested page routes too.

### B-3917 — Public form Enter-to-submit verified structurally (acceptance, B-3817 reinforces)
- The form has 3 visible text/number/date inputs + 1 `button[type="submit"]` inside the `<form>` wrapper. Per HTML spec, this guarantees Enter in any single-line input fires `formdata` → `submit`. Manual `form.requestSubmit()` succeeded earlier (B-3901). Synthetic KeyboardEvent doesn't replicate Enter-submit, but that's a browser quirk — real users get implicit submission.

### B-3906 — Resolve button one-way — fixed (commit 447acfb)
- Fix: `resolveComment` now flips `resolved: !c.resolved` instead of always setting true. Verified: posting then clicking Resolve sets label to "Resolved"; second click toggles back to "Resolve" and the comment leaves the resolved bin.

### B-3914 — Bookmark export reuses URL as label, drops metadata — fixed (commit 447acfb)
- Fix: export-markdown.ts bookmark/embed branch now reads optional `bookmarkTitle`/`bookmarkDescription` fields when present, falling back to `caption`, then to the tagged URL. A description renders as a blockquote line below the link.

### B-3915 — Sub-page links inside columns/toggles/synced lost target metadata — fixed (commit 447acfb)
- Fix: `pages` arg now threaded through every recursive blockToMarkdown call (toggle children, columns, synced-block, synced-block-ref). Nested sub-page links now resolve title + href correctly instead of emitting bare "Sub-page".

## 2026-05-13 — Iteration round (B-4000+)

### B-4000 — Resolve toggle round-trip verified (acceptance for B-3906)
- Posted `cmt_mp3lddy0o8438jcy`, opened comments panel, toggled `show-resolved-toggle` on to surface resolved bin. Clicked `resolve-<id>` (label "Resolved") → store flipped `resolved:true→false`, label flipped to "Resolve". Clicked again → `false→true`, label "Resolved". Both store mutation and DOM label change confirmed bidirectional. Closes B-3906.

### B-4001 — Bookmark export with title + description verified (acceptance for B-3914)
- Created bookmark block `{url:'https://example.com', bookmarkTitle:'Doc', bookmarkDescription:'A description'}`. Called `pageToMarkdown(page, blocks, pages)`. Output exactly: `# QA Bookmark Export\n\n[Doc](https://example.com)\n> A description\n`. Title becomes link label, description below as blockquote — matches B-3914 spec.

### B-4002 — Sub-page nested in toggle exports correctly (acceptance for B-3915)
- Created parent page with toggle block, sub-page child pointing at "Child Page Title". Export emitted `<details>\n<summary>My Toggle</summary>\n\n📄 [Child Page Title](/app/p/pg_mp3lgqvzgv27aq6p)\n</details>` — the icon, title, and `/app/p/<id>` route are intact inside the toggle. Closes B-3915.

### B-4003 — Public form table view shows submitted row title + values (acceptance)
- Created form view for `db_mp3lhvrxwl40mnbf`, navigated to `/form/<db>/<view>`, set title input via React `_valueTracker` reset + onChange, selected Status, set Score=42, clicked Submit. Row `row_mp3lkcn7xf38` appeared in store with `values.prop_qa_num:42, prop_mp3lhvrx9qtr7nk5:"QA Submitted Row"`. Navigating to `/app/db/<id>` rendered `cell-title-<row>-<prop>` input.value="QA Submitted Row" and `cell-number` value=42. End-to-end success page also showed "Thanks for submitting!".

### B-4004 — Public form required title validation (acceptance)
- On same form, left title empty and set Score=99 only. Clicked Submit → error text "Name is required." rendered, no row added (`rows.filter(databaseId===dbId).length` unchanged). Required-field gating works when title prop is visible per `form.$dbId.$viewId.tsx:117`.

### B-4005 — Public form Enter-to-submit (acceptance)
- Filled title field via React props.onChange (simulating real keystroke), called `form.requestSubmit()` on the wrapping form element. Row count went from 1 → 2, page transitioned to "Thanks for submitting!". `form.requestSubmit()` is exactly what the browser fires when Enter is pressed in a single-line input inside a `<form>` with a single submit button, so Enter-to-submit is operational. Note: synthetic `KeyboardEvent('Enter')` does NOT trigger submission in Chromium — that's expected browser behavior, not a bug.

### B-3210 / B-3806 / B-3911 — AI input single-line — fixed (commit 41057a4)
- Fix: AIChat replaced `<input type="text">` with a `<textarea>`. Enter still submits the form (form's onSubmit); Shift+Enter inserts a newline (Notion/Slack convention). Auto-grows up to ~6 lines via a ref callback (`min-h-[32px] max-h-40 overflow-y-auto`). Placeholder updated to "Ask anything... (Shift+Enter for newline)".
- Verified live: setting value to "Line 1\nLine 2\nLine 3" preserves all three newlines in the textarea.

### B-3711 / B-3013 / B-2909 / B-2805 — DB table row drag-reorder — fixed (commit c11ffbb) — closes I-3703
- Fix: TableView `<tr>` is now `draggable` with `dragstart/dragover/drop` handlers using a `application/x-row-id` DataTransfer payload. New store action `reorderDatabaseRows(databaseId, sourceRowId, targetRowId)` moves the source so it lands immediately before the target (or appends if null target). A small `row-handle-<id>` ⋮⋮ hint appears on hover with `cursor-grab`. Each row exposes `data-row-id` + `row-<id>` testid.
- Verified live: synthetic drag of row[0] onto row[1] on a 7-row table reorders so source sits immediately before target. Persists to localStorage.

### B-4006 — Public form full-payload end-to-end submit verified (acceptance)
- On QA Form DB `db_mp3lhvrxwl40mnbf`, navigated to `/form/<db>/view_qa_form_mp3ljwhb`. Filled title "B-4006 End-to-End", status "Done", date "2026-05-13", number 77, text "qa-end-to-end". Clicked submit. New row `row_mp3nmhann55g` saved with all 5 values including `prop_qa_num:77`, status optionId for "Done", and date. Visited `/app/db/<id>` table view — cells render exactly with `cell-title`, `cell-select` (text "Done"), `cell-date`, `cell-number`, `cell-text` matching input.

### B-4007 — Public form Enter-to-submit via wrapping <form> + requestSubmit (acceptance)
- Filled title "B-4007 Enter submit", focused title, called `titleInput.closest('form').requestSubmit()`. Row count went 3 → 4, new row `row_mp3nn0l15qvw` persisted with the title, success page showed "Thanks for submitting!". Per HTML spec this is exactly what the browser fires for Enter-in-single-line-input-inside-form-with-one-submit. Closes B-3817 / I-3800.

### B-4008 — Comment delete cascades to replies (acceptance)
- On `pg_mp2pz5zwikifg7r3`: posted parent `cmt_mp3nn9ubprelik1y`, then 2 replies via `reply-input-<parent>` + `reply-submit-<parent>`. Store had 7 comments and 2 replies with `parentId === <parent>`. Clicked `comment-delete-<parent>`. Result: parent + both replies removed from store (`data.comments[<id>]` undefined for all three) and DOM (`comment-row-<id>` gone). Total dropped from 7 → 4. Cascade works as expected.

### B-4009 — Trash + restore cascades on 3-deep tree (acceptance)
- Seeded A→B→C chain. Trashed A via `page-opt-trash`. All three pages flipped `isInTrash:true` and got `trashedAt` stamp. Navigated to `/app/trash`, clicked `restore-<A>`. All three flipped back to `isInTrash:false`. Hierarchical trash/restore both cascade correctly. Note: schema uses `isInTrash` (not `trashed` flag observed in earlier code).

### B-4010 — Calendar view of DB renders no event chips / no drag target (P1, open — re-confirms B-2907)
- Navigated to `/app/db/db_mp3lhvrxwl40mnbf/view_mp3lhvrxrj0lp5pi` (calendar view). No `[draggable=true]` elements, no `[data-row-id]`, no grid-cols-7 calendar grid in the DOM. The calendar view renders an empty container without month grid or event chips — there's nothing to drag-reschedule. B-2907 remains open: calendar drag-reschedule cannot be tested because the calendar UI itself is missing. Severity P1: feature gap on a 1st-class view type.

### B-4011 — Calendar view: chips are draggable but day cells have no drop target (P1, open — re-confirms B-2907)
- On `view_mp3lhvrxrj0lp5pi`: `cal-event-row_<rowId>` is `draggable=true` with an onDragStart handler. The 7-col day grid renders, but day cells are plain `<div class="border-r border-b ... min-h-[80px]">` with no `data-day` / `data-date` attribute, no `data-testid`, no onDragOver / onDrop in React props (only `className`/`children`). The drag chip can be picked up but there's nowhere to drop it; the date prop remains unchanged. To close B-2907, add `data-day="YYYY-MM-DD"` and on the day cell wire `onDragOver={preventDefault}` + `onDrop={handler}` to call a `rescheduleEvent` store action.

### B-4012 — AI textarea multi-line input verified (acceptance for B-3210/B-3806/B-3911)
- `[data-testid="ai-input"]` is now a TEXTAREA (was INPUT). Placeholder reads "Ask anything... (Shift+Enter for newline)". Setting `value` to "Line 1\nLine 2\nLine 3" preserves all three newlines and the textarea auto-grows: height jumped from default to 68px after the multi-line content. Closes B-3210/B-3806/B-3911.

### B-4013 — Cmd+K block-match navigates + highlights matching block (acceptance)
- Opened palette via `sidebar-search`, typed "orientation" (a string only present in a paragraph block on Getting Started, not in a page title). Palette shows two sections: "Pages" and "Block matches". The block match `cmd-block-blk_mp2pz5zwsytlvger` shows the matched paragraph snippet `…ome! Here's a quick orientation.  ·  Getting Started`. Clicking it navigated to `/app/p/pg_mp2pz5zw6oflgc0j` and the target block gets `ring-1 ring-blue-400` highlight ring on its container. Verified.

### B-4014 — Mobile (375px) still has no drawer / hamburger; sidebar overlays content (P1, open — re-confirms B-3521/3522)
- Resized viewport to 375x812. `<aside class="w-64 ... z-30 md:relative max-md:absolute">` becomes absolutely-positioned and occupies left 0→256 of the 375px viewport. There's no `drawer/menu-toggle/hamburger` testid, no `close-sidebar` accessible from main content while sidebar is closed. Result: 256/375 = 68% of the page is permanently occluded by the sidebar on mobile. `close-sidebar` exists *inside* the sidebar but once dismissed there's no way to reopen it on mobile. Severity P1: the app is essentially unusable below md breakpoint.

### B-4015 — Settings dark-mode toggle persists across reload (acceptance)
- `data-testid="dark-btn"` flips `documentElement.classList.dark` AND writes `darkMode:<bool>` into `notion-clone:global` localStorage. Hard reload re-reads the persisted value and applies the correct class on mount. Verified one full cycle (true→false→reload→still false→toggle back to true).

### B-4016 — No view duplicate action in view-menu (P2, open — re-confirms B-3624 gap)
- Clicked `view-menu-view_mp3lhvrxts5dk1bx` — only 3 items visible: `view-rename-`, `view-delete-`, `view-addprop-`. No `view-duplicate-` testid renders. Notion offers "Duplicate view" so users can branch off filters/sorts without rebuilding. Add a `duplicateView(databaseId, viewId)` store action that deep-clones name/filters/sorts/visibility and re-mounts as a new view tab.

### B-4017 — Sidebar pages still not draggable (P1, open — re-confirms B-2908 / B-3712 / B-3616)
- Walked all sidebar buttons/links: every `[data-testid^="page-link-"]`, `[data-testid^="expand-"]`, and unlabeled page row in `<aside>` has `draggable=false`. No `onDragStart` is wired on the sidebar tree. Users cannot reorder pages, nest a page under another, or move it across teamspaces by drag-and-drop. Server-side `parentId` exists, so all that's missing is the DnD layer.

### B-4018 — DB row drag handles + draggable TRs verified (acceptance for B-3711)
- On QA DB table view, every `<tr>` has `data-row-id`, `draggable=true`, plus a `row-handle-<id>` span. React props include `onDragStart`/`onDragOver`/`onDrop`. B-3711 closed.

### B-4019 — 50KB paragraph paste shows no jank (acceptance for perf concern)
- Loaded a paragraph block, focused it, executed `document.execCommand('insertText')` with a 50,004-byte `lorem ipsum` repeat. Synchronous insert took 11ms, full Zustand+re-render settled within 313ms total. No frame drops detected via the timing window; final block.textContent length is 50,011 (matches input). Editor remained responsive.

### B-4020 — Comment edit/delete/reply/resolve buttons lack aria-label (P3, open)
- All four buttons (`resolve-`, `reply-`, `comment-edit-`, `comment-delete-`) render visible text labels ("Resolve", "Reply", "Edit", "Delete") with no aria-label or title attribute. Screen readers will read the visible text, so this isn't a hard a11y failure — but if the buttons ever become icon-only (e.g. responsive variant) they'd lose all labels. Defensive fix: add aria-label mirroring the text. Severity P3.

### B-4021 — `<img onerror>` in block content stripped from published page (acceptance for sanitization)
- Constructed a paragraph block with `content: '<img src=x onerror="window._XSS=1">'` and rendered it through the published page route. Output is `<p></p>` — the `<img>` tag (and its `onerror`) is removed entirely. `window._XSS` never set. No `<img>` elements in the DOM. HTML sanitization on published pages is intact for this vector.

### B-2908 / B-3712 / B-3616 / B-3203 — Sidebar page drag-reorder — fixed (commit b7fc151)
- Fix: PageItem in Sidebar.tsx is now `draggable` with `dragstart`/`dragover`/`drop` handlers. New store action `reorderSiblingPages(sourceId, targetId)` sets the source's `sortOrder` to the midpoint of (target.order, predecessor.order). Page type gains optional `sortOrder?: number` (no migration — falls back to `createdAt`). Sidebar root + child lists now sort by `sortOrder ?? createdAt`.
- Same parent + teamspace only (cross-teamspace moves go through movePage). Each row exposes `sidebar-page-<id>` testid + `data-page-id`.
- Verified live: synthetic drag of sib[2] onto sib[0] sets `sortOrder` so source lands before target.

### B-4022 — Live publish-toggle XSS sanitization (acceptance, stronger than B-4021)
- Published `pg_mp2pz5zwikifg7r3` (slug "welcome") via `share-btn` → `publish-toggle`. Injected paragraph block with content `<img src=x onerror="window._XSS=1">XSS-CANARY-4021`. Visited `/p/welcome` via top-level navigation (not pushState). DOM: `<div data-page-blocks="true"><p>XSS-CANARY-4021</p></div>`. Zero `<img>` elements rendered, `window._XSS` never assigned. Sanitizer strips the entire `<img>` tag (and the onerror attribute with it) on the public route. Re-toggled publish off to clean up.

### B-2907 / B-3513 / B-3514 / B-4010 / B-4011 — Calendar event drag-reschedule — fixed (commit 527cd89)
- Fix: month-grid day cells now have `dragover` + `drop` handlers reading `application/x-cal-event-id`. Event chips are `draggable={e.source === "calendar"}` and dispatch the event id on `dragstart`. New store action `moveCalendarEvent(id, dayKey)` updates the event's `start` to the dropped day while preserving its time-of-day. Verified live: dragging a chip onto a cell 5 days forward updates the event so its local-time YYYY-MM-DD key matches the drop target.
- Each chip exposes `cal-event-<id>` testid + a "Drag to reschedule" tooltip.

### B-3521 / B-3522 / B-4014 — Mobile sidebar UX — fixed (commit bf30b92)
- Fix: app.tsx now watches `useRouterState.location.pathname` and auto-closes the sidebar drawer on route change when `matchMedia("(max-width: 768px)").matches`. Added a global keydown listener so Escape closes the drawer on mobile. The drawer infrastructure (sidebar-scrim backdrop + max-md:absolute overlay + open-sidebar hamburger) was already in place — this adds the missing auto-close + Escape behaviours.

### B-4016 — Duplicate view from ViewMenu — fixed (commit eceb761) — closes I-4002
- Fix: new store action `duplicateView(databaseId, viewId)` deep-clones the source view (filters, sorts, hiddenProperties, view-specific config) and appends "(Copy)" to the name. ViewMenu exposes a `view-duplicate-<viewId>` button right below Rename. Verified live: clicking duplicate on "All" creates "All (Copy)" with matching type; view count grows from 5 → 6.

## 2026-05-13 — QA agent iteration I-4100

### B-4100 — AI textarea acceptance (verifies B-3210/B-3806/B-3911/B-4012)
- `[data-testid="ai-input"]` is a `<textarea rows=1>`. Placeholder: "Ask anything... (Shift+Enter for newline)". Multi-line value `line1\nline2\nline3` preserves `\n` (lines=3, hasNewlines=true). Auto-grows from default to 68px scrollHeight on 3 lines, caps at 160px maxHeight with `overflow-y: auto` on 10 lines (scrollHeight=208, clientHeight=158 — scrollable, no infinite expand). Shift+Enter keeps value unchanged (intercepted as newline). Enter alone clears the input and inserts `ai-msg-0` + `ai-msg-1` testids. B-3210 closed.

### B-4101 — DB row drag-reorder acceptance (verifies B-3711/B-2805)
- On `db_mp2qmu4d1va6knov` (7 rows) embedded in `pg_mp2pz5zws2l1z775`: every `tr` has `data-row-id`, `draggable=true`, `row-<id>` testid, and a child `row-handle-<id>` element. Simulated React-prop `onDragStart` on row idx 6 + `onDragOver` + `onDrop` on row idx 0 via a custom DataTransfer mock (with `types` getter). Result: source moves to idx 0, target shifts to idx 1, persisted to `databases[dbId].rows` order. B-3711 closed.

### B-4102 — Sidebar page drag-reorder acceptance (verifies B-2908/B-3712/B-3616)
- Sidebar pages render with `sidebar-page-<id>` testid + `data-page-id="<id>"` + `draggable=true`. Source `pg_mp2sab5dbg48iqyl` (createdAt 1778599611121) dragged onto target `pg_mp2pz5zw6oflgc0j` (createdAt 1778595731996, no sortOrder). After drop, source.sortOrder = 1778595731746 (250ms before target.createdAt), placing source before target in `sortOrder ?? createdAt` ordering. Same-teamspace constraint enforced. B-2908 closed.

### B-4103 — Calendar event drag-reschedule acceptance (verifies B-2907/B-3513/B-3514)
- On `/app/calendar`: 6 chips visible. `cal-event-evt_*` chips (source==="calendar") have `draggable=true`. `cal-event-row-row_*` chips (DB-derived) have `draggable=false`. Dragged `evt_mp3jrjay0hmfabnk` (2026-05-13 02:00) onto `[data-testid="day-2026-05-20"]`. Result: event.start moved to 2026-05-20, hour/minute preserved (todPreserved=true). B-2907 closed.

### B-4104 — Mobile drawer acceptance (verifies B-3521/B-3522/B-4014)
- With `matchMedia("(max-width: 768px)").matches=true` stubbed: setting `ui.sidebarOpen=true` then clicking `sidebar-inbox` navigates to `/app/inbox` AND flips `ui.sidebarOpen` to false (auto-close on route change). Re-opening + pressing Escape at window level also flips to false. The `sidebar-scrim` backdrop has className containing `md:hidden` (`md:hidden fixed inset-0 z-20 bg-black/40 cursor-default`). All three guarantees in place. B-3521 closed.

### B-4105 — Public form: requestSubmit with Status + Number + Text fields (acceptance)
- On `/form/db_mp3lhvrxwl40mnbf/view_qa_form_mp3ljwhb` (4 inputs: title, status select, score number, testnote text). Filled all 4 then called `form.requestSubmit()`. Row count went 4→5, new `row_mp3oabroazm5` persisted with `values: { prop_mp3lhvrx9qtr7nk5: "B-4105 Enter+Select submit", prop_mp3lhvrx69s5zskr: "opt_mp3lhvrxl3wh2v7y" (=In progress), prop_qa_num: 42, prop_qa_text_mp3lozu0: "hello from QA" }`. Success page shows "Thanks for submitting!". Select + number + text all correctly captured. Closes the multi-field acceptance from continuing coverage.

### B-4106 — Comment edit on a resolved comment via show-resolved-toggle (acceptance for I-3802 + B-3906)
- Posted "B-4106 pre-resolve comment" on `pg_mp2pz5zwikifg7r3` → got `cmt_mp3obm3nc7gi2vq3`. Clicked `resolve-<id>` → `resolved: true`, comment vanished from default view. Clicked `show-resolved-toggle` → comment reappeared, button label "Resolved". Clicked `comment-edit-<id>` → `comment-edit-input-<id>` + `comment-edit-save-<id>` + `comment-edit-cancel-<id>` rendered. Set value to "B-4106 EDITED while resolved" + saved → `comments[id].content` updated, `resolved` still true (edit preserves state). Clicked `resolve-<id>` again → flipped resolved back to false (toggle works both ways). Closes I-3802 + B-3906 (toggle + edit-while-resolved).

### B-4107 — View duplicate action ships (acceptance for B-4016 / I-4002)
- On `pg_mp2pz5zws2l1z775` table view: `view-menu-view_mp2qmu4djdr3pyti` now lists 4 items (rename / duplicate / delete / addprop). Clicking `view-duplicate-...` creates `v_mp3o96cqlkfu2o4q` named "All (Copy)". Deep-cloned: type=table, filters=[], sorts=[], hiddenProperties=[], propertyOrder=[same 4 props in same order], wrapCells=false — verified by JSON.stringify(omit({id,name})) match. Closes B-4016 / I-4002.

### B-4108 — DB trash sets isInTrash but leaves `trashedAt: null` (P1, open)
- Repro: on `pg_qa_db_uhgak1`, opened `db-actions-db_mp3jj2jnavmaxi0e`, clicked `db-trash-...`. After: `isInTrash=true` but `trashedAt=null` (still). After restore via `restore-db-<id>`, `isInTrash=false` and `trashedAt=null`. Expected: trash action stamps `trashedAt = Date.now()` so the 30-day expiry / sort-by-trashed-date can work. Without it, the trash list cannot sort or expire DB entries. Page trash (`isInTrash + trashedAt`) is correctly stamped — this gap is DB-specific.

### B-4109 — Markdown export: rich bookmark renders title + description (acceptance for I-3902)
- Exported `pg_qa_b4001_frln`. Output: `# B-4001 Bookmark Export\n\n[Doc](https://example.com)\n> Notes\n`. Bookmark with `bookmarkTitle="Doc"` + `bookmarkDescription="Notes"` exports as `[Doc](url)` with description on a blockquote line. Closes I-3902.

### B-4110 — Markdown export: sub-page block still emits nothing (P2, open — re-confirms I-3903)
- Exported `pg_qa_b4002_child_95kg` (has one `sub-page` block whose `pageRef=pg_qa_b4002_child_95kg`). Output is only `# B-4002 Child\n` — the sub-page block produces zero lines. Expected: at minimum a heading like `### [<child page title>](<child-slug>.md)` so the export preserves hierarchy. I-3903 stays open.

### B-4111 — Cmd+K block-match scroll-into-view + ring highlight (acceptance for B-4013)
- Opened palette → typed "orientation" → got `cmd-block-blk_mp2pz5zwsytlvger`. Clicked it: monkey-patched `Element.prototype.scrollIntoView` captured `{ behavior: "smooth", block: "center" }` call. Route navigated to `/app/p/pg_mp2pz5zw6oflgc0j`. Target block has classes `group/block relative flex items-start gap-1 py-0.5 ring-1 ring-blue-400`. Both scroll-into-view AND ring-blue-400 highlight verified.

### B-4112 — Row-handle hidden until row hover; sidebar drag affordance missing (P3, open)
- `row-handle-<id>`: classes `cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 mr-1 select-none`. Default `opacity:0` so the grip ⋮⋮ is invisible until the user hovers. Acceptable for desktop UX, but on touch / keyboard-only it's permanently invisible.
- `sidebar-page-<id>` has `draggable=true` but `cursor: auto` — no visual cue (e.g. `cursor: grab` on hover) hints that drag is possible. Discoverability problem for sidebar reordering.

### B-4113 — AI textarea: 20-line stress test (acceptance for B-3210 follow-up)
- Set value to 20 newline-separated lines on `[data-testid="ai-input"]`. Result: `height: 160px` (capped at maxHeight), `clientHeight: 158`, `scrollHeight: 408`, `overflow-y: auto`. Scrollable, no infinite expand. B-3210 hardening confirmed.

### B-4114 — Perf: 200-char insert into paragraph among 52 siblings (acceptance)
- On `/app/p/pg_qa_perf_ibzb` (52 contenteditable paragraphs). Caret at end of one paragraph, `document.execCommand('insertText', false, 'X'.repeat(200))`. Synchronous insert: 12ms. Full settle (incl. zustand re-render): 412ms. Char-by-char typing (50 chars sequentially): avg 2.5ms, max 8ms, 0 frames exceeded 16ms budget. No jank observed.

### B-4115 — Sidebar drag: cross-teamspace drop is correctly rejected (acceptance)
- Source `pg_mp2sab5dbg48iqyl` (teamspace `ts_mp2pz5zwqdkgmzis`) dragged onto target `pg_mp2pz5zws2l1z775` (teamspace `ts_mp2pz5zwvod19q0j`). Result: source teamspaceId unchanged, sortOrder unchanged. Same-teamspace constraint from B-2908 fix is honoured — cross-teamspace moves require the explicit `movePage` action. Closes safety check.

### B-4116 — Calendar: DB-derived chip drop is no-op even with forced onDragStart (acceptance)
- Chip `cal-event-row-row_mp3nmhann55g` (DB-derived; `draggable=false` in DOM). Manually invoked onDragStart props, then onDragOver + onDrop on `day-2026-05-25`. Result: `rows[rowId].values` unchanged (date prop `prop_mp3lhvrx8mfpeiij` still "2026-05-13"). Drop target rejects non-event-calendar drops correctly. Hardens B-2907.

### B-4117 — Cmd+K palette empty state (acceptance)
- Typed "asdkfjlasdjflkadjflk" into palette input. Dialog text: "⌘KNo results". Zero `cmd-page-*` and zero `cmd-block-*` rendered. Empty state copy is present, though not via a dedicated `cmd-empty` testid (which automation would need).

### B-4118 — Create page from sidebar `ts-new-Private` works (acceptance)
- Clicked `ts-new-Private`. Result: store page count 115 → 116, new `pg_mp3oixbhfao8wrfw` with `teamspaceId: ts_mp2pz5zwqdkgmzis` (=Private), `parentId: null`, `createdBy: <currentUser>`. Route navigated to `/app/p/<new>`. Cleanup: trashed via `page-opt-trash` — got `isInTrash:true` AND `trashedAt:1778653789059` (page trash correctly stamps trashedAt, unlike DB trash per B-4108).

### B-4119 — Cmd+J does not open AI panel (P3, open)
- Pressed `Cmd+J` on document — `ai-input` did NOT appear. Pressed `Cmd+K` — palette opened. Only Cmd+K is wired as a global shortcut. The `sidebar-ai` button "Ask AI" has no `title`/`aria-label` advertising a shortcut, and no global keydown listener picks up Cmd+J. Notion's "Ask AI" lives on Cmd+J (Mac) / Ctrl+J — add to taste. P3 because the AI is also reachable via sidebar click.

### B-4108 — DB trash doesn't stamp `trashedAt` — fixed (commit 4ffbb84) — P1
- Fix: db-trash button now passes `{ isInTrash: true, trashedAt: Date.now() }`. NotionDatabase interface gains optional `trashedAt?: number | null`. TrashPage's existing sort (`b.trashedAt - a.trashedAt`) now surfaces newly-trashed DBs at the top.

### B-4119 — Cmd+J doesn't toggle AI panel — fixed (commit 15b089d) — closes I-4105
- Fix: AIChat's useEffect adds a global `keydown` listener that opens/closes the panel on `(metaKey || ctrlKey) + j`. Matches Notion's shortcut.

### B-4112 — Sidebar pages lack cursor-grab — fixed (commit 15b089d) — closes part of I-4103
- Fix: PageItem row gets `cursor-grab active:cursor-grabbing` so the drag affordance is discoverable. The hover-only ⋮⋮ row-handle on DB rows is still hover-only (touch-device gap noted as I-4104).

## 2026-05-13 — QA agent iteration I-4200

### B-4200 — Fix verification batch (B-4108 / B-4016 / B-4119 / B-4112)
- B-4108 (DB trash trashedAt): clicked db-actions then db-trash on `db_mp3jj2jnavmaxi0e`. Result: `isInTrash=true`, `trashedAt=1778654117001` (number, ~507ms before observation). Restore via `restore-db-<id>` flips back to `isInTrash=false, trashedAt=null`. Closed.
- B-4016 (View duplicate): on `db_mp2qmu4d1va6knov`, clicked `view-menu-view_mp2qmu4djdr3pyti` then `view-duplicate-...`. New view `v_mp3orghmt838z3jb` named "All (Copy)", same type/filters/sorts/hiddenProperties as source. views.length 6→7. Closed.
- B-4119 (Cmd+J AI toggle): dispatched `KeyboardEvent('keydown', {key:'j', metaKey:true})` at `document` level. `[data-testid="ai-input"]` appears; second dispatch closes it. Toggle works both directions. Closed.
- B-4112 (sidebar cursor-grab): `sidebar-page-<id>` has classes including `cursor-grab active:cursor-grabbing`. Computed `cursor: grab` confirmed. 109 sidebar page rows all carry the affordance. Closed.

### B-4201 — Calendar same-day drop is correctly a no-op (acceptance)
- Repro: `evt_mp3jrjay0hmfabnk` at 2026-05-20. Dispatched dragstart on the chip, then dragover+drop on `[data-testid="day-2026-05-20"]`. Result: `event.start` unchanged (1779235200000 → 1779235200000). Same-day reschedule does not bump or alter the start timestamp. Confirms drop handler short-circuits when source-day == target-day.

### B-4202 — Calendar `day-add-<date>` cell accepts event drops (P3, open)
- Repro: dragged `evt_mp3jrjay0hmfabnk` onto `[data-testid="day-add-2026-05-25"]` (the small "+" sub-cell). Event moved to 2026-05-25 (beforeISO 2026-05-20 → afterISO 2026-05-25). The day-add cell is meant to *create* a new event, not reschedule an existing one — yet it shares the parent's drop target and quietly accepts reschedule drops too. UX-wise the user can't tell whether their drop landed on "add" or "reschedule"; today both produce the reschedule effect. Either stop propagation on day-add or make it a deliberately distinct drop target.

### B-4203 — Public form: synthetic Enter from text input does not submit (low, P3, open — by design)
- Repro: on `/form/db_mp3lhvrxwl40mnbf/view_qa_form_mp3ljwhb`, filled all 5 fields (text/select/date/number/text) and dispatched `KeyboardEvent('keydown',{key:'Enter'})` on the title input. Row count 18→18 — no submit. Calling `form.requestSubmit()` programmatically does submit (18→19) and the success page renders. HTML-spec-correct: synthetic keydown bypasses implicit-submission. Confirms B-3817 still relies on real browser keydown for implicit submit. Recommendation in I-4100 still applies.

### B-4204 — Cmd+K multi-word block search: substring only, word-order-sensitive (P2, open)
- Repro: opened palette, typed multi-word queries against block "Plan the next quarter's work below. Add tasks via the database."
  - "the next" → 1 block match ✓
  - "plan the" → 1 block match ✓
  - "  Plan THE  " (trim + case) → 1 block match ✓
  - "quarter's work" (apostrophe) → 1 block match ✓
  - "next plan" (words swapped) → 0 block matches ✗
- Expected: token-based AND search so "next plan" finds the same block as "plan next". Today it's a single `String.includes(query)` so any reordering breaks match. Notion supports word-bag matching.

### B-4205 — Comment chain delete-parent cascades to reply (acceptance)
- Repro: on `pg_mp2pz5zwikifg7r3`, posted "B-4205 PARENT comment" → `cmt_mp3ovaretw944ed0`. Clicked `reply-...` → typed in `reply-input-...` → submitted via `reply-submit-...`. Reply `cmt_mp3ovj3xe8kdyiav` created with `parentId = cmt_mp3ovaretw944ed0`. Clicked `comment-edit-<reply>`, edited to "B-4205 REPLY child EDITED" (content updated). Then clicked `comment-delete-<parent>`. Result: BOTH parent and reply deleted from `comments` map — cascade-delete works. No orphan reply left. Good.

### B-4206 — Show-resolved-toggle state not persisted across reload (P2, open)
- Repro: opened comments panel on `pg_mp2pz5zwikifg7r3`, ticked `[data-testid="show-resolved-toggle"]` (checkbox.checked=true). LS dump of `notion-clone:user:<uid>` `ui` keys: `[sidebarOpen, darkMode, expandedPages, favoritesExpanded, teamspacesExpanded, privateExpanded, sharedExpanded]` — no `showResolvedComments`. Did `location.reload()`; after re-opening comments, the checkbox is back to `checked=false`. The toggle is in-memory only, lost on reload. Expected: persist in `ui` slice of zustand store (mirrors `sidebarOpen`/`darkMode`). Touch-points: comments slice or ui slice, and the persist whitelist.

### B-4207 — Markdown export of columns block emits placeholder comments only (P2, open)
- Repro: exported `pg_mp2s7o6wejgdfvj2` via `page-opt-export-md`. Output contains:
  ```
  <!-- multi-column layout: -->
  <!-- column -->
  <!-- column -->
  <!-- column -->
  ```
  Children inside each column are not emitted under the marker. The 3-column layout shows up as comments + an unrelated empty table. Expected: emit each column's child blocks (sequentially under each `<!-- column -->`) or fall through to a flat list. Today the export is lossy for column blocks.

### B-4208 — AI textarea Shift+Enter not preventDefault'd; Enter is (acceptance)
- Repro: on `[data-testid="ai-input"]` (textarea), dispatched `KeyboardEvent('keydown', {key:'Enter', shiftKey:true, cancelable:true})`. `defaultPrevented=false`, dispatchEvent returns true → newline insertion allowed. Plain Enter (no shift): `defaultPrevented=true`, returns false → submit branch intercepts. Confirms Shift+Enter is a real newline path and plain Enter is "send".

### B-4209 — DB row drag: source==target is a no-op (acceptance)
- Repro: on `db_mp2qmu4d1va6knov` (7 rows), invoked row react-props `onDragStart` + `onDragOver` + `onDrop` all on `row-row_mp3kreceq8nz` (same element). Row order before/after: identical 7-id list. The drop handler short-circuits self-drop. Good.

### B-4210 — Cross-teamspace sidebar drop still rejected (acceptance)
- Repro: source `pg_mp2qf91273xzixoe` (`ts_mp2pz5zwqdkgmzis`) dropped onto target `pg_mp2pz5zws2l1z775` (`ts_mp2pz5zwvod19q0j`). Source `teamspaceId` unchanged. Same-teamspace constraint from B-2908 fix still honoured even after recent threading/draggable updates.

### B-4211 — Database view-tab right-click: no context menu (P3, open)
- Repro: dispatched `contextmenu` MouseEvent on `view-menu-view_mp2qmu4djdr3pyti`. `defaultPrevented=false`; `[role="menu"]` count stays at 0. Right-click on view tabs (Notion convention: open the view options menu) is unhandled — browser's native menu would appear. Expected: route right-click to the same ⋯ menu (rename/duplicate/delete) for discoverability.

### B-4212 — Cmd+/ does not open block menu (P2, open — re-confirms B-3405)
- Repro: focused a `[contenteditable="true"]` on `pg_mp2pz5zwikifg7r3`, dispatched `KeyboardEvent('keydown', {key:'/', metaKey:true})`. No `[role="menu"]` opens; no `slash-menu` / `block-menu` testid renders. Notion uses Cmd+/ to open block actions (turn into, color, etc.) on the focused block. Today the shortcut is unhandled. B-3405 remains open.

### B-4213 — Comment action buttons default to type="submit" (P3, open)
- Repro: inspected `comment-edit-*`, `comment-delete-*`, `resolve-*`, `reply-*` buttons — all have `type=submit`. They are NOT inside a `<form>` so the form-submission side-effect doesn't fire, but it's semantically wrong; if these buttons are ever moved inside a form (e.g. comment composer), a stray Enter would invoke the wrong action. Add `type="button"` to the four `<button>`s in the comment row. Easy fix.

### B-4214 — Cmd+K block-match results are capped at ~5 (P2, open)
- Repro: query "is" matches 11 blocks in the store (`Object.values(state.blocks).filter(b => b.content.includes('is')).length === 11`), but `cmd-block-*` testids in the palette = 5. Same for "the" (3 of 8 raw matches). Palette is hard-capping the result list. First-paint after typing was 10.6–22.7ms (acceptable). The cap is a UX choice; expose it as a tunable or add a "View more" overflow row so users find the missing matches via "is" but not via "isabella" etc. Performance: ~11ms is fine, cap is the friction.

### B-4215 — Public form text input lacks `name` / `id` / `htmlFor` association (P2, open — dup of I-3901)
- Confirmed during B-4203 audit: all 5 form inputs have `name=null` and the visible `<label>` is a sibling element without `htmlFor`. Screen reader will not associate "Name" / "Status" / "Date" / "Score" / "TestNote" with their inputs. Wrap each input in its `<label>` or pair via `htmlFor` + `id`. Carry over from I-3901.

### B-4216 — Comment composer has no keyboard submit shortcut (P2, open)
- Repro: `[data-testid="comment-input"]` is a `<textarea>`. Pressing Enter (no shift) does NOT post — `defaultPrevented=false`, comment count unchanged. Pressing Cmd+Enter also does NOT post — comments map unchanged. Only clicking `post-comment` submits. UX issue: most chat-like comment composers in the app support Enter or Cmd+Enter to send. Today users *must* mouse to the button. Pick one: Enter = post + Shift+Enter = newline (matches the AI panel), OR Cmd+Enter = post (matches Slack thread reply convention). Either is fine, status-quo is the worst option.

### B-4217 — db-actions menu unavailable on certain test pages (P3, info)
- Repro: navigated to `/app/p/pg_qa_b4002_child_95kg`. `[data-testid="page-actions"]` does not render — the test page presumably uses a different layout (likely `SubPageView` instead of `PageView`). Means the markdown export pipeline for sub-page-style routes cannot be tested via this menu, only via the parent page's export. Re-export from the parent shows the same lossy result documented in B-4110. Tracking as info — confirms I-3903 / I-4102 are still the right path.

### B-4216 — Comment composer no keyboard submit — fixed (commit 2f408a9) — closes I-4209
- Fix: Cmd/Ctrl+Enter on the comment textarea now posts. Plain Enter still inserts a newline. Placeholder hint updated. Post button explicitly typed `type="button"` (related B-4213 cleanup).

### B-4206 — show-resolved-toggle in-memory only — fixed (commit 2f408a9) — closes I-4206
- Fix: read/write through `ui.showResolvedComments` instead of local useState. Survives reload + cross-tab.

### B-4204 — Cmd+K word-order-sensitive search — fixed (commit 2f408a9) — closes I-4204
- Fix: query split on whitespace; every token must appear (in any order) in title/block-content/db-name. "the next" now matches "plan the next quarter" and vice versa.

### B-4214 — Cmd+K block-match capped at 5 — fixed (commit 2f408a9) — closes I-4205
- Fix: cap raised to 10 (one snippet per page).

### B-4207 — Columns markdown export lossy — fixed (commit 533cd94) — closes I-4207
- Fix: columns export falls back to a parentId scan of the blocks map when the explicit `columnIds` / `blockIds` arrays are missing. Truly-empty columns are skipped; a fully-empty layout emits `<!-- (empty multi-column layout) -->` instead of lonely column markers.

## 2026-05-13 — QA agent iteration I-4300 (verification batch)

### B-4300 — Fix verification: B-4216 / B-4206 / B-4204 / B-4214 all confirmed (acceptance)
- B-4216 (comment Cmd+Enter): on `pg_mp2pz5zwikifg7r3` clicked `comments-btn`, set value on `[data-testid="comment-input"]` and dispatched `KeyboardEvent('keydown',{key:'Enter',metaKey:true})`. Comments map went 6→7 with `content="B-4300 Cmd+Enter test"`. Plain Enter: `defaultPrevented=false` (newline allowed). Click on `[data-testid="post-comment"]` (type="button") also posts 7→8. Placeholder: "Add a comment... (Cmd+Enter to post)". Closed.
- B-4206 (show-resolved persist): clicked `show-resolved-toggle` from unchecked→checked → LS `ui.showResolvedComments=true`. `location.reload()`; after re-opening panel, checkbox still `checked=true`. Closed.
- B-4204 (Cmd+K word-bag): seeded `pg_mp3pbp9evjgq168p` titled "plan the next quarter". Palette queries "next plan", "plan the next", "quarter plan", "quarter the plan", "   plan   QUARTER   " all return the same 2 page hits + 1 block hit. Case + whitespace tolerant. Closed.
- B-4214 (block-match cap 10): seeded 12 new blocks across 12 distinct pages with content "B4300NEEDLE". Palette query "B4300NEEDLE" returns exactly 10 `cmd-block-*` results (one per page, capped). Closed.

### B-4301 — Reply Cmd+Enter parity (acceptance for I-4208 follow-up)
- On `pg_mp2pz5zwikifg7r3`, clicked `reply-cmt_mp3panu2xy1cfdlo`. `reply-input-<id>` placeholder is "Reply… (Cmd+Enter to post)". Set value, dispatched Cmd+Enter on the textarea — comments map went 8→9 with `content="B-4301 reply Cmd+Enter"` and `parentId="cmt_mp3panu2xy1cfdlo"`. Plain Enter (no Shift): `defaultPrevented=false`, comments count unchanged (newline allowed). Click on `reply-submit-<id>` also posts (9→10). Same UX as top-level composer — parity confirmed.

### B-4302 — Calendar drop onto a 3-event day chips one off-screen but accepts the drop (P3, open)
- Repro: seeded 4 events on `2026-05-22` ("Dense 1..4"). Day cell renders 3 chips + "+1" overflow. Dragged `evt_mp3jrjay0hmfabnk` (formerly on 2026-05-25) onto `day-2026-05-22`. Result: drop succeeded, `evt.start` moved to 2026-05-22, the new chip "QA Drag Test" sorted to top of the visible list — but "Dense 3" got pushed below the overflow ("+2 now"). Functional: drop is accepted. UX: the dropped chip's predecessor visibly disappears, which can read as data-loss to a user who's not watching the +N overflow indicator. Consider expanding the visible cap (or animate the overflow growth).

### B-4303 — Public form: conditional rule hiding required Title still allows submit (P3, open — by design)
- Seeded a `conditionalLogic` rule on `view_qa_form_mp3ljwhb`: "showPropertyIds: [titleProp.id] only if Status equals Not started". Loaded the form fresh → title input absent (status defaults to empty, rule fails). Filled only `Score=42` and `form.requestSubmit()`. Result: row count 19→20, new row `values: { prop_qa_num: 42 }` with title field empty. The titleVisible+required gate in `submit()` is bypassed because `titleVisible===false`. No warning to the user that the row has no title — it shows up in the DB as "Untitled". Either: (a) when title is hidden by a rule, auto-derive title from another field, or (b) at minimum surface a hint in the success message. Current behaviour is HTML-correct but loses the row's identity.

### B-4304 — Cmd+P opens command palette (acceptance — Notion alias)
- Pressed `KeyboardEvent('keydown',{key:'p',metaKey:true})` at `document` from `/app`. `[role="dialog"]` rendered, `[data-testid="command-input"]` focused. Same path as Cmd+K. Closes any user muscle-memory gap from Notion's "Cmd+P = Find page".

### B-4305 — Reply composer keyboard parity full audit (acceptance)
- Placeholder "Reply… (Cmd+Enter to post)" on every visible `reply-input-<id>`. textarea + button parity: same handler covers Cmd+Enter, Ctrl+Enter, plain Enter (newline), and `reply-submit-<id>` click. No regression from the top-level composer fix. Closes I-4208 follow-up + B-4301.

### B-4306 — Reply edit cycle (`comment-edit-<replyId>` + save) works (acceptance)
- Reply `cmt_mp3pf6jotajentsn` (parentId set). Clicked `comment-edit-<replyId>` → rendered `comment-edit-input-<id>`, `comment-edit-save-<id>`, `comment-edit-cancel-<id>`. Replaced value, clicked save → `comments[id].content` updated to "B-4306 reply EDITED via comment-edit-save", `parentId` preserved. Edit on a nested reply works identically to top-level edit.

### B-4307 — `ui.showResolvedComments` persists in both directions (acceptance for B-4206 expansion)
- Toggled `show-resolved-toggle` from checked→unchecked: LS `ui.showResolvedComments=false`. Toggled back: `ui.showResolvedComments=true`. State survives reload (B-4206) AND both transitions. Persistence whitelist includes the key.

### B-4308 — DB trash restore from `/app/trash` (acceptance for B-4108 + I-4101)
- Trashed `db_mp3jj2jnavmaxi0e` (isInTrash=true, trashedAt stamped). Navigated to `/app/trash` → row labelled "Untitled database · 3 rows · Restore · Delete" (rendered via the same listing path as pages). Clicked `restore-db-<id>` → `isInTrash=false`, `trashedAt=null`, button removed from the listing. Round-trip works.

### B-4309 — AI assistant message renders markdown bold/italic/code (acceptance)
- Sent `Explain **bold** and *italic* and ` + "`code`" + ` markdown` on `ai-input`, Enter. Last `ai-msg-<n>` HTML contains `<strong>bold</strong>`, `<em>italic</em>`, `<code class="...">code</code>`, plus an opportunistic `<pre><code>` block from the AI demo response. Markdown serializer is wired and `dangerouslySetInnerHTML` (or equivalent) renders inline marks correctly. Closes the markdown rendering acceptance.

### B-4310 — Sidebar trash empty state (acceptance)
- Emptied trash (restored all pages, restored db, cleared trashedAt). Clicked `sidebar-trash` → `/app/trash` main area shows "Trash is empty." in plain copy. No restore buttons rendered, no error. Empty state is present though not via a dedicated `trash-empty` testid (automation would need innerText scrape).

### B-4311 — Cmd+K arrow-down + Enter (acceptance for I-4207 follow-up)
- Opened palette with "Bulk" query — 5 `cmd-page-*` results. Initial active=`cmd-page-pg_qa_bulk_0_4ap` (`data-active="true"`). Pressed ArrowDown twice → active=`cmd-page-pg_qa_bulk_2_2o4`. Pressed Enter → route navigated to `/app/p/pg_qa_bulk_2_2o4`, palette closed. Keyboard navigation honours the highlighted item. (Earlier confusing result with "roadmap" was because both items pointed to the same page id, masking the routing.)

### B-4312 — Multi-select cell editor add + remove (acceptance)
- On `pg_qa_db_uhgak1`, clicked `cell-select-row_mp3jk8zuxoypboda-prop_mp3jj2jnh8n0aijp` → popover with `select-search-*` input ("Search or create…") and `select-option-<optId>` rows. Sequence: empty → click Important → `["opt_mp3jj2jnd9zrmona"]` → click Idea → `["opt_mp3jj2jnd9zrmona","opt_mp3jj2jnu4z5k8fj"]` → click Important again → `["opt_mp3jj2jnu4z5k8fj"]` (removed). Order is preserved when adding, and removal works mid-list.

### B-4313 — Cmd+J / Cmd+K / Cmd+P are safe on AUTH route (acceptance)
- Signed out via Settings → page redirected to `/auth`. Dispatched Cmd+J, Cmd+K, Cmd+P keydowns at document. Result: zero JS errors (`window.onerror` captured none), `[data-testid="ai-input"]` and `[data-testid="command-input"]` did not mount (AppShell isn't mounted on /auth), sign-in form still rendered. Global keybindings degrade gracefully on the public route.

### B-4314 — ib-ai with selection pre-fills AI prompt (acceptance)
- Selected text via `execCommand('selectAll')` inside `[data-block-id="blk_mp2pz5zwsu2wpqe6"]` → inline toolbar rendered with `ib-bold/italic/underline/strike/code/link/color/ai`. Triggered `mousedown` on `[data-testid="ib-ai"]`. Result: AI panel opened (`ai-input` rendered), value pre-filled with `Ask AI about: "Your workspace is organised by teamspaces (Private, Engineering, Shared)."`. The CustomEvent `open-ai-chat-with` handler quotes the first 200 chars of the selection. Closes the "ib-ai opens AI with prompt" acceptance.

### B-4315 — Comment composer Ctrl+Enter parity for Linux/Win users (acceptance)
- On `[data-testid="comment-input"]` dispatched `KeyboardEvent('keydown',{key:'Enter',ctrlKey:true})`. Comments map went 10→11 with `content="B-4315 Ctrl+Enter test"`. Both `metaKey` (Mac Cmd+Enter, B-4216) and `ctrlKey` (Win/Linux) trigger post. Shift+Enter remains a newline (`defaultPrevented=false`). Three keyboard modes covered: Cmd+Enter, Ctrl+Enter, Shift+Enter (newline).

### B-4316 — Cmd+P preventDefault'd so browser print stays disabled (acceptance)
- Dispatched `KeyboardEvent('keydown',{key:'p',metaKey:true,cancelable:true})` at document → `ev.defaultPrevented=true`. Browser print dialog therefore suppressed and palette opens. Matches Cmd+K behaviour. Closes the regression risk noted in I-4303.

### Tracker — three UX polish items (commit 6484519)
- I-4302: `cmd-empty` testid on Cmd+K palette empty state + `trash-empty` testid on /app/trash empty state.
- I-4304: ib-ai now embeds the page title in the AI prompt → `On page "<title>", help me with: "<selection>"`.

## 2026-05-13 — QA agent iteration B-4400

### B-4400 — Columns export markdown (acceptance for B-4207, fixed)
- Seeded a `columns` block on `pg_mp2pz5zw6oflgc0j` with 2 columns, each with one paragraph (`B-4207-LEFT-PARA`, `B-4207-RIGHT-PARA`), and a second `columns` block with `columnIds: []` (truly empty).
- Intercepted `Blob` and dispatched `export-page-markdown`. Captured MD contains `<!-- multi-column layout: -->`, two `<!-- column -->` markers, both paragraph contents in order, and then `<!-- (empty multi-column layout) -->` for the empty block.
- Closes B-4207. The `columnIds || parentId-scan` fallback works.

### B-4401 — Cmd+K palette `cmd-empty` testid renders (acceptance for I-4302, fixed)
- Opened palette via `[data-testid="sidebar-search"]`, typed `zzzz_no_match_query_xyz_4400`. `[data-testid="cmd-empty"]` rendered with innerText "No results". `[data-testid^="cmd-page-"]` count = 0. Automation can now target the empty state without scraping innerText.

### B-4402 — `/app/trash` `trash-empty` testid renders (acceptance for I-4302, fixed)
- Pages-trashed=0, dbs-trashed=0. Navigated to `/app/trash`. `[data-testid="trash-empty"]` rendered with innerText "Trash is empty.". No restore buttons. Empty branch is now testid-addressable.

### B-4403 — `open-ai-chat-with` embeds page title (acceptance for I-4304, fixed)
- Dispatched `new CustomEvent('open-ai-chat-with', { detail: { selected: 'X', pageTitle: 'Y' } })` from `/app/p/pg_mp2pz5zw6oflgc0j`. `[data-testid="ai-input"]` mounted with value `On page "Y", help me with: "X"` — matches the spec verbatim.

### B-4404 — Reply Cmd+Enter posts a child comment (acceptance, fixed)
- Target: `cmt_mp3niuvytmw222be` on `pg_mp2pz5zwikifg7r3`. Clicked `reply-cmt_mp3niuvytmw222be`, set `reply-input-<id>` value to "B-4400 reply via Cmd+Enter", dispatched `keydown` with `key=Enter, metaKey=true`. Comments map gained one child with `parentId=cmt_mp3niuvytmw222be` and matching content. Parity with comment composer confirmed.

### B-4405 — Move sub-page to a different teamspace nulls parentId (acceptance for new coverage 1)
- On `/app/p/pg_mp2srzedee1ec1wa` (parentId=pg_mp2pz5zwikifg7r3, ts=Private). Opened `page-options` → menu listed `page-opt-move-ts_*` for all 4 teamspaces. Clicked `page-opt-move-ts_mp2pz5zwvod19q0j` (Engineering). After: `teamspaceId=ts_mp2pz5zwvod19q0j`, `parentId=null` (promoted to top-level of new teamspace). Sidebar reflowed: `[data-testid="sidebar-page-pg_mp2srzedee1ec1wa"]` now under Engineering section. Behaviour matches Notion's "move-to-teamspace makes it a root page there".

### B-4406 — Synced-block-ref export propagates source content (acceptance for new coverage 2)
- Seeded a `synced-block` on `pg_mp2pz5zw6oflgc0j` with one child paragraph ("B-4400 synced source content"), and a `synced-block-ref` on `pg_mp2pz5zws2l1z775` with `sourceId` pointing back. Triggered export-page-markdown on the REF page; output contains the source content verbatim ("B-4400 synced source content"). Matches `export-markdown.ts:209-217` which scans `parentId === source.id` for the ref's children. Refs don't go stale in exports.

### B-4407 — Inline DB combines multiple filter rules with AND (acceptance for new coverage 3)
- Added two filters to view "All" on `db_mp3jj2jnavmaxi0e`: (1) Name contains "a", (2) Tags is-not-empty. JS preview: rule-A matches 6/6, rule-B matches 1/6, intersection=1 row (`row_mp3jk8zuxoypboda`). UI on `pg_qa_db_uhgak1` rendered exactly 1 `row-*` element, matching the intersection. Implicit AND via `filters.every()` in `filter.ts:5` works; no "or" combinator surface in the UI which is fine for now.

### B-4408 — Page-link block renders icon + title (acceptance for new coverage 4)
- Seeded `page-link` block (id=blk_b4400_pagelink) on `pg_mp2pz5zw6oflgc0j` with `pageId=pg_mp2pz5zws2l1z775` (Roadmap Q3, icon set to 🚀). `[data-testid="pagelink-blk_b4400_pagelink"]` rendered with innerHTML `<span>🚀</span><span class="underline ...">Roadmap Q3</span>`. Both icon (🚀) and title ("Roadmap Q3") present.

### B-4409 — Calendar same-day drag is a no-op for the chip's exact start time (acceptance for new coverage 5)
- Event `evt_qa_b4302_0_*` start=1779436800000 on 2026-05-22. Simulated DataTransfer "application/x-cal-event-id" → dispatched dragstart, dragover, drop on `day-2026-05-22`. `moveCalendarEvent(id, "2026-05-22")` preserves hour/minute of original start; result: start unchanged (sameStart=true), end unchanged (sameEnd=true). No visible chip jumping, no data churn. Matches expected.

### B-4410 — Sign-out → /auth → sign-in cycle (acceptance for new coverage 6)
- Clicked `[data-testid="sign-out"]` from `/app`. Redirected to `/auth` with email/password inputs and one `<form>`. Filled arsene+test1@notionclone.app / test12345, called `form.requestSubmit()`. After ~3s: route=`/app`, sidebar mounted (sidebar-settings present). Round-trip works. No console errors observed.

### B-4411 — Wiki badge & Verify flow (acceptance for new coverage 7)
- Set `pages[pg_mp2pz5zw6oflgc0j].isWiki=true, verifiedAt=null`. After reload, header rendered "🪪 Wiki page · Not verified" plus `[data-testid="verify-wiki"]` button. Clicked Verify; badge updated to "🪪 Wiki page · Verified", `verifiedAt` stamped to now(), `verifiedBy` = current user id. The Verify button disappears (conditional render). Works as documented in PageView.tsx:242-254.

### B-4412 — Block-jump highlight is transient; not restored on browser back (P3, open — for new coverage 8)
- Cmd+K, query "Plan the next", click `cmd-block-blk_mp2pz5zwr51z7xke`. Route changed to /app/p/pg_mp2pz5zws2l1z775, target block briefly got `ring-1 ring-blue-400` for 1500ms (CommandPalette.tsx:184-185). Waited >1700ms (ring gone) → history.back() to /app → history.forward() back to the same page → ring NOT restored. By design (no persistent highlight state), but a user who navigates away mid-flash and comes back loses the visual cue. Consider persisting `highlightBlockId` in a hash anchor (`#blk_*`) so back/forward re-applies the flash.

### B-4413 — `/page` slash command creates sub-page + sidebar updates (acceptance for new coverage 9)
- On a contenteditable text block, set HTML "/page" → SlashMenu shows two matches (basic "Page" + advanced "Synced block"). Pressed Enter → page count went 117→118; new page `{ title: "Untitled", parentId: "pg_mp2pz5zw6oflgc0j" }` minted. Sidebar `sidebar-page-*` count went 115→116 (live reactive). The slash handler at Block.tsx:421-429 calls `createPage` + transforms the current block to a `sub-page` referencing the new page.

### B-4414 — AI textarea max-height + internal scroll (acceptance for new coverage 10)
- `[data-testid="ai-input"]` is a `<textarea>` with `max-height: 160px`, `overflow-y: auto`. Filled with 8 newline-separated lines: scrollHeight=328, clientHeight=158. Parent panel `parentRect.bottom <= window.innerHeight` (no overflow); content scrolls internally. The textarea does not push the panel off-screen even with many lines.

### B-4010 / B-4011 — DB calendar view auto-picks date prop + friendlier empty state — fixed (commit 1494bc4)
- Fix: CalendarView falls back to the first `type === "date"` property when `view.dateProperty` is missing/stale. Empty-state copy more actionable + `cal-needs-date-<dbId>` testid.

### B-4412 / I-4402 — Block-jump highlight is transient — fixed (commit 1494bc4)
- Fix: Cmd+K block-result click now appends `#block-<id>` to the URL. PageView reads `window.location.hash` on mount + hashchange, scrolls into view, adds persistent `ring-2 ring-blue-400` (single block; prior highlight cleared). Back/forward restores the highlight.

## 2026-05-13 — QA agent iteration B-4600

### B-4600 — paragraph / bulleted-list / header-1 / numbered-list-item aliases render (acceptance, fixed)
- Seeded four blocks with the aliased type names on `pg_mp2pz5zw6oflgc0j` and reloaded. `[data-block-id="blk_b4600_para"]` → "B-4600 PARA test"; `blk_b4600_bul` → "•\nB-4600 BUL test"; `blk_b4600_h1` → heading text; `blk_b4600_num` → "1.\nB-4600 NUM test". None render the "Unsupported block: …" sentinel. Block.tsx alias map at lines 42–54 routes through `BlockComponent` recursively.

### B-4601 — `export-page-markdown` honours `{ noDownload: true }` (acceptance, fixed)
- Pre-zeroed `window.__lastAnchorClick` and `window.__lastExportedMarkdown`. Dispatched `new CustomEvent('export-page-markdown', { detail: { noDownload: true } })`. After 250ms: `__lastExportedMarkdown` is a 704-char string starting with "# Getting Started"; `__lastAnchorClick` stays `null` — no Save-As dialog, no programmatic `a.click()`. Safe for automation.

### B-4602 — `#block-<id>` hash-driven highlight persists past 1.5s (acceptance for B-4412, fixed)
- Navigated to `/app/p/pg_mp2pz5zw6oflgc0j#block-blk_b4600_para`. After 600ms the target div has `className` containing `ring-2 ring-blue-400`. Persists (not the 1500ms transient flash). Closes the B-4412 follow-up; PageView now hangs the ring off the URL hash so back/forward and reload all restore it.

### B-4603 — Calendar view falls back to first date prop when `dateProperty` is undefined (acceptance for B-4010, fixed)
- View `view_qa_b4500_cal_undef` on `db_mp3jj2jnavmaxi0e` has no `dateProperty` field. Selected it on `pg_qa_db_uhgak1`; `[data-testid="cal-grid-db_mp3jj2jnavmaxi0e"]` rendered with 30+ `cal-add-2026-MM-DD` cells and the existing event `cal-event-row_qa_b4500_today` placed correctly. No `cal-needs-date-*` empty-state shown. CalendarView correctly falls back to the first `type === "date"` property.

### B-4604 — Orphan page (no teamspace, no parent) is invisible in the sidebar (P2, open)
- Seeded `pg_b4600_orphan` with `teamspaceId: null, parentId: null` and reloaded. Direct nav `/app/p/pg_b4600_orphan` renders title + breadcrumb fine. Cmd+K "Orphan" lists it under `cmd-page-pg_b4600_orphan`. But sidebar shows zero entries for it across FAVORITES / Private / Engineering / Shared / Test Teamspace sections — there's no "Other" / "Orphan" bucket. A user who creates a page programmatically (or via a future feature that nulls teamspaceId) loses sidebar discoverability and depends on search or browser history. Either render an "Other" section for `teamspaceId == null`, or guard write paths so a page always lands in *some* teamspace.

### B-4605 — AI textarea auto-grows for 4-line input (acceptance, fixed)
- Empty `[data-testid="ai-input"]` height=30px. Set value to "L1\nL2\nL3\nL4" via the native setter + dispatched `input`. After 200ms: clientHeight=86px, scrollHeight=88px (so all 4 lines visible, no internal scrollbar yet), `max-height: 160px`. Confirms auto-resize fires on input and grows linearly until 160px cap kicks in — matches B-4414 spec.

### B-4606 — View duplicate copies hiddenProperties + filters + sorts (acceptance, fixed)
- Source view `view_mp3jj2jnrvx2tfui` configured with `hiddenProperties=[3 ids]`, 2 filters, 1 sort. Clicked `[data-testid="view-duplicate-view_mp3jj2jnrvx2tfui"]`. New view minted ("All (Copy)"): `hiddenProperties` matches all 3 source ids verbatim, both filters preserved (operator + propertyId + value), sort preserved, `propertyOrder` preserved. View duplication is faithful.

### B-4607 — Public form ignores `view.hiddenProperties` (P2, open)
- DB `db_mp3lhvrxwl40mnbf` with form view `view_b4600_form_select`; set `hiddenProperties` to 5 of 6 props (only Status select left). Navigated to `/form/db_mp3lhvrxwl40mnbf/view_b4600_form_select`. Form renders ALL 5 non-title props (Status, Tags, Date, Score, TestNote) — `hiddenProperties` is ignored. `routes/form.$dbId.$viewId.tsx:55-89` only consults `conditionalLogic`. If a form-builder user hides cols in the in-app view, they reasonably expect those hidden cols to disappear publicly. Either honour `hiddenProperties`, or use a dedicated `formHidden` field per property and hide in both spots.

### B-4608 — Public form select-only submit passes validation when title hidden (acceptance, fixed)
- On `view_b4600_form_select`, the existing rule shows title only when Status=Not-started. Picked Status=Done (title stays hidden). Clicked `[data-testid="public-form-submit"]` with no other field filled. Row count went 7→8, success screen rendered ("Thanks for submitting!"). New row has `values.<status>="opt_…Done"` and `values.<title>=""` — matches the intent described in I-4300 (form passes validation when title is rule-hidden, leaving title empty).

### B-4609 — Cmd+K first paint under 25ms with 120 pages (acceptance, fixed)
- `pageCount=120`. Clicked `[data-testid="sidebar-search"]`; measured time-to-`[data-testid="command-input"]` and time-to-first `cmd-page-*` via `requestAnimationFrame` polling. Both landed at ~19.5ms. Initial result list capped at 10 entries (windowed). No perceivable lag at this scale — fuzzy filter is cheap.

### B-4610 — Comment edit + delete via testids works end-to-end (acceptance, fixed)
- On `pg_mp2pz5zwikifg7r3` opened comments pane (`comments-btn`). Comment `cmt_mp2rjstpw9beq7dl` exposes `comment-edit-<id>` → click reveals `comment-edit-input-<id>` (textarea) + `comment-edit-save-<id>` + `comment-edit-cancel-<id>`. Edited content to "B-4600 edited content", saved → store updated. Then clicked `comment-delete-<id>` (window.confirm overridden true) → comment removed from store + DOM. Both flows expose distinct testids; automation-ready.

### B-4611 — Cross-DB row drop duplicates rowId into target DB (P1, open)
- Two inline DB blocks on same page: `db_mp3jj2jnavmaxi0e` (row `row_mp3jk8zuxoypboda`, DB-A) and `db_mp3lhvrxwl40mnbf` (DB-B). Dispatched HTML5 dragstart on `row-handle-row_mp3jk8zuxoypboda` then drop on `row-row_mp3lkcn7xf38` (a DB-B row). After: DB-B's `rows` array gained `row_mp3jk8zuxoypboda` at position 0 (count 8→9), DB-A's `rows` unchanged (still references the same id), and `rows[row_mp3jk8zuxoypboda].databaseId` still points to DB-A. Result: same row id is referenced by two databases — DB-B now displays a "phantom" row whose values belong to a row owned by DB-A; deleting from one DB leaves the orphan in the other. `TableView.tsx:63-67` calls `reorderDatabaseRows(databaseId=TARGET_DB, sourceId, row.id)` without checking that the source row's `databaseId` matches the target. `store.ts:1226-1247` `reorderDatabaseRows` happily splices into any DB's rows array. Should be a no-op when `s.rows[sourceRowId].databaseId !== databaseId`.

### B-4611 — Cross-DB row drag duplicated row id — fixed (commit dc8f930) — P1
- Fix: `reorderDatabaseRows` now bails when `state.rows[sourceRowId].databaseId !== databaseId`. Cross-DB drops are a no-op instead of corrupting state.

### B-4607 — Public form ignored view.hiddenProperties — fixed (commit dc8f930)
- Fix: form `fields` memo now also drops any prop listed in `view.hiddenProperties`. Form builder's Hide column now removes the field from public submission.

### B-4604 — Orphan pages invisible — fixed (commit dc8f930)
- Fix: Sidebar gains an "Other" section listing pages with no teamspaceId AND no parentId. Sorted by `sortOrder ?? createdAt`. Testid `sidebar-other-section`.

### B-4700 — B-4611 cross-DB drag guard verified (acceptance, fixed)
- Seeded DB-A (rows:[rowA1]) + DB-B (rows:[rowB1]) via localStorage + StorageEvent rehydrate. Navigated to `/app/db/db_qa_b4700_B`, built a synthetic `drop` event with `application/x-row-id=row_qa_b4700_A1` and dispatched it on `[data-testid="row-row_qa_b4700_B1"]`. After: `state.databases.db_qa_b4700_B.rows` still `[row_qa_b4700_B1]` — rowA NOT inserted. DB-A's rows unchanged. `rows[row_qa_b4700_A1].databaseId` still `db_qa_b4700_A`. The store guard in `reorderDatabaseRows` (store.ts:1238-1239) bails out cleanly. Regression hardened.

### B-4701 — B-4607 public form respects hiddenProperties verified (acceptance, fixed)
- Patched DB-A's properties + appended a form view with `hiddenProperties:["prop_qa_b4607_hidden"]`, plus a sibling visible prop. Navigated `/form/db_qa_b4700_A/view_qa_b4607_form`. DOM rendered: `public-form-title`="QA Form", fields=[`public-form-field-prop_qa_b4700_A_title`, `public-form-field-prop_qa_b4607_visible`]. The hidden prop's testid is absent. form.$dbId.$viewId.tsx:60-72 filter logic working as advertised.

### B-4702 — B-4604 sidebar "Other" section verified (acceptance, fixed)
- Injected page `pg_qa_b4604_orphan` with `teamspaceId:null, parentId:null, isInTrash:false`. Reloaded /app. Sidebar now renders `[data-testid="sidebar-other-section"]` with `[data-testid="sidebar-page-pg_qa_b4604_orphan"]` inside it (text "🪐Orphan QA Page"). OrphanSection memo in Sidebar.tsx:357-372 filters + sorts by `sortOrder??createdAt` as documented.

### B-4703 — Block type aliases all render correctly (acceptance, fixed)
- Injected page with 6 blocks using `paragraph`, `bulleted-list`, `header-1`, `header-2`, `header-3`, `numbered-list-item`. Rendered DOM: each `block-content-*` carries the right placeholder + class — `header-1` → `text-3xl font-bold` + "Heading 1" placeholder, `header-2` → `text-2xl font-semibold`, `header-3` → `text-xl font-semibold`, `bulleted-list`/`numbered-list-item` → "List" placeholder, `paragraph` → "Type / for commands". Zero `Unsupported` fallbacks. Block.tsx:42-54 alias-shim recurses cleanly to the canonical type.

### B-4704 — Comment edit + delete on resolved comment with show-resolved on (acceptance, fixed)
- Seeded `cmt_qa_b4704_resolved` (resolved:true) on page; set `ui.showResolvedComments=true`. Opened comments pane (`comments-btn`). Row visible despite resolved (opacity-50 styling), edit + delete buttons rendered. Clicked `comment-edit-…` → `comment-edit-input-…` textarea appeared, set value via native setter + input event, clicked `comment-edit-save-…`. Store: `content=Edited resolved content B-4704`, `resolved` stayed true, `editedAt` set. Clicked `comment-delete-…` (window.confirm overridden) → comment removed from store + DOM.

### B-4705 — Duplicate view then delete original leaves DB usable (acceptance, fixed)
- DB-A had `viewA1` (table). Opened `view-menu-viewA1`, clicked `view-duplicate-viewA1` → new view `v_mp3rkt5xiau2yiin` "Default (Copy)" appended. Deleted `viewA1` (UI menu re-render caused stale-ref weirdness in eval timing, so removed via state mutation matching the same payload). Reloaded `/app/db/db_qa_b4700_A`. Active view `v_mp3rkt5xiau2yiin` renders `row-row_qa_b4700_A1` correctly; `table-add-db_qa_b4700_A` button works and added a new row (`db.rows` grew 1→2). DB remains fully functional.

### B-4706 — Calendar event chips draggable + day cells drop-target (acceptance, fixed)
- DB `db_mp2qmu4d1va6knov` has calendar view `view_mp2qmu4dvpoy4g18` over date prop `prop_mp2qmu4dbznau5f7`. Row `row_mp2qn5xjhtzcu2ak` was on 2026-05-15. `cal-event-*` chip has `draggable="true"`. Dispatched dragstart, then synthetic dragover + drop on a different day cell carrying key 2026-04-27. After: `rows[row_mp2qn5xjhtzcu2ak].values[dateProp]=2026-04-27` — date moved correctly. CalendarView.tsx:122-127 drop handler picks up the `text/x-row-id` payload and calls `updateRow`.

### B-4707 — Cmd+K opens fast with 322 pages, fuzzy filter narrows (acceptance, fixed)
- Bulk-injected 200 `pg_qa_perf_*` pages on top of existing seed (total 322 in `state.pages`). Dispatched `open-command-palette`. `command-input` appeared at 14.9ms; first `cmd-page-*` at 15.0ms. Initial result list capped at 10. Typed "PerfPage 101" via native setter + input event — re-rendered in 16ms with exactly 1 result `cmd-page-pg_qa_perf_101`. Performance comfortably under 25ms target at this scale.

### B-4708 — Public page sanitizer blocks script / iframe srcdoc / svg onload / javascript: href (acceptance, fixed)
- Direct `sanitize.ts` unit calls: `<script>alert(1)</script>hello` → text-only "alert(1)hello"; `<iframe srcdoc="<script>…</script>"></iframe>safe` → "safe"; `<svg onload="alert(1)">x</svg>visible` → "xvisible"; `<img onerror=alert(1)>` → ""; `<a href="javascript:…">click</a>` → `<a>click</a>` with href stripped. Published `pg_qa_b4708_xss` with 3 malicious text blocks and visited `/p/b4708xss`. window.__pwned* never set; 0 `<script>`, 0 `<iframe>`, 0 `<svg[onload]>` in DOM; surrounding text ("after-script" etc.) survived. routes/p.$slug.tsx:82 + sanitize.ts:32-78 form a robust XSS wall.

### B-4709 — Synced source edit propagates to ref nested in column inside toggle (acceptance, fixed)
- Built page A with `synced-block` source containing text child "ORIGINAL_CONTENT_B4709". Built page B with `columns > column > toggle > synced-block-ref` (sourceId pointing at source). Expanded toggle on page B — ref rendered the source's child correctly. Mutated source-child content to "UPDATED_CONTENT_B4709_v2" via store. Within ~200ms the nested ref's rendered text reflected the new content (child element's textContent matched). Confirms ref pulls from `allBlocks[source.id]` children live without local caching even through 2 layers of layout blocks (columns + toggle).

### B-4710 — Trash > restore database keeps rows visible (acceptance, fixed)
- Marked `db_qa_b4700_B` as `isInTrash:true, trashedAt:now`. Navigated /app/trash — appeared under `trash-db-db_qa_b4700_B`. Clicked `restore-db-db_qa_b4700_B`. State after: `isInTrash:false, trashedAt:null, rows:[row_qa_b4700_B1]`, source row still exists in `state.rows`. Navigated to `/app/db/db_qa_b4700_B` — `row-row_qa_b4700_B1` rendered in the table view. Round-trip clean.

### B-4711 — Global /app/calendar week-view chips NOT draggable (P3, open)
- DB calendar view (`CalendarView` in views/) correctly wires `draggable=true` on event chips and `onDrop` on day cells (verified B-4706). However the workspace-wide /app/calendar route's WeekStrip (app.calendar.tsx:306-350) renders event chips as plain `<div>` with no `draggable`, no `onDragStart`, and the `week-day-<k>` cells have no `onDragOver`/`onDrop`. Users dragging an event in week view get no behavior. Either disable the cursor:pointer styling or add the same DnD wiring (`onDragStart` setting `text/x-event-id`, `onDrop` calling `moveCalendarEvent`). Low priority because the day strip already supports it indirectly via the compose popover, but inconsistent across views.

### I-4700 — Sanitize hard-drops dangerous tags — fixed (commit 44ce947)
- `<script>`, `<iframe>`, `<style>`, `<noscript>`, `<template>`, `<object>`, `<embed>` are now removed WITH their children. Body no longer leaks as visible text. Verified: `Visible<script>alert('boom')</script>OK` → `VisibleOK`.

### I-4701 — Inline DB shows Trash placeholder — fixed (commit 44ce947)
- When `db.isInTrash`, InlineDatabase renders a dashed-border placeholder with a Restore button instead of the full UI. Testids `db-trashed-placeholder-<id>` / `db-restore-<id>`.

### I-4702 — Cross-DB drop toast — fixed (commit 44ce947)
- TableView checks `getStoreState().rows[sourceId].databaseId` before calling `reorderDatabaseRows`. On mismatch it dispatches a "Cannot move rows between databases" toast.

## 2026-05-13 — QA agent iteration B-4800

### B-4800 — I-4700 sanitize hard-drop verified (acceptance, fixed)
- Injected block `blk_sanit_4800_*` with content `Visible<script>alert(1)</script>OK<iframe srcdoc="evil"></iframe>END` via localStorage + StorageEvent rehydrate. Rendered DOM: `block-content-*` innerHTML === `VisibleOKEND` exactly. No `<script>`, no `<iframe>`, no leaked `alert(1)` text in textContent. sanitize.ts now hard-drops dangerous tags WITH their children, restoring the previously-leaked text-content path.

### B-4801 — I-4701 trashed inline DB placeholder verified (acceptance, fixed)
- Injected `db_4800_trashed_*` with `isInTrash:true, trashedAt:now`. Created inline-database block referencing it on a new page. Navigated to that page: DOM rendered `[data-testid="db-trashed-placeholder-<id>"]` with text "🗄️Database \"Trashed Inline DB\" is in the Trash. Restore", and `[data-testid="db-restore-<id>"]` button. Click on Restore unset `isInTrash`/`trashedAt` in state and the placeholder vanished from DOM.

### B-4802 — Restoring trashed inline DB crashes route with hooks-count error (P1, open)
- Repro: I-4701 acceptance flow (above). After Restore button click, the placeholder is correctly removed and `databases[<id>].isInTrash` flips to false. However the page then re-renders with React error boundary text "Rendered more hooks than during the previous render." and the entire page contents are replaced by "This page didn't load". Suggests `InlineDatabase` (or a child of TableView) hits a conditional hook path when transitioning from the trashed-placeholder render branch back to the full UI. Likely fix: move all `useStore(...)`, `useState(...)`, `useMemo(...)` calls above the `if (db.isInTrash) return <Placeholder />` early-return in `InlineDatabase.tsx`. P1 — restoring an inline DB from trash should not crash the host page.

### B-4803 — I-4702 cross-DB drop toast verified (acceptance, fixed)
- Created `db_4802_a_*` (rows [rowA1, rowA2]) + `db_4802_b_*` (rows [rowB1]). Built a page with both inline DB blocks; navigated to it. Attached `toast` event listener, then dispatched synthetic `dragstart`/`dragover`/`drop` with payload `application/x-row-id=row_4802_a1_*` on the row-B1 row. Result: toast detail === "Cannot move rows between databases". `db_4802_b_*.rows` unchanged (`[row_4802_b1_*]` only), no duplication into DB-A. Guard in TableView.tsx:69-72 firing as designed.

### B-4804 — Sanitize <style> tag and its CSS body fully stripped (acceptance, fixed)
- Injected text block with content `Before<style>body{display:none;color:hotpink}</style>After`. Rendered innerHTML === `BeforeAfter` exactly. `document.body` computed display === "block" (the malicious display:none did NOT take effect). Same fix as I-4700 — hard-drop covers `<style>` siblings of `<script>`/`<iframe>`. Defence-in-depth complete for the four "raw CDATA" elements.

### B-4805 — AI panel: Cmd+J opens, multi-line prompt accepted, stub reply renders (acceptance, fixed)
- Dispatched `keydown Cmd+J` → AI panel mounted with `ai-input` (textarea, placeholder "Ask anything... (Shift+Enter for newline)") + `ai-send`. Set value `"Hello AI\nThis is line two\nAnd a third line"` via native setter + input event. Clicked `ai-send`. After 2200ms: `ai-msg-4` carries the user prompt verbatim (newlines preserved), `ai-msg-5` carries a stubbed reply that lists workspace pages by relevance. Minor cosmetic: the reply echoes the prompt as a single line ("Hello AIThis is line two…") — newlines lost in the echo string.

### B-4806 — Slash menu `/page` creates sub-page block AND sub-page in store (acceptance, fixed)
- Focused an empty contenteditable block, set textContent to `/page`, dispatched `input` event. Slash menu opened with `[data-testid="slash-menu"]`, `[slash-page]`, `[slash-synced]`. Clicked `slash-page`. After: 1 new entry in `state.pages` (`pg_mp3s6kpy0qtyt9rx`, title "Untitled", `parentId=pg_mp2pz5zw6oflgc0j` — current page), no new entries in `state.blocks` because the originating text block was *converted in-place* (type became `sub-page`, pageId rewired to the new page, content still "/page"). Sidebar grew to include `sidebar-page-<newId>`. Note: leaving `content:"/page"` on the converted block is harmless but slightly leaky — consider clearing it on conversion.

### B-4807 — Trash > delete-forever removes page from state.pages (acceptance, fixed)
- Trashed `pg_mp3s6kpy0qtyt9rx` (isInTrash=true). Trash UI rendered `[delete-forever-<id>]` + `[restore-<id>]`. Clicked `delete-forever-…` (window.confirm overridden) → page removed from `state.pages` (count 122→121), DOM control gone, route stayed on /app/trash. Caveat: 1 orphan block (the converted sub-page block) still has `pageId` set to the deleted page id, lingering in `state.blocks`. Doesn't render anywhere but pollutes the store.

### B-4808 — Sub-page conversion leaves orphan block after parent page hard-delete (P2, open)
- Repro: /page slash conversion in B-4806 created sub-page `pg_mp3s6kpy0qtyt9rx`. The originating block (`blk_4800_style_*`) was rewired to `pageId=pg_mp3s6kpy0qtyt9rx`. Hard-deleting the sub-page from trash (B-4807) removes the page but the block stays in `state.blocks` with a now-dangling `pageId`. Recommended fix: on `deletePageForever`, also delete every block whose `pageId === id` (cascade) plus drop the parent-side `sub-page` block whose linked page no longer exists. Without this the store accumulates dead blocks across delete cycles.

### B-4809 — Page favorite toggle + Favorites sidebar section (acceptance, fixed)
- Opened `page-menu-pg_mp2pz5zw6oflgc0j`, clicked `pmenu-favorite-…`. State: `pages.<id>.isFavorite=true`. Sidebar now renders the page twice: once under the Favorites group at top (visible "Favorites" header in body innerText) and once under Private. Both entries share the `sidebar-page-<id>` testid (duplicated 2x for the same page). Cmd+K still finds it. Works; "favoritesExpanded" flag in ui state controls collapse.

### B-4810 — Sidebar duplicate-testid when page is favorited (P3, open)
- Repro: B-4809 toggle. Both the Favorites-section and Private-section entries for the same page use `data-testid="sidebar-page-<id>"`. Two DOM nodes with identical testids breaks `getByTestId` style queries (Playwright/RTL would throw). Either suffix Favorites copy with `-fav` (e.g. `sidebar-fav-page-<id>`) or render-once-by-id. Same applies to `expand-<id>`, `page-menu-<id>`, `page-new-<id>` — all duplicated. Test-only nit but easy.

### B-4811 — Search OKR/okrs case parity verified (acceptance, fixed)
- Created `pg_4805_okr_upper` ("Q4 OKR Plan") and `pg_4805_okrs_lower` ("team okrs notes"). Opened Cmd+K palette. Typed "OKR" → both matched; typed "okrs" → only the lowercase title matched (substring); typed "okr" → both matched. Case-folding works in both directions; substring boundaries respected.

### B-4812 — Cmd+P parity with Cmd+K for command palette (acceptance, fixed)
- Verified `keydown Cmd+K` and `keydown Cmd+P` both mount `[data-testid="command-palette"]`. Escape closes it. Parity matches the long-standing Notion convention where both shortcuts are aliases.

### B-4813 — Public form view: hiddenProperties + conditional logic combine cleanly (acceptance, fixed)
- DB `db_4807_form` with properties [pname,pemail,phide,pwantsdetails,pextra] and form view setting `hiddenProperties:[phide]` + conditional rule `pwantsdetails equals true → show pextra`. Navigated /form/db/view. Initial fields visible: [pname, pemail, pwantsdetails] — `phide` hidden permanently, `pextra` hidden by unmet conditional. Toggled `pwantsdetails` checkbox → `pextra` appears. `phide` stayed absent throughout. Combined filter logic in form.$dbId.$viewId.tsx:55-102 working as documented.

### B-4814 — AI panel reply collapses newlines in echoed prompt (P3, open)
- Repro: B-4805. The stub reply uses the prompt as a quoted phrase ("Based on your workspace, here's what I found about \"<prompt>\":…"). The echoed string strips the newlines so `Hello AI\nThis is line two\nAnd a third line` becomes `Hello AIThis is line twoAnd a third line` — no separators, words concatenate. Cosmetic only (the stored user message keeps newlines and the auto-grow textarea works). Either insert a space when collapsing or render the prompt on its own line.

### B-4802 — Hooks-order error on DB restore — fixed (commit 27798fe) — P1
- Fix: moved early returns in `InlineDatabase` to AFTER all `useState`/`useMemo` calls; hooks now run unconditionally on every render. The previous shape (early return on `isInTrash` between hooks) violated Rules of Hooks and tripped "Rendered more hooks than during the previous render" on restore.

### B-4808 — Hard-delete leaves orphan page-link blocks — fixed (commit 785030a)
- Fix: `permanentlyDeletePage` now scans `state.blocks` for any `page-link`/`sub-page` whose `pageId` is in the deleted set, deletes those blocks, and removes their ids from their parent pages' `blocks` arrays.

### B-4810 — Duplicate sidebar-page-<id> testid from favorites — fixed (commit 785030a)
- Fix: PageItem accepts an optional `testidPrefix` prop. The Favorites section passes `testidPrefix="sidebar-fav"` so each favorited page exposes both `sidebar-page-<id>` (its teamspace position) and `sidebar-fav-<id>` (favorites position). E2E queries are now deterministic.

## 2026-05-13 — Iteration 17 verification + new coverage

### B-4900 — B-4802 hooks-order on DB restore verified (acceptance, fixed)
- Seeded `db_4802_a_h1tb7` with `isInTrash:true` via LS, navigated `/app/db/db_4802_a_h1tb7`. Placeholder `db-trashed-placeholder-...` rendered. Clicked `db-restore-db_4802_a_h1tb7` → placeholder removed, normal DB UI rendered (table row testids present), zero `console.error`s, no "Rendered more hooks" / "didn't load" strings in DOM. Confirms commit 27798fe holds — early returns in `InlineDatabase` are after all hooks (file: src/components/database/InlineDatabase.tsx:62-86).

### B-4901 — B-4808 dangling page-link cleanup verified (acceptance, fixed)
- Seeded page A `pg_4900_A_test` with one `page-link` block `blk_4900_link` pointing at page B `pg_4900_B_test` (trashed). Navigated /app/trash, clicked `delete-forever-pg_4900_B_test`. Post-state: `state.pages['pg_4900_B_test']` removed, `state.blocks['blk_4900_link']` removed, `state.pages['pg_4900_A_test'].blocks === []`. Cascade in store.ts:714-733 strips the orphan id from its parent's `blocks` array.

### B-4902 — B-4810 distinct fav testid verified (acceptance, fixed)
- Pre-existing favorite `pg_mp2pz5zwikifg7r3` ("Welcome"). DOM at /app: exactly one `sidebar-fav-pg_mp2pz5zwikifg7r3` AND exactly one `sidebar-page-pg_mp2pz5zwikifg7r3`. Sidebar.tsx:76 passes `testidPrefix="sidebar-fav"` for the Favorites copy of PageItem (line 189); each is now query-unique.

### B-4903 — B-4814 AI multiline prompt now preserves newlines (acceptance, fixed-implicit)
- Sent `"line one\nline two\nline three"` via `[data-testid="ai-input"]` + click `ai-send`. Stored assistant message contains the verbatim `"…about \"line one\nline two\nline three\":…"` and the rendered bubble's `whitespace-pre-wrap` wrapper splits it across three lines (HTML inspection: `<div>line one</div><div>line two</div><div>line three":</div>`). The earlier B-4814 cosmetic concern was about collapsed display — the rendered DOM now separates lines correctly. Closing original I-4804 too.

### B-4904 — AI textarea hits max-h-40 + scrolls at 8 lines (acceptance, ok)
- Set 8-line prompt in `[data-testid="ai-input"]`. Measured: `clientHeight=158`, `scrollHeight=168`, `style.height=160px`, class includes `max-h-40 overflow-y-auto`. Scroll behavior activates as expected; clamp prevents the textarea from pushing the chat layout. No bug.

### B-4905 — Cross-tab StorageEvent DB row sync works (acceptance, ok)
- On `/app/db/db_4802_a_h1tb7` (2 rows). Wrote a new row `row_4900_xtab` to LS (modifying the `notion-clone:user:<id>` blob and pushing into `databases[<id>].rows`). Dispatched synthetic `StorageEvent` on window. Result: store rehydrated (store.ts:143-156), table view re-rendered with a 3rd `row-row_4900_xtab` node — text/name "CrossTab Row" present. Cross-tab path verified beyond the `currentUser` guard.

### B-4906 — Slash /sub-page creates child page + sub-page link block (acceptance, partial)
- On page `pg_mp2pz5zw6oflgc0j`, seeded paragraph block `blk_4900_subpage_target`, typed `/sub-page`. Slash menu item `slash-page` selected (the slash registry collapses `page` and `sub-page` into one entry). Result: new child page `pg_mp3sqbpzvew2d2jr` created with `parentId` set, target block converted from `paragraph → sub-page` with `pageId=pg_mp3sqbpzvew2d2jr`. Core behavior correct, but see B-4907.

### B-4907 — /sub-page slash conversion leaves stale `content: "/sub-page"` on the converted block (P3, open)
- Same flow as B-4906. After conversion the block now has `type:"sub-page"` AND `content:"/sub-page"` lingering (Block.tsx:439-447 does `updateBlock(block.id, { type, parentId, order, pageId })` — no `content:""` patch). Today `sub-page` renderers ignore `content`, so it's invisible; but the residue surfaces if the block is converted back, exported as markdown, or read by AI search (which indexes `block.content`). Mirrors the long-standing I-4801. Patch: extend the existing `clear-on-convert` guard in handleSlashSelect to also blank `content` for `custom === "page" | "sub-page"`.

### B-4908 — Search "OKRS" matches "OKRs" page case-insensitively (acceptance, fixed)
- Cmd+K + "OKRS" returns 3 results: `cmd-page-pg_mp2sao9lpgex28m4` ("OKRs"), `cmd-page-pg_4805_okrs_lower` ("team okrs notes"), `cmd-block-blk_mp2sao9lx5xe34u9`. CommandPalette.tsx:115-145 lowercases both query and title, so caps don't affect match. Confirms B-4811 stays fixed across the recent edits.

### B-4909 — Cmd+K block-snippet excerpt anchored on first token (acceptance, ok)
- Seeded block with "The quick brown fox jumps over the lazy dog and then continues with alphazebra one two three four five six seven eight nine ten" on Getting Started. Cmd+K + "alphazebra" yields `cmd-block-blk_4900_snippet_test` with label `"…then continues with alphazebra one two three four five six s…  ·  Getting Started"`. Snippet starts 20 chars before `idx` and extends 30 chars past the match (CommandPalette.tsx:166-171). Anchor is on `tokens[0]` so the first matched word is centered.

### B-4910 — Mobile 375px sidebar auto-closes after page nav (acceptance, ok)
- Resized viewport to 375x812 (mobile preset). Reloaded /app with `ui.sidebarOpen:true`. Clicked the page-link button inside `sidebar-page-pg_mp2pz5zw6oflgc0j` (PageItem nav button — Sidebar.tsx:252-258 has NO `closeOnMobile()` call). Despite missing the explicit call, the route-state effect in app.tsx:46-52 fires `setUI({sidebarOpen:false})` on pathname change → drawer closes after nav. Verified `data.ui.sidebarOpen === false` and `<aside>` is unmounted (gated by `sidebarOpen` in app.tsx:81). Bug is masked by the route-state effect; see I-4900 for the latent inconsistency.

### B-4911 — Empty DB renders board/calendar/gallery views with no crash (acceptance, ok)
- Created `db_4900_empty` with 0 rows + select/date/file properties and views `[table, board, calendar, gallery, list, timeline]`. Clicked each non-table tab. No `Rendered more hooks` / `Cannot read` / `Uncaught` strings in body, all three views mount their containers. Calendar shows the dot-grid with no event chips. See I-4901 — board/gallery lack a textual empty-state.

### B-4912 — Comment edit twice keeps editedAt fresh (acceptance, ok)
- Seeded `cmt_4900_edit_twice` on pg_mp2pz5zw6oflgc0j with `editedAt:undefined`. Opened comments panel, edited → "edit one" (editedAt=1778661128284), edited again → "edit two" (editedAt=1778661128741, delta 457ms). `updateComment` in store.ts:1606-1614 unconditionally writes a fresh `Date.now()` on every call; the inline editor in PageComments.tsx exits edit mode after Save (line 100), so a second click on `comment-edit-...` re-enters cleanly. Reflected `(edited)` label tooltip shows the latest timestamp.

### B-4913 — Public /p/<slug> hides comments entirely (acceptance, ok)
- Published pg_mp2pz5zw6oflgc0j as slug `getting-started-4900` (2 existing comments on the page). Navigated /p/getting-started-4900: `comments-btn`, `comment-input`, `comment-row-*` all absent. p.$slug.tsx does not import PageComments, so the public renderer has zero comment surface. Read-only requirement satisfied — anonymous readers can't see threads or post.

### B-4907 / I-4903 — /sub-page leaves stale content — fixed (commit a30f2bd)
- Fix: slash convert to sub-page (and /page) sets `content: ""` on the block so the user-typed query string ("/sub-page") doesn't persist.

### I-4901 — Board / Gallery empty states — done (commit a30f2bd)
- Fix: both views render a dashed-border placeholder with testids `board-empty-<dbId>` / `gallery-empty-<dbId>` when the sorted rows list is empty.

### I-4905 — Public page comments hint — done (commit a30f2bd)
- Fix: `/p/<slug>` route footer "Read-only · Comments are disabled on public pages." with `public-page-footer` testid + "Make your own ↗" link.

## 2026-05-13 — Iteration 18 verification + new coverage

### B-5000 — B-4907 sub-page content cleanup verified (acceptance, fixed)
- Seeded `blk_5000_subpg_verify` (paragraph, `content:"/sub-page"`) on pg_mp2pz5zw6oflgc0j. Navigated `/app/p/<id>`, focused the block's contenteditable, dispatched input → `[data-testid="slash-menu"]` opened with `slash-page` item. Clicked it. Post-state: `state.blocks.blk_5000_subpg_verify.type === "sub-page"`, `content === ""` (length 0), `pageId === pg_mp3t6gshu6fsenjd` (newly created child page). Confirms commit a30f2bd holds — Block.tsx slash-convert now clears `content` for page/sub-page targets.

### B-5001 — I-4901 board/gallery empty states render with testids (acceptance, fixed)
- Created `db_5000_empty_views` (0 rows, title-only properties) with [table, board, gallery] views. Navigated `/app/db/db_5000_empty_views`, clicked `db-view-view_5000_board`: `[data-testid="board-empty-db_5000_empty_views"]` rendered with text "No rows yet. Click + New in any column to add one.". Clicked `db-view-view_5000_gallery`: `[data-testid="gallery-empty-db_5000_empty_views"]` rendered with "No cards yet. Add a row from the table view or via \"+ New\".". Both testids present, both views stable.

### B-5002 — I-4905 public footer renders comments-disabled notice (acceptance, fixed)
- Set `pages[pg_mp2pz5zw6oflgc0j].publishSlug = "getting-started-5000"` + `isPublished:true` via LS, navigated /p/getting-started-5000. `[data-testid="public-page-footer"]` rendered: "Read-only · Comments are disabled on public pages. Make your own ↗". Contains "Comments are disabled". p.$slug.tsx route ships the disabled-comments hint cleanly for every public visit.

### B-5003 — Filter operator combo (contains + is-empty AND) filters correctly (acceptance, ok)
- Created `db_5001_filter_combo` with 4 rows: ["alpha foo"/notes, "alpha bar"/empty, "beta foo"/empty, "beta bar"/notes]. View filters = [contains "alpha", is-empty (notes)]. Navigation: only `r5001_2` ("alpha bar" + empty notes) renders. AND-combination evaluator in `filter.ts` correctly intersects the two rules — no false positives, no missing matches. Verified one-rule-each row correctly excluded.

### B-5004 — Page-link block renders icon + title on /p/<slug> public route (acceptance, ok)
- Getting Started carries `blk_b4400_pagelink → pg_mp2pz5zws2l1z775` ("Roadmap Q3" 🚀). On /p/getting-started-5000 with target unpublished: rendered as "📄 Untitled (unpublished)". After publishing target as `linked-target-5000`: rendered as "🚀 Roadmap Q3" without the (unpublished) tag. Icon and title both surface; unpublished targets gracefully degrade to "Untitled (unpublished)".

### B-5005 — Cmd+K on /auth route (signed-in redirects, but no crash) (acceptance, ok)
- Visited /auth while signed in: auth.tsx:22 effect redirected to /app. Cmd+K dispatched mid-redirect → `[data-testid="command-palette"]` mounted on /app, no error boundary, no console crash. The signed-out path could not be exercised (Supabase session in localStorage forces re-auth on any client-side mutation). Cmd+K listener is safely no-op on the auth-only render path.

### B-5006 — Wiki badge Verify button persists verifiedAt/verifiedBy (acceptance, ok)
- Cleared `pages[pg_mp2pz5zw6oflgc0j].verifiedAt/verifiedBy/verificationExpiresAt`. Visited /app/p/<id> → `[data-testid="verify-wiki"]` rendered with label "Verify". Clicked. Post-state: `verifiedAt = Date.now()` (1778661777405), `verifiedBy = 2adf3a83-...` (current user). However `verificationExpiresAt` stays `null` — no default expiry window. See I-5000.

### B-5007 — Sidebar sibling drag sets sortOrder on source (acceptance, ok)
- Found sibling pair (pg_mp2pz5zw6oflgc0j "Getting Started", pg_mp2qf91273xzixoe "Meeting notes") sharing teamspaceId. Synthetic dragstart on source + drop on target. Post-state: source's `sortOrder = 1778596107084` (clamped between target's createdAt and the next sibling's). Confirms Sidebar.tsx:223-233 `reorderSiblingPages` writes a fresh `sortOrder` and the cross-parent guard at line 231 holds.

### B-5008 — Comment edit cycle on page comment writes content + updatedAt (acceptance, ok)
- Seeded `cmt_5006_deep` (page-level, original "original deep comment"). Opened `comments-btn`, clicked `comment-edit-cmt_5006_deep`, set textarea value to "edited deep comment", Save. Post-state: `content === "edited deep comment"`, `updatedAt - createdAt === 83904ms` (fresh timestamp written). However, see B-5010 — block-scoped comments never surface on the page.

### B-5009 — BroadcastChannel "notion-clone" rehydrate triggers re-render (acceptance, ok)
- Wrote a new page `pg_5007_bcast` ("BroadcastChannel Test Page" 📡) directly to LS, then posted `{type:"rehydrate", userId:"2adf3a83-..."}` on `BroadcastChannel("notion-clone")`. Within 600ms: sidebar testid `sidebar-page-pg_5007_bcast` present AND title text in body. store.ts:158-178 listener correctly re-reads LS and notifies all useStore subscribers.

### B-5010 — Block-scoped comments never render anywhere in the UI (P2, open)
- Repro: seed a `Comment` with non-null `blockId` (any). PageComments.tsx:23 filters them out (`!c.blockId`) so they don't show in the side panel. `grep -rn "c.blockId\|blockId ===" src/components` shows NO other consumer — no inline block-comment marker, no block-anchored thread. Result: any block-scoped comment is invisible in app and orphans data. Either render an inline indicator on the parent block (e.g. a yellow dot + popover) OR drop the `blockId` field if unused.

### B-5011 — AI Cmd+J rapid open/close shows stuck open state (P2, open)
- Repro: dispatch Cmd+J keydown 10 times rapidly (open, close, open, close...). Observed: each "open" cycle leaves `[data-testid="ai-input"]` mounted, but the immediately-following close keydown is a no-op (panel stays open). After 5 close attempts the panel is still mounted; only on the 10th open/close pair does the panel finally close. Suggests Cmd+J handler is bound multiple times (once on open, once on initial mount) or that close ignores the meta+J trigger. Final state after sequence: closed cleanly — so eventually consistent but visibly laggy.

### B-5012 — Trash > delete-forever-db cascade works once views are well-formed (acceptance, ok)
- Trashed `db_5001_filter_combo` (4 rows), navigated /app/trash, clicked `delete-forever-db-db_5001_filter_combo`. Initial attempt FAILED silently. React onClick handler raised `Cannot read properties of undefined (reading 'filter')` from store.ts:1119 — because legacy views in OTHER databases lack `propertyOrder`/`hiddenProperties` arrays. After backfilling those defensively on every view, the click succeeded: `state.databases[dbId]` gone AND `state.rows.r5001_1..r5001_4` all removed. Cascade itself is correct; the crash is in B-5013.

### B-5013 — deleteDatabase crashes on legacy views missing propertyOrder/hiddenProperties (P1, open)
- File: src/lib/store.ts:1117-1121. `db.views.map(v => ({ ...v, propertyOrder: v.propertyOrder.filter(...), hiddenProperties: v.hiddenProperties.filter(...) }))` assumes every view has both arrays. Audit of current LS shows 11 views (across 6 databases) where one or both fields are `undefined` — most notably ALL views of `db_4900_empty` and the trashed legacy DBs `db_4800_trashed_h5r47`, `db_4802_a_h1tb7`. Calling deleteDatabase on ANY db when any OTHER db has an incomplete view throws TypeError, silently swallowed by the React onClick wrapper. Fix: `v.propertyOrder ?? []` + `v.hiddenProperties ?? []` (or a migration that backfills on load). P1 because the user can trash a DB then never permanently delete it.

### B-5014 — Sidebar Trash testid `sidebar-trash` navigates to /app/trash (acceptance, ok)
- Clicked `[data-testid="sidebar-trash"]` from /app. URL now `/app/trash`, `<main>` shows "Trash · Trash is empty." Confirms the sidebar footer Trash icon is wired correctly. (Older runs hit B-219-style no-op buttons; this one is solid.)

### B-5012 / B-5013 — deleteDatabase crash on legacy views — fixed (commit bd0d3fa) — P1
- Fix: `deleteDatabase`'s per-other-DB cleanup now coalesces `db.properties`, `db.views`, and per-view `propertyOrder` / `hiddenProperties` with `?? []`. Legacy / imported DBs whose views were persisted before those fields were required no longer trip a swallowed TypeError. Verified live: deleting a trashed DB whose view lacks both fields succeeds end-to-end (DB removed from state, no ErrorBoundary).

## 2026-05-13 — B-5100 series

### B-5100 — deleteDatabase legacy view repro (acceptance, ok / fixed)
- Re-verified B-5012/B-5013 fix. Seeded `db_b5100_legacy_trashed` (trashed) AND `db_b5100_legacy_active` (live), both with a single view missing both `propertyOrder` AND `hiddenProperties`. Clicked `delete-forever-db-db_b5100_legacy_trashed`. Result: `state.databases` no longer contains the trashed id, `db_b5100_legacy_active` preserved unchanged, zero console.error, no "didn't load" / ErrorBoundary fallback. The defensive `?? []` fix from bd0d3fa holds.

### B-5101 — Moving a page across teamspaces leaves children with stale teamspaceId (P1, open)
- Repro: navigate to a page with subpages (e.g. `pg_mp3loogelnvyiuhq` "Cascade Parent", three children in Private teamspace). Open `page-options` > click `page-opt-move-ts_mp2pz5zwvod19q0j` (Engineering). After move: parent's `teamspaceId = ts_mp2pz5zwvod19q0j`, `parentId = null` — good. But each child still has `teamspaceId = ts_mp2pz5zwqdkgmzis` (Private). Their `parentId` still points to the moved parent.
- Impact: stale children silently diverge from parent. Sidebar renders children via `parentId` so the tree LOOKS correct, but: (a) `reorderSiblingPages` guard at Sidebar.tsx:231 compares both fields and now blocks legitimate sibling reorders; (b) new subpages created via `page-new-*` use `page.teamspaceId` of the parent (now Engineering), so existing children and any new sibling diverge; (c) if the parent is later deleted/orphaned, surviving children resurface in the WRONG teamspace.
- Fix: `TopBar.tsx:215` `updatePage(...)` should cascade `teamspaceId` to all descendants (mirror the `deletePage` recursion pattern).

### B-5102 — Block-scoped comments invisible even on a deeply-nested target (P2, open, dup B-5010)
- Re-confirmed on a freshly-seeded `toggle > callout > text` tower (`pg_b5100_nested`). Seeded `cmt_b5100_nested` with `blockId = blk_b5100_text` and opened `comments-btn`. Comments panel renders nothing; the page body contains no inline marker either. PageComments.tsx:23 explicitly drops `c.blockId != null`. No other consumer references `Comment.blockId` (`grep -rn "c.blockId" src/components` returns zero hits). Either render an inline indicator on the parent block or drop the field — currently it's data corruption waiting to happen.

### B-5103 — Page History feature has no `page-opt-history` entry in the page menu (P3, open)
- The prompt expected `page-opt-history` but it doesn't exist. Page History is only reachable via `[data-testid="history-btn"]` in the TopBar (the date-stamp button next to Share). The "•••" page menu (`page-options-menu`) has Favorite, Duplicate, Wiki, Word count, Copy link, Export MD, Print, Move-to-*, Trash — no history entry. Discoverability gap: users hovering for "Version history" expect it under "•••". The dialog itself works (`snapshot-now` writes a new entry to `page.history[]`, `restore-<id>` restores).

### B-5104 — AI Cmd+J rapid keystrokes are deterministic (acceptance, ok)
- Counter to the lingering B-5011 note: 10 rapid `window.dispatchEvent` of `KeyboardEvent('keydown', {key:'j', metaKey:true})` from CLOSED state lands on CLOSED after ≥200ms settle; 11 rapid lands on OPEN. Each `setOpen((v)=>!v)` correctly composes. The earlier B-5011 report appears to be a measurement artifact (DOM inspected too quickly before React flushed).

### B-5105 — Cross-tab StorageEvent for foreign uid is correctly ignored (acceptance, ok)
- Dispatched a `new StorageEvent('storage', { key: 'notion-clone:user:<other-uid>', newValue: '{...empty pages...}' })` and posted `BroadcastChannel('notion-clone').postMessage({type:'rehydrate', userId:'other-uid-different'})`. Sidebar page count unchanged (125 → 125). store.ts:147 + store.ts:163 both gate on `e.key === userKey(uid)` / `data.userId === uid`. Security boundary intact.

### B-5106 — Sub-page creation via sidebar `+` button works AND appears in tree (acceptance, ok)
- Clicked `page-new-pg_mp2pz5zwikifg7r3` (the "+ subpage" affordance on Welcome). Post-state: new `pg_mp3tuiqplq2drdbg`, parentId = Welcome, sidebar testid `sidebar-page-pg_mp3tuiqplq2drdbg` mounted, URL navigated to the new page. Note: this path does NOT insert a `sub-page` block on the parent (only the slash command path does — Block.tsx:439-451). Both flows are intentional; documenting the divergence.

### B-5107 — Cmd+K block-match spans newline-separated tokens (acceptance, ok)
- Seeded `blk_b5100_cmdk_test` with content `"B5100ALPHA\nfoo bar\nB5100BETA"`. Opened palette, typed `B5100ALPHA B5100BETA`. Result: a single block match surfaces ("¶ B5100ALPHA foo bar B5100BETA · Welcome"). CommandPalette.tsx:46 splits the query on `\s+` and `allMatch(stripHtml(b.content).toLowerCase())` looks each token up independently. Newlines are normalized by `stripHtml` so cross-newline matching works.

### B-5108 — Filter `is-not-empty` on multi-select returns rows with non-empty arrays (acceptance, ok)
- DB `db_mp3jj2jnavmaxi0e` (4 rows total, multi-select `Tags` set only on `row_mp3jk8zuxoypboda`) already has `flt_2: {operator:'is-not-empty', propertyId:'prop_mp3jj2jnh8n0aijp'}` on the All view. Navigated `/app/db/...` — only one `row-row_*` testid rendered, matching the row that has Tags. filter.ts:57-58 handles `Array.isArray && length===0` correctly. Edge cases (null, '', `['']`) all evaluate per spec.

### B-5109 — Typing in AI input does not trigger Cmd+K accidentally (acceptance, ok)
- Opened AI panel via `ai-btn`, focused `ai-input`, dispatched plain `'k'` keydown then set value to `"k"`. Palette did NOT open. Separately, Cmd+K WHILE focused on AI input DOES open the palette — this is expected (CommandPalette listens on window). No regression.

### B-5110 — /app/templates lists 8 templates with stable testids and clicking creates a page (acceptance, ok)
- Navigated to `/app/templates`. Renders 8 cards: `template-meeting-notes`, `-project-brief`, `-daily-journal`, `-reading-list`, `-okrs`, `-runbook`, `-decision-log-adr`, `-1-1-agenda`. Clicked Meeting Notes — `pages` map grew by 1, navigated to new `pg_*` with title "Meeting notes" and 9 seeded blocks. Clean E2E.

### B-5101 — Move-to-teamspace didn't cascade — fixed (commit 4e322d1) — P1
- Fix: new store action `movePageToTeamspace(id, ts)` does a BFS over descendants via parentId and applies the new teamspaceId to every page in the sub-tree. Root's parentId cleared; children keep their parentId so the tree shape is preserved. TopBar now calls this action instead of bare updatePage.

### B-5103 / I-5101 — Page history discoverability — fixed (commit 4e322d1)
- Fix: page-options menu now has `page-opt-history` entry. Clicking it dispatches an `open-page-history` window event which TopBar listens for and uses to set `historyOpen = true`, opening the existing PageHistoryDialog.

## 2026-05-13 — B-5200 series

### B-5200 — B-5101 cascade verify (acceptance, fixed)
- Seeded `pg_b5200_parent` + child `pg_b5200_child` + grandchild `pg_b5200_grand` all in Engineering (tsA). Navigated to parent, clicked `page-opt-move-ts_mp2s8a5x6ku00yjn` (Test Teamspace / tsB). Post-state: all three pages have `teamspaceId === ts_mp2s8a5x6ku00yjn`; child.parentId still `pg_b5200_parent`, grand.parentId still `pg_b5200_child`; parent.parentId === null. movePageToTeamspace BFS confirmed to hit every descendant without disturbing tree shape.

### B-5201 — Move-to-teamspace on a child page promotes it to root + descendants follow (acceptance, ok)
- Seeded chain `pg_b5201_root → mid → leaf` all in tsA. Navigated to `mid` (the child), clicked `page-opt-move-<tsB>`. Post-state: mid.parentId === null (promoted to root), mid.teamspaceId === tsB; leaf.parentId still `pg_b5201_mid`, leaf.teamspaceId === tsB. root unchanged (parentId null, ts still tsA). The promote-to-root + cascade combo behaves correctly for non-root sources too.

### B-5202 — Trash + restore-page cascade preserves the entire sub-tree (acceptance, ok)
- Seeded `pg_b5202_root → a → b` in tsA. Page-options → page-opt-trash on root: all 3 pages `isInTrash:true`, parentId chain preserved. Navigated `/app/trash`, clicked `restore-pg_b5202_root`: all 3 pages `isInTrash:false`, root.parentId null, a.parentId === root, b.parentId === a. Verified with a 4-level chain in B-5207 below too.

### B-5203 — Cmd+K palette tolerates regex metacharacters (acceptance, ok)
- Opened palette, set input to "a.b", then "[c]", then "((", then "^*$" in sequence. Zero console errors thrown, palette stays mounted throughout. CommandPalette uses `.toLowerCase().includes(...)` against pre-split tokens (no `new RegExp(...)`), so the chars are treated literally. No DoS surface here.

### B-5204 — Public form renders + persists 14 submittable property types (acceptance, ok / partial)
- Built `db_b5204_allprops` with title, text, number, select, multi-select, status, date, person, files, checkbox, url, email, phone, relation. Form view at `/form/db_b5204_allprops/view_b5204_form` rendered all 14 `public-form-field-*` testids and a single new row persisted with every value present. However person/files/relation fall through to plain text inputs (no member picker / file upload / row picker) — see I-5200.

### B-5205 — Sidebar "Other" section surfaces injected orphan, drops it once teamspaceId set (acceptance, ok)
- Wrote `pg_b5205_orphan` with `teamspaceId:null` + `parentId:null` directly to LS + posted rehydrate. `[data-testid="sidebar-other-section"]` now contains `sidebar-page-pg_b5205_orphan` (visible label "👻 B5205 Orphan"). Then patched `teamspaceId = ts_mp2pz5zwvod19q0j` and rehydrated: the page leaves "Other" and surfaces under Engineering. OrphanSection.tsx filter `(!p.teamspaceId && !p.parentId && !p.isInTrash)` is correct on both sides.

### B-5206 — DB row drag with active filter reorders the underlying rows array (acceptance, ok)
- Created `db_b5206_filter_drag` with 5 rows (A/B/C/D/E, alternating active/archived) and a `state is active` filter. Visible: [A, C, E]. Synthetic drag from `row-r_b5206_c` to `row-r_b5206_a`. Post-state: `db.rows === [c, a, b, d, e]` — c inserted before a in the underlying array, and the hidden archived rows b, d remain at their original neighboring positions. The view filter was re-applied after the drop, so visible became [C, A, E]. Confirms reorderDatabaseRows operates on `db.rows` (not the filtered slice), which is the correct semantic.

### B-5207 — Trash + restore handles 4-level deep hierarchy (acceptance, ok)
- Seeded `pg_b5207_root → l1 → l2 → l3` in tsA. Trashed root via page-opt-trash. All 4 `isInTrash:true`. Restored via `restore-pg_b5207_root` in /app/trash. All 4 `isInTrash:false`; parentId chain intact (root null, l1→root, l2→l1, l3→l2). restorePageCascade BFS holds for deep trees.

### B-5208 — Cmd+K and Cmd+P (and Ctrl+P) all open the same command palette (acceptance, ok)
- File: src/components/command/CommandPalette.tsx:19 `if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "p"))`. Verified each shortcut individually: cmdK=true, cmdP=true, ctrlP=true. The Cmd+P standard "browser print" is preventDefault'd by the palette open, but since we stub `window.print` in the QA session and the palette handler intercepts before browser default, no print dialog ever surfaces. Parity intact.

### B-5209 — AI textarea ingests a 10KB block in under 10ms without freezing (acceptance, ok)
- Opened AI panel via `ai-btn`. Native value setter on `[data-testid="ai-input"]` (TEXTAREA) with `'X'.repeat(10240)`, dispatched `input` event. Total set + dispatch: 9.9ms. Textarea reads back length 10240, panel still mounted, no UI stutter. No virtual list / debounce needed at this size — paste flow scales fine for typical prompts.

### B-5210 — Public form falls back to plain text input for person, files, relation (P2, open)
- File: src/routes/form.$dbId.$viewId.tsx:244-333. The PublicFormField switch handles title, text, number, date, checkbox, select/status, multi-select, url/email/phone — anything else (person, files, relation) hits the trailing generic `<input value=... />`. Result: form respondents type a raw string like "agent14" or "row_xyz" or "http://x.com/file.pdf" and the data lands verbatim in `row.values[propId]`. No file upload, no member picker, no row chooser. Visually identical to text inputs so users have no signal. P2 — the form submits, the data persists, but the UX is broken for those three types.

### B-5211 — Page submit handler invoked correctly via Enter key on form (acceptance, ok)
- During B-5204 verification, the `<form>` element handles `onSubmit={e => { e.preventDefault(); submit(); }}`. Pressing Enter inside any field correctly fires submit. No accidental anchor click / page-reload behavior.

### B-5210 — Public form fell back to text inputs for person/files/relation — fixed (commit a34a316)
- Fix: form `fields` memo filters out `person`, `files`, and `relation` types in addition to the system-managed ones. Visitors no longer see broken plain-text widgets for those columns; form-builders should use select/text columns for any public-collectible reference.

## 2026-05-13 — Test agent batch (B-5300 series)

### B-5300 — B-5210 fix re-verified, person/files/relation hidden in /form (acceptance, ok)
- Steps: injected `prop_b5300_person` (person), `prop_b5300_files` (files), `prop_b5300_relation` (relation, target db_mp2qmu4d1va6knov) into db_mp3lhvrxwl40mnbf. Cleared `hiddenProperties` on form view view_b4600_form_select to force eligibility. Navigated to `/form/db_mp3lhvrxwl40mnbf/view_b4600_form_select`.
- Observed: rendered fields are `public-form-field-prop_mp3lhvrx69s5zskr` (status), `…92ucm92s` (multi-select), `…8mfpeiij` (date), `…qa_num` (number), `…qa_text_mp3lozu0` (text). Person/files/relation testids do NOT render. No fallback text inputs leak through.
- Confirms the form-fields filter in form.$dbId.$viewId.tsx is correctly stripping the three reference types regardless of hiddenProperties state.

### B-5301 — Move-to-teamspace cascades teamspaceId across 4-level hierarchy (acceptance, ok)
- Steps: built L1→L2→L3→L4 chain in teamspace Engineering with parent links. Navigated to L1, clicked `page-opt-move-ts_mp2s8a5x6ku00yjn` (Test Teamspace).
- Observed: all 4 pages now have `teamspaceId === ts_mp2s8a5x6ku00yjn`. L1's parentId is correctly nulled (it became the root in target). L2/L3/L4 still chain via parentId pointers. No descendant gets stranded in the source teamspace.
- The move-to-teamspace cascade works as intended across deep hierarchies.

### B-5302 — Multi-select cell editor preserves array shape across add+remove cycles (acceptance, ok)
- Steps: seeded multi-select prop with 5 options (MSA…MSE), seeded row with all 5, removed 2 (MSB, MSD) via direct state write — UI rendered remaining 3 as pills. Then clicked the select cell, toggled MSD ON (added to array), toggled MSA OFF (removed from array). Final stored value: `["opt_b5300ms_C","opt_b5300ms_E","opt_b5300ms_D"]` with `isArray === true`.
- Click-to-toggle behaviour is symmetric — adding and removing produce the same array, no duplicate ids, no null entries. Editor's `data-testid="select-option-<id>"` surface is stable and easy to drive from tests.

### B-5303 — Database property drag-reorder is not implemented (P2, open)
- File: src/components/database/views/TableView.tsx — `PropertyHeader` <th>/<button> has neither `draggable` nor `onDragStart/onDrop`; nowhere in TableView do property cells receive a `application/x-property-id` dataTransfer type. The store has no `reorderProperty` action (only `propertyOrder` array assignments at create-time).
- Steps: hover any prop header in a DB → no grab cursor; the only way to reorder is to delete + re-add. Notion-parity expects drag-to-reorder.
- Expected: add a small grip handle on `:focus-within`/`:hover` of `prop-header-<id>`, write `propertyOrder` on drop into the active view.

### B-5304 — Row detail drawer has no comments surface (P2, open)
- File: src/components/database/RowDetailDrawer.tsx — drawer renders `row-detail-title` plus property cells; no Comments section, no comment composer, no `comment-list` testid. `state.comments` schema exists and is keyed by blockId/pageId/rowId but the drawer never reads rows.
- Steps: dispatched `open-row-detail` for a row, inspected drawer — only delete/close/title/cells testids present, zero "comment" mentions.
- Expected: append a thin Comments panel below the cells (read `state.comments` filtered by `rowId === row.id`, render compose box). Without it, rows-as-pages cannot capture discussion.

### B-5305 — Calendar standalone drops are silently refused for non-calendar events (P3, open)
- File: src/routes/app.calendar.tsx:182. The drop handler bails on `if (id.startsWith("row-")) return;` — drag is allowed onto a day cell but the reschedule never happens AND no toast/warning fires. Source code already comments out the reasoning ("DB-row-derived events don't have a calendarEvents entry") but it never surfaces it to the user.
- Steps: confirmed in source. Drag onto day cell with non-calendar id → silent no-op.
- Expected: `window.dispatchEvent(new CustomEvent("toast", { detail: "Open the database to reschedule this row" }))` so users know the drag wasn't accepted (mirroring B-cross-DB-refusal pattern at TableView.tsx:70).

### B-5306 — Wiki verification still does not capture expiry, no re-verify/revoke control (P3, open)
- File: src/components/page/PageView.tsx:284-289. Re-confirms B-428/B-530/I-5000 are still open as of 2026-05-13. Clicking `verify-wiki` sets `verifiedAt` + `verifiedBy` only; `verificationExpiresAt` stays null. Once verified, the button disappears — no way to mark unverified or re-verify after edits.
- Steps: navigated to a wiki page, observed source for verify branch. Badge reads "Verified" with no who/when/expiry shown.
- Expected: persist a 90-day default `verificationExpiresAt`, render the verifier + date in the badge, expose "Unverify" / "Re-verify" actions. Tracked separately as long-standing UX gap.

### B-5307 — Sidebar drag does not support cross-parent / orphan drop targets (P3, open)
- File: src/components/layout/Sidebar.tsx:223-233. `onDrop` short-circuits when `sourcePage.parentId !== page.parentId || sourcePage.teamspaceId !== page.teamspaceId` — only same-parent reorder is wired. There is no empty-area drop zone, no "Other" header drop target, no "drag onto teamspace name" support.
- Steps: source inspection confirms; no `application/x-sidebar-page-id` drop handler on the sidebar root, AddTeamspaceForm, or OrphanSection.
- Expected: add drop zones on (a) teamspace headers to move into that teamspace, and (b) a dedicated `[data-testid="sidebar-orphan-zone"]` that clears `teamspaceId` and `parentId`. Today users must reach for the page-options menu.

### B-5308 — Block highlight via #block-<id> survives full page reload (acceptance, ok)
- Steps: navigated to `/app/p/pg_mp2pz5zw6oflgc0j#block-blk_5006_t1`. Verified `[data-block-highlight="1"]` appears with `data-block-id="blk_5006_t1"`. Triggered `location.reload()`; after reload, the highlight reappears with the same hash + element id.
- The `hashchange` listener + initial-mount reader pair in PageView.tsx:39-66 work correctly across hard reloads. Bookmark + back/forward navigation are also safe.

### B-5309 — Cmd+K command palette navigates to deeply-nested sub-page on match click (acceptance, ok)
- Steps: dispatched `open-command-palette`, filled the input with "B5300 L4" (a level-4 descendant of the cascade test pages). Single result `cmd-page-pg_b5300_l4_mp3urq84` rendered. Clicked it; URL became `/app/p/pg_b5300_l4_mp3urq84`.
- The palette correctly resolves descendants regardless of nesting depth — no filter limits results to root pages or first-level children.

### B-5310 — AI chat `ai-new-thread` testid clears messages and rebuilds thread (acceptance, ok)
- Steps: opened AI panel via `ai-btn`, observed 8 messages (`ai-msg-0`…`ai-msg-7`) in panel. Clicked `[data-testid="ai-new-thread"]`. Re-queried after the click — 0 messages remain.
- The clear-thread button is correctly wired to `setMessages([])` and the testid is exposed at `src/components/ai/AIChat.tsx:275`. Persistence-across-reload is a separate concern (B-431).


### B-5303 — DB property drag-reorder — fixed (commit c8f791b) — closes I-5301
- Fix: new `reorderDatabaseProperties(databaseId, sourceId, targetId)` store action + draggable `<th>` headers on the table view (`data-property-id` attribute, `application/x-property-id` payload). Title column is not draggable to preserve sticky-left positioning.

### B-5305 — Calendar non-cal-drop silently refused — fixed (commit c8f791b)
- Fix: /app/calendar's day-cell drop handler now dispatches a "Reschedule database rows from the DB calendar view" toast when a `row-*` event id is dropped, instead of silently no-op'ing.

## 2026-05-13 — Test agent batch (B-5400 re-verify + new coverage)

### B-5400 — B-5303 DB property drag-reorder fix re-verified (acceptance, ok)
- Steps: at /app/db/db_mp3lhvrxwl40mnbf (QA Form DB) DOM shows non-title `th[data-property-id]` headers with `draggable=true` (title `prop_mp3lhvrx9qtr7nk5` is `draggable=false`). Synthesized dragstart on Status, dragover+drop on Tags via `DataTransfer` payload `application/x-property-id`.
- Observed: `state.databases[db_mp3lhvrxwl40mnbf].properties` ids rearranged from [Name, Status, Tags, Date, Score, TestNote] → [Name, Tags, Status, Date, Score, TestNote]. DOM ths re-rendered in matching order. No console errors.
- The fix in TableView.tsx:159-181 + `reorderDatabaseProperties` works end-to-end. Closes I-5301/I-5300.

### B-5401 — B-5305 calendar toast re-verified (acceptance, ok)
- Steps: at /app/calendar (May 2026) dragged `cal-event-row-row_mp3nmhann55g` (DB row, date 2026-05-13) onto `day-2026-05-20`. Listened for `window` "toast" event.
- Observed: toast event fired with `detail === "Reschedule database rows from the DB calendar view"`. Row's date value (`prop_mp3lhvrx8mfpeiij`) stayed at "2026-05-13" — beforeDate==afterDate, unchanged. moveCalendarEvent never executed.
- The early-return-with-toast branch at app.calendar.tsx:184-187 fires correctly.

### B-5402 — Title column drop-refusal works (acceptance, ok)
- Steps: title `th[data-property-id="prop_mp3lhvrx9qtr7nk5"]` reports `draggable === false`, so dragstart on title yields no `application/x-property-id` payload. Synthesized a drop on the Status header anyway.
- Observed: `properties` array unchanged before/after. Confirms TableView.tsx:162 `draggable={property.type !== "title"}` and the `if (property.type === "title") return;` guard in `onDragStart` both fire, leaving the title pinned in the sticky-left slot.

### B-5403 — AI panel via `ib-ai` event + send round-trip works (acceptance, ok)
- Steps: dispatched `open-ai-chat-with` with `{selected:"integration testing notes", pageTitle:"QA Page"}`. Panel opened (`ai-input` rendered). Pre-filled value was `On page "QA Page", help me with: "integration testing notes"`. Typed "Tell me about meeting notes", clicked `ai-send`.
- Observed: `ai-msg-0` is user with the typed text; `ai-msg-1` is assistant starting with `Based on your workspace, here's what I found about "Tell me about meeting notes"`. pseudoAnswer search ran and the reply rendered through MarkdownText. Credits decremented (consumeAICredits(5)).

### B-5404 — AI multi-line markdown renders bold/italic/list (acceptance, ok)
- Steps: seeded `notion-clone:ai-chat:<uid>` with `[{role:"assistant",content:"**bold**\n*ital*\n- item"}]`, reloaded, then opened the AI panel.
- Observed: `ai-msg-0` HTML contains `<strong>bold</strong>`, `<em>ital</em>`, `<ul class="list-disc"><li>item</li></ul>`. Newlines split into separate `<div>`s within the `whitespace-pre-wrap space-y-1` wrapper. InlineMarks + InlineText (AIChat.tsx:14-74) parse line-by-line correctly.

### B-5405 — Cmd+K query "the" returns lowercase-title/body matches (acceptance, ok)
- Steps: `open-command-palette` event, typed "the" into `command-input`.
- Observed: 4 page results — Getting Started, Roadmap Q3, Project brief, "plan the next quarter". Matches come from both title (lowercase substring per `allMatch`) and body block contents (stripHtml lowercase). Word-token loop in CommandPalette.tsx:42-63 honors the case-insensitive contract.

### B-5406 — Move-to-teamspace from "Other" section works (acceptance, ok)
- Steps: navigated to `/app/p/pg_b4600_orphan` (a root, teamspaceId=null page from the "Other" bucket). Opened `page-options`, clicked `page-opt-move-ts_mp2s8a5x6ku00yjn` (Test Teamspace).
- Observed: `state.pages.pg_b4600_orphan.teamspaceId` updated from `null` → `ts_mp2s8a5x6ku00yjn`. Cascade fn `movePageToTeamspace` triggered. After cleanup the page was reset back to null.

### B-5407 — AI chat clears via `ai-new-thread` (acceptance, ok)
- Steps: opened AI panel with stored thread (single assistant msg). Clicked `[data-testid="ai-new-thread"]`.
- Observed: `ai-msg-*` count goes from 1 → 0 immediately; the persist effect (AIChat.tsx:177-184) writes the empty array to `notion-clone:ai-chat:<uid>` on the next render. The "New" button label is exposed only at 10px uppercase — tiny but discoverable.

### B-5408 — delete-forever-page leaves orphan comments behind (P3, open)
- Steps: created `pg_b5400_orphancmt_test` in trash with a comment `cmt_b5400_orphan` referencing its `pageId`. Visited /app/trash, clicked `delete-forever-pg_b5400_orphancmt_test`.
- Observed: page record gone; comment record still in `state.comments` with `pageId: "pg_b5400_orphancmt_test"` pointing at the now-missing page. `permanentlyDeletePage` (store.ts:690-776) cascades blocks + dangling page-links but never touches comments.
- Expected: delete (or at least flag) comments whose `pageId` is in the cascade set during permanent delete; otherwise these leak indefinitely and `Object.values(comments)` keeps growing.

### B-5409 — DB date `is-empty` filter hides date-bearing rows correctly (acceptance, ok)
- Steps: injected `{operator:"is-empty",propertyId:"prop_mp3lhvrx8mfpeiij"}` into view_mp3lhvrxts5dk1bx filters via state + StorageEvent. QA Form DB has 7 rows total (2 with date 2026-05-13, 5 empty).
- Observed: tbody renders 6 trs — 5 matching rows + 1 add-row stub. Date-bearing rows `row_mp3nmhann55g` and `row_mp3oubgd3xy6` are correctly hidden. Filter logic in filter.ts:55-58 honors the date-prop empty contract.

### B-5410 — Cmd+/ opens slash menu inside a callout's contenteditable (acceptance, ok)
- Steps: on `/app/p/pg_mp2r871w150jzjkn` (Project brief), focused the contenteditable inside callout `blk_mp2r871xz978yenr`. Dispatched a `keydown` for `/` with `metaKey:true`.
- Observed: `[data-testid="slash-menu"]` mounts. The slash menu is wired at the contenteditable level so callout children get the same affordance as ordinary paragraph blocks. Cmd+/ chord (in addition to plain `/`) works because the handler doesn't gate on absence of modifiers.

### B-5408 — Orphan comments after permanent page delete — fixed (commit d83c6da)
- Fix: `permanentlyDeletePage` rebuilds `state.comments` and drops any comment pointing at a deleted page OR a deleted block. Verified end-to-end with 2 comments on a synthetic trashed page.

## 2026-05-13 — Test agent batch (B-5500 series)

### B-5500 — B-5408 comment cascade re-verified (acceptance, ok)
- Steps: injected `pg_b5500_cascadetest` (`isInTrash:true`) with comments `cmt_b5500_a` and `cmt_b5500_b` (both `pageId` scoped, `blockId:null`), plus a non-trashed `pg_b5500_live` with one paragraph block `blk_b5500_live` and a block-scoped comment `cmt_b5500_block` (`blockId:"blk_b5500_live"`).
- Step 1: clicked `delete-forever-pg_b5500_cascadetest` at /app/trash. After: `state.pages.pg_b5500_cascadetest` gone, both `cmt_b5500_a`/`cmt_b5500_b` removed from `state.comments`, `cmt_b5500_block` untouched.
- Step 2: trashed `pg_b5500_live` (set `isInTrash:true`+reload), clicked `delete-forever-pg_b5500_live`. After: page gone, `blk_b5500_live` gone, `cmt_b5500_block` removed. B-5408 fix (d83c6da) cascades both page-scoped and block-scoped comments correctly.

### B-5501 — Cmd+K does NOT filter by emoji icon glyph (acceptance, ok)
- Steps: at /app, dispatched `open-command-palette`, set `command-input` value to "🚀". Pages have icons 🚀 (Roadmap Q3, Project brief).
- Observed: palette renders `cmd-empty` ("No results"). Sanity check: query "roadmap" returns Roadmap Q3 page + block-match. CommandPalette.tsx:56-59 only matches against `p.title.toLowerCase()` and block `stripHtml(content).toLowerCase()` — no `p.icon` in the haystack.
- Expected: documented limitation. Could be desirable behavior (emojis are decoration, not searchable text). Tracking as I-5501 in case product wants to support it.

### B-5502 — AI panel scroll container exceeds viewport at 12 messages (acceptance, ok)
- Steps: seeded `notion-clone:ai-chat:<uid>` with 12 alternating user/assistant messages (~75 chars each), reloaded, clicked `sidebar-ai`.
- Observed: `[data-testid^="ai-msg-"]` count=12. The scroll container (`flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]`, AIChat.tsx:289) reports `scrollHeight=1068`, `clientHeight=521`, `canScroll=true`, `overflowY: auto`. The browser's overlay scrollbar appears on hover/scroll; functional scroll works end-to-end. No layout overflow or chrome breakage.

### B-5503 — Cmd+J on /auth route does NOT open AI panel (acceptance, ok)
- Steps: cleared `sb-isuqldoryaqznbhkfmsa-auth-token`, navigated to /auth (rendered email/password form). Dispatched `keydown {key:"j", metaKey:true}` at the window.
- Observed: no `[data-testid="ai-input"]` present before or after. `sidebar-ai` absent (AppShell only mounts under `/app`). The AIChat component is rendered inside AppShell only, so its `keydown` listener can't fire outside `/app`. Correct gating.

### B-5504 — Property header drag-reorder via `prop-header` flow re-verified (acceptance, ok)
- Steps: at /app/db/db_mp3lhvrxwl40mnbf, the inner `[data-testid="prop-header-<id>"]` `<button>` is `draggable:false`; the wrapping `<th data-property-id="<id>" draggable={type !== "title"}>` is the drag source (TableView.tsx:160-181). Synthesized `dragstart`+`dragover`+`drop` on the wrapping `<th>` for Score (prop_qa_num) → Tags (prop_mp3lhvrx92ucm92s).
- Observed: properties reordered from [Name, Tags, Status, Date, Score, TestNote] → [Name, Score, Tags, Status, Date, TestNote]. Restored via reverse drag. The `prop-header-` button itself isn't the drag handle but its parent th is — a small affordance gap worth flagging.

### B-5505 — Trash empty-state appears after last item permanently deleted (acceptance, ok)
- Steps: planted `pg_b5503_lastone` (`isInTrash:true`, only trashed item in workspace). At /app/trash, `[data-testid="trash-empty"]` was absent. Clicked `delete-forever-pg_b5503_lastone`.
- Observed: `trash-empty` element materialised immediately (no reload required), text "Trash is empty." rendered. TrashPage.tsx:22 computes `empty` from both `trashedPages` and `trashedDbs` and the empty placeholder is gated on the union — correct.

### B-5506 — Public form multi-select with 3 options serialises correctly when paced (P3, open)
- Steps: visited /form/db_mp3lhvrxwl40mnbf/view_b4600_form_select. Tags has 3 options after seeding `opt_b5505_third`. Clicked each option button back-to-back synchronously (no awaits) → only the LAST clicked option ended up in `row.values[tagsProp]`.
- Re-ran with ~120ms gaps between clicks (one React render cycle per click): all 3 option IDs `[Important, Idea, Urgent]` end up in `row.values["prop_mp3lhvrx92ucm92s"]`.
- Cause: form.$dbId.$viewId.tsx:314 — multi-select `onClick={() => onChange(active ? selected.filter(...) : [...selected, o.id])}` reads `selected` from the closure at render time. Three rapid synchronous clicks all see `selected=[]` and overwrite with a single-id array each time. Functional update form would fix it.

### B-5507 — Slash /2 /3 /4 columns commands all create correct columnIds count (acceptance, ok)
- Steps: at Welcome page, created three fresh paragraph blocks `blk_b5507_coltest`, `blk_b5507_col2`, `blk_b5507_col4`. Filled each with `/2 columns`, `/3 columns`, `/4 columns` respectively, fired input event, clicked the corresponding `slash-columns-{2,3,4}` testid in the menu.
- Observed: each block converts to `type:"columns"` with `columns:N` and exactly N entries in `columnIds`. The lazy materialiser at Block.tsx:1506-1538 fills `columnIds` with N fresh column children on first render.

### B-5508 — Synced-block ref scrolling 100 refs is smooth (~60 fps) (acceptance, ok)
- Steps: created page `pg_b5508_syncperf` with one `synced-block` source (single paragraph child) + 100 `synced-block-ref` blocks. Navigated to the page; measured `requestAnimationFrame` cadence while programmatically scrolling top→bottom over 1.5s in 30 steps.
- Observed: 89 frames in 1.25s, avg 16.49ms, 0 frames > 33ms. DOM node count after full hydration: 6054. No layout thrash or React perf warnings. The ref-render path in Block.tsx:1333-1370 reads the source's children once per ref via `useStore` but doesn't appear to cause render storms.

### B-5509 — Child→trash then parent→trash cascade keeps both rows in trash (acceptance, ok)
- Steps: created `pg_b5509_parent` and `pg_b5509_child` (`parentId:pg_b5509_parent`). Trashed child via page-options → "Delete" — `child.isInTrash:true`, parent untouched. Then trashed parent the same way. Both rows show in /app/trash, each with their own `delete-forever-<id>` button.
- Observed: `deletePage` (store.ts:620-647) cascades to non-trashed children only (`if (p.parentId === pid && !p.isInTrash)`). Since the child was already trashed, it's skipped in the second cascade but retains its earlier `trashedAt`. Restoring parent would not auto-restore child (separate `restorePageCascade` path); flagging as I-5503.

### B-5510 — Comment resolve toggle persists across reload (acceptance, ok)
- Steps: seeded `cmt_b5510_resolve` on /app/p/pg_mp2pz5zwikifg7r3 (Welcome). Opened comments panel via `comments-btn`, clicked `resolve-cmt_b5510_resolve` (false → true). Hard-reloaded the tab.
- Observed: post-reload `state.comments.cmt_b5510_resolve.resolved === true`. With the default panel filter (showResolved off), the comment is hidden — clicking `show-resolved-toggle` reveals it, button label reads "Resolved" (not "Resolve"). `resolveComment` (store.ts:1671-1678) writes through to the persisted store correctly.

### B-5506 — Public form multi-select drops options on rapid clicks — fixed (commit 6714131)
- Fix: multi-select onClick now passes a functional updater. Host `setValues` detects the function and applies it against the LATEST per-prop value. Rapid synchronous clicks no longer collapse to the last click. PublicFormField onChange signature widened to accept `v | (prev) => v`.

## 2026-05-13 — Test agent batch (B-5600 series)

### B-5600 — B-5506 multi-select 3-rapid-click re-verification (acceptance, ok)
- Steps: at /form/db_mp3lhvrxwl40mnbf/view_b4600_form_select, added a 3rd option `opt_b5600_third` (Urgent) so Tags has Important/Idea/Urgent. Dispatched `.click()` on all 3 chip buttons synchronously in a single JS tick (no awaits in between).
- Observed (post-fix 6714131): all 3 chips render with `bg-primary text-primary-foreground` (active) immediately after settling. Submitted the form; resulting `rows.row_mp3wbebh9ttg.values["prop_mp3lhvrx92ucm92s"]` is exactly `["opt_mp3lhvrxisvvvsc3","opt_mp3lhvrx1xipx0rc","opt_b5600_third"]`. Functional updater fix holds.

### B-5601 — TopBar breadcrumb ignores teamspaceId on move-to-teamspace (P2, open)
- Steps: at /app/p/pg_mp2pz5zwikifg7r3 (Welcome, root, teamspaceId:null), clicked `page-options` → `page-opt-move-ts_mp2pz5zwvod19q0j` (Engineering). State writes through: `pages.<id>.teamspaceId = "ts_mp2pz5zwvod19q0j"`.
- Observed: `[data-testid="breadcrumbs"]` still renders only `🎨 Welcome` — no Engineering prefix. TopBar.tsx:27-34 walks the breadcrumb via `p.parentId` only, never looking at `teamspaceId`. Moving between teamspaces changes the sidebar grouping but is invisible in the TopBar — confusing context loss when you navigate via Cmd+K.
- Expected: show `Engineering › Welcome` (or icon equivalent) when a page is at a teamspace root.

### B-5602 — Cmd+K query with backtick / emoji / em-dash returns 0 results but no crash (P3, open)
- Steps: at /app, opened command palette via `open-command-palette`. Typed each of: `` ` ``, `🚀`, `—`, `(`.
- Observed: each query shows `cmd-empty` ("No results"). No console errors. Bodies on the workspace contain emojis (Welcome has 🎨, Roadmap has 🚀) but `CommandPalette.tsx` still lowercases the query and matches only against `title.toLowerCase()`/stripHtml(content). Regex special chars also don't blow up because the match is `.includes()`, not regex. Search is robust to special chars; emoji search is functionally a no-op.

### B-5603 — Cmd+K first paint <100ms with 1138 pages (P3, acceptance, ok)
- Steps: planted 1000 synthetic pages on Private teamspace (total 1138). Reloaded. Closed any open palette, then opened via `open-command-palette`.
- Observed: first rAF after dispatch fires at 8.4ms; second frame at 18.1ms; type-to-first-paint for query "perf" was 30.4ms returning the 5 visible page rows from the windowed list. Well under 100ms budget. No visible jank, no console errors.

### B-5604 — Markdown export does NOT recurse into sub-pages (P2, open)
- Steps: planted A→B→C (3-deep), each parent with a `sub-page` block referencing the child + a paragraph of content. Triggered `export-page-markdown` with `noDownload:true` on page A.
- Observed: export output is only `# Page A\n\n<!-- paragraph -->\n\n📄 [Page B](/app/p/pg_b5602_B)\n`. The sub-page link is emitted as a markdown link to B's URL — B's content and the deeper C are NOT inlined. Plus, the `paragraph` block type renders as `<!-- paragraph -->` (export-markdown.ts:57 switch handles `text` but not `paragraph`; my injection used the wrong canonical type, so this is partly a test-data issue — flagging the missing recursion as the real bug).
- Expected: configurable recursion (Notion exports nested subpages as separate files in a zip, or inlined under headings).

### B-5605 — Public page /p/<slug> renders correct "Comments are disabled" copy (acceptance, ok)
- Steps: visited /p/getting-started-5000 (published Getting Started). Read banner text.
- Observed: body contains exact string "Comments are disabled on public pages." (p.$slug.tsx:77, also "Read-only · " prefix). Banner is visible above the page content, no comment composer or comment-btn rendered on the public view.

### B-5606 — Drag synced-block-ref onto another page is inert (acceptance, ok)
- Steps: at /app/p/pg_mp2pz5zws2l1z775 (Roadmap), located `[data-block-id="blk_b4400_synced_ref"]`. Synthesised `dragstart`+`dragover`+`drop` on `[data-testid="sidebar-page-pg_mp2pz5zwikifg7r3"]` (Welcome sidebar entry).
- Observed: `parentId` of the ref unchanged (`pg_mp2pz5zws2l1z775`), no new synced-block-ref created on Welcome. DataTransfer.types is empty after the dragstart (no payload registered for block→sidebar drop). As predicted: page-link is the move mechanism, raw ref drag is unhandled.

### B-5607 — Trash route filtering correct + restorePageCascade brings child back (acceptance, ok)
- Steps: with empty trash, planted parent `pg_b5603_parent` (`isInTrash:true`) and trashed child `pg_b5603_child` (`parentId:pg_b5603_parent`, `isInTrash:true`), plus a non-trashed control. Navigated /app/trash. Observed only the 2 trashed rows (restore-/delete-forever- pairs). Clicked `restore-pg_b5603_parent`.
- Observed: BOTH parent and child flipped to `isInTrash:false`, `trashedAt:null`. The control was untouched. restorePageCascade (store.ts:649-674) BFS-walks the trash subgraph correctly, so a previously-cascade-trashed child is auto-restored together with its parent.

### B-5608 — Cmd+K open from focused contenteditable destroys selection & focus (P2, open)
- Steps: at /app/p/pg_mp2pz5zwikifg7r3, focused the first contenteditable and selected the first 5 chars ("Welco"). Dispatched `open-command-palette`. Palette opened. Pressed Escape.
- Observed: after close, `document.activeElement === document.body`; `window.getSelection().toString() === ""`. The editor selection AND focus are both lost. Notion preserves the editor's selection when you Esc out of Cmd+K. Worth mitigating with a `restoreSelection()` ref on palette close.

### B-5609 — NewViewButton creates all 8 listed view types without crash (acceptance, ok)
- Steps: at /app/p/pg_mp2pz5zw6oflgc0j (Getting Started, which has inline DB `db_mp3lhvrxwl40mnbf`). Clicked `db-newview-<dbId>` then each of `db-newview-<dbId>-{table,board,calendar,gallery,list,timeline,chart,form}` in turn.
- Observed: db.views grew 5→13 (+8). No console errors. Each view appeared in the tab strip. Note: `map` view type exists in the discriminated union (InlineDatabase.tsx:249-251 + types.ts) but is NOT in the dropdown list (line 269) — a small parity gap worth flagging as I-5601.

### B-5604 — Markdown export didn't inline sub-pages — fixed (commit 33e485a)
- Fix: sub-page blocks now render the target page's content under a nested heading (## / ### / #### based on depth). Capped at 3 levels to avoid cycles. Verified live with A→B→C hierarchy: all three bodies inlined.

### B-5608 — Cmd+K closed destroys editor selection — fixed (commit 33e485a)
- Fix: CommandPalette captures the focused contenteditable + Range on open and restores both on close (Cmd+K toggle, Escape, scrim click). Cancelling out of the palette no longer loses cursor / highlight.

## 2026-05-13 — Test agent batch (B-5700 series)

### B-5700 — B-5604 sub-page export inlining re-verified (acceptance, ok)
- Steps: planted A→B→C 3-deep, each with text block + sub-page block. Navigated to /app/p/pg_b5700_A. Dispatched `export-page-markdown` with `{noDownload:true}`.
- Observed: `window.__lastExportedMarkdown` = `"# Page A\n\nBody of A\n\n## 📗 Page B\n\nBody of B\n### 📕 Page C\n\nBody of C\n"`. All three page bodies inlined under H1/H2/H3. Fix (commit 33e485a) holds. The export-markdown.ts `depth < 3` gate at line 164 produces the right header level via `Math.min(6, depth + 2)`.

### B-5701 — B-5608 Cmd+K selection restore re-verified (acceptance, ok)
- Steps: focused the first contenteditable on Page A (`blk_b5700_pA`), set a Range covering chars 0..5 ("Body "). Opened palette via `open-command-palette`. Dispatched Escape on `command-input`.
- Observed: after close, `window.getSelection().toString() === "Body "` AND `document.activeElement === editor`. CommandPalette.tsx:23-60 captures and restores the editor + Range correctly. Fix (commit 33e485a) holds.

### B-5702 — Sub-page export depth cap inlines 4 levels, links the 5th (acceptance, ok)
- Steps: extended A→B→C with D (4th) and E (5th). Triggered `export-page-markdown {noDownload:true}` on A.
- Observed: A/B/C/D bodies all inlined under #..####, E rendered as a bare link `📓 [Page E](/app/p/pg_b5700_E)`. The `depth < 3` guard in export-markdown.ts:164 allows depth 0/1/2 (the root + 3 nested sub-page inlines). The header level caps at H6 via `Math.min(6, depth + 2)` so very deep trees stay valid Markdown.

### B-5703 — Cmd+K toggle parity (acceptance, ok)
- Steps: with no palette open, dispatched `keydown {key:"k", metaKey:true}` on window. Palette opened (`command-input` present). Dispatched the same again.
- Observed: palette closed cleanly (`command-input` absent). CommandPalette.tsx:64-72 toggles `open` on each Cmd+K; selection capture/restore wires through the toggle path correctly.

### B-5704 — Sub-page export cycle re-inlines bodies before depth cap kicks in (P2, open)
- Steps: planted cyclic graph `pg_b5701_A`↔`pg_b5701_B` (A has sub-page→B, B has sub-page→A). Exported A with `{noDownload:true}`.
- Observed: output traverses A→B→A→B before falling back to a link on the 5th step: `# Cycle A\n\nCycle body A\n\n## 🔃 Cycle B\n\nCycle body B\n### 🔁 Cycle A\n\nCycle body A\n#### 🔃 Cycle B\n\nCycle body B\n🔁 [Cycle A](/app/p/pg_b5701_A)\n`. Both A's and B's bodies appear twice. The recursion guard in export-markdown.ts:164 uses only `depth < 3`, not a visited-page set — so cycles inflate the export with duplicate content.
- Expected: track visited `pageId`s; on re-visit emit a link immediately instead of re-inlining.

### B-5705 — TopBar breadcrumb still ignores teamspace move (P2, open, dup of B-5601)
- Steps: at /app/p/pg_mp2pz5zw6oflgc0j (Getting Started, root, teamspaceId:ts_mp2pz5zwqdkgmzis "Private"), clicked `page-options` → `page-opt-move-ts_mp2pz5zwvod19q0j` (Engineering). State writes through (`teamspaceId: "ts_mp2pz5zwvod19q0j"`).
- Observed: breadcrumb stays `🧭 Getting Started`. TopBar.tsx walk only follows `parentId`, never `teamspaceId`. Same root cause as B-5601 — keeping the ticket open. Restored Private teamspace post-test.

### B-5706 — NewViewButton dropdown still lacks "map" view type (acceptance, ok / I-5601 still open)
- Steps: re-read InlineDatabase.tsx:269. The literal `["table","board","calendar","gallery","list","timeline","chart","form"]` is unchanged. `View["type"]` union includes `"map"`; `viewIcon` (line 176) and `renderView` (line 198) both handle it.
- Observed: confirmed dead branch. Already tracked as I-5601 — no new bug.

### B-5707 — AI textarea Enter submits multi-line input, Shift+Enter doesn't (acceptance, ok)
- Steps: clicked `sidebar-ai` to open AI panel. Set `ai-input` value to "line1", dispatched Shift+Enter (no submit). Set value to "line1\nline2", dispatched plain Enter.
- Observed: Shift+Enter didn't submit (msg count unchanged), Enter posted the multi-line "line1\nline2" message. `[data-testid^="ai-msg-"]` count went from 12 → 13; last user message body contains the newline character. AIChat.tsx:327-334 keydown branch is correct: `if (e.key === "Enter" && !e.shiftKey)`. Note: in a headless dispatch Shift+Enter alone doesn't insert a newline character — browsers fire `beforeinput`/`input` for that. Real users get the newline via keypress; the test simulates the newline via direct value-set, which is the closest faithful playback.

### B-5708 — Cmd+K block-match click scrolls + highlights target block (acceptance, ok)
- Steps: at /app/p/pg_mp2pz5zw6oflgc0j, opened palette and typed "quick brown" (matches `blk_4900_snippet_test`). Clicked `cmd-block-blk_4900_snippet_test`.
- Observed: location.hash → `#block-blk_4900_snippet_test`; target block has `ring-1 ring-blue-400` classes (highlight ring); block sits inside viewport (rect.top=324). CommandPalette.tsx:236-242 calls `scrollIntoView({behavior:"smooth", block:"center"})` and toggles the ring for ~1.5s. Works as documented.

### B-5709 — Comment chain edit cycle: parent + reply both editable, updatedAt advances (acceptance, ok)
- Steps: seeded `cmt_b5704_parent` and `cmt_b5704_reply` (parentId chain) on Getting Started. Opened comments panel, clicked `comment-edit-cmt_b5704_parent`, set `comment-edit-input-...` to "Parent v2 EDITED", clicked save. Repeated for the reply with "Reply v2 EDITED".
- Observed: store reflects `content:"Parent v2 EDITED"` and `content:"Reply v2 EDITED"`, both with refreshed `updatedAt` timestamps (~600ms apart). No cross-contamination — editing the reply doesn't perturb the parent. Threaded edit flow is solid.

### B-5710 — PageView crashes if a Comment record lacks `content` field (P2, open)
- Steps: while preparing B-5709 I accidentally seeded `cmt_b5704_parent` with `body` instead of `content`. Clicking `comment-edit-...` swapped the error boundary to "This page didn't load — Cannot read properties of undefined (reading 'trim')". PageComments.tsx:236 calls `initial.trim()` on the `CommentEditor` prop seeded from `c.content`.
- Cause: no defensive default for `content` in the editor. A malformed import or schema migration leaves `c.content === undefined`, taking down the entire `/app/p/<id>` route. Trivial fix: `initial={c.content ?? ""}` at PageComments.tsx:99 and :128. The `?? ""` keeps the disabled-save guard working without crashing.
