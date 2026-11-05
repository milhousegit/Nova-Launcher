create table if not exists public.nova_credential_backups (
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check(provider in ('steam_api','steamgriddb','steam_session')),
 encrypted jsonb not null check(jsonb_typeof(encrypted)='object' and octet_length(encrypted::text)<49152),
 updated_at timestamptz not null default now(),
 primary key(user_id,provider)
);
alter table public.nova_credential_backups enable row level security;
alter table public.nova_credential_backups force row level security;
revoke all on public.nova_credential_backups from anon;
grant select,insert,update,delete on public.nova_credential_backups to authenticated;
create policy "Owner manages encrypted credential backups" on public.nova_credential_backups for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
