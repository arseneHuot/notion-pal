import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UserProfile } from "@/lib/types";
import { bootstrapSession, onAuthChange, signIn as authSignIn, signUp as authSignUp, signOut as authSignOut } from "@/lib/auth";
import { initializeForUser } from "@/lib/store";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    bootstrapSession().then((u) => {
      if (mounted) {
        setUser(u);
        setLoading(false);
      }
    });
    const off = onAuthChange((u) => {
      if (!mounted) return;
      setUser((cur) => {
        // Only update if id actually changed to avoid render loops on token refresh
        if (cur?.id === u?.id) return cur;
        return u;
      });
      if (u) initializeForUser(u);
    });
    return () => {
      mounted = false;
      off();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    async signUp(email, password, name) {
      const u = await authSignUp(email, password, name);
      setUser(u);
    },
    async signIn(email, password) {
      const u = await authSignIn(email, password);
      setUser(u);
    },
    async signOut() {
      await authSignOut();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth used outside AuthProvider");
  return ctx;
}
