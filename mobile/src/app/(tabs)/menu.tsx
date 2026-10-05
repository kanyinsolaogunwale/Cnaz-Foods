/**
 * Menu — the primary browsing destination. Search and filters run against the
 * same /api/products endpoint as the website's shop page: free-text search,
 * snack-type filter (only types that actually exist), price range and price
 * sorting. Ready for future products — nothing is hardcoded.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState, ErrorState } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { useCart } from "@/context/cart-context";
import { cachedCatalog, loadCatalog, type CatalogQuery, type LoadResult } from "@/lib/catalog";
import { formatNaira, type Product } from "@/lib/types";
import { colors, fonts, radius } from "@/lib/theme";
import { CloseCircle, Filter, Search } from "reicon-react-native";

type Filters = {
  type: string | null;
  sort: "featured" | "price-asc" | "price-desc";
  min: string;
  max: string;
};

const DEFAULT_FILTERS: Filters = { type: null, sort: "featured", min: "", max: "" };

export default function Menu() {
  const router = useRouter();
  const { addLine } = useCart();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.floor((windowWidth - 40 - 12) / 2);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [data, setData] = useState<LoadResult>(() => cachedCatalog());
  const [types, setTypes] = useState<{ value: string; count: number }[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFilterCount =
    (filters.type ? 1 : 0) +
    (filters.sort !== "featured" ? 1 : 0) +
    (filters.min ? 1 : 0) +
    (filters.max ? 1 : 0);

  const buildQuery = useCallback(
    (searchText: string, f: Filters): CatalogQuery => ({
      q: searchText.trim() || undefined,
      type: f.type ?? undefined,
      sort: f.sort,
      min: f.min ? Number.parseInt(f.min, 10) : undefined,
      max: f.max ? Number.parseInt(f.max, 10) : undefined,
    }),
    [],
  );

  const run = useCallback(
    async (q: CatalogQuery, mode: "full" | "quiet") => {
      if (mode === "full") setStatus("loading");
      try {
        const result = await loadCatalog(q);
        setData(result);
        setTypes(result.types);
        setStatus("idle");
        setErrorMessage(null);
      } catch (error) {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Please try again.");
      }
    },
    [],
  );

  // First render: cache first, then the unfiltered catalogue (for the chips).
  useEffect(() => {
    void run(buildQuery("", DEFAULT_FILTERS), "quiet");
  }, [run, buildQuery]);

  // Debounced search + filter changes hit the real API.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void run(buildQuery(query, filters), "full");
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, filters, run, buildQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void run(buildQuery(query, filters), "quiet").finally(() => setRefreshing(false));
  }, [run, buildQuery, query, filters]);

  const hasAnyFilter = query.trim().length > 0 || activeFilterCount > 0;
  const filterSummary = useMemo(() => {
    const bits: string[] = [];
    if (filters.type) bits.push(filters.type);
    if (filters.min || filters.max) {
      const min = filters.min ? formatNaira(Number(filters.min)) : "₦0";
      const max = filters.max ? formatNaira(Number(filters.max)) : "any";
      bits.push(`${min} – ${max}`);
    }
    if (filters.sort === "price-asc") bits.push("Price ↑");
    if (filters.sort === "price-desc") bits.push("Price ↓");
    return bits.join(" · ");
  }, [filters]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
      {/* Header + search + filter trigger */}
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        <Text style={styles.subtitle}>Every Cnaz Foods snack</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.ink[500]} />
          <TextInput
            accessibilityLabel="Search the menu"
            placeholder="Search snacks…"
            placeholderTextColor={colors.ink[300]}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query.length > 0 ? (
            <Pressable accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={8}>
              <CloseCircle size={18} color={colors.ink[500]} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
          onPress={() => setSheetOpen(true)}
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
        >
          <Filter size={20} color={activeFilterCount > 0 ? colors.white : colors.ink[700]} />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Type chips: only snack types that exist in the database */}
      {types.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeRow}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => setFilters((prev) => ({ ...prev, type: null }))}
            style={[styles.typeChip, !filters.type && styles.typeChipActive]}
          >
            <Text style={[styles.typeChipText, !filters.type && styles.typeChipTextActive]}>All</Text>
          </Pressable>
          {types.map((type) => (
            <Pressable
              key={type.value}
              accessibilityRole="button"
              onPress={() => setFilters((prev) => ({ ...prev, type: prev.type === type.value ? null : type.value }))}
              style={[styles.typeChip, filters.type === type.value && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, filters.type === type.value && styles.typeChipTextActive]}>
                {type.value} ({type.count})
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {status === "error" ? (
        <ErrorState message={errorMessage ?? ""} onRetry={() => void run(buildQuery(query, filters), "full")} />
      ) : status === "loading" && data.products.length === 0 ? (
        <ActivityIndicator style={styles.spinner} color={colors.brand[600]} size="large" />
      ) : data.products.length === 0 && status === "idle" ? (
        <EmptyState
          kind="search"
          title={hasAnyFilter ? "No snacks match" : "The menu is empty"}
          message={
            hasAnyFilter
              ? "Try a different word, or clear a filter or two."
              : "New snacks will appear here as soon as they're stocked."
          }
          action={
            hasAnyFilter ? (
              <View style={styles.clearWrap}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setQuery("");
                    setFilters(DEFAULT_FILTERS);
                  }}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearLabel}>Clear search & filters</Text>
                </Pressable>
              </View>
            ) : undefined
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.gridWrap}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[600]} />}
        >
          <View style={styles.resultRow}>
            <Text style={styles.resultCount}>
              {status === "loading" ? "Updating…" : `${data.products.length} snack${data.products.length === 1 ? "" : "s"}`}
            </Text>
            {filterSummary ? <Text style={styles.resultFilters}>{filterSummary}</Text> : null}
          </View>
          <View style={styles.grid}>
            {data.products.map((product: Product) => (
              <ProductCard
                key={product.id}
                product={product}
                width={cardWidth}
                onPress={() => router.push(`/product/${product.slug}`)}
                onAdd={() => addLine(product, 1)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Filters bottom sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetBackdropTouch} onPress={() => setSheetOpen(false)} accessibilityLabel="Close filters" />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filters</Text>

            <Text style={styles.sheetLabel}>Sort by</Text>
            <View style={styles.chipRow}>
              {([
                ["featured", "Featured"],
                ["price-asc", "Price: low to high"],
                ["price-desc", "Price: high to low"],
              ] as const).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setFilters((prev) => ({ ...prev, sort: value }))}
                  style={[styles.sheetChip, filters.sort === value && styles.sheetChipActive]}
                >
                  <Text style={[styles.sheetChipText, filters.sort === value && styles.sheetChipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sheetLabel}>Price range (₦)</Text>
            <View style={styles.priceRow}>
              <TextInput
                accessibilityLabel="Minimum price"
                placeholder="Min"
                placeholderTextColor={colors.ink[300]}
                keyboardType="number-pad"
                value={filters.min}
                onChangeText={(value) => setFilters((prev) => ({ ...prev, min: value.replace(/[^0-9]/g, "") }))}
                style={styles.priceInput}
              />
              <Text style={styles.priceDash}>–</Text>
              <TextInput
                accessibilityLabel="Maximum price"
                placeholder="Max"
                placeholderTextColor={colors.ink[300]}
                keyboardType="number-pad"
                value={filters.max}
                onChangeText={(value) => setFilters((prev) => ({ ...prev, max: value.replace(/[^0-9]/g, "") }))}
                style={styles.priceInput}
              />
            </View>

            <View style={styles.sheetActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFilters(DEFAULT_FILTERS)}
                style={styles.sheetReset}
              >
                <Text style={styles.sheetResetLabel}>Reset</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSheetOpen(false)}
                style={styles.sheetDone}
              >
                <Text style={styles.sheetDoneLabel}>Show {data.products.length} snack{data.products.length === 1 ? "" : "s"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
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
  controls: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.ink[100],
    paddingHorizontal: 16,
    minHeight: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink[900],
    paddingVertical: 12,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink[100],
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent.DEFAULT,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 9.5,
    fontFamily: fonts.bodySemiBold,
  },
  typeRow: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 12,
  },
  typeChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.ink[200],
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  typeChipActive: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.ink[700],
  },
  typeChipTextActive: {
    color: colors.white,
  },
  spinner: {
    marginTop: 48,
  },
  gridWrap: {
    paddingBottom: 130,
    paddingHorizontal: 20,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  resultCount: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.ink[600],
  },
  resultFilters: {
    fontSize: 12,
    color: colors.ink[500],
    flexShrink: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  clearWrap: {
    marginTop: 16,
  },
  clearButton: {
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.brand[600],
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  clearLabel: {
    color: colors.brand[700],
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11,15,8,0.45)",
    justifyContent: "flex-end",
  },
  sheetBackdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.ink[200],
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.ink[900],
    marginBottom: 16,
  },
  sheetLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13.5,
    color: colors.ink[800],
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  sheetChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.ink[200],
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sheetChipActive: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  sheetChipText: {
    fontSize: 13.5,
    fontFamily: fonts.bodySemiBold,
    color: colors.ink[700],
  },
  sheetChipTextActive: {
    color: colors.white,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 26,
  },
  priceInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.ink[200],
    backgroundColor: colors.cream[50],
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.ink[900],
  },
  priceDash: {
    color: colors.ink[500],
    fontSize: 16,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
  },
  sheetReset: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.ink[200],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    minHeight: 50,
  },
  sheetResetLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink[700],
  },
  sheetDone: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  sheetDoneLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.white,
  },
});
