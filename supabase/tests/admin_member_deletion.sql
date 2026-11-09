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
 impact jsonb; request jsonb; prepared jsonb; finished jsonb; invite jsonb;
 op_keep uuid; op_remove uuid; code_id uuid;
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
 -- An admitted ordinary member cannot preview, stage, hide invites or call service operations.
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
 invite:=public.dic_admin_issue_invite('One-time delete control');
 code_id:=(invite->>'id')::uuid;
 IF (public.dic_admin_delete_invite(code_id)->>'deleted')<>'true'
 THEN RAISE EXCEPTION 'Delete Code refused'; END IF;
 IF (public.dic_admin_delete_invite(code_id)->>'already_deleted')<>'true'
 THEN RAISE EXCEPTION 'Delete Code not idempotent'; END IF;
 IF (public.dic_admin_records('invites',0,50)->'items') @> jsonb_build_array(jsonb_build_object('id',code_id))
 THEN RAISE EXCEPTION 'Deleted invite still listed'; END IF;
 IF (public.dic_admin_access_overview()->'invites') @> jsonb_build_array(jsonb_build_object('id',code_id))
 THEN RAISE EXCEPTION 'Deleted invite still in overview'; END IF;
 IF (public.dic_admin_search_records('invites','One-time delete control',0,50)->>'total')::integer<>0
 THEN RAISE EXCEPTION 'Deleted invite appears in search'; END IF;
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
 IF NOT EXISTS(SELECT 1 FROM private.beta_invites
   WHERE id=code_id AND deleted_at IS NOT NULL AND revoked_at IS NOT NULL)
 OR (SELECT count(*) FROM private.dic_admin_invite_delete_receipts WHERE invite_id=code_id)<>1
 THEN RAISE EXCEPTION 'Invite was not revoked and audited before hiding'; END IF;
END $test$;
SELECT 'PASS: Admin Delete Code revokes/hides with audit; auth/admin guards, stale impact, retry, Keep/Remove Community, unrelated member integrity' AS result;
ROLLBACK;
