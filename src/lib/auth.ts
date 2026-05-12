import { supabase } from "@/integrations/supabase/client";
import { initializeForUser, signOutState, getState } from "./store";
import type { UserProfile } from "./types";

function toProfile(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): UserProfile | null {
  if (!user) return null;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = (typeof metadata.name === "string" && metadata.name) || (user.email ? user.email.split("@")[0] : "Anonymous");
  return {
    id: user.id,
    email: user.email ?? "",
    name,
    avatar: (typeof metadata.avatar === "string" && metadata.avatar) || "🧑",
    createdAt: Date.now(),
  };
}

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, avatar: "🧑" },
    },
  });
  if (error) throw error;
  // If email confirmations are off and the session was issued, use it. Otherwise sign in.
  let user = data.user;
  if (!data.session) {
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
    user = signIn.data.user;
  }
  const profile = toProfile(user);
  if (profile) initializeForUser(profile);
  return profile;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const profile = toProfile(data.user);
  if (profile) initializeForUser(profile);
  return profile;
}

export async function signOut() {
  await supabase.auth.signOut();
  signOutState();
}

export async function bootstrapSession(): Promise<UserProfile | null> {
  const { data } = await supabase.auth.getSession();
  const profile = toProfile(data.session?.user ?? null);
  if (profile) {
    initializeForUser(profile);
    // restore dark mode from current state
    const dark = getState().ui.darkMode;
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", dark);
    }
    return profile;
  }
  return null;
}

export function onAuthChange(cb: (user: UserProfile | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const profile = toProfile(session?.user ?? null);
    cb(profile);
  });
  return () => data.subscription.unsubscribe();
}
