import { useEffect, useState, useRef } from "react";
import { Bold, Italic, Strikethrough, Code, Link as LinkIcon, Sparkles } from "lucide-react";

export function InlineToolbar() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState<Record<string, boolean>>({});
  const skipNextRef = useRef(false);
  // Ref mirror of linkOpen so the selectionchange listener (which closes over
  // the initial render's state) can read the current value (B-2810).
  const linkOpenRef = useRef(false);

  useEffect(() => {
    function check() {
      if (skipNextRef.current) {
        skipNextRef.current = false;
        return;
      }
      // If the link popover is up, keep the toolbar mounted even when focus
      // moves to the URL input and the selection collapses (B-2810/B-2715).
      if (linkOpenRef.current) {
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
      const editor = el?.closest("[contenteditable]") as HTMLElement | null;
      if (!editor) {
        setOpen(false);
        return;
      }
      // Detect heading-like blocks where the browser's execCommand("bold")
      // inverts to "normal" weight (B-2812). The toolbar's bold button
      // becomes a no-op in that context.
      const blockType = editor.closest("[data-block-type]")?.getAttribute("data-block-type") ?? "";
      const insideHeading = blockType.startsWith("heading-") || blockType.startsWith("toggle-heading-") || editor.tagName === "H1" || editor.tagName === "H2" || editor.tagName === "H3";
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
        insideHeading,
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

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const savedRangeRef = useRef<Range | null>(null);

  function applyLink() {
    // Save the selection so the popover input doesn't lose it on focus change.
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
    setLinkUrl("");
    linkOpenRef.current = true;
    setLinkOpen(true);
  }

  function commitLink(url: string) {
    if (!url) {
      linkOpenRef.current = false;
      setLinkOpen(false);
      return;
    }
    // Restore selection
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRangeRef.current);
    }
    exec("createLink", url);
    linkOpenRef.current = false;
    setLinkOpen(false);
  }

  function applyColor(color: string) {
    // Emit `<span style="color: …">` instead of `<font color>` (B-2630).
    // `<font>` is deprecated HTML4. We also support clearing the color
    // by passing an empty string — in that case we unwrap any color spans
    // touching the selection.
    skipNextRef.current = true;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!color) {
      // Reset: walk the fragment and strip color from any span we own.
      const editor = sel.anchorNode?.parentElement?.closest("[contenteditable]") as HTMLElement | null;
      const contents = range.extractContents();
      // Strip our own color spans (data-color), legacy <font color>, AND any
      // span[style*="color"] left over from older saves — so the "default"
      // option always reliably clears the selection's color.
      contents.querySelectorAll('span[data-color], font, span[style*="color"]').forEach((node) => {
        const parent = node.parentNode;
        while (node.firstChild && parent) parent.insertBefore(node.firstChild, node);
        parent?.removeChild(node);
      });
      range.insertNode(contents);
      editor?.dispatchEvent(new InputEvent("input", { bubbles: true }));
      return;
    }
    const span = document.createElement("span");
    span.setAttribute("data-color", "1");
    span.style.color = color;
    try {
      range.surroundContents(span);
    } catch {
      // Selection crosses element boundaries — fall back to extract+wrap.
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    const editor = sel.anchorNode?.parentElement?.closest("[contenteditable]") as HTMLElement | null;
    editor?.dispatchEvent(new InputEvent("input", { bubbles: true }));
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
        onMouseDown={(e) => { e.preventDefault(); if (!active.insideHeading) exec("bold"); }}
        disabled={!!active.insideHeading}
        className={`p-1.5 rounded hover:bg-accent ${active.bold ? "bg-accent" : ""} disabled:opacity-40 disabled:cursor-not-allowed`}
        title={active.insideHeading ? "Already bold (heading)" : "Bold (Cmd+B)"}
        aria-label="Bold"
        data-testid="ib-bold"
      >
        <Bold className="size-3.5" />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}
        className={`p-1.5 rounded hover:bg-accent ${active.italic ? "bg-accent" : ""}`}
        title="Italic (Cmd+I)"
        aria-label="Italic"
        data-testid="ib-italic"
      >
        <Italic className="size-3.5" />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); exec("strikeThrough"); }}
        className={`p-1.5 rounded hover:bg-accent ${active.strike ? "bg-accent" : ""}`}
        title="Strike"
        aria-label="Strikethrough"
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
        aria-label="Inline code"
        data-testid="ib-code"
      >
        <Code className="size-3.5" />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
        className="p-1.5 rounded hover:bg-accent"
        title="Link"
        aria-label="Insert link"
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
        aria-label="Ask AI"
        data-testid="ib-ai"
      >
        <Sparkles className="size-3.5" />
      </button>
      {linkOpen && (
        <div
          className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg p-2 flex gap-1"
          onMouseDown={(e) => e.preventDefault()}
          data-testid="ib-link-popover"
        >
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitLink(linkUrl.trim());
              if (e.key === "Escape") { linkOpenRef.current = false; setLinkOpen(false); }
            }}
            placeholder="https://…"
            className="bg-background border border-input rounded text-xs px-2 py-1 w-48"
            data-testid="ib-link-input"
          />
          <button
            onMouseDown={(e) => { e.preventDefault(); commitLink(linkUrl.trim()); }}
            onClick={(e) => { e.preventDefault(); commitLink(linkUrl.trim()); }}
            className="text-xs bg-primary text-primary-foreground rounded px-2"
            data-testid="ib-link-apply"
          >
            Apply
          </button>
        </div>
      )}
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
        aria-label="Text color"
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
