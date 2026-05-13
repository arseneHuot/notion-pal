import { useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  Search, Plus, Settings, Trash, ChevronDown, ChevronRight, Star, FileText,
  PanelLeftClose, Calendar as CalIcon, Mail as MailIcon, FileBox, MoreHorizontal,
  Inbox, Sparkles, ChevronsUpDown, Home, Bell, Database as DatabaseIcon,
} from "lucide-react";
import { useStore, createPage, togglePageExpanded, setUI, createTeamspace, deletePage, toggleFavorite, duplicatePage, reorderSiblingPages } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import type { Page, Teamspace } from "@/lib/types";

export function Sidebar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const workspace = useStore((s) => (s.currentWorkspaceId ? s.workspaces[s.currentWorkspaceId] : null));
  const teamspaces = useStore((s) => Object.values(s.teamspaces).filter((t) => t.workspaceId === s.currentWorkspaceId));
  const pages = useStore((s) => s.pages);
  const databases = useStore((s) => s.databases);
  const tsExpanded = useStore((s) => s.ui.teamspacesExpanded);
  const favoritesExpanded = useStore((s) => s.ui.favoritesExpanded);

  const favorites = useMemo(() => Object.values(pages).filter((p) => p.isFavorite && !p.isInTrash), [pages]);
  const databaseList = useMemo(() => Object.values(databases).filter((d) => !d.isInTrash), [databases]);

  function handleNewPage(teamspaceId: string | null = null) {
    const pageId = createPage({ title: "", teamspaceId });
    navigate({ to: "/app/p/$pageId", params: { pageId } });
    closeOnMobile();
  }

  // Auto-dismiss the drawer after navigation on small screens.
  function closeOnMobile() {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
      setUI({ sidebarOpen: false });
    }
  }

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full overflow-y-auto flex flex-col z-30 md:relative max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:shadow-xl">
      <div className="p-3 flex items-center justify-between">
        <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-sidebar-accent text-sm font-medium flex-1 min-w-0">
          <span className="text-base">{workspace?.icon ?? "📓"}</span>
          <span className="truncate">{workspace?.name ?? "Workspace"}</span>
          <ChevronsUpDown className="size-3.5 opacity-50 ml-auto" />
        </button>
        <button
          onClick={() => setUI({ sidebarOpen: false })}
          className="p-1 rounded hover:bg-sidebar-accent"
          aria-label="Close sidebar"
          data-testid="close-sidebar"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <div className="px-2 space-y-0.5">
        <SidebarButton icon={<Search className="size-4" />} label="Search" testid="sidebar-search" onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))} shortcut="⌘K" />
        <SidebarButton icon={<Sparkles className="size-4" />} label="Ask AI" testid="sidebar-ai" onClick={() => window.dispatchEvent(new CustomEvent("open-ai-chat"))} />
        <SidebarButton icon={<Home className="size-4" />} label="Home" testid="sidebar-home" onClick={() => { navigate({ to: "/app" }); closeOnMobile(); }} />
        <SidebarButton icon={<Inbox className="size-4" />} label="Inbox" testid="sidebar-inbox" onClick={() => { navigate({ to: "/app/inbox" }); closeOnMobile(); }} />
        <SidebarButton icon={<CalIcon className="size-4" />} label="Calendar" testid="sidebar-calendar" onClick={() => { navigate({ to: "/app/calendar" }); closeOnMobile(); }} />
        <SidebarButton icon={<MailIcon className="size-4" />} label="Mail" testid="sidebar-mail" onClick={() => { navigate({ to: "/app/mail" }); closeOnMobile(); }} />
        <SidebarButton icon={<FileBox className="size-4" />} label="Templates" testid="sidebar-templates" onClick={() => { navigate({ to: "/app/templates" }); closeOnMobile(); }} />
      </div>

      {favorites.length > 0 && (
        <div className="mt-4">
          <SectionHeader
            label="Favorites"
            expanded={favoritesExpanded}
            onToggle={() => setUI({ favoritesExpanded: !favoritesExpanded })}
          />
          {favoritesExpanded && (
            <div className="mt-1 space-y-0.5">
              {favorites.map((p) => (
                <PageItem key={p.id} page={p} depth={0} testidPrefix="sidebar-fav" />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex-1">
        {teamspaces.map((ts) => (
          <TeamspaceSection
            key={ts.id}
            teamspace={ts}
            expanded={tsExpanded[ts.id] ?? true}
            onToggle={() => setUI({ teamspacesExpanded: { ...tsExpanded, [ts.id]: !(tsExpanded[ts.id] ?? true) } })}
            onNewPage={() => handleNewPage(ts.id)}
          />
        ))}
        <OrphanSection />
        <AddTeamspaceForm />
      </div>

      <div className="mt-2 px-2 pb-3 border-t border-sidebar-border pt-3 space-y-0.5">
        <SidebarButton icon={<Trash className="size-4" />} label="Trash" testid="sidebar-trash" onClick={() => { navigate({ to: "/app/trash" }); closeOnMobile(); }} />
        <SidebarButton icon={<Settings className="size-4" />} label="Settings" testid="sidebar-settings" onClick={() => { navigate({ to: "/app/settings" }); closeOnMobile(); }} />
        <div className="flex items-center gap-2 px-2 py-1.5 rounded text-sm">
          <div className="size-6 rounded-full bg-primary/10 grid place-items-center text-xs">
            {user?.avatar ?? "🧑"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs truncate">{user?.email}</div>
          </div>
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => signOut()}
            data-testid="sign-out"
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarButton({ icon, label, onClick, shortcut, testid }: { icon: React.ReactNode; label: string; onClick?: () => void; shortcut?: string; testid?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-sidebar-accent text-left"
      data-testid={testid}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-xs text-muted-foreground">{shortcut}</span>}
    </button>
  );
}

function SectionHeader({ label, expanded, onToggle }: { label: string; expanded: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
    >
      {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
      <span>{label}</span>
    </button>
  );
}

function TeamspaceSection({ teamspace, expanded, onToggle, onNewPage }: { teamspace: Teamspace; expanded: boolean; onToggle: () => void; onNewPage: () => void }) {
  const pages = useStore((s) => s.pages);
  const databases = useStore((s) => s.databases);
  const rootPages = useMemo(
    () => Object.values(pages)
      .filter((p) => p.teamspaceId === teamspace.id && !p.parentId && !p.isInTrash)
      .sort((a, b) => (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt)),
    [pages, teamspace.id],
  );
  const rootDbs = useMemo(() => Object.values(databases).filter((d) => !d.isInline && !d.isInTrash && !d.parentId), [databases]);

  return (
    <div>
      <div className="group flex items-center px-2 py-1 hover:bg-sidebar-accent rounded">
        <button onClick={onToggle} className="flex items-center gap-1.5 flex-1 min-w-0 text-sm" data-testid={`ts-${teamspace.name}`}>
          {expanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
          <span className="text-base">{teamspace.icon}</span>
          <span className="truncate">{teamspace.name}</span>
        </button>
        <button onClick={onNewPage} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-sidebar-accent rounded" aria-label="New page" data-testid={`ts-new-${teamspace.name}`}>
          <Plus className="size-3.5" />
        </button>
      </div>
      {expanded && (
        <div className="ml-3 mt-0.5 space-y-0.5">
          {rootPages.map((p) => (
            <PageItem key={p.id} page={p} depth={0} />
          ))}
          {rootPages.length === 0 && rootDbs.length === 0 && (
            <button
              onClick={onNewPage}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 flex items-center gap-1"
              data-testid={`empty-${teamspace.name}`}
            >
              <Plus className="size-3" /> Add page
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PageItem({ page, depth, testidPrefix = "sidebar-page" }: { page: Page; depth: number; testidPrefix?: string }) {
  const navigate = useNavigate();
  const allPages = useStore((s) => s.pages);
  const expanded = useStore((s) => s.ui.expandedPages[page.id]);
  const params = useParams({ strict: false }) as { pageId?: string };
  const active = params.pageId === page.id;
  const [menuOpen, setMenuOpen] = useState(false);

  const children = useMemo(
    () => Object.values(allPages)
      .filter((p) => p.parentId === page.id && !p.isInTrash)
      .sort((a, b) => (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt)),
    [allPages, page.id],
  );

  return (
    <div>
      <div
        className={`group flex items-center pr-1 rounded text-sm cursor-grab active:cursor-grabbing ${active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent"}`}
        style={{ paddingLeft: depth * 12 + 6 }}
        draggable
        data-page-id={page.id}
        data-testid={`${testidPrefix}-${page.id}`}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("application/x-sidebar-page-id", page.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-sidebar-page-id")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={(e) => {
          const sourceId = e.dataTransfer.getData("application/x-sidebar-page-id");
          if (!sourceId || sourceId === page.id) return;
          e.preventDefault();
          e.stopPropagation();
          // Only same-parent reorder for now (cross-parent would need movePage).
          const sourcePage = allPages[sourceId];
          if (!sourcePage) return;
          if (sourcePage.parentId !== page.parentId || sourcePage.teamspaceId !== page.teamspaceId) return;
          reorderSiblingPages(sourceId, page.id);
        }}
      >
        <button
          className="p-0.5 rounded hover:bg-sidebar-accent/60"
          onClick={(e) => {
            e.stopPropagation();
            togglePageExpanded(page.id);
          }}
          aria-label={expanded ? `Collapse ${page.title || "Untitled"}` : `Expand ${page.title || "Untitled"}`}
          aria-expanded={expanded}
          title={expanded ? "Collapse" : "Expand"}
          data-testid={`expand-${page.id}`}
        >
          {expanded ? (
            <ChevronDown className="size-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={() => navigate({ to: "/app/p/$pageId", params: { pageId: page.id } })}
          className="flex-1 flex items-center gap-1.5 py-1 min-w-0 text-left"
        >
          <span className="text-sm shrink-0">{page.icon ?? "📄"}</span>
          <span className="truncate">{page.title || "Untitled"}</span>
        </button>
        <div className="opacity-0 group-hover:opacity-100 flex items-center">
          <button
            className="p-1 hover:bg-sidebar-accent/60 rounded"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label="More"
            data-testid={`page-menu-${page.id}`}
          >
            <MoreHorizontal className="size-3.5" />
          </button>
          <button
            className="p-1 hover:bg-sidebar-accent/60 rounded"
            onClick={(e) => {
              e.stopPropagation();
              const id = createPage({ parentId: page.id, teamspaceId: page.teamspaceId });
              navigate({ to: "/app/p/$pageId", params: { pageId: id } });
            }}
            aria-label="New subpage"
            data-testid={`page-new-${page.id}`}
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="ml-6 bg-card border border-border rounded-md shadow-md py-1 my-1 w-56">
          <button
            onClick={() => {
              toggleFavorite(page.id);
              setMenuOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-2"
            data-testid={`pmenu-favorite-${page.id}`}
          >
            <Star className="size-3.5" /> {page.isFavorite ? "Remove from favorites" : "Add to favorites"}
          </button>
          <button
            onClick={() => {
              const newId = duplicatePage(page.id);
              setMenuOpen(false);
              if (newId) navigate({ to: "/app/p/$pageId", params: { pageId: newId } });
            }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-2"
            data-testid={`pmenu-duplicate-${page.id}`}
          >
            <FileText className="size-3.5" /> Duplicate
          </button>
          <button
            onClick={() => {
              const id = createPage({ parentId: page.id, teamspaceId: page.teamspaceId });
              setMenuOpen(false);
              navigate({ to: "/app/p/$pageId", params: { pageId: id } });
            }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-2"
            data-testid={`pmenu-newsub-${page.id}`}
          >
            <Plus className="size-3.5" /> New sub-page
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(`${window.location.origin}/app/p/${page.id}`).catch(() => undefined);
              setMenuOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-2"
            data-testid={`pmenu-copylink-${page.id}`}
          >
            <FileText className="size-3.5" /> Copy link
          </button>
          <button
            onClick={() => {
              deletePage(page.id);
              navigate({ to: "/app" });
              setMenuOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-2 text-destructive"
            data-testid={`pmenu-trash-${page.id}`}
          >
            <Trash className="size-3.5" /> Move to Trash
          </button>
        </div>
      )}
      {expanded && children.length > 0 && (
        <div>
          {children.map((c) => (
            <PageItem key={c.id} page={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrphanSection() {
  // Pages with no teamspaceId AND no parent are otherwise invisible in the
  // sidebar (B-4604). Render them under a small "Other" header so users can
  // navigate to them without falling back to Cmd+K.
  const pages = useStore((s) => s.pages);
  const orphans = useMemo(
    () => Object.values(pages)
      .filter((p) => !p.teamspaceId && !p.parentId && !p.isInTrash)
      .sort((a, b) => (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt)),
    [pages],
  );
  if (orphans.length === 0) return null;
  return (
    <div className="px-2 mt-2" data-testid="sidebar-other-section">
      <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">Other</div>
      {orphans.map((p) => (
        <PageItem key={p.id} page={p} depth={0} />
      ))}
    </div>
  );
}

function AddTeamspaceForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        data-testid="add-teamspace"
      >
        <Plus className="size-3.5" /> Add teamspace
      </button>
    );
  }
  return (
    <div className="px-3 py-1 flex gap-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            createTeamspace({ name: name.trim() });
            setName("");
            setOpen(false);
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Teamspace name"
        className="flex-1 bg-background border border-input rounded text-xs px-1 py-0.5"
        data-testid="add-teamspace-input"
      />
      <button
        onClick={() => {
          if (name.trim()) {
            createTeamspace({ name: name.trim() });
            setName("");
            setOpen(false);
          }
        }}
        className="text-xs bg-primary text-primary-foreground rounded px-2"
      >
        Add
      </button>
    </div>
  );
}
