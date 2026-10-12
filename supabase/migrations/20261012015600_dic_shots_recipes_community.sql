-- The Dial In Collective: successful recipes, private history and shared projections.
-- Client write APIs, contribution validation and clustering are separate milestones.
create table public.recipe_families (
 id uuid primary key default gen_random_uuid(), coffee_id uuid not null references public.coffees(id),
 style text not null check(style in ('Traditional','Turbo','Ristretto','Lungo','Custom')),
 ratio_low numeric not null check(ratio_low>0), ratio_center numeric not null, ratio_high numeric not null check(ratio_high<'Infinity'::numeric),
 estimator_version text not null, evidence_state text not null default 'candidate' check(evidence_state in ('candidate','community_confirmed','retired')),
 created_at timestamptz not null default now(), unique(coffee_id,style,id), check(ratio_low<=ratio_center and ratio_center<=ratio_high)
);
create table public.personal_recipe_families (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 library_entry_id uuid not null, community_family_id uuid references public.recipe_families(id),
 style text not null check(style in ('Traditional','Turbo','Ristretto','Lungo','Custom')),
 statistics jsonb not null default '{}' check(jsonb_typeof(statistics)='object'), estimator_version text not null,
 evidence_state text not null default 'candidate' check(evidence_state in ('candidate','personally_confirmed','retired')),
 created_at timestamptz not null default now(), unique(owner_id,library_entry_id,style,id),
 foreign key(owner_id,library_entry_id) references public.library_entries(owner_id,id) on delete cascade
);
create index personal_family_community_idx on public.personal_recipe_families(community_family_id);
create table public.recipe_preferences (
 owner_id uuid not null references auth.users(id) on delete cascade, setup_id uuid not null, setup_version_id uuid not null, library_entry_id uuid not null,
 style text not null check(style in ('Traditional','Turbo','Ristretto','Lungo','Custom')),
 current_family_id uuid, reference_family_id uuid, favorite_shot_id uuid,
 revision bigint not null default 1 check(revision>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(owner_id,setup_id,setup_version_id,library_entry_id,style),
 foreign key(owner_id,setup_id,setup_version_id) references public.setup_versions(owner_id,setup_id,id) on delete cascade,
 foreign key(owner_id,library_entry_id) references public.library_entries(owner_id,id) on delete cascade,
 foreign key(owner_id,library_entry_id,style,current_family_id) references public.personal_recipe_families(owner_id,library_entry_id,style,id),
 foreign key(owner_id,library_entry_id,style,reference_family_id) references public.personal_recipe_families(owner_id,library_entry_id,style,id)
);
create index preference_current_family_idx on public.recipe_preferences(owner_id,library_entry_id,style,current_family_id);
create index preference_reference_family_idx on public.recipe_preferences(owner_id,library_entry_id,style,reference_family_id);
create table public.experiments (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 setup_id uuid not null, setup_version_id uuid not null, library_entry_id uuid not null,
 style text not null check(style in ('Traditional','Turbo','Ristretto','Lungo','Custom')),
 base_family_id uuid, state text not null default 'active' check(state in ('active','ended','promoted')),
 created_at timestamptz not null default now(), ended_at timestamptz,
 unique(owner_id,setup_id,setup_version_id,library_entry_id,style,id),
 foreign key(owner_id,setup_id,setup_version_id) references public.setup_versions(owner_id,setup_id,id) on delete cascade,
 foreign key(owner_id,library_entry_id) references public.library_entries(owner_id,id) on delete cascade,
 foreign key(owner_id,library_entry_id,style,base_family_id) references public.personal_recipe_families(owner_id,library_entry_id,style,id),
 check((state='active')=(ended_at is null))
);
create unique index active_experiment_idx on public.experiments(owner_id,setup_id,setup_version_id,library_entry_id,style) where state='active';
create index experiment_library_idx on public.experiments(owner_id,library_entry_id);
create index experiment_base_idx on public.experiments(owner_id,library_entry_id,style,base_family_id);
create table public.shots (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 library_entry_id uuid not null, setup_id uuid not null, setup_version_id uuid not null, basket_version_id uuid not null, calibration_id uuid not null,
 bag_id uuid, experiment_id uuid, personal_family_id uuid,
 style text not null check(style in ('Traditional','Turbo','Ristretto','Lungo','Custom')),
 pulled_at timestamptz not null,
 dose_g numeric not null check(dose_g between 5 and 40), yield_g numeric not null check(yield_g between 5 and 200),
 ratio numeric generated always as(yield_g/dose_g) stored,
 time_s numeric not null check(time_s between 1 and 180),
 grind_setting numeric check(grind_setting>=0 and grind_setting<'Infinity'::numeric),
 temperature_c numeric check(temperature_c between 70 and 100),
 feed_mode text not null default 'unknown' check(feed_mode in ('unknown','standard','slow')),
 extraction smallint not null check(extraction between 1 and 5), body smallint not null check(body between 1 and 5),
 clarity smallint not null check(clarity between 1 and 5), sweetness smallint not null check(sweetness between 1 and 5), astringency smallint not null check(astringency between 1 and 5),
 is_dialed_in boolean generated always as(extraction=3 and body=3 and clarity=5 and sweetness=5 and astringency=1) stored,
 equipment_snapshot jsonb not null check(jsonb_typeof(equipment_snapshot)='object'),
 recommendation_context jsonb check(recommendation_context is null or jsonb_typeof(recommendation_context)='object'),
 legacy_import boolean not null default false, legacy_id text,
 hidden_at timestamptz, revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,id), unique(owner_id,setup_id,setup_version_id,library_entry_id,style,id),
 foreign key(owner_id,library_entry_id) references public.library_entries(owner_id,id) on delete cascade,
 foreign key(owner_id,setup_id,setup_version_id) references public.setup_versions(owner_id,setup_id,id),
 foreign key(owner_id,setup_id,basket_version_id) references public.basket_versions(owner_id,setup_id,id),
 foreign key(owner_id,setup_id,calibration_id) references public.grinder_calibrations(owner_id,setup_id,id),
 foreign key(owner_id,library_entry_id,bag_id) references public.bags(owner_id,library_entry_id,id),
 foreign key(owner_id,setup_id,setup_version_id,library_entry_id,style,experiment_id) references public.experiments(owner_id,setup_id,setup_version_id,library_entry_id,style,id),
 foreign key(owner_id,library_entry_id,style,personal_family_id) references public.personal_recipe_families(owner_id,library_entry_id,style,id),
 check(grind_setting is not null or legacy_import)
);
create unique index shot_legacy_once_idx on public.shots(owner_id,legacy_id) where legacy_id is not null;
create index shot_library_time_idx on public.shots(owner_id,library_entry_id,pulled_at desc);
create index shot_basket_idx on public.shots(owner_id,setup_id,basket_version_id);
create index shot_calibration_idx on public.shots(owner_id,setup_id,calibration_id);
create index shot_bag_idx on public.shots(owner_id,library_entry_id,bag_id);
create index shot_experiment_idx on public.shots(owner_id,setup_id,setup_version_id,library_entry_id,style,experiment_id);
create index shot_family_idx on public.shots(owner_id,library_entry_id,style,personal_family_id);
alter table public.recipe_preferences add constraint preferred_example_fk foreign key(owner_id,setup_id,setup_version_id,library_entry_id,style,favorite_shot_id) references public.shots(owner_id,setup_id,setup_version_id,library_entry_id,style,id) deferrable initially deferred;
create index preferred_example_idx on public.recipe_preferences(owner_id,setup_id,setup_version_id,library_entry_id,style,favorite_shot_id);
comment on column public.shots.is_dialed_in is 'All required sensory values green; time and style targets do not veto taste success. Numeric bounds retain prototype sanity guardrails. Basket Dose +/-1 g is not a hard constraint.';
create table public.shot_notes (
 owner_id uuid not null references auth.users(id) on delete cascade, shot_id uuid not null,
 notes text not null default '' check(length(notes)<=16000),
 primary key(owner_id,shot_id), foreign key(owner_id,shot_id) references public.shots(owner_id,id) on delete cascade
);
create table public.community_shots (
 id uuid primary key default gen_random_uuid(), coffee_id uuid not null references public.coffees(id), family_id uuid,
 style text not null check(style in ('Traditional','Turbo','Ristretto','Lungo','Custom')),
 dose_g numeric not null check(dose_g between 5 and 40), yield_g numeric not null check(yield_g between 5 and 200),
 ratio numeric generated always as(yield_g/dose_g) stored, time_s numeric not null check(time_s between 1 and 180),
 temperature_c numeric check(temperature_c between 70 and 100),
 extraction smallint not null check(extraction=3), body smallint not null check(body=3), clarity smallint not null check(clarity=5),
 sweetness smallint not null check(sweetness=5), astringency smallint not null check(astringency=1),
 machine_model text, grinder_model text, burr_set text, basket_model text, basket_dose_g numeric,
 grind_setting numeric check(grind_setting>=0 and grind_setting<'Infinity'::numeric),
 feed_mode text not null check(feed_mode in ('unknown','standard','slow')),
 quality_state text not null default 'pending_quality' check(quality_state in ('pending_quality','held','eligible','withdrawn')),
 observed_on date not null, updated_at timestamptz not null default now(),
 foreign key(coffee_id,style,family_id) references public.recipe_families(coffee_id,style,id)
);
create index community_family_idx on public.community_shots(coffee_id,style,family_id);
create index community_eligible_idx on public.community_shots(coffee_id,style,quality_state);
comment on table public.community_shots is 'Server-owned structured projection. Excludes raw shot IDs, account IDs, contributor IDs, private notes and setup names. Only validated eligible projections of verified coffees are visible.';
create table private.contribution_links (
 community_shot_id uuid primary key references public.community_shots(id),
 shot_id uuid unique references public.shots(id) on delete set null,
 contributor_id uuid not null references private.contributors(id), source_revision bigint not null,
 updated_at timestamptz not null default now()
);
create index contribution_contributor_idx on private.contribution_links(contributor_id);
create table private.shot_audit (
 id bigint generated always as identity primary key,
 owner_id uuid not null references auth.users(id) on delete cascade, shot_id uuid not null,
 action text not null, before_values jsonb, after_values jsonb, created_at timestamptz not null default now()
);
create index shot_audit_owner_idx on private.shot_audit(owner_id,shot_id);
create table public.admin_reviews (
 id uuid primary key default gen_random_uuid(), submission_id uuid references public.coffee_submissions(id) on delete set null,
 community_shot_id uuid references public.community_shots(id), reviewer_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('approve','merge','reject','hold','request_confirmation')),
 reason text not null check(length(reason)<=4000), evidence jsonb not null default '{}' check(jsonb_typeof(evidence)='object'), created_at timestamptz not null default now()
);
create index review_submission_idx on public.admin_reviews(submission_id);
create index review_shot_idx on public.admin_reviews(community_shot_id);
create index review_reviewer_idx on public.admin_reviews(reviewer_id);

