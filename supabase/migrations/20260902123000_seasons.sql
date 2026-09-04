create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create unique index seasons_one_active_idx
  on public.seasons (is_active)
  where is_active;

insert into public.seasons (name, starts_at, is_active)
values (
  'Saison 1',
  coalesce((select min(created_at) from public.matches), now()),
  true
);

alter table public.matches
  add column season_id uuid references public.seasons (id);

update public.matches
set season_id = (select id from public.seasons where is_active limit 1)
where season_id is null;

alter table public.matches alter column season_id set not null;

create index matches_season_status_idx
  on public.matches (season_id, status, ended_at desc);

create function public.assign_active_season()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.season_id is null then
    select id into new.season_id
    from public.seasons
    where is_active
    limit 1;
  end if;

  if new.season_id is null then
    raise exception using errcode = 'P0001', message = 'no_active_season';
  end if;

  return new;
end;
$$;

create trigger matches_assign_active_season
before insert on public.matches
for each row execute function public.assign_active_season();

alter table public.seasons enable row level security;

create policy seasons_read_authenticated
on public.seasons
for select
to authenticated
using (true);

grant select on public.seasons to authenticated;
revoke all on function public.assign_active_season() from public;

drop function if exists public.get_leaderboard(public.match_mode);

create function public.get_leaderboard(
  p_mode public.match_mode default null,
  p_season_id uuid default null
)
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
  with selected_season as (
    select coalesce(
      p_season_id,
      (select id from public.seasons where is_active limit 1)
    ) as id
  ),
  player_results as (
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
     and match.season_id = (select id from selected_season)
     and (p_mode is null or match.mode = p_mode)
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

revoke all on function public.get_leaderboard(public.match_mode, uuid) from public;
grant execute on function public.get_leaderboard(public.match_mode, uuid) to authenticated;
