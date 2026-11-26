-- #509 R379 isolated PostgreSQL17 fixture; no hosted connections; rollback all synthetic rows.
BEGIN;
DO $dic_ws$
DECLARE
 u uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); vid uuid:=gen_random_uuid();
 cal uuid:=gen_random_uuid(); bid uuid:=gen_random_uuid(); bvid uuid:=gen_random_uuid();
 cid uuid:=gen_random_uuid(); lid uuid:=gen_random_uuid(); shotid uuid:=gen_random_uuid();
 r jsonb; rev bigint; family_id uuid; denied boolean;
BEGIN
 IF current_database()<>'dic_ci' THEN RAISE EXCEPTION 'Disposable dic_ci only'; END IF;
 INSERT INTO auth.users(id,aud,role,email,email_confirmed_at) VALUES(u,'authenticated','authenticated',u::text||'@example.invalid',now());
 INSERT INTO private.beta_members(owner_id,enabled,admitted_at) VALUES(u,true,now())
 ON CONFLICT(owner_id) DO UPDATE SET enabled=true,admitted_at=now();
 INSERT INTO public.setups(id,owner_id,name) VALUES(sid,u,'Synthetic Setup');
 INSERT INTO public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model) VALUES(vid,u,sid,'Test machine','Test grinder');
 UPDATE public.setups SET active_version_id=vid WHERE id=sid;
 INSERT INTO public.grinder_calibrations(id,owner_id,setup_id,grinder_model,finest_setting,coarsest_setting)
 VALUES(cal,u,sid,'Test grinder',0,10);
 INSERT INTO public.baskets(id,owner_id,setup_id,name) VALUES(bid,u,sid,'18 g');
 INSERT INTO public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g) VALUES(bvid,u,sid,bid,18);
 INSERT INTO public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id)
 VALUES(u,sid,vid,cal,bvid);
 INSERT INTO public.coffees(id,name,roaster,verification_state) VALUES(cid,'Synthetic Coffee','Synthetic Roaster','verified');
 INSERT INTO public.library_entries(id,owner_id,coffee_id) VALUES(lid,u,cid);
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 r:=public.dic_mutate(gen_random_uuid(),'set_style',
 jsonb_build_object('setup_id',sid,'setup_version_id',vid,'library_entry_id',lid,'style','Turbo','expected_revision',0));
 IF r->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Active set_style failed: %',r; END IF;
 EXECUTE 'RESET ROLE';
 INSERT INTO public.shots(id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,
 style,pulled_at,dose_g,yield_g,time_s,grind_setting,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 VALUES(shotid,u,lid,sid,vid,bvid,cal,'Turbo',now(),18,36,24,2,3,3,5,5,1,'{}');
 PERFORM private.classify_personal_shot(shotid);
 SELECT personal_family_id INTO family_id FROM public.shots WHERE id=shotid;
 IF family_id IS NULL THEN RAISE EXCEPTION 'Green shot family not classified'; END IF;
 EXECUTE 'SET LOCAL ROLE authenticated';
 r:=public.dic_mutate(gen_random_uuid(),'make_current',jsonb_build_object('shot_id',shotid,
 'expected_revision',coalesce((SELECT revision FROM public.recipe_preferences
 WHERE owner_id=u AND setup_version_id=vid AND library_entry_id=lid AND style='Turbo'),0)));
 IF r->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Active make_current failed: %',r; END IF;
 EXECUTE 'RESET ROLE';
 UPDATE public.setups SET archived_at=now() WHERE id=sid;
 EXECUTE 'SET LOCAL ROLE authenticated';
 denied:=false;
 BEGIN
 PERFORM public.dic_mutate(gen_random_uuid(),'set_style',
 jsonb_build_object('setup_id',sid,'setup_version_id',vid,'library_entry_id',lid,'style','Lungo',
 'expected_revision',(SELECT revision FROM public.workspace_coffees
 WHERE owner_id=u AND setup_id=sid AND setup_version_id=vid AND library_entry_id=lid)));
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Archived setup accepted set_style'; END IF;
 denied:=false;
 BEGIN PERFORM public.dic_mutate(gen_random_uuid(),'make_current',
 jsonb_build_object('shot_id',shotid,'expected_revision',(SELECT revision FROM public.recipe_preferences
 WHERE owner_id=u AND setup_version_id=vid AND library_entry_id=lid AND style='Turbo')));
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Archived setup accepted make_current'; END IF;
 EXECUTE 'RESET ROLE';
 UPDATE public.setups SET archived_at=NULL WHERE id=sid;
 UPDATE public.library_entries SET hidden_at=now() WHERE id=lid;
 EXECUTE 'SET LOCAL ROLE authenticated';
 denied:=false;
 BEGIN PERFORM public.dic_mutate(gen_random_uuid(),'set_style',
 jsonb_build_object('setup_id',sid,'setup_version_id',vid,'library_entry_id',lid,'style','Lungo',
 'expected_revision',(SELECT revision FROM public.workspace_coffees
 WHERE owner_id=u AND setup_id=sid AND setup_version_id=vid AND library_entry_id=lid)));
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Hidden library entry accepted set_style'; END IF;
 denied:=false;
 BEGIN PERFORM public.dic_mutate(gen_random_uuid(),'make_current',
 jsonb_build_object('shot_id',shotid,'expected_revision',(SELECT revision FROM public.recipe_preferences
 WHERE owner_id=u AND setup_version_id=vid AND library_entry_id=lid AND style='Turbo')));
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Hidden coffee accepted make_current'; END IF;
 EXECUTE 'RESET ROLE';
 IF (SELECT selected_style FROM public.workspace_coffees
 WHERE owner_id=u AND setup_id=sid AND setup_version_id=vid AND library_entry_id=lid) IS DISTINCT FROM 'Turbo'
 THEN RAISE EXCEPTION 'Failed mutation changed historical workspace style'; END IF;
 IF (SELECT count(*) FROM public.shots WHERE owner_id=u)<>1 THEN RAISE EXCEPTION 'Historical shot lost'; END IF;
END $dic_ws$;
SELECT 'PASS: active style/Current; archived/hidden denied; historical shot remains (rollback)' AS result;
ROLLBACK;
