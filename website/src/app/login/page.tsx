import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/login-panel";
import { isSupabaseConfigured } from "@/lib/env";
import { safeAppRedirect } from "@/lib/app-redirect";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Cnaz Foods with Google to track your orders.",
};

export const dynamic = "force-dynamic";

function safeNext(value: string | undefined): string {
  if (!value) return "/account";
  if (!value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string; app_redirect?: string };
}) {
  const next = safeNext(searchParams.next);
  // Present when the Cnaz Foods mobile app started the sign-in: after auth
  // finishes, the session is handed back to the app (deep link or web origin).
  const appRedirect = safeAppRedirect(searchParams.app_redirect);

  if (isSupabaseConfigured) {
    const supabase = getSupabaseServerClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (user) {
      // Already signed in on the website: hand the session straight back to
      // the app when it asked for it, otherwise continue as usual.
      redirect(
        appRedirect
          ? `/auth/app-return?redirect=${encodeURIComponent(appRedirect)}`
          : next,
      );
    }
  }

  return (
    <div className="container-page py-14 sm:py-20">
      <LoginPanel
        error={searchParams.error}
        next={next}
        appRedirect={appRedirect}
        configured={isSupabaseConfigured}
      />
    </div>
  );
}
