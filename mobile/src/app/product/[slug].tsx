/**
 * Product details — real data only (taste/ingredients shown only when the DB
 * provides them), quantity selector and Add to Cart.
 */
import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, EmptyState, ErrorState } from "@/components/ui";
import { QuantityStepper } from "@/components/add-to-cart";
import { useCart } from "@/context/cart-context";
import { fetchProductBySlug } from "@/lib/api";
import { formatNaira, productImageUrl, type Product } from "@/lib/types";
import { websiteUrl } from "@/lib/env";
import { colors, fonts, radius, shadowSoft } from "@/lib/theme";
import { ArrowLeft } from "reicon-react-native";

export default function ProductDetails() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { addLine } = useCart();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchProductBySlug(String(slug));
        if (cancelled) return;
        if (!result) {
          setStatus("missing");
        } else {
          setProduct(result);
          setStatus("ready");
        }
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function handleAdd() {
    if (!product) return;
    addLine(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={colors.ink[800]} />
        </Pressable>
        <Text style={styles.topTitle}>Product details</Text>
        <View style={styles.backButton} />
      </View>

      {status === "loading" ? (
        <ActivityIndicator style={styles.spinner} color={colors.brand[600]} size="large" />
      ) : status === "missing" ? (
        <EmptyState
          kind="snacks"
          title="Snack not found"
          message="This snack may have been removed from the menu."
          action={<Button label="Back to Menu" onPress={() => router.back()} variant="secondary" style={styles.stateAction} />}
        />
      ) : status === "error" ? (
        <ErrorState message={errorMessage ?? ""} onRetry={() => router.replace(`/product/${String(slug)}`)} />
      ) : product ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.stage, shadowSoft]}>
            <Image
              source={{ uri: productImageUrl(websiteUrl, product.imageUrl) }}
              contentFit="contain"
              style={styles.stageImage}
              transition={180}
              accessibilityLabel={product.name}
            />
          </View>

          <View style={styles.titleRow}>
            <View style={styles.titleMeta}>
              <Text style={styles.name}>{product.name}</Text>
              <Text style={styles.weight}>{product.weightLabel}</Text>
            </View>
            {product.isFeatured ? (
              <View style={styles.featuredChip}>
                <Text style={styles.featuredChipText}>Featured</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.price}>{formatNaira(product.priceNaira)}</Text>

          {product.taste ? (
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Taste</Text>
              <Text style={styles.factValue}>{product.taste}</Text>
            </View>
          ) : null}
          {product.ingredients && product.ingredients.length > 0 ? (
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Ingredients</Text>
              <Text style={styles.factValue}>{product.ingredients.join(", ")}</Text>
            </View>
          ) : null}

          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.purchaseRow}>
            <View>
              <Text style={styles.quantityLabel}>Quantity</Text>
              <QuantityStepper value={quantity} onChange={setQuantity} label={product.name} />
            </View>
          </View>
        </ScrollView>
      ) : null}

      {product ? (
        <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 14) }]} aria-hidden={false}>
          <Button
            label={added ? "Added to cart ✓" : `Add to Cart · ${formatNaira(product.priceNaira * quantity)}`}
            onPress={handleAdd}
            busy={false}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
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
  spinner: { marginTop: 64 },
  stateAction: { marginTop: 16 },
  content: {
    paddingBottom: 130,
    paddingHorizontal: 20,
  },
  stage: {
    backgroundColor: colors.ink[950],
    borderRadius: radius.xl,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stageImage: {
    width: "78%",
    height: "88%",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 18,
  },
  titleMeta: {
    flexShrink: 1,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 21,
    lineHeight: 27,
    color: colors.ink[900],
  },
  weight: {
    marginTop: 3,
    fontSize: 13.5,
    color: colors.ink[500],
  },
  featuredChip: {
    backgroundColor: colors.brand[100],
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featuredChipText: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    color: colors.brand[800],
  },
  price: {
    marginTop: 8,
    fontFamily: fonts.displayBold,
    fontSize: 23,
    color: colors.brand[700],
  },
  factRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  factLabel: {
    width: 92,
    fontSize: 13.5,
    fontFamily: fonts.bodySemiBold,
    color: colors.ink[500],
  },
  factValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink[800],
  },
  description: {
    marginTop: 16,
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.ink[600],
  },
  purchaseRow: {
    marginTop: 22,
  },
  quantityLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13.5,
    color: colors.ink[800],
    marginBottom: 8,
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
