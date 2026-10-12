-- The Dial In Collective: catalog and personal library foundation.
-- Canonical facts are server-managed. Clients may submit evidence, not publish it.
create table public.coffee_groups (
 id uuid primary key default gen_random_uuid(),
 label text not null check(length(btrim(label)) between 1 and 200),
 created_at timestamptz not null default now()
);
create table public.coffees (
 id uuid primary key default gen_random_uuid(),
 group_id uuid references public.coffee_groups(id),
 name text not null check(length(btrim(name)) between 1 and 200),
 roaster text not null check(length(btrim(roaster)) between 1 and 200),
 release_label text,
 origin text, elevation_m text,
 roast_level text check(roast_level in ('Light','Light-Medium','Medium','Medium-Dark','Dark')),
 process text, variety text, producer text, tasting_notes text, summary text, espresso_notes text,
 roaster_recipe jsonb check(roaster_recipe is null or jsonb_typeof(roaster_recipe)='object'),
 verification_state text not null default 'pending' check(verification_state in ('pending','verified','rejected','merged')),
 availability text not null default 'unknown' check(availability in ('unknown','available','retired')),
 merged_into_id uuid references public.coffees(id),
 revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(merged_into_id is null or merged_into_id<>id),
 check((verification_state='merged')=(merged_into_id is not null))
);
create index coffees_group_idx on public.coffees(group_id);
create index coffees_merge_idx on public.coffees(merged_into_id);
create table public.coffee_sources (
 id uuid primary key default gen_random_uuid(),
 coffee_id uuid not null references public.coffees(id),
 source_url text check(length(source_url)<=4000 and source_url ~ '^https?://'),
 source_kind text not null check(source_kind in ('roaster_page','label','verified_secondary')),
 field_values jsonb not null default '{}' check(jsonb_typeof(field_values)='object'),
 evidence_excerpt text check(length(evidence_excerpt)<=12000),
 checked_at timestamptz not null default now()
);
create index sources_coffee_idx on public.coffee_sources(coffee_id);
comment on table public.coffee_sources is 'URLs are evidence, not identity: one URL may represent successive releases. Original image bytes are not stored here. Fetch services must independently validate URLs against SSRF.';
create table public.coffee_submissions (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 proposed_data jsonb not null check(jsonb_typeof(proposed_data)='object' and octet_length(proposed_data::text)<=32000),
 source_url text check(length(source_url)<=4000 and source_url ~ '^https?://'),
 canonical_coffee_id uuid references public.coffees(id),
 base_coffee_revision bigint check(base_coffee_revision>0),
 status text not null default 'pending' check(status in ('pending','approved','merged','rejected','conflict')),
 revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,id)
);
create index submissions_coffee_idx on public.coffee_submissions(canonical_coffee_id);
create table public.library_entries (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 coffee_id uuid references public.coffees(id),
 submission_id uuid,
 hidden_at timestamptz,
 revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,id),
 foreign key(owner_id,submission_id) references public.coffee_submissions(owner_id,id),
 check(coffee_id is not null or submission_id is not null)
);
create unique index library_coffee_once_idx on public.library_entries(owner_id,coffee_id) where coffee_id is not null;
create unique index library_submission_once_idx on public.library_entries(owner_id,submission_id) where submission_id is not null;
create index library_coffee_idx on public.library_entries(coffee_id);

do $$ declare t text; begin
 foreach t in array array['coffee_groups','coffees','coffee_sources','coffee_submissions','library_entries'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from public,anon,authenticated',t);
  execute format('grant all on table public.%I to service_role',t);
  execute format('grant select on table public.%I to authenticated',t);
 end loop;
 foreach t in array array['coffees','coffee_submissions','library_entries'] loop
  execute format('create trigger bump_revision before update on public.%I for each row execute function private.bump_revision()',t);
 end loop;
end $$;
create policy coffee_read on public.coffees for select to authenticated using((select private.is_member()) and (verification_state='verified' or (select private.is_admin())));
create policy group_read on public.coffee_groups for select to authenticated using((select private.is_member()) and exists(select 1 from public.coffees c where c.group_id=coffee_groups.id and c.verification_state='verified'));
create policy source_read on public.coffee_sources for select to authenticated using((select private.is_member()) and exists(select 1 from public.coffees c where c.id=coffee_sources.coffee_id and c.verification_state='verified'));
create policy submission_read on public.coffee_submissions for select to authenticated using((select private.is_member()) and (owner_id=(select auth.uid()) or (select private.is_admin())));
create policy submission_insert on public.coffee_submissions for insert to authenticated with check((select private.is_member()) and owner_id=(select auth.uid()) and (canonical_coffee_id is null or exists(select 1 from public.coffees c where c.id=canonical_coffee_id and c.verification_state='verified')));
grant insert(id,owner_id,proposed_data,source_url,canonical_coffee_id,base_coffee_revision) on public.coffee_submissions to authenticated;
create policy library_read on public.library_entries for select to authenticated using((select private.is_member()) and owner_id=(select auth.uid()));
-- Library creation/hiding will use version-checked mutation endpoints; no direct writes yet.
