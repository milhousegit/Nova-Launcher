-- Run once in the project's Supabase SQL editor before deploying the new client.
-- The library/catalog payload never contains API credentials.
begin;
create table if not exists public.nova_artwork_credentials (
 user_id uuid primary key references auth.users(id) on delete cascade,
 sg_key text not null check (sg_key ~ '^[a-fA-F0-9]{32}$'),
 updated_at timestamptz not null default now()
);
alter table public.nova_artwork_credentials enable row level security;
alter table public.nova_artwork_credentials force row level security;
revoke all on public.nova_artwork_credentials from anon;
revoke all on public.nova_artwork_credentials from authenticated;
grant select, insert, update, delete on public.nova_artwork_credentials to authenticated;
drop policy if exists artwork_credentials_owner on public.nova_artwork_credentials;
create policy artwork_credentials_owner on public.nova_artwork_credentials
 for all to authenticated using ((select auth.uid()) = user_id)
 with check ((select auth.uid()) = user_id);
commit;
