create or replace function public.add_goal(p_match_id uuid, p_team_id uuid, p_request_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_match public.matches%rowtype;
  v_side smallint;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found or v_match.status <> 'in_progress' then
    raise exception using errcode = 'P0001', message = 'match_not_in_progress';
  end if;
  select team.side into v_side
  from public.match_participants participant
  join public.match_teams team on team.id = participant.team_id and team.match_id = participant.match_id
  where participant.match_id = p_match_id
    and participant.user_id = v_user
    and participant.team_id = p_team_id;
  if v_side is null then
    raise exception using errcode = '42501', message = 'can_only_score_for_own_team';
  end if;
  if exists (select 1 from public.match_events where match_id = p_match_id and request_id = p_request_id) then
    return v_match;
  end if;
  if v_side = 1 then v_match.team_a_score := v_match.team_a_score + 1;
  else v_match.team_b_score := v_match.team_b_score + 1;
  end if;
  insert into public.match_events (match_id, actor_id, team_id, type, request_id)
  values (p_match_id, v_user, p_team_id, 'goal', p_request_id);
  if greatest(v_match.team_a_score, v_match.team_b_score) = v_match.target_score then
    v_match.status := 'awaiting_confirmation';
    insert into public.match_events (match_id, actor_id, team_id, type)
    values (p_match_id, v_user, p_team_id, 'result_proposed');
  end if;
  update public.matches
  set team_a_score = v_match.team_a_score, team_b_score = v_match.team_b_score,
      status = v_match.status, updated_at = now()
  where id = p_match_id returning * into v_match;
  return v_match;
end;
$$;

revoke all on function public.add_goal(uuid, uuid, uuid) from public;
grant execute on function public.add_goal(uuid, uuid, uuid) to authenticated;
