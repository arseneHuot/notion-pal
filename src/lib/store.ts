import { useEffect, useRef, useState } from "react";
import type {
  Automation,
  Block,
  CalendarEvent,
  Comment,
  Mail,
  NotionDatabase,
  Page,
  PageTemplate,
  Teamspace,
  UserProfile,
  Workspace,
  View,
  Property,
  DatabaseRow,
} from "./types";
import { uid } from "./id";

export interface AppState {
  schemaVersion: number;
  currentUser: UserProfile | null;
  workspaces: Record<string, Workspace>;
  currentWorkspaceId: string | null;
  teamspaces: Record<string, Teamspace>;
  pages: Record<string, Page>;
  blocks: Record<string, Block>;
  databases: Record<string, NotionDatabase>;
  rows: Record<string, DatabaseRow>;
  comments: Record<string, Comment>;
  templates: Record<string, PageTemplate>;
  automations: Record<string, Automation>;
  calendarEvents: Record<string, CalendarEvent>;
  mails: Record<string, Mail>;
  ui: {
    sidebarOpen: boolean;
    darkMode: boolean;
    expandedPages: Record<string, boolean>;
    favoritesExpanded: boolean;
    teamspacesExpanded: Record<string, boolean>;
    privateExpanded: boolean;
    sharedExpanded: boolean;
    // B-4206: Whether the Comments pane should show resolved entries.
    showResolvedComments?: boolean;
  };
}

function emptyState(): AppState {
  return {
    schemaVersion: 1,
    currentUser: null,
    workspaces: {},
    currentWorkspaceId: null,
    teamspaces: {},
    pages: {},
    blocks: {},
    databases: {},
    rows: {},
    comments: {},
    templates: {},
    automations: {},
    calendarEvents: {},
    mails: {},
    ui: {
      sidebarOpen: true,
      darkMode: false,
      expandedPages: {},
      favoritesExpanded: true,
      teamspacesExpanded: {},
      privateExpanded: true,
      sharedExpanded: false,
    },
  };
}

const GLOBAL_KEY = "notion-clone:global";

function userKey(userId: string) {
  return `notion-clone:user:${userId}`;
}

function loadFromStorage(userId: string | null): AppState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = userId
      ? window.localStorage.getItem(userKey(userId))
      : window.localStorage.getItem(GLOBAL_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    // simple migration
    if (!parsed.ui) parsed.ui = emptyState().ui;
    if (!parsed.calendarEvents) parsed.calendarEvents = {};
    if (!parsed.mails) parsed.mails = {};
    return parsed;
  } catch {
    return emptyState();
  }
}

function persist(state: AppState) {
  if (typeof window === "undefined") return;
  try {
    const uid = state.currentUser?.id;
    if (uid) {
      window.localStorage.setItem(userKey(uid), JSON.stringify(state));
    }
    // keep a global with just session user reference
    window.localStorage.setItem(
      GLOBAL_KEY,
      JSON.stringify({
        currentUserId: uid ?? null,
        darkMode: state.ui.darkMode,
      }),
    );
  } catch (e) {
    console.error("Failed to persist state", e);
  }
}

let _state: AppState = emptyState();
const listeners = new Set<() => void>();

function setState(next: AppState | ((prev: AppState) => AppState)) {
  const updated = typeof next === "function" ? (next as (p: AppState) => AppState)(_state) : next;
  _state = updated;
  persist(updated);
  for (const l of listeners) l();
  broadcastRehydrate();
}

// Cross-tab sync (B-2914 / I-2503 / I-2503 / I-2607 / I-2806).
// When another tab writes to the same user's storage key, rehydrate our
// in-memory state and notify subscribers. The `storage` event only fires in
// OTHER tabs (not the writer), so this can't loop. Also listens to a
// BroadcastChannel for lower-latency fan-out within the same browser, which
// localStorage debounces.
let _crossTabAttached = false;
let _bc: BroadcastChannel | null = null;
function attachCrossTabSync() {
  if (_crossTabAttached) return;
  if (typeof window === "undefined") return;
  _crossTabAttached = true;
  window.addEventListener("storage", (e) => {
    if (!e.key) return;
    const uid = _state.currentUser?.id;
    // Only react to our own user's key — ignore other workspaces and global.
    if (!uid || e.key !== userKey(uid)) return;
    try {
      const next = e.newValue ? (JSON.parse(e.newValue) as AppState) : null;
      if (!next) return;
      _state = next;
      for (const l of listeners) l();
    } catch {
      // ignore parse errors
    }
  });
  try {
    _bc = new BroadcastChannel("notion-clone");
    _bc.onmessage = (ev) => {
      const data = ev.data as { type: string; userId?: string } | undefined;
      if (!data) return;
      const uid = _state.currentUser?.id;
      if (data.type === "rehydrate" && uid && data.userId === uid) {
        try {
          const raw = window.localStorage.getItem(userKey(uid));
          if (!raw) return;
          const next = JSON.parse(raw) as AppState;
          _state = next;
          for (const l of listeners) l();
        } catch {
          // ignore
        }
      }
    };
  } catch {
    // BroadcastChannel not available — `storage` event still covers cross-tab
    _bc = null;
  }
}

// Broadcast a rehydrate notification after every write so other tabs pick up
// changes sooner than localStorage's debounce.
function broadcastRehydrate() {
  if (!_bc) return;
  const uid = _state.currentUser?.id;
  if (!uid) return;
  try { _bc.postMessage({ type: "rehydrate", userId: uid }); } catch { /* ignore */ }
}

export function getState() {
  return _state;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a as Record<string, unknown>);
  const kb = Object.keys(b as Record<string, unknown>);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
}

export function useStore<T>(selector: (s: AppState) => T): T {
  // Force re-render handle.
  const [, force] = useState(0);
  const selectorRef = useRef(selector);
  const valueRef = useRef<T | undefined>(undefined);

  // Always evaluate the selector during render so closures that capture
  // updated route params (e.g. useStore((s) => s.pages[pageId])) pick up
  // the fresh value without waiting for an external store mutation. This
  // fixes a navigation regression where the page body stuck on the old
  // pageId until a hard reload (B-700).
  const fresh = selector(_state);
  if (valueRef.current === undefined || !shallowEqual(valueRef.current, fresh)) {
    valueRef.current = fresh;
  }
  selectorRef.current = selector;

  useEffect(() => {
    return subscribe(() => {
      const next = selectorRef.current(_state);
      if (!shallowEqual(valueRef.current, next)) {
        valueRef.current = next;
        force((n) => n + 1);
      }
    });
  }, []);

  return valueRef.current as T;
}

// expose a getState helper for non-component usage
export function useStoreGetState(): AppState {
  return _state;
}

// =========== Initialization ============

