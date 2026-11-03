create table if not exists public.nova_friends (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null default '{"version":1,"friends":[]}'::jsonb check (octet_length(payload::text)<1500000),
 updated_at timestamptz not null default now()
);
alter table public.nova_friends enable row level security;
revoke all on public.nova_friends from anon;
grant select,insert,update,delete on public.nova_friends to authenticated;
create policy "Own friends only" on public.nova_friends for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
