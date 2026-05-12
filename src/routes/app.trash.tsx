import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore, restorePage, permanentlyDeletePage } from "@/lib/store";
import { Trash2, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/app/trash")({
  component: TrashPage,
});

function TrashPage() {
  const pages = useStore((s) => s.pages);
  const trashed = useMemo(
    () => Object.values(pages).filter((p) => p.isInTrash).sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0)),
    [pages],
  );
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">Trash</h1>
      {trashed.length === 0 && (
        <div className="text-sm text-muted-foreground">Trash is empty.</div>
      )}
      <div className="space-y-2">
        {trashed.map((p) => (
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
                restorePage(p.id);
                navigate({ to: "/app/p/$pageId", params: { pageId: p.id } });
              }}
              className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground flex items-center gap-1"
              data-testid={`restore-${p.id}`}
            >
              <RotateCcw className="size-3" /> Restore
            </button>
            <button
              onClick={() => {
                if (confirm("Permanently delete this page?")) permanentlyDeletePage(p.id);
              }}
              className="text-xs px-2 py-1 rounded bg-destructive text-white flex items-center gap-1"
              data-testid={`delete-forever-${p.id}`}
            >
              <Trash2 className="size-3" /> Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
