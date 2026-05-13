import { useEffect, useRef, useState, useMemo } from "react";
import { useStore, updatePage, createBlock, deletePage, restorePage, restorePageCascade, permanentlyDeletePage } from "@/lib/store";
import { BlockComponent } from "@/components/editor/Block";
import { EmojiOrCoverPicker } from "@/components/page/EmojiOrCoverPicker";
import { CoverPicker } from "@/components/page/CoverPicker";
import { PageComments } from "@/components/page/PageComments";
import { useAuth } from "@/hooks/use-auth";
import type { Block } from "@/lib/types";
import { stripHtml, wordCount } from "@/lib/text";
import { toast } from "@/components/ui/Toast";
import { pageToMarkdown } from "@/lib/export-markdown";

export function PageView({ pageId }: { pageId: string }) {
  const page = useStore((s) => s.pages[pageId]);
  const blocks = useStore((s) => s.blocks);
  const allPages = useStore((s) => s.pages);
  const { user } = useAuth();
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Detect whether any ancestor is in trash (B-402).
  const ancestorInTrash = useMemo(() => {
    if (!page) return false;
    let cur = page.parentId ? allPages[page.parentId] : null;
    while (cur) {
      if (cur.isInTrash) return true;
      cur = cur.parentId ? allPages[cur.parentId] : null;
    }
    return false;
  }, [page, allPages]);

  useEffect(() => {
    function open() {
      setCommentsOpen(true);
    }
    window.addEventListener("open-comments", open);
    return () => window.removeEventListener("open-comments", open);
  }, []);

  // Block-jump highlight via `#block-<id>` URL hash (I-4402). Reads on mount
  // and on every `hashchange` so back/forward navigation also restores the
  // highlight. Adds a persistent ring rather than the transient 1500ms one
  // so users can copy / look without losing the focus.
  useEffect(() => {
    function highlightFromHash() {
      const hash = (typeof window !== "undefined" ? window.location.hash : "") || "";
      const match = /^#block-(.+)$/.exec(hash);
      if (!match) return;
      const blockId = match[1];
      // Remove any prior persistent highlights so only one block is marked.
      document.querySelectorAll("[data-block-highlight=\"1\"]").forEach((n) => {
        n.removeAttribute("data-block-highlight");
        n.classList.remove("ring-2", "ring-blue-400");
      });
      // Wait one paint for the page's blocks to mount.
      setTimeout(() => {
        const el = document.querySelector(`[data-block-id="${blockId}"]`);
        if (el && "scrollIntoView" in el) {
          (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
          (el as HTMLElement).classList.add("ring-2", "ring-blue-400");
          (el as HTMLElement).setAttribute("data-block-highlight", "1");
        }
      }, 80);
    }
    highlightFromHash();
    window.addEventListener("hashchange", highlightFromHash);
    return () => window.removeEventListener("hashchange", highlightFromHash);
  }, [pageId]);

  // Word-count listener (B-211)
  useEffect(() => {
    function showCount() {
      if (!page) return;
      let chars = 0;
      let words = 0;
      for (const id of page.blocks) {
        const b = blocks[id];
        if (b && "content" in b && typeof b.content === "string") {
          const t = stripHtml(b.content);
          chars += t.length;
          words += wordCount(t);
        }
      }
      toast(`${words} words · ${chars} characters`, "info");
    }
    window.addEventListener("show-word-count", showCount);
    function exportMd() {
      if (!page) return;
      const md = pageToMarkdown(page, blocks, allPages);
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const slug = (page.title || page.id).replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug || "page"}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Exported as Markdown", "success");
    }
    window.addEventListener("export-page-markdown", exportMd);
    return () => {
      window.removeEventListener("show-word-count", showCount);
      window.removeEventListener("export-page-markdown", exportMd);
    };
  }, [page, blocks, allPages]);

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-12 text-center text-muted-foreground">
        Page not found.
      </div>
    );
  }

  if (page.isInTrash || ancestorInTrash) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="bg-yellow-50 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-6 text-sm flex items-center justify-between">
          <span>This page is in Trash.</span>
          <div className="flex gap-2">
            <button onClick={() => restorePageCascade(page.id)} className="text-xs bg-primary text-primary-foreground rounded px-2 py-1" data-testid="banner-restore">Restore</button>
            <button
              onClick={() => {
                permanentlyDeletePage(page.id);
                window.history.back();
              }}
              className="text-xs bg-destructive text-white rounded px-2 py-1"
              data-testid="banner-delete-forever"
            >
              Delete permanently
            </button>
          </div>
        </div>
        <PageContent page={page} blocks={blocks} readonly />
      </div>
    );
  }

  return (
    <div className="relative">
      <PageCover page={page} />
      <div className="max-w-3xl mx-auto px-8 pb-32">
        <PageHeader page={page} />
        <PageContent page={page} blocks={blocks} />
      </div>
      <PageComments pageId={pageId} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
    </div>
  );
}

