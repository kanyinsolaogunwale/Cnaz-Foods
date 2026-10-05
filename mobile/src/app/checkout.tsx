/**
 * Checkout — collects the same customer/delivery fields as the website and
 * POSTs to the SAME /api/orders endpoint (Bearer token auth). The server
 * re-validates and re-prices everything; the cart is cleared server-side.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Field, InlineError } from "@/components/ui";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { endpoints, websiteUrl } from "@/lib/env";
import { formatNaira } from "@/lib/types";
import { colors, fonts, radius } from "@/lib/theme";
import { ArrowLeft } from "reicon-react-native";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type FormValues = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  note: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = { fullName: "", email: "", phone: "", address: "", city: "", state: "", note: "" };

/** Client-side validation mirrors the server rules (src/lib/orders.ts). */
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.fullName.trim().length < 2) errors.fullName = "Please enter your full name.";
  if (!EMAIL_RE.test(values.email.trim())) errors.email = "Please enter a valid email address.";
  const digits = values.phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) errors.phone = "Please enter a valid phone number.";
  if (values.address.trim().length < 8) errors.address = "Please enter your delivery address (street, area, landmark).";
  if (values.city.trim().length < 2) errors.city = "Please enter your city or town.";
  if (values.note.trim().length > 300) errors.note = "Please keep the note under 300 characters.";
  return errors;
}

export default function Checkout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();
  const { lines, ready, count, subtotal, clear } = useCart();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prefill from the signed-in account (same as the website does).
  useEffect(() => {
    if (!user) return;
    setValues((prev) => ({
      ...prev,
      fullName:
        prev.fullName ||
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        "",
      email: prev.email || user.email || "",
    }));
  }, [user]);

  const placedOrderRef = useRef<string | null>(null);

  async function handleSubmit() {
    if (submitting) return;
    setFormError(null);
    const clientErrors = validate(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setFormError("Please check the highlighted fields and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(endpoints.orders, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
          customer: {
            fullName: values.fullName.trim(),
            email: values.email.trim(),
            phone: values.phone.trim(),
            address: values.address.trim(),
            city: values.city.trim(),
            state: values.state.trim(),
            note: values.note.trim(),
          },
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        order?: { id: string; reference: string };
        error?: string;
        fieldErrors?: Record<string, string>;
      } | null;

      if (!response.ok || !data?.order) {
        if (data?.fieldErrors) setErrors(data.fieldErrors as FieldErrors);
        setFormError(data?.error ?? "We couldn't place your order. Please try again.");
        setSubmitting(false);
        return;
      }

      // Order saved through the website backend (cart cleared server-side;
      // confirmation email sent by the website's existing email flow).
      placedOrderRef.current = data.order.id;
      clear();
      router.replace(`/order/${data.order.id}`);
    } catch {
      setFormError("We couldn't place your order. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  const summaryItems = useMemo(
    () =>
      lines.map((line) => (
        <View key={line.productId} style={styles.summaryLine}>
          <Text style={styles.summaryName} numberOfLines={1}>
            {line.name} × {line.quantity}
          </Text>
          <Text style={styles.summaryPrice}>{formatNaira(line.priceNaira * line.quantity)}</Text>
        </View>
      )),
    [lines],
  );

  if (ready && lines.length === 0 && !submitting) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Checkout</Text>
        </View>
        <View style={styles.emptyWrap}>
          <InlineError message="Your cart is empty, add some snacks first." />
          <Button
            label="Back to the Menu"
            variant="secondary"
            onPress={() => router.replace("/menu")}
            style={{ marginTop: 16 }}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.ink[800]} />
          </Pressable>
          <Text style={styles.topTitle}>Checkout</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {formError ? <InlineError message={formError} /> : null}

          <Text style={styles.sectionTitle}>Contact details</Text>
          <Text style={styles.sectionHint}>We'll use these to confirm your order and delivery.</Text>
          <View style={styles.card}>
            <Field
              label="Full name"
              placeholder="e.g. Ada Obi"
              autoComplete="name"
              value={values.fullName}
              onChangeText={(v) => setValues((p) => ({ ...p, fullName: v }))}
              error={errors.fullName}
            />
            <Field
              label="Email address"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              hint="Your order confirmation is sent here."
              value={values.email}
              onChangeText={(v) => setValues((p) => ({ ...p, email: v }))}
              error={errors.email}
            />
            <Field
              label="Phone number"
              placeholder="e.g. 0803 000 0000"
              keyboardType="phone-pad"
              autoComplete="tel"
              hint="We call this number to confirm delivery."
              value={values.phone}
              onChangeText={(v) => setValues((p) => ({ ...p, phone: v }))}
              error={errors.phone}
            />
          </View>

          <Text style={styles.sectionTitle}>Delivery details</Text>
          <Text style={styles.sectionHint}>Where should we bring your snacks?</Text>
          <View style={styles.card}>
            <Field
              label="Delivery address"
              placeholder="Street, area, landmark"
              autoComplete="street-address"
              value={values.address}
              onChangeText={(v) => setValues((p) => ({ ...p, address: v }))}
              error={errors.address}
            />
            <Field
              label="City / town"
              placeholder="e.g. Uyo"
              value={values.city}
              onChangeText={(v) => setValues((p) => ({ ...p, city: v }))}
              error={errors.city}
            />
            <Field
              label="State (optional)"
              placeholder="e.g. Akwa Ibom"
              value={values.state}
              onChangeText={(v) => setValues((p) => ({ ...p, state: v }))}
              error={errors.state}
            />
            <Field
              label="Delivery note (optional)"
              placeholder="Anything we should know?"
              multiline
              value={values.note}
              onChangeText={(v) => setValues((p) => ({ ...p, note: v }))}
              error={errors.note}
            />
          </View>

          <Text style={styles.sectionTitle}>Order summary</Text>
          <View style={[styles.card, styles.summaryCard]}>
            {summaryItems}
            <View style={styles.summaryDivider} />
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
          </View>

          <Text style={styles.footnote}>
            After you place your order you can pay securely online (card, transfer or USSD), or we'll arrange payment
            when we call to confirm delivery. You'll also receive a confirmation email.
          </Text>
        </ScrollView>

        <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Button
            label={submitting ? "Placing your order…" : "Place order"}
            onPress={() => void handleSubmit()}
            busy={submitting}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink[100],
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.ink[800],
  },
  content: {
    paddingBottom: 140,
    paddingHorizontal: 20,
    gap: 12,
  },
  sectionTitle: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink[900],
  },
  sectionHint: {
    marginTop: -6,
    fontSize: 13,
    color: colors.ink[500],
  },
  card: {
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink[100],
    padding: 16,
  },
  summaryCard: {
    gap: 4,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  summaryName: {
    flexShrink: 1,
    fontSize: 13.5,
    color: colors.ink[700],
  },
  summaryPrice: {
    fontSize: 13.5,
    fontFamily: fonts.bodyMedium,
    color: colors.ink[900],
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.ink[100],
    marginVertical: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13.5,
    color: colors.ink[600],
  },
  summaryValue: {
    fontSize: 13.5,
    fontFamily: fonts.bodyMedium,
    color: colors.ink[900],
  },
  deliveryValue: {
    fontSize: 13.5,
    fontFamily: fonts.bodyMedium,
    color: colors.ink[600],
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
  footnote: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink[500],
  },
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "rgba(251,249,244,0.96)",
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
  },
});
