import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "p")) {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActiveIndex(0);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    function onCustomOpen() {
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
    const matchingPages = Object.values(pages)
      .filter((p) => !p.isInTrash)
      .filter((p) => {
        if (!q) return true;
        if (p.title.toLowerCase().includes(q)) return true;
        // Also search block content
        for (const bid of p.blocks) {
          const b = blocks[bid];
          if (b && "content" in b && typeof b.content === "string" && stripHtml(b.content).toLowerCase().includes(q)) return true;
        }
        return false;
      })
      .slice(0, 10);

    const matchingDbs = Object.values(databases)
      .filter((d) => !d.isInTrash && (!q || d.name.toLowerCase().includes(q)))
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

    const pageItems = matchingPages.map((p) => ({
      id: `page-${p.id}`,
      label: p.title || "Untitled",
      icon: <span className="text-base">{p.icon ?? "📄"}</span>,
      action: () => { navigate({ to: "/app/p/$pageId", params: { pageId: p.id } }); setOpen(false); },
      group: "Pages",
    }));

    const dbItems = matchingDbs.map((d) => ({
      id: `db-${d.id}`,
      label: d.name,
      icon: <span className="text-base">{d.icon ?? "🗄️"}</span>,
      action: () => { navigate({ to: "/app/db/$databaseId", params: { databaseId: d.id } }); setOpen(false); },
      group: "Databases",
    }));

    const matchedActions = actions.filter((a) => !q || a.label.toLowerCase().includes(q));

    return [...matchedActions, ...pageItems, ...dbItems];
  }, [pages, databases, blocks, query, darkMode, navigate]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24" onClick={() => setOpen(false)}>
      <div className="bg-popover border border-border rounded-lg shadow-xl w-[600px] max-h-[60vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
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
          {items.length === 0 && <div className="px-3 py-4 text-sm text-muted-foreground">No results</div>}
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
