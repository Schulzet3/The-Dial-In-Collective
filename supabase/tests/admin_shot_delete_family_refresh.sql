-- Issue #509 R358: disconnected PostgreSQL 17.11, synthetic fixtures only.
-- An Admin shot delete must refresh its personal family; never touch live data.
BEGIN;
DO $test$
DECLARE
 admin_id uuid:='10000000-0000-4000-8000-000000000001';
 member_id uuid:=gen_random_uuid(); coffee_id uuid; setup_id uuid:=gen_random_uuid();
 version_id uuid:=gen_random_uuid(); cal_id uuid:=gen_random_uuid();
 basket_id uuid:=gen_random_uuid(); basket_version_id uuid:=gen_random_uuid();
 library_id uuid; shot_a uuid; shot_b uuid; family_id uuid;
 rev bigint; impact jsonb; response jsonb;
BEGIN
 IF current_database()<>'dic_ci' THEN RAISE EXCEPTION 'Disposable dic_ci only'; END IF;
 INSERT INTO auth.users(id,aud,role,email)
  VALUES(member_id,'authenticated','authenticated',member_id::text||'@fixture.invalid');
 INSERT INTO private.beta_members(owner_id,enabled,admitted_at)
  VALUES(member_id,true,now()) ON CONFLICT(owner_id)
  DO UPDATE SET enabled=true,admitted_at=now();
 INSERT INTO public.coffees(name,roaster,verification_state)
  VALUES('Admin Shot Family Refresh fixture','Synthetic CI','verified') RETURNING id INTO coffee_id;
 INSERT INTO public.setups(id,owner_id,name) VALUES(setup_id,member_id,'Family refresh fixture');
 INSERT INTO public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model)
  VALUES(version_id,member_id,setup_id,'Fixture machine','Fixture grinder');
 UPDATE public.setups SET active_version_id=version_id WHERE id=setup_id;
 INSERT INTO public.grinder_calibrations(id,owner_id,setup_id,grinder_model,finest_setting,coarsest_setting)
  VALUES(cal_id,member_id,setup_id,'Fixture grinder',0,10);
 INSERT INTO public.baskets(id,owner_id,setup_id,name) VALUES(basket_id,member_id,setup_id,'Fixture basket');
 INSERT INTO public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g)
  VALUES(basket_version_id,member_id,setup_id,basket_id,18);
 INSERT INTO public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id)
  VALUES(member_id,setup_id,version_id,cal_id,basket_version_id);
 INSERT INTO public.library_entries(owner_id,coffee_id) VALUES(member_id,coffee_id) RETURNING id INTO library_id;
 INSERT INTO public.shots(owner_id,library_entry_id,setup_id,setup_version_id,
  basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,
  grind_setting,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 VALUES(member_id,library_id,setup_id,version_id,basket_version_id,cal_id,
  'Turbo',now()-interval '2 hours',18,36,22,2,3,3,5,5,1,'{}') RETURNING id INTO shot_a;
 PERFORM private.classify_personal_shot(shot_a);
 INSERT INTO public.shots(owner_id,library_entry_id,setup_id,setup_version_id,
  basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,
  grind_setting,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 VALUES(member_id,library_id,setup_id,version_id,basket_version_id,cal_id,
  'Turbo',now()-interval '1 hour',18,36,24,2.5,3,3,5,5,1,'{}') RETURNING id INTO shot_b;
 PERFORM private.classify_personal_shot(shot_b);
 SELECT personal_family_id INTO family_id FROM public.shots WHERE id=shot_a;
 IF family_id IS NULL OR (SELECT personal_family_id FROM public.shots WHERE id=shot_b) IS DISTINCT FROM family_id
 THEN RAISE EXCEPTION 'Fixture shots did not join the same family'; END IF;
 IF (SELECT statistics->>'count' FROM public.personal_recipe_families WHERE id=family_id)<>'2'
 OR (SELECT evidence_state FROM public.personal_recipe_families WHERE id=family_id)<>'personally_confirmed'
 THEN RAISE EXCEPTION 'Two-shot baseline did not confirm family'; END IF;
 UPDATE public.recipe_preferences SET favorite_shot_id=shot_a
 WHERE owner_id=member_id AND setup_version_id=version_id AND library_entry_id=library_id AND style='Turbo';
 IF NOT FOUND THEN RAISE EXCEPTION 'Fixture Current preference missing'; END IF;
 PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 SELECT revision INTO rev FROM public.shots WHERE id=shot_a;
 EXECUTE 'SET LOCAL ROLE authenticated';
 impact:=public.dic_admin_delete_preview('shot',shot_a);
 response:=public.dic_admin_delete_record('shot',shot_a,rev,impact);
 EXECUTE 'RESET ROLE';
 IF response->>'ok'<>'true' OR EXISTS(SELECT 1 FROM public.shots WHERE id=shot_a)
 THEN RAISE EXCEPTION 'Authorized first Admin shot deletion failed'; END IF;
 IF (SELECT statistics->>'count' FROM public.personal_recipe_families WHERE id=family_id)<>'1'
 OR (SELECT evidence_state FROM public.personal_recipe_families WHERE id=family_id)<>'candidate'
 THEN RAISE EXCEPTION 'Family evidence was not refreshed after first Admin deletion'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.recipe_preferences WHERE owner_id=member_id AND setup_version_id=version_id
  AND library_entry_id=library_id AND style='Turbo' AND current_family_id=family_id AND favorite_shot_id IS NULL)
 THEN RAISE EXCEPTION 'Valid surviving Current or favorite clearing regressed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
 SELECT revision INTO rev FROM public.shots WHERE id=shot_b;
 EXECUTE 'SET LOCAL ROLE authenticated';
 impact:=public.dic_admin_delete_preview('shot',shot_b);
 response:=public.dic_admin_delete_record('shot',shot_b,rev,impact);
 EXECUTE 'RESET ROLE';
 IF response->>'ok'<>'true' OR EXISTS(SELECT 1 FROM public.shots WHERE id=shot_b)
 THEN RAISE EXCEPTION 'Authorized final Admin shot deletion failed'; END IF;
 IF (SELECT statistics->>'count' FROM public.personal_recipe_families WHERE id=family_id)<>'0'
 OR (SELECT evidence_state FROM public.personal_recipe_families WHERE id=family_id)<>'retired'
 THEN RAISE EXCEPTION 'Empty personal family was not retired'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.recipe_preferences WHERE owner_id=member_id AND setup_version_id=version_id
  AND library_entry_id=library_id AND style='Turbo' AND current_family_id IS NULL)
 THEN RAISE EXCEPTION 'Unsupported Current remains after deleting last family shot'; END IF;
 IF (SELECT count(*) FROM private.dic_admin_delete_receipts WHERE record_id IN (shot_a,shot_b))<>2
 THEN RAISE EXCEPTION 'Admin deletion receipts missing'; END IF;
END $test$;
SELECT 'PASS: Admin shot deletion refreshes 2-to-1-to-0 family and Current, preserves receipts; rolled back' AS result;
ROLLBACK;
