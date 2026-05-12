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

