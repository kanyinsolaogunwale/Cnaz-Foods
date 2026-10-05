/**
 * Shown when the shared backend (the website) can't be reached at boot —
 * e.g. the dev server is off, the URL is wrong, or the phone is offline.
 * Offers a retry instead of a dead end.
 */
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useBootRetry } from "@/app/_layout";
import { colors, fonts, radius, shadowLift } from "@/lib/theme";

export default function BootErrorScreen() {
  const retry = useBootRetry();
  return (
    <View style={styles.overlay}>
      <View style={[styles.card, shadowLift]}>
        <Image
          source={require("../../assets/splash-icon.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.title}>Can't reach Cnaz Foods</Text>
        <Text style={styles.message}>
          Check that the website dev server is running and that your phone and
          computer are on the same Wi-Fi, then try again.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.buttonLabel}>Try again</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.cream[50],
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: "center",
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  title: {
    marginTop: 16,
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.ink[900],
  },
  message: {
    marginTop: 8,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.ink[600],
    textAlign: "center",
  },
  button: {
    marginTop: 20,
    backgroundColor: colors.brand[600],
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    color: colors.white,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
  },
});
