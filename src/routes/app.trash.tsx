import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore, restorePageCascade, permanentlyDeletePage, updateDatabase, deleteDatabase } from "@/lib/store";
import { Trash2, RotateCcw, Database as DbIcon } from "lucide-react";
import { toast } from "@/components/ui/Toast";

export const Route = createFileRoute("/app/trash")({
  component: TrashPage,
});

function TrashPage() {
  const pages = useStore((s) => s.pages);
  const databases = useStore((s) => s.databases);
  const trashedPages = useMemo(
    () => Object.values(pages).filter((p) => p.isInTrash).sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0)),
    [pages],
  );
  const trashedDbs = useMemo(
    () => Object.values(databases).filter((d) => d.isInTrash).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
    [databases],
  );
  const empty = trashedPages.length === 0 && trashedDbs.length === 0;

  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">Trash</h1>
      {empty && (
        <div className="text-sm text-muted-foreground" data-testid="trash-empty">
          Trash is empty.
        </div>
      )}
      {trashedPages.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Pages</h2>
          <div className="space-y-2">
            {trashedPages.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 border border-border rounded">
                <span className="text-2xl">{p.icon ?? "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.title || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground">
                    Trashed {p.trashedAt ? new Date(p.trashedAt).toLocaleString() : ""}
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Don't navigate after restore — rapid restore of multiple
                    // pages would unmount TrashPage and drop subsequent clicks
                    // (B-3519). Stay here and toast; user can click the page
                    // from the sidebar afterward.
                    restorePageCascade(p.id);
                    toast(`Restored "${p.title || "Untitled"}"`, "success");
                  }}
                  className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground flex items-center gap-1"
                  data-testid={`restore-${p.id}`}
                >
                  <RotateCcw className="size-3" /> Restore
                </button>
                <button
                  onClick={() => permanentlyDeletePage(p.id)}
                  className="text-xs px-2 py-1 rounded bg-destructive text-white flex items-center gap-1"
                  data-testid={`delete-forever-${p.id}`}
                >
                  <Trash2 className="size-3" /> Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {trashedDbs.length > 0 && (
        <div>
          <h2 className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Databases</h2>
          <div className="space-y-2">
            {trashedDbs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-3 border border-border rounded" data-testid={`trash-db-${d.id}`}>
                <span className="text-2xl">{d.icon ?? "🗄️"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{d.name || "Untitled database"}</div>
                  <div className="text-xs text-muted-foreground">{d.rows?.length ?? 0} rows</div>
                </div>
                <button
                  onClick={() => updateDatabase(d.id, { isInTrash: false, trashedAt: null } as Partial<typeof d>)}
                  className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground flex items-center gap-1"
                  data-testid={`restore-db-${d.id}`}
                >
                  <RotateCcw className="size-3" /> Restore
                </button>
                <button
                  onClick={() => deleteDatabase(d.id)}
                  className="text-xs px-2 py-1 rounded bg-destructive text-white flex items-center gap-1"
                  data-testid={`delete-forever-db-${d.id}`}
                >
                  <Trash2 className="size-3" /> Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
