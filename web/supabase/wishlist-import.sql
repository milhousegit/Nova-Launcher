create or replace function public.nova_import_steam_wishlist(p_items jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); items jsonb;
begin
 if uid is null then raise exception 'Sign in required';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>5000 then raise exception 'Invalid list';end if;
 select coalesce(jsonb_agg(distinct value),'[]'::jsonb) into items from jsonb_array_elements(p_items) where jsonb_typeof(value)='string' and value#>>'{}' ~ '^[0-9]{1,12}$';
 update public.nova_profiles set payload=jsonb_set(payload,'{preferences}',coalesce(payload->'preferences','{}'::jsonb)||jsonb_build_object('wishlistSteam',items,'wishlistSteamUpdatedAt',now()),true),revision=revision+1,updated_at=now() where user_id=uid;
 return items;
end;$$;
revoke all on function public.nova_import_steam_wishlist(jsonb) from public,anon;
grant execute on function public.nova_import_steam_wishlist(jsonb) to authenticated;