export function initializeForUser(user: UserProfile) {
  // Hook up cross-tab sync the first time a user is initialized.
  attachCrossTabSync();
  // Idempotent: if already initialized for this user, do nothing.
  if (_state.currentUser?.id === user.id && _state.currentWorkspaceId) {
    return;
  }
  const loaded = loadFromStorage(user.id);
  if (loaded.currentUser?.id === user.id && loaded.currentWorkspaceId) {
    // Restore from localStorage
    setState({ ...loaded, currentUser: { ...loaded.currentUser, ...user, id: user.id } });
    return;
  }
  // Fresh user: create a default workspace, default teamspaces, and a starter page
  const workspaceId = uid("ws");
  const personalTs = uid("ts");
  const teamTs = uid("ts");
  const sharedTs = uid("ts");
  const welcomePageId = uid("pg");
  const gettingStartedId = uid("pg");
  const roadmapId = uid("pg");
  const meetingNotesId = uid("pg");

  const now = Date.now();

  const workspace: Workspace = {
    id: workspaceId,
    name: user.name ? `${user.name}'s Workspace` : "My Workspace",
    icon: "📓",
    ownerId: user.id,
    memberIds: [user.id],
    groups: [],
    plan: "free",
    aiCredits: 1000,
    guests: [],
    createdAt: now,
  };

  const teamspaces: Record<string, Teamspace> = {
    [personalTs]: {
      id: personalTs,
      workspaceId,
      name: "Private",
      icon: "🔒",
      description: "Just for you",
      mode: "private",
      memberIds: [user.id],
      ownerIds: [user.id],
      createdAt: now,
    },
    [teamTs]: {
      id: teamTs,
      workspaceId,
      name: "Engineering",
      icon: "⚙️",
      description: "Team workspace",
      mode: "closed",
      memberIds: [user.id],
      ownerIds: [user.id],
      createdAt: now,
    },
    [sharedTs]: {
      id: sharedTs,
      workspaceId,
      name: "Shared",
      icon: "🤝",
      description: "Pages shared with you",
      mode: "open",
      memberIds: [user.id],
      ownerIds: [user.id],
      createdAt: now,
    },
  };

  const makePage = (id: string, title: string, icon: string, teamspaceId: string, blocks: Block[]): Page => {
    return {
      id,
      workspaceId,
      teamspaceId,
      parentId: null,
      title,
      icon,
      cover: null,
      blocks: blocks.map((b) => b.id),
      isFavorite: false,
      isInTrash: false,
      trashedAt: null,
      isPublished: false,
      publishSlug: null,
      isWiki: false,
      pageOwners: [user.id],
      verifiedAt: null,
      verifiedBy: null,
      verificationExpiresAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: user.id,
      lastEditedBy: user.id,
      permissions: [],
      history: [],
    };
  };

  const heading = (parentId: string, order: number, content: string): Block => ({
    id: uid("blk"),
    type: "heading-1",
    parentId,
    order,
    content,
    createdAt: now,
    updatedAt: now,
  });
  const h2 = (parentId: string, order: number, content: string): Block => ({
    id: uid("blk"),
    type: "heading-2",
    parentId,
    order,
    content,
    createdAt: now,
    updatedAt: now,
  });
  const text = (parentId: string, order: number, content: string): Block => ({
    id: uid("blk"),
    type: "text",
    parentId,
    order,
    content,
    createdAt: now,
    updatedAt: now,
  });
  const bullet = (parentId: string, order: number, content: string): Block => ({
    id: uid("blk"),
    type: "bullet-list",
    parentId,
    order,
    content,
    createdAt: now,
    updatedAt: now,
  });
  const todo = (parentId: string, order: number, content: string, checked = false): Block => ({
    id: uid("blk"),
    type: "todo",
    parentId,
    order,
    content,
    checked,
    createdAt: now,
    updatedAt: now,
  });
  const callout = (parentId: string, order: number, content: string, emoji: string): Block => ({
    id: uid("blk"),
    type: "callout",
    parentId,
    order,
    content,
    emoji,
    createdAt: now,
    updatedAt: now,
  });
  const divider = (parentId: string, order: number): Block => ({
    id: uid("blk"),
    type: "divider",
    parentId,
    order,
    createdAt: now,
    updatedAt: now,
  });
  const quote = (parentId: string, order: number, content: string): Block => ({
    id: uid("blk"),
    type: "quote",
    parentId,
    order,
    content,
    createdAt: now,
    updatedAt: now,
  });

  const welcomeBlocks: Block[] = [
    heading(welcomePageId, 0, "👋 Welcome to your workspace!"),
    text(
      welcomePageId,
      1,
      "This is your second brain — a place to think, plan, and ship. Press / on a new line to insert any kind of block.",
    ),
    callout(
      welcomePageId,
      2,
      "Tip: try slash commands like /heading, /todo, /code, /callout, /database, /table, /toggle, /image, /quote, /divider.",
      "💡",
    ),
    h2(welcomePageId, 3, "What can you do here?"),
    bullet(welcomePageId, 4, "Write rich documents with markdown shortcuts"),
    bullet(welcomePageId, 5, "Create databases with table, board, calendar and gallery views"),
    bullet(welcomePageId, 6, "Organise pages in nested hierarchies"),
    bullet(welcomePageId, 7, "Publish pages as public sites"),
    bullet(welcomePageId, 8, "Ask the AI assistant to help draft, summarise, or search"),
    h2(welcomePageId, 9, "Get started"),
    todo(welcomePageId, 10, "Click 'New page' in the sidebar to create your first page"),
    todo(welcomePageId, 11, "Try the slash menu by pressing / on an empty line"),
    todo(welcomePageId, 12, "Drag blocks around using the handle on the left"),
    todo(welcomePageId, 13, "Open the AI chat in the top right to ask anything"),
    divider(welcomePageId, 14),
    quote(welcomePageId, 15, "Notion is a workspace where you can write, plan, and organize."),
  ];

  const startedBlocks: Block[] = [
    text(gettingStartedId, 0, "Welcome! Here's a quick orientation."),
    h2(gettingStartedId, 1, "Sidebar"),
    text(gettingStartedId, 2, "Your workspace is organised by teamspaces (Private, Engineering, Shared)."),
    h2(gettingStartedId, 3, "Editor"),
    text(gettingStartedId, 4, "Each line is a block. Drag them, nest them, or transform them with /."),
  ];

  const roadmapBlocks: Block[] = [
    heading(roadmapId, 0, "Roadmap Q3"),
    text(roadmapId, 1, "Plan the next quarter's work below. Add tasks via the database."),
  ];

  const meetingBlocks: Block[] = [
    heading(meetingNotesId, 0, "Meeting Notes"),
    text(meetingNotesId, 1, "Use this page as an index for your meeting notes."),
  ];

  const allBlocks = [...welcomeBlocks, ...startedBlocks, ...roadmapBlocks, ...meetingBlocks];

  const pages: Record<string, Page> = {
    [welcomePageId]: makePage(welcomePageId, "Welcome", "👋", personalTs, welcomeBlocks),
    [gettingStartedId]: makePage(gettingStartedId, "Getting Started", "🧭", personalTs, startedBlocks),
    [roadmapId]: makePage(roadmapId, "Roadmap Q3", "🗺️", teamTs, roadmapBlocks),
    [meetingNotesId]: makePage(meetingNotesId, "Meeting Notes", "📝", teamTs, meetingBlocks),
  };

  const blocks: Record<string, Block> = {};
  for (const b of allBlocks) blocks[b.id] = b;

  setState({
    ...emptyState(),
    currentUser: user,
    workspaces: { [workspaceId]: workspace },
    currentWorkspaceId: workspaceId,
    teamspaces,
    pages,
    blocks,
    databases: {},
    rows: {},
    comments: {},
    templates: {},
    automations: {},
    calendarEvents: {},
    mails: {},
    ui: {
      ...emptyState().ui,
      darkMode: _state.ui.darkMode,
      expandedPages: { [welcomePageId]: true },
    },
  });
}

