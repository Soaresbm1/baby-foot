alter type public.match_cancel_reason add value if not exists 'challenge_declined';

create or replace function public.get_my_sent_challenges()
returns table (
  match_id uuid,
  opponent_id uuid,
  opponent_name text,
  opponent_avatar_url text,
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
    opponent.id,
    opponent.display_name,
    opponent.avatar_url,
    match.target_score,
    match.created_at
  from public.matches as match
  join public.profiles as opponent on opponent.id = match.invited_user_id
  where match.created_by = auth.uid()
    and match.status = 'waiting_for_players'
    and match.invited_user_id is not null
  order by match.created_at desc
  limit 50;
$$;

create or replace function public.decline_challenge(p_match_id uuid)
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

  if not found or v_match.invited_user_id <> v_user then
    raise exception using errcode = '42501', message = 'challenge_not_available';
  end if;
  if v_match.status <> 'waiting_for_players' then
    raise exception using errcode = 'P0001', message = 'challenge_not_available';
  end if;

  update public.matches
  set
    status = 'cancelled',
    cancel_reason = 'challenge_declined',
    join_token_hash = null,
    ended_at = now(),
    updated_at = now()
  where id = p_match_id;

  insert into public.match_events (match_id, actor_id, type, metadata)
  values (p_match_id, v_user, 'match_cancelled', jsonb_build_object('reason', 'challenge_declined'));

  return 'cancelled';
end;
$$;

create or replace function public.withdraw_challenge(p_match_id uuid)
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

  if not found or v_match.created_by <> v_user or v_match.invited_user_id is null then
    raise exception using errcode = '42501', message = 'challenge_not_available';
  end if;
  if v_match.status <> 'waiting_for_players' then
    raise exception using errcode = 'P0001', message = 'challenge_not_available';
  end if;

  update public.matches
  set
    status = 'cancelled',
    cancel_reason = 'creator_cancelled',
    join_token_hash = null,
    ended_at = now(),
    updated_at = now()
  where id = p_match_id;

  insert into public.match_events (match_id, actor_id, type, metadata)
  values (p_match_id, v_user, 'match_cancelled', jsonb_build_object('reason', 'challenge_withdrawn'));

  return 'cancelled';
end;
$$;

revoke all on function public.get_my_sent_challenges() from public;
revoke all on function public.decline_challenge(uuid) from public;
revoke all on function public.withdraw_challenge(uuid) from public;
grant execute on function public.get_my_sent_challenges() to authenticated;
grant execute on function public.decline_challenge(uuid) to authenticated;
grant execute on function public.withdraw_challenge(uuid) to authenticated;
