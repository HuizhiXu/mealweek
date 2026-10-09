import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { brand } from "@/constants/brand";

export function AppFrame({ children }: { children: ReactNode }) {
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
        {children}
      </SafeAreaView>
    </View>
  );
}
