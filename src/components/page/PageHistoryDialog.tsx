import { saveSnapshot, restoreVersion } from "@/lib/store";
import type { Page } from "@/lib/types";
import { X } from "lucide-react";

export function PageHistoryDialog({ page, open, onClose }: { page: Page; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-lg w-[600px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold">Page history</h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-3">
          <button
            onClick={() => saveSnapshot(page.id)}
            className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded"
            data-testid="snapshot-now"
          >
            Save snapshot now
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {page.history.length === 0 && (
            <div className="text-sm text-muted-foreground">No history yet. Save a snapshot to begin.</div>
          )}
          {page.history.map((v) => (
            <div key={v.id} className="border border-border rounded p-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{new Date(v.savedAt).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{v.snapshot.title || "Untitled"}</div>
              </div>
              <button
                onClick={() => {
                  restoreVersion(page.id, v.id);
                  onClose();
                }}
                className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded"
                data-testid={`restore-${v.id}`}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
