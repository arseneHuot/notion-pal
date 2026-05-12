import { createFileRoute } from "@tanstack/react-router";
import { InlineDatabase } from "@/components/database/InlineDatabase";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/app/db/$databaseId")({
  component: DbPage,
});

function DbPage() {
  const { databaseId } = Route.useParams();
  const db = useStore((s) => s.databases[databaseId]);
  if (!db) {
    return <div className="p-8 text-sm text-muted-foreground">Database not found.</div>;
  }
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="text-3xl mb-2">{db.icon ?? "🗄️"}</div>
      <InlineDatabase databaseId={databaseId} initialViewId={null} />
    </div>
  );
}
