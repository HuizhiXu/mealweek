import Constants from "expo-constants";
import { Platform } from "react-native";

export function getRecipeImageUri(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (Platform.OS === "web") return path;

  // Expo Go needs an absolute URI; use the current platform-provided preview origin,
  // never a persisted or hard-coded sandbox hostname.
  const previewOrigin = Constants.expoConfig?.extra?.webPreviewUrl as string | undefined;
  if (!previewOrigin) return path;
  try {
    return new URL(path, previewOrigin).toString();
  } catch {
    return path;
  }
}
