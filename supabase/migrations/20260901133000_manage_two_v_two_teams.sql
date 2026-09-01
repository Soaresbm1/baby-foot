alter type public.match_event_type add value if not exists 'player_moved' after 'player_ready';

alter table public.match_participants
  drop constraint if exists match_participants_team_id_seat_key;

alter table public.match_participants
  add constraint match_participants_team_id_seat_key
  unique (team_id, seat) deferrable initially immediate;

create or replace function public.switch_participant_team(p_match_id uuid, p_participant_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_match public.matches%rowtype;
  v_participant public.match_participants%rowtype;
  v_target_team uuid;
  v_target_seat smallint;
  v_occupant uuid;
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found or v_match.created_by <> v_user then
    raise exception using errcode = '42501', message = 'only_creator_can_manage_teams';
  end if;

  if v_match.mode <> 'two_v_two' or v_match.status not in ('waiting_for_players', 'waiting_for_ready') then
    raise exception using errcode = 'P0001', message = 'teams_are_locked';
  end if;

  select * into v_participant
  from public.match_participants
  where id = p_participant_id and match_id = p_match_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'participant_not_found';
  end if;

  select id into v_target_team
  from public.match_teams
  where match_id = p_match_id and id <> v_participant.team_id;

  select candidate.seat::smallint into v_target_seat
  from generate_series(1, 2) as candidate(seat)
  where not exists (
    select 1 from public.match_participants
    where team_id = v_target_team and seat = candidate.seat
  )
  order by candidate.seat
  limit 1;

  if v_target_seat is null then
    v_target_seat := v_participant.seat;
  end if;

  select id into v_occupant
  from public.match_participants
  where team_id = v_target_team and seat = v_target_seat
  for update;

  set constraints match_participants_team_id_seat_key deferred;

  if v_occupant is not null then
    update public.match_participants
    set team_id = v_participant.team_id, seat = v_participant.seat
    where id = v_occupant;
  end if;

  update public.match_participants
  set team_id = v_target_team, seat = v_target_seat
  where id = p_participant_id;

  update public.match_participants
  set is_ready = false, ready_at = null
  where match_id = p_match_id;

  update public.matches set updated_at = now() where id = p_match_id;

  insert into public.match_events (match_id, actor_id, team_id, type, metadata)
  values (
    p_match_id,
    v_user,
    v_target_team,
    'player_moved',
    jsonb_build_object('participant_id', p_participant_id, 'seat', v_target_seat)
  );
end;
$$;

revoke all on function public.switch_participant_team(uuid, uuid) from public;
grant execute on function public.switch_participant_team(uuid, uuid) to authenticated;
