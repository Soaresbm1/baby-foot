create or replace function public.get_player_directory(p_search text default null)
returns table (
  player_id uuid,
  display_name text,
  avatar_url text,
  matches_played bigint,
  wins bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_search text := left(trim(coalesce(p_search, '')), 80);
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  return query
  select
    profile.id,
    profile.display_name,
    profile.avatar_url,
    count(match.id)::bigint as matches_played,
    count(match.id) filter (where participant.team_id = match.winner_team_id)::bigint as wins
  from public.profiles as profile
  left join public.match_participants as participant on participant.user_id = profile.id
  left join public.matches as match on match.id = participant.match_id and match.status = 'completed'
  where v_search = '' or profile.display_name ilike '%' || v_search || '%'
  group by profile.id
  order by profile.display_name
  limit 50;
end;
$$;

revoke all on function public.get_player_directory(text) from public;
grant execute on function public.get_player_directory(text) to authenticated;
