import {
  applyPatch, compactPatches, emptyPlanner, importPatches, parsePlanner, rebasePatches,
  type PlannerCache, type PlannerPatch, type PlannerState,
} from "./planner-sync";

export const GUEST_STORAGE_KEY = "@yizhouhaoshi/planner-v1";
export type CloudSnapshot = { state: PlannerState; revision: number };
export type PlannerRemote = {
  load: () => Promise<CloudSnapshot>;
  save: (revision: number, state: PlannerState) => Promise<CloudSnapshot & { saved: boolean }>;
};
export type PlannerStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function validPatch(value: unknown): value is PlannerPatch {
  if (!isRecord(value)) return false;
  if (value.kind === "meal") {
    return typeof value.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
      && ["breakfast", "lunch", "dinner"].includes(String(value.meal))
      && (value.before === null || typeof value.before === "string")
      && (value.after === null || typeof value.after === "string");
  }
  return value.kind === "check" && typeof value.id === "string" && value.id.length > 0
    && !["__proto__", "constructor", "prototype"].includes(value.id)
    && typeof value.before === "boolean" && typeof value.after === "boolean";
}

export type SyncStatus = "loading" | "local" | "syncing" | "synced" | "pending" | "error" | "conflict";
export type PlannerView = {
  state: PlannerState; ready: boolean; status: SyncStatus; message: string;
  pendingCount: number; conflicts: PlannerPatch[];
};

export class PlannerStore {
  private cache: PlannerCache = { state: emptyPlanner(), pending: [] };
  private view: PlannerView = {
    state: this.cache.state, ready: false, status: "loading", message: "",
    pendingCount: 0, conflicts: [],
  };
  private listeners = new Set<() => void>();
  private writeChain: Promise<void> = Promise.resolve();
  private running: Promise<void> | null = null;
  private initializing: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;

  constructor(
    private storage: PlannerStorage,
    private key: string,
    private remote?: PlannerRemote,
  ) {}

  start() { this.disposed = false; }

  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(changes: Partial<PlannerView> = {}) {
    this.view = {
      ...this.view, state: this.cache.state,
      pendingCount: compactPatches(this.cache.pending).length, ...changes,
    };
    for (const listener of this.listeners) listener();
  }

  // Serialize disk writes; a slow earlier write must never replace a newer edit.
  private persist(): Promise<void> {
    const serialized = JSON.stringify({ schemaVersion: 1, ...this.cache });
    const next = this.writeChain.catch(() => undefined).then(() => this.storage.setItem(this.key, serialized));
    this.writeChain = next;
    return next;
  }

  initialize = (): Promise<void> => {
    if (this.view.ready) return Promise.resolve();
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      try {
        const saved = await this.storage.getItem(this.key);
        if (this.disposed) return;
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (!isRecord(parsed) || (parsed.schemaVersion !== undefined && parsed.schemaVersion !== 1)) {
            throw new Error("Unsupported local record");
          }
          const rawState = parsed.state ?? parsed;
          const pending = parsed.pending ?? [];
          if (!isRecord(rawState) || !isRecord(rawState.plan) || !isRecord(rawState.checked)
            || !Array.isArray(pending) || !pending.every(validPatch)) {
            throw new Error("Invalid local record");
          }
          this.cache = { state: parsePlanner(rawState), pending };
        }
        this.publish({ ready: true, status: this.remote ? "pending" : "local", message: "" });
      } catch {
        this.publish({ status: "error", message: "无法读取本地记录，请重试。现有记录不会被覆盖。" });
      }
    })().finally(() => { this.initializing = null; });
    return this.initializing;
  };

  edit(patch: PlannerPatch) {
    if (!this.view.ready || this.disposed) return;
    this.cache = {
      state: applyPatch(this.cache.state, patch),
      pending: this.remote ? [...this.cache.pending, patch] : [],
    };
    this.publish({ status: this.view.status === "conflict" ? "conflict" : this.remote ? "pending" : "local" });
    void this.persist().then(() => {
      if (this.remote && this.view.status !== "conflict") this.schedule();
    }).catch(() => {
      this.publish({ status: "error", message: "本地保存失败，请勿关闭页面；可尝试重新同步。" });
    });
  }

  private schedule() {
    if (this.disposed) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.sync(); }, 600);
  }

  sync = (force = false): Promise<void> => {
    if (this.running) return this.running;
    this.running = this.runSync(force).finally(() => { this.running = null; });
    return this.running;
  };

  private async runSync(force: boolean) {
    await this.initialize();
    if (!this.view.ready || this.disposed || !this.remote) return;
    if (this.view.status === "conflict" && !force) return;
    this.publish({ status: "syncing", message: "" });
    try {
      await this.persist();
      let remote = await this.remote.load();
      for (let attempt = 0; attempt < 4; attempt++) {
        if (this.disposed) return;
        const count = this.cache.pending.length;
        const pending = this.cache.pending.slice(0, count);
        const rebased = rebasePatches(remote.state, pending, force);
        if (rebased.conflicts.length) {
          this.publish({
            status: "conflict", conflicts: rebased.conflicts,
            message: "另一台设备修改了同一条记录。请选择保留哪份修改。",
          });
          return;
        }
        if (!compactPatches(pending).length) {
          // Awaiting load may have admitted edits: count and pending were captured
          // only after it completed, so these edits are always included here.
          this.cache = { state: rebased.state, pending: [] };
          await this.persist();
          this.publish({ status: this.cache.pending.length ? "pending" : "synced", conflicts: [] });
          if (this.cache.pending.length) this.schedule();
          return;
        }
        const saved = await this.remote.save(remote.revision, rebased.state);
        if (this.disposed) return;
        if (!saved.saved) {
          remote = saved;
          continue;
        }
        const tail = this.cache.pending.slice(count);
        const state = tail.reduce(applyPatch, saved.state);
        this.cache = { state, pending: tail };
        await this.persist();
        this.publish({ status: this.cache.pending.length ? "pending" : "synced", conflicts: [] });
        if (this.cache.pending.length) this.schedule();
        return;
      }
      throw new Error("记录正在被另一台设备修改，请稍后重试。");
    } catch (error) {
      if (this.disposed) return;
      this.publish({
        status: "error",
        message: error instanceof Error ? error.message : "云端暂时不可用，修改已保留在本机。",
      });
    }
  }

  useCloud = async () => {
    if (!this.remote || this.running || this.disposed) return;
    // Preserve the abandoned edits for recovery, then discard only the captured
    // prefix; new edits admitted while downloading are retained.
    const count = this.cache.pending.length;
    try {
      await this.storage.setItem(this.key + ":conflict-backup", JSON.stringify(this.cache));
      const remote = await this.remote.load();
      if (this.disposed) return;
      const tail = this.cache.pending.slice(count);
      this.cache = { state: tail.reduce(applyPatch, remote.state), pending: tail };
      await this.persist();
      this.publish({ status: tail.length ? "pending" : "synced", conflicts: [], message: "" });
      if (tail.length) this.schedule();
    } catch {
      this.publish({ status: "error", message: "无法读取云端记录，本机修改仍保留。" });
    }
  };

  importGuest = async () => {
    if (!this.remote || !this.view.ready || this.disposed) return 0;
    const saved = await this.storage.getItem(GUEST_STORAGE_KEY);
    if (!saved) return 0;
    const parsed = JSON.parse(saved);
    const patches = importPatches(this.cache.state, parsePlanner(parsed.state ?? parsed));
    for (const patch of patches) this.edit(patch);
    await this.persist();
    await this.sync();
    return patches.length;
  };

  flush = () => this.persist();

  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
    this.listeners.clear();
  }
}
