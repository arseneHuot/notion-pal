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

  return (
    <div className="flex flex-wrap gap-3">
      {sorted.map((r) => (
        <div key={r.id} className={`bg-card border border-border rounded-md shadow-sm overflow-hidden ${sizeClass}`} data-testid={`gallery-card-${r.id}`}>
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
