-- The Dial In Collective: equipment versions and private workspaces.
create table public.setups (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 100), active_version_id uuid, archived_at timestamptz,
 revision bigint not null default 1 check(revision>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,id)
);
create table public.setup_versions (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, setup_id uuid not null,
 label text not null default 'Original equipment', machine_model text, grinder_model text, burr_set text,
 created_at timestamptz not null default now(), unique(owner_id,setup_id,id),
 foreign key(owner_id,setup_id) references public.setups(owner_id,id) on delete cascade
);
alter table public.setups add constraint setup_active_version_fk foreign key(owner_id,id,active_version_id) references public.setup_versions(owner_id,setup_id,id) deferrable initially deferred;
create index setup_active_version_idx on public.setups(owner_id,id,active_version_id);
alter table public.account_preferences add column active_setup_id uuid;
alter table public.account_preferences add constraint account_active_setup_fk foreign key(owner_id,active_setup_id) references public.setups(owner_id,id) deferrable initially deferred;
create index account_active_setup_idx on public.account_preferences(owner_id,active_setup_id);
create table public.grinder_calibrations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, setup_id uuid not null,
 grinder_model text, burr_set text,
 finest_setting numeric not null check(finest_setting>=0 and finest_setting<'Infinity'::numeric),
 coarsest_setting numeric not null check(coarsest_setting>finest_setting and coarsest_setting<'Infinity'::numeric),
 previous_calibration_id uuid, created_at timestamptz not null default now(), unique(owner_id,setup_id,id),
 foreign key(owner_id,setup_id) references public.setups(owner_id,id) on delete cascade,
 foreign key(owner_id,setup_id,previous_calibration_id) references public.grinder_calibrations(owner_id,setup_id,id),
 check(previous_calibration_id is null or previous_calibration_id<>id)
);
create index calibration_previous_idx on public.grinder_calibrations(owner_id,setup_id,previous_calibration_id);
create table public.baskets (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, setup_id uuid not null,
 name text not null check(length(btrim(name)) between 1 and 100), archived_at timestamptz,
 revision bigint not null default 1 check(revision>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,setup_id,id), foreign key(owner_id,setup_id) references public.setups(owner_id,id) on delete cascade
);
create table public.basket_versions (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, setup_id uuid not null, basket_id uuid not null,
 basket_dose_g numeric not null check(basket_dose_g between 5 and 40), model text, created_at timestamptz not null default now(), unique(owner_id,setup_id,id),
 foreign key(owner_id,setup_id,basket_id) references public.baskets(owner_id,setup_id,id) on delete cascade
);
create index basket_version_basket_idx on public.basket_versions(owner_id,setup_id,basket_id);
create table public.setup_preferences (
 owner_id uuid not null references auth.users(id) on delete cascade, setup_id uuid not null, setup_version_id uuid not null,
 calibration_id uuid, default_basket_version_id uuid,
 track_temperature boolean not null default false, track_slow_feed boolean not null default false, multiple_baskets boolean not null default false,
 slow_feed boolean not null default false, temperature_unit text not null default 'F' check(temperature_unit in ('F','C')),
 revision bigint not null default 1 check(revision>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(owner_id,setup_id,setup_version_id),
 foreign key(owner_id,setup_id,setup_version_id) references public.setup_versions(owner_id,setup_id,id) on delete cascade,
 foreign key(owner_id,setup_id,calibration_id) references public.grinder_calibrations(owner_id,setup_id,id),
 foreign key(owner_id,setup_id,default_basket_version_id) references public.basket_versions(owner_id,setup_id,id),
 check(track_slow_feed or not slow_feed)
);
create index preferences_calibration_idx on public.setup_preferences(owner_id,setup_id,calibration_id);
create index preferences_basket_idx on public.setup_preferences(owner_id,setup_id,default_basket_version_id);
create table public.bags (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, library_entry_id uuid not null,
 roast_date date, frozen boolean not null default false, archived_at timestamptz,
 revision bigint not null default 1 check(revision>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,library_entry_id,id), foreign key(owner_id,library_entry_id) references public.library_entries(owner_id,id) on delete cascade
);
create unique index bag_active_once_idx on public.bags(owner_id,library_entry_id) where archived_at is null;
create table public.workspace_state (
 owner_id uuid not null references auth.users(id) on delete cascade, setup_id uuid not null, setup_version_id uuid not null,
 current_library_entry_id uuid,
 sort_order text not null default 'recent' check(sort_order in ('recent','az')),
 revision bigint not null default 1 check(revision>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(owner_id,setup_id,setup_version_id),
 foreign key(owner_id,setup_id,setup_version_id) references public.setup_versions(owner_id,setup_id,id) on delete cascade,
 foreign key(owner_id,current_library_entry_id) references public.library_entries(owner_id,id)
);
create index workspace_current_idx on public.workspace_state(owner_id,current_library_entry_id);
create table public.workspace_coffees (
 owner_id uuid not null references auth.users(id) on delete cascade, setup_id uuid not null, setup_version_id uuid not null, library_entry_id uuid not null,
 selected_style text not null default 'Traditional' check(selected_style in ('Traditional','Turbo','Ristretto','Lungo','Custom')),
 basket_version_id uuid, last_logged_at timestamptz,
 revision bigint not null default 1 check(revision>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(owner_id,setup_id,setup_version_id,library_entry_id),
 foreign key(owner_id,setup_id,setup_version_id) references public.setup_versions(owner_id,setup_id,id) on delete cascade,
 foreign key(owner_id,library_entry_id) references public.library_entries(owner_id,id) on delete cascade,
 foreign key(owner_id,setup_id,basket_version_id) references public.basket_versions(owner_id,setup_id,id)
);
create index workspace_coffee_library_idx on public.workspace_coffees(owner_id,library_entry_id);
create index workspace_coffee_basket_idx on public.workspace_coffees(owner_id,setup_id,basket_version_id);
create index workspace_recent_idx on public.workspace_coffees(owner_id,setup_id,setup_version_id,last_logged_at desc);

-- Reads are private to admitted owners. Mutations remain server-only until
-- version-checked APIs can validate full setup/basket/calibration transitions.
do $$ declare t text; begin
 foreach t in array array['setups','setup_versions','grinder_calibrations','baskets','basket_versions','setup_preferences','bags','workspace_state','workspace_coffees'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from public,anon,authenticated',t);
  execute format('grant all on table public.%I to service_role',t);
  execute format('grant select on table public.%I to authenticated',t);
  execute format('create policy owner_read on public.%I for select to authenticated using((select private.is_member()) and owner_id=(select auth.uid()))',t);
 end loop;
 foreach t in array array['setups','baskets','setup_preferences','bags','workspace_state','workspace_coffees'] loop
  execute format('create trigger bump_revision before update on public.%I for each row execute function private.bump_revision()',t);
 end loop;
 foreach t in array array['setup_versions','grinder_calibrations','basket_versions'] loop
  execute format('create trigger immutable_version before update on public.%I for each row execute function private.reject_version_update()',t);
 end loop;
end $$;
comment on table public.setup_versions is 'Major grinder/burr/machine change creates a version; basket changes and zero-point recalibration do not. Historical versions are immutable.';
comment on table public.workspace_state is 'Pin moves only after saved shot via the future shot mutation API. Adding/browsing coffee does not make it current. Hardware replacement can copy prior pin deliberately.';
