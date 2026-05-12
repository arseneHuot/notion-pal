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

### B-213 — Two property menus can be open simultaneously in a database table (P2, open)
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

### B-210 — Table "add property" uses native window.prompt() and contains dead code (P2, open)
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

### B-207 — Calendar Week/Day view selections render the same grid as Month (P1, open)
- Steps: load `/app/calendar`, change the view `<select>` from `month` to `week`, then `day`.
- Observed: the underlying grid stays identical (full month). The select state changes but the layout/rows don't update.
- Expected: week view should show 1 row × 7 days; day view should show single column with hours.

### B-206 — Calendar "+" day-add button has no visible effect (P1, open)
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

### B-303 — Columns block renders only static "Column N" placeholders — cannot contain other blocks (P1, open)
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

### B-307 — Synced block is a static "Content will be mirrored…" placeholder regardless of any source (P1, open)
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

### B-402 — Child pages remain accessible by direct URL after the parent is trashed (P1, open)
- Steps: trash a parent page; visit `/app/p/<child-page-id>` directly.
- Observed: the child page loads normally and is editable. There is no banner indicating its parent is in Trash and no redirect.
- Expected: either redirect to /app, or show a warning banner, or auto-trash the child (see B-400). The current state is misleading and any link to the child still works.

### B-403 — Database relation property is read-only — no UI to add or remove linked rows (P1, open)
- File: src/components/database/PropertyEditor.tsx `RelationCell` (lines 418-436).
- Steps: add a `relation` property to a database via the table column "+", or seed one via the store. Click the cell on a row.
- Observed: cell only renders linked rows (or "Empty") as static badges. No clickable affordance, no picker, no input — the user cannot establish a link from the UI. The relation column is therefore unusable through the product surface, even though the underlying data model supports it.
- Expected: clicking the cell should open a popover listing target-database rows (with search) and let the user toggle links. Linked badges should be removable with an ×.

### B-404 — Dual relations (isDual: true) are not mirrored on the paired side (P1, open)
- File: src/lib/store.ts — no helper updates the paired property; src/lib/types.ts:357-359 declare `isDual` and `pairedPropertyId` but the runtime never reads them.
- Steps: even if you seed a relation manually with `isDual: true` and write linked IDs into row A → row B, the reciprocal link from row B → row A is not created.
- Expected: when writing a dual relation value, also write the mirror value on the target row's paired property (and clean up on removal). Without this, dual relations behave as one-way only.

### B-405 — Unique-id values shift when a row is deleted (P0, open)
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

### B-409 — Database button cell uses native `alert()` for show-confirmation actions (P1, open)
- File: src/components/database/PropertyEditor.tsx `ButtonCell` (line 458).
- Steps: add a button property with a `show-confirmation` action and message; click it.
- Observed: `alert(action.message)` fires, freezing the renderer (same class of bug as B-208/B-214/B-215/B-316).
- Expected: in-app toast or modal.

### B-410 — Row "Delete row?" uses native confirm() and freezes the renderer (P1, open)
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

### B-413 — Page-history restore uses native confirm() (P1, open)
- File: src/components/page/PageHistoryDialog.tsx line 37 — `if (confirm("Restore this version?")) { ... }`.
- Steps: open Page history → Restore a version.
- Observed: native confirm blocks the renderer (same family).
- Expected: in-app modal.

### B-414 — Public `/p/<slug>` page silently drops most block types (P1, open)
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

### B-421 — Comments: author name and avatar always show the CURRENT user, not the comment author (P1, open)
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

