import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NotionClone — Your workspace, reimagined" },
      { name: "description", content: "A clean canvas for thoughts, plans, and projects." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/app" });
    }
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border h-14 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="size-7 rounded bg-primary text-primary-foreground grid place-items-center font-bold">N</span>
          NotionClone
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="text-sm px-3 py-1.5 rounded hover:bg-accent"
            data-testid="header-signin"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground"
            data-testid="header-signup"
          >
            Get started
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Your second brain.
          </h1>
          <p className="mt-3 text-2xl md:text-3xl font-semibold text-muted-foreground">
            Docs, databases, calendar & AI — all in one workspace.
          </p>
          <p className="mt-6 text-base text-muted-foreground max-w-2xl mx-auto">
            An open-source Notion alternative. Write, plan, and ship in a fast block-based editor with rich databases, real-time collaboration-ready, and ask-AI everywhere.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/auth"
              className="bg-primary text-primary-foreground rounded-md px-5 py-2.5 font-medium hover:opacity-90"
              data-testid="hero-cta"
            >
              Start for free
            </Link>
            <a
              href="https://github.com"
              className="border border-border rounded-md px-5 py-2.5 hover:bg-accent"
            >
              Star on GitHub
            </a>
          </div>
        </div>

        <section className="mt-24 grid md:grid-cols-3 gap-4">
          <FeatureCard icon="📝" title="Block-based editor" desc="Slash menu, drag-and-drop, headings, todos, callouts, code, embeds." />
          <FeatureCard icon="🗄️" title="Powerful databases" desc="Table, board, calendar, timeline, gallery, chart and form views." />
          <FeatureCard icon="✨" title="AI everywhere" desc="Ask Notion, AI blocks, Plan Mode and search across your workspace." />
          <FeatureCard icon="📅" title="Calendar & Mail" desc="Two-way sync with date properties and basic Mail experience." />
          <FeatureCard icon="🤝" title="Comments & history" desc="Inline comments, mentions, page versions, and trash." />
          <FeatureCard icon="🌍" title="Publish to the web" desc="Share any page as a public site with a custom slug." />
        </section>
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Built as a 24h demo. Inspired by Notion.
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border p-4 bg-card">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}