export function signOutState() {
  setState({ ..._state, currentUser: null });
}

// =========== Pages ============

export function createPage(input: {
  title?: string;
  icon?: string | null;
  parentId?: string | null;
  teamspaceId?: string | null;
}): string {
  const user = _state.currentUser;
  if (!user) throw new Error("not signed in");
  const workspaceId = _state.currentWorkspaceId!;
  const id = uid("pg");
  const now = Date.now();
  const page: Page = {
    id,
    workspaceId,
    teamspaceId: input.teamspaceId ?? null,
    parentId: input.parentId ?? null,
    title: input.title ?? "",
    icon: input.icon ?? null,
    cover: null,
    blocks: [],
    isFavorite: false,
    isInTrash: false,
    trashedAt: null,
    isPublished: false,
    publishSlug: null,
    isWiki: false,
    pageOwners: [user.id],
    verifiedAt: null,
    verifiedBy: null,
    verificationExpiresAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: user.id,
    lastEditedBy: user.id,
    permissions: [],
    history: [],
  };
  setState((s) => ({
    ...s,
    pages: { ...s.pages, [id]: page },
    ui: {
      ...s.ui,
      expandedPages: input.parentId
        ? { ...s.ui.expandedPages, [input.parentId]: true }
        : s.ui.expandedPages,
    },
  }));
  return id;
}

/**
 * Move a page to a new teamspace AND cascade the same teamspaceId to every
 * descendant page so the entire sub-tree stays consistent (B-5101 / I-5100).
 * Also clears parentId on the root (it becomes a top-level page in the
 * destination teamspace) — descendants keep their existing parentId so the
 * tree shape is preserved.
 */
export function movePageToTeamspace(id: string, teamspaceId: string | null) {
  setState((s) => {
    const root = s.pages[id];
    if (!root) return s;
    const newPages: Record<string, Page> = { ...s.pages };
    const now = Date.now();
    // BFS over descendants by parentId
    const queue: string[] = [id];
    const seen = new Set<string>();
    while (queue.length > 0) {
      const pid = queue.shift()!;
      if (seen.has(pid)) continue;
      seen.add(pid);
      const p = newPages[pid];
      if (!p) continue;
      const isRoot = pid === id;
      newPages[pid] = {
        ...p,
        teamspaceId,
        // Only the root becomes a top-level page; descendants keep parentId
        // so the tree shape (and the sidebar's nested rendering) is intact.
        parentId: isRoot ? null : p.parentId,
        updatedAt: now,
      };
      for (const child of Object.values(s.pages)) {
        if (child.parentId === pid && !seen.has(child.id)) queue.push(child.id);
      }
    }
    return { ...s, pages: newPages };
  });
}

export function updatePage(id: string, patch: Partial<Page>) {
  setState((s) => {
    const page = s.pages[id];
    if (!page) return s;
    return {
      ...s,
      pages: {
        ...s.pages,
        [id]: { ...page, ...patch, updatedAt: Date.now() },
      },
    };
  });
}

export function deletePage(id: string) {
  // Soft delete to trash. Cascade to children so they don't dangle.
  setState((s) => {
    const page = s.pages[id];
    if (!page) return s;
    const idsToTrash = new Set<string>([id]);
    let queue = [id];
    while (queue.length > 0) {
      const next: string[] = [];
      for (const pid of queue) {
        for (const p of Object.values(s.pages)) {
          if (p.parentId === pid && !p.isInTrash && !idsToTrash.has(p.id)) {
            idsToTrash.add(p.id);
            next.push(p.id);
          }
        }
      }
      queue = next;
    }
    const now = Date.now();
    const newPages = { ...s.pages };
    for (const pid of idsToTrash) {
      const p = newPages[pid];
      if (p) newPages[pid] = { ...p, isInTrash: true, trashedAt: now };
    }
    return { ...s, pages: newPages };
  });
}

export function restorePageCascade(id: string) {
  setState((s) => {
    const page = s.pages[id];
    if (!page) return s;
    const idsToRestore = new Set<string>([id]);
    let queue = [id];
    while (queue.length > 0) {
      const next: string[] = [];
      for (const pid of queue) {
        for (const p of Object.values(s.pages)) {
          if (p.parentId === pid && p.isInTrash && !idsToRestore.has(p.id)) {
            idsToRestore.add(p.id);
            next.push(p.id);
          }
        }
      }
      queue = next;
    }
    const newPages = { ...s.pages };
    for (const pid of idsToRestore) {
      const p = newPages[pid];
      if (p) newPages[pid] = { ...p, isInTrash: false, trashedAt: null };
    }
    return { ...s, pages: newPages };
  });
}

export function restorePage(id: string) {
  setState((s) => {
    const page = s.pages[id];
    if (!page) return s;
    return {
      ...s,
      pages: {
        ...s.pages,
        [id]: { ...page, isInTrash: false, trashedAt: null },
      },
    };
  });
}

export function permanentlyDeletePage(id: string) {
  setState((s) => {
    const newPages = { ...s.pages };
    const newBlocks = { ...s.blocks };
    const page = newPages[id];
    if (!page) return s;

    // Cascade delete all child pages first.
    const pagesToDelete = new Set<string>([id]);
    let queue = [id];
    while (queue.length > 0) {
      const next: string[] = [];
      for (const pid of queue) {
        for (const p of Object.values(newPages)) {
          if (p.parentId === pid && !pagesToDelete.has(p.id)) {
            pagesToDelete.add(p.id);
            next.push(p.id);
          }
        }
      }
      queue = next;
    }

    // For each page, recursively collect every descendant block (columns →
    // their column children → those children's nested blocks, toggle
    // children via parentId, etc.) — B-908.
    function collectDescendantBlocks(startIds: string[]): string[] {
      const out = new Set<string>();
      const work: string[] = [...startIds];
      while (work.length > 0) {
        const next = work.pop()!;
        if (out.has(next)) continue;
        const b = newBlocks[next];
        if (!b) continue;
        out.add(next);
        // children via column.blockIds
        if (b.type === "column") {
          const colIds = (b as Extract<Block, { type: "column" }>).blockIds ?? [];
          work.push(...colIds);
        }
        // children via columns.columnIds
        if (b.type === "columns") {
          const colIds = (b as Extract<Block, { type: "columns" }>).columnIds ?? [];
          work.push(...colIds);
        }
        // children via parentId (toggles, etc.)
        for (const candidate of Object.values(newBlocks)) {
          if (candidate.parentId === next && !out.has(candidate.id)) {
            work.push(candidate.id);
          }
        }
      }
      return Array.from(out);
    }

    for (const pid of pagesToDelete) {
      const p = newPages[pid];
      if (!p) continue;
      const allBlockIds = collectDescendantBlocks(p.blocks);
      for (const bid of allBlockIds) delete newBlocks[bid];
      delete newPages[pid];
    }

    // Strip page-link / sub-page blocks in OTHER pages that point at any of
    // the deleted pages (B-4808). The simplest correct fix is to delete the
    // dangling links — they'd otherwise render as "Sub-page" with a dead
    // href and confuse users.
    for (const [bid, b] of Object.entries(newBlocks)) {
      if (!b) continue;
      if (b.type === "page-link" || b.type === "sub-page") {
        const linked = (b as Extract<Block, { type: "page-link" | "sub-page" }>).pageId;
        if (linked && pagesToDelete.has(linked)) {
          delete newBlocks[bid];
          // Remove the dangling block id from its parent page's `blocks`
          // array so the renderer doesn't try to look it up.
          for (const [opid, op] of Object.entries(newPages)) {
            if (op.blocks?.includes(bid)) {
              newPages[opid] = { ...op, blocks: op.blocks.filter((x) => x !== bid) };
            }
          }
        }
      }
    }

    // Cascade-drop any comment that pointed at a deleted page or block
    // (B-5408). Without this, `state.comments` retained orphans whose
    // `pageId` referenced a missing page.
    const newComments: typeof s.comments = {};
    for (const [cid, c] of Object.entries(s.comments)) {
      if (pagesToDelete.has(c.pageId)) continue;
      if (c.blockId && !newBlocks[c.blockId]) continue;
      newComments[cid] = c;
    }

    return { ...s, pages: newPages, blocks: newBlocks, comments: newComments };
  });
}

