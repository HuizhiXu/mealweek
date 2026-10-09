import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { dateKey, getWeekDates } from "@/lib/dates";
import type { MealType } from "@/lib/recipes";
import type { WeeklyPlan } from "@/lib/shopping-list";

const STORAGE_KEY = "@yizhouhaoshi/planner-v1";

type PersistedState = {
  plan: WeeklyPlan;
  checked: Record<string, boolean>;
};
type StateUpdater = (current: PersistedState) => PersistedState;

const EMPTY_STATE: PersistedState = { plan: {}, checked: {} };

type PlannerContextValue = {
  ready: boolean;
  plan: WeeklyPlan;
  checked: Record<string, boolean>;
  weekOffset: number;
  selectedDate: string;
  weekDates: ReturnType<typeof getWeekDates>;
  setSelectedDate: (date: string) => void;
  shiftWeek: (amount: number) => void;
  assignRecipe: (date: string, meal: MealType, recipeId: string) => void;
  removeRecipe: (date: string, meal: MealType) => void;
  toggleChecked: (itemId: string) => void;
};

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function MealPlannerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY_STATE);
  const stateRef = useRef<PersistedState>(EMPTY_STATE);
  const pendingUpdatesRef = useRef<StateUpdater[]>([]);
  const [ready, setReady] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));

  useEffect(() => {
    let active = true;
    let restored = EMPTY_STATE;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!saved) return;
        const parsed = JSON.parse(saved) as Partial<PersistedState>;
        restored = {
          plan: parsed.plan && typeof parsed.plan === "object" ? parsed.plan : {},
          checked: parsed.checked && typeof parsed.checked === "object" ? parsed.checked : {},
        };
      })
      .catch(() => {
        // A missing or invalid local snapshot should never block planning.
      })
      .finally(() => {
        if (!active) return;
        const queued = pendingUpdatesRef.current;
        pendingUpdatesRef.current = [];
        const next = queued.reduce((current, updater) => updater(current), restored);
        stateRef.current = next;
        setState(next);
        if (queued.length) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((updater: StateUpdater) => {
    if (!ready) {
      pendingUpdatesRef.current.push(updater);
      return;
    }
    const next = updater(stateRef.current);
    stateRef.current = next;
    setState(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, [ready]);

  const shiftWeek = useCallback((amount: number) => {
    const nextOffset = weekOffset + amount;
    setWeekOffset(nextOffset);
    setSelectedDate(getWeekDates(nextOffset)[0].key);
  }, [weekOffset]);

  const assignRecipe = useCallback((date: string, meal: MealType, recipeId: string) => {
    update((current) => ({
      ...current,
      plan: {
        ...current.plan,
        [date]: { ...current.plan[date], [meal]: recipeId },
      },
    }));
  }, [update]);

  const removeRecipe = useCallback((date: string, meal: MealType) => {
    update((current) => {
      const day = { ...current.plan[date] };
      delete day[meal];
      const plan = { ...current.plan };
      if (Object.keys(day).length) plan[date] = day;
      else delete plan[date];
      return { ...current, plan };
    });
  }, [update]);

  const toggleChecked = useCallback((itemId: string) => {
    update((current) => ({
      ...current,
      checked: { ...current.checked, [itemId]: !current.checked[itemId] },
    }));
  }, [update]);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const value = useMemo<PlannerContextValue>(() => ({
    ready,
    plan: state.plan,
    checked: state.checked,
    weekOffset,
    selectedDate,
    weekDates,
    setSelectedDate,
    shiftWeek,
    assignRecipe,
    removeRecipe,
    toggleChecked,
  }), [ready, state, weekOffset, selectedDate, weekDates, shiftWeek, assignRecipe, removeRecipe, toggleChecked]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function useMealPlanner() {
  const context = useContext(PlannerContext);
  if (!context) throw new Error("useMealPlanner must be used inside MealPlannerProvider");
  return context;
}
