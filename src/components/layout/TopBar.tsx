import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useStore, setUI, toggleDarkMode, toggleFavorite, updatePage } from "@/lib/store";
import { PanelLeftOpen, MoreHorizontal, Star, Share, MessageCircle, Clock, Sun, Moon, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { PageHistoryDialog } from "@/components/page/PageHistoryDialog";
import { ShareDialog } from "@/components/page/ShareDialog";

export function TopBar() {
  const sidebarOpen = useStore((s) => s.ui.sidebarOpen);
  const darkMode = useStore((s) => s.ui.darkMode);
  const params = useParams({ strict: false }) as { pageId?: string };
  const page = useStore((s) => (params.pageId ? s.pages[params.pageId] : null));
  const pages = useStore((s) => s.pages);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Breadcrumb path
  const breadcrumbs: { id: string; title: string; icon: string | null }[] = [];
  if (page) {
    let p: typeof page | null = page;
    while (p) {
      breadcrumbs.unshift({ id: p.id, title: p.title || "Untitled", icon: p.icon });
      p = p.parentId ? pages[p.parentId] : null;
    }
  }

  return (
    <header className="h-11 border-b border-border flex items-center px-3 gap-2 shrink-0">
      {!sidebarOpen && (
        <button
          onClick={() => setUI({ sidebarOpen: true })}
          className="p-1 rounded hover:bg-accent"
          aria-label="Open sidebar"
          data-testid="open-sidebar"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-0" data-testid="breadcrumbs">
        {breadcrumbs.map((b, i) => (
          <span key={b.id} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="size-3" />}
            {/* The last crumb is the current page — render as plain text. */}
            {i === breadcrumbs.length - 1 ? (
              <span className="truncate text-foreground" data-testid={`breadcrumb-${b.id}`}>
                {b.icon ?? "📄"} {b.title}
              </span>
            ) : (
              <Link
                to="/app/p/$pageId"
                params={{ pageId: b.id }}
                className="truncate hover:text-foreground hover:underline"
                data-testid={`breadcrumb-${b.id}`}
              >
                {b.icon ?? "📄"} {b.title}
              </Link>
            )}
          </span>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1">
        {page && !page.isInTrash && (
          <>
            <button
              onClick={() => setHistoryOpen(true)}
              className="text-xs px-2 py-1 rounded hover:bg-accent flex items-center gap-1 text-muted-foreground"
              data-testid="history-btn"
              title="History"
            >
              <Clock className="size-3.5" />
              <span className="hidden md:inline">{new Date(page.updatedAt).toLocaleDateString()}</span>
            </button>
            <button
              onClick={() => setShareOpen(true)}
              className="text-xs px-2 py-1 rounded hover:bg-accent flex items-center gap-1"
              data-testid="share-btn"
            >
              <Share className="size-3.5" /> Share
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-comments"))}
              className="p-1.5 rounded hover:bg-accent"
              aria-label="Comments"
              data-testid="comments-btn"
            >
              <MessageCircle className="size-4" />
            </button>
            <button
              onClick={() => toggleFavorite(page.id)}
              className="p-1.5 rounded hover:bg-accent"
              aria-label="Favorite"
              data-testid="fav-btn"
              title="Favorite"
            >
              <Star className={`size-4 ${page.isFavorite ? "fill-yellow-400 text-yellow-500" : ""}`} />
            </button>
          </>
        )}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-ai-chat"))}
          className="p-1.5 rounded hover:bg-accent"
          aria-label="Ask AI"
          data-testid="ai-btn"
          title="Ask AI"
        >
          <Sparkles className="size-4" />
        </button>
        <button
          onClick={() => toggleDarkMode()}
          className="p-1.5 rounded hover:bg-accent"
          aria-label="Toggle dark mode"
          data-testid="dark-btn"
        >
          {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        {page && (
          <button
            onClick={() => setPageMenuOpen((v) => !v)}
            className="p-1.5 rounded hover:bg-accent"
            aria-label="Page menu"
            data-testid="page-options"
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}
      </div>
      {page && pageMenuOpen && (
        <PageOptionsMenu page={page} close={() => setPageMenuOpen(false)} />
      )}
      {page && historyOpen && (
        <PageHistoryDialog page={page} open={historyOpen} onClose={() => setHistoryOpen(false)} />
      )}
      {page && shareOpen && (
        <ShareDialog page={page} open={shareOpen} onClose={() => setShareOpen(false)} />
      )}
    </header>
  );
}

function PageOptionsMenu({ page, close }: { page: { id: string; isWiki: boolean }; close: () => void }) {
  return (
    <div className="absolute right-4 top-12 bg-card border border-border rounded-md shadow-lg py-1 w-64 z-40">
      <MenuItem label="Customize page">
        <Sparkles className="size-3.5" />
      </MenuItem>
      <MenuItem
        label={page.isWiki ? "Undo wiki" : "Turn into wiki"}
        onClick={() => {
          updatePage(page.id, { isWiki: !page.isWiki });
          close();
        }}
      />
      <MenuItem
        label="Word count"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("show-word-count"));
          close();
        }}
      />
      <MenuItem
        label="Copy link"
        onClick={() => {
          if (typeof window !== "undefined") {
            navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
          }
          close();
        }}
      />
    </div>
  );
}

function MenuItem({ label, onClick, children }: { label: string; onClick?: () => void; children?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent text-left"
    >
      {children}
      {label}
    </button>
  );
}
