begin;

create extension if not exists pgcrypto with schema extensions;

create type public.match_mode as enum ('one_v_one', 'two_v_two');
create type public.match_status as enum (
  'waiting_for_players',
  'waiting_for_ready',
  'in_progress',
  'awaiting_confirmation',
  'completed',
  'cancelled'
);
create type public.match_event_type as enum (
  'match_created',
  'player_joined',
  'player_ready',
  'player_moved',
  'match_started',
  'goal',
  'goal_cancelled',
  'result_proposed',
  'result_confirmed',
  'result_rejected',
  'match_cancelled',
  'match_finished',
  'rematch_created'
);
create type public.match_cancel_reason as enum (
  'result_rejected',
  'creator_cancelled',
  'administrative'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 50),
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_lower_idx on public.profiles (lower(email));

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  mode public.match_mode not null,
  status public.match_status not null default 'waiting_for_players',
  target_score smallint not null check (target_score between 1 and 30),
  created_by uuid not null references public.profiles (id),
  join_token_hash bytea unique,
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
  check ((status = 'completed') = (winner_team_id is not null)),
  check (
    (cancel_reason = 'result_rejected' and rejected_by is not null and rejected_at is not null)
    or (cancel_reason is distinct from 'result_rejected' and rejected_by is null and rejected_at is null)
  ),
  check ((status in ('completed', 'cancelled')) = (ended_at is not null))
);

create index matches_status_updated_idx on public.matches (status, updated_at desc);
create index matches_created_by_idx on public.matches (created_by);
create index matches_rematch_of_idx on public.matches (rematch_of) where rematch_of is not null;

create table public.match_teams (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete restrict,
  side smallint not null check (side in (1, 2)),
  label text check (label is null or char_length(trim(label)) between 1 and 50),
  unique (match_id, side),
  unique (match_id, id)
);

alter table public.matches
  add constraint matches_winner_team_fk
  foreign key (id, winner_team_id)
  references public.match_teams (match_id, id)
  deferrable initially deferred;

create table public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete restrict,
  team_id uuid not null,
  user_id uuid not null references public.profiles (id),
  seat smallint not null check (seat in (1, 2)),
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  ready_at timestamptz,
  unique (match_id, user_id),
  unique (team_id, seat) deferrable initially immediate,
  foreign key (match_id, team_id) references public.match_teams (match_id, id)
);

create index match_participants_user_idx on public.match_participants (user_id, match_id);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete restrict,
  actor_id uuid references public.profiles (id),
  team_id uuid,
  type public.match_event_type not null,
  request_id uuid,
  cancels_event_id uuid unique references public.match_events (id),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  unique (match_id, request_id),
  foreign key (match_id, team_id) references public.match_teams (match_id, id)
);

create index match_events_timeline_idx on public.match_events (match_id, created_at, id);
create index match_events_actor_idx on public.match_events (actor_id) where actor_id is not null;

create table public.match_confirmations (
  match_id uuid not null references public.matches (id) on delete restrict,
  user_id uuid not null references public.profiles (id),
  confirmed_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger matches_set_updated_at before update on public.matches
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  proposed_name text;
begin
  proposed_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, 'Joueur'), '@', 1)
  );

  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    left(case when char_length(proposed_name) < 2 then proposed_name || ' ·' else proposed_name end, 50),
    coalesce(new.email, new.id::text || '@invalid.local'),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.is_match_participant(p_match_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.match_participants
    where match_id = p_match_id and user_id = p_user_id
  );
$$;

create function public.required_player_count(p_mode public.match_mode)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_mode when 'one_v_one' then 2 else 4 end;
$$;

