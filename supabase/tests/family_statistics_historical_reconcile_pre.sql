-- Issue #509 R360: synthetic fixture, ONLY disconnected dic_ci PG17.
-- Stream with the actual migration and post-assertions in ONE transaction.
BEGIN;
CREATE TEMP TABLE issue509_reconcile_fixture (
 owner_id uuid, family_id uuid, other_family_id uuid,
 first_shot uuid, second_shot uuid, third_shot uuid,
 other_statistics jsonb, other_state text
) ON COMMIT DROP;
DO $fixture$
DECLARE
 member_id uuid:=gen_random_uuid();
 setup_id uuid:=gen_random_uuid(); version_id uuid:=gen_random_uuid();
 calibration_id uuid:=gen_random_uuid();
 basket_id uuid:=gen_random_uuid(); basket_version_id uuid:=gen_random_uuid();
 coffee_id uuid; library_id uuid; a uuid; b uuid; c uuid; fam uuid; other_fam uuid;
 other_stats jsonb; other_state text;
BEGIN
 IF current_database()<>'dic_ci' THEN
   RAISE EXCEPTION 'Disposable dic_ci database required';
 END IF;
 INSERT INTO auth.users(id,aud,role,email)
  VALUES(member_id,'authenticated','authenticated',member_id::text||'@fixture.invalid');
 INSERT INTO private.beta_members(owner_id,enabled,admitted_at)
  VALUES(member_id,true,now()) ON CONFLICT(owner_id)
  DO UPDATE SET enabled=true,admitted_at=now();
 INSERT INTO public.coffees(name,roaster,verification_state)
  VALUES('Stale family reconciliation fixture','Synthetic CI','verified')
  RETURNING id INTO coffee_id;
 INSERT INTO public.setups(id,owner_id,name)
  VALUES(setup_id,member_id,'Synthetic setup');
 INSERT INTO public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model)
  VALUES(version_id,member_id,setup_id,'Synthetic machine','Synthetic grinder');
 UPDATE public.setups SET active_version_id=version_id WHERE id=setup_id;
 INSERT INTO public.grinder_calibrations(id,owner_id,setup_id,grinder_model,finest_setting,coarsest_setting)
  VALUES(calibration_id,member_id,setup_id,'Synthetic grinder',0,10);
 INSERT INTO public.baskets(id,owner_id,setup_id,name)
  VALUES(basket_id,member_id,setup_id,'Synthetic basket');
 INSERT INTO public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g)
  VALUES(basket_version_id,member_id,setup_id,basket_id,18);
 INSERT INTO public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id)
  VALUES(member_id,setup_id,version_id,calibration_id,basket_version_id);
 INSERT INTO public.library_entries(owner_id,coffee_id)
  VALUES(member_id,coffee_id) RETURNING id INTO library_id;

 INSERT INTO public.shots(owner_id,library_entry_id,setup_id,setup_version_id,
  basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,
  grind_setting,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 VALUES(member_id,library_id,setup_id,version_id,basket_version_id,calibration_id,
  'Turbo',now()-interval '3 hours',18,36,22,2,3,3,5,5,1,'{}')
 RETURNING id INTO a;
 PERFORM private.classify_personal_shot(a);
 INSERT INTO public.shots(owner_id,library_entry_id,setup_id,setup_version_id,
  basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,
  grind_setting,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 VALUES(member_id,library_id,setup_id,version_id,basket_version_id,calibration_id,
  'Turbo',now()-interval '2 hours',18,36,24,2.2,3,3,5,5,1,'{}')
 RETURNING id INTO b;
 PERFORM private.classify_personal_shot(b);
 INSERT INTO public.shots(owner_id,library_entry_id,setup_id,setup_version_id,
  basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,
  grind_setting,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 VALUES(member_id,library_id,setup_id,version_id,basket_version_id,calibration_id,
  'Turbo',now()-interval '1 hour',18,54,30,2.6,3,3,5,5,1,'{}')
 RETURNING id INTO c;
 PERFORM private.classify_personal_shot(c);
 SELECT personal_family_id INTO fam FROM public.shots WHERE id=a;
 SELECT personal_family_id INTO other_fam FROM public.shots WHERE id=c;
 IF fam IS NULL OR other_fam IS NULL OR fam=other_fam
    OR (SELECT personal_family_id FROM public.shots WHERE id=b) IS DISTINCT FROM fam
 THEN RAISE EXCEPTION 'Synthetic 2-to-1 family clustering did not hold'; END IF;
 IF (SELECT statistics->>'count' FROM public.personal_recipe_families WHERE id=fam)<>'2'
 THEN RAISE EXCEPTION 'Baseline two eligible shots not present'; END IF;
 INSERT INTO public.shot_notes(owner_id,shot_id,notes)
  VALUES(member_id,a,'Synthetic note must be preserved');
 UPDATE public.recipe_preferences SET favorite_shot_id=a
  WHERE owner_id=member_id AND setup_version_id=version_id
    AND library_entry_id=library_id AND style='Turbo' AND current_family_id=fam;
 IF NOT FOUND THEN RAISE EXCEPTION 'Synthetic Current not available'; END IF;
 SELECT statistics,evidence_state INTO other_stats,other_state
  FROM public.personal_recipe_families WHERE id=other_fam;
 INSERT INTO issue509_reconcile_fixture VALUES
  (member_id,fam,other_fam,a,b,c,other_stats,other_state);
 -- Reproduce the read-only verified discrepancy: stored 6 versus 2 eligible.
 UPDATE public.personal_recipe_families
 SET statistics=jsonb_set(jsonb_set(statistics,'{count}','6'::jsonb),
                           '{ratio,center}','99'::jsonb)
 WHERE id=fam;
 IF (SELECT statistics->>'count' FROM public.personal_recipe_families WHERE id=fam)<>'6'
 THEN RAISE EXCEPTION 'Failed to seed stale derived count'; END IF;
END $fixture$;
