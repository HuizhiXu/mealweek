import type { Aisle, Ingredient, MealType } from "./recipes";
import { findRecipe } from "./recipes";

export type WeeklyPlan = Record<string, Partial<Record<MealType, string>>>;
export type ShoppingItem = {
  id: string;
  key: string;
  name: string;
  amount: number;
  unit: string;
  aisle: Aisle;
};

const AISLE_ORDER: Aisle[] = ["蔬果", "肉类海鲜", "乳品蛋", "主食干货", "冷冻", "调味品"];
const UNIT_ALIASES: Record<string, { unit: string; dimension: string; factor: number }> = {
  g: { unit: "g", dimension: "weight", factor: 1 },
  克: { unit: "g", dimension: "weight", factor: 1 },
  kg: { unit: "g", dimension: "weight", factor: 1000 },
  公斤: { unit: "g", dimension: "weight", factor: 1000 },
  ml: { unit: "ml", dimension: "volume", factor: 1 },
  毫升: { unit: "ml", dimension: "volume", factor: 1 },
  l: { unit: "ml", dimension: "volume", factor: 1000 },
  升: { unit: "ml", dimension: "volume", factor: 1000 },
  个: { unit: "个", dimension: "count:个", factor: 1 },
  根: { unit: "根", dimension: "count:根", factor: 1 },
  片: { unit: "片", dimension: "count:片", factor: 1 },
  瓣: { unit: "瓣", dimension: "count:瓣", factor: 1 },
  勺: { unit: "勺", dimension: "count:勺", factor: 1 },
};

function canonicalIngredientKey(ingredient: Ingredient) {
  return ingredient.key.trim().toLocaleLowerCase("zh-CN");
}

function canonicalUnit(unit: string) {
  return UNIT_ALIASES[unit.trim().toLocaleLowerCase("zh-CN")] ?? {
    unit: unit.trim(),
    dimension: `unit:${unit.trim()}`,
    factor: 1,
  };
}

function rounded(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildShoppingList(plan: WeeklyPlan, weekDateKeys: string[]): ShoppingItem[] {
  const totals = new Map<string, ShoppingItem>();

  for (const date of weekDateKeys) {
    const meals = plan[date];
    if (!meals) continue;
    for (const recipeId of Object.values(meals)) {
      const recipe = findRecipe(recipeId);
      if (!recipe) continue;
      for (const ingredient of recipe.ingredients) {
        const key = canonicalIngredientKey(ingredient);
        const normalized = canonicalUnit(ingredient.unit);
        const id = `${key}:${normalized.dimension}`;
        const current = totals.get(id);
        if (current) {
          current.amount = rounded(current.amount + ingredient.amount * normalized.factor);
        } else {
          totals.set(id, {
            id,
            key,
            name: ingredient.name,
            amount: rounded(ingredient.amount * normalized.factor),
            unit: normalized.unit,
            aisle: ingredient.aisle,
          });
        }
      }
    }
  }

  return [...totals.values()].sort((a, b) => {
    const aisleDiff = AISLE_ORDER.indexOf(a.aisle) - AISLE_ORDER.indexOf(b.aisle);
    return aisleDiff || a.name.localeCompare(b.name, "zh-CN");
  });
}

export function formatQuantity(item: ShoppingItem) {
  let value = item.amount;
  let unit = item.unit;
  if (unit === "g" && value >= 1000) {
    value /= 1000;
    unit = "kg";
  } else if (unit === "ml" && value >= 1000) {
    value /= 1000;
    unit = "L";
  }
  const visible = Number.isInteger(value) ? String(value) : String(rounded(value));
  return `${visible} ${unit}`;
}

export function getShoppingCheckId(weekStart: string, itemId: string) {
  return `${weekStart}::${itemId}`;
}
