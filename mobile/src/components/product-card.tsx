/**
 * Product cards — the images come from the same DB rows the website serves
 * (packaging photos shot on black), so they sit on the dark `.stage` surface
 * exactly like on the website. Never place them on white.
 */
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatNaira, productImageUrl, type Product } from "@/lib/types";
import { websiteUrl } from "@/lib/env";
import { colors, fonts, radius, shadowSoft } from "@/lib/theme";
import { AddToCartButton, QuantityStepper } from "@/components/add-to-cart";

export function ProductStageImage({ product, style }: { product: Product; style?: object }) {
  return (
    <View style={[styles.stage, style]}>
      <Image
        source={{ uri: productImageUrl(websiteUrl, product.imageUrl) }}
        contentFit="contain"
        style={styles.stageImage}
        transition={150}
        recyclingKey={product.id}
        accessibilityLabel={product.name}
      />
    </View>
  );
}

/** Two-column grid card for Menu and Home sections. */
export function ProductCard({
  product,
  onPress,
  onAdd,
  width,
}: {
  product: Product;
  onPress: () => void;
  onAdd: () => void;
  width?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatNaira(product.priceNaira)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        width != null ? { width } : null,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <ProductStageImage product={product} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.cardWeight}>{product.weightLabel}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>{formatNaira(product.priceNaira)}</Text>
          <AddToCartButton onPress={onAdd} productName={product.name} />
        </View>
      </View>
    </Pressable>
  );
}

/** Horizontal scroll card for the Home featured rail. */
export function FeaturedCard({
  product,
  onPress,
  onAdd,
}: {
  product: Product;
  onPress: () => void;
  onAdd: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.featuredCard, shadowSoft, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <ProductStageImage product={product} style={styles.featuredImage} />
      <View style={styles.featuredBody}>
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>Featured</Text>
        </View>
        <Text style={styles.cardName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.cardWeight}>{product.weightLabel}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>{formatNaira(product.priceNaira)}</Text>
          <AddToCartButton onPress={onAdd} productName={product.name} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: {
    backgroundColor: colors.ink[950],
    borderRadius: radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  stageImage: {
    width: "100%",
    height: "100%",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink[100],
    padding: 10,
    gap: 10,
  },
  cardImage: {
    aspectRatio: 1.1,
    width: "100%",
  },
  cardBody: {
    gap: 2,
    paddingHorizontal: 2,
  },
  cardName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    lineHeight: 19,
    color: colors.ink[900],
  },
  cardWeight: {
    fontSize: 12.5,
    color: colors.ink[500],
  },
  cardFooter: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardPrice: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink[900],
    flexShrink: 1,
  },
  featuredCard: {
    width: 200,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink[100],
    padding: 10,
    gap: 10,
    marginRight: 12,
  },
  featuredImage: {
    height: 130,
    width: "100%",
  },
  featuredBody: {
    gap: 2,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand[100],
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  featuredBadgeText: {
    fontSize: 10.5,
    fontFamily: fonts.bodySemiBold,
    color: colors.brand[800],
    letterSpacing: 0.3,
  },
});
