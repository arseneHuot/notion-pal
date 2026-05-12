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

### I-401 — Rollup property editor needs to surface the function picker in the UI (high, open)
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

### I-417 — Database table: type picker shown on column creation (high, open)
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


