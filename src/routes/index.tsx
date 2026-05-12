import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus, Search, Star, Hash, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NotionClone — Your workspace, reimagined" },
      { name: "description", content: "A minimal, fast Notion-style workspace for notes, docs and ideas." },
    ],
  }),
  component: Index,
});

function Index() {
  const pages = [
    { icon: FileText, title: "Getting Started", subtitle: "Welcome to your workspace" },
    { icon: Hash, title: "Roadmap Q3", subtitle: "Planning · 12 blocks" },
    { icon: Star, title: "Ideas", subtitle: "Captured thoughts" },
    { icon: FileText, title: "Meeting Notes", subtitle: "Updated 2h ago" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border bg-sidebar p-4 hidden md:flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 py-3 text-sm font-semibold">
          <div className="size-6 rounded bg-primary text-primary-foreground grid place-items-center text-xs">N</div>
          <span>NotionClone</span>
        </div>
        <button className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-muted-foreground">
          <Search className="size-4" /> Search
        </button>
        <button className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-muted-foreground">
          <Plus className="size-4" /> New page
        </button>
        <div className="mt-4 px-2 text-xs uppercase tracking-wider text-muted-foreground">Workspace</div>
        {pages.map((p) => (
          <button key={p.title} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-foreground">
            <ChevronRight className="size-3 text-muted-foreground" />
            <p.icon className="size-4 text-muted-foreground" />
            <span className="truncate">{p.title}</span>
          </button>
        ))}
      </aside>

      <main className="flex-1 max-w-3xl mx-auto px-8 py-16">
        <div className="text-6xl mb-4">📝</div>
        <h1 className="text-5xl font-bold tracking-tight mb-4">Untitled</h1>
        <p className="text-muted-foreground mb-10">
          Press <kbd className="px-1.5 py-0.5 rounded border border-border text-xs">/</kbd> for commands, or just start writing.
        </p>

        <div className="space-y-3 text-foreground">
          <p className="text-lg leading-relaxed">
            Welcome to <strong>NotionClone</strong> — a clean canvas for your thoughts, notes, and projects.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Tell me what you'd like to build next: blocks editor, databases, sharing, dark mode… I'm ready when you are.
          </p>
        </div>
      </main>
    </div>
  );
}
