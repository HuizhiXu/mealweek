import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Pressable, Text, View } from "react-native";
import { useState } from "react";

import { brand } from "@/constants/brand";
import type { Recipe } from "@/lib/recipes";
import { RecipePhoto } from "@/components/recipe-photo";

export function DraggableRecipeCard({
  recipe,
  onDrop,
  onDragMove,
  onPress,
}: {
  recipe: Recipe;
  onDrop: (recipeId: string, x: number, y: number) => void;
  onDragMove: (recipeId: string, x: number, y: number) => void;
  onPress: () => void;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const [dragging, setDragging] = useState(false);

  const drag = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => runOnJS(setDragging)(true))
    .onUpdate((event) => {
      x.value = event.translationX;
      y.value = event.translationY;
      runOnJS(onDragMove)(recipe.id, event.absoluteX, event.absoluteY);
    })
    .onEnd((event) => runOnJS(onDrop)(recipe.id, event.absoluteX, event.absoluteY))
    .onFinalize(() => {
      x.value = withSpring(0, { damping: 18, stiffness: 180 });
      y.value = withSpring(0, { damping: 18, stiffness: 180 });
      runOnJS(setDragging)(false);
    });
  const tap = Gesture.Tap().onEnd(() => runOnJS(onPress)());
  const gesture = Gesture.Exclusive(drag, tap);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: withSpring(dragging ? 1.035 : 1) }],
    zIndex: dragging ? 20 : 1,
    elevation: dragging ? 8 : 0,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width: 132, padding: 7, borderRadius: 18, backgroundColor: brand.card, borderWidth: 1, borderColor: dragging ? brand.orange : brand.line }, animatedStyle]}>
        <RecipePhoto image={recipe.image} label={recipe.name} style={{ width: "100%", height: 82, borderRadius: 13, backgroundColor: brand.paperDeep }} />
        <Text numberOfLines={1} style={{ color: brand.ink, fontSize: 12, fontWeight: "700", marginTop: 7 }}>{recipe.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
          <Ionicons name="time-outline" size={12} color={brand.muted} />
          <Text style={{ color: brand.muted, fontSize: 10 }}>{recipe.time} 分钟 · 长按拖入</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export function RecipeLibraryCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`查看${recipe.name}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        padding: 10,
        borderRadius: 20,
        backgroundColor: brand.card,
        borderWidth: 1,
        borderColor: brand.line,
        marginBottom: 11,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <RecipePhoto image={recipe.image} label={recipe.name} style={{ width: 100, height: 100, borderRadius: 15, backgroundColor: brand.paperDeep }} />
      <View style={{ flex: 1, paddingRight: 2 }}>
        <Text style={{ color: brand.orange, fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>{recipe.category === "breakfast" ? "早餐" : recipe.category === "lunch" ? "午餐" : "晚餐"}</Text>
        <Text numberOfLines={2} style={{ color: brand.ink, fontSize: 16, fontWeight: "700", lineHeight: 22, marginTop: 4 }}>{recipe.name}</Text>
        <Text numberOfLines={1} style={{ color: brand.muted, fontSize: 11, marginTop: 4 }}>{recipe.subtitle}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
          <Ionicons name="time-outline" size={13} color={brand.muted} />
          <Text style={{ color: brand.muted, fontSize: 11 }}>{recipe.time} 分钟</Text>
          <Text style={{ color: brand.line, marginHorizontal: 2 }}>·</Text>
          <Text style={{ color: brand.muted, fontSize: 11 }}>{recipe.ingredients.length} 种食材</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={brand.muted} />
    </Pressable>
  );
}
