/**
 * Order history — the signed-in customer's orders only (Supabase RLS), with
 * reference, date, status, items and total. Mirrors the website's
 * /account/orders data (same tables, same policies).
 */
import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, EmptyState, ErrorState } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";
import { formatDateTime, formatNaira, type OrderRow, type OrderStatus } from "@/lib/types";
import { colors, fonts, radius, shadowSoft } from "@/lib/theme";
import { ArrowLeft } from "reicon-react-native";

const STATUS_STYLES: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  received: { label: "Order received", bg: colors.brand[50], fg: colors.brand[800] },
  confirmed: { label: "Confirmed", bg: colors.brand[100], fg: colors.brand[800] },
  delivered: { label: "Delivered", bg: colors.ink[100], fg: colors.ink[700] },
  cancelled: { label: "Cancelled", bg: colors.accent.soft, fg: colors.accent.dark },
};

type HistoryOrder = Pick<OrderRow, "id" | "reference" | "status" | "total_naira" | "created_at"> & {
  order_items?: { product_name: string; quantity: number }[];
};

export default function OrderHistory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<HistoryOrder[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, status, total_naira, created_at, order_items ( product_name, quantity )")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders((data ?? []) as HistoryOrder[]);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.ink[800]} />
        </Pressable>
        <Text style={styles.topTitle}>Order history</Text>
        <View style={{ width: 28 }} />
      </View>

      {status === "loading" ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading your orders…</Text>
        </View>
      ) : status === "error" ? (
        <ErrorState message="We couldn't load your orders. Please try again." onRetry={() => void load()} />
      ) : orders && orders.length === 0 ? (
        <EmptyState
          kind="orders"
          title="You haven't placed any orders yet"
          message="Your orders will appear here once you place one."
          action={
            <Button label="Browse the Menu" onPress={() => router.navigate("/menu")} style={{ marginTop: 16 }} />
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {(orders ?? []).map((order) => {
            const tone = STATUS_STYLES[order.status] ?? STATUS_STYLES.received;
            const expanded = expandedId === order.id;
            return (
              <Pressable
                key={order.id}
                accessibilityRole="button"
                accessibilityLabel={`Order ${order.reference}, ${formatNaira(order.total_naira)}`}
                onPress={() => setExpandedId(expanded ? null : order.id)}
                style={[styles.orderCard, shadowSoft]}
              >
                <View style={styles.orderHead}>
                  <View style={styles.orderMeta}>
                    <Text style={styles.orderReference}>{order.reference}</Text>
                    <Text style={styles.orderDate}>{formatDateTime(order.created_at)}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.statusChipText, { color: tone.fg }]}>{tone.label}</Text>
                  </View>
                </View>

                {expanded && order.order_items && order.order_items.length > 0 ? (
                  <View style={styles.itemsBox}>
                    {order.order_items.map((item, index) => (
                      <Text key={index} style={styles.itemLine}>
                        {item.product_name} × {item.quantity}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <View style={styles.orderFooter}>
                  <Text style={styles.orderTotal}>{formatNaira(order.total_naira)}</Text>
                  <Text style={styles.orderToggle}>{expanded ? "Hide items ▲" : "Tap for items ▼"}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink[100],
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink[700],
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
  list: {
    padding: 20,
    paddingBottom: 130,
    gap: 12,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink[100],
    padding: 16,
  },
  orderHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  orderMeta: { flexShrink: 1 },
  orderReference: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.ink[900],
  },
  orderDate: {
    marginTop: 2,
    fontSize: 12.5,
    color: colors.ink[500],
  },
  statusChip: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusChipText: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
  },
  itemsBox: {
    marginTop: 12,
    backgroundColor: colors.cream[50],
    borderRadius: radius.sm,
    padding: 12,
    gap: 4,
  },
  itemLine: {
    fontSize: 13.5,
    color: colors.ink[700],
  },
  orderFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderTotal: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink[900],
  },
  orderToggle: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.brand[700],
  },
});
