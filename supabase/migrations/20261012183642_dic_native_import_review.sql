-- Native prototype import. Existing accounts/records are never replaced.
-- The write gate stays closed until cloud backup/restore is verified.
create table private.import_control (
 singleton boolean primary key default true check(singleton),
 saves_enabled boolean not null default false,
 recovery_verified_at timestamptz,
 check(not saves_enabled or recovery_verified_at is not null)
);
insert into private.import_control(singleton) values(true);
create table private.import_batches (
 owner_id uuid not null references auth.users(id) on delete cascade,
 source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
 source_document jsonb not null,
 before_state jsonb not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(owner_id,source_hash)
);
alter table private.import_control enable row level security;
alter table private.import_batches enable row level security;
revoke all on private.import_control,private.import_batches from public,anon,authenticated;
grant all on private.import_control,private.import_batches to service_role;
create policy no_client_access on private.import_control for all to anon,authenticated using(false) with check(false);
create policy no_client_access on private.import_batches for all to anon,authenticated using(false) with check(false);

create function private.import_id(u uuid,kind text,source_id text) returns uuid
language plpgsql immutable set search_path='' as $$
begin
 if source_id is null or length(source_id) not between 1 and 200 then
  raise exception using errcode='22023',message='Every imported record needs a stable source ID.';
 end if;
 return md5(u::text || ':dic-import-v1:' || kind || ':' || source_id)::uuid;
end $$;
revoke all on function private.import_id(uuid,text,text) from public,anon,authenticated;

