import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { brand } from "@/constants/brand";
import type { MealType, Recipe } from "@/lib/recipes";
import { MEAL_LABELS } from "@/lib/recipes";
import { RecipePhoto } from "@/components/recipe-photo";

export type SlotBounds = { meal: MealType; x: number; y: number; width: number; height: number };

export function MealSlot({
  meal,
  recipe,
  highlighted,
  onPress,
  onRemove,
  onBounds,
}: {
  meal: MealType;
  recipe?: Recipe;
  highlighted: boolean;
  onPress: () => void;
  onRemove: () => void;
  onBounds: (bounds: SlotBounds) => void;
}) {
  const ref = useRef<View>(null);
  const measure = useCallback(() => {
    requestAnimationFrame(() => {
      ref.current?.measureInWindow?.((x, y, width, height) => onBounds({ meal, x, y, width, height }));
    });
  }, [meal, onBounds]);

  return (
    <View
      ref={ref}
      onLayout={measure}
      style={{
        minHeight: 91,
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        padding: 10,
        borderRadius: 20,
        backgroundColor: highlighted ? "#FBE8D9" : brand.card,
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted ? brand.orange : brand.line,
        shadowColor: brand.shadow,
        shadowOpacity: recipe ? 0.035 : 0,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: recipe ? 1 : 0,
      }}
    >
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${MEAL_LABELS[meal]}餐格${recipe ? `：${recipe.name}` : "，添加菜谱"}`} style={{ flex: 1, minHeight: 66, flexDirection: "row", alignItems: "center", gap: 11 }}>
        {recipe ? (
          <RecipePhoto image={recipe.image} label={recipe.name} style={{ width: 66, height: 66, borderRadius: 15, backgroundColor: brand.paperDeep }} />
        ) : (
          <View style={{ width: 50, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: brand.orangeSoft }}>
            <Ionicons name="add" size={24} color={brand.orange} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Text style={{ color: brand.ink, fontSize: 14, fontWeight: "700" }}>{MEAL_LABELS[meal]}</Text>
            {!recipe && <Text style={{ color: brand.muted, fontSize: 10 }}>拖一道菜来这里</Text>}
          </View>
          <Text numberOfLines={2} style={{ color: recipe ? brand.ink : brand.muted, fontSize: recipe ? 13 : 12, fontWeight: recipe ? "600" : "400", marginTop: 5, lineHeight: 18 }}>
            {recipe ? recipe.name : "从下方菜谱托盘添加"}
          </Text>
          {!!recipe && <Text style={{ color: brand.muted, fontSize: 10, marginTop: 3 }}>{recipe.time} 分钟 · {recipe.ingredients.length} 种食材</Text>}
        </View>
      </Pressable>
      {recipe ? (
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`移除${MEAL_LABELS[meal]}的${recipe.name}`} hitSlop={8} style={{ width: 34, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="close-circle-outline" size={21} color={brand.muted} />
        </Pressable>
      ) : (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`选择${MEAL_LABELS[meal]}菜谱`} style={{ width: 35, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-forward" size={18} color={brand.muted} />
        </Pressable>
      )}
    </View>
  );
}
