create or replace function public.cancel_waiting_match(p_match_id uuid)
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

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found or v_match.created_by <> v_user then
    raise exception using errcode = '42501', message = 'only_creator_can_cancel';
  end if;

  if v_match.status not in ('waiting_for_players', 'waiting_for_ready') then
    raise exception using errcode = 'P0001', message = 'match_already_started';
  end if;

  update public.matches
  set
    status = 'cancelled',
    cancel_reason = 'creator_cancelled',
    join_token_hash = null,
    ended_at = now(),
    updated_at = now()
  where id = p_match_id;

  insert into public.match_events (match_id, actor_id, type)
  values (p_match_id, v_user, 'match_cancelled');

  return 'cancelled';
end;
$$;

revoke all on function public.cancel_waiting_match(uuid) from public;
grant execute on function public.cancel_waiting_match(uuid) to authenticated;
