create or replace function public.get_admin_matches(p_filter text default 'all')
returns table (
  id uuid,
  mode public.match_mode,
  status public.match_status,
  team_a_score smallint,
  team_b_score smallint,
  target_score smallint,
  created_at timestamptz,
  creator_name text,
  participant_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_filter text := coalesce(p_filter, 'all');
begin
  if not public.current_user_is_admin() then
    raise exception using errcode = '42501', message = 'administrator_required';
  end if;

  if v_filter not in ('all', 'active', 'completed', 'cancelled') then
    v_filter := 'all';
  end if;

  return query
  select
    match.id,
    match.mode,
    match.status,
    match.team_a_score,
    match.team_b_score,
    match.target_score,
    match.created_at,
    creator.display_name as creator_name,
    count(participant.id)::bigint as participant_count
  from public.matches as match
  join public.profiles as creator on creator.id = match.created_by
  left join public.match_participants as participant on participant.match_id = match.id
  where v_filter = 'all'
     or (v_filter = 'active' and match.status in ('waiting_for_players', 'waiting_for_ready', 'in_progress', 'awaiting_confirmation'))
     or (v_filter = 'completed' and match.status = 'completed')
     or (v_filter = 'cancelled' and match.status = 'cancelled')
  group by match.id, creator.display_name
  order by match.created_at desc
  limit 50;
end;
$$;

revoke all on function public.get_admin_matches(text) from public;
grant execute on function public.get_admin_matches(text) to authenticated;
