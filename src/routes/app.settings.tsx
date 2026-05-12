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
              const state = useStore.getState ? useStore.getState() : null;
              const json = JSON.stringify({
                workspace: workspace,
                pages: Object.values(useStoreState()?.pages ?? {}),
                databases: Object.values(useStoreState()?.databases ?? {}),
              }, null, 2);
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "notion-clone-export.json";
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
