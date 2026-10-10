import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { brand } from "@/constants/brand";
import { CloudSyncBar } from "./cloud-sync-bar";
import { useCloudAccount } from "./cloud-account-provider";
import { useMealPlanner } from "./meal-planner-provider";

export function AppFrame({ children }: { children: ReactNode }) {
  const { ready: accountReady } = useCloudAccount();
  const { ready, syncStatus, syncMessage, sync } = useMealPlanner();
  return (
    <View style={{ flex: 1, width: "100%", backgroundColor: "#F1E9DC" }}>
      <SafeAreaView
        edges={["top"]}
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 540,
          alignSelf: "center",
          backgroundColor: brand.paper,
          overflow: "hidden",
        }}
      >
        <CloudSyncBar />
        {ready && accountReady ? children : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
            {syncStatus !== "error" && <ActivityIndicator color={brand.orange} />}
            <Text style={{ color: brand.muted }}>{syncMessage || "正在打开你的手账…"}</Text>
            {syncStatus === "error" && <Pressable accessibilityRole="button" onPress={() => { void sync(); }}>
              <Text style={{ color: brand.orange }}>重试读取</Text>
            </Pressable>}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
