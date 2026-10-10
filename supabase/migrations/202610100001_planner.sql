-- Run in the Supabase SQL Editor. Uses auth.users; no database password enters the app.
begin;

create table if not exists public.planner_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{"plan":{},"checked":{}}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  constraint planner_state_shape check (
    jsonb_typeof(state) = 'object'
    and state ? 'plan' and state ? 'checked'
    and jsonb_typeof(state -> 'plan') = 'object'
    and jsonb_typeof(state -> 'checked') = 'object'
    and octet_length(state::text) <= 1048576
  )
);

alter table public.planner_states enable row level security;
drop policy if exists "Read own planner" on public.planner_states;
create policy "Read own planner" on public.planner_states
  for select to authenticated using ((select auth.uid()) = user_id);

-- Writes are allowed only through the revision-checked function below.
revoke all on public.planner_states from anon, authenticated;
grant select on public.planner_states to authenticated;

create or replace function public.save_planner_state(
  p_account_id uuid,
  p_expected_revision bigint,
  p_state jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.planner_states%rowtype;
begin
  if v_user is null or p_account_id is distinct from v_user then
    raise exception 'Account does not match authenticated user' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid revision' using errcode = '22023';
  end if;
  if p_state is null or jsonb_typeof(p_state) is distinct from 'object'
     or jsonb_typeof(p_state -> 'plan') is distinct from 'object'
     or jsonb_typeof(p_state -> 'checked') is distinct from 'object'
     or octet_length(p_state::text) > 1048576 then
    raise exception 'Invalid planner state' using errcode = '22023';
  end if;

  insert into public.planner_states (user_id) values (v_user)
    on conflict (user_id) do nothing;
  select * into strict v_row from public.planner_states
    where user_id = v_user for update;

  if v_row.revision <> p_expected_revision then
    return jsonb_build_object('saved', false, 'revision', v_row.revision, 'state', v_row.state);
  end if;

  update public.planner_states
    set state = p_state, revision = revision + 1, updated_at = now()
    where user_id = v_user
    returning * into v_row;
  return jsonb_build_object('saved', true, 'revision', v_row.revision, 'state', v_row.state);
end;
$$;

revoke all on function public.save_planner_state(uuid, bigint, jsonb) from public, anon;
grant execute on function public.save_planner_state(uuid, bigint, jsonb) to authenticated;

commit;
