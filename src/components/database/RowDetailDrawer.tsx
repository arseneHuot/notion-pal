import { useEffect, useState } from "react";
import { useStore, deleteRow, updateRow } from "@/lib/store";
import { PropertyCell } from "./PropertyEditor";
import { X, Trash } from "lucide-react";

/** Click-to-open row detail drawer (B-1437). Listens for the global
 *  "open-row-detail" event with detail = { rowId } and shows every
 *  property of that row in an editable side panel. */
export function RowDetailDrawer() {
  const [rowId, setRowId] = useState<string | null>(null);
  const allRows = useStore((s) => s.rows);
  const databases = useStore((s) => s.databases);
  const row = rowId ? allRows[rowId] : null;
  const db = row ? databases[row.databaseId] : null;

  useEffect(() => {
    function open(e: Event) {
      const detail = (e as CustomEvent<{ rowId: string }>).detail;
      if (detail?.rowId) setRowId(detail.rowId);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setRowId(null);
    }
    window.addEventListener("open-row-detail", open);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("open-row-detail", open);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!rowId || !row || !db) return null;

  const titleProp = db.properties.find((p) => p.type === "title");
  const titleValue = titleProp ? (row.values[titleProp.id] as string) || "" : "";

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/30"
      onClick={() => setRowId(null)}
      data-testid="row-detail-drawer"
    >
      <div
        className="bg-card border-l border-border w-[420px] max-w-full h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="text-xs text-muted-foreground truncate">
            {db.icon ?? "🗄️"} {db.name}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                deleteRow(row.id);
                setRowId(null);
              }}
              className="p-1 text-destructive hover:bg-accent rounded"
              aria-label="Delete row"
              data-testid="row-detail-delete"
            >
              <Trash className="size-4" />
            </button>
            <button
              onClick={() => setRowId(null)}
              className="p-1 hover:bg-accent rounded"
              aria-label="Close"
              data-testid="row-detail-close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {titleProp && (
            <input
              value={titleValue}
              onChange={(e) => updateRow(row.id, { values: { [titleProp.id]: e.target.value } })}
              placeholder="Untitled"
              className="text-2xl font-bold bg-transparent outline-none w-full"
              data-testid="row-detail-title"
            />
          )}
          <div className="space-y-2">
            {db.properties.filter((p) => p.type !== "title").map((p) => (
              <div key={p.id} className="grid grid-cols-[140px_1fr] gap-3 items-start">
                <div className="text-xs text-muted-foreground py-1 truncate">{p.name}</div>
                <div>
                  <PropertyCell database={db} property={p} row={row} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
