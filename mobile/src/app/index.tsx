/**
 * Splash — bold brand-green screen with the real logo on a white tile, the
 * wordmark and tagline (inspired by the reference designs). Routes after a
 * beat: onboarding for new users, straight Home for returning ones.
 */
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, fonts } from "@/lib/theme";

const ONBOARDING_KEY = "cnaz-onboarding-complete-v1";

export default function Gate() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
          if (!seen) {
            router.replace("/onboarding");
          } else if (user) {
            router.replace("/home");
          } else {
            router.replace("/sign-in");
          }
        } catch {
          router.replace(user ? "/home" : "/sign-in");
        }
      })();
    }, 1000);
    return () => clearTimeout(timer);
  }, [loading, user, router]);

  return (
    <View style={styles.container}>
      {/* soft decorative blobs */}
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />
      <View style={[styles.blob, styles.blobC]} />

      <View style={styles.brandBlock}>
        <View style={styles.logoTile}>
          <Image
            source={require("../../assets/splash-icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
        </View>
        <Text style={styles.name}>Cnaz Foods</Text>
        <Text style={styles.tagline}>Quick bite, endless delight.</Text>
      </View>

      <ActivityIndicator color={colors.brand[100]} style={styles.spinner} />
      <Text style={styles.footer}>Chips & nuts, delivered fresh</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  blobA: {
    width: 260,
    height: 260,
    top: -80,
    right: -70,
  },
  blobB: {
    width: 180,
    height: 180,
    bottom: 90,
    left: -60,
  },
  blobC: {
    width: 120,
    height: 120,
    top: 140,
    left: 36,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  brandBlock: {
    alignItems: "center",
  },
  logoTile: {
    width: 148,
    height: 148,
    borderRadius: 36,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0B0F08",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  logo: {
    width: 122,
    height: 122,
  },
  name: {
    marginTop: 26,
    fontFamily: fonts.displayBold,
    fontSize: 32,
    color: colors.white,
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 8,
    fontSize: 14.5,
    color: colors.brand[100],
  },
  spinner: {
    position: "absolute",
    bottom: 92,
  },
  footer: {
    position: "absolute",
    bottom: 56,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.4,
  },
});
