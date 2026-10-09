import { describe, expect, it } from "vitest";

import { buildShoppingList, formatQuantity, getShoppingCheckId } from "../lib/shopping-list";

const week = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];

describe("weekly shopping list", () => {
  it("merges repeated produce and pantry ingredients across planned recipes", () => {
    const plan = {
      "2026-10-05": { lunch: "chicken-quinoa-bowl", dinner: "tomato-chickpea-pasta" },
      "2026-10-06": { lunch: "salmon-rice-bowl" },
    };
    const items = buildShoppingList(plan, week);

    expect(items.find((item) => item.key === "cherry-tomato")).toMatchObject({ amount: 200, unit: "g" });
    expect(items.find((item) => item.key === "spinach")).toMatchObject({ amount: 55, unit: "g" });
    expect(items.find((item) => item.key === "olive-oil")).toMatchObject({ amount: 15, unit: "ml" });
    expect(items.find((item) => item.key === "cucumber")).toMatchObject({ amount: 1, unit: "个" });
  });

  it("ignores meals outside the selected seven-day window", () => {
    const plan = {
      "2026-10-05": { lunch: "chicken-quinoa-bowl" },
      "2026-10-12": { dinner: "salmon-rice-bowl" },
    };
    const items = buildShoppingList(plan, week);
    expect(items.some((item) => item.key === "chicken")).toBe(true);
    expect(items.some((item) => item.key === "salmon")).toBe(false);
  });

  it("returns an empty list when no recipes are planned", () => {
    expect(buildShoppingList({}, week)).toEqual([]);
  });

  it("shows large quantities in a readable larger unit", () => {
    expect(formatQuantity({ id: "x", key: "x", name: "米", amount: 1250, unit: "g", aisle: "主食干货" })).toBe("1.25 kg");
    expect(formatQuantity({ id: "y", key: "y", name: "油", amount: 800, unit: "ml", aisle: "调味品" })).toBe("800 ml");
  });

  it("keeps checked state separate between weeks", () => {
    expect(getShoppingCheckId("2026-10-05", "spinach:weight")).not.toBe(getShoppingCheckId("2026-10-12", "spinach:weight"));
  });
});
