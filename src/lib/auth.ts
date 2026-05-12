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
  if (error) {
    const msg = error.message ?? "Sign-up failed";
    if (/already registered/i.test(msg)) {
      throw new Error("An account with this email already exists. Try signing in.");
    }
    throw new Error(msg);
  }
  // If email confirmations are off and the session was issued, use it. Otherwise sign in.
  let user = data.user;
  if (!data.session) {
    const signInResult = await supabase.auth.signInWithPassword({ email, password });
    if (signInResult.error) throw new Error(signInResult.error.message ?? "Sign-in after sign-up failed");
    user = signInResult.data.user;
  }
  if (!user) throw new Error("Sign-up returned no user.");
  const profile = toProfile(user);
  if (profile) initializeForUser(profile);
  return profile;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Normalize common Supabase errors to friendlier strings.
    const msg = error.message ?? "Sign-in failed";
    if (/invalid login credentials/i.test(msg)) {
      throw new Error("Invalid email or password.");
    }
    if (/email not confirmed/i.test(msg)) {
      throw new Error("Email not confirmed. (Email confirmation is disabled on this app; check Supabase project settings.)");
    }
    throw new Error(msg);
  }
  if (!data.user) {
    throw new Error("Sign-in returned no user — please try again.");
  }
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
