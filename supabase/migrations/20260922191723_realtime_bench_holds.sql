create function public.notify_bench_hold()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.bench_updates (bench_id) values (old.bench_id);
    return old;
  end if;

  insert into public.bench_updates (bench_id) values (new.bench_id);
  return new;
end;
$$;

create trigger notify_bench_hold_change
after insert or update or delete on public.bench_adoption_holds
for each row execute function public.notify_bench_hold();

revoke all on function public.notify_bench_hold() from public;
