-- New Issue #47 admin content regression; disposable dic_ci only; rollback all fixture changes.
begin;
do $admin_content$
<<fixture>>
declare
 admin_id uuid:='10000000-0000-4000-8000-000000000001';
 member_id uuid:=gen_random_uuid();
 pending_id uuid;canonical_id uuid;rev bigint;data jsonb;denied boolean;before_count bigint;
 setup_id uuid:=gen_random_uuid();version_id uuid:=gen_random_uuid();
 calibration_id uuid:=gen_random_uuid();basket_id uuid:=gen_random_uuid();
 basket_version_id uuid:=gen_random_uuid();library_id uuid;shot_id uuid;shot_rev bigint;
 canonical_before jsonb;shot_before jsonb;original_family uuid;replacement_family uuid;
 original_source jsonb;added_source jsonb;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable database only';end if;
 insert into auth.users(id,aud,role,email)
 values(member_id,'authenticated','authenticated','only-for-admin-test@fixture.invalid');
 insert into private.beta_members(owner_id,enabled,admitted_at)
 values(member_id,true,now()) on conflict(owner_id) do update
 set enabled=true,admitted_at=now();
 insert into public.coffee_submissions(owner_id,proposed_data)
 values(member_id,jsonb_build_object('name','Admin Content Test','roaster','Test Roaster'))
 returning id,revision into pending_id,rev;
 -- Seed all data under the disposable privileged harness. Authenticated has
 -- SELECT only on canonical coffees and must never gain fixture write grants.
 insert into public.coffees(name,roaster,verification_state,origin,process,roast_level,
   variety,producer,elevation_m,tasting_notes,summary,espresso_notes)
 values('Canonical Fixture','Fixture Roaster','verified','Ethiopia','Washed','Light',
   'Heirloom','Synthetic producer','1900 m','Citrus','Original summary','Original espresso notes')
 returning id into canonical_id;
 insert into public.coffee_sources(coffee_id,source_url,source_kind,field_values,evidence_excerpt)
 values(canonical_id,'https://fixture.invalid/original-source','label',
   '{"origin":"Ethiopia"}'::jsonb,'Original synthetic source retained')
 returning to_jsonb(coffee_sources) into original_source;
 select to_jsonb(c) into canonical_before from public.coffees c where id=canonical_id;
 insert into public.setups(id,owner_id,name) values(setup_id,member_id,'Admin correction fixture');
 insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model)
 values(version_id,member_id,setup_id,'Synthetic machine','Synthetic grinder');
 update public.setups set active_version_id=version_id where id=setup_id;
 insert into public.grinder_calibrations(id,owner_id,setup_id,grinder_model,finest_setting,coarsest_setting)
 values(calibration_id,member_id,setup_id,'Synthetic grinder',0,10);
 insert into public.baskets(id,owner_id,setup_id,name)
 values(basket_id,member_id,setup_id,'Synthetic basket');
 insert into public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g)
 values(basket_version_id,member_id,setup_id,basket_id,18);
 insert into public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id)
 values(member_id,setup_id,version_id,calibration_id,basket_version_id);
 insert into public.library_entries(owner_id,coffee_id) values(member_id,canonical_id)
 returning id into library_id;
 insert into public.shots(owner_id,library_entry_id,setup_id,setup_version_id,
   basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,
   grind_setting,temperature_c,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 values(member_id,library_id,setup_id,version_id,basket_version_id,calibration_id,
   'Traditional',now(),18,36,25,2.125,93.27,3,3,5,5,1,'{}')
 returning id into shot_id;
 insert into public.shot_notes(owner_id,shot_id,notes)
 values(member_id,shot_id,'Original private fixture notes');
 perform private.classify_personal_shot(shot_id);
 select revision,to_jsonb(s) into shot_rev,shot_before from public.shots s where id=shot_id;
 original_family:=(shot_before->>'personal_family_id')::uuid;
 if original_family is null then raise exception 'Synthetic green shot was not classified';end if;
 select count(*) into before_count from public.shots;
 -- Member is admitted, but never receives admin-only creator IDs, notes or edits.
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.dic_admin_records('pending',0,50);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin viewed creator identities';end if;
 denied:=false;
 begin perform public.dic_admin_records('invites',0,50);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin enumerated invitation metadata';end if;
 denied:=false;
 begin perform public.dic_admin_edit_coffee(pending_id,rev,
   '{"name":"Tampered","roaster":"Test Roaster"}'::jsonb,'Member attempted edit','submission');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin edited pending coffee';end if;
 denied:=false;
 begin perform public.dic_admin_edit_shot(shot_id,shot_rev,
   '{"notes":"Unauthorized replacement"}'::jsonb,'Member attempted admin edit','shot');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin used administrator shot edit';end if;
 execute 'reset role';
 -- Valid administrator may enumerate owned records across member identities,
 -- while old sanitized dashboard remains private-note/creator-free.
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 data:=public.dic_admin_records('pending',0,50);
 if (data->>'total')::integer<1 or not exists(
   select 1 from jsonb_array_elements(data->'items') i
   where i->>'id'=pending_id::text
    and i->>'creator_email'='only-for-admin-test@fixture.invalid')
 then raise exception 'Admin list failed creator attribution';end if;
 if jsonb_array_length((public.dic_admin_records('pending',0,1))->'items')>1 then
  raise exception 'Admin page overran limit';end if;
 if jsonb_typeof((public.dic_admin_records('shots',0,50))->'items')<>'array' then
  raise exception 'Shot page unavailable';end if;
 if not exists(select 1 from jsonb_array_elements((public.dic_admin_records('shots',0,50))->'items') i
   where i->>'id'=shot_id::text and i->>'creator_id'=member_id::text
     and i->>'creator_email'='only-for-admin-test@fixture.invalid'
     and i->>'notes'='Original private fixture notes') then
  raise exception 'Administrator shot projection lost original notes or owner';end if;
 if jsonb_typeof((public.dic_admin_records('accounts',0,50))->'items')<>'array' then
  raise exception 'Account page unavailable';end if;
 data:=public.dic_admin_records('invites',0,50);
 if data->>'kind'<>'invites' or jsonb_typeof(data->'items')<>'array'
  or (data->>'total')::integer<0 then
  raise exception 'Admin invitation history unavailable';end if;
 if data::text like '%token_hash%' or data::text like '%invite_code%'
  or data::text like '%secret%' then
  raise exception 'Invitation listing leaked secret material';end if;
 if jsonb_array_length((public.dic_admin_records('invites',0,1))->'items')>1 then
  raise exception 'Invitation page limit bypassed';end if;
 denied:=false;
 begin perform public.dic_admin_records('pending',0,100);
 exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Admin could bypass page limit';end if;
 denied:=false;
 begin perform public.dic_admin_records(null,0,50);
 exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'NULL category fell through to account enumeration';end if;
 denied:=false;
 begin perform public.dic_admin_edit_coffee(pending_id,rev+1,
   '{"name":"Admin Content Test","roaster":"Test Roaster"}'::jsonb,
   'Stale revision must not win','submission');
 exception when sqlstate 'PT409' then denied:=true;end;
 if not denied then raise exception 'Stale revision was accepted';end if;
 data:=public.dic_admin_edit_coffee(pending_id,rev,
   '{"name":"Admin Content Test","roaster":"Test Roaster","origin":"Kenya","source_url":"https://example.invalid/coffee"}'::jsonb,
   'Operator corrected source and origin','submission');
 if data->>'ok'<>'true' or (select proposed_data->>'origin' from public.coffee_submissions where id=pending_id)<>'Kenya'
 then raise exception 'Audited correction did not persist';end if;
 execute 'reset role'; -- test harness inspects protected audit as superuser, never grant it to members
 if not exists(select 1 from private.admin_content_edits where record_id=pending_id
   and actor_id=admin_id and subject_owner_id=member_id
   and before_values->'proposed_data'->>'origin' is null
   and after_values->'proposed_data'->>'origin'='Kenya') then
  raise exception 'Audit did not preserve before/after';end if;
 rev:=(canonical_before->>'revision')::bigint;
 execute 'set local role authenticated'; -- original admin identity remains in signed claim
 data:=public.dic_admin_edit_coffee(canonical_id,rev,
   '{"name":"Rewritten Identity","roaster":"Fixture Roaster","release_label":"2026 Synthetic"}'::jsonb,
   'Correct mislabelled canonical product identity','approved');
 if data->>'ok'<>'true' or (select name from public.coffees where id=canonical_id)<>'Rewritten Identity'
    or (select release_label from public.coffees where id=canonical_id)<>'2026 Synthetic'
 then raise exception 'Admin canonical identity edit failed';end if;
 -- Verify cross-owner references only as the disconnected privileged fixture.
 -- Authenticated admin is intentionally denied another member's direct SELECT.
 execute 'reset role';
 if (select count(*) from public.library_entries where id=library_id and coffee_id=canonical_id)<>1
    or (select count(*) from public.shots where id=shot_id and library_entry_id=library_id)<>1
 then raise exception 'Identity correction detached member history';end if;
 if not exists(select 1 from private.admin_content_edits where record_id=canonical_id
     and record_kind='approved' and before_values->>'name'='Canonical Fixture'
     and after_values->>'name'='Rewritten Identity') then
   raise exception 'Before/after canonical audit lost original identity';end if;
 select to_jsonb(c) into canonical_before from public.coffees c where c.id=canonical_id;
 rev:=(data->>'revision')::bigint;
 execute 'set local role authenticated';
 data:=public.dic_admin_edit_coffee(canonical_id,rev,
   '{"summary":"Improved descriptive detail"}'::jsonb,
   'Added useful descriptive detail','approved');
 if data->>'ok'<>'true' or (select summary from public.coffees where id=canonical_id)<>'Improved descriptive detail'
 then raise exception 'Approved descriptive correction failed';end if;
 if (select to_jsonb(c)-'summary'-'revision'-'updated_at' from public.coffees c where id=canonical_id)
   is distinct from canonical_before-'summary'-'revision'-'updated_at' then
  raise exception 'Partial canonical correction erased unrelated descriptive or identity fields';end if;
 rev:=(data->>'revision')::bigint;
 data:=public.dic_admin_edit_coffee(canonical_id,rev,'{"origin":null}'::jsonb,
   'Explicitly remove disputed origin','approved');
 if (select origin from public.coffees where id=canonical_id) is not null
   or (select process from public.coffees where id=canonical_id) is distinct from 'Washed' then
  raise exception 'Explicit nullable canonical correction did not retain unrelated facts';end if;
 rev:=(data->>'revision')::bigint;
 select to_jsonb(c) into canonical_before from public.coffees c where id=canonical_id;
 data:=public.dic_admin_edit_coffee(canonical_id,rev,
   '{"source_url":"https://fixture.invalid/operator-only-source"}'::jsonb,
   'Add a source without changing recorded canonical facts','approved');
 execute 'reset role';
 select to_jsonb(cs) into added_source from public.coffee_sources cs
  where cs.coffee_id=canonical_id and cs.source_url='https://fixture.invalid/operator-only-source';
 if (select to_jsonb(c)-'revision'-'updated_at' from public.coffees c where id=canonical_id)
   is distinct from canonical_before-'revision'-'updated_at'
   or added_source is null or added_source->>'source_kind' is distinct from 'label'
   or added_source->'field_values' is distinct from '{}'::jsonb
   or added_source->>'evidence_excerpt' is distinct from 'Administrator-supplied URL; not official verification.'
   or (select count(*) from public.coffee_sources where coffee_id=canonical_id)<>2
   or (select to_jsonb(cs) from public.coffee_sources cs where cs.id=(original_source->>'id')::uuid)
      is distinct from original_source then
  raise exception 'Source-only correction changed facts, lost original evidence or claimed official verification';end if;
 if not exists(select 1 from private.admin_content_edits a
   where a.record_id=canonical_id and a.record_kind='approved' and a.actor_id=admin_id
    and a.before_revision=rev and a.before_values-'sources'=canonical_before
    and a.before_values->'sources'=jsonb_build_array(original_source)
    and jsonb_array_length(a.after_values->'sources')=2
    and a.after_values->'sources' @> jsonb_build_array(original_source,added_source)
    and a.after_values->>'revision'=data->>'revision') then
  raise exception 'Source-only audit omitted exact retained/added source metadata, actor or final revision';end if;
 rev:=(data->>'revision')::bigint;
 execute 'set local role authenticated';
 data:=public.dic_admin_edit_coffee(canonical_id,rev,
   '{"source_url":"https://fixture.invalid/operator-only-source"}'::jsonb,
   'Repeated source evidence must retain the same source record','approved');
 execute 'reset role';
 if (select count(*) from public.coffee_sources where coffee_id=canonical_id)<>2
   or (select to_jsonb(cs) from public.coffee_sources cs where cs.id=(added_source->>'id')::uuid)
      is distinct from added_source then
  raise exception 'Repeated correction duplicated or replaced existing source evidence';end if;
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.dic_admin_edit_shot(shot_id,shot_rev+1,
   '{"time_s":26,"notes":"Stale correction"}'::jsonb,
   'Reject stale administrator shot correction','shot');
 exception when sqlstate 'PT409' then denied:=true;end;
 if not denied then raise exception 'Stale administrator shot revision accepted';end if;
 data:=public.dic_admin_edit_shot(shot_id,shot_rev,'{"notes":"Corrected private fixture notes"}'::jsonb,
   '','shot');
 if data->>'ok' is distinct from 'true' then raise exception 'Notes-only correction failed';end if;
 execute 'reset role'; -- administrator does not gain another member's direct-table reads
 if (select to_jsonb(s)-'revision'-'updated_at' from public.shots s where id=shot_id)
   is distinct from shot_before-'revision'-'updated_at' then
  raise exception 'Notes-only correction altered measurements or immutable provenance';end if;
 if not exists(select 1 from private.admin_content_edits a where a.record_id=shot_id
   and a.actor_id=admin_id and a.subject_owner_id=member_id
   and a.before_values->>'notes'='Original private fixture notes'
   and a.after_values->>'notes'='Corrected private fixture notes'
   and a.reason='Administrator saved record changes'
   and (a.before_values->'shot'->>'grind_setting')::numeric=2.125
   and (a.after_values->'shot'->>'temperature_c')::numeric=93.27) then
  raise exception 'Shot audit lost original notes or exact measurements';end if;
 shot_rev:=(data->>'revision')::bigint;
 execute 'set local role authenticated';
 data:=public.dic_admin_edit_shot(shot_id,shot_rev,
   '{"time_s":26,"notes":"Audited operator correction"}'::jsonb,
   'Correct timed shot and private notes','shot');
 shot_rev:=(data->>'revision')::bigint;
 execute 'reset role';
 if (select time_s from public.shots where id=shot_id) is distinct from 26::numeric
   or (select grind_setting from public.shots where id=shot_id) is distinct from 2.125::numeric
   or (select n.notes from public.shot_notes n where n.shot_id=fixture.shot_id and n.owner_id=member_id)
       is distinct from 'Audited operator correction'
   or (select owner_id from public.shots where id=shot_id) is distinct from member_id
   or (select s.setup_id from public.shots s where s.id=fixture.shot_id) is distinct from fixture.setup_id then
  raise exception 'Positive shot correction changed provenance or failed the measurement/notes update';end if;
 if not exists(select 1 from private.admin_content_edits a where a.record_id=shot_id
   and a.record_kind='shot' and a.actor_id=admin_id and a.subject_owner_id=member_id
   and a.before_values->>'notes'='Corrected private fixture notes'
   and a.after_values->>'notes'='Audited operator correction') then
  raise exception 'Positive shot correction omitted before/after private note audit';end if;
 execute 'set local role authenticated';
 data:=public.dic_admin_edit_shot(shot_id,shot_rev,'{"temperature_c":null}'::jsonb,
   'Explicitly clear unavailable temperature','shot');
 shot_rev:=(data->>'revision')::bigint;
 denied:=false;
 begin perform public.dic_admin_edit_shot(shot_id,shot_rev,'{"grind_setting":null}'::jsonb,
   'Nonlegacy grind remains a required observation','shot');
 exception when check_violation then denied:=true;end;
 if not denied then raise exception 'Correction bypassed the nonlegacy grind requirement';end if;
 execute 'reset role';
 if (select temperature_c from public.shots where id=shot_id) is not null
   or (select grind_setting from public.shots where id=shot_id) is distinct from 2.125::numeric then
  raise exception 'Explicit nullable shot correction erased the retained grind';end if;
 execute 'set local role authenticated';
 data:=public.dic_admin_edit_shot(shot_id,shot_rev,'{"yield_g":72}'::jsonb,
   'Correct the measured output and reclassify evidence','shot');
 shot_rev:=(data->>'revision')::bigint;
 execute 'reset role';
 select personal_family_id into replacement_family from public.shots where id=shot_id;
 if replacement_family is null or replacement_family=original_family
   or (select revision from public.shots where id=shot_id) is distinct from shot_rev
   or (select (statistics->'ratio'->>'center')::numeric from public.personal_recipe_families
       where id=replacement_family) is distinct from 4::numeric
   or (select evidence_state from public.personal_recipe_families where id=original_family)
       is distinct from 'retired' then
  raise exception 'Admin measurement correction left stale family evidence or returned an intermediate revision';end if;
 execute 'set local role authenticated';
 data:=public.dic_admin_edit_shot(shot_id,shot_rev,'{"extraction":2}'::jsonb,
   'Correct sensory rating and remove unsupported green evidence','shot');
 shot_rev:=(data->>'revision')::bigint;
 execute 'reset role';
 if (select personal_family_id from public.shots where id=shot_id) is not null
   or (select is_dialed_in from public.shots where id=shot_id)
   or (select revision from public.shots where id=shot_id) is distinct from shot_rev
   or (select evidence_state from public.personal_recipe_families where id=replacement_family)
       is distinct from 'retired'
   or exists(select 1 from public.recipe_preferences where owner_id=member_id
       and library_entry_id=library_id and current_family_id is not null) then
  raise exception 'Admin sensory correction retained unsupported personal success';end if;
 if not exists(select 1 from private.admin_content_edits a where a.record_id=shot_id
   and a.after_values->'shot'->>'revision'=shot_rev::text
   and a.after_values->'shot'->>'personal_family_id' is null) then
  raise exception 'Admin audit failed to retain the final classified shot state';end if;
 execute 'set local role authenticated';
 data:=public.dic_admin_edit_shot(shot_id,shot_rev,jsonb_build_object('notes',repeat('n',16000)),
   'Preserve the existing full-length personal note contract','shot');
 shot_rev:=(data->>'revision')::bigint;
 denied:=false;
 begin perform public.dic_admin_edit_shot(shot_id,shot_rev,jsonb_build_object('notes',repeat('n',16001)),
   'Reject a note beyond the existing maximum','shot');
 exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Administrator bypassed the existing note length limit';end if;
 execute 'reset role';
 if (select length(n.notes) from public.shot_notes n where n.shot_id=fixture.shot_id and n.owner_id=member_id)<>16000
   or (select revision from public.shots where id=shot_id) is distinct from shot_rev then
  raise exception 'Long-note correction or rejected-overlength rollback lost retained data';end if;
 if (select count(*) from public.shots)<>before_count then raise exception 'Corrections changed shot count';end if;
 -- Not even a forged administrator subject may call via the anonymous database role.
 execute 'set local role anon';
 denied:=false;
 begin perform public.dic_admin_records('shots',0,50);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous role viewed protected notes';end if;
 execute 'reset role';
 if has_function_privilege('anon','public.dic_admin_records(text,integer,integer)','EXECUTE')
   or has_function_privilege('anon','public.dic_admin_edit_shot(uuid,bigint,jsonb,text,text)','EXECUTE') then
  raise exception 'Anonymous granted admin RPC execute';end if;
end $admin_content$;
select 'PASS: admin-only pagination, creator attribution, private notes, member/anon denial, stale revisions, partial corrections, nullable fields, immutable provenance, exact source-history audits and deduplication, full note limit and refreshed personal families; synthetic records rolled back' as result;
rollback;

-- Release authorization checkpoint: full rollback-only admin content SQL regression
-- is rerun for the exact new source SHA after explicit full-stack deployment approval.
-- This comment does NOT assert live database installation or change SQL fixture behavior.
