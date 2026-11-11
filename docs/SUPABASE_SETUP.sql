-- Optional secure backend for CoolWips SMP reports and staff dashboard.
-- Run in a NEW Supabase project SQL editor. Never publish your service-role key.
-- Creates only private reports, staff role membership, and two limited public RPCs.

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'moderator' check (role in ('moderator','admin','owner')),
  created_at timestamptz not null default now()
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,24),
  category text not null check (category in ('player','appeal','claim','waypoint','other')),
  username text not null check (char_length(username) between 2 and 32),
  details text not null check (char_length(details) between 12 and 2000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','closed')),
  staff_note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists reports_created_idx on public.reports(created_at desc);
create index if not exists reports_username_created_idx on public.reports(lower(username),created_at desc);

alter table public.staff_members enable row level security;
alter table public.reports enable row level security;
revoke all on public.staff_members from anon, authenticated;
revoke all on public.reports from anon, authenticated;
grant select on public.staff_members to authenticated;
grant select on public.reports to authenticated;
grant update (status, staff_note) on public.reports to authenticated;

drop policy if exists "Staff may see their own membership" on public.staff_members;
create policy "Staff may see their own membership" on public.staff_members
 for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Only staff may read reports" on public.reports;
create policy "Only staff may read reports" on public.reports
 for select to authenticated using (
  exists (select 1 from public.staff_members s where s.user_id=(select auth.uid()))
 );
drop policy if exists "Only staff may update reports" on public.reports;
create policy "Only staff may update reports" on public.reports
 for update to authenticated
 using (exists (select 1 from public.staff_members s where s.user_id=(select auth.uid())) )
 with check (exists (select 1 from public.staff_members s where s.user_id=(select auth.uid())));

-- Public users can submit a report through this function, but cannot read the private table.
create or replace function public.submit_report(
 p_category text,p_username text,p_details text
) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare new_code text;
begin
 if p_category not in ('player','appeal','claim','waypoint','other')
  or char_length(trim(coalesce(p_username,''))) not between 2 and 32
  or char_length(trim(coalesce(p_details,''))) not between 12 and 2000
 then raise exception 'Invalid report fields'; end if;
 -- Basic per-username throttling. Add a verified CAPTCHA / Edge Function for public scale.
 if (select count(*) from public.reports
     where lower(username)=lower(trim(p_username))
       and created_at > now()-interval '15 minutes') >= 3
 then raise exception 'Too many recent reports for this username'; end if;
 insert into public.reports(category,username,details)
 values(p_category,trim(p_username),trim(p_details))
 returning code into new_code;
 return new_code;
end $$;
revoke all on function public.submit_report(text,text,text) from public;
grant execute on function public.submit_report(text,text,text) to anon,authenticated;

-- A random 24-hex code only reveals ticket status, never report details.
create or replace function public.report_status(p_code text)
returns table(status text, submitted_at timestamptz)
language sql security definer set search_path = public, pg_temp as $$
 select r.status, r.created_at
 from public.reports r
 where r.code = p_code and p_code ~ '^[a-f0-9]{24}$'
 limit 1
$$;
revoke all on function public.report_status(text) from public;
grant execute on function public.report_status(text) to anon,authenticated;

-- Then in Supabase Auth create your own staff users, verify their emails,
-- and allow ONLY approved auth user IDs into staff_members.
-- Example (replace ID with the exact UUID from Authentication > Users):
-- insert into public.staff_members(user_id,role)
-- values ('YOUR_REAL_STAFF_AUTH_UUID', 'owner');

-- SECURITY: Never add an anon SELECT policy on reports or staff_members.
-- SECURITY: Do not enable public signup as a way of granting staff access.
