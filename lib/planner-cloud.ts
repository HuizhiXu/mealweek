import { emptyPlanner, parsePlanner, type PlannerState } from "./planner-sync";
import type { CloudSnapshot, PlannerRemote } from "./planner-store";
import { getSupabase } from "./supabase";

function cloudError(code?: string): Error {
  if (code === "PGRST202" || code === "42P01") return new Error("云端存储尚未准备好，请联系管理员。");
  if (code === "42501") return new Error("登录已过期，请重新登录后同步。");
  return new Error("云端暂时不可用，修改仍保留在本机。请稍后重试。");
}

function snapshot(value: { state: unknown; revision: unknown }): CloudSnapshot {
  const revision = Number(value.revision);
  if (!Number.isSafeInteger(revision) || revision < 0) throw cloudError();
  return { state: parsePlanner(value.state), revision };
}

export function plannerRemote(accountId: string): PlannerRemote {
  const client = getSupabase();
  if (!client) throw new Error("请先配置云端连接。");
  return {
    async load() {
      const { data, error } = await client.from("planner_states")
        .select("state,revision").eq("user_id", accountId).maybeSingle();
      if (error) throw cloudError(error.code);
      return data ? snapshot(data) : { state: emptyPlanner(), revision: 0 };
    },
    async save(revision: number, state: PlannerState) {
      const { data, error } = await client.rpc("save_planner_state", {
        p_account_id: accountId, p_expected_revision: revision, p_state: state,
      });
      if (error) throw cloudError(error.code);
      if (!data || typeof data.saved !== "boolean") throw cloudError();
      return { ...snapshot(data), saved: data.saved };
    },
  };
}
