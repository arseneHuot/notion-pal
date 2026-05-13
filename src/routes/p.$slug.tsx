import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BlockComponent } from "@/components/editor/Block";
import { sanitizeHtml } from "@/lib/sanitize";
import type { Page, Block } from "@/lib/types";

export const Route = createFileRoute("/p/$slug")({
  component: PublicPage,
});

function PublicPage() {
  const { slug } = Route.useParams();
  const [data, setData] = useState<{ page: Page; blocks: Record<string, Block>; pages: Record<string, Page> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Search all local user stores for a page with this slug
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    let found: { page: Page; blocks: Record<string, Block>; pages: Record<string, Page> } | null = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("notion-clone:user:")) continue;
      try {
        const state = JSON.parse(localStorage.getItem(key) ?? "{}");
        const pages: Record<string, Page> = state.pages ?? {};
        for (const p of Object.values(pages)) {
          if (p.isPublished && p.publishSlug === slug && !p.isInTrash) {
            found = { page: p, blocks: state.blocks ?? {}, pages };
            break;
          }
        }
      } catch {
        // ignore
      }
      if (found) break;
    }
    setData(found);
    setLoading(false);
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Page not found</h1>
          <p className="text-sm text-muted-foreground">This page may have been unpublished or never existed.</p>
          <Link to="/" className="mt-4 inline-block text-blue-600 underline">Go home</Link>
        </div>
      </div>
    );
  }

  const { page, blocks, pages } = data;
  const pageBlocks = page.blocks.map((id) => blocks[id]).filter(Boolean) as Block[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-3 flex items-center gap-2">
        <span className="size-7 rounded bg-primary text-primary-foreground grid place-items-center font-bold">N</span>
        <span className="font-semibold text-sm">NotionClone</span>
        <Link to="/" className="ml-auto text-xs text-muted-foreground hover:text-foreground">Create your own →</Link>
      </header>
      {page.cover && <div className="h-48"><img src={page.cover} className="w-full h-full object-cover" alt="cover" /></div>}
      <article className="max-w-3xl mx-auto px-8 py-12">
        {page.icon && <div className="text-6xl mb-4">{page.icon}</div>}
        <h1 className="text-4xl font-bold mb-6">{page.title || "Untitled"}</h1>
        <div data-page-blocks>
          {pageBlocks.map((b) => (
            <ReadonlyBlock key={b.id} block={b} blocks={blocks} pages={pages} />
          ))}
        </div>
        <footer className="mt-12 pt-4 border-t border-border text-xs text-muted-foreground flex items-center justify-between" data-testid="public-page-footer">
          <span>Read-only · Comments are disabled on public pages.</span>
          <Link to="/" className="hover:underline">Make your own ↗</Link>
        </footer>
      </article>
    </div>
  );
}

function safeHtml(s: string | undefined): { __html: string } {
  return { __html: sanitizeHtml(s ?? "") };
}

