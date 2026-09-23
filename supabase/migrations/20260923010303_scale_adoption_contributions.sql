alter table public.bench_adoptions
  add column additional_contribution_amount numeric(10, 2) not null default 0;

update public.bench_adoptions
set duration_count = 10,
    adoption_end = (adoption_start + interval '10 years')::date
where duration_count < 10;

alter table public.bench_adoptions
  drop constraint bench_adoptions_supported_duration,
  drop constraint bench_adoptions_contribution_floor,
  add constraint bench_adoptions_supported_duration
    check (duration_count between 10 and 99),
  add constraint bench_adoptions_additional_contribution
    check (additional_contribution_amount between 0 and 999999.99),
  add constraint bench_adoptions_contribution_total
    check (
      contribution_amount =
        3500 + ((duration_count - 10) * 350) + additional_contribution_amount
      and contribution_amount <= 999999.99
    );

drop function public.adopt_bench(text, uuid, text, text, integer, numeric, text, boolean);

create function public.adopt_bench(
  p_bench_id text,
  p_session_token uuid,
  p_adopter_name text,
  p_plaque_message text,
  p_duration_years integer,
  p_additional_contribution_amount numeric,
  p_payment_method text,
  p_is_anonymous boolean
)
returns table (
  success boolean,
  message text,
  adoption_start date,
  adoption_end date,
  contribution_amount numeric,
  additional_contribution_amount numeric,
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
  additional_amount numeric := coalesce(p_additional_contribution_amount, 0);
  minimum_amount numeric;
  total_amount numeric;
begin
  if p_adopter_name is null
    or char_length(btrim(p_adopter_name)) not between 2 and 80 then
    return query select false, 'Enter a name between 2 and 80 characters'::text,
      null::date, null::date, null::numeric, null::numeric, null::text,
      null::boolean, null::text;
    return;
  end if;

  if p_plaque_message is null
    or char_length(btrim(p_plaque_message)) not between 2 and 160 then
    return query select false, 'Enter a plaque message between 2 and 160 characters'::text,
      null::date, null::date, null::numeric, null::numeric, null::text,
      null::boolean, null::text;
    return;
  end if;

  if p_duration_years is null or p_duration_years not between 10 and 99 then
    return query select false, 'Choose a term from 10 to 99 years'::text,
      null::date, null::date, null::numeric, null::numeric, null::text,
      null::boolean, null::text;
    return;
  end if;

  minimum_amount := 3500 + ((p_duration_years - 10) * 350);
  total_amount := minimum_amount + additional_amount;

  if additional_amount < 0 or total_amount > 999999.99 then
    return query select false, 'Choose a valid additional donation'::text,
      null::date, null::date, null::numeric, null::numeric, null::text,
      null::boolean, null::text;
    return;
  end if;

  if p_payment_method is null
    or p_payment_method not in ('card', 'bank', 'zelle', 'check', 'stock', 'daf') then
    return query select false, 'Choose a supported payment method'::text,
      null::date, null::date, null::numeric, null::numeric, null::text,
      null::boolean, null::text;
    return;
  end if;

  perform 1 from public.benches where benches.id = p_bench_id for update;
  if not found then
    return query select false, 'Bench not found'::text,
      null::date, null::date, null::numeric, null::numeric, null::text,
      null::boolean, null::text;
    return;
  end if;

  if exists (
    select 1
    from public.bench_adoptions
    where bench_adoptions.bench_id = p_bench_id
      and current_date between bench_adoptions.adoption_start and bench_adoptions.adoption_end
  ) then
    return query select false, 'This bench is already adopted'::text,
      null::date, null::date, null::numeric, null::numeric, null::text,
      null::boolean, null::text;
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
      null::date, null::date, null::numeric, null::numeric, null::text,
      null::boolean, null::text;
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
    additional_contribution_amount,
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
    total_amount,
    additional_amount,
    p_payment_method,
    p_is_anonymous,
    receipt_ref
  );

  delete from public.bench_adoption_holds
  where bench_adoption_holds.bench_id = p_bench_id
    and bench_adoption_holds.session_token = p_session_token;

  return query select true, 'Bench adopted'::text, start_on, end_on,
    total_amount, additional_amount, p_payment_method, p_is_anonymous,
    receipt_ref;
end;
$$;

revoke all on function public.adopt_bench(text, uuid, text, text, integer, numeric, text, boolean) from public;
grant execute on function public.adopt_bench(text, uuid, text, text, integer, numeric, text, boolean) to anon, authenticated;
