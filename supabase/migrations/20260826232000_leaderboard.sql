create or replace function public.get_leaderboard()
returns table (
  player_id uuid,
  display_name text,
  avatar_url text,
  matches_played bigint,
  wins bigint,
  losses bigint,
  goals_for bigint,
  goals_against bigint,
  goal_difference bigint,
  win_rate numeric,
  rank bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with player_results as (
    select
      participant.user_id as player_id,
      match.id as match_id,
      participant.team_id = match.winner_team_id as won,
      case team.side when 1 then match.team_a_score else match.team_b_score end::bigint as goals_for,
      case team.side when 1 then match.team_b_score else match.team_a_score end::bigint as goals_against
    from public.match_participants as participant
    join public.match_teams as team
      on team.id = participant.team_id
     and team.match_id = participant.match_id
    join public.matches as match
      on match.id = participant.match_id
     and match.status = 'completed'
  ),
  statistics as (
    select
      profile.id as player_id,
      profile.display_name,
      profile.avatar_url,
      count(result.match_id) as matches_played,
      count(result.match_id) filter (where result.won) as wins,
      count(result.match_id) filter (where not result.won) as losses,
      coalesce(sum(result.goals_for), 0)::bigint as goals_for,
      coalesce(sum(result.goals_against), 0)::bigint as goals_against
    from public.profiles as profile
    join player_results as result on result.player_id = profile.id
    group by profile.id, profile.display_name, profile.avatar_url
  )
  select
    statistics.player_id,
    statistics.display_name,
    statistics.avatar_url,
    statistics.matches_played,
    statistics.wins,
    statistics.losses,
    statistics.goals_for,
    statistics.goals_against,
    statistics.goals_for - statistics.goals_against as goal_difference,
    round(statistics.wins::numeric * 100 / nullif(statistics.matches_played, 0), 1) as win_rate,
    rank() over (
      order by
        statistics.wins desc,
        statistics.wins::numeric / nullif(statistics.matches_played, 0) desc,
        statistics.goals_for - statistics.goals_against desc,
        statistics.display_name
    ) as rank
  from statistics
  order by rank, statistics.display_name;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;
