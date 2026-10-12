-- Run only against a development/test Supabase database as the migration role.
-- psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security_foundation.sql
-- No secrets are part of this script. Generated fixture users send no emails.
-- The nested exception rolls back all fixtures; the outer transaction also rolls back.
begin;
do $test$
declare
 u1 uuid:=gen_random_uuid(); u2 uuid:=gen_random_uuid(); pending_user uuid:=gen_random_uuid(); admin_user uuid:=gen_random_uuid();
 s1 uuid:=gen_random_uuid(); s2 uuid:=gen_random_uuid(); s3 uuid:=gen_random_uuid();
 v1 uuid:=gen_random_uuid(); v2 uuid:=gen_random_uuid(); v3 uuid:=gen_random_uuid();
 b1 uuid:=gen_random_uuid(); b2 uuid:=gen_random_uuid(); b3 uuid:=gen_random_uuid();
 bv1 uuid:=gen_random_uuid(); bv2 uuid:=gen_random_uuid(); bv3 uuid:=gen_random_uuid();
 g1 uuid:=gen_random_uuid(); g2 uuid:=gen_random_uuid(); g3 uuid:=gen_random_uuid(); bad_cal uuid:=gen_random_uuid();
 c1 uuid:=gen_random_uuid(); c2 uuid:=gen_random_uuid(); cp uuid:=gen_random_uuid(); grp uuid:=gen_random_uuid();
 l1 uuid:=gen_random_uuid(); l2 uuid:=gen_random_uuid(); sh1 uuid:=gen_random_uuid(); sh2 uuid:=gen_random_uuid(); sh3 uuid:=gen_random_uuid();
 family uuid:=gen_random_uuid(); wrong_family uuid:=gen_random_uuid(); sub1 uuid:=gen_random_uuid(); review1 uuid:=gen_random_uuid();
 community1 uuid; community2 uuid; contributor1 uuid; old_revision bigint; affected bigint; failed boolean;
 results jsonb:='[]'; before_auth bigint; before_coffees bigint;
