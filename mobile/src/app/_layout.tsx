/**
 * Root layout — boots the app, keeps the native splash visible until the
 * shared backend is resolved and fonts are ready, then hands over to the
 * gate screen (app/index.tsx) which routes to onboarding / sign-in / tabs.
 */
import { Sora_600SemiBold, Sora_700Bold, useFonts } from "@expo-google-fonts/sora";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { createContext, useContext, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import type { BackendConfig } from "@/lib/env";
import { loadCatalogCache, resolveBackend } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import BootErrorScreen from "@/components/boot-error-screen";

// Keep the native splash up while we resolve the shared backend + fonts.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

type BootState =
  | { status: "loading" }
  | { status: "ready"; backend: BackendConfig }
  | { status: "failed" };

const BootContext = createContext<{ retry: () => void } | null>(null);

export function useBootRetry(): () => void {
  const context = useContext(BootContext);
  return context?.retry ?? (() => undefined);
}

export default function RootLayout() {
  const [boot, setBoot] = useState<BootState>({ status: "loading" });
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const run = () => {
    setBoot({ status: "loading" });
    void (async () => {
      try {
        await loadCatalogCache();
        const backend = await resolveBackend();
        if (backend) {
          setBoot({ status: "ready", backend });
        } else {
          setBoot({ status: "failed" });
        }
      } catch {
        setBoot({ status: "failed" });
      }
    })();
  };

  useEffect(run, []);

  useEffect(() => {
    if (boot.status !== "loading" && fontsLoaded) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [boot, fontsLoaded]);

  const ready = boot.status === "ready" && fontsLoaded;

  return (
    <BootContext.Provider value={{ retry: run }}>
      {ready ? (
        <AuthProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.cream[50] },
                animation: "slide_from_right",
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
              <Stack.Screen name="sign-in" options={{ animation: "fade_from_bottom" }} />
              <Stack.Screen name="sign-up" options={{ animation: "fade_from_bottom" }} />
              <Stack.Screen name="product/[slug]" options={{ headerShown: false }} />
              <Stack.Screen name="checkout" options={{ animation: "slide_from_bottom" }} />
              <Stack.Screen name="order/[id]" options={{ animation: "slide_from_bottom" }} />
              <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
            </Stack>
          </CartProvider>
        </AuthProvider>
      ) : (
        <StatusBar style="dark" />
      )}
      {boot.status === "failed" && fontsLoaded ? <BootErrorScreen /> : null}
    </BootContext.Provider>
  );
}
