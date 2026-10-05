/**
 * Onboarding — a single welcome screen (new users only; completing it is
 * saved locally so it never shows twice). "Get Started" opens Sign In with a
 * push so the back button on "Welcome back" returns here.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui";
import { useAuth } from "@/context/auth-context";
import { colors, fonts } from "@/lib/theme";

const ONBOARDING_KEY = "cnaz-onboarding-complete-v1";

/**
 * The illustration: a white plate of peanuts on the brand-green squircle,
 * two real Cnaz Foods snack packs floating beside it and a dashed accent
 * ring, like a snack board photographed from above.
 */
function SnackBoard() {
  const plateNuts = [
    { emoji: "\u{1F95C}", size: 40, top: 16, left: 28, rot: -18 },
    { emoji: "\u{1F95C}", size: 34, top: 50, left: 72, rot: 14 },
    { emoji: "\u{1F95C}", size: 38, top: 82, left: 26, rot: 32 },
    { emoji: "\u{1F95C}", size: 32, top: 88, left: 76, rot: -26 },
    { emoji: "\u{1F95C}", size: 36, top: 118, left: 50, rot: 8 },
  ];
  return (
    <View style={styles.board}>
      {/* floating real snack packs */}
      <View style={[styles.snackCard, { top: 6, right: 2, transform: [{ rotate: "9deg" }] }]}>
        <Image
          source={require("../../assets/products/plantain-chips-250g.png")}
          style={styles.snackImage}
          contentFit="contain"
        />
      </View>
      <View style={[styles.snackCard, { bottom: 10, left: 0, transform: [{ rotate: "-8deg" }] }]}>
        <Image
          source={require("../../assets/products/groundnut-500g.png")}
          style={styles.snackImage}
          contentFit="contain"
        />
      </View>
      {/* dashed accent ring */}
      <View style={styles.dashRing} />
      {/* the plate */}
      <View style={styles.squircle}>
        <View style={styles.plate}>
          <View style={styles.plateRing} />
          {plateNuts.map((nut, index) => (
            <Text
              key={index}
              style={{
                position: "absolute",
                fontSize: nut.size,
                top: nut.top,
                left: nut.left,
                transform: [{ rotate: `${nut.rot}deg` }],
              }}
            >
              {nut.emoji}
            </Text>
          ))}
        </View>
        {/* a couple of nuts rolled off the plate, playfully */}
        <Text style={[styles.looseNut, { bottom: 30, right: 26, transform: [{ rotate: "24deg" }] }]}>{"\u{1F95C}"}</Text>
        <Text style={[styles.looseNut, { bottom: 62, right: 2, transform: [{ rotate: "-32deg" }], fontSize: 21 }]}>
          {"\u{1F95C}"}
        </Text>
      </View>
      {/* order-placed chip */}
      <View style={styles.statusChip}>
        <View style={styles.statusCheck}>
          <Text style={styles.statusCheckText}>{"\u2713"}</Text>
        </View>
        <Text style={styles.statusText}>Order placed</Text>
      </View>
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const [starting, setStarting] = useState(false);

  async function finish() {
    setStarting(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      // Continue even if the flag could not be saved; the flow still works.
    }
    // Push (not replace) so the back button on Sign In returns here. Users
    // who already have a session jump straight to their dashboard.
    if (user) {
      router.replace("/home");
    } else {
      router.push("/sign-in");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <SnackBoard />

        <Text style={styles.title}>Welcome to Cnaz Foods</Text>
        <Text style={styles.body}>
          Plantain chips, peanuts and groundnut, your favourite snacks, one
          quick order away.
        </Text>

        <Button
          label={starting ? "Opening the shop…" : "Get Started"}
          onPress={() => {
            void finish();
          }}
          busy={starting}
          style={styles.cta}
        />
        <Text style={styles.footnote}>
          Same account as the website. Your cart and orders follow you.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream[50],
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  board: {
    width: 300,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  squircle: {
    width: 236,
    height: 236,
    borderRadius: 52,
    backgroundColor: colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand[900],
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  dashRing: {
    position: "absolute",
    top: 26,
    left: 22,
    width: 84,
    height: 84,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.brand[200],
    borderStyle: "dashed",
  },
  plate: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  plateRing: {
    position: "absolute",
    width: 122,
    height: 122,
    borderRadius: 61,
    borderWidth: 2,
    borderColor: colors.cream[100],
  },
  looseNut: {
    position: "absolute",
    fontSize: 24,
  },
  snackCard: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: 6,
    shadowColor: colors.ink[950],
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  snackImage: {
    width: "100%",
    height: "100%",
  },
  statusChip: {
    position: "absolute",
    bottom: 26,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: colors.ink[950],
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statusCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
  },
  statusCheckText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    lineHeight: 13,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.ink[800],
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 25,
    color: colors.ink[900],
    textAlign: "center",
  },
  body: {
    marginTop: 12,
    marginBottom: 30,
    fontSize: 15,
    lineHeight: 23,
    color: colors.ink[600],
    textAlign: "center",
  },
  cta: {
    width: "100%",
  },
  footnote: {
    marginTop: 16,
    fontSize: 12.5,
    color: colors.ink[500],
    textAlign: "center",
  },
});
