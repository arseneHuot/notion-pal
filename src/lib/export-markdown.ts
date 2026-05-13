import type { Block, Page } from "./types";

/** Convert basic inline HTML (<b>, <i>, <u>, <s>, <code>, <a>) into Markdown.
 *  Falls back to stripping unknown tags. */
function htmlToInlineMarkdown(html: string): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, "");
  }
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as Element;
    const tag = el.tagName.toUpperCase();
    const inner = Array.from(el.childNodes).map(walk).join("");
    if (tag === "BR") return "\n";
    if (tag === "B" || tag === "STRONG") return `**${inner}**`;
    if (tag === "I" || tag === "EM") return `*${inner}*`;
    if (tag === "U") return `<u>${inner}</u>`;
    if (tag === "S" || tag === "STRIKE" || tag === "DEL") return `~~${inner}~~`;
    if (tag === "CODE") return `\`${inner}\``;
    if (tag === "A") {
      const href = (el as HTMLAnchorElement).getAttribute("href") ?? "";
      return `[${inner}](${href})`;
    }
    return inner;
  }
  return Array.from(wrapper.childNodes).map(walk).join("");
}

export function pageToMarkdown(page: Page, blocks: Record<string, Block>, pages: Record<string, Page> = {}): string {
  const lines: string[] = [];
  const title = page.title?.trim() || "Untitled";
  lines.push(`# ${title}`);
  lines.push("");

  let numberedRun = 0;
  for (const blockId of page.blocks) {
    const b = blocks[blockId];
    if (!b) continue;
    if (b.type !== "numbered-list") numberedRun = 0;
    const md = blockToMarkdown(b, blocks, 0, pages);
    if (b.type === "numbered-list") {
      numberedRun += 1;
      lines.push(`${numberedRun}. ${md}`);
    } else {
      lines.push(md);
      if (b.type !== "bullet-list" && b.type !== "todo") lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function blockToMarkdown(b: Block, blocks: Record<string, Block>, depth: number, pages: Record<string, Page> = {}): string {
  const indent = "  ".repeat(depth);
  switch (b.type) {
    case "heading-1":
      return `# ${htmlToInlineMarkdown((b as { content?: string }).content ?? "")}`;
    case "heading-2":
      return `## ${htmlToInlineMarkdown((b as { content?: string }).content ?? "")}`;
    case "heading-3":
      return `### ${htmlToInlineMarkdown((b as { content?: string }).content ?? "")}`;
    case "text":
      return htmlToInlineMarkdown((b as { content?: string }).content ?? "");
    case "bullet-list":
      return `${indent}- ${htmlToInlineMarkdown((b as { content?: string }).content ?? "")}`;
    case "numbered-list":
      return htmlToInlineMarkdown((b as { content?: string }).content ?? "");
    case "todo": {
      const t = b as Extract<Block, { type: "todo" }>;
      return `${indent}- [${t.checked ? "x" : " "}] ${htmlToInlineMarkdown(t.content)}`;
    }
    case "toggle":
    case "toggle-heading-1":
    case "toggle-heading-2":
    case "toggle-heading-3": {
      const head = htmlToInlineMarkdown((b as { content?: string }).content ?? "");
      const children = Object.values(blocks)
        .filter((cb) => cb.parentId === b.id)
        .sort((a, c) => a.order - c.order);
      const childMd = children.map((c) => blockToMarkdown(c, blocks, depth + 1, pages)).join("\n");
      return `<details>\n<summary>${head}</summary>\n\n${childMd}\n</details>`;
    }
    case "callout": {
      const c = b as Extract<Block, { type: "callout" }>;
      return `> ${c.emoji ?? "💡"} ${htmlToInlineMarkdown(c.content)}`;
    }
    case "quote":
      return `> ${htmlToInlineMarkdown((b as { content?: string }).content ?? "")}`;
    case "divider":
      return "---";
    case "code": {
      const c = b as Extract<Block, { type: "code" }>;
      const fence = "```";
      const lang = c.language ?? "";
      return `${fence}${lang}\n${c.content ?? ""}\n${fence}`;
    }
    case "image": {
      const m = b as Extract<Block, { type: "image" }>;
      return m.url ? `![${m.caption ?? ""}](${m.url})` : `<!-- (empty image block) -->`;
    }
    case "video":
    case "audio":
    case "file": {
      const m = b as Extract<Block, { type: "video" | "audio" | "file" }>;
      return m.url ? `[${b.type}: ${m.fileName ?? m.url}](${m.url})` : `<!-- (empty ${b.type} block) -->`;
    }
    case "bookmark":
    case "embed": {
      const e = b as Extract<Block, { type: "embed" | "bookmark" }> & {
        bookmarkTitle?: string;
        bookmarkDescription?: string;
      };
      if (!e.url) return `<!-- (empty ${b.type} block) -->`;
      // Prefer richer metadata when present (Notion-style bookmark cards
      // carry title + description). Fall back to caption, then a tagged URL.
      const title = e.bookmarkTitle?.trim() || e.caption?.trim();
      const label = title || (b.type === "bookmark" ? `🔖 ${e.url}` : `↗ ${e.url}`);
      const linkLine = `[${label}](${e.url})`;
      if (e.bookmarkDescription?.trim()) {
        return `${linkLine}\n> ${e.bookmarkDescription.trim().replace(/\n/g, "\n> ")}`;
      }
      return linkLine;
    }
    case "equation": {
      const content = ((b as { content?: string }).content ?? "").trim();
      // Skip empty equation blocks — `$$\n\n$$` is technically valid LaTeX
      // but renders as a useless empty math block and some Markdown engines
      // reject it (B-3605 / I-3601).
      if (!content) return `<!-- (empty equation block) -->`;
      return `$$\n${content}\n$$`;
    }
    case "table": {
      const t = b as Extract<Block, { type: "table" }>;
      if (!Array.isArray(t.rows) || t.rows.length === 0) return "";
      const cols = t.rows[0]?.length ?? 0;
      const out: string[] = [];
      for (let i = 0; i < t.rows.length; i++) {
        out.push("| " + t.rows[i].map((c) => htmlToInlineMarkdown(String(c ?? ""))).join(" | ") + " |");
        if (i === 0 && (t.hasHeaderRow ?? true)) {
          out.push("| " + Array.from({ length: cols }, () => "---").join(" | ") + " |");
        }
      }
      return out.join("\n");
    }
    case "ai-block": {
      const a = b as Extract<Block, { type: "ai-block" }>;
      if (!a.result) return "";
      return "> 🤖 " + a.result.replace(/\n/g, "\n> ");
    }
    case "page-link":
    case "sub-page": {
      const link = b as Extract<Block, { type: "page-link" | "sub-page" }>;
      const target = link.pageId ? pages[link.pageId] : undefined;
      const title = target?.title?.trim() || "Sub-page";
      const icon = target?.icon ?? "📄";
      const href = target?.isPublished && target.publishSlug
        ? `/p/${target.publishSlug}`
        : link.pageId
          ? `/app/p/${link.pageId}`
          : "";
      return href ? `${icon} [${title}](${href})` : `${icon} ${title}`;
    }
    case "columns": {
      const c = b as Extract<Block, { type: "columns" }>;
      const colIds = c.columnIds ?? [];
      const out: string[] = ["<!-- multi-column layout: -->"];
      for (const colId of colIds) {
        const col = blocks[colId];
        if (!col || col.type !== "column") continue;
        const blockIds = (col as Extract<Block, { type: "column" }>).blockIds ?? [];
        out.push(`<!-- column -->`);
        for (const cid of blockIds) {
          const cb = blocks[cid];
          if (cb) out.push(blockToMarkdown(cb, blocks, depth, pages));
        }
      }
      return out.join("\n");
    }
    case "synced-block": {
      const children = Object.values(blocks)
        .filter((cb) => cb.parentId === b.id)
        .sort((a, c) => a.order - c.order);
      return children.map((c) => blockToMarkdown(c, blocks, depth, pages)).join("\n");
    }
    case "synced-block-ref": {
      const ref = b as Extract<Block, { type: "synced-block-ref" }>;
      const source = ref.sourceId ? blocks[ref.sourceId] : undefined;
      if (!source) return "<!-- synced reference: no source -->";
      const children = Object.values(blocks)
        .filter((cb) => cb.parentId === source.id)
        .sort((a, c) => a.order - c.order);
      return children.map((c) => blockToMarkdown(c, blocks, depth, pages)).join("\n");
    }
    case "button": {
      const bb = b as Extract<Block, { type: "button" }>;
      return `**[${bb.emoji ?? "▶"} ${bb.label || "Button"}]**`;
    }
    case "table-of-contents":
      return "<!-- (table of contents) -->";
    case "breadcrumb":
      return "<!-- (breadcrumb) -->";
    case "database-inline":
    case "database-linked":
      return "<!-- (embedded database) -->";
    default:
      return `<!-- ${(b as { type: string }).type} -->`;
  }
}
