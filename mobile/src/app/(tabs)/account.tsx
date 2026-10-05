/**
 * Account — the signed-in customer's real profile (avatar, name, email from
 * the shared Supabase account), order history, and the significant actions
 * (sign out, delete account) each guarded by a confirmation dialog, exactly
 * like the website. RLS on Supabase keeps every user's data private.
 */
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Button, ConfirmModal, ErrorState, InlineError } from "@/components/ui";
import { useAuth } from "@/context/auth-context";
import { getSupabase } from "@/lib/supabase";
import { endpoints } from "@/lib/env";
import { colors, fonts, radius, shadowSoft } from "@/lib/theme";
import { ArrowRight, ClipboardText, TickCircle, UserMinus } from "reicon-react-native";

export default function Account() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session, signOut } = useAuth();
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [ordersStatus, setOrdersStatus] = useState<"loading" | "ready" | "error">("loading");

  // Confirmation dialogs (same copy as the website).
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteSentTo, setDeleteSentTo] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setOrdersStatus("loading");
    void (async () => {
      try {
        const supabase = getSupabase();
        const { count: orders, error } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        if (!cancelled) {
          setOrderCount(orders ?? 0);
          setOrdersStatus("ready");
        }
      } catch {
        if (!cancelled) setOrdersStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    "Cnaz Foods customer";
  const email = user?.email ?? "";
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined) ??
    null;
  const [avatarFailed, setAvatarFailed] = useState(false);

  function initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  async function handleSignOut() {
    setSignOutBusy(true);
    try {
      // The website emails a short "you signed out" notice; best effort only.
      try {
        await fetch(endpoints.signoutNotice, {
          method: "POST",
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
      } catch {
        // Signing out matters more than the notice.
      }
      await signOut();
      setSignOutOpen(false);
      router.replace("/sign-in");
    } finally {
      setSignOutBusy(false);
    }
  }

  async function handleDeleteRequest() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const response = await fetch(endpoints.accountDelete, {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        email?: string;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        setDeleteError(data?.error ?? "We couldn't send the deletion link. Please try again.");
        setDeleteBusy(false);
        return;
      }
      // Nothing is deleted yet: the emailed link (60 min) confirms it.
      setDeleteSentTo(data.email ?? email);
      setDeleteBusy(false);
    } catch {
      setDeleteError("We couldn't reach the server. Please check your connection and try again.");
      setDeleteBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Account</Text>

        {/* Profile: avatar first, name + email beside it (name big, email small). */}
        <View style={[styles.card, styles.profileRow, shadowSoft]}>
          {avatarUrl && !avatarFailed ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
              accessibilityLabel={`${displayName}'s profile photo`}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(displayName) || "C"}</Text>
            </View>
          )}
          <View style={styles.profileMeta}>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/account/orders")}
          style={({ pressed }) => [styles.row, shadowSoft, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.rowIconWrap}>
            <ClipboardText size={22} color={colors.brand[700]} />
          </View>
          <View style={styles.rowMeta}>
            <Text style={styles.rowTitle}>Order history</Text>
            <Text style={styles.rowSubtitle}>
              {ordersStatus === "loading"
                ? "Loading…"
                : ordersStatus === "error"
                  ? "Couldn't load right now"
                  : `${orderCount ?? 0} order${orderCount === 1 ? "" : "s"} placed`}
            </Text>
          </View>
          <ArrowRight size={18} color={colors.brand[700]} />
        </Pressable>

        <View style={[styles.card, shadowSoft, styles.actionsCard]}>
          <Text style={styles.actionsTitle}>Account actions</Text>
          <Text style={styles.actionsBody}>
            Signing out keeps your saved cart. Your cart and orders stay safe on your account.
          </Text>
          <Button
            label="Sign out"
            variant="secondary"
            onPress={() => setSignOutOpen(true)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            onPress={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
            style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.85 }]}
          >
            <UserMinus size={18} color={colors.accent.dark} />
            <Text style={styles.deleteLabel}>Delete account</Text>
          </Pressable>
        </View>

        <Text style={styles.footnote}>
          Signed in through the same Cnaz Foods account as the website. Your data is protected by Row Level
          Security; only you can see your cart and orders.
        </Text>
      </ScrollView>

      {/* Sign out: confirms first, like the website. */}
      <ConfirmModal
        visible={signOutOpen}
        title="Sign out of your account?"
        message="You can sign back in with Google anytime; your cart and order history will be waiting for you."
        confirmLabel={signOutBusy ? "Signing out…" : "Yes, sign out"}
        busy={signOutBusy}
        onConfirm={() => {
          void handleSignOut();
        }}
        onCancel={() => {
          if (!signOutBusy) setSignOutOpen(false);
        }}
      />

      {/* Delete account: asks the website to email a secure link first. */}
      <ConfirmModal
        visible={deleteOpen}
        title={deleteSentTo ? "Check your email" : "Delete your account?"}
        message={
          deleteSentTo
            ? undefined
            : "We'll email you a secure deletion link first. Nothing happens until you open that link in your email and confirm. The link expires in 60 minutes."
        }
        confirmLabel={deleteSentTo ? "Done" : deleteBusy ? "Sending…" : "Email me the link"}
        cancelLabel={deleteSentTo ? "Close" : "Keep my account"}
        busy={deleteBusy && !deleteSentTo}
        danger={!deleteSentTo}
        onConfirm={() => {
          if (deleteSentTo) {
            setDeleteOpen(false);
            return;
          }
          void handleDeleteRequest();
        }}
        onCancel={() => {
          if (!deleteBusy) {
            setDeleteOpen(false);
            if (deleteSentTo) setDeleteSentTo(null);
          }
        }}
      >
        {deleteSentTo ? (
          <View style={styles.deleteSent}>
            <TickCircle size={22} color={colors.brand[700]} />
            <Text style={styles.deleteSentText}>
              We sent a deletion link to {deleteSentTo}. Your account is only deleted when you open the link
              and confirm.
            </Text>
          </View>
        ) : null}
        {deleteError ? (
          <View style={styles.deleteErrorWrap}>
            <InlineError message={deleteError} />
          </View>
        ) : null}
      </ConfirmModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 130,
    gap: 14,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink[900],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink[100],
    padding: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.brand[100],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 20,
  },
  avatarText: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.brand[800],
  },
  profileMeta: {
    flexShrink: 1,
  },
  profileName: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink[900],
  },
  profileEmail: {
    marginTop: 3,
    fontSize: 13,
    color: colors.ink[500],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink[100],
    padding: 16,
    gap: 14,
  },
  rowIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.cream[100],
    alignItems: "center",
    justifyContent: "center",
  },
  rowMeta: { flex: 1 },
  rowTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink[900],
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.ink[500],
  },
  actionsCard: {
    marginTop: 8,
    gap: 14,
  },
  actionsTitle: {
    fontFamily: fonts.display,
    fontSize: 15.5,
    color: colors.ink[900],
  },
  actionsBody: {
    marginTop: -8,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink[600],
  },
  deleteButton: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.accent.DEFAULT,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.accent.dark,
  },
  deleteSent: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: colors.brand[50],
    borderColor: colors.brand[200],
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  deleteSentText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.brand[800],
  },
  deleteErrorWrap: {
    marginTop: 10,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink[500],
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
