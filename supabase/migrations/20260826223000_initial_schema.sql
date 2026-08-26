create extension if not exists pgcrypto with schema extensions;

create type public.match_mode as enum ('one_v_one', 'two_v_two');
create type public.match_status as enum (
  'waiting_for_players', 'waiting_for_ready', 'in_progress',
  'awaiting_confirmation', 'completed', 'cancelled'
);
create type public.match_event_type as enum (
  'match_created', 'player_joined', 'player_ready', 'match_started',
  'goal', 'goal_cancelled', 'result_proposed', 'result_confirmed',
  'result_rejected', 'match_cancelled', 'match_finished', 'rematch_created'
);
create type public.match_cancel_reason as enum (
  'result_rejected', 'creator_cancelled', 'administrative'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 50),
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  mode public.match_mode not null,
  status public.match_status not null default 'waiting_for_players',
  target_score smallint not null check (target_score between 1 and 30),
  created_by uuid not null references public.profiles (id),
  join_token_hash bytea not null unique,
  team_a_score smallint not null default 0 check (team_a_score >= 0),
  team_b_score smallint not null default 0 check (team_b_score >= 0),
  winner_team_id uuid,
  cancel_reason public.match_cancel_reason,
  rejected_by uuid references public.profiles (id),
  rejected_at timestamptz,
  rematch_of uuid references public.matches (id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  check (team_a_score <= target_score and team_b_score <= target_score),
  check ((status = 'cancelled') = (cancel_reason is not null)),
  check ((rejected_by is null) = (rejected_at is null))
);

create table public.match_teams (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  side smallint not null check (side in (1, 2)),
  label text,
  unique (match_id, side),
  unique (id, match_id)
);

alter table public.matches
  add constraint matches_winner_team_fk
  foreign key (winner_team_id, id) references public.match_teams (id, match_id);

create table public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  team_id uuid not null,
  user_id uuid not null references public.profiles (id),
  seat smallint not null check (seat in (1, 2)),
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  ready_at timestamptz,
  unique (match_id, user_id),
  unique (team_id, seat),
  foreign key (team_id, match_id) references public.match_teams (id, match_id) on delete cascade,
  check ((is_ready and ready_at is not null) or (not is_ready and ready_at is null))
);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  actor_id uuid not null references public.profiles (id),
  team_id uuid references public.match_teams (id),
  type public.match_event_type not null,
  request_id uuid,
  cancels_event_id uuid unique references public.match_events (id),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.match_confirmations (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  confirmed_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create index matches_status_updated_idx on public.matches (status, updated_at desc);
create index matches_created_by_idx on public.matches (created_by);
create index matches_rematch_of_idx on public.matches (rematch_of);
create index participants_match_idx on public.match_participants (match_id);
create index events_match_created_idx on public.match_events (match_id, created_at, id);
create unique index events_match_request_idx on public.match_events (match_id, request_id)
  where request_id is not null;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)), 50),
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- The migration can be installed after users have already signed up. Backfill their
-- profiles so foreign keys used by match creation are immediately satisfied.
insert into public.profiles (id, display_name, email, avatar_url)
select
  id,
  left(
    case
      when char_length(coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), split_part(email, '@', 1))) >= 2
        then coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), split_part(email, '@', 1))
      else coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), split_part(email, '@', 1)) || '_'
    end,
    50
  ),
  lower(email),
  nullif(raw_user_meta_data ->> 'avatar_url', '')
from auth.users
on conflict (id) do nothing;

create function public.is_match_participant(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.match_participants
    where match_id = p_match_id and user_id = auth.uid()
  );
$$;

