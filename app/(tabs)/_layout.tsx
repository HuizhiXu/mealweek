import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { brand } from "@/constants/brand";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: brand.orange,
        tabBarInactiveTintColor: brand.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: brand.paper,
          borderTopColor: brand.line,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "周计划",
          tabBarIcon: ({ color }) => <Ionicons size={22} name="calendar-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "菜谱库",
          tabBarIcon: ({ color }) => <Ionicons size={22} name="book-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: "购物清单",
          tabBarIcon: ({ color }) => <Ionicons size={22} name="basket-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
