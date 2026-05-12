import { useMemo, useState } from "react";

interface EmojiEntry {
  char: string;
  keywords: string[];
}

const EMOJIS: EmojiEntry[] = [
  { char: "📄", keywords: ["doc", "document", "page", "file"] },
  { char: "📝", keywords: ["note", "memo", "edit", "pencil"] },
  { char: "📚", keywords: ["books", "library", "study"] },
  { char: "📕", keywords: ["book", "red"] },
  { char: "📒", keywords: ["notebook", "ledger"] },
  { char: "📓", keywords: ["notebook"] },
  { char: "📔", keywords: ["notebook", "decorative"] },
  { char: "📗", keywords: ["book", "green"] },
  { char: "📘", keywords: ["book", "blue"] },
  { char: "📙", keywords: ["book", "orange"] },
  { char: "📰", keywords: ["news", "paper"] },
  { char: "🗞️", keywords: ["news", "rolled"] },
  { char: "🚀", keywords: ["rocket", "launch", "ship"] },
  { char: "💡", keywords: ["idea", "lightbulb", "tip"] },
  { char: "🎯", keywords: ["target", "goal", "okr"] },
  { char: "🛠️", keywords: ["tools", "build", "fix"] },
  { char: "🧰", keywords: ["toolbox", "tools"] },
  { char: "📌", keywords: ["pin", "important"] },
  { char: "📋", keywords: ["clipboard", "list"] },
  { char: "🗂️", keywords: ["dividers", "files"] },
  { char: "📁", keywords: ["folder"] },
  { char: "📂", keywords: ["folder", "open"] },
  { char: "🗃️", keywords: ["card", "box"] },
  { char: "🗄️", keywords: ["cabinet", "files", "database"] },
  { char: "👋", keywords: ["wave", "hello", "welcome"] },
  { char: "🎉", keywords: ["party", "celebrate"] },
  { char: "✨", keywords: ["sparkles", "magic", "ai"] },
  { char: "⭐", keywords: ["star"] },
  { char: "🌟", keywords: ["star", "glow"] },
  { char: "🔥", keywords: ["fire", "hot"] },
  { char: "💎", keywords: ["diamond", "gem"] },
  { char: "🎨", keywords: ["art", "design"] },
  { char: "🎵", keywords: ["music"] },
  { char: "🎬", keywords: ["movie", "film"] },
  { char: "🎮", keywords: ["game"] },
  { char: "🧩", keywords: ["puzzle"] },
  { char: "🏠", keywords: ["home", "house"] },
  { char: "🏢", keywords: ["office", "building"] },
  { char: "🏦", keywords: ["bank"] },
  { char: "🏥", keywords: ["hospital"] },
  { char: "🏨", keywords: ["hotel"] },
  { char: "🏫", keywords: ["school"] },
  { char: "🏛️", keywords: ["museum", "classic"] },
  { char: "🌍", keywords: ["earth", "world", "europe"] },
  { char: "🌎", keywords: ["earth", "america"] },
  { char: "🌏", keywords: ["earth", "asia"] },
  { char: "🗺️", keywords: ["map"] },
  { char: "🧭", keywords: ["compass"] },
  { char: "💼", keywords: ["briefcase", "work"] },
  { char: "💰", keywords: ["money", "bag"] },
  { char: "💸", keywords: ["money", "flying"] },
  { char: "💳", keywords: ["card", "credit"] },
  { char: "🧾", keywords: ["receipt", "invoice"] },
  { char: "📊", keywords: ["chart", "bar"] },
  { char: "📈", keywords: ["chart", "up"] },
  { char: "📉", keywords: ["chart", "down"] },
  { char: "🔍", keywords: ["search", "magnify"] },
  { char: "🔎", keywords: ["search"] },
  { char: "💻", keywords: ["computer", "laptop"] },
  { char: "📱", keywords: ["phone", "mobile"] },
  { char: "⚙️", keywords: ["gear", "settings"] },
  { char: "🔧", keywords: ["wrench"] },
  { char: "🔨", keywords: ["hammer"] },
  { char: "🪛", keywords: ["screwdriver"] },
  { char: "⚡", keywords: ["lightning", "fast"] },
  { char: "🔋", keywords: ["battery"] },
  { char: "🔌", keywords: ["plug"] },
  { char: "💾", keywords: ["save", "disk"] },
  { char: "📡", keywords: ["antenna", "signal"] },
  { char: "📺", keywords: ["tv"] },
  { char: "🎥", keywords: ["video", "camera"] },
  { char: "📷", keywords: ["camera"] },
  { char: "🍕", keywords: ["pizza", "food"] },
  { char: "🍔", keywords: ["burger", "food"] },
  { char: "🍣", keywords: ["sushi"] },
  { char: "☕", keywords: ["coffee"] },
  { char: "🍵", keywords: ["tea"] },
  { char: "🍺", keywords: ["beer"] },
  { char: "🍷", keywords: ["wine"] },
  { char: "🍰", keywords: ["cake"] },
  { char: "🍪", keywords: ["cookie"] },
  { char: "🥗", keywords: ["salad"] },
  { char: "🥑", keywords: ["avocado"] },
  { char: "🍎", keywords: ["apple"] },
  { char: "🐱", keywords: ["cat"] },
  { char: "🐶", keywords: ["dog"] },
  { char: "🐰", keywords: ["rabbit"] },
  { char: "🐻", keywords: ["bear"] },
  { char: "🐼", keywords: ["panda"] },
  { char: "🦊", keywords: ["fox"] },
  { char: "🦁", keywords: ["lion"] },
  { char: "🐯", keywords: ["tiger"] },
  { char: "🐮", keywords: ["cow"] },
  { char: "🐷", keywords: ["pig"] },
  { char: "🐸", keywords: ["frog"] },
  { char: "🦄", keywords: ["unicorn"] },
];

interface Props {
  onSelect: (icon: string) => void;
  onClose: () => void;
}

export function EmojiOrCoverPicker({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return EMOJIS;
    return EMOJIS.filter((e) => e.keywords.some((k) => k.includes(q)));
  }, [search]);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-popover border border-border rounded-lg shadow-lg p-3 w-96 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          placeholder="Search emoji…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-input bg-background rounded px-2 py-1 text-sm mb-2"
          data-testid="emoji-search"
        />
        <div className="grid grid-cols-10 gap-1 overflow-y-auto flex-1" data-testid="emoji-grid">
          {filtered.length === 0 && (
            <div className="col-span-10 text-xs text-muted-foreground italic text-center py-4">
              No emoji matches "{search}"
            </div>
          )}
          {filtered.map((e) => (
            <button
              key={e.char}
              onClick={() => onSelect(e.char)}
              className="text-2xl hover:bg-accent rounded p-1"
              data-testid={`emoji-${e.char}`}
              title={e.keywords.join(", ")}
            >
              {e.char}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onSelect("")}
            className="text-xs text-muted-foreground hover:text-foreground"
            data-testid="emoji-remove"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
