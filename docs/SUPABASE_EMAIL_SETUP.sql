-- Add a private send quota for the staff email Edge Function.
-- Apply after SUPABASE_SETUP.sql. Never expose this table to browser roles.

create table if not exists public.staff_email_send_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now()
);
create index if not exists staff_email_send_log_user_sent_idx
  on public.staff_email_send_log(user_id, sent_at desc);
create index if not exists staff_email_send_log_sent_idx
  on public.staff_email_send_log(sent_at desc);

alter table public.staff_email_send_log enable row level security;
revoke all on public.staff_email_send_log from public, anon, authenticated;
grant all on public.staff_email_send_log to service_role;

create or replace function public.consume_staff_email_send_slot(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  user_hour_count integer;
  total_day_count integer;
begin
  if p_user_id is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  if not exists (
    select 1 from public.staff_members s where s.user_id = p_user_id
  ) then
    return false;
  end if;

  select count(*) into user_hour_count
  from public.staff_email_send_log
  where user_id = p_user_id and sent_at > now() - interval '1 hour';

  select count(*) into total_day_count
  from public.staff_email_send_log
  where sent_at > now() - interval '24 hours';

  -- Conservative website limits; Amelu applies its own domain limits too.
  if user_hour_count >= 10 or total_day_count >= 50 then
    return false;
  end if;

  insert into public.staff_email_send_log(user_id) values (p_user_id);
  return true;
end
$$;

revoke all on function public.consume_staff_email_send_slot(uuid) from public, anon, authenticated;
grant execute on function public.consume_staff_email_send_slot(uuid) to service_role;
