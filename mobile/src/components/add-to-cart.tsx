/**
 * Add-to-cart control and quantity stepper. The add button gives a brief
 * confirmation tick (like the website's "Added to your cart" message) without
 * navigating away, and a long-press hint opens the product instead.
 */
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "@/lib/theme";

/**
 * On web, role="button" renders a real <button> element — nesting one inside
 * a product card's own button is invalid HTML, so the inner control drops
 * its role there (the label still reads out). Native is unaffected.
 */
const innerRole = Platform.OS === "web" ? undefined : "button";

export function AddToCartButton({ onPress, productName }: { onPress: () => void; productName: string }) {
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function handlePress() {
    onPress();
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1400);
  }

  return (
    <Pressable
      accessibilityRole={innerRole}
      accessibilityLabel={added ? `${productName} added to cart` : `Add ${productName} to cart`}
      accessibilityState={{ selected: added }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.addButton,
        { backgroundColor: added ? colors.brand[700] : pressed ? colors.brand[700] : colors.brand[600] },
      ]}
    >
      <Text style={styles.addIcon}>{added ? "✓" : "+"}</Text>
    </Pressable>
  );
}

export function QuantityStepper({
  value,
  onChange,
  label,
  small,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
  small?: boolean;
}) {
  const size = small ? 34 : 42;
  const button = (text: string, onPress: () => void, disabled: boolean, accessibilityLabel: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.stepButton,
        { width: size, height: size, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      <Text style={[styles.stepIcon, { fontSize: small ? 16 : 20 }]}>{text}</Text>
    </Pressable>
  );

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={`${label} quantity, ${value}`}
      style={[
        styles.stepper,
        { padding: small ? 3 : 5, gap: small ? 6 : 10 },
      ]}
    >
      {button("−", () => onChange(value - 1), value <= 1, `Decrease ${label} quantity`)}
      <Text style={[styles.stepValue, { fontSize: small ? 14 : 16, minWidth: small ? 22 : 28 }]}>
        {value}
      </Text>
      {button("+", () => onChange(value + 1), value >= 99, `Increase ${label} quantity`)}
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 38,
    height: 38,
    borderRadius: radius.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  addIcon: {
    color: colors.white,
    fontSize: 20,
    fontFamily: fonts.bodySemiBold,
    marginTop: -1,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cream[100],
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  stepButton: {
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink[200],
    alignItems: "center",
    justifyContent: "center",
  },
  stepIcon: {
    color: colors.ink[800],
    fontFamily: fonts.bodySemiBold,
    marginTop: -2,
  },
  stepValue: {
    fontFamily: fonts.bodySemiBold,
    color: colors.ink[900],
    textAlign: "center",
  },
});
