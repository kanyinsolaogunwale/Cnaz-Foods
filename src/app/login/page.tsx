import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/login-panel";
import { isSupabaseConfigured } from "@/lib/env";
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
  searchParams: { error?: string; next?: string };
}) {
  const next = safeNext(searchParams.next);

  if (isSupabaseConfigured) {
    const supabase = getSupabaseServerClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (user) redirect(next);
  }

  return (
    <div className="container-page py-14 sm:py-20">
      <LoginPanel error={searchParams.error} next={next} configured={isSupabaseConfigured} />
    </div>
  );
}
