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

### I-004 — Nested toggle/bullet/numbered children (high, open)
- Toggles currently show "(Toggle children — coming soon)". We need real child-blocks via a tree structure.

### I-005 — Database column resize (medium, open)
- Drag the right edge of a column header to resize.

### I-006 — Form view public submission URL works without auth (medium, open)
- `/form/:dbId/:viewId` route should be readable publicly (no auth required) and store submissions to localStorage of the owner. Tricky without a real backend.

### I-007 — Synced block content mirroring (medium, open)
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

### I-207 — Database view menu lacks Filter and Sort (high, open)
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

### I-300 — Database row title cells should open a row-page on click (high, open)
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


