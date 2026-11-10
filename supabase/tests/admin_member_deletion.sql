-- Issue #1676: execute only in disposable dic_ci. No hosted account deletion.
BEGIN;
DO $test$
DECLARE
 admin uuid:='10000000-0000-4000-8000-000000000001';
 keep_user uuid:=gen_random_uuid();
 remove_user uuid:=gen_random_uuid();
 peer_user uuid:=gen_random_uuid();
 coffee uuid;
 ckeep uuid; cremove uuid; cpeer uuid;
 community_keep uuid; community_remove uuid; community_peer uuid;
 impact jsonb; request jsonb; prepared jsonb; finished jsonb;
 op_keep uuid; op_remove uuid; source_submission uuid;
 pending_member_submission uuid; pending_member_library_entry uuid;
 delete_setup uuid; delete_setup_version uuid; delete_basket uuid;
 delete_basket_version uuid; delete_calibration_a uuid; delete_calibration_b uuid;
 delete_library uuid; delete_family uuid; delete_shot uuid;
 blocked boolean;
 BEGIN
 IF current_database()<>'dic_ci' THEN RAISE EXCEPTION 'Only disposable dic_ci allowed'; END IF;
 INSERT INTO auth.users(id,aud,role,email,email_confirmed_at) VALUES
 (keep_user,'authenticated','authenticated','member-keep@fixture.invalid',now()),
 (remove_user,'authenticated','authenticated','member-remove@fixture.invalid',now()),
 (peer_user,'authenticated','authenticated','member-peer@fixture.invalid',now());
 UPDATE private.beta_members SET enabled=true,admitted_at=now()
 WHERE owner_id IN (keep_user,remove_user,peer_user);
 SELECT id INTO ckeep FROM private.contributors WHERE owner_id=keep_user;
 SELECT id INTO cremove FROM private.contributors WHERE owner_id=remove_user;
 SELECT id INTO cpeer FROM private.contributors WHERE owner_id=peer_user;
 IF ckeep IS NULL THEN INSERT INTO private.contributors(owner_id) VALUES(keep_user) RETURNING id INTO ckeep; END IF;
 IF cremove IS NULL THEN INSERT INTO private.contributors(owner_id) VALUES(remove_user) RETURNING id INTO cremove; END IF;
 IF cpeer IS NULL THEN INSERT INTO private.contributors(owner_id) VALUES(peer_user) RETURNING id INTO cpeer; END IF;
 INSERT INTO public.coffees(name,roaster,origin,verification_state)
 VALUES('Member deletion CI coffee','Synthetic Roaster','Brazil','verified') RETURNING id INTO coffee;
 -- A real non-admin author may have supplied the canonical first coffee entry.
 -- These retained audit/provenance FKs originally had NO ACTION and would block
 -- GoTrue hard deletion even though coffee_submissions cascades from auth.users.
 INSERT INTO public.coffee_submissions(owner_id,proposed_data,canonical_coffee_id,status)
 VALUES(keep_user,'{"name":"Member deletion CI coffee","roaster":"Synthetic Roaster"}'::jsonb,coffee,'approved')
 RETURNING id INTO source_submission;
 INSERT INTO private.dic_coffee_first_entry(coffee_id,first_seen_at,first_submission_id,primary_name)
 VALUES(coffee,now(),source_submission,'Member deletion CI coffee');
 INSERT INTO private.dic_coffee_audit(coffee_id,submission_id,event_kind,evidence)
 VALUES(coffee,source_submission,'admin_approved','{}'::jsonb);
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname='dic_coffee_first_entry_first_submission_id_fkey'
   AND conrelid='private.dic_coffee_first_entry'::regclass AND confdeltype='n'
 ) OR NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname='dic_coffee_audit_submission_id_fkey'
   AND conrelid='private.dic_coffee_audit'::regclass AND confdeltype='n'
 ) THEN RAISE EXCEPTION 'Account deletion provenance FKs are not SET NULL'; END IF;
 INSERT INTO public.community_shots(coffee_id,style,dose_g,yield_g,time_s,
  extraction,body,clarity,sweetness,astringency,feed_mode,observed_on,quality_state)
 VALUES(coffee,'Traditional',18,36,27,3,3,5,5,1,'standard',current_date,'eligible')
 RETURNING id INTO community_keep;
 INSERT INTO public.community_shots(coffee_id,style,dose_g,yield_g,time_s,
  extraction,body,clarity,sweetness,astringency,feed_mode,observed_on,quality_state)
 VALUES(coffee,'Traditional',18,38,29,3,3,5,5,1,'standard',current_date,'eligible')
 RETURNING id INTO community_remove;
 INSERT INTO public.community_shots(coffee_id,style,dose_g,yield_g,time_s,
  extraction,body,clarity,sweetness,astringency,feed_mode,observed_on,quality_state)
 VALUES(coffee,'Traditional',18,40,30,3,3,5,5,1,'standard',current_date,'eligible')
 RETURNING id INTO community_peer;
 INSERT INTO private.contribution_links(community_shot_id,shot_id,contributor_id,source_revision)
 VALUES(community_keep,null,ckeep,1),(community_remove,null,cremove,1),(community_peer,null,cpeer,1);
 IF (SELECT count(*) FROM public.community_shots WHERE coffee_id=coffee AND quality_state='eligible')<>3
 THEN RAISE EXCEPTION 'Community fixture missing'; END IF;
 -- #509 Run131: member-owned pending submission plus linked personal library item.
 -- This independently exercises concurrent auth -> submission and auth -> library
 -- cascades against the composite owner/submission NO ACTION foreign key.
 INSERT INTO public.coffee_submissions(owner_id,proposed_data,status)
 VALUES(keep_user,'{"name":"Pending member review","roaster":"Synthetic Roaster"}'::jsonb,'pending')
 RETURNING id INTO pending_member_submission;
 INSERT INTO public.library_entries(owner_id,submission_id)
 VALUES(keep_user,pending_member_submission)
 RETURNING id INTO pending_member_library_entry;
 IF pending_member_library_entry IS NULL
 THEN RAISE EXCEPTION 'Missing member-owned library submission fixture'; END IF;
 -- #509 Run133: a nonlegacy, non-dialed shot and its complete owner-scoped
 -- equipment/version/preference graph exercise immediate and deferred FKs when
 -- the same Auth owner cascades. All values synthetic; disposable dic_ci only.
 INSERT INTO public.setups(owner_id,name)
 VALUES(keep_user,'CI composite deletion equipment')
 RETURNING id INTO delete_setup;
 INSERT INTO public.setup_versions(owner_id,setup_id,label,machine_model,grinder_model,burr_set)
 VALUES(keep_user,delete_setup,'CI original','CI machine','CI grinder','CI burrs')
 RETURNING id INTO delete_setup_version;
 UPDATE public.setups SET active_version_id=delete_setup_version WHERE id=delete_setup;
 INSERT INTO public.baskets(owner_id,setup_id,name)
 VALUES(keep_user,delete_setup,'CI basket') RETURNING id INTO delete_basket;
 INSERT INTO public.basket_versions(owner_id,setup_id,basket_id,basket_dose_g,model)
 VALUES(keep_user,delete_setup,delete_basket,18,'CI precision basket')
 RETURNING id INTO delete_basket_version;
 INSERT INTO public.grinder_calibrations(owner_id,setup_id,grinder_model,burr_set,finest_setting,coarsest_setting)
 VALUES(keep_user,delete_setup,'CI grinder','CI burrs',1,10)
 RETURNING id INTO delete_calibration_a;
 INSERT INTO public.grinder_calibrations(owner_id,setup_id,grinder_model,burr_set,finest_setting,coarsest_setting,previous_calibration_id)
 VALUES(keep_user,delete_setup,'CI grinder','CI burrs',1,10,delete_calibration_a)
 RETURNING id INTO delete_calibration_b;
 INSERT INTO public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id)
 VALUES(keep_user,delete_setup,delete_setup_version,delete_calibration_b,delete_basket_version);
 INSERT INTO public.library_entries(owner_id,coffee_id)
 VALUES(keep_user,coffee) RETURNING id INTO delete_library;
 INSERT INTO public.workspace_coffees(owner_id,setup_id,setup_version_id,library_entry_id,basket_version_id)
 VALUES(keep_user,delete_setup,delete_setup_version,delete_library,delete_basket_version);
 INSERT INTO public.personal_recipe_families(owner_id,library_entry_id,style,estimator_version)
 VALUES(keep_user,delete_library,'Traditional','ci-account-delete')
 RETURNING id INTO delete_family;
 INSERT INTO public.shots(owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,
   personal_family_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,
   extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 VALUES(keep_user,delete_library,delete_setup,delete_setup_version,delete_basket_version,delete_calibration_b,
   delete_family,'Traditional',now(),18,36,27,5,2,3,3,3,2,'{}'::jsonb)
 RETURNING id INTO delete_shot;
 INSERT INTO public.recipe_preferences(owner_id,setup_id,setup_version_id,library_entry_id,style,
   current_family_id,reference_family_id,favorite_shot_id)
 VALUES(keep_user,delete_setup,delete_setup_version,delete_library,'Traditional',
   delete_family,delete_family,delete_shot);
 INSERT INTO public.account_preferences(owner_id,active_setup_id)
 VALUES(keep_user,delete_setup)
 ON CONFLICT(owner_id) DO UPDATE SET active_setup_id=excluded.active_setup_id;
 IF (SELECT equipment_snapshot->>'grinder_model' FROM public.shots WHERE id=delete_shot)<>'CI grinder'
 THEN RAISE EXCEPTION 'Composite deletion fixture did not capture real equipment snapshot'; END IF;
 -- An admitted ordinary member cannot preview, stage or call service deletion operations.
 PERFORM set_config('request.jwt.claim.sub',peer_user::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 blocked:=false;
 BEGIN PERFORM public.dic_admin_account_delete_preview(keep_user);
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Ordinary member saw account deletion preview'; END IF;
 blocked:=false;
 BEGIN PERFORM public.dic_admin_account_delete_request(keep_user,'keep','{}'::jsonb);
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Ordinary member staged deletion'; END IF;
 EXECUTE 'RESET ROLE';
 IF has_function_privilege('anon','public.dic_admin_account_delete_prepare(uuid,uuid)','execute')
 OR has_function_privilege('authenticated','public.dic_admin_account_delete_prepare(uuid,uuid)','execute')
 OR has_function_privilege('anon','public.dic_admin_account_delete_finish(uuid,uuid)','execute')
 OR has_function_privilege('authenticated','public.dic_admin_account_delete_finish(uuid,uuid)','execute')
 THEN RAISE EXCEPTION 'Browser role received Auth deletion privilege'; END IF;

 PERFORM set_config('request.jwt.claim.sub',admin::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 blocked:=false;
 BEGIN PERFORM public.dic_admin_account_delete_preview(admin);
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Protected admin account exposed to deletion'; END IF;
 -- Invitation-specific controls are retired; do not recreate or call them.
 IF to_regclass('private.beta_invites') IS NOT NULL
    OR to_regprocedure('public.dic_admin_issue_invite(text)') IS NOT NULL
    OR to_regprocedure('public.dic_admin_delete_invite(uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'Retired invitation APIs still exist'; END IF;
 impact:=public.dic_admin_account_delete_preview(keep_user);
 IF (impact->>'community_shots')::integer<>1 OR (impact->>'eligible_community_shots')::integer<>1
 THEN RAISE EXCEPTION 'Wrong Keep Community preview'; END IF;
 blocked:=false;
 BEGIN PERFORM public.dic_admin_account_delete_request(keep_user,'keep','{}'::jsonb);
 EXCEPTION WHEN SQLSTATE 'PT409' THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Accepted stale impact'; END IF;
 request:=public.dic_admin_account_delete_request(keep_user,'keep',impact);
 op_keep:=(request->>'operation_id')::uuid;
 IF op_keep IS NULL THEN RAISE EXCEPTION 'No Keep request operation'; END IF;
 EXECUTE 'RESET ROLE';

 EXECUTE 'SET LOCAL ROLE service_role';
 prepared:=public.dic_admin_account_delete_prepare(op_keep,admin);
 IF (prepared->>'phase')<>'prepared' OR (prepared->>'mode')<>'keep'
 THEN RAISE EXCEPTION 'Keep operation not prepared'; END IF;
 IF (SELECT enabled FROM private.beta_members WHERE owner_id=keep_user)
 THEN RAISE EXCEPTION 'Prepared account retained member access'; END IF;
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claim.sub',admin::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 blocked:=false;
 BEGIN PERFORM public.dic_admin_set_member_access(keep_user,true);
 EXCEPTION WHEN check_violation THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Restore Access re-enabled a member mid-deletion'; END IF;
 EXECUTE 'RESET ROLE';

 blocked:=false;
 BEGIN PERFORM public.dic_admin_account_delete_finish(op_keep,admin);
 EXCEPTION WHEN check_violation THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Finalization accepted existing Auth user'; END IF;
 EXECUTE 'RESET ROLE';
 DELETE FROM auth.users WHERE id=keep_user; -- disposable simulation of GoTrue admin.deleteUser
 IF EXISTS(SELECT 1 FROM public.coffee_submissions WHERE id=pending_member_submission)
 OR EXISTS(SELECT 1 FROM public.library_entries WHERE id=pending_member_library_entry)
 THEN RAISE EXCEPTION 'Pending personal submission/library not deleted'; END IF;
 IF EXISTS(SELECT 1 FROM public.coffee_submissions WHERE id=source_submission)
 THEN RAISE EXCEPTION 'Deleted user still has private submission'; END IF;
 -- Verify all owner-scoped records disappear atomically, despite the circular
 -- deferred setup version and favorite shot FKs and immediate composite FKs.
 IF EXISTS(SELECT 1 FROM public.setups WHERE id=delete_setup)
 OR EXISTS(SELECT 1 FROM public.setup_versions WHERE id=delete_setup_version)
 OR EXISTS(SELECT 1 FROM public.baskets WHERE id=delete_basket)
 OR EXISTS(SELECT 1 FROM public.basket_versions WHERE id=delete_basket_version)
 OR EXISTS(SELECT 1 FROM public.grinder_calibrations WHERE id IN (delete_calibration_a,delete_calibration_b))
 OR EXISTS(SELECT 1 FROM public.library_entries WHERE id=delete_library)
 OR EXISTS(SELECT 1 FROM public.personal_recipe_families WHERE id=delete_family)
 OR EXISTS(SELECT 1 FROM public.shots WHERE id=delete_shot)
 OR EXISTS(SELECT 1 FROM public.setup_preferences WHERE owner_id=keep_user)
 OR EXISTS(SELECT 1 FROM public.recipe_preferences WHERE owner_id=keep_user)
 OR EXISTS(SELECT 1 FROM public.workspace_coffees WHERE owner_id=keep_user)
 OR EXISTS(SELECT 1 FROM public.account_preferences WHERE owner_id=keep_user)
 THEN RAISE EXCEPTION 'Auth cascade retained composite personal shot/equipment/preference records'; END IF;
 IF NOT EXISTS(SELECT 1 FROM private.dic_coffee_first_entry
   WHERE coffee_id=coffee AND first_submission_id IS NULL AND primary_name='Member deletion CI coffee')
 THEN RAISE EXCEPTION 'Canonical first-entry provenance lost or retains deleted submission'; END IF;
 IF NOT EXISTS(SELECT 1 FROM private.dic_coffee_audit
   WHERE coffee_id=coffee AND submission_id IS NULL AND event_kind='admin_approved')
 THEN RAISE EXCEPTION 'Review audit lost or retains deleted submission'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.coffees WHERE id=coffee AND verification_state='verified')
 THEN RAISE EXCEPTION 'Canonical approved coffee was deleted with member'; END IF;
 PERFORM set_config('request.jwt.claim.sub',admin::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF NOT (public.dic_admin_access_overview()->'pending_deletions') @>
  jsonb_build_array(jsonb_build_object('id',op_keep,'community_mode','keep'))
 THEN RAISE EXCEPTION 'Interrupted operation not visible after Auth deletion'; END IF;
 EXECUTE 'RESET ROLE';
 EXECUTE 'SET LOCAL ROLE service_role';
 finished:=public.dic_admin_account_delete_finish(op_keep,admin);
 IF (finished->>'completed')<>'true' OR (finished->>'community_removed')::integer<>0
 THEN RAISE EXCEPTION 'Keep mode did not complete'; END IF;
 IF (public.dic_admin_account_delete_finish(op_keep,admin)->>'retry')<>'true'
 THEN RAISE EXCEPTION 'Completed Keep operation not idempotent'; END IF;
 IF EXISTS(SELECT 1 FROM private.dic_admin_account_delete_operations o
  WHERE o.id=op_keep AND (o.expected_impact ? 'email' OR o.expected_impact ? 'member_id'))
 THEN RAISE EXCEPTION 'Completed deletion receipt retained identifying email/member ID'; END IF;
 IF EXISTS(SELECT 1 FROM private.dic_admin_account_delete_operations o
  WHERE o.id=op_keep AND cardinality(o.contributor_ids)<>0)
 THEN RAISE EXCEPTION 'Keep-mode receipt retained a contributor-to-deleted-user link'; END IF;
 EXECUTE 'RESET ROLE';
 IF NOT EXISTS(SELECT 1 FROM public.community_shots WHERE id=community_keep AND quality_state='eligible')
 OR NOT EXISTS(SELECT 1 FROM private.contribution_links l
     WHERE l.community_shot_id=community_keep AND l.contributor_id=ckeep AND l.shot_id IS NULL)
 OR EXISTS(SELECT 1 FROM private.contributors WHERE id=ckeep AND owner_id IS NOT NULL)
 THEN RAISE EXCEPTION 'Keep mode did not preserve detached balanced Community contribution'; END IF;

 PERFORM set_config('request.jwt.claim.sub',admin::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 impact:=public.dic_admin_account_delete_preview(remove_user);
 request:=public.dic_admin_account_delete_request(remove_user,'remove',impact);
 op_remove:=(request->>'operation_id')::uuid;
 EXECUTE 'RESET ROLE';
 EXECUTE 'SET LOCAL ROLE service_role';
 prepared:=public.dic_admin_account_delete_prepare(op_remove,admin);
 IF (prepared->>'mode')<>'remove' THEN RAISE EXCEPTION 'Remove mode not prepared'; END IF;
 EXECUTE 'RESET ROLE';
 DELETE FROM auth.users WHERE id=remove_user; -- disposable Auth simulation
 EXECUTE 'SET LOCAL ROLE service_role';
 finished:=public.dic_admin_account_delete_finish(op_remove,admin);
 IF (finished->>'completed')<>'true' OR (finished->>'community_removed')::integer<>1
 THEN RAISE EXCEPTION 'Remove Community result inaccurate'; END IF;
 IF EXISTS(SELECT 1 FROM private.dic_admin_account_delete_operations o
  WHERE o.id=op_remove AND (cardinality(o.contributor_ids)<>0
   OR o.expected_impact ? 'email' OR o.expected_impact ? 'member_id'))
 THEN RAISE EXCEPTION 'Remove-mode completed receipt retained identifying linkage'; END IF;
 EXECUTE 'RESET ROLE';
 IF EXISTS(SELECT 1 FROM public.community_shots WHERE id=community_remove)
 OR EXISTS(SELECT 1 FROM private.contribution_links WHERE community_shot_id=community_remove)
 OR EXISTS(SELECT 1 FROM private.contributors WHERE id=cremove)
 THEN RAISE EXCEPTION 'Remove mode retained the deleted member contribution'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=peer_user)
 OR NOT EXISTS(SELECT 1 FROM public.community_shots WHERE id=community_peer)
 OR NOT EXISTS(SELECT 1 FROM private.contribution_links WHERE community_shot_id=community_peer)
 THEN RAISE EXCEPTION 'Another member/community contribution was changed'; END IF;

 -- #509: a previously authorized admin may be deleted out-of-band while
 -- the deletion request remains open (actor_id FK ON DELETE SET NULL).
 -- Another admin must receive a conflict, never a misleading retry token.
 INSERT INTO private.dic_admin_account_delete_operations
   (actor_id,target_id,community_mode,expected_impact,phase)
 VALUES (NULL,peer_user,'keep','{}'::jsonb,'requested');
 PERFORM set_config('request.jwt.claim.sub',admin::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 blocked:=false;
 BEGIN
  PERFORM public.dic_admin_account_delete_request(peer_user,'keep','{}'::jsonb);
 EXCEPTION WHEN check_violation THEN
  IF SQLERRM='Another deletion is already in progress.' THEN
   blocked:=true;
  ELSE
   RAISE;
  END IF;
 END;
 EXECUTE 'RESET ROLE';
 IF NOT blocked THEN
  RAISE EXCEPTION 'Orphan actor returned retry token to unrelated admin';
 END IF;

END $test$;
SELECT 'PASS: account delete auth/admin guards, stale impact, retry, Keep/Remove Community, unrelated member integrity, no legacy invitation paths' AS result;
ROLLBACK;
