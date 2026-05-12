import { createFileRoute } from "@tanstack/react-router";
import { useStore, setUI, toggleDarkMode } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const workspace = useStore((s) => (s.currentWorkspaceId ? s.workspaces[s.currentWorkspaceId] : null));
  const darkMode = useStore((s) => s.ui.darkMode);
  const { user, signOut } = useAuth();

  return (
    <div className="max-w-3xl mx-auto px-8 py-12 space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>

      <section>
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

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Workspace</h2>
        <div className="space-y-2 border border-border rounded p-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Name: </span>
            <span className="font-medium">{workspace?.name}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Plan: </span>
            <span className="font-medium capitalize">{workspace?.plan}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">AI credits remaining: </span>
            <span className="font-medium">{workspace?.aiCredits}</span>
          </div>
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
