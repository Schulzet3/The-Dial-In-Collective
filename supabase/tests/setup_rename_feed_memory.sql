-- Read-write role/isolation tests. The entire fixture is rolled back.
-- Never execute this outside a controlled administrative test connection.
begin;
do $test$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
 home uuid:=gen_random_uuid(); office uuid:=gen_random_uuid(); otherhome uuid:=gen_random_uuid();
 hv uuid:=gen_random_uuid(); ov uuid:=gen_random_uuid();
 cal1 uuid:=gen_random_uuid(); cal2 uuid:=gen_random_uuid();
 basket1 uuid:=gen_random_uuid();basket2 uuid:=gen_random_uuid();bv1 uuid:=gen_random_uuid();bv2 uuid:=gen_random_uuid();
 coffee uuid:=gen_random_uuid(); grp uuid:=gen_random_uuid(); lib uuid:=gen_random_uuid();
 mid uuid:=gen_random_uuid(); result jsonb; payload jsonb; actual_revision bigint;
 before_count bigint; rejected boolean; record jsonb;
begin
 select count(*) into before_count from public.shots;
 insert into auth.users(id,aud,role,email) values
 (a,'authenticated','authenticated',a::text||'@example.invalid'),
 (b,'authenticated','authenticated',b::text||'@example.invalid');
 update private.beta_members set enabled=true,admitted_at=now() where owner_id in(a,b);
 insert into public.setups(id,owner_id,name) values
 (home,a,'Home Espresso'),(office,a,'Office Espresso'),(otherhome,b,'Other Owner');
 insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model,burr_set)
 values(hv,a,home,'Home machine','Home grinder','Home burrs'),
       (ov,a,office,'Office machine','Office grinder','Office burrs');
 update public.setups set active_version_id=hv where id=home;
 update public.setups set active_version_id=ov where id=office;
 insert into public.grinder_calibrations(id,owner_id,setup_id,grinder_model,burr_set,finest_setting,coarsest_setting)
 values(cal1,a,home,'Home grinder','Home burrs',0,5),
       (cal2,a,office,'Office grinder','Office burrs',0,10);
 insert into public.baskets(id,owner_id,setup_id,name) values(basket1,a,home,'18 g'),(basket2,a,office,'18 g');
 insert into public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g) values
 (bv1,a,home,basket1,18),(bv2,a,office,basket2,18);
 insert into public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id,track_slow_feed)
 values(a,home,hv,cal1,bv1,true),(a,office,ov,cal2,bv2,true);
 insert into public.workspace_state(owner_id,setup_id,setup_version_id) values(a,home,hv),(a,office,ov);
 insert into public.coffee_groups(id,label) values(grp,'Synthetic coffee test');
 insert into public.coffees(id,group_id,name,roaster,verification_state)
 values(coffee,grp,'Test Roast','Fixture Roaster','verified');
 insert into public.library_entries(id,owner_id,coffee_id) values(lib,a,coffee);

 -- The same authenticated owner should be able to rename their own setup,
 -- with replay receipts and conflict safety.
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 payload:=jsonb_build_object('setup_id',home,'name','Renamed Home','expected_revision',2);
 result:=public.dic_apply_client_change(a,mid,'rename_setup',payload);
 if result->>'ok'<>'true' or result->'record'->>'name'<>'Renamed Home' then raise exception 'Setup rename failed: %',result; end if;
 actual_revision:=(result->'record'->>'revision')::bigint;
 result:=public.dic_apply_client_change(a,mid,'rename_setup',payload);
 if (result->'record'->>'revision')::bigint<>actual_revision then raise exception 'Duplicate rename bumped revision'; end if;
 result:=public.dic_apply_client_change(a,gen_random_uuid(),'rename_setup',payload);
 if result->>'code'<>'conflict' then raise exception 'Stale name write was not rejected: %',result; end if;
 rejected:=false;
 begin
  perform public.dic_apply_client_change(b,gen_random_uuid(),'rename_setup',
   jsonb_build_object('setup_id',home,'name','Impersonated','expected_revision',actual_revision));
 exception when insufficient_privilege then rejected:=true;
 end;
 if not rejected then raise exception 'Expected owner binding bypass'; end if;
 rejected:=false;
 begin
  perform public.dic_apply_client_change(a,gen_random_uuid(),'rename_setup',
   jsonb_build_object('setup_id',otherhome,'name','Unauthorized','expected_revision',1));
 exception when insufficient_privilege then rejected:=true;
 end;
 if not rejected then raise exception 'Cross-owner rename bypass'; end if;
 rejected:=false;
 begin
  perform public.dic_apply_client_change(a,gen_random_uuid(),'rename_setup',
   jsonb_build_object('setup_id',home,'name','  ','expected_revision',actual_revision));
 exception when invalid_parameter_value then rejected:=true;
 end;
 if not rejected then raise exception 'Blank setup name accepted'; end if;
 execute 'reset role';
 if (select name from public.setups where id=home)<>'Renamed Home' then raise exception 'Rename not persisted within transaction'; end if;
 if (select name from public.setups where id=office)<>'Office Espresso' then raise exception 'Other setup renamed'; end if;
 if (select count(*) from public.setup_versions where setup_id=home)<>1 then raise exception 'Rename recreated equipment version'; end if;

 -- Trigger keeps the most recent actually LOGGED feed mode by setup/version.
 insert into public.shots(id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,
  style,pulled_at,dose_g,yield_g,time_s,grind_setting,feed_mode,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 values(gen_random_uuid(),a,lib,home,hv,bv1,cal1,'Turbo','2026-10-12T12:00:00Z',18,50,20,2,'slow',2,3,4,4,1,'{}');
 if not(select slow_feed and last_feed_shot_at='2026-10-12T12:00:00Z' from public.setup_preferences where setup_id=home)
 then raise exception 'Slow Feed not remembered at home'; end if;
 if (select slow_feed from public.setup_preferences where setup_id=office) then raise exception 'Home mode leaked to office'; end if;
 insert into public.shots(id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,
  style,pulled_at,dose_g,yield_g,time_s,grind_setting,feed_mode,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 values(gen_random_uuid(),a,lib,office,ov,bv2,cal2,'Turbo','2026-10-12T12:05:00Z',18,50,23,3,'slow',2,3,4,4,1,'{}');
 if not(select slow_feed from public.setup_preferences where setup_id=office) then raise exception 'Office mode failed to update'; end if;
 insert into public.shots(id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,
  style,pulled_at,dose_g,yield_g,time_s,grind_setting,feed_mode,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 values(gen_random_uuid(),a,lib,home,hv,bv1,cal1,'Turbo','2026-10-12T12:10:00Z',18,49,22,2,'standard',2,3,4,4,1,'{}');
 if (select slow_feed from public.setup_preferences where setup_id=home) then raise exception 'Turning feed OFF was not remembered'; end if;
 -- Late arrival: older offline Slow Feed data must not replace newer Standard.
 insert into public.shots(id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,
  style,pulled_at,dose_g,yield_g,time_s,grind_setting,feed_mode,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 values(gen_random_uuid(),a,lib,home,hv,bv1,cal1,'Turbo','2026-10-12T12:03:00Z',18,51,21,2,'slow',2,3,4,4,1,'{}');
 if (select slow_feed from public.setup_preferences where setup_id=home) then raise exception 'Old offline mode replaced newer default'; end if;
 -- Legacy restore or missing condition must NOT choose a new default.
 insert into public.shots(id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,
  style,pulled_at,dose_g,yield_g,time_s,grind_setting,feed_mode,legacy_import,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 values(gen_random_uuid(),a,lib,home,hv,bv1,cal1,'Turbo','2026-10-12T12:30:00Z',18,52,24,2,'slow',true,2,3,4,4,1,'{}');
 if (select slow_feed from public.setup_preferences where setup_id=home) then raise exception 'Legacy import unexpectedly reset feed default'; end if;
 if (select last_feed_shot_at from public.setup_preferences where setup_id=home)<>'2026-10-12T12:10:00Z' then raise exception 'Feed high-water mark moved incorrectly'; end if;
 if (select count(*) from public.shots)<before_count+5 then raise exception 'Test fixture unexpectedly absent'; end if;
end;
$test$;
select 'PASS: setup rename, permission isolation, replay conflict, per-setup feed memory and stale/legacy shot guardrails' as result;
rollback;
