create or replace function public.get_my_advanced_statistics()
returns table (
  total_goals bigint,
  average_goals numeric,
  current_win_streak bigint,
  best_win_streak bigint,
  favorite_opponent_name text,
  favorite_opponent_matches bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with results as (
    select
      match.id,
      coalesce(match.ended_at, match.updated_at) as played_at,
      participant.team_id = match.winner_team_id as won,
      case team.side when 1 then match.team_a_score else match.team_b_score end::bigint as goals
    from public.match_participants participant
    join public.match_teams team on team.id = participant.team_id and team.match_id = participant.match_id
    join public.matches match on match.id = participant.match_id and match.status = 'completed'
    where participant.user_id = auth.uid()
  ),
  grouped_results as (
    select *, sum(case when won then 0 else 1 end) over (order by played_at, id) as loss_group
    from results
  ),
  win_streaks as (
    select count(*)::bigint as length from grouped_results where won group by loss_group
  ),
  opponents as (
    select opponent.user_id, profile.display_name, count(distinct mine.match_id)::bigint as matches
    from public.match_participants mine
    join public.match_participants opponent on opponent.match_id = mine.match_id and opponent.team_id <> mine.team_id
    join public.profiles profile on profile.id = opponent.user_id
    join public.matches match on match.id = mine.match_id and match.status = 'completed'
    where mine.user_id = auth.uid()
    group by opponent.user_id, profile.display_name
  ),
  favorite as (
    select display_name, matches from opponents order by matches desc, display_name limit 1
  )
  select
    coalesce((select sum(goals) from results), 0)::bigint,
    coalesce((select round(avg(goals), 1) from results), 0),
    coalesce((
      select count(*) from results candidate
      where candidate.won and not exists (
        select 1 from results loss
        where not loss.won and (loss.played_at, loss.id) > (candidate.played_at, candidate.id)
      )
    ), 0)::bigint,
    coalesce((select max(length) from win_streaks), 0)::bigint,
    (select display_name from favorite),
    coalesce((select matches from favorite), 0)::bigint;
$$;

revoke all on function public.get_my_advanced_statistics() from public;
grant execute on function public.get_my_advanced_statistics() to authenticated;
