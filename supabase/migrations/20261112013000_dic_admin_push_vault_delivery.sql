-- #1938: encrypted VAPID custody stays entirely inside Supabase.
-- No VAPID key, service role credential, email, member record or notification
-- content is copied to Netlify or the browser. No existing record is changed.
create table if not exists private.dic_admin_push_runtime (
 singleton boolean primary key default true check (singleton=true),
 vapid_public text not null,
 vault_secret_id uuid not null,
 last_polled_at timestamptz
);
alter table private.dic_admin_push_runtime enable row level security;
revoke all on private.dic_admin_push_runtime from public,anon,authenticated;

create or replace function public.dic_admin_push_runtime_keys()
returns jsonb language plpgsql volatile security definer set search_path='' as $fn$
declare info jsonb;
begin
 select jsonb_build_object('publicKey',r.vapid_public,'privateKey',d.decrypted_secret)
 into info from private.dic_admin_push_runtime r
 join vault.decrypted_secrets d on d.id=r.vault_secret_id
 where r.singleton=true;
 return info;
end;
$fn$;
revoke all on function public.dic_admin_push_runtime_keys() from public,anon,authenticated;
grant execute on function public.dic_admin_push_runtime_keys() to service_role;

create or replace function public.dic_admin_push_bootstrap_key(
 p_public_key text,p_private_key text
) returns text language plpgsql volatile security definer set search_path='' as $fn$
declare existing_key text; secret_id uuid;
begin
 perform pg_catalog.pg_advisory_xact_lock(1938,20261112);
 select r.vapid_public into existing_key
 from private.dic_admin_push_runtime r where r.singleton=true;
 if existing_key is not null then return existing_key; end if;
 if p_public_key !~ '^[A-Za-z0-9_-]{87}$' or p_private_key !~ '^[A-Za-z0-9_-]{43}$'
 then raise exception 'Invalid VAPID key material'; end if;
 secret_id:=vault.create_secret(
  p_private_key,'dic_admin_push_vapid_private_20261112',
  'Only service-role Edge Functions may decrypt this VAPID signing key');
 insert into private.dic_admin_push_runtime(singleton,vapid_public,vault_secret_id)
 values(true,p_public_key,secret_id);
 return p_public_key;
end;
$fn$;
revoke all on function public.dic_admin_push_bootstrap_key(text,text) from public,anon,authenticated;
grant execute on function public.dic_admin_push_bootstrap_key(text,text) to service_role;

create or replace function public.dic_admin_push_claim_poll()
returns boolean language plpgsql volatile security definer set search_path='' as $fn$
declare won boolean;
begin
 update private.dic_admin_push_runtime set last_polled_at=now()
 where singleton=true
   and (last_polled_at is null or last_polled_at<=now()-interval '4 minutes')
 returning true into won;
 return coalesce(won,false);
end;
$fn$;
revoke all on function public.dic_admin_push_claim_poll() from public,anon,authenticated;
grant execute on function public.dic_admin_push_claim_poll() to service_role;
comment on function public.dic_admin_push_claim_poll() is
 'Service-role rate gate prevents anonymous cron trigger replay and duplicate push deliveries.';
