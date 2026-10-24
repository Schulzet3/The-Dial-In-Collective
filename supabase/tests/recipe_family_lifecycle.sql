-- Issue #10. Real SQL/JWT-path simulation in disposable PostgreSQL dic_ci ONLY.
-- This test creates an admitted synthetic member, two eligible same-coffee/style
-- families on the same setup, switches favorite through authenticated RPC,
-- edits/hides/restores history, checks privacy, and rolls back everything.
begin;
do $issue10$
declare
 owner uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid();
 sid uuid:=gen_random_uuid(); vid uuid:=gen_random_uuid();
 gid uuid:=gen_random_uuid(); bid uuid:=gen_random_uuid(); bvid uuid:=gen_random_uuid();
 cid uuid; lid uuid; a uuid; b uuid; c uuid; d uuid;
 short_id uuid; long_id uuid; rp public.recipe_preferences;
 response jsonb; n integer; state jsonb; sh public.shots;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci database required'; end if;
 insert into auth.users(id,aud,role,email,email_confirmed_at)
  values(owner,'authenticated','authenticated',owner::text||'@example.invalid',now()),
        (stranger,'authenticated','authenticated',stranger::text||'@example.invalid',now());
 insert into private.beta_members(owner_id,enabled,admitted_at)
  values(owner,true,now()),(stranger,true,now())
  on conflict(owner_id) do update set enabled=true,admitted_at=now();
 insert into public.setups(id,owner_id,name) values(sid,owner,'Recipe lifecycle test setup');
 insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model)
  values(vid,owner,sid,'Fixture machine','Fixture grinder');
 update public.setups set active_version_id=vid where id=sid;
 insert into public.grinder_calibrations(id,owner_id,setup_id,grinder_model,finest_setting,coarsest_setting)
  values(gid,owner,sid,'Fixture grinder',0,10);
 insert into public.baskets(id,owner_id,setup_id,name) values(bid,owner,sid,'Fixture basket');
 insert into public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g)
  values(bvid,owner,sid,bid,18);
 insert into public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id)
  values(owner,sid,vid,gid,bvid);
 insert into public.coffees(name,roaster,verification_state)
  values('Issue 10 synthetic coffee','CI fixture only','verified') returning id into cid;
 insert into public.library_entries(owner_id,coffee_id)
  values(owner,cid) returning id into lid;
 -- Two all-green observations at 1:2 and two at 1:3.
 insert into public.shots(owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,
   calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,temperature_c,
   extraction,body,clarity,sweetness,astringency,equipment_snapshot)
  values(owner,lid,sid,vid,bvid,gid,'Turbo',now()-interval '4 hour',18,36,24,2,92,
   3,3,5,5,1,'{}') returning id into a;
 perform private.classify_personal_shot(a);
 insert into public.shots(owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,
   calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,temperature_c,
   extraction,body,clarity,sweetness,astringency,equipment_snapshot)
  values(owner,lid,sid,vid,bvid,gid,'Turbo',now()-interval '3 hour',18,36,44,2.5,95,
   3,3,5,5,1,'{}') returning id into b;
 perform private.classify_personal_shot(b);
 insert into public.shots(owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,
   calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,temperature_c,
   extraction,body,clarity,sweetness,astringency,equipment_snapshot)
  values(owner,lid,sid,vid,bvid,gid,'Turbo',now()-interval '2 hour',18,54,20,3,92,
   3,3,5,5,1,'{}') returning id into c;
 perform private.classify_personal_shot(c);
 insert into public.shots(owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,
   calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,temperature_c,
   extraction,body,clarity,sweetness,astringency,equipment_snapshot)
  values(owner,lid,sid,vid,bvid,gid,'Turbo',now()-interval '1 hour',18,54,22,3.1,92,
   3,3,5,5,1,'{}') returning id into d;
 perform private.classify_personal_shot(d);
 select personal_family_id into short_id from public.shots where id=a;
 select personal_family_id into long_id from public.shots where id=c;
 if short_id=long_id or short_id is null or long_id is null then raise exception 'Distinct ratios were merged'; end if;
 select count(*) into n from public.personal_recipe_families
  where owner_id=owner and library_entry_id=lid and evidence_state='personally_confirmed';
 if n<>2 then raise exception 'Two confirmed eligible families expected, got %',n; end if;
 if not (select coalesce((statistics->>'sameRatioNonRatioVariation')::boolean,false)
   from public.personal_recipe_families where id=short_id) then
   raise exception 'Same-ratio non-ratio variation missing'; end if;
 if (select statistics->>'nonRatioSignificance' from public.personal_recipe_families where id=short_id)<>'unproven' then
   raise exception 'Invented certainty about time/temperature recipe significance'; end if;
 -- Owner authenticated client RPC must select exact preferred shot, not merely a family.
 select * into rp from public.recipe_preferences where owner_id=owner and setup_version_id=vid
  and library_entry_id=lid and style='Turbo';
 perform set_config('request.jwt.claim.sub',owner::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 response:=public.dic_mutate(gen_random_uuid(),'make_current',
   jsonb_build_object('shot_id',a,'expected_revision',rp.revision));
 if response->>'ok'<>'true' then raise exception 'Authenticated Make Current failed: %',response; end if;
 execute 'reset role';
 select * into rp from public.recipe_preferences where owner_id=owner and setup_version_id=vid
  and library_entry_id=lid and style='Turbo';
 if rp.current_family_id<>short_id or rp.favorite_shot_id<>a then raise exception 'Explicit owner favorite not recorded'; end if;
 -- Correct the exact favorite shot into the other established family.
 update public.shots set yield_g=54 where id=a;
 perform private.classify_personal_shot(a);
 select * into rp from public.recipe_preferences where owner_id=owner and setup_version_id=vid
  and library_entry_id=lid and style='Turbo';
 if rp.current_family_id<>long_id or rp.favorite_shot_id<>a then
  raise exception 'Favorite did not follow corrected shot into other family'; end if;
 -- Correct it to non-green; the favorite must not remain locked.
 update public.shots set extraction=1 where id=a;
 perform private.classify_personal_shot(a);
 select * into rp from public.recipe_preferences where owner_id=owner and setup_version_id=vid
  and library_entry_id=lid and style='Turbo';
 if rp.favorite_shot_id is not null then raise exception 'Non-green favorite remained locked'; end if;
 if (select evidence_state from public.personal_recipe_families where id=short_id)<>'candidate' then
  raise exception 'Family with one surviving success must become candidate'; end if;
 -- A legacy hidden shot retains its own provenance while no longer supporting Current.
 update public.shots set hidden_at=now() where id=b;
 perform private.classify_personal_shot(b);
 if (select evidence_state from public.personal_recipe_families where id=short_id)<>'retired' then
  raise exception 'Family with no visible green successes must retire'; end if;
 if (select personal_family_id from public.shots where id=b)<>short_id then
  raise exception 'Hidden historical shot family provenance changed'; end if;
 if (select count(*) from public.shots where owner_id=owner)<>4 then raise exception 'Historical shots missing'; end if;
 -- A second admitted account must not see this owner's real SQL test history.
 perform set_config('request.jwt.claim.sub',stranger::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',stranger,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 state:=public.dic_read_personal_state();
 if jsonb_array_length(state->'shots')<>0 or jsonb_array_length(state->'families')<>0 then
  raise exception 'Cross-account family/shot privacy leak'; end if;
 execute 'reset role';
end $issue10$;
select 'PASS: isolated admitted account two-family authenticated selection, correction, retirement, significance and privacy; rollback' as result;
rollback;