export function duplicatePage(id: string): string | null {
  const page = _state.pages[id];
  if (!page) return null;
  const newId = uid("pg");
  const now = Date.now();
  const newBlockIds: string[] = [];
  const newBlocks: Record<string, Block> = {};
  for (const blockId of page.blocks) {
    const b = _state.blocks[blockId];
    if (!b) continue;
    const nb = { ...b, id: uid("blk"), parentId: newId, createdAt: now, updatedAt: now };
    newBlocks[nb.id] = nb as Block;
    newBlockIds.push(nb.id);
  }
  const newPage: Page = {
    ...page,
    id: newId,
    title: page.title ? `${page.title} (Copy)` : "Untitled",
    blocks: newBlockIds,
    createdAt: now,
    updatedAt: now,
    history: [],
  };
  setState((s) => ({
    ...s,
    pages: { ...s.pages, [newId]: newPage },
    blocks: { ...s.blocks, ...newBlocks },
  }));
  return newId;
}

export function toggleFavorite(id: string) {
  setState((s) => {
    const page = s.pages[id];
    if (!page) return s;
    return {
      ...s,
      pages: {
        ...s.pages,
        [id]: { ...page, isFavorite: !page.isFavorite },
      },
    };
  });
}

// =========== Blocks ============

export function createBlock(pageId: string, block: Omit<Block, "id" | "createdAt" | "updatedAt">, insertAfterBlockId?: string): string {
  const id = uid("blk");
  const now = Date.now();
  setState((s) => {
    const page = s.pages[pageId];
    if (!page) return s;
    const newBlock = { ...block, id, createdAt: now, updatedAt: now } as Block;
    let newBlockIds: string[];
    if (insertAfterBlockId) {
      const idx = page.blocks.indexOf(insertAfterBlockId);
      if (idx === -1) {
        newBlockIds = [...page.blocks, id];
      } else {
        newBlockIds = [...page.blocks.slice(0, idx + 1), id, ...page.blocks.slice(idx + 1)];
      }
    } else {
      newBlockIds = [...page.blocks, id];
    }
    return {
      ...s,
      pages: {
        ...s.pages,
        [pageId]: { ...page, blocks: newBlockIds, updatedAt: now },
      },
      blocks: { ...s.blocks, [id]: newBlock },
    };
  });
  return id;
}

export function updateBlock(id: string, patch: Partial<Block>) {
  setState((s) => {
    const block = s.blocks[id];
    if (!block) return s;
    return {
      ...s,
      blocks: {
        ...s.blocks,
        [id]: { ...block, ...patch, updatedAt: Date.now() } as Block,
      },
    };
  });
}

/** Insert a fully-formed block into the store. Used for nested children
 *  (e.g. blocks inside a column) where we don't want page.blocks to change. */
export function insertBlock(block: Block) {
  setState((s) => ({
    ...s,
    blocks: { ...s.blocks, [block.id]: block },
  }));
}

export function deleteBlock(blockId: string, pageId: string) {
  setState((s) => {
    const page = s.pages[pageId];
    if (!page) return s;
    const newBlocks = { ...s.blocks };
    delete newBlocks[blockId];
    return {
      ...s,
      pages: {
        ...s.pages,
        [pageId]: { ...page, blocks: page.blocks.filter((b) => b !== blockId), updatedAt: Date.now() },
      },
      blocks: newBlocks,
    };
  });
}

export function moveBlock(pageId: string, blockId: string, toIndex: number) {
  setState((s) => {
    const page = s.pages[pageId];
    if (!page) return s;
    const cur = page.blocks.filter((b) => b !== blockId);
    cur.splice(toIndex, 0, blockId);
    return {
      ...s,
      pages: {
        ...s.pages,
        [pageId]: { ...page, blocks: cur, updatedAt: Date.now() },
      },
    };
  });
}

export function reorderBlocks(pageId: string, order: string[]) {
  setState((s) => {
    const page = s.pages[pageId];
    if (!page) return s;
    return {
      ...s,
      pages: { ...s.pages, [pageId]: { ...page, blocks: order, updatedAt: Date.now() } },
    };
  });
}

// =========== UI ============

export function setUI(patch: Partial<AppState["ui"]>) {
  setState((s) => ({ ...s, ui: { ...s.ui, ...patch } }));
}

export function toggleDarkMode() {
  setState((s) => {
    const next = !s.ui.darkMode;
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next);
    }
    return { ...s, ui: { ...s.ui, darkMode: next } };
  });
}

export function togglePageExpanded(pageId: string) {
  setState((s) => ({
    ...s,
    ui: {
      ...s.ui,
      expandedPages: { ...s.ui.expandedPages, [pageId]: !s.ui.expandedPages[pageId] },
    },
  }));
}

// =========== Teamspaces ============

export function createTeamspace(input: { name: string; icon?: string; mode?: "open" | "closed" | "private" }): string {
  const user = _state.currentUser;
  if (!user) throw new Error("not signed in");
  const id = uid("ts");
  const ts: Teamspace = {
    id,
    workspaceId: _state.currentWorkspaceId!,
    name: input.name,
    icon: input.icon ?? "🌐",
    description: "",
    mode: input.mode ?? "closed",
    memberIds: [user.id],
    ownerIds: [user.id],
    createdAt: Date.now(),
  };
  setState((s) => ({ ...s, teamspaces: { ...s.teamspaces, [id]: ts } }));
  return id;
}

export function updateTeamspace(id: string, patch: Partial<Teamspace>) {
  setState((s) => {
    const ts = s.teamspaces[id];
    if (!ts) return s;
    return { ...s, teamspaces: { ...s.teamspaces, [id]: { ...ts, ...patch } } };
  });
}

export function deleteTeamspace(id: string) {
  setState((s) => {
    const newTs = { ...s.teamspaces };
    delete newTs[id];
    // also move pages of that teamspace to null teamspace
    const newPages = { ...s.pages };
    for (const p of Object.values(newPages)) {
      if (p.teamspaceId === id) newPages[p.id] = { ...p, teamspaceId: null };
    }
    return { ...s, teamspaces: newTs, pages: newPages };
  });
}

