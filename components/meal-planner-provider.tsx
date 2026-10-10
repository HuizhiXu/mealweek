import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";

import { dateKey, getWeekDates } from "@/lib/dates";
import type { MealType } from "@/lib/recipes";
import { cloudStorageScope } from "@/lib/supabase";
import { plannerRemote } from "@/lib/planner-cloud";
import { GUEST_STORAGE_KEY, PlannerStore, type PlannerView } from "@/lib/planner-store";
import { useCloudAccount } from "./cloud-account-provider";

type PlannerContextValue = {
  ready: boolean;
  plan: PlannerView["state"]["plan"];
  checked: PlannerView["state"]["checked"];
  syncStatus: PlannerView["status"];
  syncMessage: string;
  pendingCount: number;
  weekOffset: number;
  selectedDate: string;
  weekDates: ReturnType<typeof getWeekDates>;
  setSelectedDate: (date: string) => void;
  shiftWeek: (amount: number) => void;
  assignRecipe: (date: string, meal: MealType, recipeId: string) => void;
  removeRecipe: (date: string, meal: MealType) => void;
  toggleChecked: (itemId: string) => void;
  sync: () => Promise<void>;
  keepLocal: () => Promise<void>;
  useCloud: () => Promise<void>;
  importGuest: () => Promise<number>;
  flush: () => Promise<void>;
};

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function MealPlannerProvider({ children }: { children: React.ReactNode }) {
  const { session } = useCloudAccount();
  const accountId = session?.user.id;
  // Remount on account changes: one user's cache and pending writes never enter
  // another user's view. The database RPC independently checks the account ID.
  return <PlannerSession key={accountId ?? "guest"} accountId={accountId}>{children}</PlannerSession>;
}

function PlannerSession({ children, accountId }: { children: React.ReactNode; accountId?: string }) {
  const [store] = useState(() => new PlannerStore(
    AsyncStorage,
    accountId ? `@yizhouhaoshi/account:${cloudStorageScope}:${accountId}` : GUEST_STORAGE_KEY,
    accountId ? plannerRemote(accountId) : undefined,
  ));
  const [view, setView] = useState(store.getSnapshot);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));

  useEffect(() => {
    store.start();
    const unsubscribe = store.subscribe(() => setView(store.getSnapshot()));
    void store.initialize().then(() => { if (accountId) void store.sync(); });
    const poll = accountId ? setInterval(() => {
      if (Platform.OS === "web" ? document.visibilityState === "visible" : AppState.currentState === "active") {
        void store.sync();
      }
    }, 30000) : undefined;
    const refresh = () => { if (accountId) void store.sync(); };
    const active = AppState.addEventListener("change", (state) => { if (state === "active") refresh(); });
    if (Platform.OS === "web") {
      window.addEventListener("online", refresh);
      window.addEventListener("focus", refresh);
    }
    return () => {
      unsubscribe();
      clearInterval(poll);
      active.remove();
      if (Platform.OS === "web") {
        window.removeEventListener("online", refresh);
        window.removeEventListener("focus", refresh);
      }
      store.dispose();
    };
  }, [accountId, store]);

  const shiftWeek = useCallback((amount: number) => {
    const next = weekOffset + amount;
    setWeekOffset(next);
    setSelectedDate(getWeekDates(next)[0].key);
  }, [weekOffset]);
  const assignRecipe = useCallback((date: string, meal: MealType, recipeId: string) => {
    const before = store.getSnapshot().state.plan[date]?.[meal] ?? null;
    store.edit({ kind: "meal", date, meal, before, after: recipeId });
  }, [store]);
  const removeRecipe = useCallback((date: string, meal: MealType) => {
    const before = store.getSnapshot().state.plan[date]?.[meal] ?? null;
    store.edit({ kind: "meal", date, meal, before, after: null });
  }, [store]);
  const toggleChecked = useCallback((id: string) => {
    const before = store.getSnapshot().state.checked[id] ?? false;
    store.edit({ kind: "check", id, before, after: !before });
  }, [store]);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const value = useMemo<PlannerContextValue>(() => ({
    ready: view.ready, plan: view.state.plan, checked: view.state.checked,
    syncStatus: view.status, syncMessage: view.message, pendingCount: view.pendingCount,
    weekOffset, selectedDate, weekDates, setSelectedDate, shiftWeek, assignRecipe, removeRecipe, toggleChecked,
    sync: () => store.sync(), keepLocal: () => store.sync(true), useCloud: store.useCloud,
    importGuest: store.importGuest, flush: store.flush,
  }), [view, weekOffset, selectedDate, weekDates, shiftWeek, assignRecipe, removeRecipe, toggleChecked, store]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function useMealPlanner() {
  const context = useContext(PlannerContext);
  if (!context) throw new Error("useMealPlanner must be used inside MealPlannerProvider");
  return context;
}
