# Improvements

Ideas for enhancement that are not strictly bugs. Each entry includes priority, the user value, and current status.

Priority: high / medium / low.

---

## 2026-05-12 — Initial backlog

### I-001 — Real text-formatting toolbar on selection (high, done)
- A floating menu (Bold/Italic/Strike/Code/Link/Color) above the selection in a contenteditable block, like Notion.
- Implemented: `src/components/editor/InlineToolbar.tsx` mounted globally in `app.tsx`.

### I-002 — Block colour and background (high, open)
- Notion supports setting colour/background per block. Schema already has a `color` field; need UI to set it.

### I-003 — Drag-and-drop reorder with proper visual indicator (medium, open)
- Currently we set a ring on the hovered block but the actual placement uses array index swap. Should support drop-above and drop-below visual feedback.

### I-004 — Nested toggle/bullet/numbered children (high, done)
- Toggles currently show "(Toggle children — coming soon)". We need real child-blocks via a tree structure.

### I-005 — Database column resize (medium, open)
- Drag the right edge of a column header to resize.

### I-006 — Form view public submission URL works without auth (medium, done)
- `/form/:dbId/:viewId` route should be readable publicly (no auth required) and store submissions to localStorage of the owner. Tricky without a real backend.

### I-007 — Synced block content mirroring (medium, done)
- The schema has synced-block and synced-block-ref but the runtime mirror is not implemented yet.

### I-008 — Keyboard shortcut reference panel (low, open)
- Cmd/Ctrl+? should open a modal listing all keyboard shortcuts.

### I-009 — Page banner cover image curated library (low, done)
- Quick-pick gradients/unsplash thumbnails when adding a cover.

### I-010 — Search highlighting in command palette results (low, open)
- Bold the matched substring inside the result list.

### I-011 — Inline mentions @page @date @person via @ trigger (high, open)
- The schema and command palette suggest mentions but the editor doesn't yet have an @-trigger menu.

### I-012 — Better mobile layout (medium, open)
- Sidebar should collapse fully on small screens, with a hamburger toggle.

### I-013 — Notion AI: bundle simple summarise + rewrite + extend actions on selection (high, open)
- A floating "Ask AI" affordance after selecting text.

## 2026-05-12 — Iteration 1 backlog

### I-014 — Page title placeholder is empty (medium, fixed)
- The `<h1 contenteditable data-placeholder="Untitled">` doesn't show its placeholder; styling missing.
- Fix: add CSS rule for `[contenteditable][data-placeholder]:empty::before`.

### I-015 — Calendar key helper should be timezone-safe everywhere (medium, fixed)
- Both CalendarView and the app.calendar route share a `keyForDate` that returns UTC date strings.
- Fix: replace with `formatLocalDate` returning `${y}-${m}-${d}` in local time.

### I-016 — Dark-mode "today" highlight is faint with `text-blue-600` on dark background (low, open)
- Use `text-blue-400` in dark mode for better contrast.

## 2026-05-12 14:38 — Test agent batch 2

### I-201 — Templates gallery only ships 6 templates (rotation area #20 expects 8) (low, open)
- Existing: Meeting notes, Project brief, Daily journal, Reading list, OKRs, 1:1 agenda.
- Add: Sprint planning, Retrospective, Roadmap, Habit tracker, Standup notes — pick any 2.

### I-208 — Calendar prev/next month buttons have no accessible names (low, done)
- File: src/routes/app.calendar.tsx lines 111-127. Each chevron button has just an icon.
- Add `aria-label="Previous month"` / `aria-label="Next month"`.

### I-207 — Database view menu lacks Filter and Sort (high, done)
- Steps: open an inline DB → click the view menu (3-dots near a tab).
- Current items: Rename view, Delete view, Properties list, Add property.
- Expected: Filter, Sort, Group by — these are the core view-level controls in Notion.
- Without filter/sort, the view system is mostly cosmetic.

### I-206 — Auth page has two buttons labelled "Sign in" (mode tab and submit) (low, open)
- The tab switcher button reads "Sign in" and is `type=button`; the submit button at the bottom also reads "Sign in".
- Confusing for keyboard users and assistive tech. Rename the tab to "Existing account" or wrap the tabs in a `role="tablist"` with accessible names distinct from the submit button text.

### I-205 — Page menu (top-bar kebab) is missing Duplicate, Move to trash, Version history items (medium, open)
- Current menu items: Customize page, Turn into wiki, Word count, Copy link.
- Spec area #11 lists "Page duplicate, move to trash, restore from trash, permanently delete" and area #12 lists "Page history — snapshot now, restore version".
- Both Duplicate and Move-to-trash already exist as sidebar More-menu actions. Surface them on the top-bar Page-menu too.
- Add a History submenu (snapshot, restore version) — if no implementation exists, hide the entry until then.

### I-204 — Comments: resolved button reads "Resolved" instead of an actionable label (low, open)
- Steps: post a comment → Resolve → toggle "Show resolved".
- Observed: button label flips to "Resolved" which reads like a status, not an action.
- Expected: "Re-open" or "Unresolve" so users discover they can flip it back.

### I-203 — AI chat panel buttons have no aria-label or title (medium, open)
- The floating Ask AI panel has at least 2 unlabeled buttons (close in header, send in footer).
- Add `aria-label="Close AI panel"` and `aria-label="Send message"`. The send button should also be reachable by pressing Enter in the input.

### I-202 — Applied template renders the page title twice (medium, open)
- Steps: Templates → click "Project brief".
- The page heading group shows the emoji icon, then "Project brief" as the page name, then a "Project brief" block as the first body block.
- Expected: drop the duplicated heading or seed it as a placeholder so the user can rename without leaving a stray block.

### I-200 — Inline formatting toolbar buttons have title but no aria-label (low, done)
- Inline toolbar buttons (Bold, Italic, Strike, Code, Link, Color, Ask AI) only carry a `title` attribute.
- Title attributes are skipped by many screen readers (especially on mobile/iOS Safari).
- Add `aria-label="Bold"` etc. so the toolbar is announced. Easy win since the strings already exist.

## 2026-05-12 15:30 — Test agent batch 3

### I-300 — Database row title cells should open a row-page on click (high, done)
- Right now the row title is just an `<input>` for editing. Notion lets you click the title cell to open the row as a full page where you can add long-form notes / blocks under the row.
- File: src/components/database/views/TableView.tsx around the `cell-title-…` input.
- Add an "open" affordance (a small expand icon on hover, or double-click) that navigates to `/app/row/:rowId` and renders a PageView-like editor for that row.

### I-301 — Search inside command palette should also index AI-block prompts and AI-block results (medium, open)
- File: src/components/command/CommandPalette.tsx lines 33-47.
- The matcher iterates blocks and checks `"content" in b`; AI blocks store text under `prompt` and `result`, so those bodies are never indexed.
- Same applies to table-cell text inside `database rows`. Today only block.content and page.title are searchable.
- Expected: union the searchable text from `prompt`, `result`, `caption`, row cell values, and database names.

### I-302 — Highlight which database view is active inside an inline-DB tab bar (medium, open)
- The tab bar shows ▦ All / ▤ By status etc., but the active state is only a subtle background tint and doesn't survive contrast checks. On dark theme the inactive tabs look identical to active. (Observed manually on Roadmap Q3.)
- Use a stronger underline / pill-style active state.

### I-303 — Workspace JSON export should also be importable (high, open)
- After fixing B-310, expose a counterpart `Import workspace from JSON` in Settings → Data. Today there is no way to restore an export — the button is one-way only.

### I-304 — Dark-mode toggle in Settings is the only place to flip themes (medium, open)
- The topbar `Toggle dark mode` button (sun icon) was discoverable, but the keyboard shortcut and the settings checkbox are the only programmatic paths. Consider also exposing it in the command palette ("toggle dark mode" appears as an action — verify it actually flips correctly). Useful for keyboard-first users.

### I-305 — Add visible scroll affordance for tabs on small screens (medium, open)
- Partner to B-312: even on desktop with many views (8+), tabs may overflow. Render a chevron-right button at the edge when overflow exists; clicking it scrolls the tab bar.

### I-306 — Persist sidebar open/closed across reloads (low, open)
- When you collapse the sidebar (panel-left-close button) and reload, the sidebar reopens. State should survive in localStorage like the dark mode preference.

### I-307 — Equation block needs a side-by-side source + preview (medium, open)
- Pairs with B-302. Even before adding a KaTeX renderer, the current "preview" pane is just a duplicate of the source. Drop the duplicate area until a real renderer is wired up, and tighten the textarea height so an empty equation isn't 40px tall.

### I-308 — Add a Filter / Sort affordance on the inline view-bar (high, open)
- Duplicates I-207 but with a stronger framing: today's view-menu (3-dots) has neither. Even a basic implementation (sort by single column ASC/DESC, filter by single status column) would make the database UI usable for real planning. Without it, "By status" view is the only way to group anything.

### I-309 — Hover state for sidebar More/+ buttons relies on group-hover and disappears on touch (medium, open)
- Touch devices have no hover, so the More menu is unreachable on mobile/iPad. Either show the buttons always at the cost of density, or expose them via long-press / context menu.

## 2026-05-12 18:08 — Test agent batch 4

### I-400 — Relation picker: support drag-from-row-handle to a relation cell (high, open)
- Pair with B-403. Once a relation cell has a proper popover, also support dragging another row onto the cell as a quicker way to link.

### I-401 — Rollup property editor needs to surface the function picker in the UI (high, done)
- PropertyEditor.tsx renders the rollup result but there's no inline UI to choose function/target property from the column header. Right now a rollup can only be configured by editing localStorage.
- Add a sub-menu under the column header for rollup: function dropdown (count, sum, …), target-property dropdown.

### I-402 — Unique-id property needs a configurable starting number and a "show prefix only when present" option (medium, open)
- Once B-405 lands and the id becomes stable, expose a "start at" field and a checkbox for whether to omit the prefix dash when prefix is empty.

### I-403 — Verification (wiki) needs expiry presets and a re-verify reminder (medium, open)
- Pair with B-428. Notion offers 7/30/90/180 day presets and shows "Verified by Alice 12d ago, expires in 18d". Implement the same UI.

### I-404 — Comments: persist author profile on the comment record so it survives user deletion (medium, open)
- Pair with B-421. Today `authorId` is the only link. If a user is removed from a workspace, comments lose their author entirely. Cache `{ name, avatar }` on the comment so historical attribution is preserved.

### I-405 — Comments: emoji reactions on comments (low, open)
- A small set of reactions (👍 ❤️ 😄 🎉 👀) is a common Notion pattern. Simpler than full threading.

### I-406 — Public page header should expose page word count and last-edited-at, hide while loading (low, open)
- /p/<slug> currently shows just the title + content. Add a small subheader with last-edited date and a "Page contents (X words)" line for SEO and readability.

### I-407 — Mail: action toolbar with Reply / Forward / Star / Archive / Trash (high, open)
- Pair with B-418. The schema is ready; just wire UI.

### I-408 — Mail: nav bar with "Inbox / Starred / Archived / Trash / Sent" filters (medium, open)
- Today the only list is "Inbox" (not-archived, not-trash). Provide tabs/filters.

### I-409 — Mail: keyboard shortcuts (j/k navigation, e archive, # delete, m mark-read) (low, open)
- Notion-Mail-style shortcuts. Useful once the basic actions land.

### I-410 — Form view "Copy form link" button should be disabled (with tooltip) until the public form route exists (low, open)
- Pair with B-424. Today the button silently copies a broken URL — instead, disable it and show "Public forms not yet available".

### I-411 — Page-history dialog should show a diff between adjacent versions (medium, open)
- The current dialog only lists timestamps and a "Restore" button. A "View changes" inline diff (or a side-by-side preview) would make restore decisions safer.

### I-412 — Page-history dialog should auto-snapshot at long intervals, not only on user click (medium, open)
- `saveSnapshot` is only triggered manually from the dialog. Auto-snapshot every 30 minutes of editing, capped at 50 versions.

### I-413 — AI chat: persist messages in store and add "New thread" / "History" buttons (high, open)
- Pair with B-431. Multiple threads per workspace, scoped to the currently-viewed page when launched from the editor.

### I-414 — AI chat: token / credit cost should be visible on the prompt before sending (low, open)
- Today the panel shows "credits remaining" but not the per-send cost. Indicate "(5 credits)" next to the Send button so users know what they're spending.

### I-415 — Public page: render inline databases as a readonly table snapshot (high, open)
- Pair with B-414. The most-common Notion published pages are roadmaps and OKR pages with inline databases. Render the underlying rows as a stripped-down read-only table.

### I-416 — Public page route should generate proper OpenGraph metadata (medium, open)
- Today `<title>` is the generic site title. Set `<title>`, `<meta property="og:title">`, og:description, og:image (page.cover or first image block) per published page.

### I-417 — Database table: type picker shown on column creation (high, done)
- B-210 already notes this; framing it as an improvement: the right "Add property" UX is to immediately show the type list inline (no native prompt), and remember the last-used type as the default.

### I-418 — Add "Delete forever" / "Restore all" bulk actions in the Trash route (medium, open)
- Routes/app.trash.tsx currently lists deleted pages individually. Add Select-all / Empty-trash / Restore-all controls.

### I-419 — Empty trash bin needs a clear empty state with timestamps (low, open)
- Show "Items moved to trash will be permanently deleted after 30 days" (if any retention policy exists) and an "Empty trash now" button.

### I-420 — Filter / sort menu on view bar must include "Group by" for board/timeline views (medium, open)
- Pair with I-308. Even before full filter/sort, exposing Group by would let users re-key board columns.

### I-421 — Pages list under sidebar Trash should be searchable when long (low, open)
- After bulk testing, the trash list can grow long. Add a small filter input at the top.

### I-422 — Sidebar "More" menu needs an "Add to favorites" toggle (low, open)
- Sidebar Sidebar.tsx exposes Duplicate / Move to Trash, but adding to favorites only happens via star icon on hover. Surface it in the More menu too.

### I-423 — Database column drag-to-reorder (medium, open)
- Property order is fixed (additions append to the end). Notion lets you drag columns to reorder; today the only way to reorder is to edit `view.propertyOrder` in JSON.

### I-424 — Database view tab drag-to-reorder (low, open)
- Same as I-423 but for the view tab bar.

### I-425 — Workspace export should be optionally per-page (instead of full workspace) (medium, open)
- Settings only exports everything. A "Export this page" item (top-bar Page-menu) producing a JSON file for one page subtree would be much more shareable.

### I-426 — Inline images in /p/<slug> should be lazy-loaded with `loading="lazy"` (low, open)
- p.$slug.tsx line 110 renders `<img>` without `loading="lazy"`. For pages with many images that's a meaningful perf win.

### I-427 — `useStore` selectors that return arrays/objects from `Object.values` should use a `useShallow` helper (medium, open)
- Several callers (Sidebar useMemo + selector, etc.) take a snapshot of the whole `pages` map then filter. Provide a `useShallow(selector)` wrapper that returns a memoised shallow-equal slice to avoid recomputing big arrays on every state update.

## 2026-05-12 16:10 — Test agent batch 5

### I-500 — Build a unified `useConfirm` / `usePrompt` hook to replace every native dialog call (high, open)
- See B-512..B-522 for the >15 remaining sites using `prompt()` / `confirm()` / `alert()`. Each test pass identifies more.
- Proposal: a `useDialogs()` hook backed by a portal-rendered `<DialogStack>` exposing `confirm(opts) → Promise<boolean>` and `prompt(opts) → Promise<string | null>`. Migrate all native calls in a single PR.

### I-501 — Add a "Group by" picker in DB view menu and use it for board/timeline (high, open)
- Pair with B-502. Once filter/sort/groupBy are wired, board/timeline can re-key columns dynamically.

### I-502 — Database relation picker UX (high, done)
- New UI for clicking a relation cell: a popover with searchable list of target rows + a "+ Create new" inline button. See B-500.

### I-503 — Rollup configuration UI (high, done)
- New dialog/popover that selects: source relation property, target property, aggregation function. Render preview value as you change selectors. See B-501.

### I-504 — Real LaTeX rendering for equation blocks (medium, open)
- Integrate KaTeX (8KB gzipped). Render synchronously in EquationEl. Add inline-equation support via markdown shortcut `$...$` and block-equation via `$$...$$`. See B-505.

### I-505 — Synced block runtime: read/write child blocks across pages (medium, open)
- Implement `SyncedBlock` as a container that owns its children; `SyncedBlockRef` looks up by `sourceId` and renders the same children. Edits propagate via the existing `updateBlock`/`addBlock`/`reorderBlocks` since the children share parent ids. See B-503.

### I-506 — Columns block: drop-target columns with child blocks (medium, open)
- Render `c.columns` ColumnBlock children; each column accepts drag-drop of blocks (use the existing `text/x-block-id` transfer). See B-504.

### I-507 — Toggle block child rendering (medium, open)
- Toggle should support child blocks via `parentId`. See B-506.

### I-508 — Folder tabs in /app/mail (Inbox / Sent / Drafts / Trash / Starred) (medium, open)
- See B-524. Required as soon as Compose Send actually persists.

### I-509 — Mail Compose: disable Send when empty and add Draft auto-save (medium, open)
- See B-526, B-527. Persist draft to `state.mails` with `folder: "draft"` on every keystroke; "Send" only flips `folder: "sent"`.

### I-510 — Sign-in / Sign-up form: show errors (medium, open)
- See B-507, B-508. Capture `error` from supabase `auth.signInWithPassword` / `signUp` and render below the form.

### I-511 — Auto-focus title on freshly created page (low, open)
- See B-533. Use a `useEffect` that runs on mount, checking `page.title === "" && Date.now() - page.createdAt < 2_000`.

### I-512 — Show last-snapshot indicator near history button (low, open)
- See B-528, B-529. "Last snapshot 3 min ago" + toast on save.

### I-513 — Verification expiry picker (low, open)
- See B-530, B-531. UI element on the Verify button: "Verify for 30d / 90d / 1y / custom".

### I-514 — Mount `<Toaster />` at the root, not inside /app (low, open)
- See B-537. Move from src/routes/app.tsx to the top-level root component so /auth and /p/<slug> can also show toasts.

### I-515 — Cascade-trash should also include child databases and rows (medium, open)
- See B-539. Update `moveToTrash` to find all `databases` with `parentPageId === pageId` and trash them + their rows.

### I-516 — Cascade-restore should restore the same group atomically (medium, open)
- See B-540. Use the shared `trashedAt` timestamp or a new `trashCascadeFrom` field to restore subtrees in one click.

### I-517 — Settings export: option "Skip media (data URLs)" (medium, open)
- See B-510. A simple checkbox that strips data URLs before export.

### I-518 — Settings export: redact `createdBy` / `lastEditedBy` user ids (medium, open)
- See B-433, B-532. Optional "Anonymize users" toggle on export.

### I-519 — Show drag handle on keyboard focus (low, open)
- See B-542. Use focus-within to make the handle visible for keyboard navigation.

### I-520 — Empty rollup / "show-original" should preserve target cell rendering (low, open)
- See B-534, B-535. Rollup output should rely on the same renderer as the target property.

### I-521 — In-page command palette quick-action to create a new sibling page (low, open)
- Today the only way to create a page is sidebar + or "New subpage". Surface "+ New page in <teamspace>" inside the command palette.

### I-522 — Database "Add property" should default to last-used type, not always text (low, open)
- See B-501 and I-417. Remember the last `type` chosen from the column-header picker and use it as the default.

### I-523 — Snapshot diff view (low, open)
- When restoring, show a side-by-side or unified diff of the snapshot vs current state, so users can preview what they're about to overwrite.

### I-524 — Block hover handle hit-area too small on Mac trackpads (low, open)
- The "+" and drag handles are 16x16; expanding the hit area by adding `before:absolute before:inset-[-6px]` would make trackpad clicks more forgiving.

### I-525 — Inline DB calendar: prompt to pick a date property when adding a Calendar view if none exists (low, open)
- See B-525. Either disable the Calendar option in the picker when no date prop exists or surface a "Pick a date property" inline message.

### I-526 — Mail compose: render a recipient autocomplete fed by past senders + workspace members (low, open)
- The To field is plain text today.

### I-527 — Persist AI chat thread under user state (low, open)
- See B-431. Save messages to `state.aiThreads[currentUserId]` and rehydrate on open.

## 2026-05-12 16:59 — Test agent batch 6

### I-600 — Auto-create paired property on "Two-way relation" toggle (high, open)
- See B-600. When `isDual` flips from false to true, create a Relation property on the target DB with `targetDatabaseId = sourceDb.id`, set both ends' `pairedPropertyId`. Reuse the property type and a default name like `"← <source>.<propname>"`.

### I-601 — Default rollup function to "count" when undefined (high, open)
- See B-601. Either initialise the property as `{ function: "count", ... }` on `addDatabaseProperty`, or treat `rp.function ?? "count"` in RollupCell. Initialising the property is preferred because it makes the data stable across schema migrations.

### I-602 — Use the cascade-restore helper from the PageView trash banner (high, open)
- See B-604. Replace `restorePage(page.id)` with `restorePageCascade(page.id)` in `PageView.tsx`. Same cascade-restore should be wired from the command palette "Restore" action if it exists.

### I-603 — Replace ALL remaining native `confirm()`/`prompt()`/`alert()` with in-app dialogs/toasts (high, open)
- See B-605, B-606, B-607, B-608, B-609, B-610, B-611.
- File scope: `src/components/page/PageHistoryDialog.tsx`, `src/components/database/views/TableView.tsx`, `src/components/database/InlineDatabase.tsx`, `src/components/page/PageView.tsx`, `src/components/editor/InlineToolbar.tsx`, `src/components/layout/Sidebar.tsx`, `src/routes/app.calendar.tsx`.
- A single shared `<ConfirmDialog />` and `<PromptDialog />` component reused across the app would close most of the back-catalog of native-dialog bugs.

### I-604 — Inline Filter/Sort UI on database views (high, open)
- See B-619. `filter.ts` already supports operators; just need a Filter bar at the top of any inline DB.

### I-605 — Public published-page renderer for richer block types (high, open)
- See B-613, B-614. Extend `ReadonlyBlock` to render database-inline, equation, toggle, columns, sub-page (as link if also published or stub), AI block (last result), button (disabled with label), synced-block (its children).

### I-606 — Mobile sidebar should be a fixed overlay with backdrop and outside-tap close (high, open)
- See B-612. Add a Drawer-like pattern: position fixed, z-50, backdrop `bg-black/40`, slides in from the left, dismissed by tapping outside.

### I-607 — Reveal per-row Trash icon on focus-within (medium, open)
- See B-603. Add `focus-within:opacity-100` to the row's button group.

### I-608 — Inline "+ Create new" in the relation picker (medium, open)
- See B-621. Footer button creates a new row in the target DB, links it, and re-runs filter.

### I-609 — Show DB display label + page in Relation Target picker (medium, open)
- See B-622. `option` text should include the parent page title (e.g., `"🗄️ Untitled database · in Test Page"`).

### I-610 — Confirm row deletion via undo-toast instead of immediate hard delete (medium, open)
- See B-633. Use the toast pattern: `toast("Row moved to trash", { action: "Undo", onAction: () => restoreRow(rowId) })`.

### I-611 — Native LaTeX rendering for equation block (medium, open)
- See B-615. Use KaTeX (~8 KB gzipped) — see also I-504.

### I-612 — Notify user on snapshot save (medium, open)
- See B-637. Toast + "Last snapshot 3 min ago".

### I-613 — Disable contenteditable for blocks on trashed pages (medium, open)
- See B-636. Walk all `[contenteditable]` nodes and set `contentEditable = "false"`.

### I-614 — Property removal should clean up paired-relation references on other DBs (medium, open)
- See B-632. `removeDatabaseProperty` should also scan all `databases[*].properties` and clear `pairedPropertyId === removedId` / set `isDual: false`.

### I-615 — Use locale-aware first-day-of-week for the calendar (low, open)
- See B-634. Use `new Intl.Locale(navigator.language).weekInfo?.firstDay`.

### I-616 — Add explicit `type="button"` to non-submit buttons in compose dialog (low, open)
- See B-628. Defensive coding to avoid future regressions.

### I-617 — Add accessible tablist semantics + arrow-key navigation on sign-in tabs (low, open)
- See B-627. role="tablist" / "tab" / "tabpanel", and arrow-key handlers.

### I-618 — Normalise unique-id prefix on input (low, open)
- See B-626. On change, trim and (optionally) uppercase the prefix; pattern `/^[A-Z0-9_-]{1,8}$/` could be enforced.

### I-619 — Capitalise the calendar month title regardless of locale (low, open)
- See B-620. `s.charAt(0).toLocaleUpperCase(locale) + s.slice(1)`.

### I-620 — Return focus to property-header trigger when its menu closes (low, open)
- See B-629. Store the trigger ref and call `.focus()` in the `useEffect` cleanup.

### I-621 — Mark the relation picker checkbox as decorative for screen readers (low, open)
- See B-630. `aria-hidden="true"` or replace with a check icon.

### I-622 — Forbid changing a `title` property's type (low, open)
- See B-623. Remove `title` from the destination-type list, since each DB must have exactly one title.

### I-623 — Close open property menus when switching DB views (low, open)
- See B-624. Use a `useEffect` that clears `openPropertyId` whenever `viewId` changes.

### I-624 — Document/UI clarification: rollup over text returns NaN — show "—" instead (low, open)
- See existing B-534 plus B-631. RollupCell should detect non-numeric values and short-circuit to "—".

