alter table public.bench_adoptions
  drop constraint bench_adoptions_duration_unit_check,
  drop constraint bench_adoptions_supported_duration,
  add constraint bench_adoptions_duration_unit_check
    check (duration_unit = 'year'),
  add constraint bench_adoptions_supported_duration
    check (duration_count between 1 and 10);

drop function public.adopt_bench(text, uuid, text, text, integer, text, numeric, text, boolean);

create function public.adopt_bench(
  p_bench_id text,
  p_session_token uuid,
  p_adopter_name text,
  p_plaque_message text,
  p_duration_years integer,
  p_contribution_amount numeric,
  p_payment_method text,
  p_is_anonymous boolean
)
returns table (
  success boolean,
  message text,
  adoption_start date,
  adoption_end date,
  contribution_amount numeric,
  payment_method text,
  is_anonymous boolean,
  receipt_number text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  start_on date := current_date;
  end_on date;
  receipt_ref text;
begin
  if char_length(btrim(p_adopter_name)) not between 2 and 80 then
    return query select false, 'Enter a name between 2 and 80 characters'::text,
      null::date, null::date, null::numeric, null::text, null::boolean, null::text;
    return;
  end if;

  if char_length(btrim(p_plaque_message)) not between 2 and 160 then
    return query select false, 'Enter a plaque message between 2 and 160 characters'::text,
      null::date, null::date, null::numeric, null::text, null::boolean, null::text;
    return;
  end if;

  if p_duration_years not between 1 and 10 then
    return query select false, 'Choose a term from 1 to 10 years'::text,
      null::date, null::date, null::numeric, null::text, null::boolean, null::text;
    return;
  end if;

  if p_contribution_amount < 3500 or p_contribution_amount > 999999.99 then
    return query select false, 'Contribution must be at least $3,500'::text,
      null::date, null::date, null::numeric, null::text, null::boolean, null::text;
    return;
  end if;

  if p_payment_method not in ('card', 'bank', 'zelle', 'check', 'stock', 'daf') then
    return query select false, 'Choose a supported payment method'::text,
      null::date, null::date, null::numeric, null::text, null::boolean, null::text;
    return;
  end if;

  perform 1 from public.benches where benches.id = p_bench_id for update;
  if not found then
    return query select false, 'Bench not found'::text,
      null::date, null::date, null::numeric, null::text, null::boolean, null::text;
    return;
  end if;

  if exists (
    select 1
    from public.bench_adoptions
    where bench_adoptions.bench_id = p_bench_id
      and current_date between bench_adoptions.adoption_start and bench_adoptions.adoption_end
  ) then
    return query select false, 'This bench is already adopted'::text,
      null::date, null::date, null::numeric, null::text, null::boolean, null::text;
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
    return query select false, 'Your hold expired. Try again'::text,
      null::date, null::date, null::numeric, null::text, null::boolean, null::text;
    return;
  end if;

  end_on := (start_on + make_interval(years => p_duration_years))::date;
  receipt_ref := 'VCP-' || to_char(current_date, 'YYYY') || '-' ||
    upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.bench_adoptions (
    bench_id,
    adopter_name,
    plaque_message,
    adoption_start,
    adoption_end,
    duration_count,
    duration_unit,
    contribution_amount,
    payment_method,
    is_anonymous,
    receipt_number
  ) values (
    p_bench_id,
    btrim(p_adopter_name),
    btrim(p_plaque_message),
    start_on,
    end_on,
    p_duration_years,
    'year',
    p_contribution_amount,
    p_payment_method,
    p_is_anonymous,
    receipt_ref
  );

  delete from public.bench_adoption_holds
  where bench_adoption_holds.bench_id = p_bench_id
    and bench_adoption_holds.session_token = p_session_token;

  return query select true, 'Bench adopted'::text, start_on, end_on,
    p_contribution_amount, p_payment_method, p_is_anonymous, receipt_ref;
end;
$$;

revoke all on function public.adopt_bench(text, uuid, text, text, integer, numeric, text, boolean) from public;
grant execute on function public.adopt_bench(text, uuid, text, text, integer, numeric, text, boolean) to anon, authenticated;
