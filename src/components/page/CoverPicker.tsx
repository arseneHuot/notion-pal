import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  current: string | null;
  onPick: (url: string | null) => void;
  onClose: () => void;
}

const CURATED_IMAGES = [
  "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=1200&q=70",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=70",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=70",
  "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1200&q=70",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&q=70",
  "https://images.unsplash.com/photo-1529245856630-f4853233d2ea?w=1200&q=70",
];

const GRADIENTS = [
  { name: "Sunset", value: "linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)" },
  { name: "Aurora", value: "linear-gradient(135deg, #43cea2 0%, #185a9d 100%)" },
  { name: "Peach", value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)" },
  { name: "Lavender", value: "linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)" },
  { name: "Forest", value: "linear-gradient(135deg, #1f4037 0%, #99f2c8 100%)" },
  { name: "Ocean", value: "linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)" },
  { name: "Night", value: "linear-gradient(135deg, #0f2027 0%, #2c5364 100%)" },
  { name: "Berry", value: "linear-gradient(135deg, #cc2b5e 0%, #753a88 100%)" },
];

function isSafeImageUrl(u: string): boolean {
  // Allow http/https URLs and data:image/* URLs only. Reject javascript:, file:, etc.
  if (/^data:image\//i.test(u)) return true;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function CoverPicker({ current, onPick, onClose }: Props) {
  const [url, setUrl] = useState(current ?? "");

  function apply() {
    const trimmed = url.trim();
    // B-1806: don't silently wipe when the field is empty.
    if (!trimmed) return;
    if (!isSafeImageUrl(trimmed)) return;
    onPick(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-popover border border-border rounded-lg shadow-lg p-4 w-[640px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="cover-picker"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Choose a cover</h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-xs uppercase text-muted-foreground tracking-wider">Image URL</label>
          <div className="flex gap-2 mt-1">
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") apply();
              }}
              placeholder="https://..."
              className="flex-1 bg-background border border-input rounded text-sm px-2 py-1"
              data-testid="cover-url-input"
            />
            <button
              onClick={apply}
              disabled={!url.trim() || !isSafeImageUrl(url.trim())}
              className="text-xs bg-primary text-primary-foreground rounded px-3 disabled:opacity-50"
              data-testid="cover-url-apply"
            >
              Apply
            </button>
          </div>
          {url.trim() && !isSafeImageUrl(url.trim()) && (
            <div className="text-xs text-destructive mt-1" data-testid="cover-url-error">
              Only http(s):// and data:image/ URLs are allowed.
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="text-xs uppercase text-muted-foreground tracking-wider">Gradients</label>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {GRADIENTS.map((g) => (
              <button
                key={g.name}
                onClick={() => onPick(g.value)}
                title={g.name}
                style={{ background: g.value }}
                className="h-20 rounded-md border border-border hover:ring-1 hover:ring-foreground/30"
                data-testid={`cover-grad-${g.name}`}
              >
                <span className="sr-only">{g.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase text-muted-foreground tracking-wider">Unsplash</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {CURATED_IMAGES.map((src, i) => (
              <button
                key={src}
                onClick={() => onPick(src)}
                className="h-24 rounded-md border border-border overflow-hidden hover:ring-1 hover:ring-foreground/30"
                data-testid={`cover-img-${i}`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {current && (
          <div className="mt-4 pt-3 border-t border-border">
            <button
              onClick={() => onPick(null)}
              className="text-xs text-destructive hover:underline"
              data-testid="cover-remove"
            >
              Remove cover
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
