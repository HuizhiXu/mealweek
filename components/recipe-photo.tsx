import { Image } from "expo-image";
import { useState } from "react";
import { Text, View, type ImageStyle, type StyleProp } from "react-native";

import { getRecipeImageUri } from "@/lib/images";

export function RecipePhoto({ image, label, style }: {
  image: string;
  label: string;
  style?: StyleProp<ImageStyle>;
}) {
  const uri = getRecipeImageUri(image);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  if (failedUri === uri) {
    return (
      <View style={[style, { alignItems: "center", justifyContent: "center", padding: 8 }]} accessibilityLabel={`${label}（暂无照片）`}>
        <Text style={{ fontSize: 26 }}>🍽️</Text>
        <Text numberOfLines={2} style={{ fontSize: 11, textAlign: "center", color: "#70685e", marginTop: 4 }}>{label}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit="cover"
      transition={180}
      cachePolicy="disk"
      onError={() => setFailedUri(uri)}
      accessibilityLabel={`${label}照片`}
    />
  );
}
