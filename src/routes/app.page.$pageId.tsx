import { createFileRoute, Navigate } from "@tanstack/react-router";

/**
 * Alias for `/app/p/<pageId>` (B-7201). Old links / external bookmarks may
 * point at the verbose path; redirect to the canonical short route.
 */
export const Route = createFileRoute("/app/page/$pageId")({
  component: PageAlias,
});

function PageAlias() {
  const { pageId } = Route.useParams();
  return <Navigate to="/app/p/$pageId" params={{ pageId }} replace />;
}