// =========== Databases ============

export function createDatabase(input: {
  parentId: string | null;
  name?: string;
  isInline?: boolean;
  icon?: string | null;
}): string {
  const user = _state.currentUser!;
  const id = uid("db");
  const now = Date.now();
  const titlePropertyId = uid("prop");
  const statusPropertyId = uid("prop");
  const datePropertyId = uid("prop");
  const tagsPropertyId = uid("prop");

  const todoOptionId = uid("opt");
  const inProgressOptionId = uid("opt");
  const doneOptionId = uid("opt");

  const properties: Property[] = [
    { id: titlePropertyId, name: "Name", type: "title" },
    {
      id: statusPropertyId,
      name: "Status",
      type: "status",
      options: [
        { id: todoOptionId, name: "Not started", color: "gray" },
        { id: inProgressOptionId, name: "In progress", color: "blue" },
        { id: doneOptionId, name: "Done", color: "green" },
      ],
      groups: [
        { id: uid("g"), name: "To-do", optionIds: [todoOptionId] },
        { id: uid("g"), name: "In progress", optionIds: [inProgressOptionId] },
        { id: uid("g"), name: "Done", optionIds: [doneOptionId] },
      ],
    },
    {
      id: tagsPropertyId,
      name: "Tags",
      type: "multi-select",
      options: [
        { id: uid("opt"), name: "Important", color: "red" },
        { id: uid("opt"), name: "Idea", color: "blue" },
      ],
    },
    { id: datePropertyId, name: "Date", type: "date", includeTime: false },
  ];
  const tableViewId = uid("view");
  const boardViewId = uid("view");
  const calendarViewId = uid("view");
  const galleryViewId = uid("view");

  const views: View[] = [
    {
      id: tableViewId,
      name: "All",
      type: "table",
      filters: [],
      sorts: [],
      hiddenProperties: [],
      propertyOrder: properties.map((p) => p.id),
      wrapCells: false,
    },
    {
      id: boardViewId,
      name: "By status",
      type: "board",
      filters: [],
      sorts: [],
      hiddenProperties: [],
      propertyOrder: properties.map((p) => p.id),
      groupBy: statusPropertyId,
      hiddenGroups: [],
    },
    {
      id: calendarViewId,
      name: "Calendar",
      type: "calendar",
      filters: [],
      sorts: [],
      hiddenProperties: [],
      propertyOrder: properties.map((p) => p.id),
      dateProperty: datePropertyId,
    },
    {
      id: galleryViewId,
      name: "Gallery",
      type: "gallery",
      filters: [],
      sorts: [],
      hiddenProperties: [],
      propertyOrder: properties.map((p) => p.id),
      cardSize: "medium",
      fitImage: true,
    },
  ];

  const db: NotionDatabase = {
    id,
    workspaceId: _state.currentWorkspaceId!,
    parentId: input.parentId,
    name: input.name ?? "Untitled database",
    description: "",
    icon: input.icon ?? "🗄️",
    cover: null,
    isInline: input.isInline ?? false,
    properties,
    views,
    rows: [],
    templates: [],
    createdAt: now,
    updatedAt: now,
    createdBy: user.id,
    isInTrash: false,
  };
  setState((s) => ({ ...s, databases: { ...s.databases, [id]: db } }));
  return id;
}

export function updateDatabase(id: string, patch: Partial<NotionDatabase>) {
  setState((s) => {
    const db = s.databases[id];
    if (!db) return s;
    return { ...s, databases: { ...s.databases, [id]: { ...db, ...patch, updatedAt: Date.now() } } };
  });
}

/** Permanently delete a database AND clean up everything that referenced it
 *  (B-1619): the database's rows are dropped, any relation property pointing
 *  at this DB in any other database is stripped (and its rollup descendants
 *  are reset), and dangling row.values entries are cleared. */
export function deleteDatabase(id: string) {
  setState((s) => {
    const target = s.databases[id];
    if (!target) return s;

    // 1. Drop all rows belonging to this database.
    const newRows: typeof s.rows = {};
    for (const r of Object.values(s.rows)) {
      if (r.databaseId !== id) newRows[r.id] = r;
    }
    const deletedRowIds = new Set(
      Object.values(s.rows).filter((r) => r.databaseId === id).map((r) => r.id),
    );

    // 2. For every OTHER database, strip relation properties that target this
    //    one, drop rollups that referenced those relations, and clear
    //    matching row values.
    const newDbs: typeof s.databases = {};
    for (const db of Object.values(s.databases)) {
      if (db.id === id) continue;
      // Coalesce optional fields so we don't crash on legacy / synthetic
      // databases that were persisted before `propertyOrder` /
      // `hiddenProperties` were required (B-5012 / B-5013, P1).
      const properties = Array.isArray(db.properties) ? db.properties : [];
      const dbViews = Array.isArray(db.views) ? db.views : [];
      const droppedRelationIds = new Set<string>();
      for (const p of properties) {
        if (p.type === "relation" && (p as Extract<typeof p, { type: "relation" }>).targetDatabaseId === id) {
          droppedRelationIds.add(p.id);
        }
      }
      const droppedRollupIds = new Set<string>();
      for (const p of properties) {
        if (p.type === "rollup" && droppedRelationIds.has((p as Extract<typeof p, { type: "rollup" }>).relationPropertyId)) {
          droppedRollupIds.add(p.id);
        }
      }
      const toRemove = new Set([...droppedRelationIds, ...droppedRollupIds]);
      const props = properties.filter((p) => !toRemove.has(p.id));
      const views = dbViews.map((v) => ({
        ...v,
        propertyOrder: (v.propertyOrder ?? []).filter((pid) => !toRemove.has(pid)),
        hiddenProperties: (v.hiddenProperties ?? []).filter((pid) => !toRemove.has(pid)),
      }));
      newDbs[db.id] = { ...db, properties: props, views };

      // Clear row.values for removed properties + dropped row links.
      for (const r of Object.values(newRows)) {
        if (r.databaseId !== db.id) continue;
        let touched = false;
        const nextValues = { ...r.values };
        for (const pid of toRemove) {
          if (pid in nextValues) {
            delete nextValues[pid];
            touched = true;
          }
        }
        // Also clean leftover relation rowIds that point at deleted rows.
        for (const [pid, v] of Object.entries(nextValues)) {
          if (Array.isArray(v) && v.some((rid) => deletedRowIds.has(rid as string))) {
            nextValues[pid] = (v as string[]).filter((rid) => !deletedRowIds.has(rid));
            touched = true;
          }
        }
        if (touched) newRows[r.id] = { ...r, values: nextValues, updatedAt: Date.now() };
      }
    }

    return { ...s, databases: newDbs, rows: newRows };
  });
}

