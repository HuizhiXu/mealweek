import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

import { AppFrame } from "@/components/app-frame";
import { BrandHeader } from "@/components/brand-header";
import { useMealPlanner } from "@/components/meal-planner-provider";
import { brand } from "@/constants/brand";
import { formatWeekRange } from "@/lib/dates";
import { buildShoppingList, formatQuantity, getShoppingCheckId } from "@/lib/shopping-list";
import type { ShoppingItem } from "@/lib/shopping-list";

const AISLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  蔬果: "leaf-outline",
  肉类海鲜: "fish-outline",
  乳品蛋: "nutrition-outline",
  主食干货: "basket-outline",
  冷冻: "snow-outline",
  调味品: "flask-outline",
};

export default function ShoppingScreen() {
  const { plan, checked, toggleChecked, weekOffset, weekDates } = useMealPlanner();
  const router = useRouter();
  const weekKey = weekDates[0]?.key ?? "current-week";
  const checkKey = (itemId: string) => getShoppingCheckId(weekKey, itemId);
  const items = useMemo(() => buildShoppingList(plan, weekDates.map((day) => day.key)), [plan, weekDates]);
  const checkedCount = items.filter((item) => checked[checkKey(item.id)]).length;
  const grouped = useMemo(() => {
    const result = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const list = result.get(item.aisle) ?? [];
      list.push(item);
      result.set(item.aisle, list);
    }
    return [...result.entries()];
  }, [items]);
  const progress = items.length ? Math.round((checkedCount / items.length) * 100) : 0;

  const toggle = (itemId: string) => {
    toggleChecked(checkKey(itemId));
    if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => undefined);
  };

  return (
    <AppFrame>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <BrandHeader eyebrow="逛到哪，勾到哪" title="购物清单" subtitle="从本周餐桌自动理好" />

        <View style={{ marginTop: 18, padding: 15, borderRadius: 20, backgroundColor: brand.orange, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -13, top: -27, width: 118, height: 118, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.10)" }} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: "#FFF1E8", fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>本周采买</Text>
              <Text style={{ color: brand.white, fontSize: 14, fontWeight: "700", marginTop: 4 }}>{formatWeekRange(weekOffset)}</Text>
            </View>
            <View style={{ width: 46, height: 46, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" }}>
              <Ionicons name="basket-outline" size={23} color={brand.white} />
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 13 }}>
            <Text style={{ color: brand.white, fontSize: 28, fontWeight: "800" }}>{checkedCount}</Text>
            <Text style={{ color: "#FFF1E8", fontSize: 12 }}> / {items.length} 项已放进购物袋</Text>
            <Text style={{ color: "#FFF1E8", fontSize: 11, marginLeft: "auto" }}>{progress}%</Text>
          </View>
          <View style={{ height: 5, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.28)", marginTop: 8, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${progress}%`, borderRadius: 4, backgroundColor: brand.honey }} />
          </View>
        </View>

        <View style={{ marginTop: 17, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Ionicons name="sparkles-outline" size={16} color={brand.orange} />
          <Text style={{ color: brand.ink, fontSize: 13, fontWeight: "700" }}>按超市通道排好 · 重复食材已合并</Text>
        </View>

        {!items.length ? (
          <View style={{ alignItems: "center", paddingTop: 34, paddingBottom: 30, paddingHorizontal: 20, borderRadius: 22, backgroundColor: brand.card, borderWidth: 1, borderColor: brand.line }}>
            <View style={{ width: 64, height: 64, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: brand.honey }}><Ionicons name="basket-outline" size={28} color={brand.ink} /></View>
            <Text style={{ color: brand.ink, fontSize: 16, fontWeight: "700", marginTop: 13 }}>先安排几餐，再来逛超市</Text>
            <Text style={{ color: brand.muted, fontSize: 12, lineHeight: 19, textAlign: "center", marginTop: 6 }}>把菜谱放进周计划，食材会自动汇总到这里。</Text>
            <Pressable onPress={() => router.navigate("/")} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 5, marginTop: 15, paddingHorizontal: 13, borderRadius: 999, backgroundColor: brand.orangeSoft }}><Ionicons name="arrow-back" size={14} color={brand.orange} /><Text style={{ color: brand.orange, fontSize: 11, fontWeight: "700" }}>去「周计划」挑几道菜</Text></Pressable>
          </View>
        ) : grouped.map(([aisle, aisleItems]) => {
          const aisleDone = aisleItems.filter((item) => checked[checkKey(item.id)]).length;
          return (
            <View key={aisle} style={{ marginBottom: 13, borderRadius: 19, backgroundColor: brand.card, borderWidth: 1, borderColor: brand.line, overflow: "hidden" }}>
              <View style={{ minHeight: 43, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, backgroundColor: brand.paperDeep }}>
                <Ionicons name={AISLE_ICONS[aisle] ?? "basket-outline"} size={16} color={brand.sage} />
                <Text style={{ flex: 1, color: brand.ink, fontSize: 12, fontWeight: "700" }}>{aisle}</Text>
                <Text style={{ color: brand.muted, fontSize: 10 }}>{aisleDone}/{aisleItems.length}</Text>
              </View>
              {aisleItems.map((item, index) => {
                const done = !!checked[checkKey(item.id)];
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggle(item.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done }}
                    accessibilityLabel={`${item.name}，${formatQuantity(item)}${done ? "，已购买" : "，未购买"}`}
                    style={{ minHeight: 53, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 13, borderTopWidth: index ? 1 : 0, borderTopColor: brand.paperDeep }}
                  >
                    <View style={{ width: 25, height: 25, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: done ? brand.sage : brand.white, borderWidth: done ? 0 : 1.5, borderColor: brand.line }}>
                      {done && <Ionicons name="checkmark" size={16} color={brand.white} />}
                    </View>
                    <Text style={{ flex: 1, color: done ? brand.muted : brand.ink, fontSize: 13, fontWeight: done ? "400" : "600", textDecorationLine: done ? "line-through" : "none" }}>{item.name}</Text>
                    <Text style={{ color: done ? brand.muted : brand.orange, fontSize: 12, fontWeight: "700" }}>{formatQuantity(item)}</Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        {items.length > 0 && <View style={{ alignItems: "center", paddingTop: 4, paddingBottom: 12 }}><Text style={{ color: brand.muted, fontSize: 10 }}>清单随本周计划自动更新 · 勾选状态保存在本机</Text></View>}
      </ScrollView>
    </AppFrame>
  );
}
