import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GUEST_STORAGE_KEY, PlannerStore, type CloudSnapshot, type PlannerRemote, type PlannerStorage } from "../lib/planner-store";
import { emptyPlanner, type PlannerPatch, type PlannerState } from "../lib/planner-sync";

const day = "2026-10-10";
const patch = (before: string | null, after: string | null): PlannerPatch => ({
  kind: "meal", date: day, meal: "lunch", before, after,
});
function storage() {
  const data = new Map<string, string>();
  const api: PlannerStorage = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
  };
  return { api, data };
}
function cloud(initial: PlannerState = emptyPlanner()) {
  let current: CloudSnapshot = { state: initial, revision: 0 };
  const remote: PlannerRemote = {
    load: vi.fn(async () => current),
    save: vi.fn(async (revision, state) => {
      if (revision !== current.revision) return { ...current, saved: false };
      current = { state, revision: revision + 1 };
      return { ...current, saved: true };
    }),
  };
  return { remote, get: () => current, set: (state: PlannerState) => { current = { state, revision: current.revision + 1 }; } };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}
const stores: PlannerStore[] = [];
function make(local: PlannerStorage, key: string, remote?: PlannerRemote) {
  const store = new PlannerStore(local, key, remote);
  stores.push(store);
  return store;
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { stores.forEach((store) => store.dispose()); stores.length = 0; vi.useRealTimers(); });

describe("durable planner sync", () => {
  it("retains offline edits across a reload and uploads after reconnecting", async () => {
    const local = storage();
    const server = cloud();
    const failedRemote = { ...server.remote, load: async () => { throw new Error("offline"); } };
    const first = make(local.api, "account:a", failedRemote);
    await first.initialize();
    first.edit(patch(null, "lunch"));
    await first.sync();
    expect(first.getSnapshot().status).toBe("error");
    first.dispose();
    const second = make(local.api, "account:a", server.remote);
    await second.initialize();
    expect(second.getSnapshot().state.plan[day]?.lunch).toBe("lunch");
    await second.sync();
    expect(server.get().state.plan[day]?.lunch).toBe("lunch");
    expect(second.getSnapshot().status).toBe("synced");
    expect(second.getSnapshot().pendingCount).toBe(0);
  });

  it("does not overwrite another device's concurrent same-meal edit", async () => {
    const local = storage();
    const server = cloud({ plan: { [day]: { lunch: "initial" } }, checked: {} });
    const store = make(local.api, "a", server.remote);
    await store.sync();
    store.edit(patch("initial", "mine"));
    server.set({ plan: { [day]: { lunch: "theirs", dinner: "preserve" } }, checked: {} });
    await store.sync();
    expect(store.getSnapshot().status).toBe("conflict");
    expect(server.get().state.plan[day]?.lunch).toBe("theirs");
    await store.sync(true);
    expect(server.get().state.plan[day]).toEqual({ lunch: "mine", dinner: "preserve" });
  });

  it("retries a revision mismatch and preserves unrelated changes", async () => {
    const local = storage();
    const server = cloud();
    const realSave = server.remote.save;
    let raced = false;
    server.remote.save = async (revision, state) => {
      if (!raced) { raced = true; server.set({ plan: { [day]: { dinner: "other" } }, checked: {} }); }
      return realSave(revision, state);
    };
    const store = make(local.api, "a", server.remote);
    await store.initialize();
    store.edit(patch(null, "mine"));
    await store.sync();
    expect(server.get().state.plan[day]).toEqual({ lunch: "mine", dinner: "other" });
    expect(store.getSnapshot().pendingCount).toBe(0);
  });

  it("retains edits made while a save request is in flight", async () => {
    const local = storage();
    const server = cloud();
    const started = deferred<void>();
    const release = deferred<void>();
    const realSave = server.remote.save;
    server.remote.save = async (revision, state) => {
      started.resolve(); await release.promise; return realSave(revision, state);
    };
    const store = make(local.api, "a", server.remote);
    await store.initialize();
    store.edit(patch(null, "first"));
    const syncing = store.sync();
    await started.promise;
    store.edit(patch("first", "second"));
    release.resolve();
    await syncing;
    expect(store.getSnapshot().state.plan[day]?.lunch).toBe("second");
    expect(store.getSnapshot().pendingCount).toBe(1);
    await store.sync();
    expect(server.get().state.plan[day]?.lunch).toBe("second");
    expect(store.getSnapshot().pendingCount).toBe(0);
  });

  it("keeps caches separate when changing accounts and logging out", async () => {
    const local = storage();
    local.data.set(GUEST_STORAGE_KEY, JSON.stringify({ plan: { [day]: { lunch: "guest" } }, checked: {} }));
    const a = make(local.api, "account:a", cloud().remote);
    await a.initialize();
    a.edit(patch(null, "private-a"));
    await a.flush();
    a.dispose();
    const b = make(local.api, "account:b", cloud().remote);
    await b.initialize();
    expect(b.getSnapshot().state).toEqual(emptyPlanner());
    const guest = make(local.api, GUEST_STORAGE_KEY);
    await guest.initialize();
    expect(guest.getSnapshot().state.plan[day]?.lunch).toBe("guest");
  });

  it("never overwrites a corrupt local record during initialization", async () => {
    const local = storage();
    local.data.set("a", "broken-json");
    const store = make(local.api, "a", cloud().remote);
    await store.sync();
    store.edit(patch(null, "new"));
    expect(store.getSnapshot().ready).toBe(false);
    expect(local.data.get("a")).toBe("broken-json");
  });

  it("preserves syntactically valid but corrupt local queues without crashing", async () => {
    const local = storage();
    const broken = JSON.stringify({ state: emptyPlanner(), pending: [null] });
    local.data.set("a", broken);
    const store = make(local.api, "a", cloud().remote);
    await store.sync();
    expect(store.getSnapshot().ready).toBe(false);
    expect(store.getSnapshot().status).toBe("error");
    expect(local.data.get("a")).toBe(broken);
  });

  it("backs up discarded conflicting edits before choosing cloud data", async () => {
    const local = storage();
    const server = cloud();
    const store = make(local.api, "a", server.remote);
    await store.sync();
    store.edit(patch(null, "mine"));
    server.set({ plan: { [day]: { lunch: "theirs" } }, checked: {} });
    await store.sync();
    await store.useCloud();
    expect(store.getSnapshot().state.plan[day]?.lunch).toBe("theirs");
    expect(store.getSnapshot().pendingCount).toBe(0);
    expect(JSON.parse(local.data.get("a:conflict-backup")!).state.plan[day].lunch).toBe("mine");
  });

  it("prevents a disposed account from initiating a pending network write", async () => {
    const local = storage();
    const server = cloud();
    const started = deferred<void>();
    const load = deferred<CloudSnapshot>();
    server.remote.load = async () => { started.resolve(); return load.promise; };
    const store = make(local.api, "a", server.remote);
    await store.initialize();
    store.edit(patch(null, "mine"));
    const syncing = store.sync();
    await started.promise;
    store.dispose();
    load.resolve(server.get());
    await syncing;
    expect(server.remote.save).not.toHaveBeenCalled();
  });
});
