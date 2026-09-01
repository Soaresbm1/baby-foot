create or replace function public.get_admin_players(p_search text default null)
returns table (
  id uuid,
  display_name text,
  email text,
  is_admin boolean,
  created_at timestamptz,
  matches_played bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_search text := left(trim(coalesce(p_search, '')), 80);
begin
  if not public.current_user_is_admin() then
    raise exception using errcode = '42501', message = 'administrator_required';
  end if;

  return query
  select
    profile.id,
    profile.display_name,
    profile.email,
    profile.is_admin,
    profile.created_at,
    count(participant.match_id)::bigint as matches_played
  from public.profiles as profile
  left join public.match_participants as participant on participant.user_id = profile.id
  where v_search = ''
     or profile.display_name ilike '%' || v_search || '%'
     or profile.email ilike '%' || v_search || '%'
  group by profile.id
  order by profile.created_at desc
  limit 50;
end;
$$;

revoke all on function public.get_admin_players(text) from public;
grant execute on function public.get_admin_players(text) to authenticated;
