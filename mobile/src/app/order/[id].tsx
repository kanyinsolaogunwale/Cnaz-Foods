/**
 * Order confirmation — reads the saved order through the user's own Supabase
 * session (RLS-scoped, same as the website's account pages). Shows the
 * reference, summary, delivery details and what happens next. The
 * confirmation email is sent by the website's existing flow.
 */
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, ErrorState } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";
import { formatDateTime, formatNaira, type OrderRow } from "@/lib/types";
import { colors, fonts, radius, shadowSoft } from "@/lib/theme";

const STATUS_LABELS: Record<string, string> = {
  received: "Order received",
  confirmed: "Confirmed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function OrderConfirmation() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items (*)")
          .eq("id", String(id))
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        setOrder((data as OrderRow) ?? null);
        setStatus(data ? "ready" : "missing");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Order confirmation</Text>
      </View>

      {status === "loading" ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading your order…</Text>
        </View>
      ) : status === "missing" ? (
        <ErrorState
          message="We couldn't find this order on your account. If you just placed it as a guest, keep the reference from your confirmation email."
          onRetry={() => router.replace("/home")}
        />
      ) : status === "error" ? (
        <ErrorState message="We couldn't load this order. Please try again." onRetry={() => router.back()} />
      ) : order ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.successCard, shadowSoft]}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>Thank you, {order.customer_name.split(" ")[0]}!</Text>
            <Text style={styles.successBody}>
              Your order has been received and we're getting your snacks ready.
            </Text>
            <View style={styles.referenceChip}>
              <Text style={styles.referenceLabel}>Order number</Text>
              <Text style={styles.referenceValue}>{order.reference}</Text>
            </View>
            <Text style={styles.placedAt}>Placed on {formatDateTime(order.created_at)}</Text>
          </View>

          <View style={[styles.card, shadowSoft]}>
            <Text style={styles.cardTitle}>Order summary</Text>
            <View style={styles.items}>
              {(order.order_items ?? []).map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemName}>{item.product_name}</Text>
                    <Text style={styles.itemSub}>
                      {item.product_weight ? `${item.product_weight} · ` : ""}Qty {item.quantity} ×{" "}
                      {formatNaira(item.unit_price_naira)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>{formatNaira(item.line_total_naira)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatNaira(order.subtotal_naira)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.summaryValue}>
                {order.delivery_fee_naira > 0 ? formatNaira(order.delivery_fee_naira) : "To be confirmed"}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatNaira(order.total_naira)}</Text>
            </View>
            <Text style={styles.emailNote}>
              Confirmation email: {order.email_status === "sent" ? "sent ✓" : order.email_status === "failed" ? "couldn't send, please keep your order number" : order.email_status === "skipped" ? "not configured, keep your order number" : "on its way"}
            </Text>
          </View>

          <View style={[styles.card, shadowSoft]}>
            <Text style={styles.cardTitle}>Delivery details</Text>
            <Text style={styles.deliveryName}>{order.customer_name}</Text>
            <Text style={styles.deliveryLine}>{order.customer_phone}</Text>
            <Text style={styles.deliveryLine}>{order.delivery_address}</Text>
            <Text style={styles.deliveryLine}>{[order.city, order.state].filter(Boolean).join(", ")}</Text>
            {order.note ? <Text style={styles.deliveryNote}>Note: {order.note}</Text> : null}
          </View>

          <View style={[styles.card, shadowSoft]}>
            <Text style={styles.cardTitle}>What happens next</Text>
            {[
              "We review your order and prepare your snacks.",
              `We contact you on ${order.customer_phone} to arrange delivery.`,
              "Your snacks are packed and on their way.",
            ].map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <Button label="Continue shopping" onPress={() => router.replace("/home")} style={styles.cta} />
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  topTitle: {
    fontFamily: fonts.display,
    fontSize: 21,
    color: colors.ink[900],
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: colors.ink[500],
    fontSize: 14,
  },
  content: {
    padding: 20,
    paddingBottom: 44,
    gap: 14,
  },
  successCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: "center",
  },
  successEmoji: { fontSize: 44 },
  successTitle: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 21,
    color: colors.ink[900],
    textAlign: "center",
  },
  successBody: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink[600],
    textAlign: "center",
  },
  referenceChip: {
    marginTop: 16,
    backgroundColor: colors.brand[50],
    borderColor: colors.brand[200],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
  },
  referenceLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    color: colors.brand[800],
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  referenceValue: {
    marginTop: 2,
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: colors.ink[900],
    letterSpacing: 0.5,
  },
  placedAt: {
    marginTop: 10,
    fontSize: 12,
    color: colors.ink[500],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink[100],
    padding: 16,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.ink[900],
    marginBottom: 12,
  },
  items: { gap: 12 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  itemMeta: { flexShrink: 1 },
  itemName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink[900],
  },
  itemSub: {
    marginTop: 2,
    fontSize: 12.5,
    color: colors.ink[500],
  },
  itemTotal: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink[900],
  },
  divider: {
    height: 1,
    backgroundColor: colors.ink[100],
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 13.5, color: colors.ink[600] },
  summaryValue: {
    fontSize: 13.5,
    fontFamily: fonts.bodyMedium,
    color: colors.ink[900],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
    paddingTop: 10,
    marginBottom: 0,
  },
  totalLabel: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink[900],
  },
  totalValue: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink[900],
  },
  emailNote: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    color: colors.ink[500],
  },
  deliveryName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    color: colors.ink[900],
  },
  deliveryLine: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink[700],
  },
  deliveryNote: {
    marginTop: 6,
    fontSize: 12.5,
    fontStyle: "italic",
    color: colors.ink[500],
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand[100],
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.brand[800],
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink[700],
  },
  cta: { marginTop: 8 },
});
