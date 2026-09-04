alter table public.seasons
  add column if not exists year smallint;

update public.seasons
set
  year = extract(year from starts_at at time zone 'Europe/Zurich')::smallint,
  name = extract(year from starts_at at time zone 'Europe/Zurich')::smallint::text,
  starts_at = make_timestamptz(
    extract(year from starts_at at time zone 'Europe/Zurich')::integer,
    1, 1, 0, 0, 0,
    'Europe/Zurich'
  ),
  ends_at = make_timestamptz(
    extract(year from starts_at at time zone 'Europe/Zurich')::integer + 1,
    1, 1, 0, 0, 0,
    'Europe/Zurich'
  );

alter table public.seasons alter column year set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.seasons'::regclass and conname = 'seasons_year_key'
  ) then
    alter table public.seasons add constraint seasons_year_key unique (year);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.seasons'::regclass and conname = 'seasons_year_range_check'
  ) then
    alter table public.seasons add constraint seasons_year_range_check check (year between 2000 and 9999);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.seasons'::regclass and conname = 'seasons_calendar_name_check'
  ) then
    alter table public.seasons add constraint seasons_calendar_name_check check (name = year::text);
  end if;
end;
$$;

insert into public.seasons (name, year, starts_at, ends_at, is_active)
select
  calendar_year::text,
  calendar_year,
  make_timestamptz(calendar_year, 1, 1, 0, 0, 0, 'Europe/Zurich'),
  make_timestamptz(calendar_year + 1, 1, 1, 0, 0, 0, 'Europe/Zurich'),
  false
from (
  select distinct extract(year from created_at at time zone 'Europe/Zurich')::smallint as calendar_year
  from public.matches
  union
  select extract(year from now() at time zone 'Europe/Zurich')::smallint
) as years
on conflict (year) do nothing;

update public.seasons
set
  name = year::text,
  starts_at = make_timestamptz(year, 1, 1, 0, 0, 0, 'Europe/Zurich'),
  ends_at = make_timestamptz(year + 1, 1, 1, 0, 0, 0, 'Europe/Zurich');

update public.matches as match
set season_id = season.id
from public.seasons as season
where season.year = extract(year from match.created_at at time zone 'Europe/Zurich')::smallint
  and match.season_id <> season.id;

update public.seasons set is_active = false where is_active;
update public.seasons
set is_active = true
where year = extract(year from now() at time zone 'Europe/Zurich')::smallint;

create or replace function public.assign_active_season()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_year smallint := extract(year from new.created_at at time zone 'Europe/Zurich')::smallint;
  v_current_year smallint := extract(year from now() at time zone 'Europe/Zurich')::smallint;
  v_season_id uuid;
  v_is_active boolean;
begin
  perform pg_advisory_xact_lock(hashtext('public.calendar_year_seasons'));

  insert into public.seasons (name, year, starts_at, ends_at, is_active)
  values (
    v_year::text,
    v_year,
    make_timestamptz(v_year, 1, 1, 0, 0, 0, 'Europe/Zurich'),
    make_timestamptz(v_year + 1, 1, 1, 0, 0, 0, 'Europe/Zurich'),
    false
  )
  on conflict (year) do update
  set
    name = excluded.name,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at
  returning id, is_active into v_season_id, v_is_active;

  if v_year = v_current_year and not v_is_active then
    update public.seasons set is_active = false where is_active;
    update public.seasons set is_active = true where id = v_season_id;
  end if;

  new.season_id := v_season_id;
  return new;
end;
$$;

revoke all on function public.assign_active_season() from public;
