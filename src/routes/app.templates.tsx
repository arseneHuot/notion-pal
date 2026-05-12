import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore, createPage, createBlock } from "@/lib/store";
import type { Block, BlockType } from "@/lib/types";

export const Route = createFileRoute("/app/templates")({
  component: TemplatesPage,
});

interface TemplateDef {
  name: string;
  category: string;
  icon: string;
  description: string;
  blocks: { type: BlockType; content?: string; emoji?: string }[];
}

const TEMPLATES: TemplateDef[] = [
  {
    name: "Meeting notes",
    category: "Work",
    icon: "📝",
    description: "Capture decisions, action items, and follow-ups.",
    blocks: [
      { type: "heading-1", content: "Meeting notes" },
      { type: "text", content: "<strong>Date:</strong> " },
      { type: "text", content: "<strong>Attendees:</strong> " },
      { type: "heading-2", content: "Agenda" },
      { type: "bullet-list", content: "" },
      { type: "heading-2", content: "Decisions" },
      { type: "bullet-list", content: "" },
      { type: "heading-2", content: "Action items" },
      { type: "todo", content: "" },
    ],
  },
  {
    name: "Project brief",
    category: "Work",
    icon: "🚀",
    description: "Define problem, goals, scope, and risks.",
    blocks: [
      { type: "heading-1", content: "Project brief" },
      { type: "callout", content: "One-sentence summary of the project.", emoji: "🎯" },
      { type: "heading-2", content: "Problem" },
      { type: "text", content: "" },
      { type: "heading-2", content: "Goals" },
      { type: "bullet-list", content: "" },
      { type: "heading-2", content: "Scope" },
      { type: "text", content: "" },
      { type: "heading-2", content: "Risks" },
      { type: "bullet-list", content: "" },
    ],
  },
  {
    name: "Daily journal",
    category: "Personal",
    icon: "📓",
    description: "Track what you did, learned, and want to improve.",
    blocks: [
      { type: "heading-1", content: "Today" },
      { type: "heading-2", content: "What I did" },
      { type: "bullet-list", content: "" },
      { type: "heading-2", content: "What I learned" },
      { type: "bullet-list", content: "" },
      { type: "heading-2", content: "Tomorrow" },
      { type: "todo", content: "" },
    ],
  },
  {
    name: "Reading list",
    category: "Personal",
    icon: "📚",
    description: "Track books, articles, papers.",
    blocks: [
      { type: "heading-1", content: "Reading list" },
      { type: "callout", content: "Books, articles, and papers I want to read.", emoji: "💡" },
    ],
  },
  {
    name: "OKRs",
    category: "Work",
    icon: "🎯",
    description: "Set objectives and key results for the quarter.",
    blocks: [
      { type: "heading-1", content: "OKRs" },
      { type: "heading-2", content: "Objective 1" },
      { type: "text", content: "" },
      { type: "heading-3", content: "Key Results" },
      { type: "todo", content: "" },
      { type: "todo", content: "" },
      { type: "heading-2", content: "Objective 2" },
      { type: "text", content: "" },
    ],
  },
  {
    name: "Runbook",
    category: "Engineering",
    icon: "⚙️",
    description: "Document an operational procedure.",
    blocks: [
      { type: "heading-1", content: "Runbook" },
      { type: "callout", content: "Use this runbook when responding to incidents.", emoji: "⚠️" },
      { type: "heading-2", content: "Symptoms" },
      { type: "bullet-list", content: "" },
      { type: "heading-2", content: "Diagnose" },
      { type: "numbered-list", content: "" },
      { type: "heading-2", content: "Mitigate" },
      { type: "numbered-list", content: "" },
      { type: "heading-2", content: "Postmortem template" },
      { type: "quote", content: "Link to postmortem doc" },
    ],
  },
  {
    name: "Decision log (ADR)",
    category: "Engineering",
    icon: "🏛️",
    description: "Track architectural decisions.",
    blocks: [
      { type: "heading-1", content: "ADR-XXX: Title" },
      { type: "heading-2", content: "Context" },
      { type: "text", content: "" },
      { type: "heading-2", content: "Decision" },
      { type: "text", content: "" },
      { type: "heading-2", content: "Consequences" },
      { type: "text", content: "" },
    ],
  },
  {
    name: "1:1 agenda",
    category: "Work",
    icon: "🤝",
    description: "Discussion points for a one-on-one.",
    blocks: [
      { type: "heading-1", content: "1:1 with __" },
      { type: "heading-2", content: "Wins" },
      { type: "bullet-list", content: "" },
      { type: "heading-2", content: "Blockers" },
      { type: "bullet-list", content: "" },
      { type: "heading-2", content: "Topics" },
      { type: "bullet-list", content: "" },
      { type: "heading-2", content: "Action items" },
      { type: "todo", content: "" },
    ],
  },
];

function TemplatesPage() {
  const navigate = useNavigate();
  const teamspaces = useStore((s) => Object.values(s.teamspaces));
  const personalTs = teamspaces.find((t) => t.mode === "private")?.id ?? teamspaces[0]?.id ?? null;

  function applyTemplate(t: TemplateDef) {
    const pageId = createPage({ title: t.name, icon: t.icon, teamspaceId: personalTs });
    t.blocks.forEach((b, i) => {
      createBlock(pageId, {
        type: b.type,
        parentId: pageId,
        order: i,
        content: b.content ?? "",
        ...(b.emoji ? { emoji: b.emoji } : {}),
        ...(b.type === "todo" ? { checked: false } : {}),
      } as Omit<Block, "id" | "createdAt" | "updatedAt">);
    });
    navigate({ to: "/app/p/$pageId", params: { pageId } });
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold mb-2">Templates</h1>
      <p className="text-sm text-muted-foreground mb-6">Pick a template to start fast. You can edit anything after.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.name}
            onClick={() => applyTemplate(t)}
            className="text-left p-4 border border-border rounded-lg hover:bg-accent transition"
            data-testid={`template-${t.name}`}
          >
            <div className="text-2xl mb-2">{t.icon}</div>
            <div className="font-semibold">{t.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.category}</div>
            <div className="text-xs text-muted-foreground mt-2">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
