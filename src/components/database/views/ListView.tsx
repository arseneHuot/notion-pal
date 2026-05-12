import { useStore } from "@/lib/store";
import { PropertyCell } from "../PropertyEditor";
import { applyFilters, applySorts } from "../filter";

export function ListView({ databaseId, viewId }: { databaseId: string; viewId: string }) {
  const db = useStore((s) => s.databases[databaseId]);
  const rowsMap = useStore((s) => s.rows);
  const view = db?.views.find((v) => v.id === viewId);
  if (!db || !view || view.type !== "list") return null;
  const titleProp = db.properties.find((p) => p.type === "title");
  const otherProps = db.properties.filter((p) => p.type !== "title" && !(view.hiddenProperties ?? []).includes(p.id)).slice(0, 3);
  const rows = db.rows.map((r) => rowsMap[r]).filter((r) => r && !r.isInTrash);
  const filtered = applyFilters(rows, (view.filters ?? []), db);
  const sorted = applySorts(filtered, (view.sorts ?? []), db);
  return (
    <div className="rounded border border-border divide-y divide-border">
      {sorted.length === 0 && <div className="text-sm text-muted-foreground p-3">No rows.</div>}
      {sorted.map((r) => (
        <div
          key={r.id}
          onClick={() => window.dispatchEvent(new CustomEvent("open-row-detail", { detail: { rowId: r.id } }))}
          className="flex items-center gap-3 p-2 hover:bg-muted/20 cursor-pointer"
          data-testid={`list-row-${r.id}`}
        >
          {titleProp && (
            <div className="flex-1 min-w-0 font-medium truncate">
              <PropertyCell database={db} property={titleProp} row={r} />
            </div>
          )}
          {otherProps.map((p) => (
            <div key={p.id} className="min-w-[80px] text-xs text-muted-foreground">
              <PropertyCell database={db} property={p} row={r} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
