-- Issue #509 R341. SQL integration on disposable dic_ci PostgreSQL 17 only; rollback.
BEGIN;
DO $r341$
DECLARE
 u uuid; owner_uuid uuid; owner_shot uuid; held_id uuid;
 coffee_id uuid:=gen_random_uuid(); setup_id uuid; version_id uuid;
 basket_id uuid; basket_version_id uuid; calibration_id uuid;
 library_id uuid; shot_id uuid; i integer; outcome jsonb;
BEGIN
 IF current_database()<>'dic_ci' THEN RAISE EXCEPTION 'Requires isolated dic_ci'; END IF;
 IF has_function_privilege('anon','private.dic_review_community_shot(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Private Community review exposed';
 END IF;
 INSERT INTO public.coffees(id,name,roaster,release_label,verification_state)
 VALUES(coffee_id,'CI R341 Revision','Fixture Roaster','R341','verified');
 -- Five independent, eligible shots create a stable reference cohort.
 FOR i IN 1..6 LOOP
  u:=gen_random_uuid();setup_id:=gen_random_uuid();version_id:=gen_random_uuid();
  basket_id:=gen_random_uuid();basket_version_id:=gen_random_uuid();
  calibration_id:=gen_random_uuid();library_id:=gen_random_uuid();shot_id:=gen_random_uuid();
  INSERT INTO auth.users(id,aud,role,email) VALUES
    (u,'authenticated','authenticated',u::text||'@fixture.invalid');
  UPDATE private.beta_members SET enabled=true,admitted_at=now() WHERE owner_id=u;
  INSERT INTO public.setups(id,owner_id,name) VALUES(setup_id,u,'Fixture Setup');
  INSERT INTO public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model,burr_set)
   VALUES(version_id,u,setup_id,'Fixture Machine','Fixture Grinder','Fixture Burr');
  INSERT INTO public.grinder_calibrations(id,owner_id,setup_id,grinder_model,burr_set,finest_setting,coarsest_setting)
   VALUES(calibration_id,u,setup_id,'Fixture Grinder','Fixture Burr',0,5);
  INSERT INTO public.baskets(id,owner_id,setup_id,name) VALUES(basket_id,u,setup_id,'18 g');
  INSERT INTO public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g,model)
   VALUES(basket_version_id,u,setup_id,basket_id,18,'Fixture Basket');
  INSERT INTO public.library_entries(id,owner_id,coffee_id) VALUES(library_id,u,coffee_id);
  INSERT INTO public.shots(id,owner_id,library_entry_id,setup_id,setup_version_id,
    basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,
    grind_setting,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
   VALUES(shot_id,u,library_id,setup_id,version_id,basket_version_id,
    calibration_id,'Turbo',now(),18,42,CASE WHEN i=6 THEN 145 ELSE 25 END,
    1.1,3,3,5,5,1,'{}');
  IF i=6 THEN owner_uuid:=u;owner_shot:=shot_id;
   SELECT community_shot_id INTO STRICT held_id FROM private.contribution_links WHERE shot_id=shot_id;
  END IF;
 END LOOP;
 IF (SELECT quality_state FROM public.community_shots WHERE id=held_id)<>'held'
   OR (SELECT reason FROM private.community_quality_checks WHERE community_shot_id=held_id)<>'extreme_outlier'
 THEN RAISE EXCEPTION 'Expected synthetic held extreme outlier'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_uuid::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_uuid,'role','authenticated')::text,true);
 EXECUTE 'set local role authenticated';
 outcome:=public.dic_confirm_community_outlier(owner_shot,NULL::bigint);
 IF outcome->>'ok' IS DISTINCT FROM 'false' OR outcome->>'reason' IS DISTINCT FROM 'not_found_or_conflict' THEN
  RAISE EXCEPTION 'NULL bypassed revision guard: %',outcome; END IF;
 outcome:=public.dic_confirm_community_outlier(owner_shot,100);
 IF outcome->>'ok' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'Stale revision accepted'; END IF;
 outcome:=public.dic_confirm_community_outlier(owner_shot,1);
 IF outcome->>'ok' IS DISTINCT FROM 'true' OR outcome->>'state' IS DISTINCT FROM 'eligible' THEN
  RAISE EXCEPTION 'Correct owner confirmation regressed: %',outcome; END IF;
 outcome:=public.dic_confirm_community_outlier(owner_shot,NULL::bigint);
 IF outcome->>'ok' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'NULL replay accepted'; END IF;
 EXECUTE 'reset role';
 IF (SELECT quality_state FROM public.community_shots WHERE id=held_id)<>'eligible' THEN
  RAISE EXCEPTION 'Previously held outlier did not become eligible'; END IF;
 RAISE NOTICE 'PASS: NULL and stale revisions rejected; exact admitted-owner confirmation works, replay denied; rollback';
END $r341$;
ROLLBACK;