### I-625 — Chart view should adapt grid/tooltip colours for dark mode (low, open)
- File: src/components/database/views/ChartView.tsx hardcoded `#ccc` and `#3b82f6`. Use CSS variables or `useTheme`. Tooltip currently uses recharts defaults (white background) which is unreadable on dark mode.

## 2026-05-12 16:05 — Test agent batch 8

### I-700 — Sidebar nav should remount PageView when pageId param changes (high, open)
- See B-700. Add `<PageView key={pageId} />` so the editor remounts on route change, OR use a `useEffect([pageId])` that re-reads the page from store.

### I-701 — Slash-menu filter should match command `id` (low, open)
- See B-701. In `filterSlash`, include `cmd.id.toLowerCase().includes(q)` so `/columns-2` works.

### I-702 — Clean up paired-relation references when type changes away from relation (high, open)
- See B-702. In `updateDatabaseProperty`, when `prevProp.type === "relation" && updatedProp.type !== "relation"`, scan all DBs for `props.where(p.pairedPropertyId === propertyId)` and clear them.

### I-703 — Show confirmation when changing a property type would lose configured config or row data (medium, open)
- See B-703. Use the existing toast/dialog system; only confirm when there is non-empty config or non-empty values for that prop.

### I-704 — Rollup cell placeholder should distinguish "no config" from "no values" (medium, open)
- See B-704. Use distinct visual states: italic "Configure relation" vs "—".

### I-705 — Disable or annotate rollup relation options that lack targetDatabaseId (low, open)
- See B-705. Show "(no target)" beside the option label and disable it.

### I-706 — Disambiguate identically-named databases in pickers (medium, open)
- See B-622/B-706. Append the host page title and a short id to "Untitled database" entries.

### I-707 — Render LaTeX via KaTeX in equation blocks (high, open)
- See B-707, I-611. KaTeX is ~8 KB gzipped and renders synchronously; replacing the placeholder `<div class="font-serif text-lg">` with `<div ref={el => katex.render(value, el)}>` would unlock real math rendering.

### I-708 — Expose block-level commenting (high, open)
- See B-708. Add a "💬" hover affordance in BlockShell that opens a thread popover (PageComments has the rendering; just needs a Block-filter mode and a creator).

### I-709 — Either implement Synced Block runtime or hide it from the slash menu (high, open)
- See B-709. The synced-block branch in Block.tsx is a static dead-end. The least-cost fix is to remove it from `slash-commands.ts` and `Block.tsx` types until real mirroring exists.

### I-710 — Cmd+/ should open the block options popover (medium, open)
- See B-712. Add `metaKey/ctrlKey + "/"` to Block.tsx onKeyDown that triggers the same `setMenuOpen(true)` used by the grip-vertical handle.

### I-711 — Drag-and-drop reorder INSIDE a column (high, open)
- See B-713. Implement `reorderColumnChildren(colId, newOrder)` and detect when `block.parentId.type === "column"` in BlockShell.onDrop.

### I-712 — Drag a block INTO a column (medium, open)
- See B-714. The column container should accept block drops and re-parent the block.

### I-713 — Type coercion when changing property type to scrub stale row.values (medium, open)
- See B-711. Implementation: `setState(s => { ... rows: Object.fromEntries(Object.entries(s.rows).map(([id, r]) => [id, {...r, values: {...r.values, [propId]: defaultFor(newType)}}])) ... })`.

### I-714 — Detect prefers-color-scheme on first load (low, open)
- See B-718. Read `window.matchMedia('(prefers-color-scheme: dark)').matches` if `darkMode` is undefined.

### I-715 — Slug collision handling in publish dialog (medium, open)
- See B-717. Append a numeric suffix or random hash on conflict; surface "this slug is taken" inline.

### I-716 — Fallback rendering for unsupported block types in /p/<slug> readonly view (high, open)
- See B-716. ReadonlyBlock should return a placeholder card "[Block type 'columns' is not yet supported in the public view]" instead of null. Even better: implement readonly renderers for columns/equation/toggle/database-inline so the public viewer matches the editor.

### I-717 — Backfill existing relation links on toggle isDual (medium, open)
- See B-719. When toggling isDual on, walk through `s.rows[*].values[propertyId]` and mirror onto target rows.

### I-718 — Preserve unique-id prefix on property deletion, or reset counter (medium, open)
- See B-720. On delete: stash `{prefix, nextUniqueId}` on the DB under a `deletedUniqueIdMeta` key keyed by property name; on re-create with the same name, restore. Or simpler: when the unique-id prop is deleted, reset `db.nextUniqueId = 1` so a fresh prefix re-creation makes sense.

### I-719 — Implement Cmd+D duplicate-block shortcut (medium, open)
- See B-721. Add to Block.tsx onKeyDown: `else if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); createBlock(pageId, {...block, parentId: pageId, order: block.order}, block.id); }`. Also bind ⌘⌫ to delete-block per the menu.



## 2026-05-12 19:45 — Test agent batch 10

### I-800 — Per-block error boundary so one corrupted block doesn't kill the page (high, open)
- See B-800. Wrap each <Block /> in an ErrorBoundary that renders a small "this block failed to render — click to delete" card. The current top-level CatchBoundaryImpl is far too coarse.

### I-801 — Public toggle should render its body recursively (high, open)
- See B-801. Same pattern as in the editor: nest child blocks under a `<details>` body.

### I-802 — Public sub-page link should show title and link to public slug if available (medium, open)
- See B-802.

### I-803 — Public AI block placeholder when result is empty (low, open)
- See B-803.

### I-804 — Sanitize property fields on type change (low, open)
- See B-804.

### I-805 — Auto-pick a sensible rollup default on creation (high, open)
- See B-805. On addDatabaseProperty with type=rollup, default relationPropertyId to the first existing relation prop (if any), function to "count", and targetPropertyId to the linked db's title (or first non-empty). This matches Notion's behaviour.

### I-806 — Public page dark mode (medium, open)
- See B-806. Honour `prefers-color-scheme` (since the public viewer is anonymous and has no app state) and add a small toggle in the corner.

### I-808 — Show inline error and loading state for auth submit (high, open)
- See B-808.

### I-807 — Add JSON import (medium, open)
- Export-only flow means users can back up but never restore. Add an "Import JSON" button that validates schemaVersion, replaces (or merges) state, and recovers from corrupt state (paired with B-800 per-block error boundary).

### I-809 — Resolve created-by/last-edited-by to display name (medium, open)
- See B-809.

### I-810 — Formula cell placeholder + expression editor (medium, open)
- See B-810. Even a simple monaco/<textarea> with a list of column tokens would unlock the property.

### I-811 — Memoize block subscription to keep typing latency O(1) (high, open)
- See B-811. Use `useStore(s => s.pages[pid].blocks, shallow)` for the IDs and let each Block component read its own data. Also consider virtualizing the block list above 200 blocks.

### I-812 — Persist page title on every input (medium, open)
- See B-812.

### I-813 — Show "Untitled" placeholder for empty page titles in sidebar/palette (low, open)
- See B-813.

### I-816 — Action editor for the button block (medium, open)
- See B-816. Reuse the existing button-property action editor (which is what makes `Toast me` work in the DB sample).

### I-817 — Honour `extra.view` on database slash commands (medium, open)
- See B-817.

### I-818 — Wire up Sort/Filter/Group UI for db views (high, open)
- See B-818. State already supports them, so it's just exposing UI controls.



## 2026-05-12 22:45 — Test agent batch 13

### I-1100 — Cmd+K palette items should set `aria-selected` on the highlighted row (medium, open)
- See B-1111. cmdk currently styles via a class; for a11y screens, set `aria-selected={isHighlighted}` and `role="option"` on each item plus `role="listbox"` on the wrapper.

### I-1101 — Surface a Favorites sort/order UI (medium, open)
- See B-1106. Either auto-sort by `favoritedAt` desc (cheap, mirrors most apps) or add drag handles to reorder. Store a `favoriteOrder: string[]` on the workspace or in `ui`.

### I-1102 — Make ButtonCell render the property's `label` (and optional `emoji`) (high, open)
- See B-1107. One-liner: replace `{bp.label || "Run"}` with `{[bp.emoji, bp.label || property.name || "Run"].filter(Boolean).join(" ")}`.

### I-1103 — Unify button action handling between block-level and DB-cell button (high, open)
- See B-1108. Extract `runButtonAction(action, ctx)` into `src/lib/button-actions.ts` and call it from both Block.tsx and PropertyEditor.tsx so the kinds stay in sync.

### I-1104 — Public viewer should render synced-block children (high, open)
- See B-1120. Walk the source's `blockIds` server-side at the readonly Block component (similar to how it handles toggle children in B-801 / I-801).

### I-1105 — App-level Undo for title / content edits using `page.history` (high, open)
- See B-1121. The store already has a `history` array per page; expose ⌘Z / ⌘⇧Z handlers that pop/push and call `updatePage(...)`.

### I-1106 — Sanitise block fields when changing type (medium, open)
- See B-1122. When transforming, project the existing block through `narrowToType(newType, block)` that drops fields not in the new union variant. Avoids fields silently piling up.

### I-1107 — Sticky title column in wide database tables (high, open)
- See B-1113. CSS-only fix: `position: sticky; left: 0; background: var(--card);` on the first `<td>` / `<th>` of each row; remember to set `z-index: 1` and a matching shadow on the right edge.

### I-1108 — Implement at-least Markdown export from page action menu (medium, open)
- See B-1117. Each block already has a clear text shape (`content`, `type`, children). A small `blocksToMarkdown(pageId)` function plus a "Copy as Markdown" item in the page menu would solve 80% of the export use cases.

### I-1109 — Per-person permissions on Share dialog using existing `page.permissions` shape (high, open)
- See B-1116. The `Page` type already has `permissions: PagePermission[]` and `pageOwners: string[]`. Add an email-invite input + dropdown for view/comment/edit and render the list under "People with access".

### I-1110 — Inline teamspace creation UI (medium, open)
- See B-1131. Replace `prompt("Teamspace name?")` with the inline input pattern used by view-rename / add-property.

### I-1111 — Drag-handle to reorder sidebar pages and teamspaces (medium, open)
- See B-1132. Make each ts-* / sidebar page row draggable; reuse the block-DnD logic but persist `order` on `Page` and `Teamspace`.

### I-1112 — Editable Calendar event chips (high, open)
- See B-1137. Click on an event opens an inline editor (title, date, time, color, calendar source); add a "Delete" affordance regardless of whether the event came from quickCreate or from a DB derivation.

### I-1113 — Coerce `calendarSource: personal` events into the source-aware Trash flow (high, open)
- See B-1135. One-liner fix in the `eventsByDay` build: when the underlying event has no DB origin, map `source: "calendar"` so the existing Trash button shows up. Alternatively branch the Trash button on either field.

### I-1114 — Smarter Form-view link or remove the button if no /form route exists (medium, open)
- See B-1138. Either ship the public form route or rename the CTA.

### I-1115 — Chart X-axis should default to the first non-title categorical property (low, open)
- See B-1139. If user picks title, show a hint "Each row will be its own bar — pick a select/status property for grouping."

### I-1116 — Toggle the visibility of `created-by` / `last-edited-by` columns when row metadata is missing (medium, open)
- See B-1112. Either default-hide them when rows lack the field, or render them with a "—" placeholder so a single bad row doesn't tank the page.


## 2026-05-12 23:35 — Test agent batch 14

### I-1200 — Toast after `insert-block` DB button action (low, open)
- See B-1202. Either always toast ("Inserted block") or warn ("Database has no parent page — block was not inserted") so the user knows the click did something.

### I-1201 — Defensively coerce `view.hiddenProperties`/`filters`/`sorts`/`propertyOrder` to arrays before use (high, open)
- See B-1203. Crashes from old seeds blow up the whole DB route. Pattern: `(view.hiddenProperties ?? []).includes(p.id)`. Apply uniformly across TableView/BoardView/etc.

### I-1202 — Share copy between page-button-empty-actions and DB-button-empty-actions toasts (low, open)
- See B-1209. Either link both to a "Configure actions →" affordance or use the same string. Minor consistency win.

### I-1203 — Render a mobile drawer scrim with click-to-dismiss (high, open)
- See B-1211 / B-1127 / B-911. Pattern: a `fixed inset-0 bg-black/40 z-40` overlay sibling of the drawer, with `onClick={closeSidebar}` and `aria-hidden`. Animate `opacity`. The Sidebar component already tracks a collapsed/open state in store.ui — wire it through.

### I-1204 — Row-detail / row-peek experience for DB rows (high, open)
- See B-1212 / I-300. Add a hover-revealed `↗` icon to each row that pushes `/app/row/<rowId>` (or a side-panel peek). Each row should have a route that renders the title as the page H1 + the cell values as a vertical PropertyEditor + a child Page body (rows can have a `blockIds` array per Notion spec).

### I-1205 — Implement Cmd+/ shortcut palette / help overlay (medium, open)
- See B-1213. Either a "show all shortcuts" Cheatsheet modal or a quick-action picker. Should be discoverable from the Help menu too.

### I-1206 — Investigate synced-block-ref render perf with many mirrors (medium, open)
- See B-1214. Memoise the SyncedBlockRef component on `(sourceId, blockIds, blockContents)` so unaffected refs don't re-render. Or hoist the source's children into a shared component that the refs reference, so an edit to the source triggers a single component render that fans out via portal.

### I-1207 — Disambiguate auth "Sign in" tab vs submit button (low, open)
- See B-1216. Give the tab a `data-testid="auth-tab-signin"` and the submit `data-testid="auth-submit"`. Or render the tab as a `nav` element instead of a `<button>`.

### I-1208 — Trash route should list trashed databases (and ideally rows / blocks) (high, open)
- See B-1218. Walk `state.databases` for `isInTrash === true` in TrashRoute, render with restore + permanent-delete actions; same UI as trashed pages.

### I-1209 — Group-by picker in view-menu for board / list / chart / etc. (high, open)
- See B-1219 / I-501. A simple select in the view-menu popover bound to `view.groupByProperty` (board) / `view.xAxis` (chart) / etc.

### I-1210 — Implement /form/&lt;dbId&gt;/&lt;viewId&gt; public submission route (high, open)
- See B-1220 / B-1138. Render each property as a form field (title→text input, status/select→native select with options, date→date input, checkbox→checkbox, etc.), persist on submit via `addDatabaseRow`. Probably anonymous or behind a token.

### I-1211 — Replace native prompt for inline-link with an inline popover (high, open)
- See B-1221. The same popover pattern used by teamspace-rename / +Add property fits perfectly: an absolutely-positioned input that anchors to the link button, supports Enter to commit + Esc to dismiss, prefills with current href when editing an existing link, and offers a "Remove link" affordance.

### I-1212 — Allow Enter in image-URL input to commit (low, open)
- See B-1225. Pasting a URL + Enter should call the same handler as the Embed button. Common Notion pattern.

### I-1213 — Add testids for Duplicate / Turn-into options in block menu (low, open)
- See B-1224. Aids E2E + a11y.

### I-1214 — Add a clearer "Demo mode" badge to the AI panel (low, open)
- See B-1229. The footer "Models: GPT-5.2 · ... (demo)" is easy to miss. A subtle pill in the header would prevent false expectations.


## 2026-05-13 00:50 — Test agent batch 15

### I-1300 — Coerce date / number filter values via Date.parse before numeric compare (high, open)
- See B-1304. Today `Number("2026-05-06T22:00:00.000Z")` returns NaN, so date filters always fail. Use `Date.parse(v)` for date properties (lookup property type) and stick with `Number(v)` for number/percent properties.

### I-1301 — Support array values in `contains`/`does-not-contain` filter operators (high, open)
- See B-1305. For multi-select / status with array storage, `contains <option-id-or-name>` should test `Array.isArray(v) && v.includes(needle)` or compare against option labels via the property's `options[]` list.

### I-1302 — Filter value input should be property-type aware (high, open)
- See B-1306 / B-1309. Date → `<input type="date">`; select/status → `<select>` of options; person → person picker; number → `<input type="number">`. Today the input is `type="text"` regardless.

### I-1303 — Compare select / status by `options[].order` (or option index) instead of localeCompare on option id (medium, open)
- See B-1308. For each select / status sort, look up the option in `property.options[]` and compare by index. Multi-select can sort by the first option's index.

### I-1304 — Stream AI chat responses token-by-token (medium, open)
- See B-1310. In demo mode, split the answer by whitespace and `setMessages` every 30-50ms via a `requestAnimationFrame` loop. In production hook the real `fetch().body.pipeThrough(new TextDecoderStream())` stream into the last assistant bubble.

### I-1305 — Stream AI block result with a typing animation (low, open)
- See B-1311. Same fix pattern as I-1304 but for `Block.tsx > AIBlockEl`.

### I-1306 — Cycle-detect synced-block-ref render path (high, open)
- See B-1312. In Block.tsx's synced-block / synced-block-ref renderer, pass a `Set<sourceId>` down the tree; if `set.has(sourceId)`, render `⚠ Circular synced reference` instead of recursing. Add an integration test for B-1312's exact seed shape.

### I-1307 — Inline block-level comments UI (high, open)
- See B-1313. Add a "Comment" action to the block hover/dropdown menu that creates a `Comment` with both `pageId` and `blockId` set. Add a gutter indicator on blocks with unresolved comments, plus filter the existing PageComments dialog to that block when the indicator is clicked.

### I-1308 — Bar width in Timeline view should derive from start/end of range dates (medium, open)
- See B-1314. The current implementation gives every bar a fixed width of 96px. Detect `date.range === true` (or whatever the schema uses) and compute width from `Math.max(1, dateDiffDays(end, start)) * dayPixelWidth`. For single-day events, render as a pin/diamond.

### I-1309 — Chart view should label X-axis with `option.name` not `option.id` (high, open)
- See B-1315 / B-1316. In `Chart.tsx`'s bucket aggregator, after grouping by raw id, map each bucket label through `property.options.find(o => o.id === id)?.name ?? id`. Same for tooltip labels.

### I-1310 — Custom inline error message on the auth form for invalid email (low, open)
- See B-1317. Add `<p id="auth-email-error" data-testid="auth-email-error">Enter a valid email address.</p>` rendered when `!email.match(/\S+@\S+\.\S+/)` after submit. Native HTML5 tooltip is locale-dependent and easily missed by test harnesses.

### I-1311 — Clear stale relation row references when a relation property's target DB is changed (high, open)
- See B-1318. On `updateDatabaseProperty(<rel>, { targetDatabaseId: newId })`, walk every row of the owning database and reset `row.values[relPropId] = []`. Optionally toast a count: "Discarded N broken links."

### I-1312 — Surface "Delete forever" on trashed pages in a sidebar Trashed section (medium, open)
- See B-1319. Either show trashed pages collapsed at the bottom of the sidebar with Restore / Delete forever actions, or add the action to the page-menu when the page is already in trash. Today users must navigate to /app/trash.

### I-1313 — Make Cmd+K palette open via DOM-dispatched KeyboardEvent for E2E reliability (low, open)
- See B-1320. The shortcut handler likely guards on `event.isTrusted` or `event.code`. Add `document.addEventListener("keydown", e => { if ((e.metaKey || e.ctrlKey) && e.key === "k") open(); })` at the app level.

### I-1314 — Surface `#ERR: Unknown property` when a formula references a non-existent property name (low, open)
- See B-1323. Today `prop("Nonexistent")` returns null/empty silently. Throwing a `FormulaError("Unknown property \"Nonexistent\"")` would make typos discoverable.


## 2026-05-12 21:00 — Test agent batch 16

### I-1400 — Use TanStack Router's navigate() in button-block `open-page` action instead of hard window.location (low, open)
- See B-1404. Currently `window.location.href = …` forces a full reload, throwing away in-memory state. Replace with `useRouter().navigate({ to: "/app/p/$pageId", params: { pageId } })` for an SPA-style transition.

### I-1401 — Add KaTeX (or MathJax) rendering to /equation block (medium, open)
- See B-1400. Today the block stores LaTeX content but renders the raw string. Bundle `katex` (~140KB gz) and call `katex.renderToString(content, { throwOnError: false })` into a sibling div. Show an error chip ("Invalid LaTeX: <msg>") on parse failure.

### I-1402 — Code block textarea should swallow Tab and insert a tab character (low, open)
- See B-1401. On `onKeyDown` for Tab: prevent default, insert `\t` (or N spaces from a setting) at the caret. Shift+Tab should outdent the current line (remove leading whitespace).

### I-1403 — Use strict numeric regex in compareValues to avoid mixing partial-numeric strings with pure numbers in sort (low, open)
- See B-1402. Currently `Number("3 items")` returns NaN so it lexically compares to a true numeric. Add `const isPureNumeric = (v) => /^-?\d+(\.\d+)?$/.test(String(v).trim())` and only attempt numeric compare when BOTH sides match.

### I-1404 — Show count of "discarded N links" toast when changing relation targetDatabaseId (low, open)
- See B-1318 verification. Current fix silently clears `row.values[relPropId] = []`. Notion shows a toast: "3 links removed" so users notice. Even a debug log would help users / E2E.

### I-1405 — Build a proper multi-select chip picker in form view (medium, open)
- See B-1406. The form should reuse the same chip-picker UI as the table cell. Until that lands, the form should at minimum coerce comma-separated input to an array on submit: `value.split(",").map(s => s.trim()).filter(Boolean)`.

### I-1406 — Add per-field conditional logic to form view (low, open)
- See B-1407. Add a `condition` block to form-view config: `{ ifPropertyId, op: "is"|"is-not"|"is-empty", value }`. On submit/preview, hide fields whose condition fails.

### I-1407 — Confirm dialog on page duplicate when the page contains an inline database (medium, open)
- See B-1408. Show two options: "Duplicate with linked database (default)" / "Duplicate with new copy of database". Linked is fast and matches today's behavior; deep-copy maps every row + property and remaps the inline block's `databaseId`.

### I-1408 — Implement @mention parsing in comments + populate Inbox (medium, open)
- See B-1409. On comment post, scan `content` for `@<user-id-or-name>` tokens. For each match, push a Notification with `kind: "mention"`, `recipientId`, `commentId`, `pageId`, `read: false` into a `notifications` slice. Inbox renders unread first, with a Mark-all-read action.


## 2026-05-12 21:30 — Test agent batch 17

### I-1409 — Slash menu should render "No results" item rather than disappear (low, open)
- See B-1414. Keep `[data-testid="slash-menu"]` mounted even when filteredItems.length === 0; render `<div className="text-xs text-muted-foreground px-3 py-2">No matches</div>` inside.

### I-1410 — Hydrate chart-view dropdowns from view.xProperty / view.yProperty on mount (low, open)
- See B-1415. The `<select value={view.xProperty ?? ""}>` works once the value exists, but seeded `xProperty` from older code paths used `xPropertyId`. Standardize the field name across types.ts, views[].push call sites, and ChartView.tsx.

### I-1411 — Implement reply / forward / archive / label-edit on Mail detail pane (medium, open)
- See B-1419. Even with no backend, the in-memory mail object can support these: Reply opens Compose with `to`, `subject: "Re: …"`, threaded body; Archive sets `mail.archived = true`; Label picker lets user add/remove labels from `mail.labels[]`.

### I-1412 — Add testids to Mail Compose button + label chips + main mail toolbar (low, open)
- See B-1420. Aids future E2E.

### I-1413 — URL cell should render as a clickable anchor when blurred (low, open)
- See B-1423. Common pattern: a "view/edit" toggle so the cell shows the link in display mode, switches to an `<input>` on focus/double-click.

### I-1414 — Files cell deserves a `data-testid` on the container (low, open)
- See B-1424.

### I-1415 — Implement undo/redo with Cmd+Z / Cmd+Shift+Z (medium, open)
- See B-1429. The Zustand store can record patches via `immer/produce` and feed them into an undo stack of inverse operations. Bind document keydown listeners for Cmd+Z (undo) / Cmd+Shift+Z (redo). Notion users absolutely expect this — its absence is a P2-ish gap on a Notion clone.


## 2026-05-12 22:30 — Test agent batch 19

### I-1416 — Replace legacy `<b>/<i>/<u>/<s>` markup with semantic `<strong>/<em>` (low, open)
- See B-1435. Notion stores rich text as a structured array. Even keeping HTML markup, prefer semantic tags. Long-term, model formatting as `{ text, marks: ["bold","italic", ...], link?, color? }[]` and render via a renderer.

### I-1417 — Wire emoji-picker search to a real alias index (medium, open)
- See B-1436. Bundle a small alias map (1k common emojis) — e.g. `unicode-emoji-json` (~25KB gz) — and filter by name/keyword/category. Until then, even a simple substring match on hardcoded names would beat the current no-op.

### I-1418 — Row-detail drawer for board / gallery / list / calendar views (high, open)
- See B-1437. Add a `RowDetailDrawer` component: opens when a card / list-item / calendar-event is clicked. Renders the title, each property (using `PropertyCell`), plus a Block-tree area driven by `row.blocks`. Without this, the app is missing one of the core Notion DB features.

### I-1419 — Make breadcrumb segments clickable links (medium, open)
- See B-1441. Use TanStack `Link` instead of `<span>` for ancestors.

### I-1420 — Clear block.content on slash-conversion to a non-content block (low, open)
- See B-1442. Standardize the slash-conversion path to set `content = ""` (or strip the `content` key) for block types that don't render content (columns, divider, table, etc.).

