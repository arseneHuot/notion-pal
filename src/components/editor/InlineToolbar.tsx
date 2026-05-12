import { useEffect, useState, useRef } from "react";
import { Bold, Italic, Strikethrough, Code, Link as LinkIcon, Sparkles } from "lucide-react";

export function InlineToolbar() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState<Record<string, boolean>>({});
  const skipNextRef = useRef(false);

  useEffect(() => {
    function check() {
      if (skipNextRef.current) {
        skipNextRef.current = false;
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setOpen(false);
        return;
      }
      // Only show inside contenteditable inside a block
      const node = sel.anchorNode;
      const el = node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement ?? null;
      const editor = el?.closest("[contenteditable]");
      if (!editor) {
        setOpen(false);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setOpen(false);
        return;
      }
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        strike: document.queryCommandState("strikeThrough"),
        underline: document.queryCommandState("underline"),
      });
      setOpen(true);
    }
    document.addEventListener("selectionchange", check);
    return () => document.removeEventListener("selectionchange", check);
  }, []);

  function exec(cmd: string, value?: string) {
    skipNextRef.current = true;
    document.execCommand(cmd, false, value);
    // After exec, the selection is preserved but we want to refresh the block content state.
    // The block's contenteditable onInput will fire because execCommand mutates the DOM.
    const sel = window.getSelection();
    if (sel?.anchorNode) {
      const editor = sel.anchorNode.parentElement?.closest("[contenteditable]") as HTMLElement | null;
      editor?.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  }

  function applyLink() {
    const url = prompt("URL:");
    if (!url) return;
    exec("createLink", url);
  }

  function applyColor(color: string) {
    exec("foreColor", color);
  }

  if (!open) return null;

  return (
    <div
      className="fixed z-50 bg-popover border border-border rounded-md shadow-lg px-1 py-0.5 flex items-center gap-0.5 -translate-x-1/2 -translate-y-full"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.preventDefault()}
      data-testid="inline-toolbar"
    >
      <button
        onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}
        className={`p-1.5 rounded hover:bg-accent ${active.bold ? "bg-accent" : ""}`}
        title="Bold (Cmd+B)"
        data-testid="ib-bold"
      >
        <Bold className="size-3.5" />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}
        className={`p-1.5 rounded hover:bg-accent ${active.italic ? "bg-accent" : ""}`}
        title="Italic (Cmd+I)"
        data-testid="ib-italic"
      >
        <Italic className="size-3.5" />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); exec("strikeThrough"); }}
        className={`p-1.5 rounded hover:bg-accent ${active.strike ? "bg-accent" : ""}`}
        title="Strike"
        data-testid="ib-strike"
      >
        <Strikethrough className="size-3.5" />
      </button>
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            const span = document.createElement("code");
            span.className = "bg-muted px-1 rounded text-xs font-mono";
            try {
              range.surroundContents(span);
              const editor = sel.anchorNode?.parentElement?.closest("[contenteditable]") as HTMLElement | null;
              editor?.dispatchEvent(new InputEvent("input", { bubbles: true }));
            } catch {
              // crosses boundaries
            }
          }
        }}
        className="p-1.5 rounded hover:bg-accent"
        title="Inline code"
        data-testid="ib-code"
      >
        <Code className="size-3.5" />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
        className="p-1.5 rounded hover:bg-accent"
        title="Link"
        data-testid="ib-link"
      >
        <LinkIcon className="size-3.5" />
      </button>
      <div className="w-px h-4 bg-border" />
      <ColorPicker onPick={(c) => applyColor(c)} />
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed) {
            const txt = sel.toString();
            window.dispatchEvent(new CustomEvent("open-ai-chat-with", { detail: { selected: txt } }));
          }
        }}
        className="p-1.5 rounded hover:bg-accent text-violet-500"
        title="Ask AI about selection"
        data-testid="ib-ai"
      >
        <Sparkles className="size-3.5" />
      </button>
    </div>
  );
}

function ColorPicker({ onPick }: { onPick: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  const COLORS = [
    { name: "default", value: "" },
    { name: "gray", value: "#6b7280" },
    { name: "brown", value: "#92400e" },
    { name: "orange", value: "#ea580c" },
    { name: "yellow", value: "#ca8a04" },
    { name: "green", value: "#16a34a" },
    { name: "blue", value: "#2563eb" },
    { name: "purple", value: "#9333ea" },
    { name: "pink", value: "#db2777" },
    { name: "red", value: "#dc2626" },
  ];
  return (
    <div className="relative">
      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="p-1.5 rounded hover:bg-accent font-bold text-sm"
        title="Text color"
        data-testid="ib-color"
      >
        A
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 bg-popover border border-border rounded shadow-lg p-1 grid grid-cols-5 gap-0.5"
          onMouseDown={(e) => e.preventDefault()}
        >
          {COLORS.map((c) => (
            <button
              key={c.name}
              onMouseDown={(e) => { e.preventDefault(); onPick(c.value); setOpen(false); }}
              className="size-6 rounded border border-border"
              style={{ background: c.value || "transparent" }}
              title={c.name}
              data-testid={`ib-color-${c.name}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
