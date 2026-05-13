import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useStore, setUI, toggleDarkMode, toggleFavorite, updatePage, deletePage, duplicatePage, movePageToTeamspace } from "@/lib/store";
import { PanelLeftOpen, MoreHorizontal, Star, Share, MessageCircle, Clock, Sun, Moon, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
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

  // Listen for the `open-page-history` custom event so the page-options
  // menu (B-5103) and any future surface can open the history dialog.
  useEffect(() => {
    function onOpen() { setHistoryOpen(true); }
    window.addEventListener("open-page-history", onOpen);
    return () => window.removeEventListener("open-page-history", onOpen);
  }, []);

  // Breadcrumb path: page → ... → root ancestor → teamspace name (B-5601 /
  // B-5705). The teamspace anchor lives in `state.teamspaces[teamspaceId]`
  // and is rendered as a non-clickable leading chip so users always see
  // which teamspace the current page belongs to. Without this, moving a
  // page across teamspaces left the breadcrumb pointing at the old chain
  // (which still walks parentId only).
  const teamspaces = useStore((s) => s.teamspaces);
  const breadcrumbs: { id: string; title: string; icon: string | null; kind?: "teamspace" }[] = [];
  if (page) {
    let p: typeof page | null = page;
    while (p) {
      breadcrumbs.unshift({ id: p.id, title: p.title || "Untitled", icon: p.icon });
      p = p.parentId ? pages[p.parentId] : null;
    }
    const rootTeamspaceId = breadcrumbs[0] && pages[breadcrumbs[0].id]?.teamspaceId;
    const ts = rootTeamspaceId ? teamspaces[rootTeamspaceId] : null;
    if (ts) {
      breadcrumbs.unshift({ id: ts.id, title: ts.name, icon: ts.icon, kind: "teamspace" });
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
            {/* Teamspace chip: non-clickable identity marker. */}
            {b.kind === "teamspace" ? (
              <span
                className="truncate text-xs text-muted-foreground"
                data-testid={`breadcrumb-teamspace-${b.id}`}
                title={`Teamspace: ${b.title}`}
              >
                {b.icon ?? "🗂"} {b.title}
              </span>
            ) : i === breadcrumbs.length - 1 ? (
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

function PageOptionsMenu({ page, close }: { page: { id: string; isWiki: boolean; isFavorite?: boolean; teamspaceId?: string | null }; close: () => void }) {
  const navigate = useNavigate();
  const teamspaces = useStore((s) => Object.values(s.teamspaces));
  return (
    <div className="absolute right-4 top-12 bg-card border border-border rounded-md shadow-lg py-1 w-64 z-40" data-testid="page-options-menu">
      <MenuItem
        label={page.isFavorite ? "Remove from favorites" : "Add to favorites"}
        testid="page-opt-favorite"
        onClick={() => {
          toggleFavorite(page.id);
          close();
        }}
      />
      <MenuItem
        label="Duplicate"
        testid="page-opt-duplicate"
        onClick={() => {
          const newId = duplicatePage(page.id);
          close();
          if (newId) navigate({ to: "/app/p/$pageId", params: { pageId: newId } });
        }}
      />
      <MenuItem
        label={page.isWiki ? "Undo wiki" : "Turn into wiki"}
        testid="page-opt-wiki"
        onClick={() => {
          updatePage(page.id, { isWiki: !page.isWiki });
          close();
        }}
      />
      <MenuItem
        label="Word count"
        testid="page-opt-wordcount"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("show-word-count"));
          close();
        }}
      />
      <MenuItem
        label="Copy link"
        testid="page-opt-copylink"
        onClick={() => {
          if (typeof window !== "undefined") {
            navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
          }
          close();
        }}
      />
      <MenuItem
        label="Export as Markdown"
        testid="page-opt-export-md"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("export-page-markdown"));
          close();
        }}
      />
      <MenuItem
        label="Print / save as PDF"
        testid="page-opt-print"
        onClick={() => {
          close();
          setTimeout(() => window.print(), 100);
        }}
      />
      <MenuItem
        label="Page history"
        testid="page-opt-history"
        onClick={() => {
          close();
          window.dispatchEvent(new CustomEvent("open-page-history"));
        }}
      />
      <div className="border-t border-border my-1" />
      <div className="px-3 py-1 text-[10px] uppercase text-muted-foreground">Move to teamspace</div>
      {teamspaces.map((ts) => (
        <MenuItem
          key={ts.id}
          label={`${ts.icon} ${ts.name}`}
          testid={`page-opt-move-${ts.id}`}
          onClick={() => {
            // Cascade the new teamspaceId to every descendant so the
            // sub-tree stays consistent (B-5101). updatePage alone only
            // touched the root, leaving children with the old teamspaceId.
            movePageToTeamspace(page.id, ts.id);
            close();
          }}
        />
      ))}
      <div className="border-t border-border my-1" />
      <MenuItem
        label="Move to Trash"
        testid="page-opt-trash"
        destructive
        onClick={() => {
          deletePage(page.id);
          close();
          navigate({ to: "/app" });
        }}
      />
    </div>
  );
}

function MenuItem({ label, onClick, children, testid, destructive }: { label: string; onClick?: () => void; children?: React.ReactNode; testid?: string; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent text-left ${destructive ? "text-destructive" : ""}`}
    >
      {children}
      {label}
    </button>
  );
}
