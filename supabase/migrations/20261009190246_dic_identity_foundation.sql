-- The Dial In Collective: identity and access foundation.
-- No users, credentials, beta memberships, or admin roles are seeded.
create schema private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
alter default privileges in schema private revoke execute on functions from public;

create table private.beta_members (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  admitted_at timestamptz,
  created_at timestamptz not null default now()
);
create table private.app_admins (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table private.contributors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table private.contributors is 'Private mapping between account and contribution grouping. Account removal detaches identity without deleting shared evidence. Never returned by community APIs.';
create table private.beta_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  revoked_at timestamptz,
  expires_at timestamptz,
  max_uses integer check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  created_at timestamptz not null default now(),
  check (max_uses is null or uses <= max_uses)
);
create table private.mutation_receipts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  request_hash text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id,mutation_id)
);
create table private.backup_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running','succeeded','failed')),
  encrypted_object_id text,
  checksum_sha256 text,
  coverage jsonb not null default '{}' check (jsonb_typeof(coverage)='object'),
  restore_tested_at timestamptz,
  error_summary text
);
comment on table private.backup_runs is 'Status only. This migration does not schedule backups or configure Drive credentials.';

do $$ declare t text; begin
  foreach t in array array['beta_members','app_admins','contributors','beta_invites','mutation_receipts','backup_runs'] loop
    execute format('alter table private.%I enable row level security',t);
    execute format('revoke all on table private.%I from public,anon,authenticated',t);
    execute format('grant all on table private.%I to service_role',t);
    execute format('create policy no_client_access on private.%I for all to anon,authenticated using(false) with check(false)',t);
  end loop;
end $$;

create function private.is_member() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.beta_members m where m.owner_id=(select auth.uid()) and m.enabled);
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select private.is_member() and exists(select 1 from private.app_admins a where a.owner_id=(select auth.uid()));
$$;
revoke all on function private.is_member(),private.is_admin() from public,anon,authenticated;
grant execute on function private.is_member(),private.is_admin() to authenticated,service_role;

create table public.account_preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  tasting_preferences text not null default '' check (length(tasting_preferences)<=4000),
  revision bigint not null default 1 check (revision>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.account_preferences enable row level security;
revoke all on public.account_preferences from public,anon,authenticated;
grant all on public.account_preferences to service_role;
grant select,update(theme,tasting_preferences) on public.account_preferences to authenticated;
create policy owner_read on public.account_preferences for select to authenticated using((select private.is_member()) and owner_id=(select auth.uid()));
create policy owner_update on public.account_preferences for update to authenticated using((select private.is_member()) and owner_id=(select auth.uid())) with check((select private.is_member()) and owner_id=(select auth.uid()));

create function private.bump_revision() returns trigger language plpgsql set search_path='' as $$
begin
  new.revision:=old.revision+1;
  new.updated_at:=clock_timestamp();
  new.created_at:=old.created_at;
  return new;
end $$;
revoke all on function private.bump_revision() from public,anon,authenticated;
create trigger bump_revision before update on public.account_preferences for each row execute function private.bump_revision();

create function private.handle_new_auth_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.account_preferences(owner_id) values(new.id);
  insert into private.beta_members(owner_id) values(new.id);
  insert into private.contributors(owner_id) values(new.id);
  return new;
end $$;
revoke all on function private.handle_new_auth_user() from public,anon,authenticated;
create trigger dic_auth_user_created after insert on auth.users for each row execute function private.handle_new_auth_user();

create function private.reject_version_update() returns trigger language plpgsql set search_path='' as $$
begin
  raise exception using errcode='23514',message='Historical equipment versions are immutable; create a new version.';
end $$;
revoke all on function private.reject_version_update() from public,anon,authenticated;
