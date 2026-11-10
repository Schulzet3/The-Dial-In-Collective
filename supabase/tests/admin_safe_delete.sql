-- Issue 100: truly disposable PostgreSQL 17.11 deletion acceptance. Always ROLLBACK.
BEGIN;
DO $test$
DECLARE owner uuid:='10000000-0000-4000-8000-000000000001'; member uuid:=gen_random_uuid();
 coffee uuid; pending uuid; lid uuid; shot uuid; setup uuid:=gen_random_uuid();
 version uuid:=gen_random_uuid(); basket uuid:=gen_random_uuid(); basket_version uuid:=gen_random_uuid();
 calibration uuid:=gen_random_uuid(); impact jsonb; response jsonb; rev bigint; blocked boolean;
BEGIN
 IF current_database()<>'dic_ci' THEN RAISE EXCEPTION 'Only disposable database'; END IF;
 -- #509 Run137: privileged private delete functions must not inherit PUBLIC
 -- EXECUTE. The invoker public wrappers and service role must retain access.
 PERFORM 1 FROM pg_proc p, LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
 WHERE p.oid = ANY(ARRAY[
  'private.dic_admin_delete_preview(text,uuid)'::regprocedure,
  'private.dic_admin_delete_record(text,uuid,bigint,jsonb)'::regprocedure
 ]) AND acl.grantee=0 AND acl.privilege_type='EXECUTE';
 IF FOUND THEN RAISE EXCEPTION 'Private destructive SECURITY DEFINER has PUBLIC EXECUTE'; END IF;
 IF has_function_privilege('anon','private.dic_admin_delete_preview(text,uuid)','EXECUTE')
 OR has_function_privilege('anon','private.dic_admin_delete_record(text,uuid,bigint,jsonb)','EXECUTE')
 OR NOT has_function_privilege('authenticated','private.dic_admin_delete_preview(text,uuid)','EXECUTE')
 OR NOT has_function_privilege('authenticated','private.dic_admin_delete_record(text,uuid,bigint,jsonb)','EXECUTE')
 OR NOT has_function_privilege('service_role','private.dic_admin_delete_preview(text,uuid)','EXECUTE')
 OR NOT has_function_privilege('service_role','private.dic_admin_delete_record(text,uuid,bigint,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'Private delete execute privilege boundary regressed'; END IF;
 INSERT INTO auth.users(id,aud,role,email) VALUES(member,'authenticated','authenticated',member::text||'@fixture.invalid');
 INSERT INTO private.beta_members(owner_id,enabled,admitted_at) VALUES(member,true,now()) ON CONFLICT (owner_id) DO UPDATE SET enabled=true,admitted_at=now();
 INSERT INTO public.coffees(name,roaster,verification_state,origin)
 VALUES('Admin Delete Fixture','Synthetic Roaster','verified','Colombia') RETURNING id,revision INTO coffee,rev;
 INSERT INTO public.setups(id,owner_id,name) VALUES(setup,member,'Delete test');
 INSERT INTO public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model)
 VALUES(version,member,setup,'Machine','Grinder');
 UPDATE public.setups SET active_version_id=version WHERE id=setup;
 INSERT INTO public.grinder_calibrations(id,owner_id,setup_id,grinder_model,finest_setting,coarsest_setting)
 VALUES(calibration,member,setup,'Grinder',0,10);
 INSERT INTO public.baskets(id,owner_id,setup_id,name) VALUES(basket,member,setup,'Basket');
 INSERT INTO public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g)
 VALUES(basket_version,member,setup,basket,18);
 INSERT INTO public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id)
 VALUES(member,setup,version,calibration,basket_version);
 INSERT INTO public.library_entries(owner_id,coffee_id) VALUES(member,coffee) RETURNING id INTO lid;
 INSERT INTO public.shots(owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,
 style,pulled_at,dose_g,yield_g,time_s,grind_setting,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 VALUES(member,lid,setup,version,basket_version,calibration,'Traditional',now(),18,36,26,2,3,3,3,3,3,'{}')
 RETURNING id INTO shot;
 INSERT INTO public.shot_notes(owner_id,shot_id,notes) VALUES(member,shot,'Synthetic and private');
 -- An admitted non-admin must not obtain the impact or mutate another member's shots.
 PERFORM set_config('request.jwt.claim.sub',member::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 blocked:=false;
 BEGIN
  PERFORM public.dic_admin_delete_preview('approved',coffee);
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Member obtained destructive impact details'; END IF;
 -- A direct authenticated call to the private definer must also reject a member.
 blocked:=false;
 BEGIN PERFORM private.dic_admin_delete_record('approved',coffee,rev,'{}'::jsonb);
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Ordinary member bypassed private admin delete guard'; END IF;
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 impact:=public.dic_admin_delete_preview('approved',coffee);
 IF (impact->>'shots')::int<>1 OR (impact->>'shot_notes')::int<>1 OR
  (impact->>'library_entries')::int<>1 OR (impact->>'blocked')::boolean THEN
  RAISE EXCEPTION 'Incorrect admin impact preview %',impact;
 END IF;
 -- No deletion without the exact source revision and unchanged impact.
 blocked:=false;
 BEGIN
  PERFORM public.dic_admin_delete_record('approved',coffee,rev+1,impact);
 EXCEPTION WHEN serialization_failure THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Stale revision deletion accepted'; END IF;
 IF (private.dic_admin_delete_preview('approved',coffee)->>'shots')::int<>1 THEN RAISE EXCEPTION 'Failed delete changed source shot'; END IF;
 response:=public.dic_admin_delete_record('approved',coffee,rev,impact);
 EXECUTE 'RESET ROLE'; -- readback bypasses member RLS for independent disposal-only validation
 IF (response->>'ok')::boolean IS DISTINCT FROM true OR
  EXISTS(SELECT 1 FROM public.shots WHERE id=shot) OR
  EXISTS(SELECT 1 FROM public.shot_notes WHERE shot_id=shot) OR
  EXISTS(SELECT 1 FROM public.library_entries WHERE id=lid) OR
  EXISTS(SELECT 1 FROM public.coffees WHERE id=coffee) THEN
  RAISE EXCEPTION 'Atomic canonical/shot/note removal failed';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM private.dic_admin_delete_receipts WHERE record_id=coffee)
 THEN RAISE EXCEPTION 'Private deletion receipt missing'; END IF;
 EXECUTE 'RESET ROLE';
 -- Distinct Pending submission, no canonical record.
 INSERT INTO public.coffee_submissions(owner_id,proposed_data,status)
 VALUES(member,'{"name":"Pending Test","roaster":"Synthetic Roaster"}','pending')
 RETURNING id,revision INTO pending,rev;
 -- A private Pending coffee can already have a library entry, shot and note.
 INSERT INTO public.library_entries(owner_id,submission_id) VALUES(member,pending) RETURNING id INTO lid;
 INSERT INTO public.shots(owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,
  style,pulled_at,dose_g,yield_g,time_s,grind_setting,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 VALUES(member,lid,setup,version,basket_version,calibration,'Traditional',now(),18,36,28,2,3,3,3,3,3,'{}')
 RETURNING id INTO shot;
 INSERT INTO public.shot_notes(owner_id,shot_id,notes) VALUES(member,shot,'Pending private shot note');
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 impact:=public.dic_admin_delete_preview('submission',pending);
 IF (impact->>'shots')::int<>1 OR (impact->>'shot_notes')::int<>1 OR
  (impact->>'library_entries')::int<>1 THEN
  RAISE EXCEPTION 'Pending dependent impact counts missing %',impact;
 END IF;
 IF (impact->>'linked_submissions')::int<>1 THEN RAISE EXCEPTION 'Pending count incorrect'; END IF;
 PERFORM public.dic_admin_delete_record('submission',pending,rev,impact);
 EXECUTE 'RESET ROLE';
 IF EXISTS(SELECT 1 FROM public.shots WHERE id=shot) OR EXISTS(SELECT 1 FROM public.shot_notes WHERE shot_id=shot)
  OR EXISTS(SELECT 1 FROM public.library_entries WHERE id=lid) THEN
  RAISE EXCEPTION 'Pending deletion left dependent shot, note or library';
 END IF;
 IF EXISTS(SELECT 1 FROM public.coffee_submissions WHERE id=pending) THEN
  RAISE EXCEPTION 'Pending deletion did not remove submission';
 END IF;
 EXECUTE 'RESET ROLE';
END $test$;
ROLLBACK;
