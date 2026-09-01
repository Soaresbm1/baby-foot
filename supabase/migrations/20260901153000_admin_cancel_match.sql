create or replace function public.admin_cancel_match(p_match_id uuid)
returns public.match_status
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_match public.matches%rowtype;
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not public.current_user_is_admin() then
    raise exception using errcode = '42501', message = 'administrator_required';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'match_not_found';
  end if;

  if v_match.status in ('completed', 'cancelled') then
    raise exception using errcode = 'P0001', message = 'match_already_finished';
  end if;

  update public.matches
  set
    status = 'cancelled',
    cancel_reason = 'administrative',
    join_token_hash = null,
    ended_at = now(),
    updated_at = now()
  where id = p_match_id;

  insert into public.match_events (match_id, actor_id, type, metadata)
  values (p_match_id, v_user, 'match_cancelled', jsonb_build_object('reason', 'administrative'));

  return 'cancelled';
end;
$$;

revoke all on function public.admin_cancel_match(uuid) from public;
grant execute on function public.admin_cancel_match(uuid) to authenticated;
