import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, createPage, toggleDarkMode } from "@/lib/store";
import { useNavigate } from "@tanstack/react-router";
import { Search, FileText, Plus, Trash, Settings, Sun, Moon, Sparkles, Calendar, Mail, Inbox } from "lucide-react";
import { stripHtml } from "@/lib/text";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const pages = useStore((s) => s.pages);
  const databases = useStore((s) => s.databases);
  const darkMode = useStore((s) => s.ui.darkMode);
  const blocks = useStore((s) => s.blocks);

  // Track which editor element + range owned the selection when the palette
  // opened. Restored on close so power-users keep their cursor / highlight
  // (B-5608).
  const savedEditorRef = useRef<HTMLElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  function captureSelection() {
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (!sel || sel.rangeCount === 0) {
      savedEditorRef.current = null;
      savedRangeRef.current = null;
      return;
    }
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    const el = node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
    const editor = el?.closest("[contenteditable]") as HTMLElement | null;
    if (editor) {
      savedEditorRef.current = editor;
      savedRangeRef.current = range.cloneRange();
    } else {
      savedEditorRef.current = null;
      savedRangeRef.current = null;
    }
  }

  function restoreSelection() {
    const editor = savedEditorRef.current;
    const range = savedRangeRef.current;
    if (!editor || !range) return;
    editor.focus();
    const sel = window.getSelection();
    if (sel) {
      try {
        sel.removeAllRanges();
        sel.addRange(range);
      } catch {
        // ignore if the range no longer applies
      }
    }
    savedEditorRef.current = null;
    savedRangeRef.current = null;
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "p")) {
        e.preventDefault();
        setOpen((v) => {
          if (!v) captureSelection();
          else restoreSelection();
          return !v;
        });
        setQuery("");
        setActiveIndex(0);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        restoreSelection();
      }
    }
    function onCustomOpen() {
      captureSelection();
      setOpen(true);
      setQuery("");
      setActiveIndex(0);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onCustomOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onCustomOpen);
    };
  }, [open]);

  const items = useMemo(() => {
    const q = query.toLowerCase().trim();
    // Word-order-insensitive matching (B-4204). Split the query into tokens
    // and require all tokens to appear (in any order) in the haystack.
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const allMatch = (hay: string) => tokens.every((t) => hay.includes(t));

    const matchingPages = Object.values(pages)
      .filter((p) => !p.isInTrash)
      .filter((p) => {
        if (!q) return true;
        // Defensive: malformed / partially-hydrated pages can have a missing
        // title or blocks array. Coalesce to safe defaults so the palette
        // never throws on a single keystroke (B-3206).
        if (allMatch((p.title ?? "").toLowerCase())) return true;
        for (const bid of p.blocks ?? []) {
          const b = blocks[bid];
          if (b && "content" in b && typeof b.content === "string" && allMatch(stripHtml(b.content).toLowerCase())) return true;
        }
        return false;
      })
      .slice(0, 10);

    const matchingDbs = Object.values(databases)
      .filter((d) => !d.isInTrash && (!q || allMatch((d.name ?? "").toLowerCase())))
      .slice(0, 5);

    const actions: { id: string; label: string; icon: React.ReactNode; action: () => void; group: string }[] = [
      {
        id: "new-page",
        label: "Create new page",
        icon: <Plus className="size-4" />,
        action: () => {
          const id = createPage({ title: "" });
          navigate({ to: "/app/p/$pageId", params: { pageId: id } });
          setOpen(false);
        },
        group: "Actions",
      },
      {
        id: "calendar",
        label: "Open Calendar",
        icon: <Calendar className="size-4" />,
        action: () => { navigate({ to: "/app/calendar" }); setOpen(false); },
        group: "Navigate",
      },
      {
        id: "mail",
        label: "Open Mail",
        icon: <Mail className="size-4" />,
        action: () => { navigate({ to: "/app/mail" }); setOpen(false); },
        group: "Navigate",
      },
      {
        id: "inbox",
        label: "Open Inbox",
        icon: <Inbox className="size-4" />,
        action: () => { navigate({ to: "/app/inbox" }); setOpen(false); },
        group: "Navigate",
      },
      {
        id: "trash",
        label: "Open Trash",
        icon: <Trash className="size-4" />,
        action: () => { navigate({ to: "/app/trash" }); setOpen(false); },
        group: "Navigate",
      },
      {
        id: "settings",
        label: "Open Settings",
        icon: <Settings className="size-4" />,
        action: () => { navigate({ to: "/app/settings" }); setOpen(false); },
        group: "Navigate",
      },
      {
        id: "dark-mode",
        label: darkMode ? "Switch to light mode" : "Switch to dark mode",
        icon: darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />,
        action: () => { toggleDarkMode(); setOpen(false); },
        group: "Settings",
      },
      {
        id: "ai",
        label: "Ask AI",
        icon: <Sparkles className="size-4" />,
        action: () => { window.dispatchEvent(new CustomEvent("open-ai-chat")); setOpen(false); },
        group: "AI",
      },
    ];

    // For each matching page, find the FIRST block whose content matches the
    // query. When the page itself doesn't match by title, we use that block
    // id as a hash anchor so clicking the Pages-group row jumps to the right
    // spot instead of page-top (B-6103).
    const firstMatchingBlockByPage = new Map<string, string>();
    if (q) {
      for (const p of matchingPages) {
        const titleHit = allMatch((p.title ?? "").toLowerCase());
        if (titleHit) continue; // navigate to page-top
        for (const bid of p.blocks ?? []) {
          const b = blocks[bid];
          if (b && "content" in b && typeof b.content === "string" && allMatch(stripHtml(b.content).toLowerCase())) {
            firstMatchingBlockByPage.set(p.id, bid);
            break;
          }
        }
      }
    }

    const pageItems = matchingPages.map((p) => {
      const anchorBlockId = firstMatchingBlockByPage.get(p.id);
      return {
        id: `page-${p.id}`,
        label: p.title || "Untitled",
        icon: <span className="text-base">{p.icon ?? "📄"}</span>,
        action: () => {
          // Jump to the matching block when title didn't match, otherwise to
          // page-top. Uses the same `#block-<id>` mechanism PageView already
          // honours for persistent ring-highlight (B-4412 / I-4402).
          if (anchorBlockId) {
            navigate({ to: "/app/p/$pageId", params: { pageId: p.id }, hash: `block-${anchorBlockId}` });
          } else {
            navigate({ to: "/app/p/$pageId", params: { pageId: p.id } });
          }
          setOpen(false);
        },
        group: "Pages",
      };
    });

    const dbItems = matchingDbs.map((d) => ({
      id: `db-${d.id}`,
      label: d.name,
      icon: <span className="text-base">{d.icon ?? "🗄️"}</span>,
      action: () => { navigate({ to: "/app/db/$databaseId", params: { databaseId: d.id } }); setOpen(false); },
      group: "Databases",
    }));

    // Block-content snippets (B-3011): when the user types a multi-char query,
    // surface up to 5 block matches with a short text excerpt and the parent
    // page label. Clicking jumps to the page and we also scroll the block
    // into view via a hash-anchor query.
    const blockMatches: { id: string; label: string; icon: React.ReactNode; action: () => void; group: string }[] = [];
    if (q.length >= 2) {
      // Surface up to 10 block-snippet matches (raised from 5, B-4214). One
      // per page so a single chatty page can't crowd out other matches.
      // Dedupe against `pageItems` — if a page is already in the Pages
      // group (title match), skip its block matches to keep the result
      // list compact (B-6009 / I-6005).
      const BLOCK_MATCH_CAP = 10;
      const pagesAlreadyListed = new Set(matchingPages.map((p) => p.id));
      for (const p of Object.values(pages)) {
        if (p.isInTrash) continue;
        if (pagesAlreadyListed.has(p.id)) continue;
        if (blockMatches.length >= BLOCK_MATCH_CAP) break;
        for (const bid of p.blocks ?? []) {
          const b = blocks[bid];
          if (!b || !("content" in b) || typeof b.content !== "string") continue;
          const plain = stripHtml(b.content);
          const plainLower = plain.toLowerCase();
          if (!allMatch(plainLower)) continue;
          // Excerpt anchored on the FIRST matching token so the user sees
          // context for why this block matched.
          const idx = plainLower.indexOf(tokens[0] ?? q);
          if (idx === -1) continue;
          const start = Math.max(0, idx - 20);
          const snippet = (start > 0 ? "…" : "") + plain.slice(start, idx + q.length + 30) + (plain.length > idx + q.length + 30 ? "…" : "");
          blockMatches.push({
            id: `block-${bid}`,
            label: `${snippet}  ·  ${p.title || "Untitled"}`,
            icon: <span className="text-base">¶</span>,
            action: () => {
              // Navigate and add the block id as a hash so back/forward
              // restores the highlight (I-4402). A small useEffect on the
              // page reads `location.hash` and re-runs the scroll+highlight.
              navigate({ to: "/app/p/$pageId", params: { pageId: p.id }, hash: `block-${bid}` });
              setOpen(false);
              // Also scroll immediately for the case where the route didn't
              // change (we were already on this page).
              setTimeout(() => {
                const el = document.querySelector(`[data-block-id="${bid}"]`);
                if (el && "scrollIntoView" in el) {
                  (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
                  (el as HTMLElement).classList.add("ring-1", "ring-blue-400");
                  setTimeout(() => (el as HTMLElement).classList.remove("ring-1", "ring-blue-400"), 1500);
                }
              }, 200);
            },
            group: "Block matches",
          });
          break; // one snippet per page
        }
      }
    }

    const matchedActions = actions.filter((a) => !q || a.label.toLowerCase().includes(q));

    return [...matchedActions, ...pageItems, ...dbItems, ...blockMatches];
  }, [pages, databases, blocks, query, darkMode, navigate]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24"
      onClick={() => { setOpen(false); restoreSelection(); }}
    >
      <div
        className="bg-popover border border-border rounded-lg shadow-xl w-[600px] max-h-[60vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        data-testid="command-palette"
      >
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(items.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                items[activeIndex]?.action();
              }
            }}
            placeholder="Search pages, run a command..."
            className="flex-1 bg-transparent outline-none text-sm"
            data-testid="command-input"
          />
          <kbd className="text-xs text-muted-foreground">⌘K</kbd>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {items.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground" data-testid="cmd-empty">
              No results
            </div>
          )}
          {(() => {
            const grouped: Record<string, typeof items> = {};
            items.forEach((i) => {
              if (!grouped[i.group]) grouped[i.group] = [];
              grouped[i.group].push(i);
            });
            let idx = -1;
            return Object.entries(grouped).map(([group, arr]) => (
              <div key={group}>
                <div className="px-3 py-1 text-[10px] uppercase text-muted-foreground">{group}</div>
                {arr.map((item) => {
                  idx += 1;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      data-active={isActive}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={item.action}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm ${isActive ? "bg-accent" : "hover:bg-accent/50"}`}
                      data-testid={`cmd-${item.id}`}
                    >
                      {item.icon}
                      <span className="flex-1 truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