function ReadonlyBlock({
  block,
  blocks = {},
  pages = {},
  syncedAncestors,
}: {
  block: Block;
  blocks?: Record<string, Block>;
  pages?: Record<string, Page>;
  /** Set of synced-block / synced-block-ref source IDs already on the
   *  current render path. Threaded through recursion to detect cycles in
   *  the synced graph and break out with a placeholder instead of
   *  recursing forever (B-8100 — same hazard class as B-8001). The
   *  editor side has the equivalent `SyncedAncestorsContext`. */
  syncedAncestors?: Set<string>;
}) {
  // B-7901 — alias foreign / legacy block types to their canonical form so
  // imports from Notion's API and Markdown sources don't silently disappear
  // off the public page. Mirrors the editor + markdown-export alias maps so
  // every renderer agrees on what each type means.
  const ALIASES: Record<string, string> = {
    paragraph: "text",
    p: "text",
    body: "text",
    richtext: "text",
    "bulleted-list": "bullet-list",
    bullet: "bullet-list",
    "numbered-list-item": "numbered-list",
    "header-1": "heading-1",
    "header-2": "heading-2",
    "header-3": "heading-3",
  };
  const rawType = (block as { type: string }).type;
  if (rawType in ALIASES) {
    return (
      <ReadonlyBlock
        block={{ ...(block as object), type: ALIASES[rawType] } as Block}
        blocks={blocks}
        pages={pages}
        syncedAncestors={syncedAncestors}
      />
    );
  }
  if (block.type === "heading-1") return <h1 className="text-3xl font-bold mt-4 mb-1" dangerouslySetInnerHTML={safeHtml((block as { content?: string }).content)} />;
  if (block.type === "heading-2") return <h2 className="text-2xl font-semibold mt-3 mb-1" dangerouslySetInnerHTML={safeHtml((block as { content?: string }).content)} />;
  if (block.type === "heading-3") return <h3 className="text-xl font-semibold mt-2 mb-1" dangerouslySetInnerHTML={safeHtml((block as { content?: string }).content)} />;
  if (block.type === "bullet-list") return <ul className="list-disc pl-5"><li dangerouslySetInnerHTML={safeHtml((block as { content?: string }).content)} /></ul>;
  if (block.type === "numbered-list") return <ol className="list-decimal pl-5"><li dangerouslySetInnerHTML={safeHtml((block as { content?: string }).content)} /></ol>;
  if (block.type === "todo") {
    const todo = block as Extract<Block, { type: "todo" }>;
    return (
      <div className="flex items-start gap-2 py-0.5">
        <input type="checkbox" checked={todo.checked} disabled className="mt-1.5" />
        <div className={todo.checked ? "line-through text-muted-foreground" : ""} dangerouslySetInnerHTML={safeHtml(todo.content)} />
      </div>
    );
  }
  if (block.type === "quote") return <blockquote className="border-l-4 border-foreground/40 pl-3 italic" dangerouslySetInnerHTML={safeHtml((block as { content?: string }).content)} />;
  if (block.type === "callout") {
    const c = block as Extract<Block, { type: "callout" }>;
    return (
      <div className="flex items-start gap-3 bg-muted/40 rounded-lg p-3 my-2">
        <div className="text-xl">{c.emoji}</div>
        <div dangerouslySetInnerHTML={safeHtml(c.content)} />
      </div>
    );
  }
  if (block.type === "divider") return <hr className="my-3 border-border" />;
  if (block.type === "code") {
    const c = block as Extract<Block, { type: "code" }>;
    return <pre className="bg-muted rounded-md p-3 overflow-x-auto"><code className="text-sm font-mono">{c.content}</code></pre>;
  }
  if (block.type === "image") {
    const url = (block as { url?: string }).url ?? "";
    if (!/^(https?:|data:)/i.test(url)) return null;
    return <img src={url} className="max-w-full rounded" alt="" />;
  }
  if (block.type === "video") {
    const url = (block as { url?: string }).url ?? "";
    if (!/^https?:/i.test(url)) return null;
    let src = url;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) src = `https://www.youtube.com/embed/${yt[1]}`;
    return (
      <div className="aspect-video rounded-md overflow-hidden bg-muted my-2">
        <iframe src={src} className="w-full h-full" allow="encrypted-media" />
      </div>
    );
  }
  if (block.type === "audio") {
    const url = (block as { url?: string }).url ?? "";
    if (!/^https?:/i.test(url)) return null;
    return <audio controls src={url} className="w-full my-2" />;
  }
  if (block.type === "embed" || block.type === "bookmark") {
    const url = (block as { url?: string }).url ?? "";
    if (!/^https?:/i.test(url)) return null;
    if (block.type === "embed") {
      return (
        <div className="aspect-video rounded-md overflow-hidden bg-muted my-2 border border-border">
          <iframe src={url} className="w-full h-full" sandbox="allow-scripts allow-same-origin" />
        </div>
      );
    }
    let host = url;
    try { host = new URL(url).hostname; } catch { /* ignore */ }
    return (
      <a href={url} target="_blank" rel="noreferrer noopener" className="block border border-border rounded-md p-3 my-2 hover:bg-accent">
        <div className="text-sm font-medium truncate">{host}</div>
        <div className="text-xs text-muted-foreground truncate">{url}</div>
      </a>
    );
  }
  if (block.type === "toggle" || block.type === "toggle-heading-1" || block.type === "toggle-heading-2" || block.type === "toggle-heading-3") {
    const t = block as Extract<Block, { type: "toggle" | "toggle-heading-1" | "toggle-heading-2" | "toggle-heading-3" }>;
    const headingClass =
      block.type === "toggle-heading-1" ? "text-3xl font-bold" :
      block.type === "toggle-heading-2" ? "text-2xl font-semibold" :
      block.type === "toggle-heading-3" ? "text-xl font-semibold" :
      "text-base";
    // Render any child blocks (B-801). We discover them by parentId === t.id.
    const children = Object.values(blocks).filter((b) => b.parentId === t.id).sort((a, b) => a.order - b.order);
    return (
      <details className="my-1" open={t.open}>
        <summary className={`cursor-pointer ${headingClass}`}>
          <span dangerouslySetInnerHTML={safeHtml(t.content)} />
        </summary>
        <div className="pl-5 mt-1">
          {children.map((c) => (
            <ReadonlyBlock key={c.id} block={c} blocks={blocks} pages={pages} syncedAncestors={syncedAncestors} />
          ))}
        </div>
      </details>
    );
  }
  if (block.type === "equation") {
    return <pre className="bg-muted/40 rounded p-3 font-mono text-sm whitespace-pre-wrap my-2">{(block as { content?: string }).content ?? ""}</pre>;
  }
  if (block.type === "table") {
    const t = block as Extract<Block, { type: "table" }>;
    return (
      <div className="overflow-x-auto my-2">
        <table className="border-collapse border border-border w-full text-sm">
          <tbody>
            {t.rows.map((row, ri) => (
              <tr key={ri} className={t.hasHeaderRow && ri === 0 ? "bg-muted/40 font-medium" : ""}>
                {row.map((cell, ci) => (
                  <td key={ci} className={`border border-border px-2 py-1 ${t.hasHeaderCol && ci === 0 ? "bg-muted/40 font-medium" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "table-of-contents") {
    return <div className="text-xs text-muted-foreground italic my-2">(Table of contents)</div>;
  }
  if (block.type === "breadcrumb") {
    return null;
  }
  if (block.type === "columns") {
    return <div className="text-xs text-muted-foreground italic my-2">(Multi-column layout — open the workspace to view)</div>;
  }
  if (block.type === "database-inline" || block.type === "database-linked") {
    return <div className="text-xs text-muted-foreground italic my-2 border border-border rounded p-3">(Embedded database — open the workspace to view)</div>;
  }
  if (block.type === "ai-block") {
    const a = block as Extract<Block, { type: "ai-block" }>;
    return (
      <div className="rounded-md border border-violet-300 dark:border-violet-700 bg-violet-50/40 dark:bg-violet-950/30 p-3 my-2 text-sm whitespace-pre-wrap">
        {a.result || <span className="text-muted-foreground italic">AI block (no output yet)</span>}
      </div>
    );
  }
  if (block.type === "sub-page" || block.type === "page-link") {
    const l = block as Extract<Block, { type: "sub-page" | "page-link" }>;
    const target = l.pageId ? pages[l.pageId] : undefined;
    const title = target?.title?.trim() || "Untitled";
    const icon = target?.icon ?? "📄";
    if (target?.isPublished && target?.publishSlug) {
      return (
        <a href={`/p/${target.publishSlug}`} className="inline-flex items-center gap-2 underline my-2 text-foreground">
          <span>{icon}</span>
          <span>{title}</span>
        </a>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 my-2 text-muted-foreground">
        <span>{icon}</span>
        <span>{title} <span className="text-xs">(unpublished)</span></span>
      </div>
    );
  }
  if (block.type === "synced-block") {
    // B-8100 — cycle guard: if a descendant block points back at this
    // synced-block (via a ref), we'd recurse forever and hang every
    // visitor of the public link. The editor uses SyncedAncestorsContext;
    // this thread-an-arg approach is the public-render analogue.
    if (syncedAncestors && syncedAncestors.has(block.id)) {
      return <div className="text-xs text-muted-foreground italic my-2">(Synced cycle detected)</div>;
    }
    const nextAncestors = new Set(syncedAncestors ?? []);
    nextAncestors.add(block.id);
    const children = Object.values(blocks).filter((b) => b.parentId === block.id).sort((a, b) => a.order - b.order);
    return (
      <div className="border-l-4 border-pink-400 pl-3 py-2 my-2">
        {children.map((c) => (
          <ReadonlyBlock key={c.id} block={c} blocks={blocks} pages={pages} syncedAncestors={nextAncestors} />
        ))}
      </div>
    );
  }
  if (block.type === "synced-block-ref") {
    const sourceId = (block as { sourceId?: string }).sourceId;
    const source = sourceId ? blocks[sourceId] : undefined;
    if (!source) return <div className="text-xs text-muted-foreground italic my-2">(Synced content — source unavailable)</div>;
    // B-8100 — same cycle guard: a ref whose source is already in the
    // ancestor chain would loop. Track the SOURCE id (not the ref id) so
    // multiple refs pointing at the same source still trigger the guard.
    if (syncedAncestors && syncedAncestors.has(source.id)) {
      return <div className="text-xs text-muted-foreground italic my-2">(Synced cycle detected)</div>;
    }
    const nextAncestors = new Set(syncedAncestors ?? []);
    nextAncestors.add(source.id);
    const children = Object.values(blocks).filter((b) => b.parentId === source.id).sort((a, b) => a.order - b.order);
    return (
      <div className="border-l-4 border-pink-400 pl-3 py-2 my-2">
        {children.map((c) => (
          <ReadonlyBlock key={c.id} block={c} blocks={blocks} pages={pages} syncedAncestors={nextAncestors} />
        ))}
      </div>
    );
  }
  if (block.type === "button") {
    const b = block as Extract<Block, { type: "button" }>;
    return <div className="my-2"><span className="inline-block bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium">{b.emoji} {b.label}</span></div>;
  }
  if (block.type === "file") {
    const f = block as Block & { url: string; fileName?: string };
    if (!/^https?:/i.test(f.url ?? "")) return null;
    return <a href={f.url} target="_blank" rel="noreferrer noopener" className="text-sm underline">📎 {f.fileName ?? f.url}</a>;
  }
  if (block.type === "text") return <p dangerouslySetInnerHTML={safeHtml((block as { content?: string }).content)} />;
  // Graceful fallback for unknown block types that nonetheless carry a
  // `content` field (B-7901). Render the content as plain text rather than
  // dropping the user's data on the floor. Output still goes through
  // `sanitizeHtml` so script-injection isn't an escape hatch.
  const maybeContent = (block as { content?: string }).content;
  if (typeof maybeContent === "string" && maybeContent.length > 0) {
    return <p dangerouslySetInnerHTML={safeHtml(maybeContent)} />;
  }
  return null;
}
