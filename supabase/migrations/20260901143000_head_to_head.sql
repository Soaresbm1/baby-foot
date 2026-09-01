create or replace function public.get_head_to_head(p_opponent_id uuid)
returns table (
  matches_played bigint,
  wins bigint,
  losses bigint,
  goals_for bigint,
  goals_against bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with shared_matches as (
    select
      match.id,
      mine.team_id = match.winner_team_id as won,
      case mine_team.side when 1 then match.team_a_score else match.team_b_score end::bigint as my_goals,
      case mine_team.side when 1 then match.team_b_score else match.team_a_score end::bigint as opponent_goals
    from public.match_participants mine
    join public.match_participants opponent
      on opponent.match_id = mine.match_id
     and opponent.user_id = p_opponent_id
     and opponent.team_id <> mine.team_id
    join public.match_teams mine_team
      on mine_team.id = mine.team_id
     and mine_team.match_id = mine.match_id
    join public.matches match
      on match.id = mine.match_id
     and match.status = 'completed'
    where mine.user_id = auth.uid()
  )
  select
    count(*)::bigint,
    count(*) filter (where won)::bigint,
    count(*) filter (where not won)::bigint,
    coalesce(sum(my_goals), 0)::bigint,
    coalesce(sum(opponent_goals), 0)::bigint
  from shared_matches;
$$;

revoke all on function public.get_head_to_head(uuid) from public;
grant execute on function public.get_head_to_head(uuid) to authenticated;
