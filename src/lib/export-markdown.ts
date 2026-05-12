import type { Block, Page } from "./types";
import { stripHtml } from "./text";

/** Convert a page (with its blocks) into a Markdown string. The conversion
 *  covers the block types the editor produces; unknown types fall back to a
 *  block-quote-style line so we never silently drop content. */
export function pageToMarkdown(page: Page, blocks: Record<string, Block>): string {
  const lines: string[] = [];
  const title = page.title?.trim() || "Untitled";
  lines.push(`# ${title}`);
  lines.push("");

  let numberedRun = 0;
  for (const blockId of page.blocks) {
    const b = blocks[blockId];
    if (!b) continue;
    if (b.type !== "numbered-list") numberedRun = 0;
    switch (b.type) {
      case "heading-1":
        lines.push(`## ${stripHtml((b as { content?: string }).content ?? "")}`);
        lines.push("");
        break;
      case "heading-2":
        lines.push(`### ${stripHtml((b as { content?: string }).content ?? "")}`);
        lines.push("");
        break;
      case "heading-3":
        lines.push(`#### ${stripHtml((b as { content?: string }).content ?? "")}`);
        lines.push("");
        break;
      case "text":
        lines.push(stripHtml((b as { content?: string }).content ?? ""));
        lines.push("");
        break;
      case "bullet-list":
        lines.push(`- ${stripHtml((b as { content?: string }).content ?? "")}`);
        break;
      case "numbered-list":
        numberedRun += 1;
        lines.push(`${numberedRun}. ${stripHtml((b as { content?: string }).content ?? "")}`);
        break;
      case "todo": {
        const t = b as Extract<Block, { type: "todo" }>;
        lines.push(`- [${t.checked ? "x" : " "}] ${stripHtml(t.content)}`);
        break;
      }
      case "toggle":
      case "toggle-heading-1":
      case "toggle-heading-2":
      case "toggle-heading-3":
        lines.push(`<details>`);
        lines.push(`<summary>${stripHtml((b as { content?: string }).content ?? "")}</summary>`);
        // children (parentId = block.id)
        for (const child of Object.values(blocks).filter((cb) => cb.parentId === b.id)) {
          lines.push(stripHtml((child as { content?: string }).content ?? ""));
        }
        lines.push(`</details>`);
        lines.push("");
        break;
      case "callout": {
        const c = b as Extract<Block, { type: "callout" }>;
        lines.push(`> ${c.emoji ?? "💡"} ${stripHtml(c.content)}`);
        lines.push("");
        break;
      }
      case "quote":
        lines.push(`> ${stripHtml((b as { content?: string }).content ?? "")}`);
        lines.push("");
        break;
      case "divider":
        lines.push("---");
        lines.push("");
        break;
      case "code": {
        const c = b as Extract<Block, { type: "code" }>;
        lines.push("```" + (c.language ?? ""));
        lines.push(c.content ?? "");
        lines.push("```");
        lines.push("");
        break;
      }
      case "image":
      case "video":
      case "audio":
      case "file": {
        const m = b as Extract<Block, { type: "image" | "video" | "audio" | "file" }>;
        if (m.url) lines.push(b.type === "image" ? `![](${m.url})` : `[${b.type}](${m.url})`);
        lines.push("");
        break;
      }
      case "bookmark":
      case "embed": {
        const e = b as Extract<Block, { type: "embed" | "bookmark" }>;
        if (e.url) lines.push(`[${e.url}](${e.url})`);
        lines.push("");
        break;
      }
      case "equation":
        lines.push("$$");
        lines.push((b as { content?: string }).content ?? "");
        lines.push("$$");
        lines.push("");
        break;
      case "table": {
        const t = b as Extract<Block, { type: "table" }>;
        if (Array.isArray(t.rows) && t.rows.length > 0) {
          const cols = t.rows[0]?.length ?? 0;
          for (let i = 0; i < t.rows.length; i++) {
            lines.push("| " + t.rows[i].map((c) => stripHtml(String(c ?? ""))).join(" | ") + " |");
            if (i === 0 && t.hasHeaderRow) {
              lines.push("| " + Array.from({ length: cols }, () => "---").join(" | ") + " |");
            }
          }
          lines.push("");
        }
        break;
      }
      case "ai-block": {
        const a = b as Extract<Block, { type: "ai-block" }>;
        if (a.result) {
          lines.push("> 🤖 " + a.result.replace(/\n/g, "\n> "));
          lines.push("");
        }
        break;
      }
      case "page-link":
      case "sub-page":
        lines.push(`📄 Sub-page`);
        lines.push("");
        break;
      case "columns":
      case "column":
      case "database-inline":
      case "database-linked":
      case "synced-block":
      case "synced-block-ref":
      case "table-of-contents":
      case "breadcrumb":
      case "button":
        lines.push(`<!-- ${b.type} -->`);
        lines.push("");
        break;
      default:
        lines.push(`<!-- ${(b as { type: string }).type} -->`);
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}
