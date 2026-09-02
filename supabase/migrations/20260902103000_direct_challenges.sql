alter table public.matches
  add column if not exists invited_user_id uuid references public.profiles (id);

alter table public.matches
  drop constraint if exists matches_invited_user_not_creator_check;

alter table public.matches
  add constraint matches_invited_user_not_creator_check
  check (invited_user_id is null or invited_user_id <> created_by);

create index if not exists matches_invited_user_idx
  on public.matches (invited_user_id, status)
  where invited_user_id is not null;

create or replace function public.create_challenge(p_opponent_id uuid, p_target_score integer default 10)
returns table (match_id uuid, join_token text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_match_id uuid;
  v_team_id uuid;
  v_token text;
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if p_opponent_id = v_user then
    raise exception using errcode = 'P0001', message = 'cannot_challenge_yourself';
  end if;
  if not exists (select 1 from public.profiles where id = p_opponent_id) then
    raise exception using errcode = 'P0001', message = 'opponent_not_found';
  end if;
  if p_target_score not in (5, 10, 15) then
    raise exception using errcode = 'P0001', message = 'invalid_target_score';
  end if;

  v_token := rtrim(translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.matches (mode, target_score, created_by, invited_user_id, join_token_hash)
  values ('one_v_one', p_target_score, v_user, p_opponent_id, digest(v_token, 'sha256'))
  returning id into v_match_id;

  insert into public.match_teams (match_id, side) values (v_match_id, 1) returning id into v_team_id;
  insert into public.match_teams (match_id, side) values (v_match_id, 2);
  insert into public.match_participants (match_id, team_id, user_id, seat)
  values (v_match_id, v_team_id, v_user, 1);
  insert into public.match_events (match_id, actor_id, type, metadata)
  values (v_match_id, v_user, 'match_created', jsonb_build_object('mode', 'one_v_one', 'target_score', p_target_score, 'challenged_user_id', p_opponent_id));

  return query select v_match_id, v_token;
end;
$$;

create or replace function public.join_match(p_token text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_match public.matches%rowtype;
  v_team_id uuid;
  v_seat smallint;
  v_player_count integer;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if p_token is null or char_length(p_token) < 32 then raise exception using errcode = 'P0001', message = 'invalid_join_token'; end if;

  select * into v_match from public.matches
  where join_token_hash = digest(p_token, 'sha256')
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'match_not_found'; end if;
  if v_match.status not in ('waiting_for_players', 'waiting_for_ready') then
    raise exception using errcode = 'P0001', message = 'match_already_started';
  end if;
  if exists (select 1 from public.match_participants where match_id = v_match.id and user_id = v_user) then
    return v_match.id;
  end if;
  if v_match.invited_user_id is not null and v_match.invited_user_id <> v_user then
    raise exception using errcode = '42501', message = 'invitation_reserved_for_another_player';
  end if;

  select count(*) into v_player_count from public.match_participants where match_id = v_match.id;
  if v_player_count >= public.required_player_count(v_match.mode) then
    raise exception using errcode = 'P0001', message = 'match_full';
  end if;

  select team.id, seat.seat into v_team_id, v_seat
  from public.match_teams as team
  cross join lateral generate_series(1, case v_match.mode when 'one_v_one' then 1 else 2 end) as seat(seat)
  left join public.match_participants as participant on participant.team_id = team.id and participant.seat = seat.seat
  where team.match_id = v_match.id and participant.id is null
  order by case when v_match.mode = 'one_v_one' then team.side else seat.seat end, team.side
  limit 1;

  insert into public.match_participants (match_id, team_id, user_id, seat)
  values (v_match.id, v_team_id, v_user, v_seat);
  insert into public.match_events (match_id, actor_id, team_id, type)
  values (v_match.id, v_user, v_team_id, 'player_joined');

  v_player_count := v_player_count + 1;
  if v_player_count = public.required_player_count(v_match.mode) then
    update public.matches set status = 'waiting_for_ready', join_token_hash = null where id = v_match.id;
  end if;
  return v_match.id;
end;
$$;

revoke all on function public.create_challenge(uuid, integer) from public;
revoke all on function public.join_match(text) from public;
grant execute on function public.create_challenge(uuid, integer) to authenticated;
grant execute on function public.join_match(text) to authenticated;