export function addDatabaseRow(databaseId: string, values: Record<string, unknown> = {}, options?: { title?: string }): string {
  const user = _state.currentUser!;
  const id = uid("row");
  const now = Date.now();
  const db = _state.databases[databaseId];
  if (!db) return id;
  const titleProp = db.properties.find((p) => p.type === "title");
  const v = { ...values };
  if (titleProp && !(titleProp.id in v)) {
    v[titleProp.id] = options?.title ?? "";
  }
  const seq = (db.nextUniqueId ?? db.rows.length + 1);
  const row: DatabaseRow = {
    id,
    databaseId,
    values: v,
    blocks: [],
    uniqueIdSeq: seq,
    icon: null,
    cover: null,
    createdAt: now,
    updatedAt: now,
    createdBy: user.id,
    lastEditedBy: user.id,
    isInTrash: false,
  };
  setState((s) => ({
    ...s,
    rows: { ...s.rows, [id]: row },
    databases: {
      ...s.databases,
      [databaseId]: {
        ...s.databases[databaseId],
        rows: [...s.databases[databaseId].rows, id],
        nextUniqueId: seq + 1,
        updatedAt: now,
      },
    },
  }));

  // If a relation property is dual, mirror on the paired side.
  // (Initial creation rarely fills relations; updateRow handles links.)
  return id;
}

export function updateRow(id: string, patch: Partial<DatabaseRow> & { values?: Record<string, unknown> }) {
  setState((s) => {
    const row = s.rows[id];
    if (!row) return s;
    const merged: DatabaseRow = {
      ...row,
      ...patch,
      values: patch.values ? { ...row.values, ...patch.values } : row.values,
      updatedAt: Date.now(),
      lastEditedBy: s.currentUser?.id ?? row.lastEditedBy,
    };
    return { ...s, rows: { ...s.rows, [id]: merged } };
  });
}

/**
 * Reorder sibling pages in the sidebar by setting `sortOrder` on the source
 * to land immediately before the target page. Same-parent reorder only —
 * cross-teamspace moves still happen via `movePage`. Pages without a
 * sortOrder fall back to `createdAt` (legacy ordering). B-2908 / B-3712 /
 * B-3616.
 */
export function reorderSiblingPages(sourcePageId: string, targetPageId: string | null) {
  setState((s) => {
    const src = s.pages[sourcePageId];
    if (!src) return s;
    const siblings = Object.values(s.pages)
      .filter((p) => p.parentId === src.parentId && p.teamspaceId === src.teamspaceId && !p.isInTrash && p.id !== sourcePageId)
      .sort((a, b) => (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt));
    // Find the target's index; if no target, append at end.
    const tgtIdx = targetPageId ? siblings.findIndex((p) => p.id === targetPageId) : siblings.length;
    if (tgtIdx === -1) return s;
    // Pick a sortOrder that lands the source just before the target.
    // Use the midpoint between the predecessor's order and the target's
    // order so we don't collide. If there's no predecessor, subtract 1ms
    // from the target.
    const ord = (p: typeof src) => p.sortOrder ?? p.createdAt;
    const tgtOrd = tgtIdx >= siblings.length ? Date.now() + 1 : ord(siblings[tgtIdx]);
    const prevOrd = tgtIdx > 0 ? ord(siblings[tgtIdx - 1]) : tgtOrd - 1000;
    const newOrder = (tgtOrd + prevOrd) / 2;
    return {
      ...s,
      pages: { ...s.pages, [sourcePageId]: { ...src, sortOrder: newOrder, updatedAt: Date.now() } },
    };
  });
}

/**
 * Reorder a database's `properties` array by moving the source property so
 * it lands immediately before the target (or appended when target is null).
 * Affects column order in every view that doesn't override via
 * `view.propertyOrder` (B-5303 / I-5301).
 */
export function reorderDatabaseProperties(
  databaseId: string,
  sourcePropertyId: string,
  targetPropertyId: string | null,
) {
  setState((s) => {
    const db = s.databases[databaseId];
    if (!db || !Array.isArray(db.properties)) return s;
    const without = db.properties.filter((p) => p.id !== sourcePropertyId);
    const source = db.properties.find((p) => p.id === sourcePropertyId);
    if (!source) return s;
    let nextProps: typeof db.properties;
    if (!targetPropertyId) {
      nextProps = [...without, source];
    } else {
      const idx = without.findIndex((p) => p.id === targetPropertyId);
      if (idx === -1) {
        nextProps = [...without, source];
      } else {
        nextProps = [...without.slice(0, idx), source, ...without.slice(idx)];
      }
    }
    return {
      ...s,
      databases: { ...s.databases, [databaseId]: { ...db, properties: nextProps, updatedAt: Date.now() } },
    };
  });
}

/**
 * Reorder rows within a database by moving `sourceRowId` so that it lands
 * before `targetRowId`. If targetRowId is null, the source is appended.
 * B-3711 — DB row drag-reorder.
 */
export function reorderDatabaseRows(databaseId: string, sourceRowId: string, targetRowId: string | null) {
  setState((s) => {
    const db = s.databases[databaseId];
    if (!db) return s;
    if (!Array.isArray(db.rows)) return s;
    // Refuse cross-DB drops (B-4611). The reorder API only moves a row WITHIN
    // its own database. If the source row belongs to a different DB, do
    // nothing — the table-view drop handler should never trigger this, but
    // a misconfigured DnD payload would otherwise insert the same row id
    // into two databases' `rows` arrays simultaneously and corrupt the
    // store. To move a row between databases, delete + recreate (or add a
    // dedicated moveRowToDatabase action later).
    const sourceRow = s.rows[sourceRowId];
    if (sourceRow && sourceRow.databaseId !== databaseId) return s;
    const rows = db.rows.filter((r) => r !== sourceRowId);
    if (!targetRowId) {
      rows.push(sourceRowId);
    } else {
      const idx = rows.indexOf(targetRowId);
      if (idx === -1) {
        rows.push(sourceRowId);
      } else {
        rows.splice(idx, 0, sourceRowId);
      }
    }
    return {
      ...s,
      databases: { ...s.databases, [databaseId]: { ...db, rows } },
    };
  });
}

export function deleteRow(id: string) {
  setState((s) => {
    const row = s.rows[id];
    if (!row) return s;
    const db = s.databases[row.databaseId];
    return {
      ...s,
      rows: { ...s.rows, [id]: { ...row, isInTrash: true, updatedAt: Date.now() } },
      databases: db
        ? {
            ...s.databases,
            [row.databaseId]: { ...db, rows: db.rows.filter((r) => r !== id) },
          }
        : s.databases,
    };
  });
}

export function addDatabaseProperty(databaseId: string, prop: Property) {
  setState((s) => {
    const db = s.databases[databaseId];
    if (!db) return s;
    const newProps = [...db.properties, prop];
    const newViews = db.views.map((v) => ({ ...v, propertyOrder: [...v.propertyOrder, prop.id] }));
    return {
      ...s,
      databases: { ...s.databases, [databaseId]: { ...db, properties: newProps, views: newViews, updatedAt: Date.now() } },
    };
  });
}

