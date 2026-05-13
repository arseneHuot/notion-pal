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
                <div className="text-sm font-medium flex items-center gap-2">
                  {new Date(v.savedAt).toLocaleString()}
                  {/* B-8000 — distinguish auto-captured pre-restore snapshots
                      so users know which ones are their forward escape hatch. */}
                  {v.autoSnapshot && (
                    <span className="text-[10px] uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded px-1.5 py-0.5">
                      Auto
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{v.label ?? (v.snapshot.title || "Untitled")}</div>
              </div>
              <button
                onClick={() => {
                  // B-8000 — destructive action. Confirm before overwriting
                  // the current page state. `restoreVersion` now auto-saves a
                  // pre-restore snapshot too, but the user should consent
                  // before any data swap (especially because there's no
                  // diff/preview UI yet — see I-8000).
                  const ok = window.confirm(
                    "Restore will replace the current page content with this version.\n\n" +
                    "An automatic snapshot of your current state will be saved first so you can roll back.\n\n" +
                    "Continue?"
                  );
                  if (!ok) return;
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
