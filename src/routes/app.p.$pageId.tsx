import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageView } from "@/components/page/PageView";

export const Route = createFileRoute("/app/p/$pageId")({
  component: PageRoute,
});

function PageRoute() {
  const { pageId } = Route.useParams();
  return <PageView pageId={pageId} />;
}
