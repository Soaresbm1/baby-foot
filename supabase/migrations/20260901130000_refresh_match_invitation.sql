alter type public.match_event_type add value if not exists 'invitation_refreshed' after 'player_left';

create or replace function public.refresh_match_invitation(p_match_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_match public.matches%rowtype;
  v_token text := encode(gen_random_bytes(32), 'hex');
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found or v_match.created_by <> v_user then
    raise exception using errcode = '42501', message = 'only_creator_can_refresh_invitation';
  end if;

  if v_match.status <> 'waiting_for_players' then
    raise exception using errcode = 'P0001', message = 'invitation_not_available';
  end if;

  update public.matches
  set join_token_hash = digest(v_token, 'sha256'), updated_at = now()
  where id = p_match_id;

  insert into public.match_events (match_id, actor_id, type)
  values (p_match_id, v_user, 'invitation_refreshed');

  return v_token;
end;
$$;

revoke all on function public.refresh_match_invitation(uuid) from public;
grant execute on function public.refresh_match_invitation(uuid) to authenticated;
