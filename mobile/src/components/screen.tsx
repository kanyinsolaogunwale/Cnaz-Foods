/**
 * Screen chrome — safe-area container and the Home header: a greeting with
 * the signed-in customer's real name plus a search shortcut (the cart lives
 * in the bottom navigation, so the header does not repeat it).
 */
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search } from "reicon-react-native";
import { useAuth } from "@/context/auth-context";
import { colors, fonts } from "@/lib/theme";

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 8, paddingBottom: 120 },
      ]}
    >
      {scroll ? <ScrollView>{children}</ScrollView> : children}
    </View>
  );
}

export function HomeHeader() {
  const router = useRouter();
  const { user } = useAuth();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    (user?.user_metadata?.name as string | undefined)?.split(" ")[0] ??
    null;

  return (
    <View style={styles.header}>
      <Text style={styles.greeting} numberOfLines={1}>
        {firstName ? `Hi ${firstName} \u{1F44B}` : "Welcome \u{1F44B}"}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search snacks"
        onPress={() => router.push("/search")}
        style={styles.searchButton}
        hitSlop={6}
      >
        <Search size={20} color={colors.ink[800]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  greeting: {
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink[900],
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink[100],
    alignItems: "center",
    justifyContent: "center",
  },
});
