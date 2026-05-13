import { useStore } from "@/lib/store";
import { PropertyCell } from "../PropertyEditor";
import { applyFilters, applySorts } from "../filter";

export function GalleryView({ databaseId, viewId }: { databaseId: string; viewId: string }) {
  const db = useStore((s) => s.databases[databaseId]);
  const rowsMap = useStore((s) => s.rows);
  const view = db?.views.find((v) => v.id === viewId);
  if (!db || !view || view.type !== "gallery") return null;
  const titleProp = db.properties.find((p) => p.type === "title");
  const visibleProps = db.properties.filter((p) => !(view.hiddenProperties ?? []).includes(p.id) && p.type !== "title").slice(0, 4);
  const rows = db.rows.map((r) => rowsMap[r]).filter((r) => r && !r.isInTrash);
  const filtered = applyFilters(rows, (view.filters ?? []), db);
  const sorted = applySorts(filtered, (view.sorts ?? []), db);
  const sizeClass = view.cardSize === "small" ? "w-40" : view.cardSize === "large" ? "w-72" : "w-56";

  if (sorted.length === 0) {
    return (
      <div className="border border-dashed border-border rounded p-6 text-center text-xs text-muted-foreground" data-testid={`gallery-empty-${databaseId}`}>
        No cards yet. Add a row from the table view or via "+ New".
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {sorted.map((r) => (
        <div
          key={r.id}
          onClick={() => window.dispatchEvent(new CustomEvent("open-row-detail", { detail: { rowId: r.id } }))}
          className={`bg-card border border-border rounded-md shadow-sm overflow-hidden cursor-pointer hover:ring-1 hover:ring-border ${sizeClass}`}
          data-testid={`gallery-card-${r.id}`}
        >
          <div className="aspect-square bg-muted flex items-center justify-center text-4xl">
            {(r.icon as string) ?? titleProp?.name?.[0] ?? "📄"}
          </div>
          <div className="p-2">
            {titleProp && (
              <div className="font-medium truncate">
                <PropertyCell database={db} property={titleProp} row={r} />
              </div>
            )}
            {visibleProps.map((p) => (
              <div key={p.id} className="mt-1 text-xs text-muted-foreground">
                <PropertyCell database={db} property={p} row={r} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
