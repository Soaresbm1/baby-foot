create or replace function public.cancel_my_last_goal(p_match_id uuid, p_request_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_match public.matches%rowtype;
  v_goal public.match_events%rowtype;
  v_side smallint;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found or v_match.status not in ('in_progress', 'awaiting_confirmation') then
    raise exception using errcode = 'P0001', message = 'goal_cannot_be_cancelled';
  end if;
  if v_match.status = 'awaiting_confirmation' and exists (
    select 1 from public.match_confirmations where match_id = p_match_id
  ) then raise exception using errcode = 'P0001', message = 'result_already_confirmed'; end if;

  select event.* into v_goal
  from public.match_events event
  where event.match_id = p_match_id and event.actor_id = v_user and event.type = 'goal'
    and event.created_at >= now() - interval '3 seconds'
    and not exists (select 1 from public.match_events cancellation where cancellation.cancels_event_id = event.id)
  order by event.created_at desc, event.id desc limit 1 for update;
  if not found then raise exception using errcode = 'P0001', message = 'undo_window_expired'; end if;

  select side into v_side from public.match_teams where id = v_goal.team_id and match_id = p_match_id;
  if v_side = 1 then v_match.team_a_score := greatest(v_match.team_a_score - 1, 0);
  else v_match.team_b_score := greatest(v_match.team_b_score - 1, 0);
  end if;
  if v_match.status = 'awaiting_confirmation' then v_match.status := 'in_progress'; end if;

  insert into public.match_events (match_id, actor_id, team_id, type, request_id, cancels_event_id)
  values (p_match_id, v_user, v_goal.team_id, 'goal_cancelled', p_request_id, v_goal.id);
  update public.matches set team_a_score = v_match.team_a_score, team_b_score = v_match.team_b_score,
    status = v_match.status, updated_at = now() where id = p_match_id returning * into v_match;
  return v_match;
end;
$$;

create or replace function public.reject_result(p_match_id uuid)
returns public.match_status
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_user uuid := auth.uid();
begin
  perform 1 from public.matches where id = p_match_id and status = 'awaiting_confirmation' for update;
  if not found then raise exception using errcode = 'P0001', message = 'result_not_awaiting_confirmation'; end if;
  if not public.is_match_participant(p_match_id) then raise exception using errcode = '42501', message = 'not_a_participant'; end if;
  update public.matches set status = 'cancelled', cancel_reason = 'result_rejected', rejected_by = v_user,
    rejected_at = now(), ended_at = now(), updated_at = now() where id = p_match_id;
  insert into public.match_events (match_id, actor_id, type) values (p_match_id, v_user, 'result_rejected');
  return 'cancelled';
end;
$$;

create or replace function public.create_rematch(p_match_id uuid)
returns table (match_id uuid, join_token text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user uuid := auth.uid(); v_previous public.matches%rowtype;
  v_match uuid := gen_random_uuid(); v_team_a uuid := gen_random_uuid();
  v_token text := encode(gen_random_bytes(32), 'hex');
begin
  select * into v_previous from public.matches where id = p_match_id;
  if not found or v_previous.status not in ('completed', 'cancelled') then
    raise exception using errcode = 'P0001', message = 'rematch_not_available';
  end if;
  if not public.is_match_participant(p_match_id) then raise exception using errcode = '42501', message = 'not_a_participant'; end if;
  insert into public.matches (id, mode, target_score, created_by, join_token_hash, rematch_of)
  values (v_match, v_previous.mode, v_previous.target_score, v_user, digest(v_token, 'sha256'), p_match_id);
  insert into public.match_teams (id, match_id, side) values (v_team_a, v_match, 1), (gen_random_uuid(), v_match, 2);
  insert into public.match_participants (match_id, team_id, user_id, seat) values (v_match, v_team_a, v_user, 1);
  insert into public.match_events (match_id, actor_id, type, metadata)
  values (v_match, v_user, 'rematch_created', jsonb_build_object('previous_match_id', p_match_id));
  return query select v_match, v_token;
end;
$$;

revoke all on function public.cancel_my_last_goal(uuid, uuid) from public;
revoke all on function public.reject_result(uuid) from public;
revoke all on function public.create_rematch(uuid) from public;
grant execute on function public.cancel_my_last_goal(uuid, uuid) to authenticated;
grant execute on function public.reject_result(uuid) to authenticated;
grant execute on function public.create_rematch(uuid) to authenticated;
