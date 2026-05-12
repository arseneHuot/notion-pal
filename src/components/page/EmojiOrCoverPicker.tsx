import { useState } from "react";

const EMOJIS = [
  "📄", "📝", "📚", "📕", "📒", "📓", "📔", "📗", "📘", "📙", "📰", "🗞️",
  "🚀", "💡", "🎯", "🛠️", "🧰", "📌", "📋", "🗂️", "📁", "📂", "🗃️", "🗄️",
  "👋", "🎉", "✨", "⭐", "🌟", "🔥", "💎", "🎨", "🎵", "🎬", "🎮", "🧩",
  "🏠", "🏢", "🏦", "🏥", "🏨", "🏫", "🏛️", "🌍", "🌎", "🌏", "🗺️", "🧭",
  "💼", "💰", "💸", "💳", "🧾", "📊", "📈", "📉", "🔍", "🔎", "💻", "📱",
  "⚙️", "🔧", "🔨", "🪛", "⚡", "🔋", "🔌", "💾", "📡", "📺", "🎥", "📷",
  "🍕", "🍔", "🍣", "☕", "🍵", "🍺", "🍷", "🍰", "🍪", "🥗", "🥑", "🍎",
  "🐱", "🐶", "🐰", "🐻", "🐼", "🦊", "🦁", "🐯", "🐮", "🐷", "🐸", "🦄",
];

interface Props {
  onSelect: (icon: string) => void;
  onClose: () => void;
}

export function EmojiOrCoverPicker({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
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
        <div className="grid grid-cols-10 gap-1 overflow-y-auto flex-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => onSelect(e)}
              className="text-2xl hover:bg-accent rounded p-1"
              data-testid={`emoji-${e}`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onSelect("")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
