import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BlockComponent } from "@/components/editor/Block";
import type { Page, Block } from "@/lib/types";

export const Route = createFileRoute("/p/$slug")({
  component: PublicPage,
});

function PublicPage() {
  const { slug } = Route.useParams();
  const [data, setData] = useState<{ page: Page; blocks: Record<string, Block> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Search all local user stores for a page with this slug
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    let found: { page: Page; blocks: Record<string, Block> } | null = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("notion-clone:user:")) continue;
      try {
        const state = JSON.parse(localStorage.getItem(key) ?? "{}");
        const pages: Record<string, Page> = state.pages ?? {};
        for (const p of Object.values(pages)) {
          if (p.isPublished && p.publishSlug === slug && !p.isInTrash) {
            found = { page: p, blocks: state.blocks ?? {} };
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

  const { page, blocks } = data;
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
          {pageBlocks.map((b) => <ReadonlyBlock key={b.id} block={b} />)}
        </div>
      </article>
    </div>
  );
}

function ReadonlyBlock({ block }: { block: Block }) {
  // For simplicity reuse the BlockComponent but it would require disabling editing.
  // Instead, render a simplified view.
  if (block.type === "heading-1") return <h1 className="text-3xl font-bold mt-4 mb-1" dangerouslySetInnerHTML={{ __html: (block as { content?: string }).content ?? "" }} />;
  if (block.type === "heading-2") return <h2 className="text-2xl font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: (block as { content?: string }).content ?? "" }} />;
  if (block.type === "heading-3") return <h3 className="text-xl font-semibold mt-2 mb-1" dangerouslySetInnerHTML={{ __html: (block as { content?: string }).content ?? "" }} />;
  if (block.type === "bullet-list") return <ul className="list-disc pl-5"><li dangerouslySetInnerHTML={{ __html: (block as { content?: string }).content ?? "" }} /></ul>;
  if (block.type === "numbered-list") return <ol className="list-decimal pl-5"><li dangerouslySetInnerHTML={{ __html: (block as { content?: string }).content ?? "" }} /></ol>;
  if (block.type === "todo") {
    const todo = block as Extract<Block, { type: "todo" }>;
    return (
      <div className="flex items-start gap-2 py-0.5">
        <input type="checkbox" checked={todo.checked} disabled className="mt-1.5" />
        <div className={todo.checked ? "line-through text-muted-foreground" : ""} dangerouslySetInnerHTML={{ __html: todo.content }} />
      </div>
    );
  }
  if (block.type === "quote") return <blockquote className="border-l-4 border-foreground/40 pl-3 italic" dangerouslySetInnerHTML={{ __html: (block as { content?: string }).content ?? "" }} />;
  if (block.type === "callout") {
    const c = block as Extract<Block, { type: "callout" }>;
    return (
      <div className="flex items-start gap-3 bg-muted/40 rounded-lg p-3 my-2">
        <div className="text-xl">{c.emoji}</div>
        <div dangerouslySetInnerHTML={{ __html: c.content }} />
      </div>
    );
  }
  if (block.type === "divider") return <hr className="my-3 border-border" />;
  if (block.type === "code") {
    const c = block as Extract<Block, { type: "code" }>;
    return <pre className="bg-muted rounded-md p-3 overflow-x-auto"><code className="text-sm font-mono">{c.content}</code></pre>;
  }
  if (block.type === "image") return <img src={(block as { url?: string }).url} className="max-w-full rounded" alt="" />;
  if (block.type === "text") return <p dangerouslySetInnerHTML={{ __html: (block as { content?: string }).content ?? "" }} />;
  return null;
}