function PageCover({ page }: { page: { id: string; cover: string | null } }) {
  if (!page.cover) return null;
  const isGradient = /^(linear|radial)-gradient\(/.test(page.cover);
  if (isGradient) {
    return <div className="h-48" style={{ background: page.cover }} aria-label="cover" />;
  }
  return (
    <div className="h-48 overflow-hidden">
      <img src={page.cover} className="w-full h-full object-cover" alt="cover" />
    </div>
  );
}

function PageHeader({ page }: { page: ReturnType<typeof useStore<NonNullable<ReturnType<typeof useStore<Record<string, unknown>>>>>> & Record<string, unknown> }) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [title, setTitle] = useState((page as { title?: string }).title ?? "");
  const titleRef = useRef<HTMLDivElement>(null);

  // Sync local title state from the store on page.id change OR when the
  // page.title is updated externally (e.g. history restore — B-1136).
  useEffect(() => {
    const t = (page as { title?: string }).title ?? "";
    setTitle(t);
    if (titleRef.current && document.activeElement !== titleRef.current) {
      titleRef.current.innerText = t;
    }
  }, [(page as { id?: string }).id, (page as { title?: string }).title, (page as { updatedAt?: number }).updatedAt]);

  // Defense-in-depth (B-2803): a MutationObserver flattens any non-text
  // child that appears under the title. Titles are always plain text in the
  // data model; if anyone (paste, drag-drop, third-party JS, future feature)
  // injects HTML, we strip it before the next paint and re-emit innerText.
  // Note: this runs AFTER the browser parses inline handlers, so it's not a
  // primary XSS defense on its own. Combined with the onPaste handler (which
  // is the actual paste-vector mitigation), it ensures persisted state never
  // contains rich content for the title.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const flatten = () => {
      if (!el) return;
      if (el.children.length > 0) {
        const text = el.innerText;
        el.textContent = text;
        setTitle(text);
      }
    };
    const obs = new MutationObserver(flatten);
    obs.observe(el, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  function commitTitle(t: string) {
    if (t !== (page as { title?: string }).title) {
      updatePage((page as { id: string }).id, { title: t });
    }
  }

  return (
    <div className="pt-12 mb-4">
      <div className="flex gap-2 mb-2 -mt-6 opacity-50 hover:opacity-100 transition">
        <button
          onClick={() => setIconPickerOpen(true)}
          className="text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground"
          data-testid="add-icon"
        >
          {(page as { icon?: string | null }).icon ? "Change icon" : "Add icon"}
        </button>
        <button
          onClick={() => setCoverPickerOpen(true)}
          className="text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground"
          data-testid="add-cover"
        >
          {(page as { cover?: string | null }).cover ? "Change cover" : "Add cover"}
        </button>
      </div>
      {(page as { icon?: string | null }).icon && (
        <button onClick={() => setIconPickerOpen(true)} className="text-6xl mb-2 hover:bg-accent rounded p-1" data-testid="page-icon">
          {(page as { icon?: string | null }).icon}
        </button>
      )}
      <h1
        ref={titleRef}
        contentEditable
        suppressContentEditableWarning
        className="text-4xl font-bold outline-none w-full"
        onInput={(e) => {
          // Title is text-only. If any element nodes leaked in (via
          // execCommand insertHTML, drag-drop, etc.) flatten them right
          // away so a hostile `<img onerror>` can't survive (B-2803).
          const target = e.currentTarget;
          const text = target.innerText;
          if (target.children.length > 0) {
            target.textContent = text;
          }
          setTitle(text);
        }}
        onPaste={(e) => {
          // Force a plain-text paste — the title never needs rich HTML and
          // we MUST NOT let `<img onerror>` payloads run (B-2702).
          e.preventDefault();
          const text =
            e.clipboardData?.getData("text/plain") ??
            (e.clipboardData?.getData("text/html") ?? "").replace(/<[^>]+>/g, "");
          document.execCommand("insertText", false, text);
        }}
        onBlur={() => commitTitle(title)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitTitle(title);
            // Move focus to first block
            const firstBlock = document.querySelector(`[data-page-blocks] [contenteditable]`) as HTMLElement;
            firstBlock?.focus();
          }
        }}
        data-placeholder="Untitled"
        data-testid="page-title"
      >
        {title}
      </h1>
      {(page as { isWiki?: boolean }).isWiki && (
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          🪪 Wiki page · {(page as { verifiedAt?: number | null }).verifiedAt ? "Verified" : "Not verified"}
          {!(page as { verifiedAt?: number | null }).verifiedAt && (
            <button
              onClick={() => updatePage((page as { id: string }).id, { verifiedAt: Date.now(), verifiedBy: (page as { createdBy?: string }).createdBy })}
              className="ml-2 text-blue-600 hover:underline"
              data-testid="verify-wiki"
            >
              Verify
            </button>
          )}
        </div>
      )}
      {iconPickerOpen && (
        <EmojiOrCoverPicker
          onSelect={(icon) => {
            updatePage((page as { id: string }).id, { icon });
            setIconPickerOpen(false);
          }}
          onClose={() => setIconPickerOpen(false)}
        />
      )}
      {coverPickerOpen && (
        <CoverPicker
          current={(page as { cover?: string | null }).cover ?? null}
          onPick={(url) => {
            updatePage((page as { id: string }).id, { cover: url });
            setCoverPickerOpen(false);
          }}
          onClose={() => setCoverPickerOpen(false)}
        />
      )}
    </div>
  );
}

