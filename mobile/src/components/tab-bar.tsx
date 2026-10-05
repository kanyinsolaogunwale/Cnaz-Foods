/**
 * Cnaz Foods bottom navigation — a flat white bar. The active tab uses the
 * filled icon in the primary green with a bold green label; inactive tabs
 * stay outline and grey. No pill or shadow behind the icons. Rendered by
 * expo-router's <Tabs> so state, focus and deep links stay correct.
 */
import { Home, MenuBoard, ShoppingCart, User } from "reicon-react-native";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "@/context/cart-context";
import { colors, fonts } from "@/lib/theme";

const TABS: { key: string; label: string; Icon: typeof Home }[] = [
  { key: "home", label: "Home", Icon: Home },
  { key: "menu", label: "Menu", Icon: MenuBoard },
  { key: "cart", label: "Cart", Icon: ShoppingCart },
  { key: "account", label: "Account", Icon: User },
];

export function CnazTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCart();
  const insets = useSafeAreaInsets();

  const activeKey =
    TABS.find((tab) => pathname === `/${tab.key}` || pathname.startsWith(`/${tab.key}/`))?.key ?? "home";

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label}${tab.key === "cart" && count > 0 ? `, ${count} items` : ""}`}
              onPress={() => {
                if (!isActive) router.navigate(`/${tab.key}` as never);
              }}
              style={styles.tab}
              hitSlop={4}
            >
              <View style={styles.iconWrap}>
                <tab.Icon
                  size={23}
                  color={isActive ? colors.brand[600] : colors.ink[500]}
                  weight={isActive ? "Filled" : "Outline"}
                />
                {tab.key === "cart" && count > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  iconWrap: {
    width: 46,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -7,
    right: 2,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: colors.accent.DEFAULT,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    color: colors.ink[500],
  },
  labelActive: {
    color: colors.brand[600],
    fontFamily: fonts.bodySemiBold,
  },
});
