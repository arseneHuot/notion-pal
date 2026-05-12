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

### I-006 — Form view public submission URL works without auth (medium, open)
- `/form/:dbId/:viewId` route should be readable publicly (no auth required) and store submissions to localStorage of the owner. Tricky without a real backend.

### I-007 — Synced block content mirroring (medium, done)
- The schema has synced-block and synced-block-ref but the runtime mirror is not implemented yet.

### I-008 — Keyboard shortcut reference panel (low, open)
- Cmd/Ctrl+? should open a modal listing all keyboard shortcuts.

### I-009 — Page banner cover image curated library (low, open)
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
