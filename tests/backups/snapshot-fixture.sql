-- Synthetic fixture only. Refuse a renamed/remote database before any DDL.
do $$
begin
  if current_database() <> 'dic_snapshot_ci' or inet_server_addr() is not null then
    raise exception 'Backup snapshot fixture requires the local dic_snapshot_ci database';
  end if;
end;
$$;
create schema auth;
create schema private;
create table auth.users (id bigint primary key, fixture_label text);
create table auth.identities (id bigint primary key, user_id bigint references auth.users);
create table private.beta_members (id bigint primary key);
create table private.import_control (id bigint primary key);
create table private.import_batches (id bigint primary key);
create table public.account_preferences (id bigint primary key);
create table public.coffees (id bigint primary key, fixture_label text, verification_state text);
create table public.setups (id bigint primary key);
create table public.library_entries (id bigint primary key);
create table public.shots (id bigint primary key, legacy_import boolean);
alter table public.coffees enable row level security;
create policy synthetic_coffee_read on public.coffees for select using (true);
create function public.dic_snapshot_signup() returns trigger language plpgsql as $$
begin return new; end;
$$;
create trigger dic_auth_user_created after insert on auth.users
for each row execute function public.dic_snapshot_signup();
insert into auth.users values (1, 'synthetic-original');
insert into auth.identities values (1, 1);
insert into private.beta_members values (1);
insert into private.import_control values (1);
insert into private.import_batches values (1);
insert into public.account_preferences values (1);
insert into public.coffees values (1, 'synthetic-original', 'verified');
insert into public.setups values (1);
insert into public.library_entries values (1);
insert into public.shots values (1, true);
