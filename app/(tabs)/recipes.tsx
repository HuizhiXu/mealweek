import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { AppFrame } from "@/components/app-frame";
import { BrandHeader } from "@/components/brand-header";
import { RecipeLibraryCard } from "@/components/recipe-card";
import { RecipePhoto } from "@/components/recipe-photo";
import { useMealPlanner } from "@/components/meal-planner-provider";
import { brand } from "@/constants/brand";
import { MEAL_LABELS, RECIPES } from "@/lib/recipes";
import type { MealType } from "@/lib/recipes";

const CATEGORIES: { id: "all" | MealType; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "breakfast", label: "早餐" },
  { id: "lunch", label: "午餐" },
  { id: "dinner", label: "晚餐" },
];
const MEALS: MealType[] = ["breakfast", "lunch", "dinner"];

export default function RecipesScreen() {
  const { weekDates, selectedDate, setSelectedDate, assignRecipe } = useMealPlanner();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | MealType>("all");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(selectedDate);
  const [selectedMeal, setSelectedMeal] = useState<MealType>("breakfast");
  const [notice, setNotice] = useState("");

  const selectedRecipe = RECIPES.find((recipe) => recipe.id === selectedRecipeId);
  const filteredRecipes = useMemo(() => RECIPES.filter((recipe) => {
    const matchesCategory = category === "all" || recipe.category === category;
    const searchable = `${recipe.name} ${recipe.subtitle} ${recipe.ingredients.map((item) => item.name).join(" ")}`;
    return matchesCategory && searchable.toLocaleLowerCase("zh-CN").includes(query.trim().toLocaleLowerCase("zh-CN"));
  }), [category, query]);

  const addToPlan = () => {
    if (!selectedRecipe) return;
    assignRecipe(selectedDay, selectedMeal, selectedRecipe.id);
    setSelectedDate(selectedDay);
    setSelectedRecipeId(null);
    setNotice(`「${selectedRecipe.name}」已加入${MEAL_LABELS[selectedMeal]}`);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  return (
    <AppFrame>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 25 }} showsVerticalScrollIndicator={false}>
        <BrandHeader eyebrow="灵感菜谱" title="菜谱库" subtitle="每道菜，都有照片和食材清单" />

        <View style={{ height: 45, marginTop: 19, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13, borderRadius: 15, backgroundColor: brand.card, borderWidth: 1, borderColor: brand.line }}>
          <Ionicons name="search-outline" size={18} color={brand.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜菜名或食材…"
            placeholderTextColor={brand.muted}
            returnKeyType="search"
            style={{ flex: 1, height: 42, color: brand.ink, fontSize: 13 }}
            accessibilityLabel="搜索菜谱或食材"
          />
          {!!query && <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="清空搜索"><Ionicons name="close-circle" size={18} color={brand.muted} /></Pressable>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12, paddingBottom: 13 }}>
          {CATEGORIES.map((item) => {
            const active = category === item.id;
            return (
              <Pressable key={item.id} onPress={() => setCategory(item.id)} style={{ minHeight: 34, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: active ? brand.orange : brand.card, borderWidth: 1, borderColor: active ? brand.orange : brand.line }}>
                <Text style={{ color: active ? brand.white : brand.muted, fontSize: 11, fontWeight: "700" }}>{item.label}</Text>
              </Pressable>
            );
          })}
          <View style={{ justifyContent: "center", paddingHorizontal: 4 }}><Text style={{ color: brand.muted, fontSize: 10 }}>{filteredRecipes.length} 道</Text></View>
        </ScrollView>

        {notice ? <View accessibilityLiveRegion="polite" style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13, backgroundColor: brand.sageSoft, marginBottom: 10 }}><Text style={{ color: brand.sage, fontSize: 12, fontWeight: "600" }}>{notice}</Text></View> : null}
        {filteredRecipes.length ? filteredRecipes.map((recipe) => (
          <RecipeLibraryCard key={recipe.id} recipe={recipe} onPress={() => {
            setSelectedRecipeId(recipe.id);
            setSelectedMeal(recipe.category);
            setSelectedDay(selectedDate);
          }} />
        )) : (
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 55 }}>
            <Ionicons name="search-outline" size={32} color={brand.honey} />
            <Text style={{ color: brand.ink, fontSize: 15, fontWeight: "700", marginTop: 12 }}>没有找到这道菜</Text>
            <Text style={{ color: brand.muted, fontSize: 12, marginTop: 5 }}>试试菜名或食材的另一个写法</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!selectedRecipe} transparent animationType="slide" onRequestClose={() => setSelectedRecipeId(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(45,34,28,0.3)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelectedRecipeId(null)} accessibilityLabel="关闭菜谱详情" />
          {selectedRecipe && (
            <View style={{ maxHeight: "91%", backgroundColor: brand.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12, paddingHorizontal: 18, paddingBottom: 21 }}>
              <View style={{ width: 38, height: 4, borderRadius: 4, backgroundColor: brand.line, alignSelf: "center", marginBottom: 13 }} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <RecipePhoto image={selectedRecipe.image} label={selectedRecipe.name} style={{ width: "100%", height: 206, borderRadius: 19, backgroundColor: brand.paperDeep }} />
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 }}>
                  <Text style={{ flex: 1, color: brand.ink, fontSize: 20, fontWeight: "700" }}>{selectedRecipe.name}</Text>
                  <Pressable onPress={() => setSelectedRecipeId(null)} accessibilityLabel="关闭" style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={22} color={brand.muted} /></Pressable>
                </View>
                <Text style={{ color: brand.muted, fontSize: 12, marginTop: 3 }}>{selectedRecipe.subtitle} · {selectedRecipe.time} 分钟 · {selectedRecipe.servings} 人份</Text>

                <Text style={{ color: brand.ink, fontSize: 15, fontWeight: "700", marginTop: 18, marginBottom: 8 }}>食材清单</Text>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: brand.card, borderWidth: 1, borderColor: brand.line }}>
                  {selectedRecipe.ingredients.map((ingredient, index) => (
                    <View key={ingredient.key} style={{ minHeight: 35, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: index === selectedRecipe.ingredients.length - 1 ? 0 : 1, borderBottomColor: brand.paperDeep }}>
                      <Text style={{ color: brand.ink, fontSize: 12 }}>{ingredient.name}</Text>
                      <Text style={{ color: brand.orange, fontSize: 12, fontWeight: "700" }}>{ingredient.amount} {ingredient.unit}</Text>
                    </View>
                  ))}
                </View>

                <Text style={{ color: brand.ink, fontSize: 15, fontWeight: "700", marginTop: 17, marginBottom: 8 }}>做法</Text>
                {selectedRecipe.steps.map((step, index) => (
                  <View key={step} style={{ flexDirection: "row", gap: 9, marginBottom: 7 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: brand.honey }}><Text style={{ color: brand.ink, fontSize: 11, fontWeight: "700" }}>{index + 1}</Text></View>
                    <Text style={{ flex: 1, color: brand.ink, fontSize: 12, lineHeight: 19, paddingTop: 1 }}>{step}</Text>
                  </View>
                ))}

                <Text style={{ color: brand.ink, fontSize: 15, fontWeight: "700", marginTop: 13 }}>安排在哪一天？</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 11 }}>
                  {weekDates.map((day) => {
                    const active = selectedDay === day.key;
                    return <Pressable key={day.key} onPress={() => setSelectedDay(day.key)} style={{ width: 48, height: 53, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: active ? brand.orange : brand.card, borderWidth: 1, borderColor: active ? brand.orange : brand.line }}><Text style={{ color: active ? brand.white : brand.muted, fontSize: 9 }}>{day.weekday}</Text><Text style={{ color: active ? brand.white : brand.ink, fontSize: 15, fontWeight: "700", marginTop: 2 }}>{day.day}</Text></Pressable>;
                  })}
                </ScrollView>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 13 }}>
                  {MEALS.map((meal) => {
                    const active = selectedMeal === meal;
                    return <Pressable key={meal} onPress={() => setSelectedMeal(meal)} style={{ flex: 1, minHeight: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: active ? brand.orangeSoft : brand.card, borderWidth: 1, borderColor: active ? brand.orange : brand.line }}><Text style={{ color: active ? brand.orange : brand.muted, fontSize: 11, fontWeight: "700" }}>{MEAL_LABELS[meal]}</Text></Pressable>;
                  })}
                </View>
                <Pressable onPress={addToPlan} style={({ pressed }) => ({ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 15, backgroundColor: brand.orange, opacity: pressed ? 0.88 : 1 })}>
                  <Ionicons name="calendar-outline" size={16} color={brand.white} />
                  <Text style={{ color: brand.white, fontSize: 13, fontWeight: "700" }}>加入周计划</Text>
                </Pressable>
                <View style={{ height: 6 }} />
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </AppFrame>
  );
}