### I-1421 — Build a row-detail drawer for board / gallery / list / calendar views (high, open)
- See B-1437. Required for parity with Notion's database UX (clicking a row in any view should open a side drawer with all properties + the row's child blocks).


## 2026-05-12 23:50 — Test agent batch 22

### I-1500 — Add Escape-to-close on RowDetailDrawer (low, open)
- See B-1500. Standard modal hotkey.

### I-1501 — Add click-outside dismissal to RowDetailDrawer with a transparent backdrop overlay (low, open)
- See B-1501.

### I-1502 — Fully delete row from `state.rows` (not just `db.rows`) when delete is invoked from drawer (medium, open)
- See B-1502. Today the row stays in `state.rows` as an orphan. Either fully delete or move to trash.

### I-1503 — Make Table title cell also open the row drawer (high, open)
- See B-1503. Notion exposes the drawer affordance on every view. Add a leading "Open" icon button on hover for each table row.

### I-1504 — Register a public `/form/:databaseId/:viewId` route so `form-copylink` URLs actually work (high, open)
- See B-1504. Build a `routes/form.$databaseId.$viewId.tsx` route that renders the same FormField preview (no auth wall, just a single-page form). Otherwise the "Copy form link" feature is misleading.

### I-1505 — Add `onClick={openRow}` to Timeline bars and Calendar event chips (high, open)
- See B-1507, B-1508. Once these are wired, the drawer is reachable from every view type — parity with Notion.

### I-1506 — Add testids inside ViewSortPanel and ViewFilterPanel (low, open)
- See B-1513, B-1514.

### I-1507 — Implement persistent undo/redo (Cmd+Z / Cmd+Shift+Z) — keep I-1415 (high, open)
- See B-1509.

### I-1508 — Add Sent/Drafts folder filter to Mail list (low, open)
- See B-1517.

### I-1509 — Add drop handlers to Calendar grid cells so the draggable=true event chips can be repositioned (medium, open)
- See B-1512.

### I-1510 — RowDetailDrawer should render every property type (read-only for formula/rollup, edit for the rest) (medium, open)
- See B-1521.

### I-1511 — Calendar view should refuse / display warning when no date property exists (low, open)
- See B-1511.


## 2026-05-13 00:25 — Test agent batch 24

### I-1512 — Add testids to sidebar page-menu items (Duplicate/Move to Trash/Favorite/Rename) (low, open)
- See B-1533. `pmenu-duplicate-<id>`, etc.

### I-1513 — Add testids to PageOptionsMenu items in TopBar (low, open)
- See B-1528.

### I-1514 — Extend PageOptionsMenu with Duplicate / Move to / Export / Delete / Page history / Lock (medium, open)
- See B-1529. Match Notion's "..." menu.

### I-1515 — Make link button mousedown preventDefault to preserve selection (low, open)
- See B-1530. Standard rich-text editor pattern. Currently the popover only mounts when there's a non-empty selection.

### I-1516 — Add row-body block editor below property cells in RowDetailDrawer (high, open)
- See B-1523. Critical for parity — every Notion DB row has a "page body" of blocks. Schema already has `row.blocks`.

### I-1517 — Use semantic `<strong>/<em>/<s>` instead of `<b>/<i>` in InlineToolbar (re-state of I-1416) (low, open)
- See B-1526.

### I-1518 — Add a sub-menu of AI actions on the inline toolbar (Improve/Translate/Summarize) (medium, open)
- See B-1527. Match Notion's selection-driven AI.

### I-1519 — Commit `page-title` contenteditable on blur as well as keystroke (low, open)
- See B-1538. Today a quick navigation before the next input fires can lose unsaved input.

### I-1520 — Close any other open sidebar page-menu when opening a new one (low, open)
- See B-1539.

## 2026-05-13 01:35 — Test agent batch 27

### I-1600 — RowDetailDrawer backdrop click (RESOLVED, info)
- See B-1601 (corrected). Implementation is in place via outer onClick + inner stopPropagation. No further action needed.

### I-1601 — Markdown export should render button/toggle/columns/inline-database blocks meaningfully (medium, open)
- See B-1607. Today these become `<!-- placeholder -->` comments or empty `<details>`. Toggle should render summary + nested children; columns concatenate column children; button shows label as bold text or link; inline-database shows table.

### I-1602 — Calendar view shows event chips only for in-range rows; consider stub list "X events not visible" (low, open)
- During verification of B-1604, navigating to other months hides chips entirely. UX: a subtle banner "3 rows not shown in current month" would be useful.

## 2026-05-13 02:00 — Test agent batch 28

### I-1603 — Fix markdown export heading levels (heading-1 → `# `, not `## `) (medium, open)
- See B-1610. Today the exporter shifts all heads down by one which collides with the doc-title H1. Add a flag or always use proper levels — the title is its own H1 and headings stay at their semantic level.

### I-1604 — Markdown export should convert inline `<b>/<i>/<a>/<u>/<code>/<s>` to MD syntax instead of `stripHtml` (high, open)
- See B-1611. Critical — today exporter loses URLs and all inline formatting. Use a simple HTML→MD pass: `<b>X</b>→**X**`, `<i>X</i>→*X*`, `<a href=Y>X</a>→[X](Y)`, `<code>X</code>→`X``, `<s>X</s>→~~X~~`.

### I-1605 — Render button/columns/database-inline/synced-block/breadcrumb meaningfully in markdown export (medium, open)
- See B-1612. Button: `[Label](#)`; columns: concatenate children separated by newlines; database-inline: render the linked DB as a table; toggle: recurse children inside `<details>`.

### I-1606 — Add testids to sidebar More menu items (`pmenu-favorite-<id>` etc.) (low, open)
- See B-1615 / I-1512.

### I-1607 — Support right-click context menu on sidebar page rows (medium, open)
- See B-1616. Intercept `contextmenu`, reuse the same content as the kebab popover.

### I-1608 — Add block-level comment affordance to the editor (high, open)
- See B-1617. UI is missing despite store schema being ready. Add a comment icon to block hover toolbar; thread anchored to `blockId`.

### I-1609 — Persist AI chat thread in store across reloads (medium, open)
- See B-1618. Add `state.aiThread = { messages: AIMessage[] }`. Save user + assistant turns. Optionally namespace by page.

### I-1610 — Cascade DB delete: rows, relations, rollups, row.values entries (high, open)
- See B-1619. Single function `deleteDatabase(id)` must walk: rows where databaseId===id (delete or trash), relation properties where targetDatabaseId===id (null or strip), rollup props referencing those relations, row.values that hold ids belonging to the deleted DB.

### I-1611 — Add a DB-options kebab on the database header (Delete / Duplicate / Rename) (medium, open)
- See B-1620.

### I-1612 — Render broken relation cells as "Target deleted" placeholder, not silently hidden (low, open)
- See B-1621.

### I-1613 — Render database-inline and columns on /p/<slug> instead of placeholder text (medium, open)
- See B-1623.


## 2026-05-13 03:00 — Test agent batch 29

### I-1700 — Inline-DB toolbar should wrap or condense at narrow viewports (medium, open)
- See B-1705. Mobile workflows break because the toolbar pushes the inline DB beyond viewport.

### I-1701 — Implement timeline drag-to-change-date + edge resize handles (high, open)
- See B-1706. Core Notion timeline interaction; today the bar only opens a drawer when clicked.

### I-1702 — Implement Cmd+/ block actions shortcut (medium, open)
- See B-1707. Notion's keyboard parity.

### I-1703 — Make public `/p/<slug>` route reactive to unpublish (low, open)
- See B-1708.

### I-1704 — Clear `verifiedAt/verifiedBy/expires` when wiki is turned off (low, open)
- See B-1709.

### I-1705 — Use local date (or UTC ISO with time) in export filename (low, open)
- See B-1710.

### I-1706 — Add `search-result-*` testids (low, open)
- See B-1712. Helps automation, and gives keyboard users an anchor for j/k navigation.

### I-1707 — Calendar: add `cal-today` + `cal-add-event` (medium, open)
- See B-1713. Today is missing two critical affordances.

### I-1708 — Replace `window.prompt()` cover URL with proper cover picker (high, open)
- See B-1714. Important UX gap; prompt() blocks page and is hostile to keyboard/mobile.

### I-1709 — Comment threading: add Reply UI; surface `comment-input-<parentId>` (high, open)
- See B-1716. The data model supports `parentId` but no UI.

### I-1710 — Add `filter-remove-<index>` testid on filter row × (low, open)
- See B-1717.

### I-1711 — Table column drag-reorder + resize (medium, open)
- See B-1718.

### I-1712 — Standardise destructive-action testids (`db-delete` vs `delete-forever`) (low, open)
- See B-1719/B-1711.

### I-1713 — Slugify template testids: `template-decision-log-adr` etc. (low, open)
- See B-1721.

### I-1714 — Inbox: separate `mark-read` and `resolve` actions (medium, open)
- See B-1720.

### I-1715 — Surface `show-resolved` testid on comments toggle (low, open)
- See B-1715.

## 2026-05-13 04:00 — Test agent batch 30

### I-1800 — Make `synced-block-ref` actually mirror source content (high, open)
- See B-1800. Ref renders "Source is empty" regardless of source state. Should subscribe to the source block (and its children) and render them inline. Mutating source should re-render every ref.

### I-1801 — Add UI to create a synced-block-ref (high, open)
- See B-1801. `slash-synced` only creates a fresh source. Need either `slash-synced-ref` ("Paste a synced reference by id") or a "Convert to reference" affordance on an existing source. Today, refs only exist if manually injected into localStorage.

### I-1802 — Namespace AI chat per current user (medium, open)
- See B-1802. Replace global `notion-clone:ai-chat` with `notion-clone:user:<id>:ai-chat`, OR clear the global key on sign-out. Privacy fix.

### I-1803 — Validate cover URL protocol (medium, open)
- See B-1803. Reject `javascript:`, `data:` (except `data:image/`), and any non http/https scheme. Show inline "Only http(s) image URLs are allowed".

### I-1804 — AI input should submit on Enter (medium, open)
- See B-1804. Either wrap `ai-input` in a `<form onSubmit>` or add `onKeyDown` that sends when Enter and no Shift. Shift+Enter → newline (also requires switching to `<textarea>`).

### I-1805 — Add `data-testid="page-cover"` to PageCover wrapper (low, open)
- See B-1805. Tiny addition; helps automation and screen-reader labelling.

### I-1806 — `cover-url-apply` should be disabled or no-op when input is empty (low, open)
- See B-1806. Today empty + Apply silently wipes the existing cover.

### I-1807 — Add hover affordances on cover ("Change cover" / "Reposition") (medium, open)
- See B-1807. Standard Notion UX. Reposition is harder (image only, drag to set background-position-y), but "Change cover" should reopen the picker without first removing.

### I-1808 — Surface "Invalid formula" badge for unparseable expressions (low, open)
- See B-1813. Today silently blank.

### I-1809 — Consider react-window virtualization for board + table at >1000 rows (low, open)
- See B-1811/B-1812. Today 500 rows is fine. At ~5000 rows DOM count crosses 50k and will be sluggish.


## 2026-05-13 12:50 — Test agent batch 31

### I-1900 — Form view: implement actual interactive inputs + submit handler (high, open)
- See B-1901. Today every field renders as static `<div>text field</div>`, etc. — zero usability. Need:
  - Real `<input>` / `<select>` / date picker / checkbox per property type
  - `data-testid="form-field-<propId>"` per row
  - "Submit" button creating a `row_` in the DB and clearing inputs
  - Optional thank-you screen

### I-1901 — `form-copylink-<viewId>` should toast + actually link to a public route (high, open)
- See B-1902. Today clipboard might be set but no visible feedback. Also `/form/<viewId>` is 404 — public form viewer not implemented. Either add a public read-only route or hide the action until then.

### I-1902 — Add `data-testid="ai-msg-<index>"` per chat message (low, open)
- See B-1903. Today queries returning 0 force fallback to text matching. Trivial fix; high automation value.

### I-1903 — Synced ref: validate target on Link (medium, open)
- See B-1906. Confirm block exists & is `type:'synced-block'` before persisting `sourceId`. Render inline error otherwise.

### I-1904 — Synced ref: also mirror source's own `content` (high, open)
- See B-1905/B-1800. Refs currently only mirror `children`; source's own text body is silently dropped. Matches Notion behavior.

### I-1905 — AI: thread list / multi-thread support (medium, open)
- See B-1907. Today `ai-new-thread` destroys history without confirmation. Either confirm + archive, or allow multiple threads with a switcher.

### I-1906 — Home/Inbox: add `home-*`, `inbox-row-*`, `inbox-mark-read-*` testids (low, open)
- See B-1909, plus existing inbox gap.

### I-1907 — Cover gradient + dark mode handled correctly (info)
- Verified: html.dark flips title to near-white, body to near-black. Cover (Sunset) sits above title — no overlap, contrast not at risk.

### I-1908 — Mail compose: validate `compose-to` as email (low, open)
- See B-1911. Inline error + disable Send for invalid/empty recipient.



## 2026-05-13 14:00 — Test agent batch 32

### I-2000 — Block-level commenting: add `block-comment-<id>` testid + threaded panel (high, open)
- See B-2000. Still entirely missing. Notion's bread-and-butter for review workflows.

### I-2001 — Virtualize block list past 1000 (medium, open)
- See B-2001. First-keystroke latency 169ms on a 500-block page already perceptible. At 1000+ blocks, recommend `react-window` for the block list (page editor) and table rows.

### I-2002 — AI input: switch single-line `<input>` → `<textarea>` + soft char limit (medium, open)
- See B-2002. 50k chars in 1-line input is unreadable. Suggest auto-grow textarea (max 6 rows) + visible counter when >2k.

### I-2003 — Wire up `ConditionalRule` show/hide for FormView (high, open)
- See B-2003. Type exists. Need: form-view config UI to author rules + runtime engine to evaluate each rule on field-change. Each hidden field should still have `data-testid="form-field-<id>"` but `aria-hidden="true"` + display:none.

### I-2004 — Database row drag-reorder + board card drag-between-columns (medium, open)
- See B-2004, B-2016. Add `row-drag-<id>` handle on table rows, `draggable=true` on board cards, and persist `order` field on row property.

### I-2005 — Markdown export: include synced-block source `content`, sub-page title+slug, placeholder for empty media (medium, open)
- See B-2005, B-2006, B-2007.
- For synced-block: emit `htmlToInlineMarkdown(b.content)` BEFORE children.
- For sub-page: emit `📄 [${page.title}](/p/${page.publishSlug || page.id})` using blocks dict + page lookup.
- For empty image/video/table: emit `<!-- image: (no url) -->` etc.

### I-2006 — Templates: implement "use template" handler (high, open)
- See B-2008. Click should: (a) create a fresh page in current teamspace, (b) instantiate the template's blocks, (c) navigate to it. Today the 8 templates are decorative.

### I-2007 — Calendar: add `cal-today`, `cal-add-event`, `cal-event-<id>`, `cal-view-month/week/day` testids (low, open)
- See B-2009. Trivial UI addition; high test value.

### I-2008 — Home: add `home-fav-<id>`, `home-recent-<id>`, `home-section-<name>` testids (low, open)
- See B-2010. Currently 0 testids on Home view.

### I-2009 — Share dialog: add `publish-copy-url` testid on Copy button (low, open)
- See B-2011.

### I-2010 — Page history: add `history-restore-<snapshotId>` testid + ARIA dialog role (low, open)
- See B-2012. Also wrap panel in `role="dialog"` for screen-reader semantics; today it's `<div>` inline.

### I-2011 — Inbox: add `inbox-row-<commentId>`, `inbox-page-link-<pageId>`, `inbox-date-<commentId>` testids (low, open)
- See B-2013. Mark-as-read already works.

### I-2012 — At ≥500 rows, virtualize table & gallery (medium, open)
- See B-2014, B-2015. 802 row-open + 802 gallery-card already approaches 30k DOM nodes — combined with a 500-text-block page on the same route makes interaction sluggish.

### I-2013 — Slash menu: ensure programmatic dispatch works (low, open)
- See B-2020. Today only physical keydown fires the menu. Consider listening on `beforeinput` as fallback so automation can drive it.

### I-2014 — page-options menu: stop click-outside handler from racing with toggle (low, open)
- See B-2021. Add `event.stopPropagation()` on the menu's mousedown OR use `useOnClickOutside` that ignores the trigger element. Affects automation more than users.

### I-2015 — Sub-page publish: add per-sub-page publish toggle (low, open)
- See B-2018. Today the parent's "publish" only exposes top-level page; sub-pages render as "(unpublished)" inside the public view, with no way to publish them individually. Either auto-include via a "publish entire subtree" option or per-page toggle.


## 2026-05-13 02:30 — Test agent batch 22

### I-2100 — Fix "Copy form link" URL (high, open)
- See B-2103. Either implement `/form/<dbId>/<viewId>` as a publicly-rendered FormView route, or change the copied URL to `/app/p/<pageId>?view=<viewId>`. Today the button silently hands users a dead 404 link.

### I-2101 — De-duplicate `publishSlug` on publish (high, open)
- See B-2104. Two pages with identical title (`OKRs`, `OKRs (Copy)`) both resolve to `publishSlug="okrs"` on publish; only the first matches. Auto-suffix `-2`, or reject the publish toggle with an inline error.

### I-2102 — Drag-reorder for table rows (medium, open)
- See B-2105 / B-2004. Add a row drag-handle column (left of the title cell) wired to the existing `reorderBlocks`-style helper for `rows.order`.

### I-2103 — Drag-reorder + drag-nest for sidebar page tree (medium, open)
- See B-2106. Notion's sidebar is the most-used drag target — currently inaccessible. HTML5 DnD on the `<li>` rows with parent/child drop zones would do it.

### I-2104 — Drag-to-move calendar event chip (medium, open)
- See B-2107. Make the event `<div>` `draggable={true}`, capture `dragstart` with the event id, on `drop` over a `week-day-<date>` update `calendarEvents[id].date` (and downstream database rows if `eventsBy` includes a row sync).

### I-2105 — Public render of embedded databases (medium, open)
- See B-2108. At least for tables and forms — public form submissions are the canonical Notion use case. Card on Edit Public Page panel: "Allow public form submissions".

### I-2106 — Wire real LLM behind AI chat / detect code-fenced output (medium, open)
- See B-2109. Swap `pseudoAnswer` for an API call (Anthropic / OpenAI). Render markdown so triple-backtick fences become real `<pre><code>` blocks. Add streaming UI ("…").

### I-2107 — Fix conditional-array useEffect deps warning (medium, open)
- See B-2110. Track down the renderer pushing different-length dep arrays; likely in a per-block effect or in `CommandPalette`/`SearchModal` items loop. React 19 may upgrade this from warning to hard error.

### I-2108 — Syntax highlight for code blocks (low, open)
- See B-2111. Pull a small highlighter (Prism core + shiki light) on demand — keep textarea for editing, render highlighted `<pre>` when blurred.

### I-2109 — `role="dialog"` + cmdk-* testids on command palette (low, open)
- See B-2112. Wrap palette in `role="dialog"` with `aria-label="Command palette"`; add `data-testid="cmdk-item-<id>"` for each entry.

### I-2110 — Calendar month view: add `cal-day-<key>` and `cal-event-<id>` testids (low, open)
- See B-2113. Pair with I-2007.

### I-2111 — Page-level breadcrumb in chrome (low, open)
- See B-2114. Render parent chain at the top of every `/app/p/<id>` page (above title). Helps with deep nesting and is already accessible in the page object graph.


## 2026-05-13 03:30 — Test agent batch 23

### I-2200 — Implement missing conditional-logic operators in public form route (high, open)
- See B-2203. `src/routes/form.$dbId.$viewId.tsx:72-75` covers only `equals`, `not-equals`, `is-empty`, `is-not-empty`. Add `contains` (string includes), `greater-than` / `less-than` (numeric compare with `Number(v)`), and ideally `before` / `after` for date types. Reject unknown operators at view-save time so authoring is type-safe.

### I-2201 — Re-render Inbox list when comments mutate (high, open)
- See B-2210. The list shows stale comments after `inbox-resolve-*` is clicked; only refreshes after a full reload. Either select `comments` directly from the store (not the derived `notifications` snapshot) or wrap the list in `useStore` shallow subscriptions so the resolve mutation triggers a re-render.

### I-2202 — Configure `notFoundComponent` on the `/app` route (low, open)
- See B-2212. Pass `notFoundComponent: () => <NotFound />` (or `defaultNotFoundComponent` at the router level) so the warning stops and users see a friendly screen instead of TanStack's `<p>Not Found</p>`.

### I-2203 — Public form: keep block-content / attachments column round-trippable (low, open)
- See B-2218. If a property is `type:"files"` the form renders the input but submission writes empty array. Either remove unsupported types from the public form list or wire a real file-upload pipeline (e.g. to Supabase storage).

### I-2204 — Wire "/app/calendar" to also surface database-row date events (medium, open)
- See B-2219. The page tagline promises two-way sync with database date properties but only renders `calendarEvents.*`. Merge in `Object.values(rows)` whose db has at least one date-typed property and a calendar-view configured, mapped to the configured "date" property.

### I-2205 — Sub-page export when target page is missing (low, open)
- See B-2206. Fall back to either nothing (silently drop) or annotate `[Sub-page (missing)](#)` so the export doesn't carry a dead absolute /app/p link to a non-existent page.

### I-2206 — Reply / thread model for comments (medium, open)
- See B-2216. Add `parentId` (and optionally `threadId`) to the Comment type; render replies indented one level inside `PageComments.tsx`. Today every comment is top-level.

### I-2207 — Allow public form route to optionally allow open / unauthenticated submissions but rate-limit them (low, open)
- The route silently accepts unlimited POSTs to localStorage today. Once the server-side persistence lands, add a per-IP throttle, a Turnstile/captcha hook, or at minimum a "one submission per browser per minute" debounce.

### I-2208 — Cascade comment resolve to children (medium, open)
- See B-2404. When resolving a parent comment, also mark all child comments (`comments.*.parentId === parent.id`) as resolved (or expose an explicit "resolve thread" action vs. "resolve this comment"). Today the child stays unresolved but invisible.

### I-2209 — "Move page to teamspace" action (medium, open)
- See B-2409. Add a `pmenu-move-to-*` submenu in the Sidebar page menu and a `page-opt-move-to-*` item in the PageView options. Data model already has `pages[id].teamspaceId` — only UI is missing.

### I-2210 — Row-count / filter badges on view tabs (low, open)
- See B-2410 / B-2417. Append `· {filteredCount}` (or `{filteredCount} / {totalCount}` when filtered) to each `db-view-*` tab label. Helps users notice when a filter is hiding rows.

### I-2211 — Public form route must accept either viewId or view index (low, open)
- See B-2413. `/form/<dbId>/0` should resolve to the first form view in `db.views` instead of 404. Either rewrite via redirect or accept both formats.

### I-2212 — Gallery card drag-reorder (medium, open)
- See B-2408. Add HTML5 DnD to `gallery-card-*` so users can reorder cards within a view; updates `rows.order`.

### I-2213 — Detect fenced code in AI output rather than gating on prompt keyword (medium, open)
- See B-2402 / B-2403. Parse the response text for triple-backtick fences and emit `<pre><code>` only when found; today the renderer emits the `<pre>` block based on the user prompt containing "code", and the example contains an unsubstituted `${matches.length}` template literal that leaks to the UI.

### I-2214 — Timeline grid virtualization (medium, open)
- See B-2418. With 360 bars per 7-row db, pages with multiple inline timeline views render thousands of divs. Virtualize day cells / clip to viewport.


## 2026-05-13 04:50 — Test agent batch 26

### I-2500 — Sanitize text-block HTML at render time (high, open) — security
- See B-2503. Today the text-block renderer pours `block.content` directly into the DOM via `dangerouslySetInnerHTML`, allowing `<img src=x onerror=...>` and similar payloads to execute arbitrary JS. Either (a) pipe through DOMPurify with an allowlist of `<b>/<i>/<s>/<code>/<a>/<u>/<mark>`, (b) render plain text and let the inline toolbar produce structured spans instead of HTML strings, or (c) move to a TipTap/ProseMirror-style schema so user input is never raw HTML. Same fix should cover block titles, page titles, and synced-block content (B-2504).

### I-2501 — Render synced-source `content` field (medium, open)
- See B-2504. Either treat synced-source like a normal block (render its inline `content`) or drop the field at the data layer. Today it's silently dropped on render, which surprises authors who type into a synced-block from another mirror.

### I-2502 — Real markdown rendering in AI assistant (`<ul>`, `<ol>`, `_em_`, fenced code, headings) (medium, open)
- See B-2505 / B-2506. Replace the regex-based pretty-printer with `marked` or `markdown-it` (each ~30 KB) so `- bullets`, `1. numbered`, `_underscore italic_`, headings, blockquotes, and fenced code render structurally. Today only `**bold**`, `*italic*`, `[link](url)` and one prompt-gated `<pre>` are wired.

### I-2503 — Cross-tab realtime sync via storage event subscription (medium, open)
- See B-2507. Zustand's `persist` middleware does not by default rehydrate when another tab writes localStorage. Add `useStore.persist.rehydrate()` inside a `window.addEventListener("storage", e => { if (e.key === STORAGE_KEY) … })` so two tabs of the same workspace stay in sync without reload. This unlocks the "real-time collab simulation" path that's currently broken.

