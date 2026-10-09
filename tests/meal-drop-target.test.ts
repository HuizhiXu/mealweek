import { describe, expect, it } from "vitest";

import { findMealDropTarget } from "../lib/meal-drop-target";

const bounds = {
  breakfast: { meal: "breakfast" as const, x: 20, y: 100, width: 320, height: 90, scrollY: 0 },
  lunch: { meal: "lunch" as const, x: 20, y: 202, width: 320, height: 90, scrollY: 0 },
};

describe("meal drop target coordinates", () => {
  it("compensates for scroll added after the targets were measured", () => {
    const measuredAfterScroll = { ...bounds, breakfast: { ...bounds.breakfast, scrollY: 240 } };
    const target = findMealDropTarget(measuredAfterScroll, 200, 45, 300);
    expect(target?.meal).toBe("breakfast");
  });

  it("uses each slot's own measurement offset after a partial relayout", () => {
    const mixedBounds = {
      breakfast: { ...bounds.breakfast, scrollY: 240 },
      lunch: { ...bounds.lunch, scrollY: 300 },
    };
    expect(findMealDropTarget(mixedBounds, 200, 45, 300)?.meal).toBe("breakfast");
    expect(findMealDropTarget(mixedBounds, 200, 241, 300)?.meal).toBe("lunch");
  });

  it("finds the correct lower meal slot after scrolling the whole planner", () => {
    const target = findMealDropTarget(bounds, 200, 230, 60);
    expect(target?.meal).toBe("lunch");
  });

  it("returns no target when the pointer is outside every meal slot", () => {
    expect(findMealDropTarget(bounds, 10, 80, 300)).toBeUndefined();
  });
});
