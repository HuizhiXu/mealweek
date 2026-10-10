import { describe, expect, it } from "vitest";
import { compactPatches, emptyPlanner, importPatches, parsePlanner, rebasePatches, type PlannerPatch } from "../lib/planner-sync";

const day = "2026-10-10";
const meal = (before: string | null, after: string | null): PlannerPatch => ({
  kind: "meal", date: day, meal: "lunch", before, after,
});

describe("planner merge and migration", () => {
  it("merges unrelated remote meals without overwriting them", () => {
    const remote = { plan: { [day]: { dinner: "remote-dinner" } }, checked: {} };
    const result = rebasePatches(remote, [meal(null, "local-lunch")]);
    expect(result.conflicts).toEqual([]);
    expect(result.state.plan[day]).toEqual({ dinner: "remote-dinner", lunch: "local-lunch" });
  });

  it("detects concurrent edits to the same meal, including remote deletion", () => {
    const remote = { plan: { [day]: { lunch: "remote" } }, checked: {} };
    expect(rebasePatches(remote, [meal("original", "local")]).conflicts).toHaveLength(1);
    expect(rebasePatches(emptyPlanner(), [meal("original", "local")]).conflicts).toHaveLength(1);
  });

  it("recognizes an already accepted write after the response was lost", () => {
    const remote = { plan: { [day]: { lunch: "local" } }, checked: {} };
    expect(rebasePatches(remote, [meal(null, "local")]).conflicts).toEqual([]);
  });

  it("compacts multiple edits using the original null baseline", () => {
    expect(compactPatches([meal(null, "first"), meal("first", "second")])).toEqual([meal(null, "second")]);
    expect(compactPatches([meal(null, "first"), meal("first", null)])).toEqual([]);
  });

  it("keeps forced edits scoped to the fields changed locally", () => {
    const remote = { plan: { [day]: { lunch: "remote", dinner: "untouched" } }, checked: { x: true } };
    const result = rebasePatches(remote, [meal("old", "local")], true);
    expect(result.conflicts).toEqual([]);
    expect(result.state).toEqual({ plan: { [day]: { lunch: "local", dinner: "untouched" } }, checked: { x: true } });
  });

  it("imports only missing fields and respects cloud unchecked items", () => {
    const remote = { plan: { [day]: { lunch: "cloud" } }, checked: { existing: false } };
    const local = { plan: { [day]: { lunch: "guest", dinner: "new" } }, checked: { existing: true, fresh: true } };
    const result = rebasePatches(remote, importPatches(remote, local));
    expect(result.state).toEqual({
      plan: { [day]: { lunch: "cloud", dinner: "new" } },
      checked: { existing: false, fresh: true },
    });
  });

  it("sanitizes malformed dates, meals and unsafe object keys", () => {
    expect(parsePlanner(JSON.parse('{"plan":{"bad":{"lunch":"x"},"2026-10-10":{"lunch":42,"dinner":"ok"}},"checked":{"__proto__":true,"x":true}}')))
      .toEqual({ plan: { [day]: { dinner: "ok" } }, checked: { x: true } });
  });
});