### I-2504 — Wire calendar-event `date` field so events appear on the week/month grid (medium, open)
- See B-2509. All 3 seeded `calendarEvents.*` rows have no `.date` value; the week-view therefore renders 0 chips. Either backfill via seed (`date: today`) or fix the chip-renderer to fall back to `createdAt` when `date` is missing.

### I-2505 — Block drag handles for in-page reordering (medium, open)
- A separate need from sidebar / table / gallery DnD: page blocks themselves have `plus-<id>` and `block-content-<id>` wrappers but no drag handle. Notion's hover-handle on each block is the single most-used in-page interaction; add `drag-handle-<blockId>` + reorder helpers wired to `pages[].blocks` array order.

### I-2506 — Inline-format toolbar Bold/Italic etc. need to actually mutate selection (high, open)
- See B-2513. The toolbar shows up at the right position but `ib-bold` click does nothing — the selection is presumably lost when the button gains focus. Use `mousedown` instead of `click` (so the selection isn't blurred) and update the block's content (likely calling `document.execCommand("bold")` or, better, directly mutating block-content with a span wrapper). Without this, the whole feature added in commit 80e6fc6 is decorative.

### I-2507 — Empty-state UX for un-configured blocks (image / video / table / button / ToC / breadcrumb / code-no-lang) (low, open)
- See B-2515. On `pg_edge_export`, 7 of 9 blocks render as blank rows. Each should display a placeholder ("Upload image", "Embed video URL", "Add table data") and an action button that opens the relevant config UI, so authors can complete the block instead of being faced with an invisible row.

### I-2508 — Surface the link-was-disabled state in AI assistant output (low, open)
- See B-2517. When the AI markdown link parser rewrites `javascript:` to `#`, render with a tooltip/strike-through so users notice their malformed/unsafe link was neutered. Also strip the trailing `)` left in the body.

### I-2509 — Public form: validate select fills against option IDs (low, open)
- See B-2514. Today only the form's `<option value="o1">Red</option>` IDs are accepted. Either accept name-based values on submit (`db.properties[i].options.find(o => o.name === v)?.id`) or render the option `value` attribute with the human name. Mostly affects automation / API form-fillers, not real users.

### I-2510 — Persisted-store key per workspace (low, open)
- See B-2522. The whole `workspaces` map is stored under one user key. With many workspaces (Notion-scale) this single blob grows unbounded. Consider sharding by workspaceId so switching workspaces only loads the relevant subtree.

### I-2511 — Settings: add `settings-workspace`, `settings-profile`, `settings-billing`, `settings-language` testids (low, open)
- See B-2516. Settings page currently exposes only `settings-signout`, `settings-darkmode`, `settings-export`. Add canonical sub-section testids for E2E coverage as those screens land.



## 2026-05-13 01:10 — Test agent batch 27

### I-2600 — Sanitize at paste / `beforeinput` time too, not only at persist (high, open) — security
- See B-2616. The contenteditable accepts raw `<img onerror>` via `execCommand('insertHTML', …)` which fires `onerror` immediately even though `blur()` later clears the content. Add a `paste` and `beforeinput` handler that strips `<script>`, `<img onerror>`, `<svg onload>`, `<iframe>`, etc. before they enter the DOM. Use DOMPurify with the same allowlist as the render-time sanitizer (B-2503 fix).

### I-2601 — Fix `ib-bold` toggle inversion (high, open)
- See B-2606. The current logic treats H1's inherited `font-weight: bold` as "selection is bold" and emits the un-bold branch, producing `<span style="font-weight: normal;">…</span>`. Either (a) check the actual selection's computed `<strong>`/`<b>` ancestor (not just computed style which inherits), or (b) emit `<strong>` always when the user clicks bold and let the toolbar visually reflect state via active classname.

### I-2602 — Wire `ib-link` to a link-popover (medium, open)
- See B-2607. Bold/italic/strike/code/color all work but `ib-link` is a dead button. Open a small popover with a URL input + Apply/Remove buttons; insert `<a href="…" target="_blank" rel="noopener">selected text</a>` after sanitizing the URL (allowlist `https:`, `http:`, `mailto:`, page links).

### I-2603 — Wire `ib-ai` to inline-AI menu (low, open)
- See B-2608. Notion's inline AI offers Improve / Translate / Summarize / Ask. Today the button does nothing — either remove it from the toolbar or wire it up.

### I-2604 — Calendar week-event chips: add `[data-testid="week-event-<eventId>"]`, draggability, and click-to-edit (medium, open)
- See B-2611. Chips currently render but have no DnD, no testid, no click handler. Add a testid per chip, mark `draggable={true}`, fire `onClick` to open the existing event detail / compose popover.

### I-2605 — DB column-header dropdown: sort, filter, hide, duplicate, delete (medium, open)
- See B-2625. Today the header only opens a Rename input. Match Notion's column dropdown: Sort ascending/descending, Filter, Hide column, Duplicate, Insert left/right, Delete.

### I-2606 — DB `db-actions-<id>` ellipsis button needs a real popover (low, open)
- See B-2626. Currently the `⋯` button at the database title is a no-op. Add a popover with Rename DB, Edit schema, Duplicate, Move to trash, Export CSV, etc.

### I-2607 — Cross-tab realtime: subscribe to `storage` event AND re-render active page detail (medium, open — extends I-2503)
- See B-2615. The sidebar already re-renders from storage events (eventually), but the active page detail (title at `data-testid="page-title"` and block list) is stuck. Hook the storage event into `useStore.persist.rehydrate()` rather than relying on a partial subscription.

### I-2608 — Use `<span style="color: …">` instead of deprecated `<font>` (low, open)
- See B-2630. The color tool emits `<font color="#dc2626">…</font>`. Switch to `<span style="color: var(--c-red)">…</span>` or a `text-red-600` class so the HTML is valid and works with dark-mode color tokens.

### I-2609 — Add `aria-label` to icon-only buttons (low, open) — a11y
- See B-2629. 25 buttons have no accessible name. Sweep drag handles, plus buttons, view-tab carets, and the `⋯` overflow buttons; add descriptive labels ("Reorder block", "Add block below", "More options for Title column").

### I-2610 — Empty form view route resolves `/form/<dbId>/<viewId>` cleanly (low, info)
- See B-2627. Confirmed `/form/db_dates_test/v_form` works (renders title/property fields). I-2211's earlier "0 should resolve to first form" need is moot if callers use the real viewId.


## 2026-05-13 12:00 — Test agent batch 28

### I-2700 — Replicate paste sanitization across ALL contenteditable surfaces, not just block content (high, open) — security
- See B-2702. The fix in B-2700 only attached `onPaste` to `[data-testid^="block-content-"]`. The page-title `<h1>` editor still accepts raw HTML via `execCommand('insertHTML',…)` and runs `onerror` immediately. Audit and instrument every contenteditable: page-title, callout content, synced-block source, list-item text, code-block (probably already textarea), table-cell title. Use a single shared `onPaste` helper that calls the existing sanitizer; bind it via a hook or HOC so future contenteditables can't be added without paste protection.

### I-2701 — Surface AI link-stripping with a tooltip/strike + clean up trailing `)` (low, open — extends I-2508)
- See B-2710. The link parser now neuters `javascript:` to `#`, but the result is `<a href="#">click</a>) please` — the orphan `)` looks like a typo and there's no indication to the user that their unsafe link was rewritten. Render as a struck-through link with a tooltip "Unsafe link blocked" and consume the closing paren during parse.

### I-2702 — Slash menu a11y (high for SR users, low overall) (low, open)
- See B-2706. Add `role="menu"` to `[data-testid="slash-menu"]`, `role="menuitem"` to each `slash-*` button, manage `aria-activedescendant` for the keyboard-highlighted item, and label the menu with `aria-label="Insert block"`.

### I-2703 — DB cells: keyboard navigation (Tab / Shift+Tab / arrows) (medium, open)
- See B-2707. Wire `Tab` (next prop), `Shift+Tab` (prev prop), `ArrowDown`/`ArrowUp` (row), `Enter` (commit & move down) on `[data-testid^="cell-"]`. Notion's grid uses keyboard-first editing for power users; today it's mouse-only.

### I-2704 — DB column-header: add Sort / Filter / Hide / Duplicate / Insert (medium, open — refines I-2605)
- See B-2703. Now that the header dropdown exists (Rename + Type + Delete), extend it: Sort ascending, Sort descending, Filter on this column, Hide column, Duplicate column, Insert left, Insert right. Match Notion's column menu order.

### I-2705 — `row-open-<id>` should open a row drawer / sub-page detail (medium, open)
- See B-2708. The button exists with the right testid + aria-label but does nothing. Either implement an inline drawer (à la Notion) or navigate to `/app/p/<rowAsPage>` — the row data already has its own ID.

### I-2706 — Calendar week-event chips: testid + draggable + onClick (medium, open — extends I-2604)
- See B-2709. Add `data-testid="week-event-<eventId>"`, `draggable={true}`, and `onClick={openEventEditor(eventId)}` to each chip. Without these, automation can't reach individual events and users can't reschedule via drag.

### I-2707 — Cmd+K palette: add `role="dialog"` + `aria-modal="true"` + focus-trap (low, open — extends I-2520)
- See B-2713. Palette currently renders as a plain `<div>` with no dialog semantics. Add `role="dialog"`, `aria-modal="true"`, `aria-label="Command palette"`, and trap focus inside while open.


## 2026-05-13 13:00 — Test agent batch 29

### I-2800 — Title `onInput`-side sanitizer to close `execCommand('insertHTML',…)` XSS (critical, open) — security
- See B-2803. The new `onPaste` covers paste-via-clipboard, but ANY caller that mutates the title via `execCommand("insertHTML", …)` or direct `innerHTML =` still executes embedded handlers (e.g. `<img onerror>`). Fix: on `onInput`, walk `titleRef.current.childNodes`, replace each non-text child with `document.createTextNode(child.textContent ?? "")`, then set `setTitle(titleRef.current.innerText)`. Titles are always plain text in the data model, so flattening is safe.

### I-2801 — Shared paste-helper hook for all contenteditables (high, open — replaces I-2700)
- See B-2800/B-2802. Title and block-content now both have manual `onPaste` handlers, but each is hand-rolled. Extract a `useSafePaste()` hook that returns an `onPaste` callback; bind it on title, callout, list-item, code-block, table-cell-title, synced-block source. Future contenteditable additions can't forget to wire sanitization.

### I-2802 — `open-ai-chat-with` listener missing — wire `ib-ai` to the AI panel (high, open)
- See B-2811 / B-2821. Inline toolbar dispatches a `CustomEvent("open-ai-chat-with", {detail: {selected: …}})` on `window`, but nothing subscribes. Either the AI chat panel must register a `useEffect(() => { window.addEventListener("open-ai-chat-with", …) })`, OR the inline toolbar should call a Zustand setter directly (e.g. `useAiStore.getState().openWithSelection(txt)`). Without one of these, the AI button is dead.

### I-2803 — `ib-bold` custom toggle on H1 (medium, open — extends B-2606/B-2714/B-2812)
- See B-2812. `document.execCommand("bold")` inverts because the H1 inherits `font-weight: bold` from `font-bold` Tailwind utility — Chrome thinks the selection is "already bold" and emits a normal-weight wrapper. Detect heading ancestors in `exec("bold")` and instead manually wrap the range in `<strong>` / unwrap if already wrapped, bypassing `execCommand`. Same logic applies if a user adds `font-bold` to any other block.

### I-2804 — DnD plumbing across sidebar / table-rows / gallery-cards / list-rows / calendar-chips / timeline-bars (medium, open — consolidates I-2604, I-2612–I-2614, I-2706)
- See B-2804–B-2809. None of the secondary surfaces have `draggable={true}` + `onDragStart`/`onDragOver`/`onDrop` listeners. A single `useReorder({items, onMove})` hook attached to each list/grid would unblock all of them. Order: sidebar pages (most-requested) → table rows → gallery cards → list rows → calendar chips → timeline bars.

### I-2805 — Timeline bar onClick must open row-detail (medium, open — extends I-2705)
- See B-2808/B-2817. The handler is wired but no-op; route it to the same row-drawer that `row-open-<id>` will eventually open. Bonus: drag horizontally to reschedule (re-uses the DnD hook from I-2804).

### I-2806 — Cross-tab sync via `storage` event + zustand persist subscribe (medium, open — extends I-2615)
- See B-2813. Zustand persist already writes per-user keys to `localStorage`. Add `window.addEventListener("storage", e => { if (e.key?.startsWith("notion-clone:")) zustand.persist.rehydrate(); })` to propagate edits across tabs. Optional: `BroadcastChannel("notion-clone")` for lower-latency updates without round-tripping through localStorage.

### I-2807 — Sidebar chevron icon buttons need `aria-label` (low, open — extends B-2629/B-2815)
- See B-2815. All 25 unlabeled buttons are `[data-testid^="expand-pg_"]` chevrons. Add `aria-label={expanded ? "Collapse page" : "Expand page"}` (or `{page.title}` interpolation for richer SR output).

### I-2808 — Settings page sub-sections (workspace/profile/billing/language/notifications/connections) (medium, open — extends I-2624)
- See B-2814. Three testids in three batches — settings has been frozen. Even an empty stub of `[data-testid="settings-workspace"]` / `[data-testid="settings-profile"]` / `[data-testid="settings-billing"]` / `[data-testid="settings-language"]` would unblock E2E and signal future direction.



## 2026-05-13 ~15:00 — QA agent verification batch

### I-3000 — Label `day-add-YYYY-MM-DD` calendar Plus icons (high, open)
- See B-3023. Bulk-fix all 35 calendar add-cell buttons: `aria-label={\`Add event on \${format(date, 'MMM d, yyyy')}\`}` + `title={...}`. Removes 35 unlabeled buttons from /app/calendar.

### I-3001 — Markdown export should serialize code-block content + skip empty `/`-placeholder blocks (medium, open)
- See B-3017. ``` fenced code block exported with empty body even though the block has language metadata; if `content` is empty, omit the block or render a single-line empty fence. Also the leading `/` from a placeholder block leaked as content — slash-menu trigger blocks (`type:text, content:'/'`) should be excluded from export.

### I-3002 — TrashPage needs defensive coalescing (high, open)
- See B-3022. The fatal "Cannot read properties of undefined (reading 'length')" boots the whole trash route. Wrap rendering of trashed databases in optional chaining: `(db.views ?? []).length`, `(db.rows ?? []).length`, `(db.properties ?? {})`. Currently a single malformed DB record (e.g. one created before the views/rows fields were introduced) makes the entire trash inaccessible.

### I-3003 — `ib-color` inline-toolbar button missing aria-label (low, open)
- See B-3009. Add `aria-label="Text color"` to the `<button>` that renders the "A" glyph (`[data-testid="ib-color"]`). Currently only has `title`. Other ib-* buttons all have aria-label.

### I-3004 — `ib-link-apply` should also bind `onClick` (low, open)
- See B-3026. Mousedown-only binding diverges from typical button affordance. Either ALSO bind onClick (with `e.preventDefault()` to avoid selection loss) OR add a hint test that explains. Real users unaffected; tests are.

### I-3005 — Cmd+K palette block-content snippet group (medium, open)
- See B-3011. Spec calls for two result groups when query matches both a page title and a block text. Currently only Pages group renders; block-text matches surface as a page-only result (TestColor for "orientation"). Add a "Blocks" group beneath Pages with the matching snippet and a click handler that navigates and scrolls to the block.

### I-3006 — Sidebar pages drag-drop reorder (medium, open) — restates I-2804 sidebar slice
- See B-3012. Still no `draggable` attribute on sidebar page rows. Highest-value DnD remaining; covers page hierarchy reorder which is core to the Notion experience.

### I-3007 — Table-row drag-drop reorder (medium, open) — restates I-2804 table slice
- See B-3013. `<tr>` elements need `draggable={true}` + react-dnd or HTML5 DnD handlers + a visible drop indicator between rows.

### I-3008 — Calendar event chip drop targets (medium, open) — restates I-2804 calendar slice
- See B-3014. Chips already have `draggable="true"`. Need to add `onDragOver={(e)=>e.preventDefault()}` and `onDrop={(e)=>rescheduleRow(chipId, day)}` to each `cal-add-*` cell. Smallest delta of the three.


## 2026-05-13 ~17:00 — QA agent verification batch

### I-3100 — Slash menu filter should index synonyms / item descriptions (medium, open)
- See B-3109. Typing "database" only matches `slash-db-table` even though `slash-db-board`, `slash-db-gallery`, `slash-db-list`, `slash-db-calendar`, `slash-db-timeline` are conceptually databases. Index the description text plus an aliases array (e.g. `aliases: ['database', 'data', 'db']`) into the filter function.

### I-3101 — Inline-color "default" swatch should unwrap colored span (medium, open)
- See B-3111. Currently `ib-color-default` leaves the wrapping `<span data-color="1" style="color:rgb(220,38,38)">` intact. Fix: detect default selection → replace the span with its text contents (`span.replaceWith(...span.childNodes)` or `document.execCommand('removeFormat')`-style cleanup limited to color spans only).

### I-3102 — AI chat composer should be a multi-line textarea / contenteditable (high, open)
- See B-3113/B-3114. Replace `<input type="text">` with a `<textarea>` (or contenteditable div) that supports Enter for newline + Cmd/Ctrl+Enter to send. Newlines should be preserved in the user bubble (whitespace-pre-wrap already styled). Markdown rendering in user bubble is a nice-to-have.

### I-3103 — Add "Page history" / version history UI (medium, open)
- See B-3116. `page.history: []` field exists on every page but no UI to view/restore. Add menu item under page-options that opens a side panel listing snapshots with timestamps and a "Restore" button per entry.

### I-3104 — Relation property: auto-create symmetric back-relation property (medium, open)
- See B-3117. When user creates `B→C` relation on db_b, optionally auto-add a `C→B` (or `Related to B`) property on db_c that mirrors the link. Either always on, or a checkbox "Show on related database" in the relation property options (Notion mirrors this exactly).

### I-3105 — Wire `row-open-*` to a row detail side-panel/drawer (high, open)
- See B-3118. Buttons exist (`row-open-r_dt1` etc.) but click is no-op. Implement a side-drawer that displays all row properties — covers the use case of editing many properties when columns overflow, hidden, or rolled up.

### I-3106 — Markdown export: serialize tables, blockquotes, and code-fence body cleanly (low, open)
- Observed during B-3113 testing: AI assistant tries to digest user's markdown but loses code-fence content ("const x" became " x = "a";"). The same gap may exist in the markdown export from page-options. Audit code-fence and blockquote serializers for whitespace/parsing accuracy.

### I-3107 — Better "empty formula" placeholder (low, open)
- See B-3107. When a formula property has empty expression, cell shows "#ERR: Unexpected end" which leaks parser internals. Render "—" or "(set formula)" instead, and accept both `formula.expression` and `formula.formula` as input fields.

### I-3108 — Memoize Block list rendering to reduce sibling re-renders (medium, open)
- See B-3121. A single keystroke triggers 50 mutations across the page body. Likely the BlockList component re-renders all children when one block mutates because the selector returns a new array reference. Wrap individual Block components in React.memo + use shallowEqual selectors per block.

### I-3200 — Calendar page must gracefully handle missing or non-array `db.properties` (high, open)
- See B-3205. Add an `Array.isArray` guard or normalise `properties` to an array on read so the calendar route doesn't crash when a database schema is between migrations.

### I-3201 — Command palette filter should coalesce missing titles (high, open)
- See B-3206. In `CommandPalette.tsx:53`, wrap the title/name access in a nullish-coalescing default so an undefined title doesn't tank the palette. Also worth pre-filtering items that have no usable label rather than letting them flow to filter logic.

### I-3202 — Nested reply threading (medium, open)
- See B-3207. Allow comment replies to receive their own replies, with visual indentation per level (and a max depth like 5 to avoid runaway nesting). Reuse the same `reply-input-cmt_<id>` / `reply-submit-cmt_<id>` testid pattern for each nested level.

### I-3203 — Sidebar pages should be draggable for reordering (medium, open)
- See B-3209 (drag sweep). Block handles are draggable, but sidebar page tiles have `draggable=false`. Notion lets you drag sidebar pages to reorder, nest under another page, or move to a different teamspace. Consider adding HTML5 drag handlers to page tiles.



### I-3204 — Use textarea for AI input + auto-grow (high, open)
- See B-3210. Replace `<input type="text" data-testid="ai-input">` with `<textarea>` (or contenteditable) so multiline prompts survive. Map Enter→send, Shift+Enter→newline; auto-grow height to ~6 rows.

### I-3205 — Rollup property: open configuration UI on type-change (high, open)
- See B-3212. After flipping a property to rollup, immediately open a popover that requires the user to pick (a) source relation property (not the rollup itself!), (b) target property of the related DB, (c) aggregation function. Without this, rollup state lands invalid and silent.

### I-3206 — Calendar event chips: enable drag-reschedule (medium, open)
- See B-3213. Set `draggable=true` on the chip; on dragend over a `day-YYYY-MM-DD` cell, update `event.date`. Add aria-grabbed/aria-dropeffect for a11y.

### I-3207 — Form view: enforce required title on submit (medium, open)
- See B-3214. Add an `isRequired` flag to the title property (or all required properties); disable `form-submit-*` while any required is empty; show inline `[role="alert"]` below the field.

### I-3208 — Mobile drawer pattern for sidebar (low, open)
- See B-3216. On viewports < md, render a backdrop element behind the open sidebar and dismiss the sidebar on (a) backdrop tap, (b) link navigation, (c) Escape key.

### I-3209 — Add aria-labels to AI panel icon buttons (low, open)
- See B-3217. `close-ai` → "Close AI panel"; `ai-send` → "Send message". Apply to other icon-only buttons in the panel as well.

### I-3210 — Render row cells for ALL property types defined on a DB (high, open)
- See B-3218. Many property types (formula, rollup, files, created-time, created-by, last-edited-time, last-edited-by, verification, unique-id) define a header but no row cell. Add cell renderers (read-only for system metadata) so users can see computed values.

### I-3211 — Trash row count should reflect actual stored rows (medium, open)
- See B-3220. The trash view's `0 rows` literal should be replaced with `Object.values(rows).filter(r => r.databaseId === db.id).length`. Either the iterator is filtering by an outdated index or it's reading a soft-deleted index that's never set.

### I-3212 — Restore: clear `trashedAt` and any soft-delete metadata (low, open)
- See B-3221. Restoring should be the symmetric inverse of trashing — clear `trashedAt`, `trashedBy`, etc.


### I-3400 — Defensive guards in view-menu render path (high, open)
- See B-3400. The crash "Cannot read properties of undefined (reading 'includes')" suggests an array-typed view field (filters?, hiddenProperties?, sortBy?) is undefined for some views. Add `?.includes(...)` or default to `[]` at the menu code path and in migration / seed defaults.
- Bonus: wrap the view-options popover in an ErrorBoundary so a single bad view doesn't blow up the page.

### I-3401 — Numbered-list block should render semantic `<ol><li>` (low, open)
- The markdown shortcut `1. ` correctly converts the block to a numbered list (data-placeholder="List"), but the rendered output is a div, not `<ol><li>`. Hurts screen reader semantics and copy-paste fidelity to outside surfaces.

### I-3402 — Expand block-handle menu (high, open)
- See B-3403. Add menu items: Duplicate, Turn into, Copy link, Move to, Comment, Color. Notion parity. Keyboard shortcut hints visible (e.g. Duplicate ⌘D).

### I-3403 — Comment edit + delete + reply (high, open)
- See B-3404. Each comment needs `comment-edit-<id>` and `comment-delete-<id>` testids and the corresponding actions. Optional: reply threads with `comment-reply-<id>`.

### I-3404 — Cmd+/ keybinding for slash menu (medium, open)
- See B-3405. Bind global keydown listener: if Cmd+/ in a contenteditable, open slash menu at caret. Compatible with current `/` character path.

### I-3405 — Cmd+] / Cmd+[ / Tab / Shift+Tab indentation (high, open)
- See B-3406. Indent/outdent the current block, nesting it under the previous sibling.

### I-3406 — Cmd+Shift+H toggles heading 1 ↔ paragraph (medium, open)
- See B-3407. Pressing Cmd+Shift+H on a paragraph promotes to H1; pressing again demotes back to paragraph. Useful for keyboard-only workflow.

### I-3407 — Expose filter/sort/group via dedicated buttons in DB toolbar (high, open)
- Currently the entry to filter/sort/group is the view-menu (which crashes — B-3400). Even when fixed, splitting these into top-level `[data-testid="filter-btn"]`, `[data-testid="sort-btn"]`, `[data-testid="group-btn"]` matches Notion's UI and avoids hiding the core DB controls behind a single overflow.

### I-3408 — Add `ib-underline` to inline toolbar + Cmd+U binding (low, open)
- See B-3412. Underline is conventional (Notion has it). Add to toolbar between italic and strike, wire Cmd+U.

### I-3409 — Add ErrorBoundary around the view-options popover (high, open)
- See B-3400 / B-3417. The crash escapes to the global error boundary, kicking the user out of the entire page. Wrap the view-menu render with a local ErrorBoundary so a malformed view degrades to a "View options unavailable" message instead of blowing up the page.

### I-3410 — Stress-test Cmd+K at 1k pages (medium, open)
- Workspaces with many pages need to keep search latency low. Add an automated benchmark that seeds 1k pages and measures filter latency under a target (e.g. ≤80 ms). Without this, we can't catch a regression that only manifests at scale.

### I-3500 — Add Lock page / Customize page / Page history to page-options menu (medium, open)
- See B-3505. Page-options currently has 11 items; Notion ships Lock, Customize, Page history, Connect-to integrations. Filling these gaps would close the page-actions parity gap.

### I-3501 — Inline-table prop-header click should sort (high, open)
- See B-3507. Currently `prop-header-*` opens the rename/delete/type menu. Single-click should sort asc, second click desc, third click clear. Move the rename menu behind an explicit overflow icon inside the header cell. Notion's UX baseline.

### I-3502 — Markdown export must render embedded databases as tables (high, open)
- See B-3510. Replace `<!-- (embedded database) -->` with a header + rows table. Honour the visible view's `propertyOrder` and `hiddenProperties`.

### I-3503 — Public form: enforce required fields (high, open)
- See B-3515 / B-3214. Title should always be required; other props can be marked required via the form view config. Add `required` attribute + visible error state under each invalid field. Block submission until valid.

### I-3504 — Public form inputs need testids + `name` attrs (low, open)
- See B-3515. Currently each `<input>` has no `data-testid`, no `name`, and no `placeholder`. Hard to write QA scripts and degrades a11y (screen readers read default placeholder text). Add `data-testid={\`form-field-${propId}\`}` and `name={propId}`.

### I-3505 — Real cross-tab sync via storage event (high, open)
- See B-3516. Wire a `window.addEventListener('storage', e => useStore.persist.rehydrate())` listener (Zustand-persist supports this out-of-the-box) so that edits made in another tab propagate immediately. Otherwise users see stale state until full reload — and even then some seed-derived pages don't appear.

### I-3506 — Calendar event chip: testid + draggable + drop handlers (high, open)
- See B-3513 / B-3514. The chip should be `<div draggable="true" data-testid={\`cal-event-${id}\`} onDragStart={...}>...</div>` and `day-YYYY-MM-DD` should handle `onDrop` to update the event date. Notion / Google Calendar baseline.

### I-3507 — Trash restore: queue updates serially to prevent dropped restores (high, open)
- See B-3519. Likely each restore click reads a stale `useStore` snapshot and writes back, overwriting siblings' restorations. Use the functional setter form (`set(s => ({ pages: { ...s.pages, [id]: { ...s.pages[id], isInTrash: false } } }))`) or batch in a single `set` call within the restore handler.

### I-3508 — `cal-event-*` testids needed for any drag-related QA (low, open)
- See B-3514. Even before drag works, exposing a stable testid for each rendered event chip unblocks every other calendar test.

### I-3509 — Markdown export: drop empty image/video/file/equation placeholders (low, open)
- See B-3512. Current export leaks `<!-- (empty image block) -->` etc. Either skip blocks with no payload or include block IDs for traceability.

### I-3510 — Synced-block reference markdown export should resolve source on same page (low, open)
- See B-3511. The synced reference renders correctly at runtime (B-3409) but the markdown exporter prints `<!-- synced reference: no source -->`. Match the runtime resolution.

### I-3600 — Markdown exporter must emit bookmark blocks (medium, open)
- See B-3604. Bookmark block (`type: 'bookmark', content: 'https://...'`) is currently silently DROPPED from the markdown export, while every other block type renders something (even if just a comment placeholder). Emit at minimum `[<title or url>](<url>)` or a bare URL on its own line. The exporter has cases for 17 of 18 types — bookmark looks like an oversight.

### I-3601 — Markdown exporter: skip empty equation blocks (or emit a hint comment) (low, open)
- See B-3605. Today an equation block with empty expression renders `$$\n\n$$`, which most markdown renderers treat as an empty display-math block and warn. Either skip entirely (matches I-3509 idea) OR emit `<!-- (empty equation block) -->` for parity.

### I-3602 — Standalone `database` block: implement renderer (high, open)
- See B-3606. The block type `database` ("Unsupported block: database" today) needs a renderer. Either (a) decide it's not a supported standalone block and reject the type in slash menu / DnD, or (b) implement an inline-DB renderer that takes `content` as a `dbId` and renders the database's first non-form view.

### I-3603 — Public form: select / multi-select field value should persist on submit (high, open)
- See B-3603. Select prop chosen on the public form is currently DROPPED from the saved row (only title + number persisted). The form needs a real onChange wiring for `<select>` (and other non-input controls) into the form's value state.

### I-3604 — Comment edit + delete UI (medium, open)
- See B-3610. Each rendered comment has `resolve-<cmtId>` + `reply-<cmtId>` but no `edit-<cmtId>` / `delete-<cmtId>`. Add an overflow menu on hover with at least Edit (re-open the textarea pre-filled) and Delete (remove the comment, prompt-free with toast undo).

### I-3605 — Sidebar drag-to-reorder + drag-to-reparent (medium, open)
- See B-3616. Sidebar page rows have no `draggable` / drag handlers. Notion's core UX includes dragging pages to reorder siblings and to nest under another page. Today the only path is `page-options → Move to teamspace`. Add HTML5 `draggable=true` + onDragStart/onDragOver/onDrop on each row.

### I-3606 — Inline-DB view also needs a sort-on-header click (high, open — depends on I-3501)
- See I-3501 / B-3507. Coupled with B-3606 fix: once standalone DB renders, ensure header click sorts (single-click asc, double desc, triple clear) and the rename menu moves behind a `…` overflow.

### I-3607 — DB filter operator labels: rename "is" to "equals" for number/date columns (low, open)
- See B-3625. The user-facing label "is" is fine for select/title but for number/date columns Notion convention is "equals". Switch the label based on column type to reduce user surprise. Also consider adding "starts with" / "ends with" for text/title columns to round out the parity gap.

### I-3700 — Add `delete-<cmtId>` / `edit-<cmtId>` testids on comment items (medium, open)
- See B-3707. Delete button is now rendered next to Resolve/Reply, but it has no `data-testid` and can only be targeted by text. Also no Edit affordance. Add `delete-<cmtId>` (red destructive) and `edit-<cmtId>` (textarea re-open in place) — finishes B-3404.

### I-3701 — Bookmark store-field normalization (low, open)
- See B-3702. Bookmark uses `url`, most other blocks use `content`. Either accept both at the exporter and renderer (resilient) or normalize on `url` everywhere (strict). Document the chosen contract in `src/lib/types.ts`.

### I-3702 — Hidden-column unhide UX gap (medium, open)
- See B-3704. After `prop-hide-<id>` the header is removed and the only path to unhide is buried in `view-menu → PROPERTIES → checkbox`. Add a "+N hidden" chip beside the last column header (Notion style) with click-to-toggle, OR keep the header visible-but-greyed when hidden, OR expose `prop-show-<id>` for explicit re-show. Also missing testids on the view-menu property checkboxes.

### I-3703 — Database row drag-reorder (medium, open)
- See B-3711. Rows in `/app/db/<id>` (and inline DB pages) have no drag handle and no `draggable` flag. Notion supports row drag to reorder when no sort is applied. Add `row-handle-<rowId>` with HTML5 drag listeners and a stable `rowOrder` field on the view.

### I-3704 — Prop-header click cycle: asc→desc→clear (low, open)
- See B-3715. Now that B-3624 fix exposes asc/desc/clear as explicit menu items, a power-user shortcut would be: clicking `prop-header-<id>` directly cycles the sort. Today the header click only opens the menu; users still have to click the asc/desc/clear menu item.

### I-3705 — Remove `view.previewMode` if unused, or wire it (low, open)
- See B-3716. The form view schema has a `previewMode` boolean that is writable but has no runtime effect. Either delete from `src/lib/types.ts` (and migration to strip from existing seeds), or wire it to a real read-only/preview mode on `/form/<db>/<view>`.


### I-3800 — Public form: wrap inputs in `<form onSubmit>` (high, open)
- See B-3815 / B-3817. The submit button is `type=submit` outside any `<form>`, so when the click-handler regresses (B-3815) there is no fallback. Wrap the field stack in `<form onSubmit={handleSubmit}>` with `e.preventDefault()`. This also enables Enter-to-submit on text fields and screen-reader form semantics.

### I-3801 — Public form: persist a row again (high, open — regression P0)
- See B-3815. The public form click handler shows "Thanks!" but no row is created in the underlying database. All 5 DB views show count 5 unchanged after a submission. Either the create-row mutation reference is null, the form state is not bound to a controlled state, or the submission writes to a different db. Restore B-3603-era behavior at minimum (title + select), ideally full payload (title + select + number + date).

### I-3802 — Add `show resolved` toggle in comments pane (medium, open)
- See B-3803 / B-3813. Once `resolve-<cmtId>` is clicked the comment is permanently hidden from the UI; user has no way to re-open or edit a resolved comment. Add a footer affordance like `toggle-resolved` that re-displays resolved comments with a "Reopen" button on each.

### I-3803 — Public form inputs need `data-testid` and `name` (low, open — re-confirms I-3504)
- See B-3816. Title/select/number/date inputs all have empty `name=""` and no `data-testid`. The submit button alone has `public-form-submit`. Add `form-field-<propId>` testid + `name={propId}` for both QA and accessibility (screen readers will get the right label binding).

### I-3804 — `prop-sort-clear-<id>` only renders for sorted prop (low, doc)
- See B-3820. Document that the testid is conditional in the prop-header menu. Automation should `click prop-header-<id>` first, then check whether `prop-sort-clear-<id>` exists before asserting it can be clicked.

## 2026-05-13 — QA agent iteration I-3900

### I-3900 — Public form: required-field label needs visual indicator (low, open)
- See B-3903. When a property has `required: true`, the rendered `<label>` text is just "Name" (no `*` or "Required" hint). Users only learn the field is required after a failed submit. Add a trailing red `*` or muted "(required)" suffix when `prop.required` is true.

### I-3901 — Public form: tab through inputs lacks accessible labels (low, open)
- Inputs have no `name` attribute, no `id`, no `aria-labelledby`. The label/input association is purely visual (DOM order). Screen readers will read fields as "blank" with no field name. Wrap inputs inside `<label>` or pair `<label htmlFor>` + `<input id>` + name to fix.

### I-3902 — Markdown export: bookmark should use bookmarkTitle / description (medium, open)
- See B-3914. Today the exporter emits `[🔖 <url>](<url>)`. Even though the data model carries `bookmarkTitle` and `bookmarkDescription`, neither appears in output. Suggested format:
  - If title: `[**<title>**](<url>) — <description>` (or just `[<title>](<url>)`)
  - Else fall back to URL.

### I-3903 — Markdown export: subpage should at least emit a heading + link (medium, open)
- See B-3915. Currently `<!-- subpage -->` is a placeholder. Surface the child's title and a relative link (`### [Child page 3914](child-page-3914.md)`), and consider an "Include subpages" toggle that recursively inlines child blocks.

### I-3904 — Comments: when resolved, the resolve button needs to flip to "Re-open" and actually unresolve (medium, open — dup of I-204 but with a concrete bug behind it)
- See B-3906. The fix is twofold: (1) read `resolved` and render the alternate label/icon when true; (2) the click handler must call the unresolve mutation (toggle, not set). Right now the click on a resolved comment is a no-op.


## 2026-05-13 — QA agent iteration I-4000

### I-4000 — Calendar day cells need `data-day` + drop handlers (medium, open)
- See B-4010 / B-4011. Calendar event chips already have `draggable=true` and `cal-event-<rowId>` testid. The receiving day cells are a 7-col grid of unlabeled `<div>`s. Add `data-day="YYYY-MM-DD"` and `data-testid="cal-day-<date>"` to each cell, then wire `onDragOver` (preventDefault) + `onDrop` to extract row id and call `setRowValue(rowId, dateProp, dropDate)`. Closes B-2907.

### I-4001 — Mobile drawer / hamburger toggle (high, open)
- See B-4014. Below md breakpoint the sidebar is `max-md:absolute` left:0 z-30, overlaying main content with no way to dismiss it from outside (`close-sidebar` only visible inside the sidebar). Add a `mobile-sidebar-toggle` button in the page header that sets a `sidebarOpen` state, slide-in/out the aside via translate-x, plus a backdrop click-to-close. Critical for mobile usability.

### I-4002 — View duplicate action (medium, open)
- See B-4016. View menu only has Rename / Delete / Add property. Add a `view-duplicate-<id>` item that calls `duplicateView(databaseId, sourceViewId)` to deep-clone name (with " copy" suffix), type, sorts, filters, visibility, group, calendar/board config, etc. Notion uses this constantly for branching off "All – starred" from "All".

### I-4003 — Sidebar page drag-and-drop (high, open)
- See B-4017. None of the sidebar tree nodes is draggable. Add `draggable=true` on the page row, an `onDragStart` that sets `application/x-page-id`, and on each candidate parent (page row + teamspace header) an `onDragOver`/`onDrop` handler that calls `movePage(sourcePageId, newParentId)`. Add visual indicators: drop-above line, drop-into highlight. Closes B-2908 / B-3712 / B-3616.

### I-4004 — Comment action buttons aria-label fallback (low, open)
- See B-4020. `resolve-/reply-/comment-edit-/comment-delete-` are text buttons today. Add `aria-label` so the buttons remain accessible if/when reduced to icons on narrow viewports. Cheap defensive improvement.

### I-4005 — Public form rendered required marker (low, open — dup of I-3900)
- Confirmed again on QA Form DB: title input is required (server-side validated, "Name is required." error fires) but the `<label>` text is just "Name". Add a red `*` or "(required)" suffix when `prop.required` is true so users see it before submitting.

## 2026-05-13 — QA agent iteration I-4100

### I-4100 — Public form: Enter-in-text-input via synthetic keydown does not submit (low, open)
- See B-4105. The form has `onSubmit` + `<button type="submit">`, so browsers auto-submit on Enter for real users. But QA automation that dispatches a synthetic `KeyboardEvent({key:"Enter"})` on the title input does NOT submit (no row created). This is HTML-spec correct (synthetic events skip native form-submit), but for testability, consider adding an explicit `onKeyDown` on each form input that calls `form.requestSubmit()` when key==="Enter" + the input is not a textarea. Same call site as B-3817 fix.

### I-4101 — DB trash needs `trashedAt` stamp (medium, open)
- See B-4108. `trashDatabase(dbId)` sets `isInTrash:true` but `trashedAt` remains null. Page trash sets both. Mirror the page logic in the database action: `db.trashedAt = Date.now()`. Restore can keep `trashedAt: null` (or delete the key). Without `trashedAt`, the trash UI cannot sort DBs by trash date or apply expiry.

### I-4102 — Markdown export: sub-page block still empty placeholder (medium, open — dup of I-3903)
- See B-4110. After the "richer bookmark export + pages threaded" commit, bookmark export now uses title/description. Sub-page emit is still empty. Suggested format: `### [<page.title>](<page.slug-or-id>.md)` per child block, optionally with an "Include subpages inline" toggle to recursively inline child blocks.

### I-4103 — Sidebar page drag affordance (low, open)
- See B-4112. Pages have `draggable=true` but `cursor: auto`. Add `cursor: grab` on hover and `cursor: grabbing` while dragging, plus a faint drag-grip icon (⋮⋮) that fades in on hover (mirroring `row-handle` behaviour). Closes discoverability gap.

### I-4104 — Row-handle visibility on touch / no-hover devices (low, open)
- See B-4112. `row-handle-<id>` is `opacity:0 group-hover:opacity-100`. Touch devices never fire hover, so the grip is permanently invisible — drag-to-reorder on tablet/phone is functionally broken even though the listeners exist. Show the grip permanently when `(hover: none)` matches, OR show it after a long-press.

### I-4105 — Cmd+J for AI panel + visible shortcut hint (low, open)
- See B-4119. Add a global `keydown` listener: if `(metaKey||ctrlKey) && key==='j'` → toggle AI panel. Also add `title="Ask AI (⌘J)"` to `sidebar-ai` button so the affordance is discoverable. Matches Notion's binding.

### I-4106 — Palette empty-state testid (low, open)
- See B-4117. The "No results" message renders but has no `data-testid`. Add `data-testid="cmd-empty"` so automation can assert the empty branch without scraping innerText.


## 2026-05-13 — QA agent iteration I-4200

### I-4200 — Cmd+K block-match should be token-based (medium, open)
- See B-4204. Today the palette runs `block.content.toLowerCase().includes(query.toLowerCase())`, so "next plan" misses the same block "plan the next quarter…" that "plan next" doesn't even try. Switch to a word-bag matcher: split query on whitespace, require all tokens present (any order, any position) in the lowercased content. Boost score if tokens appear in order or adjacent. Keeps single-word UX, fixes multi-word UX, matches Notion's behaviour.

### I-4201 — Persist `showResolvedComments` toggle (medium, open)
- See B-4206. The toggle state is local component state and dies on reload. Lift it into the `ui` slice of the zustand store (alongside `sidebarOpen`, `darkMode`) and include it in the persist whitelist so the comment panel remembers its mode per user. Two-line change in the slice + one in the toggle's onChange.

### I-4202 — Markdown export: render column children under each column marker (medium, open)
- See B-4207. The column block currently emits `<!-- column -->` markers with no child content. Update the markdown serializer to:
  - For each column container, iterate its child blocks and emit them sequentially under that column's marker.
  - Optionally use a real Markdown construct (e.g. tables, or a horizontal rule between columns) so the export is readable.
- Lossy export today; users lose all in-column content when sharing.

### I-4203 — Day-add cell should not double as drop target (low, open)
- See B-4202. The `[data-testid="day-add-<date>"]` "+" sub-cell currently inherits its parent day-cell's dragover/drop handlers, so it transparently accepts event drops *and* shows a "+ add event" affordance. Decide on one role per cell: either stopPropagation on the day-add cell so drops bubble to the day cell only when not on the +, or stop accepting drops on day-add entirely. Cleaner UX.

### I-4204 — Database view-tab right-click → options menu (low, open)
- See B-4211. Right-click on a `view-menu-<viewId>` tab opens the browser native menu today. Notion convention: right-click is a synonym for clicking the ⋯ icon. Bind `onContextMenu` on view tabs to `preventDefault()` + open the same Rename / Duplicate / Delete popover. Cheap discoverability win.

### I-4205 — Cmd+/ shortcut to open block-action menu (medium, open — dup of B-3405)
- See B-4212. Notion's Cmd+/ ("turn into / color / comment") is still unimplemented. Bind a global keydown for `(meta||ctrl)+/` that, when caret is in a contenteditable inside the editor, opens the block-options popover for the focused block. Lowest-cost path: re-use the existing block ⋯ menu wired to the hover handle.

### I-4206 — Comment row buttons should be `type="button"` (low, open)
- See B-4213. All four comment-row buttons (Edit / Delete / Reply / Resolve) default to `type=submit`. Harmless today (no form ancestor), but a refactor that puts these in a form would silently fire `formdata`/submit. Add explicit `type="button"`. One-line per button.

### I-4207 — Cmd+K palette: show "View more" or raise cap (low, open)
- See B-4214. Today the palette caps block-match results at ~5 even when 10+ match. Either expose a constant + add a "View more results" expander, or paginate / virtualize the result list and remove the cap. Performance for 100+ matches isn't a concern (~11ms paint).

### I-4208 — Comment composer keyboard submit (medium, open)
- See B-4216. Add `onKeyDown` to `[data-testid="comment-input"]`:
  - On Enter without Shift: `e.preventDefault()` + call `postComment(value)`.
  - On Shift+Enter: allow native newline.
  - Optionally Cmd+Enter as an alternative submit (matches Slack thread replies).
- Update placeholder copy to "Add a comment… (Enter to post, Shift+Enter for newline)" so users discover the shortcut.

### I-4209 — Sub-page route should expose page-actions menu (low, open)
- See B-4217. `pg_qa_b4002_child_95kg` (and likely other sub-page-routed pages) render a layout without `[data-testid="page-actions"]`, so export / favorite / move / trash are unreachable from inside the sub-page. Either render the same page-actions ⋯ in the sub-page header, or document that sub-pages must be acted on from the parent.


## 2026-05-13 — QA agent iteration I-4300

### I-4300 — Public form: hidden-by-rule title should fall back to a derived label (medium, open)
- See B-4303. When `conditionalLogic` hides the title property, submit() rightly skips the "title required" check — but the resulting row has an empty title. The DB then shows it as "Untitled", which collides with hand-created Untitled rows. Suggestions:
  - On submit with hidden title, auto-derive a title from the first non-empty short field (number / select / date / first text answer).
  - Or, on the form-builder side, require that at least one visible property be marked as `titleSubstitute` whenever a rule hides the title.
- Keeps the row addressable in the DB.

### I-4301 — Calendar day-cell overflow chip handling (low, open)
- See B-4302. Dropping a new event onto a day with 3 chips visible pushes the dropped event in but bumps the last visible chip behind a `+N` indicator. A user dropping a chip expects to *see* it land. Either:
  - Auto-expand the dropped chip's day cell to show 4 (one-time effect, collapses on next click).
  - Surface a brief flash/scroll-into-view on the dropped chip even when it lands behind the cap.
  - Or raise the visible cap to 4 with sensible vertical density.

### I-4302 — Add `cmd-empty` and `trash-empty` testids (low, open)
- See B-4117, B-4310. Both empty states render plain text ("No results", "Trash is empty.") without a dedicated `data-testid`. Automation has to scrape innerText. Add `data-testid="cmd-empty"` to the palette empty branch and `data-testid="trash-empty"` to TrashPage's empty branch. Cheap.

### I-4303 — Cmd+P palette alias documented in shortcuts panel (low, open)
- See B-4304. Cmd+P opens the palette (Notion-compatible), but the sidebar Search button only advertises ⌘K. Either add a small "⌘K / ⌘P" hint, or include Cmd+P in the help panel / shortcuts list. Discoverability win.

### I-4304 — ib-ai prompt should embed the page context (low, open)
- See B-4314. The pre-filled prompt is `Ask AI about: "<selection>"` — useful for short selections but loses *which page* the selection came from. Optionally include `(Page: <title>)` in the quoted prompt so the AI demo response can cite the source without the user retyping the context.

## 2026-05-13 — QA agent iteration I-4400

### I-4400 — Move-to-teamspace should preserve sub-page parent within the same workspace (medium, open)
- See B-4405. Moving `pg_mp2srzedee1ec1wa` from Private to Engineering nulled its `parentId`. If a user just wanted to reclassify the teamspace (and parent page is also in the same workspace), the sudden promotion to a root page is surprising. Either:
  - When parent page would be visible in the destination teamspace too, keep `parentId` and recursively update `teamspaceId` on descendants.
  - Or, prompt with "Move this page to <teamspace>? Children will follow." before nulling parentId.
- Today's behaviour is fine for cross-teamspace reparenting but feels destructive within-workspace.

### I-4401 — `move-to-teamspace` not exposed in sidebar `page-menu-*` (low, open)
- See B-4405. The 7-item sidebar context menu (favorite / duplicate / new-sub / copy-link / trash) is missing the `move-to-ts_*` actions that the in-page `page-options` menu surfaces. Adding a "Move to teamspace ▸" sub-menu in the sidebar would save a navigation hop for power users.

### I-4402 — Block-jump highlight should survive navigation (low, open)
- See B-4412. The 1500ms ring flash on the target block is invisible to users who immediately scroll or switch routes. Persist the target block id in the URL hash (`/app/p/<id>#blk_<id>`) and re-apply the ring on mount; that way back/forward and reload preserve the visual landing cue.

### I-4403 — Inline DB filter UI lacks visible AND/OR toggle (low, open)
- See B-4407. Filters combine with implicit AND (`every()`). Notion exposes "Where: and / or" between rules. Today there's no way to ask for OR. Add a small operator pill between filter rows and extend `applyFilters` with a top-level operator field on the view.

### I-4404 — Calendar same-day drop should short-circuit before calling moveCalendarEvent (low, open)
- See B-4409. Same-day drag is a no-op but still goes through the store mutation in `moveCalendarEvent` (rebuilds the calendarEvents map). Skipping when `keyForDate(new Date(e.start)) === dayKey` avoids the React rerender churn and any animations. Tiny but free.

## 2026-05-13 — QA agent iteration I-4600

### I-4600 — Orphan pages need a sidebar home (medium, open)
- See B-4604. A page with `teamspaceId: null` (and no parent) is unreachable through the sidebar — it shows up only via Cmd+K or direct URL. Two acceptable fixes: (a) add an "Other" / "Orphaned" section at the bottom of the sidebar that lists pages whose `teamspaceId` doesn't match any known teamspace; (b) tighten write paths so every page gets a teamspaceId at creation time (default to Private), and log/repair any orphans on hydration. Without one of these, programmatic page creation can silently produce unfindable pages.

### I-4601 — Public form should honour view.hiddenProperties (medium, open)
- See B-4607. The in-app view's `hiddenProperties` are respected in TableView but ignored in `routes/form.$dbId.$viewId.tsx`. Form builders set `hiddenProperties` via the view menu (the same UI surface as table-column hiding) and reasonably expect it to apply publicly too. Update `visibleFields` to also filter `view.hiddenProperties` (the conditionalLogic pass can keep running on top). Alternative: introduce a dedicated `view.formFields` allowlist on form-typed views, but that's a bigger schema change.

### I-4602 — `reorderDatabaseRows` should validate source.databaseId === databaseId (high, open)
- See B-4611. Today `reorderDatabaseRows(target, sourceId, _)` blindly splices `sourceId` into `databases[target].rows`. There is no check that `state.rows[sourceId].databaseId === target`. Two-line fix:
  ```ts
  const src = s.rows[sourceRowId];
  if (!src || src.databaseId !== databaseId) return s;
  ```
  And mirror on the `TableView.onDrop` side as a defensive check. Without this, a stray cross-DB drag (which is super easy when two inline DBs sit on the same page) duplicates the row id into two `databases.<id>.rows` arrays — the affected row then appears in both grids, edits in one propagate to the other, and trashing in either leaves the dangling reference. P1 because the UI happily produces it with one drag.

### I-4603 — Cross-DB row drops should at least be a no-op (low, open)
- Follow-up to I-4602. Even after guarding `reorderDatabaseRows`, the TableView `onDrop` swallows the event. Notion's behaviour is to either (a) silently no-op (current acceptable target) or (b) prompt "Move row to <DB-B>?" with explicit property remapping. Pick one; today it appears to "work" but corrupts state. The smallest robust fix is to early-return in `onDrop` when `state.rows[sourceId].databaseId !== databaseId` and clear the drop indicator.

### I-4700 — Sanitizer preserves <script> body as visible text (low, open)
- `sanitizeHtml('<script>alert(1)</script>hello')` returns `"alert(1)hello"` — the script tag is stripped but its inner text content remains in the DOM. Safe (no execution), but ugly: a paste with attempted XSS leaks confusing strings into the published page. Mitigation in sanitize.ts:42-52 should special-case `SCRIPT`/`STYLE`/`NOSCRIPT`/`TEMPLATE`/`XMP` to also drop their text-children before unwrapping. One-line fix: `if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') { el.remove(); continue; }` before the keep-text branch.

### I-4701 — Trashed inline DBs still show on host page until reload (low, open)
- Acceptance flow above only verified the trash UI surfaces a restored DB. Worth adding a follow-up: inline DB blocks embedded in a page should hide when the database `isInTrash:true` (currently they may render with empty rows/views because TableView guards on `db.isInTrash` but the host page block still reserves space + toolbar). Confirm by trashing a DB that has an `inlinePageId` reference; if the inline block still draws header/toolbar, polish to a "Database moved to Trash — restore?" placeholder.

### I-4702 — Cross-DB row drop should give a UX cue, not silently no-op (low, open)
- Now that B-4611's store guard is in place, the table-view onDrop swallows the cross-DB drag with no feedback. Users will be confused why their drag did "nothing". Add a quick `toast("Move between databases not supported yet")` or visual reject animation in TableView.tsx:62-67 when `state.rows[sourceId]?.databaseId !== databaseId`.

### I-4703 — View tabs lack keyboard navigation and ARIA roles (low, open)
- The view tab strip uses plain `<button data-testid="db-view-…">` without `role="tab"`/`role="tablist"`, no `aria-selected`, no arrow-key navigation. Screen readers announce them as a flat button list. Add tablist semantics + Left/Right arrow handling + Home/End. Low impact on power users but a clean a11y win.

## 2026-05-13 — QA agent iteration I-4800

### I-4800 — Move all hooks above the `isInTrash` early-return in InlineDatabase (high, open)
- See B-4802. Restoring a trashed inline DB throws "Rendered more hooks than during the previous render." Likely cause: InlineDatabase.tsx returns the trashed-placeholder JSX before some `useState`/`useMemo`/`useEffect` hook is reached. When `isInTrash` flips false during the same mount, React notices the hook-count grew. Move every hook to the top of the function before any conditional return; same rule for TableView, BoardView, etc. that may sit inside the same boundary. Until fixed, the restore button is a footgun in production.

### I-4801 — Sub-page slash conversion should clear the `/page` placeholder content (low, open)
- See B-4806. After picking `/page`, the originating block is converted (type → `sub-page`) but its `content` is left as `"/page"`. The sub-page renders an icon + title so the literal `/page` doesn't surface, but the value loiters in `state.blocks` and would re-appear if the block were ever switched back to type `text`. Trivial fix: in the slash handler, reset `content` (and `format`) when changing type to a structural block. Same applies to other slash commands that promote to non-text blocks.

### I-4802 — Cascade orphan block cleanup on `deletePageForever` (medium, open)
- See B-4808. Hard-deleting a page leaves any block with `pageId === deletedPageId` orphaned in `state.blocks`. Over time these accumulate. Update `deletePageForever` to (a) collect block ids via `pages[id].blocks` AND `Object.values(blocks).filter(b => b.pageId === id)`, then (b) `delete state.blocks[bid]` for each. Bonus: scrub `sub-page` blocks that reference the deleted page (search parents).

### I-4803 — Favorites sidebar entries should use distinct testids (low, open)
- See B-4810. When a page is favorited it renders in BOTH the Favorites section and its original teamspace/private section, but both DOM nodes share `data-testid="sidebar-page-<id>"` (plus expand/menu/new triples). This breaks `getByTestId` deterministic queries and is a footgun for downstream test suites. Suggest namespacing Favorites copies: `sidebar-fav-page-<id>`, `expand-fav-<id>`, etc. — same id, different testid prefix.

### I-4804 — AI reply preserve newlines when quoting the prompt (low, open)
- See B-4814. The stub assistant message constructs `"Based on your workspace, here's what I found about \"${prompt}\":..."` and `${prompt}` carries embedded `\n`s that collapse to nothing in the rendered block (it's inserted as `textContent`, no `white-space: pre-wrap`). Either join with `" "` when echoing (so words stay separated) or wrap the quoted prompt in a styled `<span class="whitespace-pre-wrap">`. Cosmetic but immediately visible in the chat thread.

### I-4805 — Inline DB block could surface "restore" inline (low, open)
- See B-4801. The placeholder solves the rendering crash but the Restore button is the only affordance. Many users won't immediately notice it. Improvement: show a small "Trashed N days ago — Restore | Delete forever" footer on the placeholder. Helps in long pages where the trashed DB sits between live content. Mirrors the Trash view's row layout.

### I-4806 — Cmd+K palette result groups (low, open)
- During B-4811/4812 verification: typing "OKR" returns matching pages but they're listed flat without grouping. With 322 pages in the workspace (per B-4707), grouping by type (page / database / mail / template) or section (recent / favorites / by teamspace) would help. Today it's a single ranked list; even a divider between "Pages" and "Commands" would help orientation.

### I-4807 — Public form should mark required fields visually (low, open)
- See B-4813. The combined-filter form respects hiddenProperties + conditional, but there's no `required` flag on the form schema. The title field is enforced via JS validation (form.$dbId.$viewId.tsx:128-133), yet the UI doesn't render an asterisk or `aria-required` on the label. Either expose `requiredProperties` on the form view (and respect it in submit-guard) or at minimum render an asterisk + aria-required on the inferred title prop.

### I-4900 — PageItem nav button should also call closeOnMobile() (low, open)
- See B-4910. Sidebar.tsx:252-258 navigates without invoking the local `closeOnMobile()` helper that wraps `matchMedia(max-width:768px) → setUI({sidebarOpen:false})`. Today the route-state effect in app.tsx:47-52 saves us by closing the drawer on any pathname change, but if a future refactor inlines drawer/over­lay state (or skips the route effect for sub-paths that don't change the path) this redundancy disappears. Add the missing `closeOnMobile()` call inside the PageItem onClick — defense in depth and aligns with every other sidebar nav button.

### I-4901 — Empty Board / Gallery views need a textual empty state (low, open)
- See B-4911. Calendar shows the grid (clear "no events today" affordance), but Board and Gallery render the toolbar + zero cards with no copy. New users can't tell whether the DB has 0 rows, 0 visible rows due to a filter, or whether the view is broken. Add a "No <rows | cards | items> yet — `+ New`" centered ghost in BoardView / GalleryView when `rows.length === 0`. Matches what List/Timeline already do (no crash but visually empty).

### I-4902 — Cmd+K palette empties out (loses input + content) when re-opened across awaits (low, open)
- Observed while testing B-4908 / B-4909: dispatching `keydown(meta+k)` once + reading `[data-testid="command-input"]` inside the same eval works; splitting across two evals returns `null` because some prior keystroke (or focusout) closes the palette. The palette's outside-click / Escape handling clears state even without explicit user input. Consider a `data-keep-open-on-blur` flag or keying open-state to URL hash (`#cmdk`) so dev tools / automation can interact without racing against focusout.

### I-4903 — Slash conversion should clear placeholder content for `sub-page` too (low, open)
- See B-4907. `handleSlashSelect` in Block.tsx already does `ref.current.innerHTML = ""` for the `convert` path (per B-002 fix) but the `insert` path with `custom === "page" | "sub-page"` only calls `updateBlock(block.id, { type, parentId, order, pageId })` — no `content` clear. Add `content: ""` to the patch and also blank `ref.current.innerHTML` so the converted block is pristine. Same fix template as I-4801 but for the page/sub-page branches.

### I-4904 — DB views in trash placeholder lack a "Trashed N days ago" timestamp (low, open)
- See B-4900 / B-4801. The placeholder copy reads `Database "X" is in the Trash.` with a single Restore button. Users restoring weeks-old DBs have no idea how stale the row data is. Add `trashedAt` formatted as relative time ("Moved to Trash 4 days ago") next to the icon. Field is already populated in `updateDatabase({ isInTrash:true, trashedAt: Date.now() })`. Pairs with I-4805's "Delete forever" inline action.

### I-4905 — Public published-page surface lacks a "Comments are disabled for public viewers" hint (low, open)
- See B-4913. Comments are correctly hidden on /p/<slug>, but a reader who knows the same page on /app/p/... has a discussion may wonder why they can't see it (or expect a public commenting affordance like Notion's). Either render a tiny ghost note at the bottom ("Comments are only visible to workspace members") or surface a "Discuss this page" CTA that links back to the auth flow. Keeps the read-only contract while signalling intent.

## 2026-05-13 — QA agent iteration I-5000

### I-5000 — Wiki Verify button should set a default expiry (medium, open)
- See B-5006. Clicking `verify-wiki` writes `verifiedAt` + `verifiedBy` but leaves `verificationExpiresAt = null`. The whole point of a wiki Verify is "this is fresh until X" — without an expiry the badge stays green forever. Default to 90 days (Notion's default) or expose a small "Verify for [30 / 60 / 90 / 180 days]" dropdown next to the button. Today the badge type already supports the field; only the click-handler needs to compute `Date.now() + 90 * 86400_000`.

### I-5001 — deleteDatabase should defend against legacy views without propertyOrder/hiddenProperties (medium, open)
- See B-5013. store.ts:1117-1121 dereferences `v.propertyOrder.filter` / `v.hiddenProperties.filter` on every other-DB view. 11 views in current LS (across 6 databases) have one or both as `undefined` — built from older code paths that didn't seed them. Calling `deleteDatabase` raises a TypeError that React's onClick wrapper swallows, leaving the trashed DB stuck. Two fixes: (1) inline guard `v.propertyOrder ?? []`, `v.hiddenProperties ?? []` in deleteDatabase; (2) one-shot migration on `loadFromStorage` to backfill both arrays on every view. Apply both belt + suspenders.

### I-5002 — Block-scoped comments need a rendering surface (medium, open)
- See B-5010. The `Comment` schema has a `blockId` field, the store happily persists block-scoped comments, but no component reads them. PageComments filters by `!c.blockId`. Either (a) render an inline yellow dot on the parent block when `comments.filter(c => c.blockId === block.id).length > 0` that opens a popover, OR (b) remove the unused field if block-anchoring isn't planned. Today the data is silently orphaned, which is the worst of both worlds (no UI but it's still in the persisted state).

### I-5003 — Cmd+J AI panel should debounce repeated open/close keystrokes (low, open)
- See B-5011. 10x rapid Cmd+J dispatch (open, close, open, close...) shows the panel stuck open until the sequence ends. Suggests the close-on-meta+J handler is missing or races with the open handler. Add a single toggleable `setUI({ aiPanelOpen: !ui.aiPanelOpen })` handler bound once, and ensure the keydown listener uses `useEffect` with `[aiPanelOpen]` so toggle is always idempotent. Cosmetic but a power-user annoyance.

### I-5004 — Empty board/gallery testid copy could include "+ New" affordance (low, open)
- See B-5001. Both empty-state placeholders display informative text but no clickable CTA. A user staring at "No cards yet. Add a row from the table view…" still has to find the `+ New` button elsewhere. Either link the empty-state CTA inline (e.g., `<button data-testid="board-empty-new-<id>">+ New</button>`) or replicate the toolbar's "+ New" inside the empty state. Today the testid works but the UI is dead-air.

## 2026-05-13 — I-5100 series

### I-5100 — Cascade `teamspaceId` to descendants when moving a page (medium, open)
- Linked to B-5101. `TopBar.tsx:215` writes `{ teamspaceId: ts.id, parentId: null }` only on the moved page. Mirror the recursion in `deletePage` (store.ts cascades through child pages) so descendants inherit the new teamspaceId. Without it, the page tree is "visually consistent but data-inconsistent" — a class of bug that surfaces only on the next move/delete. Suggested signature: `function reparentTeamspace(pageId: string, newTeamspaceId: string)` walking `parentId`-children recursively.

### I-5101 — Add `page-opt-history` shortcut to the "•••" page menu (low, open)
- See B-5103. The Page History feature exists and works (`history-btn` in TopBar, `snapshot-now` + `restore-<id>` in dialog) but is buried as a date-stamp button. Add a `MenuItem` in `PageOptionsMenu` (TopBar.tsx:147) right above "Move to Trash":
  ```
  <MenuItem label="Page history" testid="page-opt-history" onClick={() => { setHistoryOpen(true); close(); }} />
  ```
  Requires lifting `historyOpen` setter into a context or passing as prop. Improves discoverability and aligns with Notion's pattern.

### I-5102 — Surface block-scoped comments via inline indicator + popover (medium, open)
- Linked to B-5102 / B-5010. Today `Comment.blockId` is write-only. Two options: (a) keep the field and render a yellow comment dot on the parent block (e.g., `<button data-testid="block-comment-marker-<bid>">💬</button>` near the drag-handle), opening a thread panel; (b) drop the field entirely from `addComment` and the `Comment` type. Pick one — leaving it half-implemented is worse than either path.

### I-5103 — Templates page would benefit from a "Custom templates" section (low, open)
- See B-5110. /app/templates lists 8 hard-coded templates from `templates` array. The Page History snapshot mechanism + the `state.templates` schema field (already wired in storage shape) suggest custom user templates are intended but not exposed. Add an "Add to Templates" `MenuItem` on `PageOptionsMenu` and a "Your templates" section above the 8 starter cards.

### I-5104 — Cmd+K palette should highlight the matched token in block excerpts (low, open)
- See B-5107. The block-match label is currently "B5100ALPHA foo bar B5100BETA · Welcome" — the matched tokens are not visually emphasized. Wrap each token match in a `<mark>` (or apply a CSS class) inside `blockMatches.push(...).label`. Standard search-result polish; low effort.

### I-5200 — Public form needs typed widgets for person / files / relation (medium, open)
- See B-5210. PublicFormField currently degrades to plain text input for `person`, `files`, `relation`. Person should expose a dropdown of workspace members (the form runs without auth so respondents can't actually select themselves — surface a name/email pair input that the host can resolve on receipt). Files should accept drag-drop or URL list. Relation should at minimum render a dropdown of related-DB row labels. Without these, the form silently accepts garbage that the host's downstream renderers can't parse.

### I-5201 — Add `data-testid` on public-form-thanks include the dbId/viewId for parameterized assertions (low, open)
- The thanks state uses a single `public-form-thanks` testid. For multi-form pages or test suites that submit multiple forms in sequence, scoping with `public-form-thanks-<viewId>` would make assertions targeted. Trivial polish; helps QA.

### I-5202 — Sidebar Other section title could indicate why pages are there (low, open)
- "Other" is correct but inscrutable. A tooltip on the section header ("Pages without a teamspace · Move them to organize") would help users who stumble on orphaned pages. The OrphanSection comment in code already explains the rationale; surfacing it to users is a small lift.

### I-5203 — Cmd+P shortcut should call `e.preventDefault()` explicitly to suppress browser print dialog (low, open)
- CommandPalette.tsx:19-23 toggles `setOpen` but doesn't call `e.preventDefault()`. In production browsers Cmd+P would still open the print dialog alongside the palette. Verified the palette opens correctly in our QA env only because `window.print` is stubbed. Add `e.preventDefault()` so the shortcut is safe for real users.

### I-5204 — Public form should mark person/files/relation fields with placeholder hints (low, open)
- Even before I-5200 lands, a `placeholder="@username or email"` on person, `placeholder="https://… or paste link"` on files, and `placeholder="Row title or id"` on relation would give respondents a hint that this is a text-mode fallback. Zero-cost UX win.

## 2026-05-13 — Test agent batch (I-5300 series)

### I-5300 — DB property header drag-reorder (medium, open)
- See B-5303. Adding `application/x-property-id` dataTransfer on `prop-header-<id>` plus a drop handler that rewrites `view.propertyOrder` would close the gap with Notion. Bonus: persist a workspace-level fallback property order so unhidden columns appear in the same place after reload.

### I-5301 — Row detail drawer needs a comments panel (medium, open)
- See B-5304. The drawer is the most natural "row as page" surface but never reads `state.comments`. Add a thin panel below the cells that filters by `rowId`. Same compose/resolve affordances as PageComments would be enough. Persisting comments at the row level also unlocks notification badges on table cells (a hover dot).

### I-5302 — Calendar standalone should toast on drop refusal (low, open)
- See B-5305. The silent refusal in app.calendar.tsx:182 is the only drag interaction in the app that lacks user feedback. Reuse the toast pattern from TableView's cross-DB refusal so users learn that DB-row events must be rescheduled from the database view.

### I-5303 — Sidebar should expose a drop-to-orphan zone (low, open)
- See B-5307. Today the only path to "orphan a page" is to manually clear `teamspaceId` via the page-options menu. A small drop area below the last teamspace (`data-testid="sidebar-orphan-zone"`) with a tooltip "Drop here to remove from teamspaces" would mirror Notion's "Move to private" affordance.

### I-5304 — AI chat panel should show a "Thread cleared" toast after `ai-new-thread` (low, open)
- Today the click silently empties the message list. A quick toast / inline "✨ New thread" confirmation gives reassurance that the click registered. Optional: keep a small "Restore last thread" link for 5 seconds in case of misclick.

### I-5305 — Block highlight should fade after 3-5 seconds (low, open)
- Hash-based highlight is sticky until a different hash arrives. After a reload (per B-5308) the highlight persists indefinitely, which is visually noisy long after the user has read the block. A CSS `animation: highlight-pulse 2s ease-out 1; animation-fill-mode: forwards;` (or a JS timer that clears the attribute) would feel less aggressive while still drawing the eye on jump.

### I-5306 — Cmd+K results should show breadcrumb on deeply-nested sub-pages (low, open)
- Per B-5309 the palette already finds level-4 children correctly. Today the item shows only the page title. Adding a "Engineering › L1 › L2 › L3 ›" prefix (or a small `data-testid="cmd-breadcrumb-<id>"` line under the title) would disambiguate sub-pages that share a title with another page's child.

## 2026-05-13 — Test agent batch (I-5400 series)

### I-5400 — Permanent-delete should cascade comments (medium, open)
- See B-5408. `permanentlyDeletePage` (store.ts:690-776) cleans pages, blocks, and dangling page-links but ignores `state.comments`. Long-running workspaces accumulate orphan comments whose `pageId` no longer resolves; the comments inspector at any future point will surface "Comment on missing page" entries.
- Fix: at the end of `permanentlyDeletePage`, iterate `state.comments` and drop entries with `pageId` in `pagesToDelete`. Mirror the same cleanup for `blockId` when the block has been cascaded out (already in the per-page block sweep).

### I-5401 — Date column "is-empty" filter could show a visual hint above the table (low, open)
- The filter works (B-5409) but when the empty-filter hides every date-bearing row, users get no in-table indication of why rows disappeared. A small "Filtered: 5 rows match (Date is empty)" stripe above the table — similar to Notion's filter chip count — would make the affordance discoverable.

### I-5402 — AI panel `ai-input` should retain pre-filled context after `ai-new-thread` (low, open)
- After B-5407 clears the thread, the pre-fill triggered by `open-ai-chat-with` is also wiped. If a user clicks "New" by accident, the parent-page context is lost. Suggest holding the last `{selected,pageTitle}` payload in a small ref so we can re-populate the input on the next message.

### I-5403 — Cmd+/ inside a callout could surface callout-specific commands first (low, open)
- B-5410 confirms the slash menu opens. Today it offers the full block-type list including "callout" itself (which would nest a callout-in-callout, a confusing UX). When the focused contenteditable lives inside a callout, demote or hide "callout" / "columns" from the top of the menu and surface emoji-change / convert-to-text instead.

### I-5404 — Title `<th>` should expose a clear "not draggable" affordance (low, open)
- Per B-5402 the title column refuses drags silently. The cursor over the title header is still `cursor-default`, indistinguishable from "draggable but you missed". Add `cursor-not-allowed` on the title `<th>` (or just `cursor-text`) so the affordance signals "this column is pinned".

### I-5405 — Move-to-teamspace menu should group teamspaces by current location (low, open)
- B-5406 shows the move works for orphan ("Other") pages, but the menu lists every teamspace alphabetically including the one the page already lives in (when applicable). Mark the current teamspace with a small "current" badge and grey out / remove its menu item so users don't accidentally re-apply the same value (which is a no-op but feels like a misclick).

### I-5406 — AI markdown renderer should support ordered/unordered list nesting (low, open)
- B-5404 confirms top-level `- item` works. Trying multi-level indent (e.g. `- a\n  - b`) currently flattens to a single-level list — the bullet regex matches both but the second never becomes a child `<li>`. Implementing depth via leading-space count would close the gap with most chat-assistant renderers.


## 2026-05-13 — Test agent batch (I-5500 series)

### I-5500 — Public form multi-select needs functional setState (medium, open)
- See B-5506. `form.$dbId.$viewId.tsx:314` reads `selected` from the closure when computing the next array. Rapid clicks (or a script playback at submission speed) overwrite each other and only the last option ID survives.
- Fix: pass a function to `onChange`: `onChange((prev) => active ? (prev as string[]).filter(id => id !== o.id) : [...(prev as string[] ?? []), o.id])`. Then thread `setValues((cur) => ({...cur, [p.id]: typeof v === "function" ? v(cur[p.id]) : v}))` so the parent applies functional updaters. Closes a real regression risk for any tester clicking quickly or using automation.

### I-5501 — Cmd+K could optionally index page icon glyphs (low, open)
- See B-5501. The palette only searches title + block content. Searching "🚀" returns nothing even when two pages have that exact emoji. Optional behavior: include `p.icon` in the haystack ONLY when the query is a single grapheme cluster (so typing "the" still doesn't match a page whose title contains an emoji). Low-priority — icons are mostly decorative.

### I-5502 — `prop-header-<id>` testid should match the actual drag handle (low, open)
- See B-5504. Today the inner `<button data-testid="prop-header-...">` is `draggable:false`; the drag target is the wrapping `<th data-property-id="...">`. Tests that target the button to simulate drag will fail silently. Move the testid onto the `<th>` (or add a second testid like `prop-header-handle-<id>` on the th). Currently relying on `data-property-id="<id>"` works but is undocumented.

### I-5503 — Restore parent page should optionally cascade child restore prompt (low, open)
- See B-5509. After trashing child then parent, restoring the parent only un-trashes the parent — the child stays in trash because `restorePageCascade` only descends to in-trash children whose parent was just restored AND whose `parentId` matches. Wait: it does descend (store.ts:649-674), so this should work. Edge case: if child was trashed BEFORE parent (different `trashedAt` timestamps), user mental model expects child to come back together. Add a toast offering "Restore N child pages too?" when there are dangling trashed children.

### I-5504 — AI chat scroll container could pin scrollbar visibility on overflow (low, open)
- B-5502 shows the panel scrolls correctly. On macOS the overlay scrollbar fades after a second — users may not realize content extends. A subtle persistent scrollbar (`scrollbar-width: thin` / `scrollbar-color`) or a `box-shadow: inset 0 -8px 6px -6px rgba(0,0,0,.1)` fade hint on the bottom edge would discoverability win.

### I-5505 — `/columns` slash text input retains the typed query inside the block content (low, open)
- During B-5507 testing I noticed that typing `/2 columns` into a paragraph and clicking `slash-columns-2` leaves the typed text in the block when the conversion path crosses certain components (Reading list page had a pre-existing columns block; my typed `/2 columns` text persisted as `content` on the columns block until I cleared it manually). The slash handler should clear the originating text before swapping the type. The fresh-block path on Welcome page worked correctly.

### I-5506 — Trash should batch-empty UI even with zero items (low, open)
- B-5505 confirmed the empty placeholder appears. UX nit: there's no affordance to "empty all" from /app/trash even when items are present. A small "Empty trash" button (with double-confirm) above the list would mirror Notion and save N clicks for large cleanups.

### I-5507 — Public form should show selected count for multi-select (low, open)
- The current UX (B-5506) toggles option pills via active class. When 3+ options are selected, there's no compact summary ("3 selected") — only the inline pill highlights. Adding a small "3 of N selected" caption under the field label would help respondents confirm their state at a glance.

### I-5508 — Synced-block ref count should appear in source's UI (low, open)
- B-5508 perf bench used 100 refs of one source. The source synced-block has no indication of how many refs point at it. Adding a small "100 refs" badge next to the source (computed by scanning `state.blocks` for `type:"synced-block-ref" && sourceId===this.id`) helps users understand the blast radius of an edit before they make it.

### I-5509 — Auth page should hide the AI keyboard shortcut hint (low, open)
- B-5503 confirmed Cmd+J is inert on /auth (good). If we ever add a "?" keyboard-shortcuts overlay, it should be gated on AppShell so /auth doesn't advertise shortcuts that don't work. Pre-emptive guard documented here for I-5500 series.

### I-5510 — Comment resolve toggle could show inline "Resolved by <user>" timestamp (low, open)
- B-5510 confirms persistence. The "Resolved" button label is the only signal that the action stuck. Adding a tiny "Resolved 2 minutes ago" caption inside the comment row (using `updatedAt`) would communicate when/who without needing to hover. Mirrors Notion's resolved-by-user surface.

## 2026-05-13 — Test agent batch (I-5600 series)

### I-5600 — Breadcrumb should include teamspace name when page is at teamspace root (medium, open)
- See B-5601. When a page has no parentId but lives in a teamspace, the TopBar breadcrumb collapses to just the page title. Mirror sidebar grouping by prefixing the teamspace (e.g. `Engineering › Welcome`). Could be rendered as a non-clickable subtle chip to disambiguate without adding navigation noise.

### I-5601 — NewViewButton missing "Map" view type in dropdown (low, open)
- See B-5609. `View["type"]` union includes `"map"` and the `add()` switch handles it (locationProperty fallback), but the dropdown literal at InlineDatabase.tsx:269 hardcodes the 8 other types. Either remove `map` from the union (and the switch case) or expose it in the dropdown. Currently a silent dead branch.

### I-5602 — Cmd+K query could fuzzy-match emoji icons (low, open)
- See B-5602. Emoji input to Cmd+K returns 0 results even when pages have emoji icons. Optional improvement: include `p.icon` in the search haystack so users can find a page by its emoji. Low priority because most searches are textual.

### I-5603 — Preserve editor selection when closing Cmd+K (medium, open)
- See B-5608. After Cmd+K open + Esc, focus snaps to `<body>` and the selection is empty. Save the previously-focused element + its Range on palette open, restore on close. Improves keyboard flow when the user opens Cmd+K mid-edit and dismisses without navigating.

### I-5604 — Markdown export sub-page recursion toggle (medium, open)
- See B-5604. Export only emits a link to the child page, not its content. Add an "include sub-pages" option (and a sensible depth limit) so a 3-deep A→B→C tree exports as one cohesive document. Notion exports a zip with one file per page; we could match that or inline under H2/H3.


## 2026-05-13 — Test agent batch (I-5700 series)

### I-5700 — Sub-page export needs visited-set, not just depth counter (medium, open)
- See B-5704. Today export-markdown.ts:164 caps recursion by depth alone (`depth < 3`). With a cycle A→B→A the same page bodies get inlined repeatedly until the cap finally trips. Track `visitedPageIds: Set<string>` threaded through `blockToMarkdown`, and on re-visit emit the link form immediately. Also worth a heuristic warning toast when the export contained a truncated branch so users know content was elided.

### I-5701 — CommentEditor should default `initial` to "" (low, open)
- See B-5710. Malformed `Comment` records (missing `content`) crash the PageView via `CommentEditor`'s `value.trim()` on a `useState(undefined)` value. Two-character fix at PageComments.tsx:99 and :128 (`initial={c.content ?? ""}`) hardens the route against legacy / partial imports.

### I-5702 — Sub-page export depth cap should be configurable (low, open)
- See B-5702. The 3-level inline cap is hardcoded. Some users will want one-level (just link the sub-pages), others want full recursion. Surface as an export option on the page-options menu (or as a query param on the `export-page-markdown` event detail) defaulting to the current 3.

### I-5703 — Shift+Enter in AI textarea should programmatically insert "\n" (low, open)
- See B-5707. Real keystrokes work; programmatic `KeyboardEvent` doesn't actually insert a newline (browsers ignore synthetic keys for editing intent). For test harnesses and accessibility tools, intercept Shift+Enter in the keydown branch and call `setText(v => v.slice(0, sel) + "\n" + v.slice(sel))` so the behavior is identical regardless of input source.

### I-5704 — Cmd+K block highlight could persist longer on big pages (low, open)
- B-5708 confirmed the 1500ms ring timeout. For very long pages where smooth scroll takes ~600ms, the user effectively gets <1s of highlight. Extend to 2500ms (or until next interaction) so the block stays visually anchored after the scroll settles.

### I-5705 — Comment edit save button should disable while saving (low, open)
- B-5709 shows save is synchronous. If the store goes async (future Supabase write-through), double-click on save could create duplicate updates. Add a `saving` state inside `CommentEditor` and disable the save button between click and resolution. Pre-emptive guard.


## 2026-05-13 — Test agent batch (I-5900 series)

### I-5900 — NewViewButton missing "map" view type (P3, open)
- File: src/components/database/InlineDatabase.tsx:269.
- The dropdown lists `["table", "board", "calendar", "gallery", "list", "timeline", "chart", "form"]` — `"map"` is absent even though `View["type"]` in types.ts:500 supports it. So a map view can exist via direct store mutation but not be created from the UI.
- Either add `"map"` to the picker (and provide a sensible default for `locationProperty`), or strip the `"map"` branch from `add()` and `View` so the gap is intentional. Pick one.

### I-5901 — Block-anchor comment chip should disable on stale blockId (P3, open)
- See B-5909. PageComments.tsx:280 renders the chip unconditionally when `blockId != null`. Add a quick existence check (`useStore(s => !!s.blocks[blockId])`) and apply `disabled` + tooltip "Block no longer exists" when the lookup fails. Prevents the silent no-op click and gives users a real signal that the anchor is dead.

### I-5902 — Markdown export should respect `isInTrash` on sub-page targets (P1, open)
- See B-5910. export-markdown.ts:170 guards on depth + visited only. Add `&& !target.isInTrash` so trashed pages don't get their content inlined into the parent's export. Fall back to either the link branch (181-186) or a short "<!-- trashed sub-page omitted -->" placeholder. Privacy / completeness fix.

### I-5903 — Trash route could still show teamspace context (P3, open)
- See B-5908. Today `/app/trash` renders no breadcrumb at all. A small "Trash" chip (or "Trash · Private" if filtering by teamspace) would orient users who landed there from a specific teamspace context. Low priority — consider when the trash route grows filters.

### I-5904 — Cross-tab teamspace move re-renders ~400ms after StorageEvent (P3, open)
- See B-5903. Cross-tab sync works but the chip refresh takes ~400ms — the store likely uses a setTimeout-debounced reload. For a teamspace move the user just made elsewhere, that delay is fine; for explicit collaborative moves it could feel sluggish. Consider a "force refresh on receiving teamspace-related StorageEvent" fast-path.

### I-5905 — AI textarea cap exposed as magic number 160 in two spots (P3, open)
- File: src/components/ai/AIChat.tsx:337 (`max-h-40`) and :344 (`Math.min(160, ...)`). The two must stay synchronized; today they're 160px + 10rem-via-Tailwind. Refactor either to a named constant (e.g. `AI_TEXTAREA_MAX_PX = 160`) and reuse, or drop the `style.height` calc in favor of `field-sizing: content` (browser support permitting).

### I-6001 — Add `map` to NewViewButton dropdown (P2, open)
- See B-6005. src/components/database/InlineDatabase.tsx:269 lists 8 of 9 ViewType values. Add `"map"` so the dropdown matches the type union and the switch already at :249. Also surface a sensible default `mapViewIcon` in `viewIcon()` (:163-176).

### I-6002 — Dedupe Cmd+K results: skip block-match for pages already in Pages group (P2, open)
- See B-6009. In CommandPalette.tsx:204-250, build a `Set<string>` of `pageItems` page ids and skip blockMatches whose `p.id` is in the set. Alternative: prefer the block-match (it carries snippet context) and remove the page-item — but Pages-first is the lower-risk change.

### I-6003 — Restore caret after Cmd+K block / page navigation (P2, open)
- See B-6010. Each action callback should call the existing `restoreSelection()` before `setOpen(false)`. Block-match action additionally could focus the contenteditable inside the destination block after `scrollIntoView`. This makes Cmd+K → resume-typing feel native.

### I-6004 — Public page sub-page block could inline published-sub bodies for hub pages (P3, open)
- See B-6008. Today `/p/<slug>` always renders sub-page blocks as a link, even when the sub is also published. If product wants hub-style indexes ("Public Wiki" pattern), mirror the app-side inline behavior (depth-capped) for `target.isPublished && !target.isInTrash`. Otherwise document the current behavior as intentional.

### I-6005 — Cross-tab `storage` event path is untested by current rehydrate flow (P3, open)
- See B-6004. Same-tab `localStorage.setItem` does NOT fire the `storage` event in the writing tab; only BroadcastChannel. If BC is unavailable (older Safari, private mode), cross-tab sync may degrade. Add a fallback that calls `_state = rehydrate()` after writes that explicitly want a self-resync, OR document the BC dependency.

### I-6006 — Block-scoped comment count not surfaced on the trashed-page banner (P3, open)
- See B-6006. When a page enters trash with N block-scoped comments, the banner is silent. Consider "This page has 2 comments that will be hidden until restore." so users have a hint before permanent-delete.

### I-6100 — Gate the map view dropdown entry or render a real map (P2, open)
- See B-6102. InlineDatabase.tsx:269 lists "map" but renderView returns a placeholder. Either tag the dropdown item as "beta / coming soon" (disabled + tooltip), or wire a minimal Leaflet/maplibre render driven by a configurable lat/lng property. Today users add an unusable view with no warning.

### I-6101 — Cmd+K page-row should carry block anchor when matched via block content (P2, open)
- See B-6103. In CommandPalette.tsx:101-114, when `matchingPages` accepts a page via block content, capture the matching block id and attach `hash: block-<bid>` to the page-row's `action`. This restores the snippet-row UX after the dedupe (B-6009 / I-6005) ate the snippet branch. Alternative: render BOTH a page row AND a snippet row, but mark them as "title match" vs "block match" — dedupe just on dest, not on UI.

### I-6102 — AI history magic number 50 should be a constant (P3, open)
- See B-6110. AIChat.tsx:118 and :180 both hard-code `slice(-50)`. Extract `const AI_HISTORY_LIMIT = 50` at module top. Also consider a "Clear history" button so users can drop old context without manually clearing localStorage.

### I-6103 — Block-anchor "missing" check should consult the store, not the DOM (P2, open)
- See B-6104. PageComments.tsx:267 should read from `useStore` to determine whether the block exists anywhere. If it exists but on another page, the chip should be enabled and the click should navigate to that page + hash. Today the chip is disabled with a misleading "no longer exists" tooltip.

### I-6104 — Add `restoreDatabaseCascade` mirroring `restorePageCascade` (P1, open)
- See B-6105. app.trash.tsx:83 today only flips `db.isInTrash`. Introduce `restoreDatabaseCascade(dbId)` that ALSO restores any pages with `databaseId === dbId && isInTrash && trashedAt >= db.trashedAt - epsilon`. Alternative low-effort fix: restore all rows referenced by `db.pageIds` whose `isInTrash` is true. Today restoring a DB shows 0 rows even though they exist in trash.

### I-6105 — Markdown export: separate sub-page heading from preceding body (P3, open)
- See B-6107. export-markdown.ts:181 returns `${hashes} ${title}\n\n${childMd}` but the previous block doesn't end with `\n\n`. Prepend `\n` to the heading return value, or change the join in :89/:175 to use `\n\n`. Strict markdown parsers benefit; loose ones unchanged.

### I-6106 — Document the testid `command-input` vs the natural `command-palette-input` (P3, open)
- See B-6106. Either rename the testid to `command-palette-input` (matches the component name) and add a deprecation alias, or document in CONTRIBUTING / testing docs. QA scripts and codebase greps look natural with the longer name.

### I-6107 — Map view: surface a "no location property" empty state with CTA to add one (P2, open)
- See B-6102. Today's placeholder is plain text. Improve to: detect the database has no geo / lat-lng property; show a CTA "Add a Location property to display rows on the map." Provides a clear next step instead of "coming soon — geo properties not yet implemented".

### I-6200 — Cross-page comment anchor: navigate to block's parent page (P2, open)
- See B-6201. PageComments click-handler for the block-anchor chip currently does `setHash('#block-' + bid)` on the current location. When the referenced block lives on a different page, that hash is meaningless on the current page. Resolve `useStore.getState().blocks[bid].parentId`, then `navigate('/app/p/' + parentId + '#block-' + bid)`. Combined with the B-6104 store-existence gate, this closes the cross-page comments loop end-to-end.

### I-6201 — AI textarea Enter should respect busy state (P2, open)
- See B-6203. AIChat's textarea onKeyDown only checks `e.key==='Enter' && !e.shiftKey` and calls `send()`. Add `if (isBusy) { e.preventDefault(); return; }` (same predicate used to disable `ai-send`). Also consider a visible "Waiting…" placeholder while busy so users know why their Enter is no-op.

### I-6202 — Cmd+K: ignore single-char tokens when AND-matching (P2, open)
- See B-6205. The palette currently splits the query on whitespace and AND-matches each token against title+block content. Single-letter tokens are wildly non-discriminative ("C O M M" → every page that contains C, O, M, M anywhere). Either (a) filter tokens shorter than 2 chars before AND-matching, or (b) treat the raw query as a fuzzy substring with `query.replace(/\s+/g,'').toLowerCase()` as a fallback when there are <2 multi-char tokens.

### I-6203 — Public page should render published sub-page block as `<a>` to its public slug (P3, open)
- See B-6207. Today public renderer treats sub-page blocks as static labels regardless of whether the sub-page is published. For sub-pages with `isPublished && publishSlug`, emit a real `<a href="/p/<slug>">`. For trashed/unpublished sub-pages, keep the plain "(unpublished)" label.

### I-6204 — View duplicate: increment "(Copy 2)", "(Copy 3)" suffix (P2, open)
- See B-6208. duplicateView() likely does `name + " (Copy)"`. Replace with a uniqueness helper that scans the db's `views[].name`, finds existing `<base> (Copy)`, `<base> (Copy 2)` etc., and picks the next free integer. Match the page-title duplicate behavior to keep UX consistent.

### I-6205 — Custom drag preview for sidebar / block DnD (P3, open)
- See B-6211. App relies on the browser default drag image. Use `dataTransfer.setDragImage(clonedNode, x, y)` to render a slim "pill" with just the icon+title, similar to Notion. Significantly reduces visual clutter when dragging deeply-indented sidebar pages.

### I-6300 — Cmd+K: preserve last selection index across open/close cycles (P3, open)
- See B-6307. Close path currently wipes both `query` and `selectedIndex` from the palette's local state. Persist `selectedIndex` (and optionally `query`) in a small zustand slice or `sessionStorage` keyed to the workspace. On open, restore the query, re-run the filter, and if the previously selected page is still present, restore its index; otherwise default to 0. Matches the "open, look, close, reopen" workflow used to fan over recent pages.

### I-6301 — Public/Export: trashed sub-page link uses internal `/app/p/<id>` URL (P3, open)
- See B-6302. The markdown export for trashed sub-pages emits `📄 [title](/app/p/<pageId>)`. That URL is only meaningful inside the app — for an exported `.md` consumed externally the link is broken. Either (a) emit a bare title without href when the target is trashed, or (b) emit a `<!-- trashed: title -->` comment so downstream tools can warn. Today's behavior leaks an internal route into portable Markdown.

### I-6400 — Inline color picker: replace existing color spans instead of nesting (high, open)
- See B-6400. Today `applyColor()` always wraps a new `<span data-color="1">` around the selection. After N sequential color applies you get N nested spans where the INNERMOST (i.e. the FIRST applied) color wins per CSS cascade — the user's last pick is silently overridden. Before wrapping, walk the selection's range and (a) unwrap any descendant `data-color` spans inside `range.commonAncestorContainer`, or (b) update the existing color span's style if the selection is exactly contained. This fixes both the visual-wrong-color issue and the DOM-bloat issue in one shot.

### I-6401 — Comments pane: recursive reply rendering (high, open)
- See B-6401. PageComments.tsx currently has a hardcoded two-level renderer. Extract `<CommentNode comment={c} depth={d}>` that recursively descends `repliesByParent[c.id]` with `pl-3 border-l` per level and a depth cap of e.g. 6 with a "+N more" collapse. Today, level-3+ replies are stored in the comments dict but never displayed, so a user replying to a reply-to-a-reply silently loses their thread.

### I-6402 — Public form: live-clear validation error on field change (medium, open)
- See B-6402. In `setValues`'s callback (form.$dbId.$viewId.tsx:236-244), also call `setError(null)` whenever `error` is currently set. Or wire `useEffect(() => setError(null), [values])`. This gives users immediate feedback that their input addressed the validation problem rather than leaving the stale error visible until next Submit.

### I-6500 — Comment delete should cascade to FULL descendant tree (high, open)
- See B-6500. `store.ts:1692-1703 deleteComment` only walks one level (drop parentId===id). For chains L1→L2→L3→L4→L5, deleting L2 leaves L4+L5+any new replies stranded with a dangling parentId.
- Fix: replace the single for-loop with a BFS over `comments` to collect every transitive descendant, then drop them all in one setState — mirror the shape of `restorePageCascade` (store.ts:649-674). Today the recursive renderer hides orphans so the user can't see the leak, but storage grows monotonically and any future re-parenting/export will surface stale entries.

### I-6501 — Cmd+K palette: strip surrounding quotes from query tokens (medium, open)
- See B-6507. CommandPalette.tsx:102-105 tokenizes by whitespace and AND-matches each token verbatim. A user typing `'test'` or `"test"` (e.g. pasting a quoted phrase from chat) gets zero hits because the literal quotes are included in the substring search.
- Fix: after `rawTokens = q.split(/\s+/)`, normalize each `t.replace(/^['"]+|['"]+$/g,'')`. Optionally, if the WHOLE query is wrapped in matching quotes, treat its inner as an exact-phrase substring (`hay.includes(inner)`) — that's the Notion search semantic.

### I-6502 — Cmd+K palette: always render cmd-empty when 0 results (medium, open)
- See B-6508. Typing `""` (or any token that AND-matches nothing) currently shows neither result rows NOR the empty-state row. The empty-state predicate seems gated on `noiseQuery` (single-char-token collapse) rather than on actual result-count.
- Fix: render `cmd-empty` whenever `matchingPages.length === 0 && defaultActions.length === 0`, regardless of how the query failed. Keeps the palette's affordance consistent and tells the user "your query matched nothing" instead of leaving a blank panel.

### I-6503 — Public form input: optional `maxLength` per Title property (low, open)
- See B-6503. A 1000-char (or 100k-char) submission goes through unchanged, including persisting in `rows[id].values`. While there's no functional break, the title is the de-facto identity field; an explicit max (say 500 chars) prevents pathological abuse from a public form and clears one class of accidentally-pasted novel-as-title incidents.
- Fix: optional `maxLength` field on property schema, defaulted off; PublicFormField input renders `maxLength={prop.maxLength}` when set. UI of submit also shows count near limit.

### I-6600 — Comments: orphans with missing parentId are silently dropped (low, open)
- See B-6605. If a comment's `parentId` references a non-existent comment id (possible after a partial cascade-delete on an old client, or after injection / restore-from-export), the recursive renderer in PageComments.tsx skips it: it isn't a top-level (`!parentId`) entry and its parent isn't in the children-map. The store still holds it.
- Risks: storage grows; an "Inbox" or "All comments" view that lists rows by author would surface a row the user can't navigate to.
- Fix: in the comments effect, after building the `parent→children` map, treat any comment whose `parentId` doesn't resolve to an existing comment as top-level. Alternative: a one-off self-heal pass that re-parents (or hard-deletes) orphans on app boot, similar to the cascade-delete cleanup.

### I-6601 — Color picker: trigger toggles only on `onMouseDown`, not `onClick` (low, open)
- See B-6608 (verification friction). `ib-color` button uses `onMouseDown` (so the selection doesn't collapse when the popover opens). This is correct for real users but breaks automation that synthesizes `.click()` — the button doesn't open the picker. Could be made E2E-friendly by ALSO listening for `pointerdown`/`click` as a fallback, gated by a feature flag for tests.
- Fix: add `onPointerDown` mirroring the mousedown handler. Or: expose a `data-testid="ib-color-popover-open"` on the open popover so tests can probe state without clicking the underlying mousedown handler.

### I-6602 — Inline DB block: injected fixtures need an explicit `viewId`/render trigger (low, open)
- See B-6610 (verification gap). Injecting a `database-inline` block + a fresh `databases[…]` entry via localStorage + a storage event renders the DB title row but NOT the `view-menu-{viewId}` toggle for the active view. The activeView resolver in InlineDatabase appears to wait for an initial click on `db-view-{viewId}` to set local state, leaving the toggle hidden on first render.
- Fix: make InlineDatabase default `activeView` to `db.views[0]` synchronously on mount when no `viewId` prop is provided, so injected fixtures (and recovered crash states) immediately surface the full view chrome. Alternative: a `data-testid="db-inline-${dbId}"` wrapper that exposes the activeViewId via attribute, so tests can drive duplicate ×5 without re-clicking.


### I-6700 — Cross-tab store sync via storage events (low, open)
- Repro: edit `notion-clone:user:<id>` in localStorage from another tab (or via eval) and dispatch a `StorageEvent`. The current tab does not re-hydrate its store — breadcrumb chip, sidebar, and page bodies remain stale until full reload.
- Reasonable to leave single-tab-only for now, but a `window.addEventListener('storage', …)` that triggers a `useStore.setState(JSON.parse(...).state)` would make multi-tab editing safe and also makes QA fixtures cleaner.
- Files: src/lib/store.ts (persist middleware config).

### I-6701 — Sub-page export depth cap is 3 — make it configurable (low, open)
- The fix in `export-markdown.ts:172` caps inline sub-page nesting at `depth < 3` (so the root, level 2, level 3 inline; level 4 emits as a bare link). This is the right default to prevent runaway recursion, but users with legitimately deep wiki structures lose content silently on export.
- Fix: expose a `maxDepth` arg on `pageToMarkdown` and surface it as a checkbox in the export dialog ("Include all sub-pages"). Cycle protection via `visited` already prevents infinite recursion regardless of cap.

### I-6702 — `applyFilters`: throw on unknown operator instead of `return true` (low, open)
- See B-6700. `evalFilter`'s `default: return true` silently passes every row when an unrecognized operator is stored. In development, this should throw (or warn) so legacy/typo data is caught immediately rather than silently disabling the filter.
- Fix: `default: { if (import.meta.env.DEV) console.warn('unknown filter operator', f.operator); return true; }` — or stricter, return `false` to fail-safe.

### I-6703 — Mobile sidebar resize behavior not test-coverable (low, open)
- No `data-testid` on the hamburger/breakpoint trigger, no exposed `isMobileSidebarOpen` flag. Resizing the window past `md` in eval doesn't trigger the React `useMediaQuery` listener (no real `resize` event for synthetic dimensions).
- Fix: add `data-testid="mobile-sidebar-toggle"` and persist `mobileSidebarOpen` on `ui` slice so QA can verify "open then resize past breakpoint" auto-closes the overlay.

## 2026-05-13 — Improvements suggested by batch 24 (I-6800)

### I-6800 — InlineDatabase badge should call the shared `applyFilters` (medium, open)
- See B-6802. The inline DB component duplicates the operator switch with a smaller subset (no `equals`/`not-equals` aliases, no `before/after`, no `is-empty` for array types). It will silently miss any operator added to the canonical evaluator.
- Fix: import `applyFilters` from `../filter` and replace the local switch with `applyFilters(allRows, v.filters ?? [], db).length`. Identical-runtime semantics, single source of truth, deletes ~15 lines.

### I-6801 — `restorePage` (non-cascade) should also restore favorites flagged as `wasFavoriteBeforeTrash` (low, open)
- B-6801 confirms restore does NOT auto-refavorite (correct default). However, for users who explicitly want "this was my favorite — bring it back": store could capture a `wasFavoriteBeforeTrash` boolean at trash time, and Restore offers a one-click "Restore and re-add to Favorites" affordance.
- Implementation: extend `deletePage` to set `wasFavoriteBeforeTrash: p.isFavorite` alongside the clear. The Trash row UI then shows a tri-state restore (Restore / Restore + favorite). Pure UX nicety; default flow unchanged.

### I-6802 — Cmd+K query persistence as a power-user preference (low, open)
- See B-6807. Today every reopen clears the query (good default — most users want a blank slate). Some power users would prefer the palette to remember the last search for ~10s so accidental close/reopen doesn't lose context.
- Fix: `ui.commandPaletteLastQuery` + `ui.commandPaletteLastQueryAt`. If the gap < 10s, prefill on open; else clear. Optionally hide behind a Settings checkbox "Remember last command palette query".

### I-6803 — Synced-block source deletion should soft-redirect refs to a stub or prompt (low, open)
- Today, deleting a `synced-block` source leaves its `synced-block-ref` mirrors rendering the "Synced reference — no source" empty state with a relink input. Fine for power users, confusing for new ones.
- Fix: when `deleteBlock` removes a synced-block source, scan for `synced-block-ref` blocks pointing at it and either (a) inline-convert each ref into a normal block group cloning the last-known children, or (b) toast "N synced references will become detached — undo?" with a 5s window.

### I-6804 — `moveCalendarEvent`: optional duration preservation (low, open)
- See B-6809. Today, only `start` is updated on drag; events with an explicit `end` keep that absolute end timestamp, which means dragging to a new day truncates or extends the visual duration. Most users expect drag-reschedule to preserve duration.
- Fix: when moving, compute `duration = e.end - e.start` (if both set), then write `start = next` AND `end = next + duration`. Falls back to current behavior if no `end`.

### I-6805 — Sidebar cross-teamspace drag: surface "move to teamspace" prompt instead of silent no-op (low, open)
- See B-6810. The current drop guard silently rejects when source/target teamspaces differ. Users will perceive this as "nothing happened" rather than "this is disallowed; here's how to actually move it".
- Fix: when guard fails, show a toast/confirm "Move 'X' to teamspace 'Y'? Pages in that teamspace gain its members and lose yours." Confirm → call `movePageToTeamspace`. Cancel → no-op. Affordance for the common case of accidentally cross-dragging vs. intentional teamspace migration.

## 2026-05-13 — I-6900 series

### I-6900 — Filter warn should include propertyId/value context, and re-warn after operator-name change (low, open)
- See B-6903. Today `[filter] unknown operator "Greater Than"` lacks the propertyId/value so authors can't tell which filter row in a multi-filter view is broken. Also, the per-session dedup Set means an automation that fixes-then-rebreaks the operator stays silent on the second break.
- Fix: include `propertyId` + first 32 chars of `value` in the warn message, and key the dedup Set on `${operator}::${propertyId}` so a re-broken row warns again.

### I-6901 — Restore-DB should re-link to last known parent teamspace (medium, open)
- See B-6904. After restore, `db_4800_trashed_h5r47.isInTrash=false` but if its parent teamspace/page was also trashed, the DB now floats at the workspace root with no breadcrumb.
- Fix: capture `parentIdBeforeTrash` on trash, and on restore use it if the parent is still alive; else surface a "Pick a new location" toast. Same pattern should also benefit pages (currently inherits root if parent is missing).

### I-6902 — Cascade trash should expose `descendantCount` in the undo toast (low, open)
- See B-6905. Trashing L1 cascades to 5 descendants silently. The toast just says "Page moved to trash" — users can't tell if they took 5 children with them or 50.
- Fix: pass `descendantCount` from the cascade into the toast: "Page + 4 sub-pages moved to trash · Undo". Reduces accidental mass-trash anxiety.

### I-6903 — AI panel code block should expose a copy button and language pill (low, open)
- See B-6907. `<pre><code>` renders but there's no copy-to-clipboard affordance and no language hint even when the fence specified one (`\`\`\`python`).
- Fix: parse the opening fence's language token, surface as a top-right pill, and render a hover "Copy" button that writes the `<code>` text content to clipboard. Matches Notion + ChatGPT expectations.

### I-6904 — Sub-page export depth cap should be configurable per export (low, open)
- See B-6908. The hard `depth < 3` cap in `blockToMarkdown` (export-markdown.ts:172) means deeply organized wikis (4+ levels) export as truncated trees with later levels collapsed to bare links. There's no way for a user to opt into a full export.
- Fix: thread a `maxDepth` option through `pageToMarkdown` and surface in the export menu as "Include sub-pages: 1 / 2 / 3 / All". `All` clamps at e.g. 8 with a cycle guard already in place.

### I-6905 — Columns export marker should include column index for round-trip clarity (low, open)
- See B-6908. The exported markdown uses `<!-- multi-column layout: -->` + `<!-- column -->` repeatedly without an index, so a downstream import tool can't distinguish col 1 vs col 3 if a middle column was empty (skipped via `if (blockIds.length === 0) continue`).
- Fix: emit `<!-- column 1 of 3 -->` with explicit indices so the export is invertible. Cost: 1 line of string interpolation.

## 2026-05-13 — I-7000 series (stress / hardening)

### I-7000 — `signOutState` should fully reset in-memory state, not just null currentUser (medium, open)
- `src/lib/store.ts:511-513` only sets `currentUser: null` and leaves `pages`, `blocks`, `databases`, `rows` etc populated with the prior user's data.
- Between `signOutState()` and the router's redirect to `/login`, any component that survives one render tick can still read those blobs (logged-out info disclosure if e.g. share-by-URL or a DevTools dump fires).
- Fix: replace with `setState({ ...EMPTY_APP_STATE, ui: { darkMode: _state.ui.darkMode } })` so dark-mode persists but everything else clears. Cross-user storage-event guard (line 147) already keys off `currentUser?.id`, so wiping the user here also stops accidental rehydrate on stale events.

### I-7001 — Virtualize synced-block-ref lists beyond N=200 (low, open)
- See B-7001. 300 refs render eagerly. For long workspaces this is wasteful since most are off-screen.
- Fix: wrap ref renderer in IntersectionObserver-based windowing OR `content-visibility:auto` per ref shell.

## 2026-05-13 — B-7100 verification batch coverage

### I-7100 — Cmd+K palette has no fuzzy match for queries that look like regex chars — low — open
- NEW#7: opened `sidebar-search`, typed `(`, `+`, `*`, `(paren)`, `+plus`, `*star`, `[brk`, `Has (` while a page titled "Has (paren) +plus *star" existed.
- No crash, no SyntaxError — but **none** of those queries surfaced the page either. cmdk's underlying matcher likely strips/special-cases these tokens, so users searching for files/pages whose titles legitimately contain `(`, `*`, or `+` cannot find them by typing those chars.
- Fix sketch: lowercase + char-by-char substring fallback when cmdk's command-score returns no hits, OR explicitly escape input before passing to cmdk's filter so non-word chars participate in scoring.

### I-7101 — Centralize array-field normalization in `loadFromStorage` — medium — open
- See B-7100/B-7101. Right now `loadFromStorage` normalizes `row.values: {}` but several other array/object fields (`database.rows`, `database.properties`, `database.views`, `page.blocks`, `block.columnIds`, `block.blocks`) can also be undefined after a partial migration / synthetic import / cross-version state restore, and each is read at multiple sites with no guard, producing whole-route boundary trips.
- Fix sketch: one normalization pass in `loadFromStorage` that walks `state.databases / pages / blocks / rows` and applies `arr ?? []` / `obj ?? {}` defaults to the known-array/object fields. Removes the need for belt-and-suspenders defaults at every read site.

### I-7102 — Verifications passed: BroadcastChannel stale rejection, columns:0 legacy, multi-cols same page, multi-select equals filter, 50-reply comment thread
- NEW#1 stale BC: posting an older `_lastWriteAt` snapshot via `BroadcastChannel('notion-clone')` does not overwrite the fresher local state. Title `NEW_TITLE_<now>` survived the stale `OLD_TITLE_FROM_BC` post.
- NEW#2 legacy `columns: 0`: page `pg_b7100_legacy` with a `columns:0, columnIds:[]` block renders without crash, without ErrorBoundary, and with 0 console errors. The new `c.columns <= 0` bail-out in ColumnsEl works.
- NEW#3 3 columns blocks (2/3/2) on one page each materialize independently — `columnIds.length` ends at 2, 3, 2 respectively, with no update-depth errors.
- NEW#4 multi-select `equals` filter (`tagA`): r1 (tags=[A,B]) and r3 (tags=[A]) shown, r2 (tags=[B]) correctly filtered out via the `Array.isArray(v) ? v.includes(...)` branch in `filter.ts:52`.
- NEW#6 50 sibling replies under one parent comment: comments panel rendered 50 `Reply #N` entries with 104 `[data-testid^="comment-"]` nodes total, 0 RangeError / call-stack errors. The recursive renderer is width-safe at this size.


## 2026-05-13 — B-7200 verification batch (centralized normalize + new coverage)

### I-7200 — Centralized normalize verified on all 5 malformed shapes — fixed/verified
- (a) DB without `rows`: navigated `/app/db/db_a_norows` → no ErrorBoundary, view renders.
- (b) DB without `properties`: same surface → renders.
- (c) DB without `views`: renders an empty DB header, no crash. (Note: zero-view DBs render mostly empty — see I-7201.)
- (d) Row without `values`: navigated DB containing it → no crash; cells fall through to empty.
- (e) Page without `blocks`: navigated `/app/p/page_e_noblocks` → renders title/icon UI cleanly.
- All five came via a single `StorageEvent` dispatch; the shared `normalizeState` from B-7100/I-7101 patched the in-memory snapshot on rehydrate without needing per-component defaults. Closes the verification arm of I-7101.

### I-7201 — DB with `views: []` renders no fallback CTA — low — open
- Repro: open a DB whose `views` array is empty (e.g. after the (c) scenario above). The route shows only the icon header (~83 bytes of `main` HTML) — no "Add view" button, no "This database has no views" hint.
- Users who land in this state from a stale import / partial migration have no in-app affordance to recover; they have to know to right-click the sidebar tile or use Cmd+K.
- Fix sketch: in `InlineDatabase`, when `db.views.length === 0`, render the `+ Add view` row directly with a one-click default-view chip ("Create table view").

### I-7202 — Cmd+K regex-char queries handled gracefully (verified)
- Tested 7 queries containing `+ ( * [ ? \ .*`. Each produced 1 result item (the "no results" empty-state item) and no ErrorBoundary. cmdk's command-score swallows the regex tokens; no SyntaxError or RangeError.
- Companion of I-7100: still no positive substring fallback for titles literally containing these chars, but at least the crash path is gone.

### I-7203 — AI panel sidebar toggle stable under 50× rapid toggles (verified)
- Clicked `[data-testid="sidebar-ai"]` 50 times in a row with 5 ms spacing. Final state: panel closed (even count), no ErrorBoundary, `window.__qaErrs` not bumped. No detached listeners visible in the React tree.

### I-7204 — Sub-page export cycle A→B→C→A: both visited set AND depth cap engage (verified)
- A→B→C→A cycle: `pageToMarkdown(A)` emits `# A` → `## B` → `### C` → `📄 [A](/app/p/page_cycle_A)` — the cycle-closing reference becomes a link instead of recursing.
- Depth chain D→E→F→G (4 levels deep): output stops at `#### 📄 G` then inlines G's content directly (`deep content`) because depth==3 falls through to body inlining; no `/app/p/page_g` link emitted (depth cap is `< 3`, hence allowing exactly 3 levels of inlining).
- Both safety mechanisms confirmed independent and complementary.

### I-7205 — Color picker: 10 sequential apply-then-default cycles produce 0 nested spans (verified)
- Ran 10 iterations alternating: select first 10 chars → open picker → apply color X → reselect → open picker → default. After each apply: exactly 1 `span[data-color]` in block HTML. After each default: 0. Final text content identical to start. No span nesting accumulation — confirms the B-6400 / B-3111 unwrap logic stays correct under repeated cycling.

### I-7206 — Sidebar `OTHER` section renders all 8 orphan pages (verified)
- Injected 8 orphan pages (`workspaceId` set, `teamspaceId: null`, `parentPageId: null`). All 8 appear under the `OTHER` heading; sidebar `innerText` contains all 8 titles. No truncation, no virtualization-induced gaps at this size.

### I-7207 — Cmd+K very long query (500 chars) — no perf cliff (verified)
- Typed 500× `'a'` into the palette input: settling in 404 ms. Typed 500× `'p'`: 305 ms. No frame freeze, no ErrorBoundary. Acceptable; matches the absence of any O(n²) on input length in the cmdk fuzzy scorer.

### I-7208 — View duplicate × 20 keeps naming progression (verified)
- Repeated `duplicateView` via the `view-duplicate-v_all` button 20 times. Result: 21 views, names "All", "All (Copy)", "All (Copy 2)" … "All (Copy 20)". 100% unique names. Closes the long-tail of B-6208 / I-6205.

### I-7209 — Public form select: 10 rapid changes — final value matches latest (verified)
- Published form view with a 5-option select. Programmatically `set` `select.value` to each option then fire `change`, 10 times (5 options ×2). Every intermediate `selectEl.value` matched the assignment; final value `opt_e` matched the last set. State did not drift.

### I-7210 — Trash route + restore tolerate malformed entries (verified)
- Injected `pg_trash_a` (blocks=[]), `pg_trash_b` (no `blocks` field), and `db_trash_c` (missing `rows/properties/views`), all `isInTrash:true`. Trash route rendered all 3 entries with correct PAGES / DATABASES grouping, no ErrorBoundary.
- Clicked `restore-pg_trash_b` (the page with no `blocks` field) → restore succeeded; navigating to `/app/p/pg_trash_b` rendered the page editor normally. Centralized normalize is robustly covering the restore + render paths.


## 2026-05-13 — I-7300 stress + discovery sweep

### I-7300 — 3 concurrent simulated tabs writing the same page title — last write wins (verified)
- Simulated three tabs by snapshotting `localStorage[notion-clone:user:<id>]`, each writing a different title (`TabA-title`, `TabB-title`, `TabC-title`) sequentially, each dispatching its own `StorageEvent` with `newValue`.
- Final persisted `pages[pg_mp43svzu14dmlh94].title === 'TabC-title'`. No ErrorBoundary, no merge attempt. Confirms straightforward last-write-wins semantics for the storage-sync layer — acceptable for a single-author clone, but documents that no CRDT/version-vector exists.
- Restored original title `Welcome` at end.

### I-7301 — AI message rich-markdown rendering (verified)
- Sent a question matching the `wantsCode` regex (`show me javascript code for hi`). Assistant reply rendered with **3 `<strong>`** (bold matches), **1 `<pre><code>`** (fenced code block) and **1 `<ol>`** (numbered list). Sources block also rendered.
- The custom `MarkdownText`/`InlineMarks` parser in `src/components/ai/AIChat.tsx:14` correctly handles `**bold**`, fenced ` ``` `, numbered/`-` lists. Notably it does NOT render markdown tables (`| col1 |`) — pipe-rows fall through to text. This is documented behaviour (renderer is intentionally minimal); flagging only as latent gap, not a defect.

### I-7302 — View duplicate then delete original — Copy view becomes only view, no crash (verified)
- Built `db_v7300_viewdupdel` with single view `v_orig` "Main". Clicked `view-duplicate-v_orig` → views became `['v_orig','v_mp44mp9f1e1e4ymx']` ("Main (Copy)").
- Then clicked `view-delete-v_orig`. Result: `views = [{ id: v_mp44mp9f1e1e4ymx, name: "Main (Copy)" }]`. No ErrorBoundary; the table view rendered cleanly with `table-add-` button present. The previously-active view ID was gracefully re-selected from `views[0]`.

### I-7303 — Trash a row from DB with active calendar view — calendar updates (verified)
- Created `db_v7301_cal` with calendar view `v_cal` and 3 rows (`r_cal_1..3`) all on today's date (2026-05-13). Cells visible: `cal-event-r_cal_1`, `_2`, `_3`.
- Clicked `cal-event-r_cal_1` → row drawer opened with `row-detail-delete`. Clicked delete. Result: only `cal-event-r_cal_2` and `_3` remain in DOM; `row.isInTrash:true`; `db.rows = ['r_cal_2','r_cal_3']`. Calendar re-rendered without remount, no flash, no ErrorBoundary.

### I-7304 — Public form 50 visible fields submit roundtrip perf (verified)
- Built `db_v7302_form50` with 50 properties (1 title + 49 text), exposed as public form view at `/form/db_v7302_form50/v_form`. All 50 `public-form-field-*` rendered.
- Filling all 50 inputs took 138 ms; submit→thanks transition (form unmount + new row written) took 203 ms. Final `db.rows.length === 1`. `public-form-thanks` testid appeared. Well within human-acceptable; no jank or layout thrash observed at 50 fields.

### I-7305 — Color picker: red applied, navigate away, return — color persists (verified)
- Directly wrote `<span data-color="1" style="color: #dc2626">This is a</span>…` into the first paragraph block via storage, dispatched StorageEvent. Navigated to a sibling page, then back to the source page.
- DOM after return: exactly 1 `span[data-color]` inside the contenteditable, `style="color: #dc2626"`, `textContent="This is a"`. Storage round-trip is lossless across route changes; the rich-text inline span survives serialization, normalization, and re-mount.
- Note: I could not reproduce the FULL interactive flow (select → ib-color → ib-color-red) because dispatched `mousedown` on the toolbar swatch did not preserve `window.getSelection()` in the eval sandbox — collapsed selection short-circuits `applyColor`. This is a known eval-vs-real-UA divergence (cf B-7200 P3), not a product bug. The persistence half of the test is what matters and that is green.

### I-7306 — Cmd+K with non-ASCII queries (é, 中, 😀, café, 日本語) — no crash, graceful empty state (verified)
- Opened palette via `sidebar-search`, typed each of 5 non-ASCII queries via React-friendly setter + input event. For every query: 0 result items, palette displays "No results", no ErrorBoundary, no thrown exceptions.
- cmdk's `command-score` handles UTF-8 codepoints (including the emoji surrogate pair for `😀`) without SyntaxError. Companion to I-7202 (regex-char queries) — palette is fully tolerant of arbitrary input strings.

### I-7307 — Empty trash → `trash-empty` testid (verified)
- Navigated to `/app/trash`. 2 trashed items remained (`pg_trash_a`, `db_trash_c`). Clicked `delete-forever-pg_trash_a` then `delete-forever-db-db_trash_c`.
- After both clicks the page rendered the `data-testid="trash-empty"` element with text "Trash is empty.". 0 restore/delete-forever buttons remained. Confirms the empty-state branch in `src/routes/app.trash.tsx:28` activates correctly when all items are purged.


## 2026-05-13 — I-7400 exploration sweep

### I-7400 — Re-persist normalized state after cross-tab `storage` rehydrate — open — P3
- Today `normalizeState` runs every read (load + cross-tab + BroadcastChannel) and corrects bad/missing fields in memory only. The on-disk snapshot keeps the corruption until the next local write touches setState.
- A drive-by user who only views (no edits) and switches tabs leaves dangling IDs on disk indefinitely — a future export, debug-dump or third-tab read still sees the bad data.
- Suggestion: after `normalizeState(next)` in the storage listener (store.ts:208) compute a quick `!== next` shallow check, and if any field was rewritten, call `persist(_state)`. Same in the BroadcastChannel branch (store.ts:229).

### I-7401 — Surface orphaned pages (dangling `parentId`) in sidebar — open — P3
- Pages whose `parentId` points at a non-existent OR trashed page are filtered out of the sidebar tree everywhere except direct URL access. They become "ghost" pages.
- Suggestion: in `normalizeState`, when `page.parentId && !pages[page.parentId]`, rebind `parentId = null` so the page falls back to the workspace top level. Same treatment for blocks whose parent block / page got purged.

### I-7402 — Treat comments with dangling `parentId` as top-level — open — P3
- PageComments.tsx:27 currently drops orphaned replies entirely. They should re-surface as standalone comments rather than vanishing.
- Suggestion: change top-level filter to `!c.parentId || !comments[c.parentId]`. Cheap, keeps user content visible.

### I-7403 — Restore-banner UX for trashed-ancestor pages — open — P2
- When `ancestorInTrash && !page.isInTrash`, the "Restore" button is misleading. Either:
  (a) make it cascade-restore the ancestor chain too, or
  (b) replace the banner with: "Parent ‹X› is in Trash — Restore Parent" + a deep link to the parent.
- Option (b) is safer because it preserves the user's intent (they may not want the whole sub-tree back).



## 2026-05-13 — I-7500 verification + perf + UX sweep

### I-7500 — `normalizeState` over a 1000-row DB with 50 dangling IDs is ~130 ms — verified — P3
- Built `db_v7507_perf` with 1000 real rows + 50 dangling IDs (1050 total). Fired `StorageEvent` on the user key; measured the synchronous listener path.
- Wall-clock delta: ~176 ms including a 50 ms setTimeout — effective normalize cost roughly 120-130 ms. After: `db.rows.length === 1000`, all 50 dangling IDs durably pruned on disk. No GC pause, no jank.
- Acceptable for the cross-tab path; if we ever bump to 10k rows we should benchmark again. The filter is O(rows * properties) which becomes interesting at scale.

### I-7501 — Trash: bulk parent + 20 children restore in <600 ms via single click — verified — P3
- Built `pg_v7506_par` (trashed) with 20 trashed children. Single click on `restore-pg_v7506_par` cascade-restored parent + all 20 children in ~537 ms (storage round-trip confirmed `isInTrash:false` across all 21).
- `restorePageCascade` does ancestors-then-descendants; the descendants pass is correct and fast. No need to click each child individually — good UX for "deleted whole subtree by accident".

### I-7502 — AI panel: `ai-new-thread` correctly resets scroll to 0; auto-scroll on send works — verified — P3
- Sent 8 messages to fill the AI scroller (scrollHeight=1246, clientHeight=521, scrollTop landed at bottom). Scrolled up to 100, clicked `ai-new-thread`: messages cleared to 0, scrollTop reset to 0, scrollHeight equals clientHeight (200) — empty pristine state.
- On the new thread: scrolled to top while messages present, sent one more, scroller auto-snapped back to bottom (`afterSendScrollTop=368.5`, `max=371`). UX is correct: new thread is intentionally a fresh-start view, not preserving previous scroll.

### I-7503 — `normalizeState` should rebind dangling `parentId` to null for pages and comments — open — P3
- Two reproductions on this branch (B-7501 page sidebar, B-7502 comment panel) lose user content visibility because a dead `parentId` shouldn't exist on disk in the first place.
- Suggestion (durable): in `normalizeState`, after building `pages` and `comments`, iterate once and set `parentId = null` whenever the target ID isn't in the same map. Self-heals migrations, partial imports, race conditions.
- Companion: the OrphanSection filter (`Sidebar.tsx:360`) should also tolerate `!pages[p.parentId]` as a defensive layer — defense in depth.

### I-7504 — `view.propertyOrder` is dead data — open — P3
- Stored, mutated on add/remove property, but never read at render time (TableView.tsx:28 ignores it). Either:
  (a) Wire TableView to honour `propertyOrder` (and fall back to `db.properties` order for IDs not listed), giving the field its documented purpose, or
  (b) Remove the field from the View type and stop tracking it.
- (a) is the lower-risk move — it adds a useful capability (per-view column order) instead of removing one users may eventually want.

### I-7505 — DB route render time grows ~1.5 s at 1000 rows (no virtualization) — open — P2
- After perf injection, `/app/db/db_v7507_perf` took ~1505 ms from `pushState` to first render with all 1000 `row-row_v7507_*` testids present. No crash, but the DOM has 1000 row nodes — every cell mount, scroll handler, and resize observer scales linearly.
- Suggestion: introduce row virtualization (react-window / tanstack-virtual) in TableView so initial render is ~constant. Defer until product hits real >1k row decks, but the cliff is in place.


## 2026-05-13 — I-7600 verification + edge-case sweep

### I-7600 — `propertyOrder` first-class, dangling-tolerant — verified done — P3
- Multi-view (3 table views) drag-reorder of "C onto B" rewrote `db.properties` AND every view's `propertyOrder` consistently to `[title,a,c,b]`. Empty propertyOrder falls through to `db.properties` (verified on `db_b7600_empty`). Adding a new property appends to every view's propertyOrder (`prop_mp46jqllryky` ended at the tail in all 3 views). Deleting a property scrubs it from propertyOrder (and from `hiddenProperties` already by prior commit). Confirms commit d30c388 + store.ts:1411-1421 are airtight.

### I-7601 — AI panel empty-state copy is informative + actionable — verified — P3
- Open the AI panel with no thread: shows "Ask anything about your workspace. I can search pages, summarise content, draft text, and more." + a quiet "Models: GPT-5.2 · Claude Opus 4.7 · Gemini 3 · Auto (demo)" line + credit count. `ai-msg-0` correctly doesn't exist; no console warnings. Good empty state — no broken layout, no spurious `ai-msg-*` shells.

### I-7602 — Hidden property within propertyOrder respects both — verified — P3
- Injected `db_b7600_hidden` view with `hiddenProperties:['prop_beta']` and `propertyOrder:['prop_gamma','prop_beta','prop_alpha','prop_title']`. Headers rendered `[Gamma, Alpha, Title]` — Beta hidden, Gamma and Alpha in propertyOrder positions. The two filters compose correctly: propertyOrder for ordering, hiddenProperties for visibility.

### I-7603 — Public form date should validate range + format client-side — open — P2
- Companion to B-7603. Date inputs should reject 5-digit years and clearly out-of-range values BEFORE writing to storage. Add a property-level `validation` config to View.form for min/max date, required flag, regex for text, length cap. Avoids passing junk into the host DB which renders dates with `Date.toLocaleDateString` and silently fails on `Invalid Date`.
- Bonus: surface a "required" UI marker (red asterisk) consistent with title's already-implicit-required behaviour.

### I-7604 — `blockToMarkdown` should alias common foreign block types — open — P3
- Companion to B-7601. `paragraph`, `p`, `body`, `richtext` are common in imports from outside tools. Currently they fall through to `<!-- ${type} -->`. Add an alias map at the top of `blockToMarkdown` (or normalise in `normalizeState`) so exports survive a round-trip from Markdown / Notion API imports / AI-generated tree.
- Even better: route unknown block types through `htmlToInlineMarkdown(content)` when the block has a `content` field, instead of dropping the text entirely.

### I-7605 — Restore banner copy + behaviour for "ancestor-in-trash" case — open — P2
- Companion to B-7604. When the current page is `isInTrash:false` but an ancestor is trashed, the existing banner copy "This page is in Trash" is wrong. Replace with: "A parent page is in Trash. [Restore parent] [Open parent]" — actionable, explicit. Wire Restore to flip the trashed ancestor (cascading further up if needed) and re-evaluate.
- Avoid showing the Delete-permanently button in this case — the current page itself isn't trashed and shouldn't be perma-deletable from here.

