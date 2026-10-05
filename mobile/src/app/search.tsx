/**
 * Search — a dedicated full-screen search (opened from the Home header
 * icon), modelled on the reference designs:
 *   - recent searches saved on the device (AsyncStorage), one tap to rerun
 *   - live results from the SAME /api/products endpoint the website uses
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
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
import { cachedCatalog, loadCatalog, type LoadResult } from "@/lib/catalog";
import { colors, fonts, radius } from "@/lib/theme";
import { ArrowLeft, ArrowUpLeft, CloseCircle, Search } from "reicon-react-native";

const RECENTS_KEY = "cnaz-recent-searches-v1";
const MAX_RECENTS = 8;

async function readRecents(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

async function writeRecents(terms: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(terms));
  } catch {
    // Storage full or unavailable; recents are a nicety, not a requirement.
  }
}

export default function SearchScreen() {
  const router = useRouter();
  const { addLine } = useCart();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.floor((windowWidth - 40 - 12) / 2);

  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [data, setData] = useState<LoadResult>(() => cachedCatalog());
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQuery = useRef("");

  useEffect(() => {
    void readRecents().then(setRecents);
  }, []);

  const rememberQuery = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecents((prev) => {
      const next = [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, MAX_RECENTS);
      void writeRecents(next);
      return next;
    });
  }, []);

  // Debounced live search against the real catalogue.
  useEffect(() => {
    const trimmed = query.trim();
    latestQuery.current = trimmed;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!trimmed) {
      setStatus("idle");
      setErrorMessage(null);
      return;
    }
    searchTimer.current = setTimeout(() => {
      setStatus("loading");
      void loadCatalog({ q: trimmed })
        .then((result) => {
          if (latestQuery.current !== trimmed) return;
          setData(result);
          setStatus("idle");
          setErrorMessage(null);
        })
        .catch((error: unknown) => {
          if (latestQuery.current !== trimmed) return;
          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : "Please try again.");
        });
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  // A submitted search (or an opened result) is remembered on the device.
  function openResult(slug: string) {
    void rememberQuery(query);
    Keyboard.dismiss();
    router.push(`/product/${slug}`);
  }

  const searching = query.trim().length > 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
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
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.ink[500]} />
          <TextInput
            accessibilityLabel="Search snacks"
            placeholder="Search snacks…"
            placeholderTextColor={colors.ink[300]}
            value={query}
            onChangeText={setQuery}
            // Remember a submitted search even when it returned nothing.
            onSubmitEditing={() => void rememberQuery(query)}
            returnKeyType="search"
            autoFocus
            style={styles.searchInput}
          />
          {query.length > 0 ? (
            <Pressable accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={8}>
              <CloseCircle size={18} color={colors.ink[500]} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {searching ? (
        status === "error" ? (
          <ErrorState message={errorMessage ?? ""} onRetry={() => setQuery((q) => q)} />
        ) : status === "loading" && data.products.length === 0 ? (
          <ActivityIndicator style={styles.spinner} color={colors.brand[600]} size="large" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.results}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.resultCount}>
              {status === "loading"
                ? "Searching…"
                : `${data.products.length} result${data.products.length === 1 ? "" : "s"} found`}
            </Text>
            {data.products.length === 0 && status === "idle" ? (
              <EmptyState
                kind="search"
                title={`No snacks match "${query.trim()}"`}
                message="Try a different word, like plantain, peanuts or groundnut."
              />
            ) : (
              <View style={styles.grid}>
                {data.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    width={cardWidth}
                    onPress={() => openResult(product.slug)}
                    onAdd={() => addLine(product, 1)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.recentsWrap} showsVerticalScrollIndicator={false}>
          {recents.length > 0 ? (
            <>
              <View style={styles.recentsHead}>
                <Text style={styles.recentsTitle}>Recent search</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setRecents([]);
                    void writeRecents([]);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.recentsClear}>Clear</Text>
                </Pressable>
              </View>
              {recents.map((term) => (
                <Pressable
                  key={term}
                  accessibilityRole="button"
                  accessibilityLabel={`Search for ${term}`}
                  onPress={() => setQuery(term)}
                  style={({ pressed }) => [styles.recentRow, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.recentTerm} numberOfLines={1}>
                    {term}
                  </Text>
                  <ArrowUpLeft size={18} color={colors.ink[500]} />
                </Pressable>
              ))}
            </>
          ) : (
            <EmptyState
              kind="search"
              title="Search Cnaz Foods"
              message="Find your favourite snacks by name, taste or size. Your recent searches will show up here."
            />
          )}
        </ScrollView>
      )}
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
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink[100],
    alignItems: "center",
    justifyContent: "center",
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
    minHeight: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink[900],
    paddingVertical: 11,
  },
  spinner: {
    marginTop: 48,
  },
  recentsWrap: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  recentsHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  recentsTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13.5,
    color: colors.ink[500],
  },
  recentsClear: {
    fontSize: 13.5,
    fontFamily: fonts.bodySemiBold,
    color: colors.brand[700],
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink[100],
  },
  recentTerm: {
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink[900],
  },
  results: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  resultCount: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.ink[600],
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
