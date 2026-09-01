create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id),
  target_user_id uuid references public.profiles (id),
  action text not null check (action in ('admin_granted', 'admin_revoked')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_log_read_admin on public.admin_audit_log;
create policy admin_audit_log_read_admin
on public.admin_audit_log
for select
to authenticated
using (public.current_user_is_admin());

revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;

create or replace function public.set_player_admin(p_player_id uuid, p_is_admin boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_current_value boolean;
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not public.current_user_is_admin() then
    raise exception using errcode = '42501', message = 'administrator_required';
  end if;

  if p_player_id = v_user and not p_is_admin then
    raise exception using errcode = 'P0001', message = 'cannot_revoke_own_admin_role';
  end if;

  select profile.is_admin into v_current_value
  from public.profiles as profile
  where profile.id = p_player_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'player_not_found';
  end if;

  if v_current_value = p_is_admin then
    return p_is_admin;
  end if;

  update public.profiles
  set is_admin = p_is_admin, updated_at = now()
  where id = p_player_id;

  insert into public.admin_audit_log (actor_id, target_user_id, action)
  values (v_user, p_player_id, case when p_is_admin then 'admin_granted' else 'admin_revoked' end);

  return p_is_admin;
end;
$$;

revoke all on function public.set_player_admin(uuid, boolean) from public;
grant execute on function public.set_player_admin(uuid, boolean) to authenticated;
