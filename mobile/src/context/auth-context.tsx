/**
 * Auth context — the SAME Supabase authentication system as the website.
 *
 * Sessions persist via AsyncStorage; the same email/password (or Google)
 * account that signs into the website signs into this app, and vice versa.
 * There is no second user database: everything goes through the website's
 * Supabase project (resolved from /api/mobile/config).
 *
 * Google sign-in runs through the WEBSITE's own login page, so the app gets
 * the exact same Google flow as the website (same consent screen, same
 * accounts, no extra Supabase redirect configuration). The website then
 * hands the finished session back to the app:
 *   - native: the /auth/app-return page redirects to the app's deep link
 *     (captured by the system auth browser) with the tokens in the fragment
 *   - web:    the same page redirects back into this page, where
 *             supabase-js reads the tokens from the URL fragment
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User } from "@supabase/supabase-js";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { websiteUrl } from "@/lib/env";
import { getSupabase } from "@/lib/supabase";

/**
 * Where the website's return bridge should send the finished session.
 *
 * - Native in Expo Go: the current exp:// session URL (Expo Go handles it).
 * - Native dev build / standalone: the cnazfoods:// scheme.
 * - Web (Expo web preview): back to this app's own origin (the /sign-in
 *   route, where supabase-js applies the fragment session).
 */
export function googleRedirectUri(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/sign-in`;
  }
  // Expo Go resolves this to the running exp:// URL; dev builds resolve it
  // to cnazfoods://.
  return AuthSession.makeRedirectUri({ scheme: "cnazfoods" });
}

/** Extracts the implicit-flow tokens from a Supabase OAuth redirect URL. */
export function extractSessionFromUrl(url: string): { access_token: string; refresh_token: string } | null {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return null;
  const params = new URLSearchParams(url.slice(hashIndex + 1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  return { access_token: accessToken, refresh_token: refreshToken };
}

function extractErrorFromUrl(url: string): string | null {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return null;
  const params = new URLSearchParams(url.slice(hashIndex + 1));
  return params.get("error_description") ?? params.get("error") ?? null;
}

type GoogleResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ ok: true; needsConfirmation: boolean } | { ok: false; error: string }>;
  signInWithGoogle: () => Promise<GoogleResult>;
  /** Completes a Google sign-in from a redirect URL (in-process or cold start). */
  completeGoogleSignIn: (url: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const PENDING_REDIRECT_KEY = "cnaz-pending-oauth-redirect";

/**
 * Web only: the URL fragment as this module loads. When the website's
 * app-return bridge redirects back into the app, the session tokens arrive
 * in the fragment. supabase-js's detectSessionInUrl normally applies them,
 * but it may reject and CLEAR the hash before React even runs (e.g. if the
 * fragment is not the complete implicit-flow set), so we snapshot it here,
 * before anything else, and replay it below if no session materialised.
 */
const WEB_HASH_ON_LOAD =
  Platform.OS === "web" && typeof window !== "undefined" ? window.location.hash : "";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Restore the persisted session as soon as the client exists.
    const supabase = getSupabase();
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Web: the app-return bridge redirected into this page with the session
  // tokens in the URL fragment. If supabase-js did not already apply them,
  // replay the snapshot taken at module load and clean the address bar.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!WEB_HASH_ON_LOAD.includes("access_token=")) return;
    void (async () => {
      const url = `${window.location.origin}${window.location.pathname}${WEB_HASH_ON_LOAD}`;
      const applied = await completeGoogleSignIn(url);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      if (applied) {
        console.log("[cnaz] Google session applied from the website return bridge.");
      }
    })();
    // Run once per page load; completeGoogleSignIn is stable at this point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A Google sign-in that returned through the app scheme while the app was
  // cold-started (e.g. OS reopened the app before JS was ready) is replayed.
  useEffect(() => {
    if (loading) return;
    void (async () => {
      try {
        const pendingUrl = await AsyncStorage.getItem(PENDING_REDIRECT_KEY);
        if (pendingUrl) {
          await AsyncStorage.removeItem(PENDING_REDIRECT_KEY);
          await completeGoogleSignIn(pendingUrl);
        }
      } catch {
        // Ignore malformed pending values.
      }
    })();
  }, [loading]);

  const completeGoogleSignIn = async (url: string): Promise<boolean> => {
    const nextSession = extractSessionFromUrl(url);
    if (nextSession) {
      const supabase = getSupabase();
      const { error } = await supabase.auth.setSession({
        access_token: nextSession.access_token,
        refresh_token: nextSession.refresh_token,
      });
      if (!error) return true;
      console.warn("[cnaz] Could not apply the Google session:", error.message);
      return false;
    }
    const errorDescription = extractErrorFromUrl(url);
    if (errorDescription) console.warn("[cnaz] Google sign-in failed:", errorDescription);
    return false;
  };

  const signInWithPassword = async (email: string, password: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      const message =
        error.message === "Invalid login credentials"
          ? "That email and password don't match an account. Please check them and try again."
          : error.message === "Email not confirmed"
            ? "Please confirm your email first (we sent you a confirmation link when you signed up)."
            : "We couldn't sign you in right now. Please try again.";
      return { ok: false as const, error: message };
    }
    return { ok: true as const };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) {
      const message =
        error.message === "User already registered"
          ? "An account with this email already exists. Try signing in instead."
          : "We couldn't create your account. Please check your details and try again.";
      return { ok: false as const, error: message };
    }
    // When "Confirm email" is enabled, `session` is null and the website's
    // existing confirmation-email flow sends the link.
    return { ok: true as const, needsConfirmation: !data.session };
  };

  const signInWithGoogle = async (): Promise<GoogleResult> => {
    // The website's /login page runs the whole Google flow and hands the
    // session back through its /auth/app-return bridge, so the app shares
    // the website's Google setup one-for-one.
    const appRedirect = googleRedirectUri();
    const authUrl = `${websiteUrl}/login?app_redirect=${encodeURIComponent(appRedirect)}`;

    // Web (browser preview): navigate to the website's login page. Google
    // sign-in happens there, and the bridge redirects straight back into
    // this app with the session tokens in the URL fragment.
    if (Platform.OS === "web") {
      window.location.assign(authUrl);
      return { ok: true }; // the page is navigating away; session arrives on return
    }

    // Native: open the website's sign-in in the system auth browser and
    // capture the deep-link redirect with the tokens in the fragment.
    const result = await WebBrowser.openAuthSessionAsync(authUrl, appRedirect, {
      showTitle: false,
      enableBarCollapsing: Platform.OS === "android",
    });
    if (result.type !== "success" || !result.url) {
      // Cancelled, or the deep link could not be handled.
      const cancelled = result.type === "cancel" || result.type === "dismiss";
      return {
        ok: false,
        error: cancelled
          ? "Google sign-in was cancelled."
          : "We couldn't complete Google sign-in. Please make sure the website is reachable and try again.",
      };
    }

    const ok = await completeGoogleSignIn(result.url);
    return ok
      ? { ok: true }
      : { ok: false, error: "We couldn't complete Google sign-in. Please try again." };
  };

  const signOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setSession(null);
  };

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signInWithPassword,
      signUp,
      signInWithGoogle,
      completeGoogleSignIn,
      signOut,
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export { PENDING_REDIRECT_KEY };