create function public.create_match(p_mode public.match_mode, p_target_score smallint default 10)
returns table (match_id uuid, join_token text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_match uuid := gen_random_uuid();
  v_team_a uuid := gen_random_uuid();
  v_token text := encode(gen_random_bytes(32), 'hex');
begin
  if v_user is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if p_target_score not between 1 and 30 then raise exception using errcode = '22023', message = 'invalid_target_score'; end if;

  insert into public.matches (id, mode, target_score, created_by, join_token_hash)
  values (v_match, p_mode, p_target_score, v_user, digest(v_token, 'sha256'));
  insert into public.match_teams (id, match_id, side) values
    (v_team_a, v_match, 1), (gen_random_uuid(), v_match, 2);
  insert into public.match_participants (match_id, team_id, user_id, seat)
  values (v_match, v_team_a, v_user, 1);
  insert into public.match_events (match_id, actor_id, type)
  values (v_match, v_user, 'match_created');
  return query select v_match, v_token;
end;
$$;

create function public.join_match(p_token text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_match public.matches%rowtype;
  v_team uuid;
  v_capacity smallint;
  v_seat smallint;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select * into v_match from public.matches
  where join_token_hash = digest(lower(p_token), 'sha256') for update;
  if not found or v_match.status <> 'waiting_for_players' then
    raise exception using errcode = '22023', message = 'invalid_or_expired_invitation';
  end if;
  if exists (select 1 from public.match_participants where match_id = v_match.id and user_id = v_user) then
    return v_match.id;
  end if;
  v_capacity := case v_match.mode when 'one_v_one' then 1 else 2 end;
  select t.id, coalesce(max(p.seat), 0) + 1 into v_team, v_seat
  from public.match_teams t left join public.match_participants p on p.team_id = t.id
  where t.match_id = v_match.id
  group by t.id, t.side having count(p.id) < v_capacity
  order by count(p.id), t.side desc limit 1;
  if v_team is null then raise exception using errcode = 'P0001', message = 'match_full'; end if;
  insert into public.match_participants (match_id, team_id, user_id, seat)
  values (v_match.id, v_team, v_user, v_seat);
  insert into public.match_events (match_id, actor_id, team_id, type)
  values (v_match.id, v_user, v_team, 'player_joined');
  if (select count(*) from public.match_participants where match_id = v_match.id) = v_capacity * 2 then
    update public.matches set status = 'waiting_for_ready', updated_at = now() where id = v_match.id;
  end if;
  return v_match.id;
end;
$$;

create function public.set_ready(p_match_id uuid, p_ready boolean)
returns public.match_status
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_user uuid := auth.uid(); v_status public.match_status;
begin
  perform 1 from public.matches where id = p_match_id and status = 'waiting_for_ready' for update;
  if not found then raise exception using errcode = 'P0001', message = 'match_not_waiting_for_ready'; end if;
  update public.match_participants set is_ready = p_ready, ready_at = case when p_ready then now() end
  where match_id = p_match_id and user_id = v_user;
  if not found then raise exception using errcode = '42501', message = 'not_a_participant'; end if;
  insert into public.match_events (match_id, actor_id, type, metadata)
  values (p_match_id, v_user, 'player_ready', jsonb_build_object('ready', p_ready));
  if not exists (select 1 from public.match_participants where match_id = p_match_id and not is_ready) then
    update public.matches set status = 'in_progress', started_at = now(), updated_at = now()
    where id = p_match_id returning status into v_status;
    insert into public.match_events (match_id, actor_id, type) values (p_match_id, v_user, 'match_started');
  else v_status := 'waiting_for_ready';
  end if;
  return v_status;
end;
$$;

create function public.add_goal(p_match_id uuid, p_team_id uuid, p_request_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_user uuid := auth.uid(); v_match public.matches%rowtype; v_side smallint;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if v_match.status <> 'in_progress' then raise exception using errcode = 'P0001', message = 'match_not_in_progress'; end if;
  if not public.is_match_participant(p_match_id) then raise exception using errcode = '42501', message = 'not_a_participant'; end if;
  select side into v_side from public.match_teams where id = p_team_id and match_id = p_match_id;
  if v_side is null then raise exception using errcode = '22023', message = 'invalid_team'; end if;
  if exists (select 1 from public.match_events where match_id = p_match_id and request_id = p_request_id) then return v_match; end if;
  if v_side = 1 then v_match.team_a_score := v_match.team_a_score + 1; else v_match.team_b_score := v_match.team_b_score + 1; end if;
  insert into public.match_events (match_id, actor_id, team_id, type, request_id)
  values (p_match_id, v_user, p_team_id, 'goal', p_request_id);
  if greatest(v_match.team_a_score, v_match.team_b_score) = v_match.target_score then
    v_match.status := 'awaiting_confirmation';
    insert into public.match_events (match_id, actor_id, team_id, type)
    values (p_match_id, v_user, p_team_id, 'result_proposed');
  end if;
  update public.matches set team_a_score = v_match.team_a_score, team_b_score = v_match.team_b_score,
    status = v_match.status, updated_at = now() where id = p_match_id returning * into v_match;
  return v_match;
end;
$$;

create function public.confirm_result(p_match_id uuid)
returns public.match_status
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_user uuid := auth.uid(); v_status public.match_status; v_winner uuid;
begin
  perform 1 from public.matches where id = p_match_id and status = 'awaiting_confirmation' for update;
  if not found then raise exception using errcode = 'P0001', message = 'result_not_awaiting_confirmation'; end if;
  if not public.is_match_participant(p_match_id) then raise exception using errcode = '42501', message = 'not_a_participant'; end if;
  insert into public.match_confirmations (match_id, user_id) values (p_match_id, v_user) on conflict do nothing;
  insert into public.match_events (match_id, actor_id, type) values (p_match_id, v_user, 'result_confirmed');
  if (select count(*) from public.match_confirmations where match_id = p_match_id) =
     (select count(*) from public.match_participants where match_id = p_match_id) then
    select t.id into v_winner from public.match_teams t join public.matches m on m.id = t.match_id
    where t.match_id = p_match_id and t.side = case when m.team_a_score > m.team_b_score then 1 else 2 end;
    update public.matches set status = 'completed', winner_team_id = v_winner, ended_at = now(), updated_at = now()
    where id = p_match_id returning status into v_status;
    insert into public.match_events (match_id, actor_id, team_id, type) values (p_match_id, v_user, v_winner, 'match_finished');
  else v_status := 'awaiting_confirmation';
  end if;
  return v_status;
end;
$$;

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_teams enable row level security;
alter table public.match_participants enable row level security;
alter table public.match_events enable row level security;
alter table public.match_confirmations enable row level security;

create policy profiles_read_authenticated on public.profiles for select to authenticated using (true);
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy matches_read_participant on public.matches for select to authenticated using (public.is_match_participant(id));
create policy teams_read_participant on public.match_teams for select to authenticated using (public.is_match_participant(match_id));
create policy participants_read_participant on public.match_participants for select to authenticated using (public.is_match_participant(match_id));
create policy events_read_participant on public.match_events for select to authenticated using (public.is_match_participant(match_id));
create policy confirmations_read_participant on public.match_confirmations for select to authenticated using (public.is_match_participant(match_id));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.matches, public.match_teams, public.match_participants,
  public.match_events, public.match_confirmations to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
revoke all on function public.handle_new_user() from public;
revoke all on function public.is_match_participant(uuid) from public;
revoke all on function public.create_match(public.match_mode, smallint) from public;
revoke all on function public.join_match(text) from public;
revoke all on function public.set_ready(uuid, boolean) from public;
revoke all on function public.add_goal(uuid, uuid, uuid) from public;
revoke all on function public.confirm_result(uuid) from public;
grant execute on function public.is_match_participant(uuid) to authenticated;
grant execute on function public.create_match(public.match_mode, smallint) to authenticated;
grant execute on function public.join_match(text) to authenticated;
grant execute on function public.set_ready(uuid, boolean) to authenticated;
grant execute on function public.add_goal(uuid, uuid, uuid) to authenticated;
grant execute on function public.confirm_result(uuid) to authenticated;

alter publication supabase_realtime add table public.matches, public.match_participants,
  public.match_events, public.match_confirmations;
