-- New Issue #47 admin content regression; disposable dic_ci only; rollback all fixture changes.
begin;
do $admin_content$
declare
 admin_id uuid:='10000000-0000-4000-8000-000000000001';
 member_id uuid:=gen_random_uuid();
 pending_id uuid;canonical_id uuid;rev bigint;data jsonb;denied boolean;before_count bigint;
 setup_id uuid:=gen_random_uuid(); version_id uuid:=gen_random_uuid();
 basket_id uuid:=gen_random_uuid();basket_version_id uuid:=gen_random_uuid();
 calibration_id uuid:=gen_random_uuid();library_id uuid:=gen_random_uuid();
 shot_id uuid:=gen_random_uuid();shot_rev bigint;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable database only';end if;
 select count(*) into before_count from public.shots;
 insert into auth.users(id,aud,role,email)
 values(member_id,'authenticated','authenticated','only-for-admin-test@fixture.invalid');
 insert into private.beta_members(owner_id,enabled,admitted_at)
 values(member_id,true,now()) on conflict(owner_id) do update
 set enabled=true,admitted_at=now();
 insert into public.coffee_submissions(owner_id,proposed_data)
 values(member_id,jsonb_build_object('name','Admin Content Test','roaster','Test Roaster'))
 returning id,revision into pending_id,rev;
 -- Member is admitted, but never receives admin-only creator IDs, notes or edits.
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.dic_admin_records('pending',0,50);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin viewed creator identities';end if;
 denied:=false;
 begin perform public.dic_admin_edit_coffee(pending_id,rev,
   '{"name":"Tampered","roaster":"Test Roaster"}'::jsonb,'Member attempted edit','submission');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin edited pending coffee';end if;
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
 if jsonb_typeof((public.dic_admin_records('accounts',0,50))->'items')<>'array' then
  raise exception 'Account page unavailable';end if;
 denied:=false;
 begin perform public.dic_admin_records('pending',0,100);
 exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Admin could bypass page limit';end if;
 denied:=false;
 begin perform public.dic_admin_edit_coffee(pending_id,rev+1,
   '{"name":"Admin Content Test","roaster":"Test Roaster"}'::jsonb,
   'Stale revision must not win','submission');
 exception when serialization_failure then denied:=true;end;
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
 -- Build synthetic canonical fixture as postgres; normal members cannot INSERT catalog.
 insert into public.coffees(name,roaster,verification_state)
 values('Canonical Fixture','Fixture Roaster','verified') returning id,revision into canonical_id,rev;
 execute 'set local role authenticated'; -- resume authenticated administrator for RPCs
 denied:=false;
 begin perform public.dic_admin_edit_coffee(canonical_id,rev,
   '{"name":"Rewritten Identity","roaster":"Fixture Roaster"}'::jsonb,
   'Unauthorized identity rewrite','approved');
 exception when check_violation then denied:=true;end;
 if not denied then raise exception 'Approved canonical identity rewritten';end if;
 data:=public.dic_admin_edit_coffee(canonical_id,rev,
   '{"name":"Canonical Fixture","roaster":"Fixture Roaster","release_label":"","summary":"Improved descriptive detail"}'::jsonb,
   'Added useful descriptive detail','approved');
 if data->>'ok'<>'true' or (select summary from public.coffees where id=canonical_id)<>'Improved descriptive detail'
 then raise exception 'Approved descriptive correction failed';end if;
 if (select count(*) from public.shots)<>before_count then raise exception 'Shot history altered by coffee corrections';end if;
 -- Build a real synthetic member's shot/notes with valid immutable equipment
 -- provenance as the disposable postgres fixture owner, never as admin.
 execute 'reset role';
 insert into public.setups(id,owner_id,name) values(setup_id,member_id,'Fixture setup');
 insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model,burr_set)
 values(version_id,member_id,setup_id,'Test Machine','Test Grinder','Test Burr');
 insert into public.grinder_calibrations(id,owner_id,setup_id,grinder_model,burr_set,finest_setting,coarsest_setting)
 values(calibration_id,member_id,setup_id,'Test Grinder','Test Burr',0,5);
 insert into public.baskets(id,owner_id,setup_id,name) values(basket_id,member_id,setup_id,'18 g');
 insert into public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g,model)
 values(basket_version_id,member_id,setup_id,basket_id,18,'Test Basket');
 insert into public.library_entries(id,owner_id,coffee_id) values(library_id,member_id,canonical_id);
 insert into public.shots(id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,
  calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,
  extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 values(shot_id,member_id,library_id,setup_id,version_id,basket_version_id,
  calibration_id,'Turbo',now(),18,42,25,1.1,2,2,2,2,3,'{}')
 returning revision into shot_rev;
 insert into public.shot_notes(owner_id,shot_id,notes) values(member_id,shot_id,'Private original note');
 -- Ordinary member cannot edit via administrator-only RPC.
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.dic_admin_edit_shot(shot_id,shot_rev,
  '{"dose_g":"18","yield_g":"42","time_s":"26","notes":"Changed by fake member"}'::jsonb,
  'Member cannot change foreign history','shot');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Regular member reached privileged shot correction';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 execute 'set local role authenticated';
 data:=public.dic_admin_records('shots',0,50);
 if not exists(select 1 from jsonb_array_elements(data->'items') i
   where i->>'id'=shot_id::text and i->>'creator_email'='only-for-admin-test@fixture.invalid'
   and i->>'notes'='Private original note') then
  raise exception 'Admin cannot view member shot with its private notes and creator';end if;
 denied:=false;
 begin perform public.dic_admin_edit_shot(shot_id,shot_rev+1,
  '{"dose_g":"18","yield_g":"42","time_s":"26","notes":"Stale"}'::jsonb,
  'Stale administrator shot correction','shot');
 exception when serialization_failure then denied:=true;end;
 if not denied then raise exception 'Stale administrator shot revision accepted';end if;
 data:=public.dic_admin_edit_shot(shot_id,shot_rev,
  '{"dose_g":"18","yield_g":"42","time_s":"26","notes":"Audited operator correction"}'::jsonb,
  'Correct timed shot and private notes','shot');
 if data->>'ok'<>'true' then raise exception 'Admin shot correction rejected';end if;
 execute 'reset role';
 if (select time_s from public.shots where id=shot_id)<>26
  or (select notes from public.shot_notes where shot_id=shot_id and owner_id=member_id)<>'Audited operator correction'
  or (select owner_id from public.shots where id=shot_id)<>member_id
  or (select setup_id from public.shots where id=shot_id)<>setup_id then
  raise exception 'Correction changed provenance or failed member shot/notes update';end if;
 if not exists(select 1 from private.admin_content_edits where record_id=shot_id
   and record_kind='shot' and actor_id=admin_id and subject_owner_id=member_id
   and before_values->>'notes'='Private original note'
   and after_values->>'notes'='Audited operator correction') then
  raise exception 'Admin shot correction missing original/updated private note audit';end if;
 if (select count(*) from public.shots)<>before_count+1 then
  raise exception 'Admin correction changed number of original shots';end if;
 -- Anon denial below retains original administrator subject and invokes a
 -- role check; all records from this synthetic fixture roll back.

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
select 'PASS: admin-only pagination, creator attribution, private shot notes, member/anon denial, revision race, audited coffee/shot corrections, immutable provenance; synthetic records rolled back' as result;
rollback;
