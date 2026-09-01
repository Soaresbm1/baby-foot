alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce((
    select profile.is_admin
    from public.profiles as profile
    where profile.id = auth.uid()
  ), false);
$$;

create or replace function public.get_admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
begin
  if not public.current_user_is_admin() then
    raise exception using errcode = '42501', message = 'administrator_required';
  end if;

  select jsonb_build_object(
    'statistics', jsonb_build_object(
      'players', (select count(*) from public.profiles),
      'matches', (select count(*) from public.matches),
      'completed_matches', (select count(*) from public.matches where status = 'completed'),
      'active_matches', (select count(*) from public.matches where status in ('waiting_for_players', 'waiting_for_ready', 'in_progress', 'awaiting_confirmation'))
    ),
    'players', coalesce((
      select jsonb_agg(to_jsonb(player_row) order by player_row.created_at desc)
      from (
        select
          profile.id,
          profile.display_name,
          profile.email,
          profile.is_admin,
          profile.created_at,
          count(participant.match_id)::bigint as matches_played
        from public.profiles as profile
        left join public.match_participants as participant on participant.user_id = profile.id
        group by profile.id
        order by profile.created_at desc
        limit 20
      ) as player_row
    ), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(to_jsonb(match_row) order by match_row.created_at desc)
      from (
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
        group by match.id, creator.display_name
        order by match.created_at desc
        limit 20
      ) as match_row
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.current_user_is_admin() from public;
revoke all on function public.get_admin_dashboard() from public;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.get_admin_dashboard() to authenticated;

-- Le premier administrateur doit être désigné manuellement avec :
-- update public.profiles set is_admin = true where lower(email) = lower('prenom.nom@example.com');