function PageContent({
  page,
  blocks,
  readonly,
}: {
  page: { id: string; blocks: string[] };
  blocks: Record<string, Block>;
  readonly?: boolean;
}) {
  const pageBlocks = page.blocks.map((id) => blocks[id]).filter(Boolean) as Block[];

  return (
    <div data-page-blocks>
      {pageBlocks.length === 0 && !readonly ? (
        <button
          onClick={() => {
            const id = createBlock(page.id, { type: "text", parentId: page.id, order: 0, content: "" } as Omit<Block, "id" | "createdAt" | "updatedAt">);
            setTimeout(() => {
              const el = document.querySelector(`[data-block-id="${id}"] [contenteditable]`) as HTMLElement;
              el?.focus();
            }, 0);
          }}
          className="w-full text-left text-muted-foreground py-2 hover:bg-accent rounded text-sm"
          data-testid="start-typing"
        >
          Press / for commands, or just start writing.
        </button>
      ) : (
        pageBlocks.map((b) => <BlockComponent key={b.id} block={b} pageId={page.id} />)
      )}
      {!readonly && pageBlocks.length > 0 && (
        <button
          onClick={() => {
            const id = createBlock(page.id, { type: "text", parentId: page.id, order: pageBlocks.length, content: "" } as Omit<Block, "id" | "createdAt" | "updatedAt">);
            setTimeout(() => {
              const el = document.querySelector(`[data-block-id="${id}"] [contenteditable]`) as HTMLElement;
              el?.focus();
            }, 0);
          }}
          className="w-full text-left text-muted-foreground py-4 hover:bg-accent/40 rounded text-sm"
          data-testid="add-block"
        >
          + New block
        </button>
      )}
    </div>
  );
}
