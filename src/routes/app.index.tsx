import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useMemo } from "react";

export const Route = createFileRoute("/app/")({
  component: AppHome,
});

function AppHome() {
  const pages = useStore((s) => s.pages);
  const navigate = useNavigate();

  const recents = useMemo(() => {
    return Object.values(pages)
      .filter((p) => !p.isInTrash)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 6);
  }, [pages]);

  const favorites = useMemo(
    () => Object.values(pages).filter((p) => p.isFavorite && !p.isInTrash),
    [pages],
  );

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Home</h1>

      {favorites.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">⭐ Favorites</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {favorites.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate({ to: "/app/p/$pageId", params: { pageId: p.id } })}
                className="text-left p-4 border border-border rounded-lg hover:bg-accent transition"
              >
                <div className="text-2xl mb-2">{p.icon ?? "📄"}</div>
                <div className="font-medium truncate">{p.title || "Untitled"}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">🕐 Recently visited</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recents.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate({ to: "/app/p/$pageId", params: { pageId: p.id } })}
              className="text-left p-4 border border-border rounded-lg hover:bg-accent transition"
            >
              <div className="text-2xl mb-2">{p.icon ?? "📄"}</div>
              <div className="font-medium truncate">{p.title || "Untitled"}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(p.updatedAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