begin
 select count(*) into before_auth from auth.users;
 select count(*) into before_coffees from public.coffees;
 begin
  if exists(select 1 from pg_tables where schemaname in ('public','private') and not rowsecurity) then raise exception 'RLS coverage incomplete'; end if;
  results:=results||jsonb_build_array('01 all application and internal tables have RLS');
  if exists(select 1 from information_schema.role_table_grants where table_schema in ('public','private') and grantee='anon') then raise exception 'Anonymous table grants'; end if;
  results:=results||jsonb_build_array('02 no anonymous table privileges');
  if to_regprocedure('public.rls_auto_enable()') is not null and (has_function_privilege('anon','public.rls_auto_enable()','EXECUTE') or has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE')) then raise exception 'Internal event function executable by clients'; end if;
  results:=results||jsonb_build_array('03 internal RLS event function not client callable');
  if exists(select 1 from pg_event_trigger where evtname='ensure_rls' and evtenabled='D') then raise exception 'RLS auto-enable trigger was disabled'; end if;
  results:=results||jsonb_build_array('04 RLS auto-enable trigger remains enabled');

  insert into auth.users(id,aud,role,email,raw_user_meta_data) values
   (u1,'authenticated','authenticated',u1::text||'@example.invalid','{"admin":true,"enabled":true}'),
   (u2,'authenticated','authenticated',u2::text||'@example.invalid','{}'),
   (pending_user,'authenticated','authenticated',pending_user::text||'@example.invalid','{}'),
   (admin_user,'authenticated','authenticated',admin_user::text||'@example.invalid','{}');
  if (select count(*) from public.account_preferences where owner_id in (u1,u2,pending_user,admin_user))<>4 then raise exception 'Account bootstrap failed'; end if;
  results:=results||jsonb_build_array('05 auth trigger creates private preferences');
  if exists(select 1 from private.beta_members where owner_id in (u1,u2,pending_user,admin_user) and enabled) or exists(select 1 from private.app_admins where owner_id in (u1,u2,pending_user,admin_user)) then raise exception 'Automatic privilege escalation'; end if;
  results:=results||jsonb_build_array('06 new accounts pending; metadata cannot grant membership or admin');
  update private.beta_members set enabled=true,admitted_at=now() where owner_id in (u1,u2,admin_user);
  insert into private.app_admins(owner_id) values(admin_user);
  select id into contributor1 from private.contributors where owner_id=u1;
  if contributor1 is null then raise exception 'Contributor bootstrap failed'; end if;
  results:=results||jsonb_build_array('07 contributor mapping created privately');

  insert into public.coffee_groups(id,label) values(grp,'Test releases');
  insert into public.coffees(id,group_id,name,roaster,verification_state) values
   (c1,grp,'Test Coffee One','Fixture Roaster','verified'),(c2,grp,'Test Coffee Two','Fixture Roaster','verified'),(cp,grp,'Pending Coffee','Fixture Roaster','pending');
  insert into public.coffee_sources(coffee_id,source_url,source_kind) values
   (c1,'https://example.invalid/reused-product','roaster_page'),(c2,'https://example.invalid/reused-product','roaster_page'),(cp,'https://example.invalid/pending','roaster_page');
  results:=results||jsonb_build_array('08 reused URL can reference distinct releases without merging');
  insert into public.library_entries(id,owner_id,coffee_id) values(l1,u1,c1),(l2,u2,c1);
  insert into public.setups(id,owner_id,name) values(s1,u1,'Test Home'),(s2,u1,'Test Office'),(s3,u2,'Other Home');
  insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model,burr_set) values
   (v1,u1,s1,'M1','G1','B1'),(v2,u1,s2,'M2','G2','B2'),(v3,u2,s3,'M3','G3','B3');
  insert into public.grinder_calibrations(id,owner_id,setup_id,grinder_model,burr_set,finest_setting,coarsest_setting) values
   (g1,u1,s1,'G1','B1',0,5),(g2,u1,s2,'G2','B2',0,5),(g3,u2,s3,'G3','B3',0,5),(bad_cal,u1,s1,'G1','Different Burrs',0,5);
  insert into public.baskets(id,owner_id,setup_id,name) values(b1,u1,s1,'18 g'),(b2,u1,s2,'20 g'),(b3,u2,s3,'18 g');
  insert into public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g,model) values
   (bv1,u1,s1,b1,18,'Basket A'),(bv2,u1,s2,b2,20,'Basket B'),(bv3,u2,s3,b3,18,'Basket C');
  insert into public.workspace_state(owner_id,setup_id,setup_version_id) values(u1,s1,v1),(u2,s3,v3);
  insert into public.shots(id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,extraction,body,clarity,sweetness,astringency,equipment_snapshot) values
   (sh1,u1,l1,s1,v1,bv1,g1,'Turbo',now(),18,50,100,1,3,3,5,5,1,'{"machine_model":"Forged","notes":"DO NOT PUBLISH"}'),
   (sh2,u1,l1,s1,v1,bv1,g1,'Traditional',now(),18,40,30,1,3,3,4,5,1,'{}'),
   (sh3,u2,l2,s3,v3,bv3,g3,'Turbo',now(),18,50,16,1,3,3,5,5,1,'{}');
  select community_shot_id into community1 from private.contribution_links where shot_id=sh1;
  select community_shot_id into community2 from private.contribution_links where shot_id=sh3;
  if not(select is_dialed_in from public.shots where id=sh1) then raise exception 'Time veto incorrectly applied'; end if;
  results:=results||jsonb_build_array('09 all-green Turbo remains dialed in at 100 seconds');
  if (select equipment_snapshot->>'machine_model' from public.shots where id=sh1)<>'M1' or (select equipment_snapshot ? 'notes' from public.shots where id=sh1) then raise exception 'Snapshot not authoritative'; end if;
  results:=results||jsonb_build_array('10 snapshot built from recorded versions, not client JSON');
  if exists(select 1 from private.contribution_links where shot_id=sh2) then raise exception 'Non-green shot projected'; end if;
  results:=results||jsonb_build_array('11 non-green shot is excluded from community projection');
  if community1 is null or (select quality_state from public.community_shots where id=community1)<>'pending_quality' then raise exception 'Premature publication'; end if;
  results:=results||jsonb_build_array('12 green projection held pending authoritative quality validation');
  if (select feed_mode from public.shots where id=sh1)<>'unknown' then raise exception 'Historical condition fabricated'; end if;
  results:=results||jsonb_build_array('13 unspecified feed condition remains unknown');
  insert into public.shot_notes(owner_id,shot_id,notes) values(u1,sh1,'PRIVATE ONE'),(u2,sh3,'PRIVATE TWO');
  insert into public.recipe_families(id,coffee_id,style,ratio_low,ratio_center,ratio_high,estimator_version) values
   (family,c1,'Turbo',2.7,2.8,2.9,'test-only'),(wrong_family,c2,'Turbo',2.7,2.8,2.9,'test-only');
  update public.community_shots set family_id=family where id=community1;
  begin update public.community_shots set family_id=wrong_family where id=community1; raise exception 'Wrong coffee family accepted'; exception when foreign_key_violation then null; end;
  results:=results||jsonb_build_array('14 community family must match coffee and style');

  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',pending_user::text,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if private.is_member() or exists(select 1 from public.account_preferences) or exists(select 1 from public.coffees) then raise exception 'Pending user has data access'; end if;
  results:=results||jsonb_build_array('15 pending account cannot read private or community data');
  begin insert into public.coffee_submissions(proposed_data) values('{"name":"Blocked"}'); raise exception 'Pending submission accepted'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('16 pending account cannot submit catalog changes');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u1::text,'role','authenticated','user_metadata',jsonb_build_object('admin',true))::text,true);
  if not private.is_member() or private.is_admin() then raise exception 'Member role check failed'; end if;
  if (select count(*) from public.account_preferences)<>1 or not exists(select 1 from public.account_preferences where owner_id=u1) then raise exception 'Preference isolation failed'; end if;
  results:=results||jsonb_build_array('17 admitted user sees only their own preferences');
  select revision into old_revision from public.account_preferences where owner_id=u1;
  update public.account_preferences set theme='dark' where owner_id=u1;
  if (select revision from public.account_preferences where owner_id=u1)<>old_revision+1 then raise exception 'Revision not incremented'; end if;
  results:=results||jsonb_build_array('18 allowed preference update increments server revision');
  update public.account_preferences set theme='dark' where owner_id=u2; get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Other user preferences changed'; end if;
  results:=results||jsonb_build_array('19 cross-user preference update affects zero rows');
  begin update public.account_preferences set revision=999 where owner_id=u1; raise exception 'Client forged revision'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('20 client cannot set server revision');
  begin insert into private.app_admins(owner_id) values(u1); raise exception 'Self-promotion allowed'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('21 client cannot grant itself admin');
  begin perform count(*) from private.contributors; raise exception 'Contributor identities visible'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('22 contributor/account mappings are inaccessible');
  if (select count(*) from public.coffees where id in(c1,c2,cp))<>2 or exists(select 1 from public.coffee_sources where coffee_id=cp) then raise exception 'Unverified catalog visible'; end if;
  results:=results||jsonb_build_array('23 members see verified coffee facts and evidence only');
  insert into public.coffee_submissions(id,proposed_data,source_url,canonical_coffee_id,base_coffee_revision) values(sub1,'{"name":"Corrected name"}','https://example.invalid/proposal',c1,1);
  if not exists(select 1 from public.coffee_submissions where id=sub1 and owner_id=u1 and status='pending') then raise exception 'Submission ownership failed'; end if;
  results:=results||jsonb_build_array('24 member can create owned pending evidence submission');
  begin insert into public.coffee_submissions(owner_id,proposed_data) values(u2,'{}'); raise exception 'Forged submission ownership'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('25 cannot submit on another account');
  begin insert into public.coffee_submissions(proposed_data,status) values('{}','approved'); raise exception 'Self-approved submission'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('26 member cannot set submission approval status');
  begin update public.coffees set name='Unauthorized' where id=c1; raise exception 'Canonical overwrite allowed'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('27 canonical coffee overwrite blocked');
  if (select count(*) from public.library_entries)<>1 or (select count(*) from public.setups)<>2 then raise exception 'Library/setup isolation failed'; end if;
  results:=results||jsonb_build_array('28 library and workspaces are owner-isolated');
  if (select count(*) from public.shots)<>2 or exists(select 1 from public.shots where id=sh3) then raise exception 'Raw shot privacy failed'; end if;
  results:=results||jsonb_build_array('29 own green and non-green shots readable; other raw shots hidden');
  if (select count(*) from public.shot_notes)<>1 or exists(select 1 from public.shot_notes where shot_id=sh3) then raise exception 'Private note leak'; end if;
  results:=results||jsonb_build_array('30 shot notes remain owner-only');
  if exists(select 1 from public.community_shots where id in(community1,community2)) then raise exception 'Pending projection visible'; end if;
  results:=results||jsonb_build_array('31 pending community projections not readable');
  begin update public.community_shots set quality_state='eligible' where id=community1; raise exception 'Client published projection'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('32 community eligibility cannot be set by client');
  begin update public.shots set yield_g=55 where id=sh1; raise exception 'Direct shot edit bypassed API'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('33 raw shot mutation requires controlled API');
  begin update public.workspace_state set current_library_entry_id=l1 where setup_id=s1; raise exception 'Direct pin bypassed log operation'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('34 direct current-coffee state mutation blocked');
  execute 'reset role';

  update public.community_shots set quality_state='eligible' where id=community1;
  update public.community_shots set quality_state='held' where id=community2;
  insert into public.admin_reviews(id,submission_id,reviewer_id,action,reason) values(review1,sub1,admin_user,'hold','Test evidence review');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u2::text,'role','authenticated')::text,true); execute 'set local role authenticated';
  if (select count(*) from public.community_shots where id in(community1,community2))<>1 or not exists(select 1 from public.community_shots where id=community1) then raise exception 'Eligible/held read policy incorrect'; end if;
  results:=results||jsonb_build_array('35 another member sees eligible shared shot, not held shot');
  if exists(select 1 from public.coffee_submissions where id=sub1) or exists(select 1 from public.admin_reviews where id=review1) then raise exception 'Admin/submission privacy failed'; end if;
  results:=results||jsonb_build_array('36 other members cannot read proposals or admin reviews');
  begin perform count(*) from private.contribution_links; raise exception 'Raw-community link leaked'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('37 raw-to-community links not exposed');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_user::text,'role','authenticated')::text,true);
  if not private.is_admin() or not exists(select 1 from public.admin_reviews where id=review1) or not exists(select 1 from public.coffee_submissions where id=sub1) then raise exception 'Admin review access absent'; end if;
  results:=results||jsonb_build_array('38 admitted admin can review submissions and decisions');
  if exists(select 1 from public.shot_notes where owner_id in(u1,u2)) or exists(select 1 from public.shots where owner_id in(u1,u2)) then raise exception 'Admin unexpectedly sees private history'; end if;
  results:=results||jsonb_build_array('39 admin review role does not expose personal notes/history');
  execute 'set local role anon';
  begin perform count(*) from public.coffees; raise exception 'Anonymous read succeeded'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('40 anonymous catalog read denied');
  begin perform count(*) from public.account_preferences; raise exception 'Anonymous private read succeeded'; exception when insufficient_privilege then null; end;
  results:=results||jsonb_build_array('41 anonymous account read denied');
  execute 'reset role';

  begin update public.basket_versions set basket_dose_g=20 where id=bv1; raise exception 'Historical basket changed'; exception when check_violation then null; end;
  results:=results||jsonb_build_array('42 recorded basket version immutable');
  begin update public.setup_versions set grinder_model='Changed' where id=v1; raise exception 'Historical setup changed'; exception when check_violation then null; end;
  results:=results||jsonb_build_array('43 recorded hardware version immutable');
  begin update public.grinder_calibrations set finest_setting=1 where id=g1; raise exception 'Historical calibration changed'; exception when check_violation then null; end;
  results:=results||jsonb_build_array('44 recorded grinder calibration immutable');
  begin update public.shots set basket_version_id=bv2 where id=sh1; raise exception 'Shot provenance changed'; exception when check_violation then null; end;
  results:=results||jsonb_build_array('45 old shot equipment provenance cannot be rewritten');
  begin insert into public.basket_versions(owner_id,setup_id,basket_id,basket_dose_g) values(u2,s3,b1,18); raise exception 'Cross-account basket accepted'; exception when foreign_key_violation then null; end;
  results:=results||jsonb_build_array('46 composite foreign key rejects another owner basket');
  begin insert into public.setup_preferences(owner_id,setup_id,setup_version_id,default_basket_version_id) values(u1,s1,v1,bv2); raise exception 'Cross-setup basket accepted'; exception when foreign_key_violation then null; end;
  results:=results||jsonb_build_array('47 same-owner basket from wrong setup rejected');
  begin insert into public.shots(owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
   values(u1,l1,s1,v1,bv1,bad_cal,'Turbo',now(),18,50,15,1,3,3,5,5,1,'{}'); raise exception 'Wrong burr calibration accepted'; exception when check_violation then null; end;
  results:=results||jsonb_build_array('48 calibration must match grinder and burr hardware');
  begin insert into public.shots(owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
   values(u1,l1,s1,v1,bv1,g1,'Turbo',now(),18,50,15,3,3,5,5,1,'{}'); raise exception 'New shot accepted without grind'; exception when check_violation then null; end;
  results:=results||jsonb_build_array('49 new shot requires grind setting');
  insert into public.shots(owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,extraction,body,clarity,sweetness,astringency,equipment_snapshot,legacy_import)
   values(u1,l1,s1,v1,bv1,g1,'Turbo',now(),18,50,15,3,3,3,4,1,'{}',true);
  results:=results||jsonb_build_array('50 legacy shot may retain missing grind without fabrication');
  update public.shots set dose_g=20.5,yield_g=55 where id=sh1;
  if (select count(*) from private.contribution_links where shot_id=sh1)<>1 or (select dose_g from public.community_shots where id=community1)<>20.5 then raise exception 'Corrected projection duplication'; end if;
  results:=results||jsonb_build_array('51 Basket Dose +/-1 g is not hard-blocked by database');
  if (select quality_state from public.community_shots where id=community1)<>'pending_quality' then raise exception 'Edited contribution not revalidated'; end if;
  results:=results||jsonb_build_array('52 corrected green shot replaces projection and returns to validation');
  update public.community_shots set quality_state='eligible' where id=community1;
  update public.shots set clarity=4 where id=sh1;
  if (select is_dialed_in from public.shots where id=sh1) or (select quality_state from public.community_shots where id=community1)<>'withdrawn' then raise exception 'Non-green edit still eligible'; end if;
  results:=results||jsonb_build_array('53 non-green edit withdraws prior shared contribution');
  update public.shots set clarity=5 where id=sh1;
  if (select quality_state from public.community_shots where id=community1)<>'pending_quality' or (select count(*) from private.contribution_links where shot_id=sh1)<>1 then raise exception 'Restored green contribution duplicated'; end if;
  results:=results||jsonb_build_array('54 restored green shot reuses same contribution identity');
  update public.community_shots set quality_state='eligible' where id=community1;
  update public.shots set hidden_at=now() where id=sh1;
  if (select quality_state from public.community_shots where id=community1)<>'eligible' then raise exception 'Hiding history removed good shared data'; end if;
  results:=results||jsonb_build_array('55 hiding personal shot does not withdraw community evidence');
  if (select count(*) from private.shot_audit where shot_id=sh1)<5 then raise exception 'Shot audit incomplete'; end if;
  results:=results||jsonb_build_array('56 shot creation and edits have internal audit trail');
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='community_shots' and column_name in ('notes','owner_id','shot_id','contributor_id','email','equipment_snapshot','tasting_preferences','setup_name')) then raise exception 'Private fields in community schema'; end if;
  results:=results||jsonb_build_array('57 community projection has no private identity or note fields');
  update private.beta_members set enabled=false where owner_id=u2;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u2::text,'role','authenticated')::text,true); execute 'set local role authenticated';
  if exists(select 1 from public.shots) or exists(select 1 from public.coffees) or exists(select 1 from public.community_shots) then raise exception 'Revoked member retains data access'; end if;
  results:=results||jsonb_build_array('58 membership revocation immediately removes application access');
  execute 'reset role';
  delete from auth.users where id=u1;
  if exists(select 1 from public.shots where owner_id=u1) or exists(select 1 from public.shot_notes where owner_id=u1) or exists(select 1 from private.shot_audit where owner_id=u1) then raise exception 'Personal data not removed on account deletion'; end if;
  results:=results||jsonb_build_array('59 account deletion removes linked private history');
  if not exists(select 1 from public.community_shots where id=community1 and quality_state='eligible') or not exists(select 1 from private.contributors where id=contributor1 and owner_id is null) or not exists(select 1 from private.contribution_links where community_shot_id=community1 and shot_id is null) then raise exception 'Detached community retention failed'; end if;
  results:=results||jsonb_build_array('60 account deletion detaches identity while retaining shared evidence');
  raise exception using errcode='Z0001',message='ROLLBACK_TEST_FIXTURES';
 exception when sqlstate 'Z0001' then null;
 end;
 if (select count(*) from auth.users)<>before_auth or (select count(*) from public.coffees)<>before_coffees then raise exception 'Test fixtures were not rolled back'; end if;
 perform set_config('dic.test_results',jsonb_build_object('status','passed','checks',jsonb_array_length(results),'tests',results,'fixtures_rolled_back',true)::text,true);
end $test$;
select current_setting('dic.test_results')::jsonb as test_results;
rollback;