-- Runs inside the caller transaction. Preview invokes exactly this path inside
-- a rolled-back subtransaction, so it exercises constraints and triggers too.
create function private.apply_prototype_import(u uuid,doc jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 d jsonb:=doc->'data'; st jsonb; v jsonb; w jsonb; c jsonb; b jsonb; g jsonb; f jsonb; sh jsonb; p jsonb; t jsonb; x jsonb;
 sid uuid; vid uuid; lid uuid; bid uuid; bvid uuid; gid uuid; fid uuid; shotid uuid; subid uuid; bagid uuid; currentid uuid;
 source_key text; k text; target_style text; rc integer; missing_grind integer:=0; unknown_feed integer:=0; green_count integer:=0;
 result jsonb; snapshot jsonb;
begin
 if jsonb_typeof(doc) is distinct from 'object' or doc->>'format' is distinct from 'the-dial-in-collective-prototype-backup'
    or jsonb_typeof(d) is distinct from 'object' or d->>'schemaVersion' is distinct from '1' or d->>'mode' is distinct from 'personal'
    or octet_length(doc::text)>2097152 then
  raise exception using errcode='22023',message='Choose a personal prototype backup (schema 1), at most 2 MB.';
 end if;
 -- Do not archive credentials accidentally embedded in a file.
 if exists(with recursive nodes(k,val) as (
  select ''::text,doc union all
  select z.key,z.value from nodes n cross join lateral (
   select key,value from jsonb_each(case when jsonb_typeof(n.val)='object' then n.val else '{}' end)
   union all
   select '',value from jsonb_array_elements(case when jsonb_typeof(n.val)='array' then n.val else '[]' end)
  ) z
 ) select 1 from nodes where lower(replace(k,'_','')) in ('apikey','password','accesstoken','refreshtoken','servicerolekey','secretkey') and val not in ('null'::jsonb,'""'::jsonb)) then
  raise exception using errcode='22023',message='This backup contains a credential field. Export a credentials-free backup first.';
 end if;
 foreach k in array array['setups','coffees','shots','families','experiments'] loop
  if jsonb_typeof(d->k) is distinct from 'array' then raise exception using errcode='22023',message='The backup is missing a required record list.'; end if;
 end loop;
 if jsonb_array_length(d->'setups')<>1 or jsonb_array_length(d->'coffees') not between 1 and 100
    or jsonb_array_length(d->'shots')>2000 or jsonb_array_length(d->'families')>500 then
  raise exception using errcode='22023',message='This first importer supports one setup, up to 100 coffees and 2000 shots. Nothing was imported.';
 end if;
 if jsonb_array_length(d->'experiments')<>0 then raise exception using errcode='22023',message='Experiment migration is not enabled yet. Keep this backup; no records were imported.'; end if;
 st:=d->'setups'->0;
 if jsonb_typeof(st->'versions') is distinct from 'array' or jsonb_array_length(st->'versions')<>1 then
  raise exception using errcode='22023',message='Backups with multiple hardware versions need the next migration adapter. Nothing was imported.';
 end if;
 v:=st->'versions'->0; w:=st->'workspaces'->(v->>'id');
 if st->>'activeVersionId' is distinct from v->>'id' or d->>'activeSetupId' is distinct from st->>'id' or jsonb_typeof(w) is distinct from 'object' then
  raise exception using errcode='22023',message='The active workspace references are incomplete.';
 end if;
 if jsonb_typeof(v->'baskets') is distinct from 'array' or jsonb_array_length(v->'baskets') not between 1 and 30
    or jsonb_typeof(v->'calibrations') is distinct from 'array' or jsonb_array_length(v->'calibrations') not between 1 and 50 then
  raise exception using errcode='22023',message='Basket and grinder calibration history is required.';
 end if;
 if exists(select 1 from public.setups where owner_id=u) or exists(select 1 from public.library_entries where owner_id=u)
    or exists(select 1 from public.shots where owner_id=u) then
  raise exception using errcode='22023',message='This first import requires an empty cloud workspace. Existing data will not be replaced or merged automatically.';
 end if;
 foreach k in array array['coffees','shots','families'] loop
  if exists(select 1 from jsonb_array_elements(d->k) a group by a->>'id' having count(*)>1)
     or exists(select 1 from jsonb_array_elements(d->k) a where jsonb_typeof(a) is distinct from 'object' or coalesce(length(a->>'id'),0) not between 1 and 200) then
   raise exception using errcode='22023',message='Duplicate or missing record IDs in the backup. Nothing was imported.';
  end if;
 end loop;
 sid:=private.import_id(u,'setup',st->>'id'); vid:=private.import_id(u,'version',v->>'id');
 insert into public.setups(id,owner_id,name,created_at) values(sid,u,st->>'name',coalesce((st->>'createdAt')::timestamptz,(v->>'createdAt')::timestamptz,now()));
 insert into public.setup_versions(id,owner_id,setup_id,label,machine_model,grinder_model,burr_set,created_at)
 values(vid,u,sid,coalesce(v->>'label','Imported equipment'),nullif(v->>'machine',''),nullif(v->>'grinder',''),nullif(v->>'burrs',''),(v->>'createdAt')::timestamptz);
 for g in select value from jsonb_array_elements(v->'calibrations') loop
  gid:=private.import_id(u,'calibration',g->>'id');
  insert into public.grinder_calibrations(id,owner_id,setup_id,grinder_model,burr_set,finest_setting,coarsest_setting,created_at)
  values(gid,u,sid,nullif(v->>'grinder',''),nullif(v->>'burrs',''),(g->>'min')::numeric,(g->>'max')::numeric,coalesce((g->>'at')::timestamptz,(v->>'createdAt')::timestamptz));
 end loop;
 for b in select value from jsonb_array_elements(v->'baskets') loop
  bid:=private.import_id(u,'basket',b->>'id');bvid:=private.import_id(u,'basket_version',b->>'id');
  insert into public.baskets(id,owner_id,setup_id,name,archived_at) values(bid,u,sid,b->>'name',case when (b->>'archived')::boolean then now() end);
  insert into public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g,model,created_at)
  values(bvid,u,sid,bid,(b->>'doseG')::numeric,nullif(b->>'model',''),coalesce((b->>'createdAt')::timestamptz,(v->>'createdAt')::timestamptz));
 end loop;
 update public.setups set active_version_id=vid where id=sid;
 insert into public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id,track_temperature,track_slow_feed,multiple_baskets,slow_feed,temperature_unit)
 values(u,sid,vid,private.import_id(u,'calibration',v->>'calibrationId'),private.import_id(u,'basket_version',v->>'defaultBasketId'),
 coalesce((v->'advanced'->>'temperature')::boolean,false),coalesce((v->'advanced'->>'slowFeed')::boolean,false),coalesce((v->'advanced'->>'baskets')::boolean,false),
 coalesce((v->>'slowFeed')::boolean,false),coalesce(v->>'tempUnit','F'));
 for c in select value from jsonb_array_elements(d->'coffees') loop
  lid:=private.import_id(u,'coffee',c->>'id');subid:=private.import_id(u,'submission',c->>'id');
  -- Only coffee facts, not bags or personal history, are sent for catalog review.
  insert into public.coffee_submissions(id,owner_id,proposed_data,source_url,created_at)
  values(subid,u,jsonb_build_object('name',c->>'name','roaster',c->>'roaster','origin',c->>'origin','elevation_m',c->>'elevationM',
   'roast_level',nullif(c->>'roastLevel',''),'roastLevelSource',c->>'roastLevelSource','roastLevelBasis',c->>'roastLevelBasis',
   'process',c->>'process','variety',c->>'variety','producer',c->>'producer','tasting_notes',c->>'tastingNotes',
   'summary',c->>'summary','espressoNotes',c->>'espressoNotes','roaster_recipe',c->'roasterRecipe','release_label',c->>'release'),nullif(c->>'roasterUrl',''),(c->>'createdAt')::timestamptz);
  if coalesce(length(btrim(c->>'name')),0) not between 1 and 200 or coalesce(length(btrim(c->>'roaster')),0) not between 1 and 200 then
   raise exception using errcode='22023',message='Each coffee needs a name and roaster.';
  end if;
  insert into public.library_entries(id,owner_id,submission_id,hidden_at,created_at)
  values(lid,u,subid,case when (c->>'hidden')::boolean then now() end,(c->>'createdAt')::timestamptz);
  if jsonb_typeof(c->'bags') is distinct from 'array' or jsonb_array_length(c->'bags')>100 then raise exception using errcode='22023',message='Invalid bag list.'; end if;
  for b in select value from jsonb_array_elements(c->'bags') loop
   bagid:=private.import_id(u,'bag',(c->>'id')||':'||(b->>'id'));
   insert into public.bags(id,owner_id,library_entry_id,roast_date,frozen,archived_at)
   values(bagid,u,lid,nullif(b->>'roastDate','')::date,coalesce((b->>'frozen')::boolean,false),case when (b->>'archived')::boolean then now() end);
  end loop;
 end loop;
 for f in select value from jsonb_array_elements(d->'families') loop
  insert into public.personal_recipe_families(id,owner_id,library_entry_id,style,statistics,estimator_version,created_at)
  values(private.import_id(u,'family',f->>'id'),u,private.import_id(u,'coffee',f->>'coffeeId'),f->>'style','{}','prototype_import_v1',(f->>'createdAt')::timestamptz);
 end loop;
 for sh in select value from jsonb_array_elements(d->'shots') order by value->>'timestamp',value->>'id' loop
  if sh->>'setupId' is distinct from st->>'id' or sh->>'setupVersionId' is distinct from v->>'id' or sh->>'experimentId' is not null then
   raise exception using errcode='22023',message='A shot has an unsupported equipment or experiment reference.';
  end if;
  foreach k in array array['doseG','yieldG','timeS'] loop
   if jsonb_typeof(sh->k) is distinct from 'number' then raise exception using errcode='22023',message='Dose, yield and time must be recorded numbers.'; end if;
  end loop;
  foreach k in array array['grindSetting','tempC'] loop
   if sh->>k is not null and jsonb_typeof(sh->k) is distinct from 'number' then raise exception using errcode='22023',message='Optional measurements must be numbers or null, not text.'; end if;
  end loop;
  t:=sh->'tasteScales';
  foreach k in array array['extraction','body','clarity','sweetness','astringency'] loop
   if jsonb_typeof(t->k) is distinct from 'number' or (t->>k)::numeric<>trunc((t->>k)::numeric) or (t->>k)::numeric not between 1 and 5 then
    raise exception using errcode='22023',message='Historical shots need five recorded integer taste ratings. No ratings were invented.';
   end if;
  end loop;
  snapshot:=sh->'snapshot';
  select value into b from jsonb_array_elements(v->'baskets') where value->>'id'=sh->>'basketId';
  select value into g from jsonb_array_elements(v->'calibrations') where value->>'id'=sh->>'calibrationId';
  if b is null or g is null or jsonb_typeof(snapshot) is distinct from 'object'
   or (snapshot->>'basketDoseG')::numeric is distinct from (b->>'doseG')::numeric
   or (snapshot->>'grinderMin')::numeric is distinct from (g->>'min')::numeric
   or (snapshot->>'grinderMax')::numeric is distinct from (g->>'max')::numeric
   or nullif(snapshot->>'machine','') is distinct from nullif(v->>'machine','')
   or nullif(snapshot->>'grinder','') is distinct from nullif(v->>'grinder','')
   or nullif(snapshot->>'burrs','') is distinct from nullif(v->>'burrs','') then
   raise exception using errcode='22023',message='A historical equipment snapshot differs from its version. Nothing was imported; this file needs a version-aware review.';
  end if;
  lid:=private.import_id(u,'coffee',sh->>'coffeeId');shotid:=private.import_id(u,'shot',coalesce(sh->>'legacyId',sh->>'id'));
  fid:=case when sh->>'familyId' is not null then private.import_id(u,'family',sh->>'familyId') end;
  if not ((t->>'extraction')::int=3 and (t->>'body')::int=3 and (t->>'clarity')::int=5 and (t->>'sweetness')::int=5 and (t->>'astringency')::int=1) then fid:=null; end if;
  insert into public.shots(id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,bag_id,personal_family_id,style,pulled_at,
   dose_g,yield_g,time_s,grind_setting,temperature_c,feed_mode,extraction,body,clarity,sweetness,astringency,equipment_snapshot,legacy_import,legacy_id,hidden_at)
  values(shotid,u,lid,sid,vid,private.import_id(u,'basket_version',sh->>'basketId'),private.import_id(u,'calibration',sh->>'calibrationId'),
   case when sh->>'bagId' is not null then private.import_id(u,'bag',(sh->>'coffeeId')||':'||(sh->>'bagId')) end,fid,sh->>'style',(sh->>'timestamp')::timestamptz,
   (sh->>'doseG')::numeric,(sh->>'yieldG')::numeric,(sh->>'timeS')::numeric,(sh->>'grindSetting')::numeric,(sh->>'tempC')::numeric,coalesce(sh->>'feedMode','unknown'),
   (t->>'extraction')::smallint,(t->>'body')::smallint,(t->>'clarity')::smallint,(t->>'sweetness')::smallint,(t->>'astringency')::smallint,'{}',true,coalesce(sh->>'legacyId',sh->>'id'),
   case when (sh->>'hidden')::boolean then now() end);
  insert into public.shot_notes(owner_id,shot_id,notes) values(u,shotid,coalesce(sh->>'notes',''));
  if sh->>'grindSetting' is null then missing_grind:=missing_grind+1; end if;
  if sh->>'feedMode' is null or sh->>'feedMode'='unknown' then unknown_feed:=unknown_feed+1; end if;
 end loop;
 for f in select value from jsonb_array_elements(d->'families') loop
  perform private.refresh_personal_family(private.import_id(u,'family',f->>'id'));
 end loop;
 -- No style/time reclassification. Families with missing membership are not fabricated.
 if exists(select 1 from public.shots where owner_id=u and is_dialed_in and personal_family_id is null) then
  raise exception using errcode='22023',message='A successful shot is missing its recipe family. This file needs a family mapping review.';
 end if;
 for c in select value from jsonb_array_elements(d->'coffees') loop
  lid:=private.import_id(u,'coffee',c->>'id');p:=w->'coffees'->(c->>'id');
  if jsonb_typeof(p) is distinct from 'object' then raise exception using errcode='22023',message='A coffee is missing its workspace preferences.'; end if;
  insert into public.workspace_coffees(owner_id,setup_id,setup_version_id,library_entry_id,selected_style,basket_version_id,last_logged_at)
  values(u,sid,vid,lid,p->>'style',case when p->>'basketId' is not null then private.import_id(u,'basket_version',p->>'basketId') end,
   (select max(pulled_at) from public.shots where owner_id=u and library_entry_id=lid));
  for target_style,source_key in select key,value from jsonb_each_text(coalesce(p->'currentFamilies','{}')) loop
   fid:=private.import_id(u,'family',source_key);
   if not exists(select 1 from public.shots where owner_id=u and library_entry_id=lid and setup_version_id=vid and shots.style=target_style and is_dialed_in and hidden_at is null and personal_family_id=fid) then
    raise exception using errcode='22023',message='A Current Recipe is not supported by a successful shot on this setup.';
   end if;
   insert into public.recipe_preferences(owner_id,setup_id,setup_version_id,library_entry_id,style,current_family_id)
   values(u,sid,vid,lid,target_style,fid);
  end loop;
 end loop;
 currentid:=case when w->>'currentCoffeeId' is not null then private.import_id(u,'coffee',w->>'currentCoffeeId') end;
 if currentid is not null and not exists(select 1 from public.shots where owner_id=u and library_entry_id=currentid) then
  raise exception using errcode='22023',message='An unlogged coffee cannot become Current during import.';
 end if;
 insert into public.workspace_state(owner_id,setup_id,setup_version_id,current_library_entry_id) values(u,sid,vid,currentid);
 update public.account_preferences set theme=d->>'theme',tasting_preferences=coalesce(d->>'preferences',''),active_setup_id=sid where owner_id=u;
 select count(*) into green_count from public.shots where owner_id=u and is_dialed_in;
 result:=jsonb_build_object('coffees',jsonb_array_length(d->'coffees'),'shots',jsonb_array_length(d->'shots'),'families',jsonb_array_length(d->'families'),
  'setups',1,'dialedInShots',green_count,'missingGrind',missing_grind,'unknownFeed',unknown_feed,'currentCoffee',w->>'currentCoffeeId',
  'sharedRecordsPublished',0,'archivePreserved',true);
 return result;
