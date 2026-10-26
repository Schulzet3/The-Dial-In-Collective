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
select 'PASS: Custom owner RPC, revision, replay, validation, style preservation' as result;
rollback;