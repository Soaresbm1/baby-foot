create or replace function public.get_my_pending_challenges()
returns table (
  match_id uuid,
  challenger_id uuid,
  challenger_name text,
  challenger_avatar_url text,
  target_score smallint,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    match.id,
    creator.id,
    creator.display_name,
    creator.avatar_url,
    match.target_score,
    match.created_at
  from public.matches as match
  join public.profiles as creator on creator.id = match.created_by
  where match.invited_user_id = auth.uid()
    and match.status = 'waiting_for_players'
    and not exists (
      select 1 from public.match_participants as participant
      where participant.match_id = match.id and participant.user_id = auth.uid()
    )
  order by match.created_at desc
  limit 50;
$$;

create or replace function public.accept_challenge(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_match public.matches%rowtype;
  v_team_id uuid;
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found or v_match.invited_user_id <> v_user then
    raise exception using errcode = '42501', message = 'challenge_not_available';
  end if;
  if exists (
    select 1 from public.match_participants
    where match_id = p_match_id and user_id = v_user
  ) then
    return p_match_id;
  end if;
  if v_match.mode <> 'one_v_one' or v_match.status <> 'waiting_for_players' then
    raise exception using errcode = 'P0001', message = 'challenge_not_available';
  end if;

  select id into v_team_id
  from public.match_teams
  where match_id = p_match_id and side = 2;

  insert into public.match_participants (match_id, team_id, user_id, seat)
  values (p_match_id, v_team_id, v_user, 1);

  insert into public.match_events (match_id, actor_id, team_id, type, metadata)
  values (p_match_id, v_user, v_team_id, 'player_joined', jsonb_build_object('challenge_accepted', true));

  update public.matches
  set status = 'waiting_for_ready', join_token_hash = null, updated_at = now()
  where id = p_match_id;

  return p_match_id;
end;
$$;

revoke all on function public.get_my_pending_challenges() from public;
revoke all on function public.accept_challenge(uuid) from public;
grant execute on function public.get_my_pending_challenges() to authenticated;
grant execute on function public.accept_challenge(uuid) to authenticated;