end $$;
revoke all on function private.apply_prototype_import(uuid,jsonb) from public,anon,authenticated;

create function private.import_operation(expected_owner uuid,doc jsonb,save boolean,review_hash text,recovery_saved boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_member(); h text; result jsonb; existing private.import_batches; before_state jsonb; gate boolean;
begin
 if expected_owner is null or expected_owner is distinct from u then raise exception using errcode='42501',message='Account changed; re-open Import Backup.'; end if;
 if doc is null or octet_length(doc::text)>2097152 then raise exception using errcode='22023',message='Choose a backup no larger than 2 MB.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,9311));
 h:=encode(sha256(convert_to(doc::text,'UTF8')),'hex');
 select * into existing from private.import_batches where owner_id=u and source_hash=h;
 if found then return existing.result || jsonb_build_object('alreadyImported',true,'reviewHash',h,'canImport',false); end if;
 select coalesce(saves_enabled and recovery_verified_at is not null,false) into gate from private.import_control where singleton;
 if save then
  if not coalesce(gate,false) then return jsonb_build_object('ok',false,'code','recovery_required','message','Import is locked until the cloud backup and recovery check is completed. Preview is available now.'); end if;
  if review_hash is distinct from h or recovery_saved is distinct from true then raise exception using errcode='22023',message='Review this exact file and save the recovery copy before importing.'; end if;
  before_state:=private.read_personal_state();
  result:=private.apply_prototype_import(u,doc) || jsonb_build_object('ok',true,'imported',true);
  insert into private.import_batches(owner_id,source_hash,source_document,before_state,result) values(u,h,doc,before_state,result);
  return result || jsonb_build_object('reviewHash',h);
 end if;
 -- Exceptions are a PostgreSQL subtransaction: no preview records are committed.
 begin
  result:=private.apply_prototype_import(u,doc);
  raise exception using errcode='PZ001',message='preview_rollback';
 exception when sqlstate 'PZ001' then null;
 end;
 return result || jsonb_build_object('ok',true,'imported',false,'alreadyImported',false,'reviewHash',h,'canImport',coalesce(gate,false),
  'blockReason',case when not coalesce(gate,false) then 'Cloud backup and recovery verification is still pending. Preview changes nothing.' else null end);
end $$;
revoke all on function private.import_operation(uuid,jsonb,boolean,text,boolean) from public,anon,authenticated;
grant execute on function private.import_operation(uuid,jsonb,boolean,text,boolean) to authenticated;
create function public.dic_preview_import(expected_owner uuid,backup jsonb) returns jsonb language sql security invoker set search_path='' as $$
 select private.import_operation(expected_owner,backup,false,null,false);
$$;
create function public.dic_commit_import(expected_owner uuid,backup jsonb,review_hash text,recovery_saved boolean) returns jsonb language sql security invoker set search_path='' as $$
 select private.import_operation(expected_owner,backup,true,review_hash,recovery_saved);
$$;
revoke all on function public.dic_preview_import(uuid,jsonb),public.dic_commit_import(uuid,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.dic_preview_import(uuid,jsonb),public.dic_commit_import(uuid,jsonb,text,boolean) to authenticated;
comment on table private.import_batches is 'Owner-protected exact source JSON and pre-import state. Not an external backup and not a substitute for Google Drive disaster recovery.';