-- No browser can directly publish shots, set eligibility, rewrite provenance,
-- grant beta admission, or forge confirmation/family statistics.
do $$ declare t text; begin
 foreach t in array array['recipe_families','personal_recipe_families','recipe_preferences','experiments','shots','shot_notes','community_shots','admin_reviews'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from public,anon,authenticated',t);
  execute format('grant all on table public.%I to service_role',t);
  execute format('grant select on table public.%I to authenticated',t);
 end loop;
 foreach t in array array['personal_recipe_families','recipe_preferences','experiments','shots','shot_notes'] loop
  execute format('create policy owner_read on public.%I for select to authenticated using((select private.is_member()) and owner_id=(select auth.uid()))',t);
 end loop;
 foreach t in array array['contribution_links','shot_audit'] loop
  execute format('alter table private.%I enable row level security',t);
  execute format('revoke all on table private.%I from public,anon,authenticated',t);
  execute format('grant all on table private.%I to service_role',t);
  execute format('create policy no_client_access on private.%I for all to anon,authenticated using(false) with check(false)',t);
 end loop;
end $$;
revoke all on sequence private.shot_audit_id_seq from public,anon,authenticated;
grant usage,select on sequence private.shot_audit_id_seq to service_role;
create policy family_read on public.recipe_families for select to authenticated using((select private.is_member()) and exists(select 1 from public.coffees c where c.id=recipe_families.coffee_id and c.verification_state='verified'));
create policy community_read on public.community_shots for select to authenticated using((select private.is_member()) and quality_state='eligible' and exists(select 1 from public.coffees c where c.id=community_shots.coffee_id and c.verification_state='verified'));
create policy review_read on public.admin_reviews for select to authenticated using((select private.is_admin()));
create trigger bump_revision before update on public.shots for each row execute function private.bump_revision();
create trigger bump_revision before update on public.recipe_preferences for each row execute function private.bump_revision();

create function private.capture_equipment_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
declare v public.setup_versions; b public.basket_versions; g public.grinder_calibrations;
begin
 select * into strict v from public.setup_versions where id=new.setup_version_id and owner_id=new.owner_id and setup_id=new.setup_id;
 select * into strict b from public.basket_versions where id=new.basket_version_id and owner_id=new.owner_id and setup_id=new.setup_id;
 select * into strict g from public.grinder_calibrations where id=new.calibration_id and owner_id=new.owner_id and setup_id=new.setup_id;
 if v.grinder_model is distinct from g.grinder_model or v.burr_set is distinct from g.burr_set then
  raise exception using errcode='23514',message='Calibration does not match the recorded grinder and burrs.';
 end if;
 new.equipment_snapshot:=jsonb_build_object('machine_model',v.machine_model,'grinder_model',v.grinder_model,'burr_set',v.burr_set,
 'basket_model',b.model,'basket_dose_g',b.basket_dose_g,'finest_setting',g.finest_setting,'coarsest_setting',g.coarsest_setting);
 return new;
end $$;
revoke all on function private.capture_equipment_snapshot() from public,anon,authenticated;
create trigger capture_equipment_snapshot before insert on public.shots for each row execute function private.capture_equipment_snapshot();
create function private.protect_shot_provenance() returns trigger language plpgsql set search_path='' as $$
begin
 if row(new.id,new.owner_id,new.library_entry_id,new.setup_id,new.setup_version_id,new.basket_version_id,new.calibration_id,new.equipment_snapshot,new.legacy_import,new.legacy_id)
 is distinct from row(old.id,old.owner_id,old.library_entry_id,old.setup_id,old.setup_version_id,old.basket_version_id,old.calibration_id,old.equipment_snapshot,old.legacy_import,old.legacy_id) then
  raise exception using errcode='23514',message='Historical shot provenance is immutable; use an audited correction workflow.';
 end if;
 return new;
end $$;
revoke all on function private.protect_shot_provenance() from public,anon,authenticated;
create trigger protect_shot_provenance before update on public.shots for each row execute function private.protect_shot_provenance();

create function private.project_shot() returns trigger language plpgsql security definer set search_path='' as $$
declare cid uuid; community_id uuid; contributor uuid; changed boolean:=true;
begin
 insert into private.shot_audit(owner_id,shot_id,action,before_values,after_values)
 values(new.owner_id,new.id,lower(tg_op),case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 select coffee_id into cid from public.library_entries where owner_id=new.owner_id and id=new.library_entry_id;
 select community_shot_id into community_id from private.contribution_links where shot_id=new.id;
 if not new.is_dialed_in or cid is null then
  if community_id is not null then
   update public.community_shots set quality_state='withdrawn',updated_at=clock_timestamp() where id=community_id;
   update private.contribution_links set source_revision=new.revision,updated_at=clock_timestamp() where shot_id=new.id;
  end if;
  return new;
 end if;
 if tg_op='UPDATE' then
  changed:=row(new.style,new.dose_g,new.yield_g,new.time_s,new.grind_setting,new.temperature_c,new.feed_mode,new.extraction,new.body,new.clarity,new.sweetness,new.astringency,new.pulled_at)
    is distinct from row(old.style,old.dose_g,old.yield_g,old.time_s,old.grind_setting,old.temperature_c,old.feed_mode,old.extraction,old.body,old.clarity,old.sweetness,old.astringency,old.pulled_at);
 end if;
 if community_id is null then
  select id into strict contributor from private.contributors where owner_id=new.owner_id;
  insert into public.community_shots(coffee_id,style,dose_g,yield_g,time_s,temperature_c,extraction,body,clarity,sweetness,astringency,machine_model,grinder_model,burr_set,basket_model,basket_dose_g,grind_setting,feed_mode,observed_on)
  values(cid,new.style,new.dose_g,new.yield_g,new.time_s,new.temperature_c,new.extraction,new.body,new.clarity,new.sweetness,new.astringency,
   new.equipment_snapshot->>'machine_model',new.equipment_snapshot->>'grinder_model',new.equipment_snapshot->>'burr_set',new.equipment_snapshot->>'basket_model',
   (new.equipment_snapshot->>'basket_dose_g')::numeric,new.grind_setting,new.feed_mode,(new.pulled_at at time zone 'UTC')::date)
  returning id into community_id;
  insert into private.contribution_links(community_shot_id,shot_id,contributor_id,source_revision) values(community_id,new.id,contributor,new.revision);
 elsif changed then
  update public.community_shots set coffee_id=cid,style=new.style,family_id=null,dose_g=new.dose_g,yield_g=new.yield_g,time_s=new.time_s,
   temperature_c=new.temperature_c,extraction=new.extraction,body=new.body,clarity=new.clarity,sweetness=new.sweetness,astringency=new.astringency,
   grind_setting=new.grind_setting,feed_mode=new.feed_mode,observed_on=(new.pulled_at at time zone 'UTC')::date,
   quality_state='pending_quality',updated_at=clock_timestamp() where id=community_id;
 end if;
 update private.contribution_links set source_revision=new.revision,updated_at=clock_timestamp() where shot_id=new.id;
 return new;
end $$;
revoke all on function private.project_shot() from public,anon,authenticated;
create trigger project_shot after insert or update on public.shots for each row execute function private.project_shot();
comment on function private.project_shot() is 'All-green data is projected as pending, never automatically published before validation. Corrections replace one projection; non-green edits withdraw it. Hiding personal history alone does not withdraw community data. Reviewer/outlier/family workers remain to be built.';
