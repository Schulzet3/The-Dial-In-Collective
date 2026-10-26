-- Issue #14 disposable-only synthetic acceptance. Do not run on production.
begin;
do $t$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
 sid uuid:=gen_random_uuid(); vid uuid:=gen_random_uuid(); cid uuid; lid uuid;
 targets jsonb:=jsonb_build_object('ratio',2.5,'time_low_s',22,'time_high_s',38,'temperature_c',null);
 req uuid:=gen_random_uuid(); response jsonb; rev bigint; denied boolean;
begin
 if current_database()<>'dic_ci' then raise exception 'dic_ci only'; end if;
 insert into auth.users(id,aud,role,email,email_confirmed_at)
 values(a,'authenticated','authenticated',a::text||'@example.invalid',now()),
 (b,'authenticated','authenticated',b::text||'@example.invalid',now());
 insert into private.beta_members(owner_id,enabled,admitted_at)
 values(a,true,now()),(b,true,now()) on conflict(owner_id) do update set enabled=true,admitted_at=now();
 insert into public.setups(id,owner_id,name) values(sid,a,'Synthetic setup');
 insert into public.setup_versions(id,owner_id,setup_id) values(vid,a,sid);
 update public.setups set active_version_id=vid where id=sid;
 insert into public.coffees(name,roaster,verification_state)
 values('Synthetic Custom','Fixture roaster','verified') returning id into cid;
 insert into public.library_entries(owner_id,coffee_id) values(a,cid) returning id into lid;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 response:=public.dic_apply_client_change(a,req,'save_custom_targets',jsonb_build_object(
  'setup_id',sid,'setup_version_id',vid,'library_entry_id',lid,'expected_revision',0,'custom_targets',targets));
 if response->>'ok'<>'true' or response->'record'->>'selected_style'<>'Custom'
 or response->'record'->'custom_targets' is distinct from targets then
  raise exception 'Initial Custom save failed: %',response; end if;
 rev:=(response->'record'->>'revision')::bigint;
 response:=public.dic_apply_client_change(a,req,'save_custom_targets',jsonb_build_object(
  'setup_id',sid,'setup_version_id',vid,'library_entry_id',lid,'expected_revision',0,'custom_targets',targets));
 if (response->'record'->>'revision')::bigint<>rev then raise exception 'Replay bumped revision'; end if;
 response:=public.dic_apply_client_change(a,gen_random_uuid(),'save_custom_targets',jsonb_build_object(
  'setup_id',sid,'setup_version_id',vid,'library_entry_id',lid,'expected_revision',0,'custom_targets',targets));
 if response->>'code'<>'conflict' then raise exception 'Stale write succeeded'; end if;
 denied:=false;
 begin
  perform public.dic_apply_client_change(b,gen_random_uuid(),'save_custom_targets',jsonb_build_object(
   'setup_id',sid,'setup_version_id',vid,'library_entry_id',lid,'expected_revision',rev,'custom_targets',targets));
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Cross-owner expected identity accepted'; end if;
 denied:=false;
 begin
  perform public.dic_apply_client_change(a,gen_random_uuid(),'save_custom_targets',jsonb_build_object(
   'setup_id',sid,'setup_version_id',vid,'library_entry_id',lid,'expected_revision',rev,
   'custom_targets',jsonb_build_object('ratio',16,'time_low_s',22,'time_high_s',38,'temperature_c',null)));
 exception when invalid_parameter_value then denied:=true; end;
 if not denied then raise exception 'Invalid ratio accepted'; end if;
 response:=public.dic_apply_client_change(a,gen_random_uuid(),'set_style',jsonb_build_object(
  'setup_id',sid,'setup_version_id',vid,'library_entry_id',lid,'expected_revision',rev,'style','Traditional'));
 if response->>'ok'<>'true' or response->'record'->'custom_targets' is distinct from targets then
  raise exception 'Style switch erased Custom values'; end if;
 execute 'reset role';
 if has_table_privilege('authenticated','public.workspace_coffees','UPDATE') then
  raise exception 'Direct authenticated update unexpectedly granted'; end if;