create function public.create_match(p_mode public.match_mode, p_target_score integer default 10)
returns table (match_id uuid, join_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_match_id uuid;
  team_a_id uuid;
  token text;
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if p_target_score not between 1 and 30 then raise exception 'INVALID_TARGET_SCORE' using errcode = 'P0001'; end if;

  token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.matches (mode, target_score, created_by, join_token_hash)
  values (p_mode, p_target_score, current_user_id, extensions.digest(token, 'sha256'))
  returning id into new_match_id;

  insert into public.match_teams (match_id, side) values (new_match_id, 1) returning id into team_a_id;
  insert into public.match_teams (match_id, side) values (new_match_id, 2);
  insert into public.match_participants (match_id, team_id, user_id, seat)
  values (new_match_id, team_a_id, current_user_id, 1);
  insert into public.match_events (match_id, actor_id, type, metadata)
  values (new_match_id, current_user_id, 'match_created', jsonb_build_object('mode', p_mode, 'target_score', p_target_score));

  return query select new_match_id, token;
end;
$$;

create function public.join_match(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_match public.matches%rowtype;
  selected_team_id uuid;
  selected_seat smallint;
  player_count integer;
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if p_token is null or char_length(p_token) < 32 then raise exception 'INVALID_JOIN_TOKEN' using errcode = 'P0001'; end if;

  select * into selected_match from public.matches
  where join_token_hash = extensions.digest(p_token, 'sha256')
  for update;
  if not found then raise exception 'MATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  if selected_match.status not in ('waiting_for_players', 'waiting_for_ready') then
    raise exception 'MATCH_ALREADY_STARTED' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.match_participants where match_id = selected_match.id and user_id = current_user_id) then
    return selected_match.id;
  end if;

  select count(*) into player_count from public.match_participants where match_id = selected_match.id;
  if player_count >= public.required_player_count(selected_match.mode) then
    raise exception 'MATCH_FULL' using errcode = 'P0001';
  end if;

  select t.id, s.seat into selected_team_id, selected_seat
  from public.match_teams t
  cross join lateral generate_series(1, case selected_match.mode when 'one_v_one' then 1 else 2 end) s(seat)
  left join public.match_participants p on p.team_id = t.id and p.seat = s.seat
  where t.match_id = selected_match.id and p.id is null
  order by case when selected_match.mode = 'one_v_one' then t.side else s.seat end, t.side
  limit 1;

  insert into public.match_participants (match_id, team_id, user_id, seat)
  values (selected_match.id, selected_team_id, current_user_id, selected_seat);
  insert into public.match_events (match_id, actor_id, team_id, type)
  values (selected_match.id, current_user_id, selected_team_id, 'player_joined');

  player_count := player_count + 1;
  if player_count = public.required_player_count(selected_match.mode) then
    update public.matches set status = 'waiting_for_ready', join_token_hash = null where id = selected_match.id;
  end if;
  return selected_match.id;
end;
$$;

create function public.set_player_ready(p_match_id uuid, p_ready boolean default true)
returns public.match_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_match public.matches%rowtype;
  ready_count integer;
begin
  select * into selected_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'MATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  if selected_match.status <> 'waiting_for_ready' then raise exception 'MATCH_NOT_READY' using errcode = 'P0001'; end if;

  update public.match_participants
  set is_ready = p_ready, ready_at = case when p_ready then now() else null end
  where match_id = p_match_id and user_id = current_user_id;
  if not found then raise exception 'NOT_A_PARTICIPANT' using errcode = 'P0001'; end if;

  insert into public.match_events (match_id, actor_id, type, metadata)
  values (p_match_id, current_user_id, 'player_ready', jsonb_build_object('ready', p_ready));
  select count(*) into ready_count from public.match_participants where match_id = p_match_id and is_ready;
  if p_ready and ready_count = public.required_player_count(selected_match.mode) then
    update public.matches set status = 'in_progress', started_at = now() where id = p_match_id;
    insert into public.match_events (match_id, actor_id, type) values (p_match_id, current_user_id, 'match_started');
    return 'in_progress';
  end if;
  return 'waiting_for_ready';
end;
$$;

create function public.move_participant(p_match_id uuid, p_participant_id uuid, p_team_id uuid, p_seat smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_match public.matches%rowtype;
  moving_participant public.match_participants%rowtype;
  occupying_participant_id uuid;
begin
  select * into selected_match from public.matches where id = p_match_id for update;
  if selected_match.created_by <> auth.uid() then raise exception 'CREATOR_ONLY' using errcode = 'P0001'; end if;
  if selected_match.mode <> 'two_v_two' or selected_match.status not in ('waiting_for_players', 'waiting_for_ready') then
    raise exception 'TEAMS_LOCKED' using errcode = 'P0001';
  end if;
  if p_seat not in (1, 2) or not exists (select 1 from public.match_teams where id = p_team_id and match_id = p_match_id) then
    raise exception 'INVALID_SEAT' using errcode = 'P0001';
  end if;
  select * into moving_participant from public.match_participants
  where id = p_participant_id and match_id = p_match_id for update;
  if not found then raise exception 'PARTICIPANT_NOT_FOUND' using errcode = 'P0001'; end if;
  select id into occupying_participant_id from public.match_participants
  where team_id = p_team_id and seat = p_seat for update;

  set constraints match_participants_team_id_seat_key deferred;
  update public.match_participants
  set team_id = moving_participant.team_id, seat = moving_participant.seat, is_ready = false, ready_at = null
  where id = occupying_participant_id;
  update public.match_participants set team_id = p_team_id, seat = p_seat, is_ready = false, ready_at = null
  where id = p_participant_id;
  update public.match_participants set is_ready = false, ready_at = null where match_id = p_match_id;
  insert into public.match_events (match_id, actor_id, team_id, type, metadata)
  values (p_match_id, auth.uid(), p_team_id, 'player_moved', jsonb_build_object('participant_id', p_participant_id, 'seat', p_seat));
end;
$$;

create function public.add_goal(p_match_id uuid, p_team_id uuid, p_request_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare selected_match public.matches%rowtype; team_side smallint;
begin
  select * into selected_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'MATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  if not public.is_match_participant(p_match_id, auth.uid()) then raise exception 'NOT_A_PARTICIPANT' using errcode = 'P0001'; end if;
  if exists (select 1 from public.match_events where match_id = p_match_id and request_id = p_request_id) then
    return selected_match;
  end if;
  if selected_match.status <> 'in_progress' then raise exception 'SCORING_CLOSED' using errcode = 'P0001'; end if;
  select side into team_side from public.match_teams where id = p_team_id and match_id = p_match_id;
  if not found then raise exception 'INVALID_TEAM' using errcode = 'P0001'; end if;

  if team_side = 1 then selected_match.team_a_score := selected_match.team_a_score + 1;
  else selected_match.team_b_score := selected_match.team_b_score + 1; end if;
  insert into public.match_events (match_id, actor_id, team_id, type, request_id)
  values (p_match_id, auth.uid(), p_team_id, 'goal', p_request_id);

  if (team_side = 1 and selected_match.team_a_score = selected_match.target_score)
     or (team_side = 2 and selected_match.team_b_score = selected_match.target_score) then
    selected_match.status := 'awaiting_confirmation';
    insert into public.match_events (match_id, actor_id, team_id, type)
    values (p_match_id, auth.uid(), p_team_id, 'result_proposed');
  end if;
  update public.matches set team_a_score = selected_match.team_a_score,
    team_b_score = selected_match.team_b_score, status = selected_match.status
  where id = p_match_id returning * into selected_match;
  return selected_match;
end;
$$;

create function public.cancel_goal(p_match_id uuid, p_goal_event_id uuid, p_request_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare selected_match public.matches%rowtype; goal_event public.match_events%rowtype; team_side smallint;
begin
  select * into selected_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'MATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  if exists (select 1 from public.match_events where match_id = p_match_id and request_id = p_request_id) then
    return selected_match;
  end if;
  if selected_match.status not in ('in_progress', 'awaiting_confirmation') then raise exception 'UNDO_CLOSED' using errcode = 'P0001'; end if;
  select * into goal_event from public.match_events
  where id = p_goal_event_id and match_id = p_match_id and type = 'goal' for update;
  if not found or goal_event.actor_id <> auth.uid() then raise exception 'GOAL_NOT_UNDOABLE' using errcode = 'P0001'; end if;
  if clock_timestamp() > goal_event.created_at + interval '3 seconds' then raise exception 'UNDO_EXPIRED' using errcode = 'P0001'; end if;
  if exists (select 1 from public.match_events where cancels_event_id = p_goal_event_id) then raise exception 'GOAL_ALREADY_CANCELLED' using errcode = 'P0001'; end if;
  if selected_match.status = 'awaiting_confirmation'
     and exists (select 1 from public.match_confirmations where match_id = p_match_id) then
    raise exception 'RESULT_CONFIRMATION_STARTED' using errcode = 'P0001';
  end if;
  select side into team_side from public.match_teams where id = goal_event.team_id;
  if team_side = 1 then selected_match.team_a_score := selected_match.team_a_score - 1;
  else selected_match.team_b_score := selected_match.team_b_score - 1; end if;
  if selected_match.status = 'awaiting_confirmation' then selected_match.status := 'in_progress'; end if;
  insert into public.match_events (match_id, actor_id, team_id, type, request_id, cancels_event_id)
  values (p_match_id, auth.uid(), goal_event.team_id, 'goal_cancelled', p_request_id, p_goal_event_id);
  update public.matches set team_a_score = selected_match.team_a_score,
    team_b_score = selected_match.team_b_score, status = selected_match.status
  where id = p_match_id returning * into selected_match;
  return selected_match;
end;
$$;

create function public.confirm_result(p_match_id uuid)
returns public.match_status
language plpgsql
security definer
set search_path = ''
as $$
declare selected_match public.matches%rowtype; confirmation_count integer; winning_team uuid;
begin
  select * into selected_match from public.matches where id = p_match_id for update;
  if selected_match.status <> 'awaiting_confirmation' then raise exception 'RESULT_NOT_CONFIRMABLE' using errcode = 'P0001'; end if;
  if not public.is_match_participant(p_match_id, auth.uid()) then raise exception 'NOT_A_PARTICIPANT' using errcode = 'P0001'; end if;
  insert into public.match_confirmations (match_id, user_id) values (p_match_id, auth.uid());
  insert into public.match_events (match_id, actor_id, type) values (p_match_id, auth.uid(), 'result_confirmed');
  select count(*) into confirmation_count from public.match_confirmations where match_id = p_match_id;
  if confirmation_count = public.required_player_count(selected_match.mode) then
    select id into winning_team from public.match_teams
    where match_id = p_match_id and side = case when selected_match.team_a_score > selected_match.team_b_score then 1 else 2 end;
    update public.matches set status = 'completed', winner_team_id = winning_team, ended_at = now(), join_token_hash = null
    where id = p_match_id;
    insert into public.match_events (match_id, actor_id, team_id, type) values (p_match_id, auth.uid(), winning_team, 'match_finished');
    return 'completed';
  end if;
  return 'awaiting_confirmation';
end;
$$;

create function public.reject_result(p_match_id uuid)
returns public.match_status
language plpgsql
security definer
set search_path = ''
as $$
declare selected_match public.matches%rowtype;
begin
  select * into selected_match from public.matches where id = p_match_id for update;
  if selected_match.status <> 'awaiting_confirmation' then raise exception 'RESULT_NOT_REJECTABLE' using errcode = 'P0001'; end if;
  if not public.is_match_participant(p_match_id, auth.uid()) then raise exception 'NOT_A_PARTICIPANT' using errcode = 'P0001'; end if;
  update public.matches set status = 'cancelled', cancel_reason = 'result_rejected',
    rejected_by = auth.uid(), rejected_at = now(), ended_at = now(), join_token_hash = null
  where id = p_match_id;
  insert into public.match_events (match_id, actor_id, type) values (p_match_id, auth.uid(), 'result_rejected');
  insert into public.match_events (match_id, actor_id, type) values (p_match_id, auth.uid(), 'match_cancelled');
  return 'cancelled';
end;
$$;

create function public.create_rematch(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare old_match public.matches%rowtype; new_match_id uuid; old_team record; new_team_id uuid;
begin
  select * into old_match from public.matches where id = p_match_id;
  if old_match.status <> 'completed' or not public.is_match_participant(p_match_id, auth.uid()) then
    raise exception 'REMATCH_NOT_ALLOWED' using errcode = 'P0001';
  end if;
  insert into public.matches (mode, status, target_score, created_by, rematch_of)
  values (old_match.mode, 'waiting_for_ready', old_match.target_score, auth.uid(), p_match_id)
  returning id into new_match_id;
  for old_team in select * from public.match_teams where match_id = p_match_id order by side loop
    insert into public.match_teams (match_id, side, label) values (new_match_id, old_team.side, old_team.label)
    returning id into new_team_id;
    insert into public.match_participants (match_id, team_id, user_id, seat)
    select new_match_id, new_team_id, user_id, seat from public.match_participants where team_id = old_team.id;
  end loop;
  insert into public.match_events (match_id, actor_id, type, metadata)
  values (new_match_id, auth.uid(), 'rematch_created', jsonb_build_object('previous_match_id', p_match_id));
  return new_match_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_teams enable row level security;
alter table public.match_participants enable row level security;
alter table public.match_events enable row level security;
alter table public.match_confirmations enable row level security;

create policy profiles_read_authenticated on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());
create policy matches_read_participant on public.matches for select to authenticated
using (public.is_match_participant(id));
create policy teams_read_participant on public.match_teams for select to authenticated
using (public.is_match_participant(match_id));
create policy participants_read_participant on public.match_participants for select to authenticated
using (public.is_match_participant(match_id));
create policy events_read_participant on public.match_events for select to authenticated
using (public.is_match_participant(match_id));
create policy confirmations_read_participant on public.match_confirmations for select to authenticated
using (public.is_match_participant(match_id));

revoke all on public.matches, public.match_teams, public.match_participants, public.match_events, public.match_confirmations from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant select on public.matches, public.match_teams, public.match_participants, public.match_events, public.match_confirmations to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_match(public.match_mode, integer), public.join_match(text),
  public.set_player_ready(uuid, boolean), public.move_participant(uuid, uuid, uuid, smallint),
  public.add_goal(uuid, uuid, uuid), public.cancel_goal(uuid, uuid, uuid),
  public.confirm_result(uuid), public.reject_result(uuid), public.create_rematch(uuid)
to authenticated;
grant execute on function public.is_match_participant(uuid, uuid) to authenticated;

create view public.player_statistics
with (security_invoker = false)
as
with completed_stats as (
  select
    mp.user_id,
    count(*)::integer as matches_played,
    count(*) filter (where m.winner_team_id = mp.team_id)::integer as wins,
    count(*) filter (where m.winner_team_id <> mp.team_id)::integer as losses,
    sum(case t.side when 1 then m.team_a_score else m.team_b_score end)::integer as goals_for,
    sum(case t.side when 1 then m.team_b_score else m.team_a_score end)::integer as goals_against
  from public.match_participants mp
  join public.matches m on m.id = mp.match_id and m.status = 'completed'
  join public.match_teams t on t.id = mp.team_id
  group by mp.user_id
)
select
  p.id as player_id,
  coalesce(s.matches_played, 0) as matches_played,
  coalesce(s.wins, 0) as wins,
  coalesce(s.losses, 0) as losses,
  coalesce(s.goals_for, 0) as goals_for,
  coalesce(s.goals_against, 0) as goals_against
from public.profiles p
left join completed_stats s on s.user_id = p.id;

create view public.leaderboard
with (security_invoker = false)
as
select
  row_number() over (
    order by s.wins desc,
      case when s.matches_played = 0 then 0 else s.wins::numeric / s.matches_played end desc,
      (s.goals_for - s.goals_against) desc,
      p.display_name
  )::integer as position,
  p.id as player_id,
  p.display_name,
  p.avatar_url,
  s.matches_played,
  s.wins,
  s.losses,
  s.goals_for,
  s.goals_against,
  s.goals_for - s.goals_against as goal_difference,
  case when s.matches_played = 0 then 0 else round(100 * s.wins::numeric / s.matches_played, 1) end as win_rate
from public.player_statistics s
join public.profiles p on p.id = s.player_id;

grant select on public.player_statistics, public.leaderboard to authenticated;

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_participants;
alter publication supabase_realtime add table public.match_events;
alter publication supabase_realtime add table public.match_confirmations;

commit;
