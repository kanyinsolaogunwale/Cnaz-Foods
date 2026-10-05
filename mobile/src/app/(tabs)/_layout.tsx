/**
 * Main navigation — the four Cnaz Foods destinations (Home, Menu, Cart,
 * Account) rendered through expo-router Tabs with the custom floating
 * CnazTabBar (brand active pill, live cart badge, comfortable targets).
 */
import { Tabs } from "expo-router";
import { CnazTabBar } from "@/components/tab-bar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={() => <CnazTabBar />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="menu" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
