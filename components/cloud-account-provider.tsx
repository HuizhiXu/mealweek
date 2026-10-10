import { type Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState, Linking, Platform } from "react-native";

import { cloudConfigured, getSupabase } from "@/lib/supabase";

type CloudAccount = {
  session: Session | null; ready: boolean; configured: boolean;
  recovery: boolean; finishRecovery: () => void; authError: string;
};
const Context = createContext<CloudAccount | null>(null);

export function CloudAccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!cloudConfigured);
  const [recovery, setRecovery] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    let active = true;
    let authEventSeen = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      authEventSeen = true;
      if (!active) return;
      setSession(next);
      setReady(true);
      setAuthError("");
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
    });
    void client.auth.getSession().then(({ data, error }) => {
      if (!active || authEventSeen) return;
      setSession(data.session);
      setReady(true);
      if (error) setAuthError("无法恢复登录，请重新登录。");
    }).catch(() => {
      if (!active) return;
      setReady(true);
      setAuthError("无法恢复登录，请重新登录。");
    });

    const refresh = AppState.addEventListener("change", (state) => {
      if (Platform.OS !== "web") {
        if (state === "active") client.auth.startAutoRefresh();
        else client.auth.stopAutoRefresh();
      }
    });
    if (Platform.OS !== "web" && AppState.currentState === "active") client.auth.startAutoRefresh();
    // Native confirmation/recovery links carry an implicit session in the hash.
    const handleLink = async (link: string) => {
      if (Platform.OS === "web") return;
      try {
        const params = new URLSearchParams(link.split("#")[1] ?? "");
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await client.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          if (active && params.get("type") === "recovery") setRecovery(true);
        }
      } catch {
        if (active) setAuthError("登录链接已失效，请重新申请。");
      }
    };
    const links = Linking.addEventListener("url", ({ url }) => { void handleLink(url); });
    void Linking.getInitialURL().then((link) => { if (link) void handleLink(link); });
    return () => {
      active = false;
      subscription.unsubscribe();
      refresh.remove();
      links.remove();
      if (Platform.OS !== "web") client.auth.stopAutoRefresh();
    };
  }, []);

  return <Context.Provider value={{
    session, ready, configured: cloudConfigured, recovery,
    finishRecovery: () => setRecovery(false), authError,
  }}>{children}</Context.Provider>;
}

export function useCloudAccount() {
  const value = useContext(Context);
  if (!value) throw new Error("CloudAccountProvider is required");
  return value;
}
