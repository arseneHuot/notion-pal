import { useEffect, useMemo, useRef, useState } from "react";
import { filterSlash, type SlashCommand } from "@/lib/slash-commands";

interface Props {
  query: string;
  position: { x: number; y: number };
  onSelect: (cmd: SlashCommand) => void;
  onClose: () => void;
}

export function SlashMenu({ query, position, onSelect, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => filterSlash(query), [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(items.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (items[activeIndex]) onSelect(items[activeIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [items, activeIndex, onSelect, onClose]);

  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-active="true"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (items.length === 0) {
    return (
      <div
        style={{ left: position.x, top: position.y }}
        className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg p-3 text-sm text-muted-foreground"
      >
        No matching blocks
      </div>
    );
  }

  const grouped: Record<string, SlashCommand[]> = {};
  for (const i of items) {
    if (!grouped[i.category]) grouped[i.category] = [];
    grouped[i.category].push(i);
  }
  const order: { key: SlashCommand["category"]; label: string }[] = [
    { key: "basic", label: "Basic blocks" },
    { key: "media", label: "Media" },
    { key: "embed", label: "Embeds" },
    { key: "database", label: "Databases" },
    { key: "advanced", label: "Advanced" },
    { key: "layout", label: "Layout" },
  ];

  let idx = -1;

  return (
    <div
      ref={listRef}
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg w-80 max-h-96 overflow-y-auto py-2"
      data-testid="slash-menu"
    >
      {order.map(({ key, label }) => {
        if (!grouped[key]) return null;
        return (
          <div key={key} className="mb-1">
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            {grouped[key].map((cmd) => {
              idx += 1;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={cmd.id}
                  data-active={isActive}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => onSelect(cmd)}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 text-left text-sm ${isActive ? "bg-accent" : "hover:bg-accent/50"}`}
                  data-testid={`slash-${cmd.id}`}
                >
                  <div className="size-8 rounded border border-border flex items-center justify-center text-base shrink-0 bg-card">
                    {cmd.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{cmd.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
