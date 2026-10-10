import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { brand } from "@/constants/brand";
import { useCloudAccount } from "./cloud-account-provider";
import { useMealPlanner } from "./meal-planner-provider";

const labels = {
  loading: "正在读取记录…", local: "仅保存在本机", syncing: "正在同步…",
  synced: "已同步到云端", pending: "等待同步", error: "同步失败", conflict: "修改有冲突",
} as const;

export function CloudSyncBar() {
  const { session, configured } = useCloudAccount();
  const { syncStatus, syncMessage, sync, pendingCount } = useMealPlanner();
  const trouble = syncStatus === "error" || syncStatus === "conflict";
  return (
    <View style={{
      paddingHorizontal: 18, paddingVertical: 8, borderBottomWidth: 1,
      borderBottomColor: brand.line, backgroundColor: trouble ? brand.orangeSoft : brand.paperDeep,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ color: trouble ? brand.orange : brand.muted, fontSize: 11, flex: 1 }}>
          {labels[syncStatus]}{session && pendingCount > 0 ? ` · ${pendingCount} 条修改` : ""}
        </Text>
        {session && syncStatus === "error" && (
          <Pressable accessibilityRole="button" onPress={() => { void sync(); }}>
            <Text style={{ color: brand.orange, fontSize: 12 }}>重试</Text>
          </Pressable>
        )}
        <Link href="/account" style={{ color: brand.orange, fontSize: 12 }}>
          {session ? "我的账号" : configured ? "登录并同步" : "云同步设置"}
        </Link>
      </View>
      {trouble && !!syncMessage && <Text style={{ color: brand.ink, fontSize: 11, marginTop: 5 }}>{syncMessage}</Text>}
    </View>
  );
}
