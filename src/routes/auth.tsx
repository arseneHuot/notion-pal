import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Toaster, toast } from "@/components/ui/Toast";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — NotionClone" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/app" });
  }, [user, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, name || email.split("@")[0]);
      } else {
        await signIn(email, password);
      }
      navigate({ to: "/app" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      toast(message, "error");
      console.error("Auth error:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-semibold">
            <span className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">N</span>
            <span>NotionClone</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Your workspace, reimagined</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1">
            <button
              type="button"
              className={`flex-1 py-1.5 text-sm rounded-md transition ${mode === "signin" ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 text-sm rounded-md transition ${mode === "signup" ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="block text-sm mb-1 font-medium">Name</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="auth-name"
                />
              </div>
            )}
            <div>
              <label className="block text-sm mb-1 font-medium">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="auth-email"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">Password</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="auth-password"
              />
            </div>

            {error && (
              <div
                className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-md p-2 border border-red-200 dark:border-red-900"
                role="alert"
                aria-live="polite"
                data-testid="auth-error"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              data-testid="auth-submit"
            >
              {busy ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            {mode === "signin" ? "No account? " : "Have an account? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="underline"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
