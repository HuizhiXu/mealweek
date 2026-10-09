import { Image } from "expo-image";
import { Text, View } from "react-native";

import { brand } from "@/constants/brand";

export function BrandHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Image source={require("@/assets/images/icon.png")} style={{ width: 43, height: 43, borderRadius: 14 }} contentFit="cover" />
        <View style={{ flex: 1 }}>
          {!!eyebrow && <Text style={{ color: brand.orange, fontSize: 11, fontWeight: "700", letterSpacing: 1.4 }}>{eyebrow}</Text>}
          <Text style={{ color: brand.ink, fontFamily: "MaShanZheng", fontSize: 26, lineHeight: 34 }}>{title}</Text>
          {!!subtitle && <Text style={{ color: brand.muted, fontSize: 12, marginTop: 1 }}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}
