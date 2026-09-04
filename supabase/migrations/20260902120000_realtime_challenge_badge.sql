drop policy if exists matches_read_invited_user on public.matches;

create policy matches_read_invited_user
on public.matches
for select
to authenticated
using (invited_user_id = auth.uid());

create or replace function public.get_my_pending_challenge_count()
returns bigint
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select count(*)
  from public.matches as match
  where match.invited_user_id = auth.uid()
    and match.status = 'waiting_for_players'
    and not exists (
      select 1
      from public.match_participants as participant
      where participant.match_id = match.id
        and participant.user_id = auth.uid()
    );
$$;

revoke all on function public.get_my_pending_challenge_count() from public;
grant execute on function public.get_my_pending_challenge_count() to authenticated;
