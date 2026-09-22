create extension if not exists pgcrypto with schema extensions;

create table public.benches (
  id text primary key,
  name text not null check (char_length(name) between 1 and 80),
  area text not null check (char_length(area) between 1 and 80),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  source text not null,
  source_reference text not null unique,
  created_at timestamptz not null default now()
);

create table public.bench_adoptions (
  id uuid primary key default extensions.gen_random_uuid(),
  bench_id text not null references public.benches(id) on delete restrict,
  adopter_name text not null check (char_length(btrim(adopter_name)) between 2 and 80),
  plaque_message text not null check (char_length(btrim(plaque_message)) between 2 and 160),
  adoption_start date not null,
  adoption_end date not null,
  duration_count integer not null check (duration_count between 1 and 120),
  duration_unit text not null check (duration_unit in ('month', 'year')),
  created_at timestamptz not null default now(),
  check (adoption_end > adoption_start)
);

create index bench_adoptions_bench_dates_idx
  on public.bench_adoptions (bench_id, adoption_start, adoption_end);

create table public.bench_adoption_holds (
  bench_id text primary key references public.benches(id) on delete cascade,
  session_token uuid not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.benches enable row level security;
alter table public.bench_adoptions enable row level security;
alter table public.bench_adoption_holds enable row level security;

create policy "Benches are publicly readable"
  on public.benches for select
  to anon, authenticated
  using (true);

create policy "Adoptions are publicly readable"
  on public.bench_adoptions for select
  to anon, authenticated
  using (true);

grant select on public.benches, public.bench_adoptions to anon, authenticated;
revoke all on public.bench_adoption_holds from anon, authenticated;
revoke insert, update, delete on public.benches, public.bench_adoptions from anon, authenticated;

create or replace function public.list_benches()
returns table (
  id text,
  name text,
  area text,
  latitude double precision,
  longitude double precision,
  source text,
  source_reference text,
  adopter_name text,
  plaque_message text,
  adoption_start date,
  adoption_end date,
  hold_expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    bench.id,
    bench.name,
    bench.area,
    bench.latitude,
    bench.longitude,
    bench.source,
    bench.source_reference,
    current_adoption.adopter_name,
    current_adoption.plaque_message,
    current_adoption.adoption_start,
    current_adoption.adoption_end,
    active_hold.expires_at
  from public.benches as bench
  left join lateral (
    select adoption.adopter_name,
      adoption.plaque_message,
      adoption.adoption_start,
      adoption.adoption_end
    from public.bench_adoptions as adoption
    where adoption.bench_id = bench.id
      and current_date between adoption.adoption_start and adoption.adoption_end
    order by adoption.adoption_end desc
    limit 1
  ) as current_adoption on true
  left join lateral (
    select hold.expires_at
    from public.bench_adoption_holds as hold
    where hold.bench_id = bench.id
      and hold.expires_at > now()
    limit 1
  ) as active_hold on true
  order by bench.id;
$$;

create or replace function public.reserve_bench(
  p_bench_id text,
  p_session_token uuid
)
returns table (success boolean, message text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_hold public.bench_adoption_holds%rowtype;
  new_expiry timestamptz := now() + interval '10 minutes';
begin
  perform 1 from public.benches where benches.id = p_bench_id for update;
  if not found then
    return query select false, 'Bench not found'::text, null::timestamptz;
    return;
  end if;

  if exists (
    select 1
    from public.bench_adoptions
    where bench_adoptions.bench_id = p_bench_id
      and current_date between adoption_start and adoption_end
  ) then
    return query select false, 'This bench is already adopted'::text, null::timestamptz;
    return;
  end if;

  delete from public.bench_adoption_holds
  where bench_adoption_holds.bench_id = p_bench_id
    and bench_adoption_holds.expires_at <= now();

  select * into existing_hold
  from public.bench_adoption_holds
  where bench_adoption_holds.bench_id = p_bench_id
  for update;

  if found and existing_hold.session_token <> p_session_token then
    return query select false, 'Another visitor is adopting this bench'::text, existing_hold.expires_at;
    return;
  end if;

  insert into public.bench_adoption_holds (bench_id, session_token, expires_at)
  values (p_bench_id, p_session_token, new_expiry)
  on conflict (bench_id) do update
  set expires_at = excluded.expires_at,
      session_token = excluded.session_token;

  return query select true, 'Bench held for 10 minutes'::text, new_expiry;
end;
$$;

create or replace function public.release_bench_hold(
  p_bench_id text,
  p_session_token uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.bench_adoption_holds
    where bench_adoption_holds.bench_id = p_bench_id
      and bench_adoption_holds.session_token = p_session_token
    returning 1
  )
  select exists(select 1 from deleted);
$$;

create or replace function public.adopt_bench(
  p_bench_id text,
  p_session_token uuid,
  p_adopter_name text,
  p_plaque_message text,
  p_duration_count integer,
  p_duration_unit text
)
returns table (
  success boolean,
  message text,
  adoption_start date,
  adoption_end date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  start_on date := current_date;
  end_on date;
begin
  if char_length(btrim(p_adopter_name)) not between 2 and 80 then
    return query select false, 'Enter a name between 2 and 80 characters'::text, null::date, null::date;
    return;
  end if;

  if char_length(btrim(p_plaque_message)) not between 2 and 160 then
    return query select false, 'Enter a plaque message between 2 and 160 characters'::text, null::date, null::date;
    return;
  end if;

  if p_duration_count not between 1 and 120 or p_duration_unit not in ('month', 'year') then
    return query select false, 'Choose a whole number of months or years'::text, null::date, null::date;
    return;
  end if;

  perform 1 from public.benches where benches.id = p_bench_id for update;
  if not found then
    return query select false, 'Bench not found'::text, null::date, null::date;
    return;
  end if;

  if exists (
    select 1
    from public.bench_adoptions
    where bench_adoptions.bench_id = p_bench_id
      and current_date between bench_adoptions.adoption_start and bench_adoptions.adoption_end
  ) then
    return query select false, 'This bench is already adopted'::text, null::date, null::date;
    return;
  end if;

  if not exists (
    select 1
    from public.bench_adoption_holds
    where bench_adoption_holds.bench_id = p_bench_id
      and bench_adoption_holds.session_token = p_session_token
      and bench_adoption_holds.expires_at > now()
    for update
  ) then
    return query select false, 'Your hold expired. Try again'::text, null::date, null::date;
    return;
  end if;

  end_on := case p_duration_unit
    when 'month' then (start_on + make_interval(months => p_duration_count))::date
    when 'year' then (start_on + make_interval(years => p_duration_count))::date
  end;

  insert into public.bench_adoptions (
    bench_id,
    adopter_name,
    plaque_message,
    adoption_start,
    adoption_end,
    duration_count,
    duration_unit
  ) values (
    p_bench_id,
    btrim(p_adopter_name),
    btrim(p_plaque_message),
    start_on,
    end_on,
    p_duration_count,
    p_duration_unit
  );

  delete from public.bench_adoption_holds
  where bench_adoption_holds.bench_id = p_bench_id
    and bench_adoption_holds.session_token = p_session_token;

  return query select true, 'Bench adopted'::text, start_on, end_on;
end;
$$;

revoke all on function public.list_benches() from public;
revoke all on function public.reserve_bench(text, uuid) from public;
revoke all on function public.release_bench_hold(text, uuid) from public;
revoke all on function public.adopt_bench(text, uuid, text, text, integer, text) from public;

grant execute on function public.list_benches() to anon, authenticated;
grant execute on function public.reserve_bench(text, uuid) to anon, authenticated;
grant execute on function public.release_bench_hold(text, uuid) to anon, authenticated;
grant execute on function public.adopt_bench(text, uuid, text, text, integer, text) to anon, authenticated;

insert into public.benches (id, name, area, latitude, longitude, source, source_reference)
values
  ('VC-001', 'Bench 01', 'Southwest park', 40.8887392, -73.8981296, 'OpenStreetMap', 'node/13093276666'),
  ('VC-002', 'Bench 02', 'Southwest park', 40.8888400, -73.8980808, 'OpenStreetMap', 'node/13093276665'),
  ('VC-003', 'Bench 03', 'Southwest park', 40.8889148, -73.8979676, 'OpenStreetMap', 'node/13093276668'),
  ('VC-004', 'Bench 04', 'Southwest park', 40.8892410, -73.8978701, 'OpenStreetMap', 'node/13093276667'),
  ('VC-005', 'Bench 05', 'Southwest park', 40.8896193, -73.8977898, 'OpenStreetMap', 'node/13093276669'),
  ('VC-006', 'Bench 06', 'Lake area', 40.8935019, -73.8892148, 'OpenStreetMap', 'node/9043834572'),
  ('VC-007', 'Bench 07', 'Putnam Greenway', 40.9031470, -73.8962130, 'OpenStreetMap', 'node/9934725753'),
  ('VC-008', 'Bench 08', 'Northwest park', 40.9092966, -73.8963095, 'OpenStreetMap', 'node/6765115255'),
  ('VC-009', 'Bench 09', 'Northwest park', 40.9093106, -73.8961881, 'OpenStreetMap', 'node/6765115263'),
  ('VC-010', 'Bench 10', 'Northwest park', 40.9093826, -73.8963168, 'OpenStreetMap', 'node/6765115266'),
  ('VC-011', 'Bench 11', 'Northwest park', 40.9093871, -73.8962049, 'OpenStreetMap', 'node/6765115268');

insert into public.bench_adoptions (
  bench_id,
  adopter_name,
  plaque_message,
  adoption_start,
  adoption_end,
  duration_count,
  duration_unit
)
values
  ('VC-002', 'The Rivera family', 'For every walk we took together.', '2026-04-12', '2027-04-12', 1, 'year'),
  ('VC-006', 'Maya Chen', 'Sit awhile. The path can wait.', '2025-11-03', '2027-11-03', 2, 'year');

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'benches'
  ) then
    alter publication supabase_realtime add table public.benches;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bench_adoptions'
  ) then
    alter publication supabase_realtime add table public.bench_adoptions;
  end if;
end
$$;
