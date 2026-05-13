import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore, resolveComment } from "@/lib/store";

export const Route = createFileRoute("/app/inbox")({
  component: InboxPage,
});

function InboxPage() {
  // Select only the unresolved-comments array so React picks up the
  // change immediately when resolveComment fires (B-2210). With the
  // shallow-equality cache in useStore this returns a stable reference
  // unless an item flipped resolved or was added/removed.
  const items = useStore((s) =>
    Object.values(s.comments)
      .filter((c) => !c.resolved)
      .sort((a, b) => b.createdAt - a.createdAt),
  );
  const pages = useStore((s) => s.pages);
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">Inbox</h1>
      <p className="text-sm text-muted-foreground mb-4">Notifications, comments and mentions across your workspace.</p>
      {items.length === 0 && <div className="text-sm text-muted-foreground">All caught up! ✨</div>}
      <div className="space-y-2">
        {items.map((c) => {
          const page = pages[c.pageId];
          return (
            <div key={c.id} className="border border-border rounded p-3">
              <div className="text-sm">
                <button
                  onClick={() => page && navigate({ to: "/app/p/$pageId", params: { pageId: page.id } })}
                  className="font-medium underline"
                >
                  {page?.icon ?? "📄"} {page?.title || "Untitled"}
                </button>
                <span className="text-xs text-muted-foreground ml-2">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="text-sm mt-1 whitespace-pre-wrap">{c.content}</div>
              <button onClick={() => resolveComment(c.id)} className="mt-2 text-xs text-muted-foreground hover:underline" data-testid={`inbox-resolve-${c.id}`}>
                Mark as read
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
