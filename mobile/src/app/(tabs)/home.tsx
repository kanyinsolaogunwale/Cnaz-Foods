/**
 * Home — greeting with the customer's name, the green "full Menu" hero with
 * a circular arrow CTA, featured rail, and snack-type sections built from
 * the real product data (only types that exist in the database are shown).
 * Search lives on its own screen behind the header search icon.
 */
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeHeader } from "@/components/screen";
import { EmptyState, ErrorState } from "@/components/ui";
import { ProductCard, FeaturedCard } from "@/components/product-card";
import { useCart } from "@/context/cart-context";
import { cachedCatalog, loadCatalog, type LoadResult } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { colors, fonts, radius } from "@/lib/theme";
import { ArrowRight } from "reicon-react-native";

// Pressables inside a parent Pressable must not double up as <button> on web.
const innerRole = Platform.OS === "web" ? undefined : "button";

export default function Home() {
  const router = useRouter();
  const { addLine } = useCart();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // Two-column grid: gutters 20+20, gap 12.
  const cardWidth = Math.floor((windowWidth - 40 - 12) / 2);
  const [data, setData] = useState<LoadResult>(() => cachedCatalog());
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await loadCatalog();
      setData(result);
      setStatus("idle");
      setErrorMessage(null);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Please try again.");
    }
  }, []);

  // First load: cached first (instant), then network refresh.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void refresh().finally(() => setRefreshing(false));
  }, [refresh]);

  const featured = useMemo(() => data.products.filter((p) => p.isFeatured).slice(0, 6), [data.products]);

  const sections = useMemo(() => {
    // Group by snack type derived from real names, nothing invented.
    const groups = new Map<string, Product[]>();
    for (const product of data.products) {
      const type = snackTypeOf(product.name);
      const list = groups.get(type) ?? [];
      list.push(product);
      groups.set(type, list);
    }
    return [...groups.entries()];
  }, [data.products]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
      <HomeHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[600]} />}
      >
        {status === "error" ? (
          <ErrorState message={errorMessage ?? ""} onRetry={() => void refresh()} />
        ) : status === "loading" && data.products.length === 0 ? (
          <ActivityIndicator style={styles.spinner} color={colors.brand[600]} size="large" />
        ) : (
          <>
            {/* Quick route to the Menu: brand-green hero card, arrow is a CTA */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open the full Menu"
              onPress={() => router.navigate("/menu")}
              style={({ pressed }) => [styles.menuBanner, pressed && { opacity: 0.94 }]}
            >
              <Image
                source={require("../../../assets/products/groundnut-pack.png")}
                style={styles.menuBannerImage}
                contentFit="contain"
              />
              <View style={styles.menuBannerText}>
                <Text style={styles.menuBannerTitle}>The full Menu</Text>
                <Text style={styles.menuBannerBody}>Every Cnaz Foods snack, with filters and search.</Text>
              </View>
              <Pressable
                accessibilityRole={innerRole}
                accessibilityLabel="Open the full Menu"
                onPress={() => router.navigate("/menu")}
                hitSlop={6}
                style={({ pressed }) => [styles.menuBannerCta, pressed && { opacity: 0.85 }]}
              >
                <ArrowRight size={18} color={colors.brand[600]} weight="Filled" />
              </Pressable>
            </Pressable>

            {/* Featured rail */}
            {featured.length > 0 ? (
              <View style={styles.featuredBlock}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Featured snacks</Text>
                  <Pressable accessibilityRole="link" onPress={() => router.navigate("/menu")} hitSlop={6}>
                    <Text style={styles.seeAll}>See all</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredRail}
                >
                  {featured.map((product) => (
                    <FeaturedCard
                      key={product.id}
                      product={product}
                      onPress={() => router.push(`/product/${product.slug}`)}
                      onAdd={() => addLine(product, 1)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Snack-type sections from real data */}
            {sections.map(([type, products]) => (
              <View key={type} style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>{type}</Text>
                  <Pressable accessibilityRole="link" onPress={() => router.navigate("/menu")} hitSlop={6}>
                    <Text style={styles.seeAll}>See all</Text>
                  </Pressable>
                </View>
                <View style={styles.grid}>
                  {products.slice(0, 2).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      width={cardWidth}
                      onPress={() => router.push(`/product/${product.slug}`)}
                      onAdd={() => addLine(product, 1)}
                    />
                  ))}
                </View>
              </View>
            ))}

            {data.products.length === 0 && status === "idle" ? (
              <EmptyState
                kind="snacks"
                title="No snacks yet"
                message="The menu is being stocked. Pull down to refresh."
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Mirrors the website's snackTypeOf() so mobile groups match the site. */
function snackTypeOf(name: string): string {
  const value = name.toLowerCase();
  if (value.includes("chip")) return "Chips";
  if (/\b(nut|nuts|peanut|groundnut|cashew|almond)/.test(value)) return "Nuts";
  return "Other";
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: 130,
    paddingTop: 4,
  },
  spinner: {
    marginTop: 48,
  },
  featuredBlock: {
    marginBottom: 24,
  },
  featuredRail: {
    paddingHorizontal: 20,
    gap: 12,
  },
  section: {
    marginBottom: 26,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 17.5,
    color: colors.ink[900],
  },
  seeAll: {
    fontSize: 13.5,
    fontFamily: fonts.bodySemiBold,
    color: colors.brand[700],
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
  },
  gridItem: {
    width: "47%",
  },
  menuBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brand[600],
    borderRadius: radius.lg,
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    gap: 14,
  },
  menuBannerImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  menuBannerText: {
    flex: 1,
  },
  menuBannerTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.white,
  },
  menuBannerBody: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 17,
    color: "rgba(255,255,255,0.85)",
  },
  menuBannerCta: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
