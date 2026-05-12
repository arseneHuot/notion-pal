import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  GripVertical, Plus, ChevronRight, ChevronDown, MoreHorizontal, Trash, Copy,
  Type as TypeIcon, X,
} from "lucide-react";
import type { Block, BlockType } from "@/lib/types";
import { useStore, createBlock, updateBlock, deleteBlock, reorderBlocks, createPage, createDatabase, insertBlock } from "@/lib/store";
import { SlashMenu } from "./SlashMenu";
import { filterSlash, type SlashCommand } from "@/lib/slash-commands";
import { InlineDatabase } from "@/components/database/InlineDatabase";

interface Props {
  block: Block;
  pageId: string;
  onFocusNext?: () => void;
  onFocusPrev?: () => void;
  onConvert?: (newType: BlockType) => void;
  parentColumnCount?: number;
}

export function BlockComponent({ block, pageId }: Props) {
  switch (block.type) {
    case "text":
    case "heading-1":
    case "heading-2":
    case "heading-3":
    case "bullet-list":
    case "numbered-list":
    case "quote":
      return <TextLikeBlock block={block} pageId={pageId} />;
    case "todo":
      return <TodoBlockEl block={block} pageId={pageId} />;
    case "toggle":
    case "toggle-heading-1":
    case "toggle-heading-2":
    case "toggle-heading-3":
      return <ToggleBlockEl block={block} pageId={pageId} />;
    case "callout":
      return <CalloutBlockEl block={block} pageId={pageId} />;
    case "divider":
      return <DividerEl block={block} pageId={pageId} />;
    case "code":
      return <CodeBlockEl block={block} pageId={pageId} />;
    case "image":
    case "video":
    case "audio":
    case "file":
      return <MediaBlockEl block={block} pageId={pageId} />;
    case "embed":
    case "bookmark":
      return <EmbedBlockEl block={block} pageId={pageId} />;
    case "page-link":
    case "sub-page":
      return <PageLinkEl block={block} pageId={pageId} />;
    case "database-inline":
    case "database-linked":
      return <DatabaseBlockEl block={block} pageId={pageId} />;
    case "table":
      return <SimpleTableEl block={block} pageId={pageId} />;
    case "equation":
      return <EquationEl block={block} pageId={pageId} />;
    case "table-of-contents":
      return <TocEl block={block} pageId={pageId} />;
    case "breadcrumb":
      return <BreadcrumbEl block={block} pageId={pageId} />;
    case "synced-block":
    case "synced-block-ref":
      return <SyncedEl block={block} pageId={pageId} />;
    case "ai-block":
      return <AIBlockEl block={block} pageId={pageId} />;
    case "button":
      return <ButtonBlockEl block={block} pageId={pageId} />;
    case "columns":
      return <ColumnsEl block={block} pageId={pageId} />;
    default:
      return <div className="text-xs text-muted-foreground p-2">Unsupported block: {block.type}</div>;
  }
}

// ===================== Common wrapper with handle, drag and slash =====================

function BlockShell({
  block,
  pageId,
  children,
  innerRef,
  onPlus,
}: {
  block: Block;
  pageId: string;
  children: React.ReactNode;
  innerRef?: React.RefObject<HTMLDivElement | null>;
  onPlus?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const pageBlocks = useStore((s) => s.pages[pageId]?.blocks ?? []);

  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("text/x-block-id", block.id);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (innerRef?.current) {
      innerRef.current.classList.add("ring-1", "ring-blue-400");
    }
  }
  function onDragLeave() {
    if (innerRef?.current) {
      innerRef.current.classList.remove("ring-1", "ring-blue-400");
    }
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (innerRef?.current) {
      innerRef.current.classList.remove("ring-1", "ring-blue-400");
    }
    const sourceId = e.dataTransfer.getData("text/x-block-id");
    if (!sourceId || sourceId === block.id) return;
    const targetIndex = pageBlocks.indexOf(block.id);
    const sourceIndex = pageBlocks.indexOf(sourceId);
    if (targetIndex === -1 || sourceIndex === -1) return;
    const newOrder = pageBlocks.filter((b) => b !== sourceId);
    const insertIndex = sourceIndex < targetIndex ? targetIndex : targetIndex;
    newOrder.splice(insertIndex, 0, sourceId);
    reorderBlocks(pageId, newOrder);
  }

  return (
    <div
      className="group/block relative flex items-start gap-1 py-0.5"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-block-id={block.id}
      data-block-type={block.type}
    >
      <div className={`flex shrink-0 items-start mt-1 transition ${hovering ? "opacity-100" : "opacity-0"}`}>
        <button
          onClick={() => onPlus?.()}
          className="p-0.5 rounded hover:bg-accent text-muted-foreground"
          title="Add block below"
          data-testid={`plus-${block.id}`}
        >
          <Plus className="size-3.5" />
        </button>
        <div
          ref={handleRef}
          draggable
          onDragStart={onDragStart}
          onClick={() => setMenuOpen((v) => !v)}
          className="p-0.5 rounded hover:bg-accent text-muted-foreground cursor-grab active:cursor-grabbing"
          title="Block options"
          data-testid={`handle-${block.id}`}
        >
          <GripVertical className="size-3.5" />
        </div>
      </div>
      <div ref={innerRef} className="flex-1 min-w-0 rounded">
        {children}
      </div>
      {menuOpen && (
        <BlockMenu
          block={block}
          pageId={pageId}
          close={() => setMenuOpen(false)}
          anchorRef={handleRef}
        />
      )}
    </div>
  );
}

