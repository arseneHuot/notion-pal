import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useStore } from "@/lib/store";
import { CommandPalette } from "@/components/command/CommandPalette";
import { AIChat } from "@/components/ai/AIChat";
import { InlineToolbar } from "@/components/editor/InlineToolbar";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const sidebarOpen = useStore((s) => s.ui.sidebarOpen);
  const darkMode = useStore((s) => s.ui.darkMode);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", darkMode);
    }
  }, [darkMode]);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading workspace…</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      {sidebarOpen && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <AIChat />
      <InlineToolbar />
    </div>
  );
}
