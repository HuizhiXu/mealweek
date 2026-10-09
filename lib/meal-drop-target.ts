import type { MealType } from "./recipes";

export type MealDropTarget = {
  meal: MealType;
  x: number;
  y: number;
  width: number;
  height: number;
  scrollY: number;
};

export function findMealDropTarget(
  bounds: Partial<Record<MealType, MealDropTarget>>,
  x: number,
  y: number,
  currentScrollY: number,
) {
  return Object.values(bounds).find((target) =>
    target &&
    x >= target.x - 8 &&
    x <= target.x + target.width + 8 &&
    y + currentScrollY - target.scrollY >= target.y - 8 &&
    y + currentScrollY - target.scrollY <= target.y + target.height + 8,
  );
}
