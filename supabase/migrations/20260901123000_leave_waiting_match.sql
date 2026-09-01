alter table public.matches alter column join_token_hash drop not null;

alter type public.match_event_type add value if not exists 'player_left' after 'player_joined';

create or replace function public.leave_waiting_match(p_match_id uuid)
returns void
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

  if not found or v_match.status not in ('waiting_for_players', 'waiting_for_ready') then
    raise exception using errcode = 'P0001', message = 'match_already_started';
  end if;

  if v_match.created_by = v_user then
    raise exception using errcode = '42501', message = 'creator_must_cancel_match';
  end if;

  if not exists (
    select 1 from public.match_participants
    where match_id = p_match_id and user_id = v_user
  ) then
    raise exception using errcode = '42501', message = 'not_a_participant';
  end if;

  insert into public.match_events (match_id, actor_id, type)
  values (p_match_id, v_user, 'player_left');

  delete from public.match_participants
  where match_id = p_match_id and user_id = v_user;

  update public.match_participants
  set is_ready = false, ready_at = null
  where match_id = p_match_id;

  update public.matches
  set status = 'waiting_for_players', updated_at = now()
  where id = p_match_id;
end;
$$;

revoke all on function public.leave_waiting_match(uuid) from public;
grant execute on function public.leave_waiting_match(uuid) to authenticated;
