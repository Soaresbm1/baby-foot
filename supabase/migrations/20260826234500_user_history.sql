create or replace function public.get_my_match_history()
returns table (
  match_id uuid,
  played_at timestamptz,
  mode public.match_mode,
  target_score smallint,
  my_score smallint,
  opponent_score smallint,
  opponent_names text,
  result text,
  rematch_of uuid
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    match.id as match_id,
    coalesce(match.ended_at, match.updated_at) as played_at,
    match.mode,
    match.target_score,
    case my_team.side when 1 then match.team_a_score else match.team_b_score end as my_score,
    case my_team.side when 1 then match.team_b_score else match.team_a_score end as opponent_score,
    coalesce(
      string_agg(opponent_profile.display_name, ' & ' order by opponent.seat),
      'Adversaire inconnu'
    ) as opponent_names,
    case
      when match.status = 'cancelled' then 'cancelled'
      when match.winner_team_id = me.team_id then 'won'
      else 'lost'
    end as result,
    match.rematch_of
  from public.match_participants as me
  join public.matches as match on match.id = me.match_id
  join public.match_teams as my_team on my_team.id = me.team_id
  left join public.match_participants as opponent
    on opponent.match_id = match.id
   and opponent.team_id <> me.team_id
  left join public.profiles as opponent_profile on opponent_profile.id = opponent.user_id
  where me.user_id = auth.uid()
    and match.status in ('completed', 'cancelled')
  group by match.id, my_team.side, me.team_id
  order by coalesce(match.ended_at, match.updated_at) desc, match.id;
$$;

revoke all on function public.get_my_match_history() from public;
grant execute on function public.get_my_match_history() to authenticated;
