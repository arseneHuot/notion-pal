import { createFileRoute } from "@tanstack/react-router";
import { useStore, setUI, toggleDarkMode, updateWorkspace } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const workspace = useStore((s) => (s.currentWorkspaceId ? s.workspaces[s.currentWorkspaceId] : null));
  const darkMode = useStore((s) => s.ui.darkMode);
  const { user, signOut } = useAuth();
  // Language is a stub for now — real localization is out of scope. The
  // testid is wired so E2E can assert the row exists (B-2814 / I-2808).
  const language = (typeof navigator !== "undefined" ? navigator.language : "en-US") || "en-US";

  return (
    <div className="max-w-3xl mx-auto px-8 py-12 space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>

      <section data-testid="settings-profile">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Account</h2>
        <div className="space-y-2 border border-border rounded p-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Email: </span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Name: </span>
            <span className="font-medium">{user?.name}</span>
          </div>
          <button
            onClick={() => signOut()}
            className="mt-2 text-xs bg-destructive text-white rounded px-3 py-1.5"
            data-testid="settings-signout"
          >
            Sign out
          </button>
        </div>
      </section>

      <section data-testid="settings-workspace">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Workspace</h2>
        <div className="space-y-2 border border-border rounded p-4">
          <WorkspaceNameRow workspaceId={workspace?.id ?? null} name={workspace?.name ?? ""} />
          <div className="text-sm" data-testid="settings-billing">
            <span className="text-muted-foreground">Plan: </span>
            <span className="font-medium capitalize">{workspace?.plan}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">AI credits remaining: </span>
            <span className="font-medium">{workspace?.aiCredits}</span>
          </div>
        </div>
      </section>

      <section data-testid="settings-language">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Language &amp; Region</h2>
        <div className="space-y-2 border border-border rounded p-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Detected locale: </span>
            <span className="font-medium">{language}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Localization is detected from your browser. UI text remains in English for now.
          </div>
        </div>
      </section>

      <section data-testid="settings-notifications">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Notifications</h2>
        <div className="space-y-2 border border-border rounded p-4 text-sm text-muted-foreground">
          In-app notifications appear in the Inbox. Email digests are not enabled.
        </div>
      </section>

      <section data-testid="settings-connections">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Connections</h2>
        <div className="space-y-2 border border-border rounded p-4 text-sm text-muted-foreground">
          No third-party integrations configured.
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Appearance</h2>
        <div className="space-y-2 border border-border rounded p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => toggleDarkMode()}
              data-testid="settings-darkmode"
            />
            <span>Dark mode</span>
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Data</h2>
        <div className="space-y-2 border border-border rounded p-4">
          <button
            onClick={() => {
              const s = useStoreState();
              if (!s) return;
              const json = JSON.stringify({
                workspace,
                teamspaces: Object.values(s.teamspaces ?? {}),
                pages: Object.values(s.pages ?? {}),
                blocks: Object.values(s.blocks ?? {}),
                databases: Object.values(s.databases ?? {}),
                rows: Object.values(s.rows ?? {}),
                comments: Object.values(s.comments ?? {}),
                templates: Object.values(s.templates ?? {}),
                automations: Object.values(s.automations ?? {}),
                calendarEvents: Object.values(s.calendarEvents ?? {}),
                mails: Object.values(s.mails ?? {}),
                exportedAt: new Date().toISOString(),
                schemaVersion: s.schemaVersion ?? 1,
              }, null, 2);
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `notion-clone-export-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-sm border border-border rounded px-3 py-1.5 hover:bg-accent"
            data-testid="settings-export"
          >
            Export workspace as JSON
          </button>
        </div>
      </section>
    </div>
  );
}

// B-8105 — inline rename for the current workspace. Click the row to flip
// into edit mode; Enter or blur commits, Esc reverts. Trimmed + capped to
// 80 chars by `updateWorkspace`.
function WorkspaceNameRow({ workspaceId, name }: { workspaceId: string | null; name: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  if (!workspaceId) {
    return (
      <div className="text-sm">
        <span className="text-muted-foreground">Name: </span>
        <span className="font-medium">{name}</span>
      </div>
    );
  }
  if (editing) {
    return (
      <div className="text-sm flex items-center gap-2">
        <span className="text-muted-foreground">Name: </span>
        <input
          autoFocus
          value={draft}
          maxLength={80}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft.trim()) updateWorkspace(workspaceId, { name: draft });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (draft.trim()) updateWorkspace(workspaceId, { name: draft });
              setEditing(false);
            }
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          className="flex-1 bg-background border border-input rounded px-2 py-0.5 text-sm font-medium"
          data-testid="settings-workspace-name-input"
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-sm w-full text-left hover:bg-accent/40 rounded px-1 -mx-1 py-0.5 group"
      data-testid="settings-workspace-name"
      title="Click to rename"
    >
      <span className="text-muted-foreground">Name: </span>
      <span className="font-medium">{name}</span>
      <span className="text-xs text-muted-foreground ml-2 opacity-0 group-hover:opacity-100">(click to edit)</span>
    </button>
  );
}

// Helper to read state synchronously
function useStoreState() {
  if (typeof window === "undefined") return null;
  try {
    const userId = JSON.parse(localStorage.getItem("notion-clone:global") ?? "{}").currentUserId;
    if (!userId) return null;
    return JSON.parse(localStorage.getItem(`notion-clone:user:${userId}`) ?? "{}");
  } catch {
    return null;
  }
}
