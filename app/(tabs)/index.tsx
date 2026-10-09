import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { AppFrame } from "@/components/app-frame";
import { BrandHeader } from "@/components/brand-header";
import { MealSlot } from "@/components/meal-slot";
import type { SlotBounds } from "@/components/meal-slot";
import { DraggableRecipeCard, RecipeLibraryCard } from "@/components/recipe-card";
import { brand } from "@/constants/brand";
import { formatWeekRange } from "@/lib/dates";
import { findMealDropTarget } from "@/lib/meal-drop-target";
import { MEAL_LABELS, RECIPES } from "@/lib/recipes";
import type { MealType } from "@/lib/recipes";
import { useMealPlanner } from "@/components/meal-planner-provider";

const MEALS: MealType[] = ["breakfast", "lunch", "dinner"];
type MeasuredSlotBounds = SlotBounds & { scrollY: number };

function haptic() {
  if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => undefined);
}

export default function PlannerScreen() {
  const {
    ready,
    plan,
    weekOffset,
    selectedDate,
    weekDates,
    setSelectedDate,
    shiftWeek,
    assignRecipe,
    removeRecipe,
  } = useMealPlanner();
  const [slotBounds, setSlotBounds] = useState<Partial<Record<MealType, MeasuredSlotBounds>>>({});
  const currentScrollY = useRef(0);
  const [hoveredMeal, setHoveredMeal] = useState<MealType | null>(null);
  const [pickerMeal, setPickerMeal] = useState<MealType>("breakfast");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [quickRecipeId, setQuickRecipeId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const dayPlan = plan[selectedDate] ?? {};
  const mealsPlanned = weekDates.reduce((count, day) => count + Object.keys(plan[day.key] ?? {}).length, 0);
  const dateLabel = weekDates.find((day) => day.key === selectedDate)?.weekday ?? "今天";
  const quickRecipe = useMemo(() => RECIPES.find((recipe) => recipe.id === quickRecipeId), [quickRecipeId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 1900);
    return () => clearTimeout(timer);
  }, [notice]);

  const registerBounds = useCallback((bounds: SlotBounds) => {
    setSlotBounds((current) => ({ ...current, [bounds.meal]: { ...bounds, scrollY: currentScrollY.current } }));
  }, []);

  const resolveTarget = useCallback((x: number, y: number) => {
    return findMealDropTarget(slotBounds, x, y, currentScrollY.current);
  }, [slotBounds]);

  const handleDragMove = useCallback((_recipeId: string, x: number, y: number) => {
    const target = resolveTarget(x, y);
    const nextMeal = target?.meal ?? null;
    setHoveredMeal((current) => current === nextMeal ? current : nextMeal);
  }, [resolveTarget]);

  const showPicker = (meal: MealType) => {
    setQuickRecipeId(null);
    setPickerMeal(meal);
    setPickerVisible(true);
  };

  const handleDrop = useCallback((recipeId: string, x: number, y: number) => {
    setHoveredMeal(null);
    const target = resolveTarget(x, y);
    if (!target) {
      setNotice("把菜谱拖到上方早餐、午餐或晚餐餐格");
      return;
    }
    assignRecipe(selectedDate, target.meal, recipeId);
    haptic();
    setNotice(`已放入${MEAL_LABELS[target.meal]}`);
  }, [resolveTarget, selectedDate, assignRecipe]);

  const trackScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    currentScrollY.current = event.nativeEvent.contentOffset?.y ?? 0;
  }, []);

  const handleQuickAssign = (meal: MealType) => {
    if (!quickRecipe) return;
    assignRecipe(selectedDate, meal, quickRecipe.id);
    setPickerVisible(false);
    setQuickRecipeId(null);
    haptic();
    setNotice(`已放入${MEAL_LABELS[meal]}`);
  };

  const handleSelectRecipe = (recipeId: string) => {
    assignRecipe(selectedDate, pickerMeal, recipeId);
    setPickerVisible(false);
    haptic();
    setNotice(`已为${dateLabel}${MEAL_LABELS[pickerMeal]}安排菜谱`);
  };

  return (
    <AppFrame>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false} onScroll={trackScroll} scrollEventThrottle={16}>
        <BrandHeader eyebrow="本周餐桌" title="一周好食" subtitle="把这一周，吃得刚刚好" />

        <View style={{ marginTop: 19, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: brand.ink, fontSize: 17, fontWeight: "700" }}>{formatWeekRange(weekOffset)}</Text>
            <Text style={{ color: brand.muted, fontSize: 11, marginTop: 3 }}>已安排 {mealsPlanned} 餐 · 还可以慢慢添</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="上一周" onPress={() => shiftWeek(-1)} style={styles.weekButton}>
              <Ionicons name="chevron-back" size={17} color={brand.ink} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="下一周" onPress={() => shiftWeek(1)} style={styles.weekButton}>
              <Ionicons name="chevron-forward" size={17} color={brand.ink} />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 13 }}>
          {weekDates.map((day) => {
            const selected = selectedDate === day.key;
            const count = Object.keys(plan[day.key] ?? {}).length;
            return (
              <Pressable
                key={day.key}
                onPress={() => setSelectedDate(day.key)}
                accessibilityRole="button"
                accessibilityLabel={`${day.weekday}${day.day}日${selected ? "，当前选择" : ""}`}
                style={{ width: 47, height: 63, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: selected ? brand.orange : brand.card, borderWidth: 1, borderColor: selected ? brand.orange : brand.line }}
              >
                <Text style={{ color: selected ? brand.white : brand.muted, fontSize: 10, fontWeight: "600" }}>{day.weekday}</Text>
                <Text style={{ color: selected ? brand.white : brand.ink, fontSize: 17, fontWeight: "700", marginTop: 3 }}>{day.day}</Text>
                <View style={{ width: 4, height: 4, borderRadius: 3, marginTop: 2, backgroundColor: count ? selected ? brand.honey : brand.orange : "transparent" }} />
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <Text style={{ color: brand.ink, fontSize: 15, fontWeight: "700" }}>{dateLabel}的三餐</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="hand-left-outline" size={13} color={brand.orange} />
            <Text style={{ color: brand.orange, fontSize: 10, fontWeight: "600" }}>长按下方菜谱，拖进餐格</Text>
          </View>
        </View>

        <View style={{ gap: 9 }}>
          {MEALS.map((meal) => {
            const recipeId = dayPlan[meal];
            const recipe = RECIPES.find((entry) => entry.id === recipeId);
            return (
              <MealSlot
                key={meal}
                meal={meal}
                recipe={recipe}
                highlighted={hoveredMeal === meal}
                onPress={() => showPicker(meal)}
                onRemove={() => {
                  removeRecipe(selectedDate, meal);
                  setNotice(`已移除${MEAL_LABELS[meal]}`);
                }}
                onBounds={registerBounds}
              />
            );
          })}
        </View>

        <View style={{ marginTop: 21, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: brand.ink, fontSize: 15, fontWeight: "700" }}>从菜谱库挑一道</Text>
            <Text style={{ color: brand.muted, fontSize: 10, marginTop: 3 }}>按住照片卡，往上拖到对应餐格</Text>
          </View>
          <View style={{ backgroundColor: brand.honey, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }}>
            <Text style={{ color: brand.ink, fontSize: 10, fontWeight: "700" }}>{RECIPES.length} 道家常菜</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingBottom: 8, paddingRight: 4 }}>
          {RECIPES.map((recipe) => (
            <DraggableRecipeCard
              key={recipe.id}
              recipe={recipe}
              onDrop={handleDrop}
              onDragMove={handleDragMove}
              onPress={() => {
                setQuickRecipeId(recipe.id);
                setPickerVisible(true);
              }}
            />
          ))}
        </ScrollView>

        {!!notice && <View accessibilityLiveRegion="polite" style={styles.notice}><Ionicons name="sparkles-outline" size={15} color={brand.orange} /><Text style={{ flex: 1, color: brand.ink, fontSize: 12, fontWeight: "600" }}>{notice}</Text></View>}
        {!ready && <Text style={{ color: brand.muted, fontSize: 10, marginTop: 5 }}>正在打开你的手账…</Text>}
      </ScrollView>

      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setPickerVisible(false)} accessibilityLabel="关闭选择" />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {quickRecipe ? (
              <>
                <Text style={styles.sheetTitle}>把「{quickRecipe.name}」安排到…</Text>
                <Text style={styles.sheetSubtitle}>{dateLabel} · 轻点餐次即可放入计划</Text>
                <View style={{ gap: 9, marginTop: 16 }}>
                  {MEALS.map((meal) => (
                    <Pressable key={meal} onPress={() => handleQuickAssign(meal)} style={styles.mealChoice}>
                      <View style={styles.mealChoiceIcon}><Ionicons name={meal === "breakfast" ? "sunny-outline" : meal === "lunch" ? "partly-sunny-outline" : "moon-outline"} size={18} color={brand.orange} /></View>
                      <Text style={{ flex: 1, color: brand.ink, fontSize: 14, fontWeight: "700" }}>{MEAL_LABELS[meal]}</Text>
                      <Ionicons name="chevron-forward" size={17} color={brand.muted} />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>为{dateLabel}{MEAL_LABELS[pickerMeal]}选一道菜</Text>
                <Text style={styles.sheetSubtitle}>轻点菜谱卡即可加入周计划</Text>
                <ScrollView style={{ maxHeight: 365, marginTop: 12 }} showsVerticalScrollIndicator={false}>
                  {RECIPES.map((recipe) => (
                    <RecipeLibraryCard key={recipe.id} recipe={recipe} onPress={() => handleSelectRecipe(recipe.id)} />
                  ))}
                </ScrollView>
              </>
            )}
            <Pressable onPress={() => setPickerVisible(false)} style={styles.cancelButton}><Text style={{ color: brand.muted, fontSize: 13, fontWeight: "600" }}>先不选</Text></Pressable>
          </View>
        </View>
      </Modal>
    </AppFrame>
  );
}

const styles = {
  weekButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: brand.card, borderWidth: 1, borderColor: brand.line, alignItems: "center" as const, justifyContent: "center" as const },
  notice: { position: "absolute" as const, left: 20, right: 20, bottom: 15, minHeight: 43, flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingHorizontal: 13, borderRadius: 15, backgroundColor: "#FFFDF8", borderWidth: 1, borderColor: brand.line, shadowColor: brand.shadow, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" as const, backgroundColor: "rgba(45,34,28,0.28)" },
  sheet: { maxHeight: "84%" as const, paddingHorizontal: 18, paddingTop: 11, paddingBottom: 22, borderTopLeftRadius: 25, borderTopRightRadius: 25, backgroundColor: brand.paper },
  sheetHandle: { alignSelf: "center" as const, width: 39, height: 4, borderRadius: 4, backgroundColor: brand.line, marginBottom: 15 },
  sheetTitle: { color: brand.ink, fontSize: 18, fontWeight: "700" as const },
  sheetSubtitle: { color: brand.muted, fontSize: 11, marginTop: 4 },
  mealChoice: { minHeight: 58, flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingHorizontal: 12, borderRadius: 17, backgroundColor: brand.card, borderWidth: 1, borderColor: brand.line },
  mealChoiceIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: brand.orangeSoft, alignItems: "center" as const, justifyContent: "center" as const },
  cancelButton: { alignItems: "center" as const, justifyContent: "center" as const, minHeight: 45, marginTop: 6 },
};