function BlockMenu({
  block,
  pageId,
  close,
  anchorRef,
}: {
  block: Block;
  pageId: string;
  close: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ x: rect.left, y: rect.bottom + 4 });
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) && !anchorRef.current?.contains(e.target as Node)) {
        close();
      }
    }
    setTimeout(() => window.addEventListener("click", onClick), 0);
    return () => window.removeEventListener("click", onClick);
  }, [anchorRef, close]);

  function convertTo(type: BlockType) {
    const patch: Partial<Block> = { type } as Partial<Block>;
    if (type === "callout" && !("emoji" in block)) {
      (patch as Record<string, unknown>).emoji = "💡";
    }
    if (type === "code" && !("language" in block)) {
      (patch as Record<string, unknown>).language = "javascript";
    }
    if (type === "todo" && !("checked" in block)) {
      (patch as Record<string, unknown>).checked = false;
    }
    if (
      (type === "toggle" || type.startsWith("toggle-heading")) &&
      !("open" in block)
    ) {
      (patch as Record<string, unknown>).open = true;
    }
    if (type === "equation" && !("content" in block)) {
      (patch as Record<string, unknown>).content = "";
    }
    updateBlock(block.id, patch);
    close();
  }

  return (
    <div
      ref={ref}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 w-56"
    >
      <MenuItem
        onClick={() => {
          deleteBlock(block.id, pageId);
          close();
        }}
        icon={<Trash className="size-3.5" />}
        label="Delete"
        shortcut="Del"
        testid={`menu-delete-${block.id}`}
      />
      <MenuItem
        onClick={() => {
          const newId = createBlock(pageId, { ...block, parentId: pageId, order: block.order } as Block, block.id);
          close();
        }}
        icon={<Copy className="size-3.5" />}
        label="Duplicate"
        shortcut="⌘D"
      />
      <div className="border-t border-border my-1" />
      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Turn into</div>
      {(["text", "heading-1", "heading-2", "heading-3", "bullet-list", "numbered-list", "todo", "toggle", "quote", "callout", "code", "divider"] as BlockType[]).map((t) => (
        <button
          key={t}
          onClick={() => convertTo(t)}
          className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
          data-testid={`turn-${t}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function MenuItem({ onClick, icon, label, shortcut, testid }: { onClick: () => void; icon: React.ReactNode; label: string; shortcut?: string; testid?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent text-left"
      data-testid={testid}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-muted-foreground">{shortcut}</span>}
    </button>
  );
}

// ===================== ContentEditable hook =====================

function useEditable(
  block: Block,
  pageId: string,
  className: string,
  options: {
    placeholder?: string;
    onEnter?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  } = {},
) {
  const ref = useRef<HTMLDivElement>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashPos, setSlashPos] = useState({ x: 0, y: 0 });
  const pageBlocks = useStore((s) => s.pages[pageId]?.blocks ?? []);

  // Initialize content. Only sync DOM if the content diverges AND the
  // editor isn't currently focused (avoids cursor jumps on every keystroke).
  useEffect(() => {
    if (!ref.current) return;
    const content = (block as { content?: string }).content ?? "";
    const isFocused = document.activeElement === ref.current;
    if (ref.current.innerHTML !== content && !isFocused) {
      ref.current.innerHTML = content;
    }
  }, [block.id, (block as { content?: string }).content, block.type]);

  const focus = useCallback(() => {
    ref.current?.focus();
    // place caret at end
    if (ref.current) {
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  function onInput(e: React.FormEvent<HTMLDivElement>) {
    const text = e.currentTarget.innerHTML;
    const plain = e.currentTarget.innerText;
    updateBlock(block.id, { content: text } as Partial<Block>);

    // Detect slash
    if (plain.startsWith("/")) {
      const sel = window.getSelection();
      const range = sel?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setSlashPos({ x: rect.left, y: rect.bottom + 8 });
      }
      setSlashQuery(plain.slice(1));
      setSlashOpen(true);
    } else if (slashOpen) {
      setSlashOpen(false);
    }

    // Markdown shortcuts on the fly when ending with space at beginning
    handleMarkdownShortcuts(plain);
  }

  function handleMarkdownShortcuts(plain: string) {
    // Order matters: longer prefixes (>>, ###, ```, ---) must come before their shorter siblings.
    const m = plain.match(/^(>>|###|##|#|```|---|\*|-|\+|>|\[\]|\d+\.)\s/);
    if (!m || !ref.current) return;
    const prefix = m[1];
    let newType: BlockType | null = null;
    if (prefix === "#") newType = "heading-1";
    else if (prefix === "##") newType = "heading-2";
    else if (prefix === "###") newType = "heading-3";
    else if (prefix === "-" || prefix === "*" || prefix === "+") newType = "bullet-list";
    else if (prefix === ">") newType = "quote";
    else if (prefix === ">>") newType = "toggle";
    else if (prefix === "[]") newType = "todo";
    else if (prefix === "```") newType = "code";
    else if (prefix === "---") newType = "divider";
    else if (/^\d+\.$/.test(prefix)) newType = "numbered-list";

    if (newType) {
      const remaining = plain.slice(prefix.length + 1);
      updateBlock(block.id, { type: newType, content: remaining } as Partial<Block>);
      // Clear DOM since the prefix is part of innerHTML
      if (ref.current) ref.current.innerHTML = remaining;
      setTimeout(() => focus(), 0);
    }
  }

  function handleSlashSelect(cmd: SlashCommand) {
    setSlashOpen(false);
    // Clear the DOM so the leading "/query" text doesn't linger.
    if (ref.current) ref.current.innerHTML = "";
    if (cmd.action === "convert" && cmd.blockType) {
      // Replace the block with a new type
      const patch: Partial<Block> = { type: cmd.blockType, content: "" } as Partial<Block>;
      if (cmd.blockType === "callout") (patch as Record<string, unknown>).emoji = "💡";
      if (cmd.blockType === "code") (patch as Record<string, unknown>).language = "javascript";
      if (cmd.blockType === "todo") (patch as Record<string, unknown>).checked = false;
      if (cmd.blockType.startsWith("toggle")) (patch as Record<string, unknown>).open = true;
      if (cmd.blockType === "equation") (patch as Record<string, unknown>).content = "";
      if (cmd.blockType === "table") {
        (patch as Record<string, unknown>).rows = [
          ["", "", ""],
          ["", "", ""],
        ];
        (patch as Record<string, unknown>).hasHeaderRow = true;
        (patch as Record<string, unknown>).hasHeaderCol = false;
      }
      if (cmd.blockType === "button") {
        (patch as Record<string, unknown>).label = "Click me";
        (patch as Record<string, unknown>).actions = [];
      }
      updateBlock(block.id, patch);
    } else if (cmd.action === "insert") {
      // Insert a new block of the corresponding kind
      if (cmd.custom === "page" || cmd.custom === "sub-page") {
        const newPageId = createPage({ title: "Untitled", parentId: pageId });
        const newBlock = {
          type: "sub-page" as BlockType,
          parentId: pageId,
          order: 0,
          pageId: newPageId,
        };
        updateBlock(block.id, newBlock as Partial<Block>);
      } else if (cmd.custom === "database-inline") {
        const dbId = createDatabase({ parentId: pageId, isInline: true });
        const viewIdMap = useStore.toString; // not used; we just pick first view of matching type
        const db = useStore.getState ? null : null; // no-op
        // We'll need to read view of matching type. We do that via getState.
        // Lazy import to avoid circular dependency.
        import("@/lib/store").then(({ getState }) => {
          const dbObj = getState().databases[dbId];
          const viewId = dbObj?.views.find((v) => v.type === (cmd.extra as { view?: string } | undefined)?.view)?.id ?? dbObj?.views[0]?.id;
          updateBlock(block.id, {
            type: "database-inline" as BlockType,
            databaseId: dbId,
            viewId,
          } as Partial<Block>);
        });
      } else if (cmd.custom === "image" || cmd.custom === "video" || cmd.custom === "audio" || cmd.custom === "file") {
        updateBlock(block.id, { type: cmd.custom as BlockType, url: "" } as Partial<Block>);
      } else if (cmd.custom === "embed" || cmd.custom === "bookmark") {
        updateBlock(block.id, { type: cmd.custom as BlockType, url: "" } as Partial<Block>);
      } else if (cmd.custom === "columns") {
        const count = (cmd.extra as { columns?: number } | undefined)?.columns ?? 2;
        updateBlock(block.id, { type: "columns" as BlockType, columns: count } as Partial<Block>);
      }
    }
    setTimeout(() => focus(), 0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (slashOpen) {
      // SlashMenu handles ArrowDown/Up/Enter/Escape
      if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
        e.preventDefault();
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (options.onEnter) {
        options.onEnter(e);
        return;
      }
      // Default: create text block below
      const newBlockId = createBlock(
        pageId,
        {
          type: block.type === "heading-1" || block.type === "heading-2" || block.type === "heading-3" ? "text" : block.type,
          parentId: pageId,
          order: block.order + 1,
          content: "",
          ...(block.type === "todo" ? { checked: false } : {}),
        } as Omit<Block, "id" | "createdAt" | "updatedAt">,
        block.id,
      );
      // Focus the new block
      setTimeout(() => {
        const el = document.querySelector(`[data-block-id="${newBlockId}"] [contenteditable]`) as HTMLElement;
        el?.focus();
      }, 0);
    } else if (e.key === "Backspace") {
      const text = ref.current?.innerText ?? "";
      if (text === "") {
        e.preventDefault();
        const idx = pageBlocks.indexOf(block.id);
        if (idx > 0) {
          const prevId = pageBlocks[idx - 1];
          deleteBlock(block.id, pageId);
          setTimeout(() => {
            const el = document.querySelector(`[data-block-id="${prevId}"] [contenteditable]`) as HTMLElement;
            if (el) {
              el.focus();
              const range = document.createRange();
              range.selectNodeContents(el);
              range.collapse(false);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          }, 0);
        }
      }
    } else if (e.key === "ArrowUp") {
      const sel = window.getSelection();
      if (!sel) return;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const blockRect = ref.current?.getBoundingClientRect();
      if (blockRect && rect.top - blockRect.top < 8) {
        e.preventDefault();
        const idx = pageBlocks.indexOf(block.id);
        if (idx > 0) {
          const prevId = pageBlocks[idx - 1];
          const el = document.querySelector(`[data-block-id="${prevId}"] [contenteditable]`) as HTMLElement;
          el?.focus();
        }
      }
    } else if (e.key === "ArrowDown") {
      const sel = window.getSelection();
      if (!sel) return;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const blockRect = ref.current?.getBoundingClientRect();
      if (blockRect && blockRect.bottom - rect.bottom < 8) {
        e.preventDefault();
        const idx = pageBlocks.indexOf(block.id);
        if (idx < pageBlocks.length - 1) {
          const nextId = pageBlocks[idx + 1];
          const el = document.querySelector(`[data-block-id="${nextId}"] [contenteditable]`) as HTMLElement;
          el?.focus();
        }
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      document.execCommand("bold");
    } else if ((e.metaKey || e.ctrlKey) && e.key === "i") {
      e.preventDefault();
      document.execCommand("italic");
    } else if ((e.metaKey || e.ctrlKey) && e.key === "u") {
      e.preventDefault();
      document.execCommand("underline");
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      document.execCommand("strikeThrough");
    } else if ((e.metaKey || e.ctrlKey) && e.key === "e") {
      e.preventDefault();
      // Inline code
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const span = document.createElement("code");
        span.className = "bg-muted px-1 rounded text-xs font-mono";
        try {
          range.surroundContents(span);
          updateBlock(block.id, { content: ref.current?.innerHTML ?? "" } as Partial<Block>);
        } catch {
          // Selection crosses boundaries
        }
      }
    }
  }

  return {
    ref,
    onInput,
    onKeyDown,
    slashOpen,
    slashQuery,
    slashPos,
    slashSelect: handleSlashSelect,
    slashClose: () => setSlashOpen(false),
    placeholder: options.placeholder,
  };
}

// ===================== Specific block components =====================

function TextLikeBlock({ block, pageId }: { block: Block; pageId: string }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const editable = useEditable(block, pageId, "");
  let className = "outline-none w-full py-0.5";
  let placeholder = "Type / for commands";
  if (block.type === "heading-1") {
    className += " text-3xl font-bold mt-4 mb-1";
    placeholder = "Heading 1";
  } else if (block.type === "heading-2") {
    className += " text-2xl font-semibold mt-3 mb-1";
    placeholder = "Heading 2";
  } else if (block.type === "heading-3") {
    className += " text-xl font-semibold mt-2 mb-1";
    placeholder = "Heading 3";
  } else if (block.type === "bullet-list") {
    className += " text-base";
    placeholder = "List";
  } else if (block.type === "numbered-list") {
    className += " text-base";
    placeholder = "List";
  } else if (block.type === "quote") {
    className += " text-base italic pl-3 border-l-4 border-foreground/40";
    placeholder = "Quote";
  } else {
    className += " text-base";
  }

  const isBullet = block.type === "bullet-list";
  const isNumbered = block.type === "numbered-list";

  return (
    <BlockShell
      block={block}
      pageId={pageId}
      innerRef={innerRef}
      onPlus={() => {
        const id = createBlock(
          pageId,
          {
            type: "text",
            parentId: pageId,
            order: block.order + 1,
            content: "",
          } as Omit<Block, "id" | "createdAt" | "updatedAt">,
          block.id,
        );
        setTimeout(() => {
          const el = document.querySelector(`[data-block-id="${id}"] [contenteditable]`) as HTMLElement;
          el?.focus();
        }, 0);
      }}
    >
      <div className="flex items-start gap-2">
        {isBullet && <span className="mt-2 select-none">•</span>}
        {isNumbered && <NumberPrefix block={block} pageId={pageId} />}
        <div
          ref={editable.ref}
          contentEditable
          suppressContentEditableWarning
          className={className}
          data-placeholder={placeholder}
          onInput={editable.onInput}
          onKeyDown={editable.onKeyDown}
          data-testid={`block-content-${block.id}`}
        />
      </div>
      {editable.slashOpen && (
        <SlashMenu
          query={editable.slashQuery}
          position={editable.slashPos}
          onSelect={editable.slashSelect}
          onClose={editable.slashClose}
        />
      )}
    </BlockShell>
  );
}

function NumberPrefix({ block, pageId }: { block: Block; pageId: string }) {
  const blocks = useStore((s) => s.blocks);
  const pageBlocks = useStore((s) => s.pages[pageId]?.blocks ?? []);
  let n = 1;
  for (const id of pageBlocks) {
    if (id === block.id) break;
    const b = blocks[id];
    if (!b) continue;
    if (b.type === "numbered-list" && b.parentId === block.parentId) n++;
    else if (b.parentId === block.parentId) n = 1;
  }
  return <span className="mt-1 select-none w-5">{n}.</span>;
}

function TodoBlockEl({ block, pageId }: { block: Block; pageId: string }) {
  const todo = block as Extract<Block, { type: "todo" }>;
  const editable = useEditable(block, pageId, "");
  return (
    <BlockShell
      block={block}
      pageId={pageId}
      onPlus={() => {
        const id = createBlock(
          pageId,
          { type: "text", parentId: pageId, order: block.order + 1, content: "" } as Omit<Block, "id" | "createdAt" | "updatedAt">,
          block.id,
        );
        setTimeout(() => {
          const el = document.querySelector(`[data-block-id="${id}"] [contenteditable]`) as HTMLElement;
          el?.focus();
        }, 0);
      }}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={todo.checked}
          onChange={(e) => updateBlock(block.id, { checked: e.target.checked } as Partial<Block>)}
          className="mt-1.5"
          data-testid={`todo-check-${block.id}`}
        />
        <div
          ref={editable.ref}
          contentEditable
          suppressContentEditableWarning
          className={`outline-none flex-1 py-0.5 text-base ${todo.checked ? "line-through text-muted-foreground" : ""}`}
          data-placeholder="To-do"
          onInput={editable.onInput}
          onKeyDown={editable.onKeyDown}
          data-testid={`block-content-${block.id}`}
        />
      </div>
      {editable.slashOpen && (
        <SlashMenu
          query={editable.slashQuery}
          position={editable.slashPos}
          onSelect={editable.slashSelect}
          onClose={editable.slashClose}
        />
      )}
    </BlockShell>
  );
}

function ToggleBlockEl({ block, pageId }: { block: Block; pageId: string }) {
  const tog = block as Extract<Block, { type: "toggle" | "toggle-heading-1" | "toggle-heading-2" | "toggle-heading-3" }>;
  const editable = useEditable(block, pageId, "");
  let className = "outline-none flex-1 py-0.5 text-base";
  if (block.type === "toggle-heading-1") className = "outline-none flex-1 text-3xl font-bold py-0.5";
  if (block.type === "toggle-heading-2") className = "outline-none flex-1 text-2xl font-semibold py-0.5";
  if (block.type === "toggle-heading-3") className = "outline-none flex-1 text-xl font-semibold py-0.5";

  return (
    <BlockShell block={block} pageId={pageId}>
      <div className="flex items-start gap-2">
        <button
          onClick={() => updateBlock(block.id, { open: !tog.open } as Partial<Block>)}
          className="mt-1 text-muted-foreground"
          data-testid={`toggle-${block.id}`}
        >
          {tog.open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <div
          ref={editable.ref}
          contentEditable
          suppressContentEditableWarning
          className={className}
          data-placeholder="Toggle"
          onInput={editable.onInput}
          onKeyDown={editable.onKeyDown}
          data-testid={`block-content-${block.id}`}
        />
      </div>
      {tog.open && <ToggleChildren toggleId={block.id} pageId={pageId} />}
      {editable.slashOpen && (
        <SlashMenu
          query={editable.slashQuery}
          position={editable.slashPos}
          onSelect={editable.slashSelect}
          onClose={editable.slashClose}
        />
      )}
    </BlockShell>
  );
}

function CalloutBlockEl({ block, pageId }: { block: Block; pageId: string }) {
  const call = block as Extract<Block, { type: "callout" }>;
  const editable = useEditable(block, pageId, "");
  const [emojiOpen, setEmojiOpen] = useState(false);

  return (
    <BlockShell block={block} pageId={pageId}>
      <div className="flex items-start gap-3 bg-muted/40 rounded-lg p-3">
        <button
          onClick={() => setEmojiOpen((v) => !v)}
          className="text-xl shrink-0 hover:bg-accent rounded p-1"
          data-testid={`callout-emoji-${block.id}`}
        >
          {call.emoji}
        </button>
        <div
          ref={editable.ref}
          contentEditable
          suppressContentEditableWarning
          className="outline-none flex-1 py-0.5"
          data-placeholder="Type some text..."
          onInput={editable.onInput}
          onKeyDown={editable.onKeyDown}
          data-testid={`block-content-${block.id}`}
        />
      </div>
      {emojiOpen && (
        <EmojiPicker
          onSelect={(e) => {
            updateBlock(block.id, { emoji: e } as Partial<Block>);
            setEmojiOpen(false);
          }}
          onClose={() => setEmojiOpen(false)}
        />
      )}
      {editable.slashOpen && (
        <SlashMenu
          query={editable.slashQuery}
          position={editable.slashPos}
          onSelect={editable.slashSelect}
          onClose={editable.slashClose}
        />
      )}
    </BlockShell>
  );
}

function DividerEl({ block, pageId }: { block: Block; pageId: string }) {
  return (
    <BlockShell block={block} pageId={pageId}>
      <hr className="my-2 border-border" />
    </BlockShell>
  );
}

const LANGUAGES = [
  "javascript", "typescript", "python", "java", "c", "cpp", "csharp", "go", "rust",
  "ruby", "php", "swift", "kotlin", "scala", "shell", "bash", "sql", "html", "css",
  "markdown", "yaml", "json", "xml", "graphql", "docker", "latex", "plain text",
];

function CodeBlockEl({ block, pageId }: { block: Block; pageId: string }) {
  const code = block as Extract<Block, { type: "code" }>;
  const [content, setContent] = useState(code.content ?? "");

  useEffect(() => {
    setContent(code.content ?? "");
  }, [block.id]);

  return (
    <BlockShell block={block} pageId={pageId}>
      <div className="rounded-md bg-muted/40 overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1 border-b border-border">
          <select
            value={code.language}
            onChange={(e) => updateBlock(block.id, { language: e.target.value } as Partial<Block>)}
            className="text-xs bg-transparent outline-none"
            data-testid={`code-lang-${block.id}`}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            onClick={() => navigator.clipboard?.writeText(content)}
            className="text-xs text-muted-foreground hover:text-foreground"
            data-testid={`code-copy-${block.id}`}
          >
            Copy
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            updateBlock(block.id, { content: e.target.value } as Partial<Block>);
          }}
          spellCheck={false}
          className="w-full bg-transparent font-mono text-sm px-3 py-2 resize-y outline-none min-h-[80px]"
          placeholder="// Code"
          data-testid={`code-content-${block.id}`}
        />
      </div>
    </BlockShell>
  );
}

function MediaBlockEl({ block, pageId }: { block: Block; pageId: string }) {
  const media = block as Extract<Block, { type: "image" | "video" | "audio" | "file" }>;
  const [urlInput, setUrlInput] = useState(media.url ?? "");

  return (
    <BlockShell block={block} pageId={pageId}>
      {!media.url ? (
        <div className="border border-dashed border-border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <TypeIcon className="size-4" /> Add {media.type}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`Paste ${media.type} URL`}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 border border-input bg-background rounded px-2 py-1 text-sm"
              data-testid={`media-url-${block.id}`}
            />
            <button
              onClick={() => updateBlock(block.id, { url: urlInput } as Partial<Block>)}
              className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm"
              data-testid={`media-embed-${block.id}`}
            >
              Embed
            </button>
            {media.type === "image" && (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const result = ev.target?.result as string;
                    updateBlock(block.id, { url: result, fileName: file.name } as Partial<Block>);
                  };
                  reader.readAsDataURL(file);
                }}
                data-testid={`media-file-${block.id}`}
              />
            )}
          </div>
        </div>
      ) : media.type === "image" ? (
        <div className="rounded-md overflow-hidden">
          <img src={media.url} alt={media.caption ?? "image"} className="w-full max-h-[600px] object-contain" />
          <input
            value={media.caption ?? ""}
            onChange={(e) => updateBlock(block.id, { caption: e.target.value } as Partial<Block>)}
            placeholder="Caption"
            className="block w-full text-xs text-muted-foreground bg-transparent outline-none mt-1"
          />
        </div>
      ) : media.type === "video" ? (
        <VideoEmbed url={media.url} />
      ) : media.type === "audio" ? (
        <audio controls src={media.url} className="w-full" />
      ) : (
        <a href={media.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 border border-border rounded-md hover:bg-accent">
          📎 <span className="truncate">{media.fileName ?? media.url}</span>
        </a>
      )}
    </BlockShell>
  );
}

function VideoEmbed({ url }: { url: string }) {
  // Convert popular URLs to embeds
  let src = url;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) src = `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) src = `https://player.vimeo.com/video/${vimeo[1]}`;
  const loom = url.match(/loom\.com\/share\/([\w-]+)/);
  if (loom) src = `https://www.loom.com/embed/${loom[1]}`;
  return (
    <div className="aspect-video w-full rounded-md overflow-hidden bg-muted">
      <iframe src={src} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
    </div>
  );
}

function EmbedBlockEl({ block, pageId }: { block: Block; pageId: string }) {
  const e = block as Extract<Block, { type: "embed" | "bookmark" }>;
  const [urlInput, setUrlInput] = useState(e.url ?? "");
  if (!e.url) {
    return (
      <BlockShell block={block} pageId={pageId}>
        <div className="border border-dashed border-border rounded-lg p-4">
          <div className="flex gap-2">
            <input
              value={urlInput}
              onChange={(ev) => setUrlInput(ev.target.value)}
              placeholder="Paste a link to embed"
              className="flex-1 bg-background border border-input rounded px-2 py-1 text-sm"
            />
            <button
              onClick={() => updateBlock(block.id, { url: urlInput } as Partial<Block>)}
              className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm"
            >
              Embed
            </button>
          </div>
        </div>
      </BlockShell>
    );
  }
  if (e.type === "embed") {
    return (
      <BlockShell block={block} pageId={pageId}>
        <div className="aspect-video w-full rounded-md overflow-hidden bg-muted border border-border">
          <iframe src={e.url} className="w-full h-full" sandbox="allow-scripts allow-same-origin allow-forms" />
        </div>
      </BlockShell>
    );
  }
  // bookmark
  const host = (() => {
    try {
      return new URL(e.url).hostname;
    } catch {
      return e.url;
    }
  })();
  return (
    <BlockShell block={block} pageId={pageId}>
      <a href={e.url} target="_blank" rel="noreferrer" className="block border border-border rounded-md p-3 hover:bg-accent">
        <div className="text-sm font-medium truncate">{host}</div>
        <div className="text-xs text-muted-foreground truncate">{e.url}</div>
      </a>
    </BlockShell>
  );
}

function PageLinkEl({ block, pageId }: { block: Block; pageId: string }) {
  const l = block as Extract<Block, { type: "page-link" | "sub-page" }>;
  const navigate = useNavigate();
  const page = useStore((s) => (l.pageId ? s.pages[l.pageId] : null));
  return (
    <BlockShell block={block} pageId={pageId}>
      <button
        onClick={() => l.pageId && navigate({ to: "/app/p/$pageId", params: { pageId: l.pageId } })}
        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent w-full text-left"
        data-testid={`pagelink-${block.id}`}
      >
        <span>{page?.icon ?? "📄"}</span>
        <span className="underline text-foreground">{page?.title || "Untitled"}</span>
      </button>
    </BlockShell>
  );
}

function DatabaseBlockEl({ block, pageId }: { block: Block; pageId: string }) {
  const db = block as Extract<Block, { type: "database-inline" | "database-linked" }>;
  return (
    <BlockShell block={block} pageId={pageId}>
      {db.databaseId ? (
        <InlineDatabase databaseId={db.databaseId} initialViewId={db.viewId ?? null} />
      ) : (
        <div className="border border-dashed border-border rounded p-3 text-sm text-muted-foreground">Empty database</div>
      )}
    </BlockShell>
  );
}

function SimpleTableEl({ block, pageId }: { block: Block; pageId: string }) {
  const raw = block as Extract<Block, { type: "table" }>;
  // Guard against corrupt rows (B-800): never crash the whole page on a bad block.
  const t: Extract<Block, { type: "table" }> = {
    ...raw,
    rows: Array.isArray(raw.rows) && raw.rows.every(Array.isArray)
      ? raw.rows
      : [["", "", ""], ["", "", ""]],
  };
  function updateCell(r: number, c: number, v: string) {
    const next = t.rows.map((row) => row.slice());
    next[r][c] = v;
    updateBlock(block.id, { rows: next } as Partial<Block>);
  }
  function addRow() {
    const cols = t.rows[0]?.length ?? 3;
    updateBlock(block.id, { rows: [...t.rows, Array(cols).fill("")] } as Partial<Block>);
  }
  function addCol() {
    updateBlock(block.id, { rows: t.rows.map((row) => [...row, ""]) } as Partial<Block>);
  }
  function delRow(r: number) {
    if (t.rows.length <= 1) return;
    updateBlock(block.id, { rows: t.rows.filter((_, i) => i !== r) } as Partial<Block>);
  }
  function delCol(c: number) {
    if ((t.rows[0]?.length ?? 0) <= 1) return;
    updateBlock(block.id, { rows: t.rows.map((row) => row.filter((_, i) => i !== c)) } as Partial<Block>);
  }
  return (
    <BlockShell block={block} pageId={pageId}>
      <div className="overflow-x-auto">
        <table className="border-collapse border border-border w-full text-sm">
          <tbody>
            {t.rows.map((row, ri) => (
              <tr key={ri} className={t.hasHeaderRow && ri === 0 ? "bg-muted/40 font-medium" : ""}>
                {row.map((cell, ci) => (
                  <td key={ci} className={`border border-border px-2 py-1 min-w-[80px] ${t.hasHeaderCol && ci === 0 ? "bg-muted/40 font-medium" : ""}`}>
                    <input
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className="w-full bg-transparent outline-none"
                      data-testid={`cell-${block.id}-${ri}-${ci}`}
                    />
                  </td>
                ))}
                <td className="px-1">
                  <button onClick={() => delRow(ri)} className="text-xs text-muted-foreground hover:text-destructive">×</button>
                </td>
              </tr>
            ))}
            <tr>
              {(t.rows[0] ?? []).map((_, ci) => (
                <td key={ci} className="border-t border-border text-center text-xs">
                  <button onClick={() => delCol(ci)} className="text-muted-foreground hover:text-destructive">×</button>
                </td>
              ))}
              <td></td>
            </tr>
          </tbody>
        </table>
        <div className="flex gap-2 mt-2">
          <button onClick={addRow} className="text-xs border border-border rounded px-2 py-1 hover:bg-accent" data-testid={`table-addrow-${block.id}`}>+ Row</button>
          <button onClick={addCol} className="text-xs border border-border rounded px-2 py-1 hover:bg-accent" data-testid={`table-addcol-${block.id}`}>+ Column</button>
        </div>
      </div>
    </BlockShell>
  );
}

function EquationEl({ block, pageId }: { block: Block; pageId: string }) {
  const eq = block as Extract<Block, { type: "equation" }>;
  const [content, setContent] = useState(eq.content ?? "");
  useEffect(() => setContent(eq.content ?? ""), [block.id]);
  return (
    <BlockShell block={block} pageId={pageId}>
      <div className="rounded-md bg-muted/40 p-3">
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            updateBlock(block.id, { content: e.target.value } as Partial<Block>);
          }}
          placeholder="E = mc^2"
          className="w-full bg-transparent font-mono text-sm outline-none resize-none min-h-[40px]"
          data-testid={`eq-${block.id}`}
        />
        <div className="text-center font-serif text-lg mt-2 text-muted-foreground">
          {content || "(empty equation)"}
        </div>
      </div>
    </BlockShell>
  );
}

