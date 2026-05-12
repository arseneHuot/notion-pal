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

