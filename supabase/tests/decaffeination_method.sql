-- Release audit: synthetic fixture only; never run on a hosted database.
begin;
do $decaf_acceptance$
declare
 u1 uuid:=gen_random_uuid();u2 uuid:=gen_random_uuid();admin_id uuid;
 lid uuid:=gen_random_uuid();cid uuid;sid uuid;rev bigint;resp jsonb;
 denied boolean;original_shots bigint;original_notes bigint;original_method text;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci database only';end if;
 select owner_id into strict admin_id from private.app_admins;
 select count(*) into original_shots from public.shots;
 select count(*) into original_notes from public.shot_notes;
 insert into auth.users(id,aud,role,email) values
 (u1,'authenticated','authenticated',u1::text||'@fixture.invalid'),
 (u2,'authenticated','authenticated',u2::text||'@fixture.invalid');
 insert into private.beta_members(owner_id,enabled,admitted_at)
 values(u1,true,now()),(u2,true,now()) on conflict(owner_id)
 do update set enabled=true,admitted_at=now();
 perform set_config('request.jwt.claim.sub',u1::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 resp:=public.dic_apply_client_change(u1,gen_random_uuid(),'submit_coffee',
  jsonb_build_object('library_entry_id',lid,'proposed_data',
   jsonb_build_object('name','Synthetic Decaf Acceptance','roaster','Release08 Fixture',
    'release_label','2026 Fixture','is_decaf',true,'decaffeination_method','Sugar Process')));
 if resp->>'ok'<>'true' or resp->>'status'<>'verified' then
  raise exception 'Distinct fully-decaf submission failed: %',resp;end if;
 cid:=(resp->>'coffee_id')::uuid;
 if not exists(select 1 from public.coffees where id=cid and is_decaf
  and decaffeination_method='Sugar Process') then
  raise exception 'First approved submission did not retain decaf method';end if;
 execute 'reset role';
 -- A later member's same-coffee submission cannot replace the first fact.
 perform set_config('request.jwt.claim.sub',u2::text,true);
 execute 'set local role authenticated';
 resp:=public.dic_apply_client_change(u2,gen_random_uuid(),'submit_coffee',
  jsonb_build_object('library_entry_id',gen_random_uuid(),'proposed_data',
   jsonb_build_object('name','Synthetic Decaf Acceptance','roaster','Release08 Fixture',
    'release_label','2026 Fixture','is_decaf',true,'decaffeination_method','Water Process')));
 if resp->>'ok'<>'true' or (resp->>'coffee_id')::uuid<>cid then
  raise exception 'Duplicate decaf identity was not reused: %',resp;end if;
 if (select decaffeination_method from public.coffees where id=cid)<>'Sugar Process'
 then raise exception 'Later member overwrote original decaf method';end if;
 denied:=false;
 begin perform public.dic_edit_my_coffee(lid,1,
  '{"name":"Foreign edit","roaster":"Release08 Fixture"}'::jsonb,null);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Cross-owner coffee edit accepted';end if;
 denied:=false;
 begin perform public.dic_admin_edit_coffee(cid,1,
  '{"is_decaf":true,"decaffeination_method":"Water Process"}'::jsonb,
  'Nonadmin must be denied','approved');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Nonadmin changed canonical decaf fact';end if;
 execute 'reset role';
 -- Owner edits request a review; they never change canonical facts directly.
 select revision into rev from public.coffees where id=cid;
 perform set_config('request.jwt.claim.sub',u1::text,true);
 execute 'set local role authenticated';
 resp:=public.dic_edit_my_coffee(lid,rev,
  '{"name":"Synthetic Decaf Acceptance","roaster":"Release08 Fixture","is_decaf":true,"decaffeination_method":"Water Process"}'::jsonb,null);
 if resp->>'kind'<>'correction_requested' then
  raise exception 'Owner decaf correction not staged for review: %',resp;end if;
 sid:=(resp->>'submission_id')::uuid;
 if (select decaffeination_method from public.coffees where id=cid)<>'Sugar Process'
 then raise exception 'Owner correction prematurely changed canonical';end if;
 execute 'reset role';
 select revision into rev from public.coffee_submissions where id=sid;
 perform set_config('request.jwt.claim.sub',u1::text,true);
 execute 'set local role authenticated';
 resp:=public.dic_edit_my_coffee(lid,rev+10,
  '{"name":"Synthetic Decaf Acceptance","roaster":"Release08 Fixture","is_decaf":false}'::jsonb,null);
 if resp->>'code'<>'conflict' then raise exception 'Stale correction revision accepted';end if;
 resp:=public.dic_edit_my_coffee(lid,rev,
  '{"name":"Synthetic Decaf Acceptance","roaster":"Release08 Fixture"}'::jsonb,null);
 if resp->>'ok'<>'true' then raise exception 'Older client correction rejected';end if;
 execute 'reset role';
 if not exists(select 1 from public.coffee_submissions where id=sid
  and proposed_data->>'is_decaf'='true'
  and proposed_data->>'decaffeination_method'='Water Process') then
  raise exception 'Older client omitted fields erased pending decaf method';end if;
 -- Administrator corrections retain revision checks and protected audit.
 select revision into rev from public.coffees where id=cid;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 execute 'set local role authenticated';
 resp:=public.dic_admin_edit_coffee(cid,rev,
  '{"is_decaf":true,"decaffeination_method":"Water Process"}'::jsonb,
  'Synthetic reviewed source correction','approved');
 if resp->>'ok'<>'true' then raise exception 'Admin decaf correction failed';end if;
 denied:=false;
 begin perform public.dic_admin_edit_coffee(cid,rev,
  '{"is_decaf":true,"decaffeination_method":"Carbon Dioxide (CO2)"}'::jsonb,
  'Stale administrator revision denied','approved');
 exception when serialization_failure then denied:=true;end;
 if not denied then raise exception 'Stale admin decaf correction accepted';end if;
 execute 'reset role';
 if not exists(select 1 from private.admin_content_edits where record_id=cid
  and actor_id=admin_id and before_values->>'decaffeination_method'='Sugar Process'
  and after_values->>'decaffeination_method'='Water Process') then
  raise exception 'Canonical decaf audit missing before/after';end if;
 denied:=false;
 begin update public.coffees set is_decaf=false where id=cid;
 exception when check_violation then denied:=true;end;
 if not denied then raise exception 'Regular coffee retained decaf method';end if;
 denied:=false;
 begin update public.coffees set decaffeination_method='Unsupported solvent' where id=cid;
 exception when check_violation then denied:=true;end;
 if not denied then raise exception 'Unsupported method bypassed constraint';end if;
 if has_function_privilege('authenticated','private.dic_capture_first_decaf_method()','EXECUTE')
  or has_function_privilege('anon','private.dic_capture_first_decaf_method()','EXECUTE') then
  raise exception 'Trigger helper exposed to API roles';end if;
 if (select count(*) from public.shots)<>original_shots
  or (select count(*) from public.shot_notes)<>original_notes then
  raise exception 'Decaf acceptance changed shot history';end if;
end $decaf_acceptance$;
select 'PASS: decaf first approval, duplicate preservation, owner correction, old clients, cross-account/admin denial, revision conflicts, audit, constraints and unchanged shots; ROLLBACK' as result;
rollback;
