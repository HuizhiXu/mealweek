import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
// Only browser-safe publishable keys are accepted. Never use a secret or service_role key.
export const cloudConfigured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)
  && key.startsWith("sb_publishable_");
export const cloudStorageScope = cloudConfigured ? new URL(url).hostname : "unconfigured";
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!cloudConfigured) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        storageKey: `@yizhouhaoshi/auth:${cloudStorageScope}`,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === "web",
      },
      global: {
        fetch: (input, init) => {
          const controller = new AbortController();
          const abort = () => controller.abort();
          init?.signal?.addEventListener("abort", abort, { once: true });
          if (init?.signal?.aborted) controller.abort();
          const timeout = setTimeout(abort, 15000);
          return fetch(input, { ...init, signal: controller.signal }).finally(() => {
            clearTimeout(timeout);
            init?.signal?.removeEventListener("abort", abort);
          });
        },
      },
    });
  }
  return client;
}