function TocEl({ block, pageId }: { block: Block; pageId: string }) {
  const blocks = useStore((s) => s.blocks);
  const pageBlocks = useStore((s) => s.pages[pageId]?.blocks ?? []);
  const headings = pageBlocks
    .map((id) => blocks[id])
    .filter((b): b is Extract<Block, { type: "heading-1" | "heading-2" | "heading-3" }> =>
      !!b && (b.type === "heading-1" || b.type === "heading-2" || b.type === "heading-3"),
    );
  return (
    <BlockShell block={block} pageId={pageId}>
      <div className="border-l-2 border-border pl-3 py-2">
        <div className="text-xs uppercase text-muted-foreground mb-1">Table of contents</div>
        {headings.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">No headings yet</div>
        ) : (
          headings.map((h) => (
            <div
              key={h.id}
              className={`text-sm hover:underline cursor-pointer ${h.type === "heading-1" ? "" : h.type === "heading-2" ? "pl-3" : "pl-6"}`}
              onClick={() => document.querySelector(`[data-block-id="${h.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              {h.content || "Untitled heading"}
            </div>
          ))
        )}
      </div>
    </BlockShell>
  );
}

function BreadcrumbEl({ block, pageId }: { block: Block; pageId: string }) {
  const pages = useStore((s) => s.pages);
  const path: { id: string; title: string; icon: string | null }[] = [];
  let p = pages[pageId];
  while (p) {
    path.unshift({ id: p.id, title: p.title || "Untitled", icon: p.icon });
    p = p.parentId ? pages[p.parentId] : (null as never);
  }
  return (
    <BlockShell block={block} pageId={pageId}>
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {path.map((p, i) => (
          <span key={p.id}>
            {i > 0 && " / "}
            <span>{p.icon ?? "📄"} {p.title}</span>
          </span>
        ))}
      </div>
    </BlockShell>
  );
}

function SyncedEl({ block, pageId }: { block: Block; pageId: string }) {
  return (
    <BlockShell block={block} pageId={pageId}>
      <div className="border-l-4 border-pink-400 pl-3 py-2 text-sm">
        <div className="text-xs uppercase text-pink-600 mb-1">Synced block</div>
        <div className="text-muted-foreground">Content will be mirrored across pages.</div>
      </div>
    </BlockShell>
  );
}

function AIBlockEl({ block, pageId }: { block: Block; pageId: string }) {
  const ai = block as Extract<Block, { type: "ai-block" }>;
  const [prompt, setPrompt] = useState(ai.prompt ?? "");
  const [generating, setGenerating] = useState(false);
  function generate() {
    setGenerating(true);
    setTimeout(() => {
      const result = `🤖 (Demo) Here is a response for "${prompt}".\n\n1. Key insight\n2. Supporting evidence\n3. Action item\n\nNote: connect a real LLM API to make this functional.`;
      updateBlock(block.id, { prompt, result } as Partial<Block>);
      setGenerating(false);
    }, 800);
  }
  return (
    <BlockShell block={block} pageId={pageId}>
      <div className="rounded-md border border-violet-300 dark:border-violet-700 bg-violet-50/40 dark:bg-violet-950/30 p-3">
        <div className="text-xs uppercase text-violet-600 mb-1 flex items-center gap-1">✨ AI block</div>
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AI to do anything…"
            className="flex-1 bg-background rounded px-2 py-1 text-sm border border-input"
            data-testid={`ai-prompt-${block.id}`}
          />
          <button
            onClick={generate}
            disabled={generating}
            className="bg-violet-600 text-white text-sm px-3 py-1 rounded disabled:opacity-50"
            data-testid={`ai-generate-${block.id}`}
          >
            {generating ? "…" : "Generate"}
          </button>
        </div>
        {ai.result && (
          <div className="mt-2 text-sm whitespace-pre-wrap text-foreground">{ai.result}</div>
        )}
      </div>
    </BlockShell>
  );
}

function ButtonBlockEl({ block, pageId }: { block: Block; pageId: string }) {
  const btn = block as Extract<Block, { type: "button" }>;
  function run() {
    // Run actions in order
    for (const action of btn.actions ?? []) {
      if (action.kind === "show-confirmation") {
        alert(action.message);
      } else if (action.kind === "send-webhook") {
        fetch(action.url, { method: "POST", body: action.payload ?? "{}" }).catch(() => undefined);
      } else if (action.kind === "insert-block") {
        createBlock(pageId, {
          type: action.blockType,
          parentId: pageId,
          order: block.order + 1,
          content: action.content ?? "",
        } as Omit<Block, "id" | "createdAt" | "updatedAt">, block.id);
      }
    }
  }
  return (
    <BlockShell block={block} pageId={pageId}>
      <div className="flex items-center gap-2">
        <button
          onClick={run}
          className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:opacity-90"
          data-testid={`button-${block.id}`}
        >
          {btn.emoji && <span className="mr-1">{btn.emoji}</span>}
          {btn.label}
        </button>
        <input
          value={btn.label}
          onChange={(e) => updateBlock(block.id, { label: e.target.value } as Partial<Block>)}
          className="text-xs bg-transparent border border-input rounded px-2 py-1 outline-none w-32"
          placeholder="Label"
        />
      </div>
    </BlockShell>
  );
}

function ColumnsEl({ block, pageId }: { block: Block; pageId: string }) {
  const c = block as Extract<Block, { type: "columns" }>;
  const allBlocks = useStore((s) => s.blocks);
  const blocksRef = useRef(allBlocks);
  blocksRef.current = allBlocks;

  // Lazily materialise column children the first time we render this columns block.
  useEffect(() => {
    if (!c.columnIds || c.columnIds.length !== c.columns) {
      // Compute new ids: keep existing columns when possible, append/trim.
      const existing = c.columnIds ?? [];
      const now = Date.now();
      const newColumnIds = existing.slice(0, c.columns);
      const newColumnBlocks: Block[] = [];
      while (newColumnIds.length < c.columns) {
        const colId = "blk_" + Math.random().toString(36).slice(2, 10);
        const txtId = "blk_" + Math.random().toString(36).slice(2, 10);
        const txt: Block = {
          id: txtId,
          type: "text",
          parentId: colId,
          order: 0,
          content: "",
          createdAt: now,
          updatedAt: now,
        };
        const col: Block = {
          id: colId,
          type: "column",
          parentId: block.id,
          order: newColumnIds.length,
          blockIds: [txtId],
          createdAt: now,
          updatedAt: now,
        };
        newColumnBlocks.push(col, txt);
        newColumnIds.push(colId);
      }
      // Insert new column + initial text blocks (they don't live in page.blocks).
      for (const b of newColumnBlocks) insertBlock(b);
      updateBlock(block.id, { columnIds: newColumnIds } as Partial<Block>);
    }
  }, [block.id, c.columns, c.columnIds]);

  const columnIds = c.columnIds ?? [];

  return (
    <BlockShell block={block} pageId={pageId}>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${c.columns}, minmax(0, 1fr))` }}
        data-testid={`columns-${block.id}`}
      >
        {columnIds.map((colId, idx) => {
          const col = allBlocks[colId];
          if (!col || col.type !== "column") return (
            <div key={idx} className="rounded border border-dashed border-border p-2 text-xs text-muted-foreground">…</div>
          );
          return <ColumnEl key={colId} columnBlock={col} pageId={pageId} />;
        })}
      </div>
    </BlockShell>
  );
}

function ToggleChildren({ toggleId, pageId }: { toggleId: string; pageId: string }) {
  const allBlocks = useStore((s) => s.blocks);
  const children = Object.values(allBlocks)
    .filter((b) => b.parentId === toggleId)
    .sort((a, b) => a.order - b.order);

  function addChild() {
    const id = "blk_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const txt: Block = {
      id,
      type: "text",
      parentId: toggleId,
      order: children.length,
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    insertBlock(txt);
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${id}"] [contenteditable]`) as HTMLElement;
      el?.focus();
    }, 50);
  }

  return (
    <div className="ml-6 mt-1" data-testid={`toggle-children-${toggleId}`}>
      {children.map((c) => (
        <BlockComponent key={c.id} block={c} pageId={pageId} />
      ))}
      <button
        onClick={addChild}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
        data-testid={`toggle-add-${toggleId}`}
      >
        + Add block
      </button>
    </div>
  );
}

function ColumnEl({ columnBlock, pageId }: { columnBlock: Block; pageId: string }) {
  const allBlocks = useStore((s) => s.blocks);
  const col = columnBlock as Extract<Block, { type: "column" }>;
  const childIds = col.blockIds ?? [];

  function addChild() {
    const id = "blk_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const txt: Block = {
      id,
      type: "text",
      parentId: col.id,
      order: childIds.length,
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    insertBlock(txt);
    updateBlock(col.id, { blockIds: [...childIds, id] } as Partial<Block>);
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${id}"] [contenteditable]`) as HTMLElement;
      el?.focus();
    }, 50);
  }

  return (
    <div className="rounded border border-dashed border-border/60 p-2 min-h-[60px]" data-testid={`column-${col.id}`}>
      {childIds.length === 0 && (
        <div className="text-xs text-muted-foreground italic mb-1">Empty column</div>
      )}
      {childIds.map((cid) => {
        const child = allBlocks[cid];
        if (!child) return null;
        return <BlockComponent key={cid} block={child} pageId={pageId} />;
      })}
      <button
        onClick={addChild}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
        data-testid={`column-add-${col.id}`}
      >
        + Add block
      </button>
    </div>
  );
}

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const emojis = ["💡", "⚠️", "✅", "❌", "🚀", "🔥", "📌", "🎯", "🧠", "🛠️", "📝", "🎉", "🍕", "🐱", "🌟", "🔒", "🌍", "📚", "🎨", "🎵", "💼", "📊", "📅", "🕐", "🧩", "🔬", "💎", "🪄"];
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute bg-popover border border-border rounded-lg shadow-lg p-2 grid grid-cols-7 gap-1"
        style={{ top: "30%", left: "30%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {emojis.map((e) => (
          <button key={e} onClick={() => onSelect(e)} className="text-2xl hover:bg-accent rounded p-1">
            {e}
          </button>
        ))}
        <button onClick={onClose} className="col-span-7 text-xs text-muted-foreground mt-1 flex items-center justify-center">
          <X className="size-3" /> close
        </button>
      </div>
    </div>
  );
}
