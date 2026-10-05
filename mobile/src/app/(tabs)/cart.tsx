/**
 * Cart — reads and writes the SAME Supabase `carts`/`cart_items` rows the
 * website uses (see src/context/cart-context.tsx). Guest carts live in
 * AsyncStorage and merge on sign-in, exactly like the website.
 */
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, ConfirmModal, EmptyState } from "@/components/ui";
import { QuantityStepper } from "@/components/add-to-cart";
import { useCart } from "@/context/cart-context";
import { formatNaira, productImageUrl } from "@/lib/types";
import { websiteUrl } from "@/lib/env";
import { colors, fonts, radius, shadowSoft } from "@/lib/theme";
import { Trash2 } from "reicon-react-native";

export default function Cart() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lines, ready, count, subtotal, setQuantity, removeLine, reload } = useCart();
  // Item awaiting removal confirmation (destructive actions always confirm
  // first, same rule as the website; a React dialog works on web AND native,
  // unlike Alert.alert which react-native-web does not implement).
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);

  // The website writes to the SAME cart rows: re-read them whenever this
  // screen comes into view, so items added on the site appear immediately.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Cart</Text>
        {count > 0 ? <Text style={styles.subtitle}>{count} item{count === 1 ? "" : "s"}</Text> : null}
      </View>

      {!ready ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading your cart…</Text>
        </View>
      ) : lines.length === 0 ? (
        <EmptyState
          kind="cart"
          title="Your cart is empty"
          message="Add some snacks and they'll be saved here, on your phone and on the website."
          action={
            <Button label="Browse the Menu" onPress={() => router.navigate("/menu")} style={{ marginTop: 16 }} />
          }
        />
      ) : (
        <>
          <ScrollView style={styles.listScroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {lines.map((line) => (
              <View key={line.productId} style={[styles.line, shadowSoft]}>
                <Pressable
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`View ${line.name}`}
                  onPress={() => router.push(`/product/${line.slug}`)}
                  style={styles.stage}
                >
                  <Image
                    source={{ uri: productImageUrl(websiteUrl, line.imageUrl) }}
                    contentFit="contain"
                    style={styles.image}
                    recyclingKey={line.productId}
                  />
                </Pressable>
                <View style={styles.lineBody}>
                  <Text style={styles.lineName} numberOfLines={2}>{line.name}</Text>
                  <Text style={styles.lineWeight}>{line.weightLabel}</Text>
                  <View style={styles.lineFooter}>
                    <QuantityStepper
                      small
                      value={line.quantity}
                      onChange={(next) => setQuantity(line.productId, next)}
                      label={line.name}
                    />
                    <Text style={styles.lineTotal}>{formatNaira(line.priceNaira * line.quantity)}</Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${line.name}`}
                  onPress={() => setPendingRemove({ id: line.productId, name: line.name })}
                  style={styles.removeButton}
                  hitSlop={8}
                >
                  <Trash2 size={18} color={colors.ink[600]} />
                </Pressable>
              </View>
            ))}

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal ({count} item{count === 1 ? "" : "s"})</Text>
                <Text style={styles.summaryValue}>{formatNaira(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.deliveryValue}>To be confirmed</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatNaira(subtotal)}</Text>
              </View>
              <Text style={styles.deliveryNote}>
                We'll confirm delivery with you by phone after checkout; nothing is charged online for delivery.
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 10) + 84 }]}
          >
            <Button
              label={`Proceed to checkout · ${formatNaira(subtotal)}`}
              onPress={() => router.push("/checkout")}
            />
          </View>
        </>
      )}

      {/* Removal confirmation (web + native; Alert.alert has no web build). */}
      <ConfirmModal
        visible={pendingRemove !== null}
        title="Remove this item?"
        message={pendingRemove ? `Remove ${pendingRemove.name} from your cart?` : undefined}
        confirmLabel="Remove"
        cancelLabel="Keep it"
        danger
        onConfirm={() => {
          if (pendingRemove) removeLine(pendingRemove.id);
          setPendingRemove(null);
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.ink[500],
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink[900],
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.ink[500],
  },
  listScroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  line: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink[100],
    padding: 12,
    gap: 12,
  },
  stage: {
    width: 84,
    height: 84,
    backgroundColor: colors.ink[950],
    borderRadius: radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "86%",
    height: "86%",
  },
  lineBody: {
    flex: 1,
  },
  lineName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    lineHeight: 19,
    color: colors.ink[900],
  },
  lineWeight: {
    marginTop: 2,
    fontSize: 12.5,
    color: colors.ink[500],
  },
  lineFooter: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  lineTotal: {
    fontFamily: fonts.display,
    fontSize: 14.5,
    color: colors.ink[900],
  },
  removeButton: {
    alignSelf: "flex-start",
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream[100],
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink[100],
    padding: 16,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.ink[600],
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.ink[900],
  },
  deliveryValue: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.ink[600],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
    paddingTop: 12,
    marginBottom: 0,
  },
  totalLabel: {
    fontFamily: fonts.display,
    fontSize: 15.5,
    color: colors.ink[900],
  },
  totalValue: {
    fontFamily: fonts.display,
    fontSize: 15.5,
    color: colors.ink[900],
  },
  deliveryNote: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: colors.ink[500],
  },
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "rgba(251,249,244,0.98)",
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
  },
});
