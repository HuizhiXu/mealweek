import type { MealType } from "./recipes";
import type { WeeklyPlan } from "./shopping-list";

export type PlannerState = { plan: WeeklyPlan; checked: Record<string, boolean> };
export type PlannerPatch =
  | { kind: "meal"; date: string; meal: MealType; before: string | null; after: string | null }
  | { kind: "check"; id: string; before: boolean; after: boolean };
export type PlannerCache = { state: PlannerState; pending: PlannerPatch[] };

export function emptyPlanner(): PlannerState {
  return { plan: {}, checked: {} };
}

export function parsePlanner(value: unknown): PlannerState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyPlanner();
  const source = value as Partial<PlannerState>;
  const result = emptyPlanner();
  if (source.plan && typeof source.plan === "object" && !Array.isArray(source.plan)) {
    for (const [date, meals] of Object.entries(source.plan)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !meals || typeof meals !== "object") continue;
      const day: Partial<Record<MealType, string>> = {};
      for (const meal of ["breakfast", "lunch", "dinner"] as const) {
        if (typeof meals[meal] === "string") day[meal] = meals[meal];
      }
      if (Object.keys(day).length) result.plan[date] = day;
    }
  }
  if (source.checked && typeof source.checked === "object" && !Array.isArray(source.checked)) {
    for (const [id, checked] of Object.entries(source.checked)) {
      if (!["__proto__", "constructor", "prototype"].includes(id) && typeof checked === "boolean") {
        result.checked[id] = checked;
      }
    }
  }
  return result;
}

export function patchValue(state: PlannerState, patch: PlannerPatch): string | boolean | null {
  return patch.kind === "meal"
    ? state.plan[patch.date]?.[patch.meal] ?? null
    : state.checked[patch.id] ?? false;
}

export function applyPatch(state: PlannerState, patch: PlannerPatch): PlannerState {
  if (patch.kind === "check") {
    return { ...state, checked: { ...state.checked, [patch.id]: patch.after } };
  }
  const day = { ...state.plan[patch.date] };
  if (patch.after === null) delete day[patch.meal];
  else day[patch.meal] = patch.after;
  const plan = { ...state.plan };
  if (Object.keys(day).length) plan[patch.date] = day;
  else delete plan[patch.date];
  return { ...state, plan };
}

// Compare original and final values per field, so a lost save response can be
// retried without reverting other devices' unrelated changes.
export function compactPatches(patches: PlannerPatch[]): PlannerPatch[] {
  const fields = new Map<string, PlannerPatch>();
  for (const patch of patches) {
    const key = patch.kind === "meal" ? `meal:${patch.date}:${patch.meal}` : `check:${patch.id}`;
    const previous = fields.get(key);
    fields.set(key, { ...patch, before: previous ? previous.before : patch.before } as PlannerPatch);
  }
  return [...fields.values()].filter((patch) => patch.before !== patch.after);
}

export function rebasePatches(remote: PlannerState, patches: PlannerPatch[], force = false) {
  let state = remote;
  const conflicts: PlannerPatch[] = [];
  for (const patch of compactPatches(patches)) {
    const current = patchValue(remote, patch);
    if (!force && current !== patch.before && current !== patch.after) conflicts.push(patch);
    state = applyPatch(state, patch);
  }
  return { state, conflicts };
}

// Explicit migration adds missing fields and never overwrites existing account data.
export function importPatches(remote: PlannerState, local: PlannerState): PlannerPatch[] {
  const patches: PlannerPatch[] = [];
  for (const [date, day] of Object.entries(local.plan)) {
    for (const meal of ["breakfast", "lunch", "dinner"] as const) {
      const recipe = day[meal];
      if (recipe && !remote.plan[date]?.[meal]) {
        patches.push({ kind: "meal", date, meal, before: null, after: recipe });
      }
    }
  }
  for (const [id, checked] of Object.entries(local.checked)) {
    if (checked && remote.checked[id] === undefined) {
      patches.push({ kind: "check", id, before: false, after: true });
    }
  }
  return patches;
}