export function updateDatabaseProperty(databaseId: string, propertyId: string, patch: Partial<Property>) {
  setState((s) => {
    const db = s.databases[databaseId];
    if (!db) return s;

    // Cleanup: if a previously-dual relation is becoming non-relation OR has
    // its dual flag flipped off, remove the orphan paired property from the
    // target DB so we don't leave dangling links (B-702).
    const previous = db.properties.find((p) => p.id === propertyId);
    let nextDbs = { ...s.databases };
    if (previous && previous.type === "relation") {
      const wasDual = previous.isDual && previous.pairedPropertyId && previous.targetDatabaseId;
      const becomingDual =
        (patch as Partial<Extract<Property, { type: "relation" }>>).isDual === true ||
        (previous.isDual && (patch.type === undefined || patch.type === "relation"));
      const typeChanging = patch.type && patch.type !== "relation";
      const dualToggledOff =
        (patch as Partial<Extract<Property, { type: "relation" }>>).isDual === false &&
        previous.isDual;
      if (wasDual && (typeChanging || dualToggledOff) && previous.targetDatabaseId) {
        const target = nextDbs[previous.targetDatabaseId];
        if (target) {
          nextDbs[previous.targetDatabaseId] = {
            ...target,
            properties: target.properties.filter((p) => p.id !== previous.pairedPropertyId),
            views: target.views.map((v) => ({
              ...v,
              propertyOrder: v.propertyOrder.filter((id) => id !== previous.pairedPropertyId),
              hiddenProperties: v.hiddenProperties.filter((id) => id !== previous.pairedPropertyId),
            })),
            updatedAt: Date.now(),
          };
        }
      }
      // becomingDual is handled below by the existing side-effect block.
      void becomingDual;
    }

    // If a relation's targetDatabaseId is being changed, clear stale row
    // links in this database's rows (B-1318) so we don't leave dangling ids
    // that render as "Untitled" phantoms.
    let rowsPatch: typeof s.rows | null = null;
    if (
      previous &&
      previous.type === "relation" &&
      (patch as Partial<Extract<Property, { type: "relation" }>>).targetDatabaseId !== undefined &&
      (patch as Partial<Extract<Property, { type: "relation" }>>).targetDatabaseId !== previous.targetDatabaseId
    ) {
      const updatedRows = { ...s.rows };
      let touched = false;
      for (const r of Object.values(updatedRows)) {
        if (r.databaseId !== databaseId) continue;
        const cur = r.values[propertyId];
        if (Array.isArray(cur) && cur.length > 0) {
          updatedRows[r.id] = { ...r, values: { ...r.values, [propertyId]: [] }, updatedAt: Date.now() };
          touched = true;
        }
      }
      if (touched) rowsPatch = updatedRows;
    }

    nextDbs = {
      ...nextDbs,
      [databaseId]: {
        ...db,
        properties: db.properties.map((p) => {
          if (p.id !== propertyId) return p;
          const merged = { ...p, ...patch } as Property & Record<string, unknown>;
          // Strip relation-specific fields when type changes off "relation" (B-804).
          if (p.type === "relation" && patch.type && patch.type !== "relation") {
            delete (merged as Record<string, unknown>).isDual;
            delete (merged as Record<string, unknown>).pairedPropertyId;
            delete (merged as Record<string, unknown>).targetDatabaseId;
          }
          return merged as Property;
        }),
        updatedAt: Date.now(),
      },
    };

    // Side-effect: keep dual relations in sync (B-600 / B-404).
    // When isDual is enabled on a relation, ensure the target DB has a
    // mirroring relation property and that both sides' pairedPropertyId
    // points at each other.
    const updatedProp = nextDbs[databaseId].properties.find((p) => p.id === propertyId);
    if (updatedProp && updatedProp.type === "relation" && updatedProp.isDual && updatedProp.targetDatabaseId) {
      const targetDb = nextDbs[updatedProp.targetDatabaseId];
      if (targetDb && targetDb.id !== databaseId) {
        let pairedId = updatedProp.pairedPropertyId;
        let paired = pairedId ? targetDb.properties.find((p) => p.id === pairedId) : undefined;
        if (!paired) {
          // Look for an existing mirror first so toggling doesn't dupe.
          paired = targetDb.properties.find(
            (p) =>
              p.type === "relation" &&
              (p as Extract<Property, { type: "relation" }>).targetDatabaseId === databaseId &&
              (!pairedId || p.id === pairedId),
          );
        }
        if (!paired) {
          const newPaired: Property = {
            id: uid("prop"),
            name: `Related to ${db.name}`,
            type: "relation",
            targetDatabaseId: databaseId,
            isDual: true,
            pairedPropertyId: propertyId,
          };
          nextDbs = {
            ...nextDbs,
            [targetDb.id]: {
              ...targetDb,
              properties: [...targetDb.properties, newPaired],
              views: targetDb.views.map((v) => ({
                ...v,
                propertyOrder: [...v.propertyOrder, newPaired.id],
              })),
              updatedAt: Date.now(),
            },
          };
          paired = newPaired;
        }
        // Cross-link both sides.
        nextDbs = {
          ...nextDbs,
          [databaseId]: {
            ...nextDbs[databaseId],
            properties: nextDbs[databaseId].properties.map((p) =>
              p.id === propertyId && p.type === "relation"
                ? ({ ...p, pairedPropertyId: paired!.id } as Property)
                : p,
            ),
          },
        };
        if ((paired as Extract<Property, { type: "relation" }>).pairedPropertyId !== propertyId) {
          nextDbs = {
            ...nextDbs,
            [paired!.id ? targetDb.id : targetDb.id]: {
              ...nextDbs[targetDb.id],
              properties: nextDbs[targetDb.id].properties.map((p) =>
                p.id === paired!.id && p.type === "relation"
                  ? ({ ...p, pairedPropertyId: propertyId, targetDatabaseId: databaseId } as Property)
                  : p,
              ),
            },
          };
        }
      }
    }

    return { ...s, databases: nextDbs, rows: rowsPatch ?? s.rows };
  });
}

export function removeDatabaseProperty(databaseId: string, propertyId: string) {
  setState((s) => {
    const db = s.databases[databaseId];
    if (!db) return s;
    return {
      ...s,
      databases: {
        ...s.databases,
        [databaseId]: {
          ...db,
          properties: db.properties.filter((p) => p.id !== propertyId),
          views: db.views.map((v) => ({
            ...v,
            propertyOrder: v.propertyOrder.filter((p) => p !== propertyId),
            hiddenProperties: v.hiddenProperties.filter((p) => p !== propertyId),
          })),
          updatedAt: Date.now(),
        },
      },
    };
  });
}

export function addView(databaseId: string, view: View) {
  setState((s) => {
    const db = s.databases[databaseId];
    if (!db) return s;
    return {
      ...s,
      databases: { ...s.databases, [databaseId]: { ...db, views: [...db.views, view], updatedAt: Date.now() } },
    };
  });
}

export function updateView(databaseId: string, viewId: string, patch: Partial<View>) {
  setState((s) => {
    const db = s.databases[databaseId];
    if (!db) return s;
    return {
      ...s,
      databases: {
        ...s.databases,
        [databaseId]: {
          ...db,
          views: db.views.map((v) => (v.id === viewId ? ({ ...v, ...patch } as View) : v)),
          updatedAt: Date.now(),
        },
      },
    };
  });
}

/**
 * Duplicate a view: clones name + type + filters + sorts + hidden columns +
 * any view-specific config so the user gets a working copy immediately.
 * Returns the new view id, or null if the source view wasn't found
 * (B-4016 / I-4002).
 */
