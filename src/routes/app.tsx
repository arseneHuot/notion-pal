import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useStore, setUI } from "@/lib/store";
import { CommandPalette } from "@/components/command/CommandPalette";
import { AIChat } from "@/components/ai/AIChat";
import { InlineToolbar } from "@/components/editor/InlineToolbar";
import { Toaster } from "@/components/ui/Toast";
import { RowDetailDrawer } from "@/components/database/RowDetailDrawer";

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

  // Auto-collapse sidebar on small screens.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setUI({ sidebarOpen: !mq.matches });
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  // Auto-close sidebar drawer on route change on mobile (B-3521 / B-4014).
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 768px)").matches) {
      setUI({ sidebarOpen: false });
    }
  }, [pathname]);

  // Escape closes the mobile drawer (when overlaid). On desktop the sidebar
  // is in-flow and we don't intercept Escape (it's already a no-op).
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (!sidebarOpen) return;
      if (window.matchMedia("(max-width: 768px)").matches) {
        setUI({ sidebarOpen: false });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading workspace…</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden relative">
      {sidebarOpen && <Sidebar />}
      {/* Scrim — only visible on small screens when the sidebar is overlaid */}
      {sidebarOpen && (
        <button
          onClick={() => setUI({ sidebarOpen: false })}
          className="md:hidden fixed inset-0 z-20 bg-black/40 cursor-default"
          aria-label="Close sidebar"
          data-testid="sidebar-scrim"
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <AIChat />
      <InlineToolbar />
      <Toaster />
      <RowDetailDrawer />
    </div>
  );
}