end $t$;

-- Additional Issue #14 acceptance. Synthetic accounts and history remain inside ROLLBACK.
do $custom_acceptance$
declare
 owner_a uuid:=gen_random_uuid();owner_b uuid:=gen_random_uuid();
 setup_a uuid:=gen_random_uuid(); version_a uuid:=gen_random_uuid();
 old_version uuid:=gen_random_uuid(); basket uuid:=gen_random_uuid();
 basket_ver uuid:=gen_random_uuid(); cal uuid:=gen_random_uuid();
 coffee_id uuid; other_coffee_id uuid; library_id uuid; other_library_id uuid;
 shot_id uuid; receipt_id uuid:=gen_random_uuid();
 value jsonb:=jsonb_build_object('ratio',2.5,'time_low_s',22,'time_high_s',38,'temperature_c',null);
 updated jsonb:=jsonb_build_object('ratio',2.75,'time_low_s',19,'time_high_s',33,'temperature_c',94.3);
 bad jsonb; answer jsonb; whole_state jsonb; historical jsonb;
 revision_now bigint; count_matched int; denied boolean;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable database required'; end if;

 -- Strict JSON shape/typed numeric boundaries; null temperature is explicitly permitted.
 if not private.dic_custom_targets_valid(value)
  or not private.dic_custom_targets_valid(jsonb_build_object(
   'ratio',0.8,'time_low_s',5,'time_high_s',60,'temperature_c',99.9)) then
  raise exception 'Valid boundary target rejected';
 end if;
 for bad in select x.value from jsonb_array_elements(jsonb_build_array(
  'null'::jsonb,
  jsonb_build_object('ratio',2.5,'time_low_s',22,'time_high_s',38),
  jsonb_build_object('ratio',2.5,'time_low_s',22,'time_high_s',38,'temperature_c',null,'extra',true),
  jsonb_build_object('ratio','2.5','time_low_s',22,'time_high_s',38,'temperature_c',null),
  jsonb_build_object('ratio',2.5,'time_low_s',38,'time_high_s',22,'temperature_c',null),
  jsonb_build_object('ratio',2.5,'time_low_s',22,'time_high_s',22,'temperature_c',null),
  jsonb_build_object('ratio',2.5,'time_low_s',4,'time_high_s',38,'temperature_c',null),
  jsonb_build_object('ratio',2.5,'time_low_s',22,'time_high_s',61,'temperature_c',null),
  jsonb_build_object('ratio',2.5,'time_low_s',22,'time_high_s',38,'temperature_c',84),
  jsonb_build_object('ratio',2.5,'time_low_s',22,'time_high_s',38,'temperature_c',100),
  jsonb_build_object('ratio',4.6,'time_low_s',22,'time_high_s',38,'temperature_c',null)
 )) as x(value)
 loop
  if private.dic_custom_targets_valid(bad) then
   raise exception 'Invalid Custom target passed validation: %',bad;
  end if;
 end loop;

 -- New server state and an existing history row must never be rewritten by Custom preferences.
 insert into auth.users(id,aud,role,email,email_confirmed_at) values
  (owner_a,'authenticated','authenticated',owner_a::text||'@example.invalid',now()),
  (owner_b,'authenticated','authenticated',owner_b::text||'@example.invalid',now());
 insert into private.beta_members(owner_id,enabled,admitted_at)
  values(owner_a,true,now()),(owner_b,true,now())
  on conflict(owner_id) do update set enabled=true,admitted_at=now();
 insert into public.setups(id,owner_id,name) values
  (setup_a,owner_a,'Custom acceptance fixture');
 insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model)
  values(version_a,owner_a,setup_a,'Fixture machine','Fixture grinder');
 update public.setups set active_version_id=version_a where id=setup_a;
 insert into public.grinder_calibrations(id,owner_id,setup_id,grinder_model,finest_setting,coarsest_setting)
  values(cal,owner_a,setup_a,'Fixture grinder',0,5);
 insert into public.baskets(id,owner_id,setup_id,name)
  values(basket,owner_a,setup_a,'18 g');
 insert into public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g)
  values(basket_ver,owner_a,setup_a,basket,18);
 insert into public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id)
  values(owner_a,setup_a,version_a,cal,basket_ver);
 insert into public.workspace_state(owner_id,setup_id,setup_version_id)
  values(owner_a,setup_a,version_a);
 insert into public.coffees(name,roaster,verification_state)
  values('First Custom fixture','Synthetic roaster','verified') returning id into coffee_id;
 insert into public.coffees(name,roaster,verification_state)
  values('Other original recipe','Synthetic roaster','verified') returning id into other_coffee_id;
 insert into public.library_entries(owner_id,coffee_id)
  values(owner_a,coffee_id) returning id into library_id;
 insert into public.library_entries(owner_id,coffee_id)
  values(owner_a,other_coffee_id) returning id into other_library_id;
 insert into public.workspace_coffees(owner_id,setup_id,setup_version_id,library_entry_id,selected_style)
  values(owner_a,setup_a,version_a,other_library_id,'Traditional');

 -- A very different Custom ratio/time can still be all-green: sensory success is authoritative.
 insert into public.shots(owner_id,library_entry_id,setup_id,setup_version_id,
  basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,
  grind_setting,feed_mode,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 values(owner_a,library_id,setup_a,version_a,basket_ver,cal,'Custom',now(),
  18,72,55,2,'standard',3,3,5,5,1,'{}') returning id into shot_id;
 select to_jsonb(x) into historical from public.shots x where id=shot_id;
 if not (historical->>'is_dialed_in')::boolean
    or historical->>'style'<>'Custom' then
  raise exception 'Custom numerical guidelines vetoed all-green shot';
 end if;

 perform set_config('request.jwt.claim.sub',owner_a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 answer:=public.dic_apply_client_change(owner_a,receipt_id,'save_custom_targets',jsonb_build_object(
  'setup_id',setup_a,'setup_version_id',version_a,'library_entry_id',library_id,
  'expected_revision',0,'custom_targets',value));
 if answer->>'ok'<>'true' then raise exception 'Accepted owner Custom write failed: %',answer; end if;
 revision_now:=(answer->'record'->>'revision')::bigint;
 whole_state:=public.dic_read_personal_state();
 select count(*) into count_matched from jsonb_array_elements(whole_state->'workspaceCoffees') as x(record)
  where record->>'library_entry_id'=library_id::text
    and record->'custom_targets'=value
    and record->>'selected_style'='Custom';
 if count_matched<>1 then raise exception 'Custom targets missing in owner server reload'; end if;
 if exists(select 1 from jsonb_array_elements(whole_state->'workspaceCoffees') as x(record)
   where record->>'library_entry_id'=other_library_id::text
     and (record->>'selected_style'<>'Traditional' or record->'custom_targets'<>'null'::jsonb)) then
  raise exception 'Unrelated non-Custom workspace changed'; end if;
 -- Use SQL NULL rather than JSON null for the legacy nullable column.
 if not exists(select 1 from public.workspace_coffees
  where owner_id=owner_a and library_entry_id=other_library_id
   and selected_style='Traditional' and custom_targets is null) then
  raise exception 'Other coffee lost legacy default style'; end if;

 -- A same-ID retry with a DIFFERENT operation must fail without changing the original receipt.
 denied:=false;
 begin
  perform public.dic_apply_client_change(owner_a,receipt_id,'save_custom_targets',jsonb_build_object(
   'setup_id',setup_a,'setup_version_id',version_a,'library_entry_id',library_id,
   'expected_revision',0,'custom_targets',updated));
 exception when invalid_parameter_value then denied:=true; end;
 if not denied then raise exception 'Reused mutation ID accepted different payload'; end if;

 -- Typed temperature update is durable and revision-checked.
 answer:=public.dic_apply_client_change(owner_a,gen_random_uuid(),'save_custom_targets',jsonb_build_object(
  'setup_id',setup_a,'setup_version_id',version_a,'library_entry_id',library_id,
  'expected_revision',revision_now,'custom_targets',updated));
 if answer->>'ok'<>'true' or answer->'record'->'custom_targets' is distinct from updated then
  raise exception 'Custom edit failed: %',answer; end if;
 revision_now:=(answer->'record'->>'revision')::bigint;
 whole_state:=public.dic_read_personal_state();
 if not exists(select 1 from jsonb_array_elements(whole_state->'workspaceCoffees') as x(record)
   where record->>'library_entry_id'=library_id::text and record->'custom_targets'=updated) then
  raise exception 'Owner reload did not preserve edited Custom targets';
 end if;
 if (select to_jsonb(x) from public.shots x where id=shot_id) is distinct from historical then
  raise exception 'Custom target update rewrote historical shot';
 end if;
 if has_table_privilege('authenticated','public.workspace_coffees','UPDATE')
  or has_table_privilege('authenticated','public.workspace_coffees','INSERT')
  or has_table_privilege('authenticated','public.workspace_coffees','DELETE')
  or has_function_privilege('anon','private.dic_save_custom_targets(uuid,jsonb)','EXECUTE')
  or has_function_privilege('anon','private.dic_custom_targets_valid(jsonb)','EXECUTE') then
  raise exception 'Custom operation exposed a direct or anonymous write path';
 end if;

 -- Same member but different coffee may not hijack another workspace or preference.
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',owner_b::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_b,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 whole_state:=public.dic_read_personal_state();
 if jsonb_array_length(whole_state->'workspaceCoffees')<>0
    or jsonb_array_length(whole_state->'shots')<>0 then
  raise exception 'Second member sees first member private Custom data';
 end if;
 denied:=false;
 begin
  perform public.dic_apply_client_change(owner_b,gen_random_uuid(),'save_custom_targets',jsonb_build_object(
   'setup_id',setup_a,'setup_version_id',version_a,'library_entry_id',library_id,
   'expected_revision',revision_now,'custom_targets',value));
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Authenticated other owner wrote Custom targets'; end if;
 denied:=false;
 begin
  perform public.dic_apply_client_change(owner_a,gen_random_uuid(),'save_custom_targets',jsonb_build_object(
   'setup_id',setup_a,'setup_version_id',version_a,'library_entry_id',library_id,
   'expected_revision',revision_now,'custom_targets',value));
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Other JWT impersonated original owner'; end if;

 -- A hardware version transition makes old context noneditable; historical shots remain intact.
 execute 'reset role';
 insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model)
  values(old_version,owner_a,setup_a,'Replacement machine','Replacement grinder');
 update public.setups set active_version_id=old_version where id=setup_a;
 perform set_config('request.jwt.claim.sub',owner_a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin
  perform public.dic_apply_client_change(owner_a,gen_random_uuid(),'save_custom_targets',jsonb_build_object(
   'setup_id',setup_a,'setup_version_id',version_a,'library_entry_id',library_id,
   'expected_revision',revision_now,'custom_targets',value));
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Stale equipment version accepted Custom changes'; end if;
 execute 'reset role';
 if (select to_jsonb(x) from public.shots x where id=shot_id) is distinct from historical then
  raise exception 'Hardware transition rewrote Custom shot';
 end if;
 if (select count(*) from private.mutation_receipts
  where owner_id=owner_a and mutation_id=receipt_id)<>1 then
  raise exception 'Mutation receipt was duplicated by failed or replayed request';
 end if;
end $custom_acceptance$;
select 'PASS: issue14 owner reload, changed-id replay, strict schema, non-Custom safety, cross-account RLS, versioned shots' as result;

select 'PASS: Custom owner RPC, revision, replay, validation, style preservation' as result;
rollback;