export function duplicateView(databaseId: string, viewId: string): string | null {
  const db = _state.databases[databaseId];
  if (!db) return null;
  const src = db.views.find((v) => v.id === viewId);
  if (!src) return null;
  const newId = uid("v");
  // Deep-clone via JSON so nested arrays/objects (filters, sorts, options)
  // are independent. The View union is JSON-safe. Disambiguate the name
  // against existing siblings so three duplications produce "All (Copy)",
  // "All (Copy 2)", "All (Copy 3)" instead of three identical tabs
  // (B-6208 / I-6205).
  const baseName = `${src.name} (Copy)`;
  const existingNames = new Set(db.views.map((v) => v.name));
  let candidate = baseName;
  let n = 2;
  while (existingNames.has(candidate)) {
    candidate = `${src.name} (Copy ${n++})`;
  }
  const cloned: View = { ...JSON.parse(JSON.stringify(src)), id: newId, name: candidate };
  setState((s) => {
    const cur = s.databases[databaseId];
    if (!cur) return s;
    return {
      ...s,
      databases: {
        ...s.databases,
        [databaseId]: { ...cur, views: [...cur.views, cloned], updatedAt: Date.now() },
      },
    };
  });
  return newId;
}

export function removeView(databaseId: string, viewId: string) {
  setState((s) => {
    const db = s.databases[databaseId];
    if (!db) return s;
    return {
      ...s,
      databases: {
        ...s.databases,
        [databaseId]: { ...db, views: db.views.filter((v) => v.id !== viewId), updatedAt: Date.now() },
      },
    };
  });
}

// =========== Comments ============

export function addComment(input: { pageId: string; blockId?: string; content: string; parentId?: string }): string {
  const user = _state.currentUser!;
  const id = uid("cmt");
  const now = Date.now();
  const c: Comment = {
    id,
    pageId: input.pageId,
    blockId: input.blockId ?? null,
    parentId: input.parentId ?? null,
    authorId: user.id,
    authorName: user.name,
    authorAvatar: user.avatar,
    content: input.content,
    resolved: false,
    createdAt: now,
    updatedAt: now,
  };
  setState((s) => ({ ...s, comments: { ...s.comments, [id]: c } }));
  return id;
}

export function resolveComment(id: string) {
  setState((s) => {
    const c = s.comments[id];
    if (!c) return s;
    // Toggle so users can un-resolve a previously-resolved comment from the
    // same button (B-3906). The Comments pane reflects the new state via the
    // "Resolve" / "Resolved" button label.
    return { ...s, comments: { ...s.comments, [id]: { ...c, resolved: !c.resolved, updatedAt: Date.now() } } };
  });
}

export function deleteComment(id: string) {
  setState((s) => {
    const newC = { ...s.comments };
    // Cascade-delete the entire reply sub-tree (B-6500). The previous
    // single-level filter left grand-replies dangling with a `parentId`
    // pointing at a deleted comment. BFS from the root id and remove
    // everyone in the closure.
    const toDelete = new Set<string>([id]);
    const queue: string[] = [id];
    while (queue.length > 0) {
      const next = queue.shift()!;
      for (const [cid, c] of Object.entries(newC)) {
        if (c.parentId === next && !toDelete.has(cid)) {
          toDelete.add(cid);
          queue.push(cid);
        }
      }
    }
    for (const cid of toDelete) delete newC[cid];
    return { ...s, comments: newC };
  });
}

export function updateComment(id: string, content: string) {
  setState((s) => {
    const c = s.comments[id];
    if (!c) return s;
    return {
      ...s,
      comments: {
        ...s.comments,
        [id]: { ...c, content, updatedAt: Date.now(), editedAt: Date.now() },
      },
    };
  });
}

// =========== History / versions ============

export function saveSnapshot(pageId: string) {
  const user = _state.currentUser;
  if (!user) return;
  setState((s) => {
    const page = s.pages[pageId];
    if (!page) return s;
    const snapshotBlocks: Record<string, Block> = {};
    for (const id of page.blocks) {
      if (s.blocks[id]) snapshotBlocks[id] = s.blocks[id];
    }
    const version = {
      id: uid("ver"),
      savedAt: Date.now(),
      savedBy: user.id,
      snapshot: { title: page.title, blocks: snapshotBlocks },
    };
    const history = [version, ...page.history].slice(0, 50);
    return { ...s, pages: { ...s.pages, [pageId]: { ...page, history } } };
  });
}

export function restoreVersion(pageId: string, versionId: string) {
  setState((s) => {
    const page = s.pages[pageId];
    if (!page) return s;
    const version = page.history.find((v) => v.id === versionId);
    if (!version) return s;
    const newBlocks = { ...s.blocks };
    for (const oldBlockId of page.blocks) {
      delete newBlocks[oldBlockId];
    }
    for (const [bid, b] of Object.entries(version.snapshot.blocks)) {
      newBlocks[bid] = b;
    }
    return {
      ...s,
      blocks: newBlocks,
      pages: {
        ...s.pages,
        [pageId]: {
          ...page,
          title: version.snapshot.title,
          blocks: Object.keys(version.snapshot.blocks),
          updatedAt: Date.now(),
        },
      },
    };
  });
}

// =========== Calendar / Mail (small helpers) ============

export function upsertCalendarEvent(event: CalendarEvent) {
  setState((s) => ({ ...s, calendarEvents: { ...s.calendarEvents, [event.id]: event } }));
}

export function deleteCalendarEvent(id: string) {
  setState((s) => {
    const c = { ...s.calendarEvents };
    delete c[id];
    return { ...s, calendarEvents: c };
  });
}

/**
 * Move a calendar event to a new day (drag-reschedule, B-2907 / B-3513).
 * `dayKey` is the local-time YYYY-MM-DD key produced by `keyForDate`.
 * Preserves the event's time-of-day from its existing `start`; if no
 * start was set, defaults to noon local time so the chip stays visible
 * in week / day views.
 */
export function moveCalendarEvent(id: string, dayKey: string) {
  setState((s) => {
    const e = s.calendarEvents[id];
    if (!e) return s;
    const [y, m, d] = dayKey.split("-").map(Number);
    if (!y || !m || !d) return s;
    let hours = 12;
    let minutes = 0;
    if (e.start) {
      const prev = new Date(e.start);
      if (!Number.isNaN(prev.getTime())) {
        hours = prev.getHours();
        minutes = prev.getMinutes();
      }
    }
    const next = new Date(y, m - 1, d, hours, minutes).getTime();
    return { ...s, calendarEvents: { ...s.calendarEvents, [id]: { ...e, start: next } } };
  });
}

export function upsertMail(mail: Mail) {
  setState((s) => ({ ...s, mails: { ...s.mails, [mail.id]: mail } }));
}

// =========== AI credits ============

export function consumeAICredits(amount: number) {
  setState((s) => {
    const wid = s.currentWorkspaceId;
    if (!wid) return s;
    const w = s.workspaces[wid];
    if (!w) return s;
    return {
      ...s,
      workspaces: { ...s.workspaces, [wid]: { ...w, aiCredits: Math.max(0, w.aiCredits - amount) } },
    };
  });
}

// =========== Templates ============

export function saveTemplate(t: PageTemplate) {
  setState((s) => ({ ...s, templates: { ...s.templates, [t.id]: t } }));
}
