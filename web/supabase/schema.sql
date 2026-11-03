create table if not exists public.nova_catalog (
 steam_id text primary key check(steam_id ~ '^[0-9]{1,12}$'), data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.nova_catalog enable row level security;
create policy nova_catalog_read on public.nova_catalog for select to authenticated using (true);
revoke all on public.nova_catalog from anon,authenticated;
grant select on public.nova_catalog to authenticated;
create table if not exists public.nova_remote_sync (
 user_id uuid primary key references auth.users(id) on delete cascade,
 requested_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','running','completed','failed')),
 completed_at timestamptz, message text not null default '' check(length(message)<=500)
);
alter table public.nova_remote_sync enable row level security;
create policy nova_sync_read on public.nova_remote_sync for select to authenticated using ((select auth.uid())=user_id);
create policy nova_sync_insert on public.nova_remote_sync for insert to authenticated with check ((select auth.uid())=user_id);
create policy nova_sync_update on public.nova_remote_sync for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.nova_remote_sync from anon;
grant select,insert,update on public.nova_remote_sync to authenticated;
create or replace function public.nova_set_wishlist(p_steam_id text,p_saved boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_payload jsonb; wishes jsonb; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required'; end if;
 if p_steam_id !~ '^[0-9]{1,12}$' or p_saved is null then raise exception 'Invalid wishlist update'; end if;
 insert into public.nova_profiles(user_id,payload,revision,updated_at) values(uid,'{"version":1,"games":[],"accounts":{},"preferences":{"wishlistNova":[]}}'::jsonb,0,now()) on conflict(user_id) do nothing;
 select payload into current_payload from public.nova_profiles where user_id=uid for update;
 select coalesce(jsonb_agg(value), '[]'::jsonb) into wishes from jsonb_array_elements(coalesce(current_payload#>'{preferences,wishlistNova}','[]'::jsonb)) where value<>to_jsonb(p_steam_id);
 if p_saved then wishes:=wishes||jsonb_build_array(p_steam_id);end if;
 if jsonb_array_length(wishes)>5000 then raise exception 'Wishlist limit reached';end if;
 current_payload:=jsonb_set(current_payload,'{preferences}',coalesce(current_payload->'preferences','{}'::jsonb)||jsonb_build_object('wishlistNova',wishes),true);
 update public.nova_profiles set payload=current_payload,revision=revision+1,updated_at=now() where user_id=uid;
 return wishes;
end;$$;
revoke all on function public.nova_set_wishlist(text,boolean) from public,anon;
grant execute on function public.nova_set_wishlist(text,boolean) to authenticated;
