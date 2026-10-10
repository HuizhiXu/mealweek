import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
const migration = readFileSync(new URL("../supabase/migrations/202610100001_planner.sql", import.meta.url), "utf8");

beforeAll(async () => {
  db = await PGlite.create();
  // Stub only Supabase's identity interface; table permissions, RLS, functions
  // and transactions execute in PostgreSQL, not in mocks.
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema auth to authenticated, anon;
    insert into auth.users values ('${a}'), ('${b}');
  `);
  await db.exec(migration);
}, 30000);

beforeEach(async () => {
  await db.exec("reset role; truncate public.planner_states;");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [a]);
  await db.exec("set role authenticated;");
});
afterAll(async () => { await db?.close(); });

async function save(id: string, revision: number, state = { plan: {}, checked: {} }) {
  const result = await db.query<{ result: { saved: boolean; revision: number; state: unknown } }>(
    "select public.save_planner_state($1::uuid, $2::bigint, $3::jsonb) as result",
    [id, revision, JSON.stringify(state)],
  );
  return result.rows[0].result;
}

describe("Supabase planner migration", () => {
  it("saves an authenticated user's snapshot and rejects a stale revision", async () => {
    const first = await save(a, 0, { plan: { "2026-10-10": { lunch: "first" } }, checked: {} });
    expect(first.saved).toBe(true);
    expect(first.revision).toBe(1);
    const stale = await save(a, 0, { plan: {}, checked: {} });
    expect(stale.saved).toBe(false);
    expect(stale.state).toEqual({ plan: { "2026-10-10": { lunch: "first" } }, checked: {} });
  });

  it("hides another user's records using RLS and prevents account substitution", async () => {
    await save(a, 0);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [b]);
    expect((await db.query("select * from public.planner_states")).rows).toEqual([]);
    await expect(save(a, 1)).rejects.toThrow("Account does not match");
    await save(b, 0);
    const visible = await db.query<{ user_id: string }>("select user_id from public.planner_states");
    expect(visible.rows).toEqual([{ user_id: b }]);
  });

  it("prevents direct table writes from bypassing the revision check", async () => {
    await save(a, 0);
    await expect(db.query("update public.planner_states set revision = 99")).rejects.toThrow("permission denied");
    await expect(db.query("delete from public.planner_states")).rejects.toThrow("permission denied");
  });

  it("denies anonymous access even when an account ID is supplied", async () => {
    await db.exec("reset role; set role anon;");
    await expect(save(a, 0)).rejects.toThrow("permission denied");
    await expect(db.query("select * from public.planner_states")).rejects.toThrow("permission denied");
  });

  it("rejects missing identity, invalid state and invalid revisions", async () => {
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
    await expect(save(a, 0)).rejects.toThrow("Account does not match");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [a]);
    await expect(save(a, -1)).rejects.toThrow("Invalid revision");
    await expect(db.query("select public.save_planner_state($1::uuid, 0, '{}'::jsonb)", [a]))
      .rejects.toThrow("Invalid planner state");
  });

  it("can reapply the migration without losing existing snapshots", async () => {
    await save(a, 0);
    await db.exec("reset role;");
    await db.exec(migration);
    expect((await db.query<{ revision: number }>("select revision from public.planner_states")).rows[0].revision)
      .toBe(1);
  });
});
