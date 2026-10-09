import { Image } from "expo-image";
import type { ImageStyle, StyleProp } from "react-native";

import { getRecipeImageUri } from "@/lib/images";

export function RecipePhoto({
  image,
  label,
  style,
}: {
  image: string;
  label: string;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={{ uri: getRecipeImageUri(image) }}
      style={style}
      contentFit="cover"
      transition={180}
      cachePolicy="disk"
      accessibilityLabel={`${label}照片`}
    />
  );
}
