-- Disconnected dic_ci only. Both accounts and all history below are synthetic.
-- No production account selection or historical row-count assumptions; ROLLBACK.
begin;
do $privacy$
declare
  owner uuid:=gen_random_uuid(); visitor uuid:=gen_random_uuid();
  setup_id uuid:=gen_random_uuid(); version_id uuid:=gen_random_uuid();
  calibration_id uuid:=gen_random_uuid(); basket_id uuid:=gen_random_uuid();
  basket_version_id uuid:=gen_random_uuid(); coffee_id uuid; library_id uuid;
  shot_id uuid; i integer;
  status jsonb; personal jsonb; matched jsonb; denied boolean;
  original_shots int; original_library int; verified_coffees int;
begin
 if current_database()<>'dic_ci' then
  raise exception 'Disposable dic_ci database required';
 end if;
 insert into auth.users(id,aud,role,email,email_confirmed_at)
 values(owner,'authenticated','authenticated',owner::text||'@example.invalid',now());
 insert into private.beta_members(owner_id,enabled,admitted_at)
 values(owner,true,now()) on conflict(owner_id)
 do update set enabled=true,admitted_at=now();
 insert into private.app_admins(owner_id) values(owner);
 insert into public.setups(id,owner_id,name) values(setup_id,owner,'Synthetic private setup');
 insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model)
 values(version_id,owner,setup_id,'Synthetic machine','Synthetic grinder');
 update public.setups set active_version_id=version_id where id=setup_id;
 insert into public.grinder_calibrations(id,owner_id,setup_id,grinder_model,finest_setting,coarsest_setting)
 values(calibration_id,owner,setup_id,'Synthetic grinder',0,10);
 insert into public.baskets(id,owner_id,setup_id,name) values(basket_id,owner,setup_id,'Synthetic basket');
 insert into public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g)
 values(basket_version_id,owner,setup_id,basket_id,18);
 insert into public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id)
 values(owner,setup_id,version_id,calibration_id,basket_version_id);
 for i in 1..4 loop
  insert into public.coffees(name,roaster,verification_state)
  values(case when i=1 then 'Hambela' else 'Private Fixture Coffee '||i end,
         case when i=1 then 'Sweet Bloom Coffee' else 'Fixture Roaster '||i end,'verified')
  returning id into coffee_id;
  insert into public.library_entries(owner_id,coffee_id) values(owner,coffee_id)
  returning id into library_id;
 end loop;
 for i in 1..14 loop
  insert into public.shots(owner_id,library_entry_id,setup_id,setup_version_id,
   basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,
   grind_setting,temperature_c,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
  values(owner,library_id,setup_id,version_id,basket_version_id,calibration_id,
   'Traditional',now()-make_interval(mins=>i),18,40,25,2,93.2,2,3,4,4,1,'{}')
  returning id into shot_id;
  insert into public.shot_notes(owner_id,shot_id,notes)
  values(owner,shot_id,'SYNTHETIC PRIVATE NOTE '||i);
 end loop;
 select count(*) into original_shots from public.shots where owner_id=owner;
 select count(*) into original_library from public.library_entries where owner_id=owner;
 select count(*) into verified_coffees from public.coffees where verification_state='verified';
 if original_shots<>14 or original_library<>4 or verified_coffees<4 then
  raise exception 'Synthetic privacy fixture is incomplete';
 end if;
 insert into auth.users(id,aud,role,email,email_confirmed_at)
 values(visitor,'authenticated','authenticated',visitor::text||'@example.invalid',now());
 insert into private.beta_members(owner_id,enabled,admitted_at)
 values(visitor,true,now()) on conflict(owner_id) do update set enabled=true,admitted_at=now();
 perform set_config('request.jwt.claim.sub',visitor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',visitor,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 status:=public.dic_session_status();
 if status->>'admitted'<>'true' or status->>'admin'<>'false' then
  raise exception 'Synthetic admitted member inherited owner administrator status';
 end if;
 personal:=public.dic_read_personal_state();
 if jsonb_array_length(personal->'shots')<>0 or
    jsonb_array_length(personal->'library')<>0 or
    jsonb_array_length(personal->'submissions')<>0 then
  raise exception 'Synthetic visitor saw owner private history';
 end if;
 if (select count(*) from public.shots)<>0 or
    (select count(*) from public.library_entries)<>0 or
    (select count(*) from public.coffee_submissions)<>0 or
    (select count(*) from public.shot_notes)<>0 or
    (select count(*) from public.setups)<>0 then
  raise exception 'Private data leaked through exposed row policies';
 end if;
 matched:=public.dic_find_coffee_matches('{"name":"Hambella","roaster":"Sweet Bloom Coffee"}'::jsonb);
 if matched->>'classification'<>'needs_confirmation' or
    jsonb_array_length(matched->'candidates')<1 or
    matched->>'exact_id' is not null then
  raise exception 'Public canonical coffee may not be auto-linked on fuzzy spelling';
 end if;
 denied:=false;
 begin perform public.dic_admin_dashboard();exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin reached admin queue';end if;
 denied:=false;
 begin perform (select count(*) from private.import_batches);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin reached private original archive';end if;
 denied:=false;
 begin perform public.dic_source_check_target(gen_random_uuid());exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin reached service-only product source';end if;
 denied:=false;
 begin perform public.dic_source_claim(gen_random_uuid());exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin bypassed product source fetch budget';end if;
 denied:=false;
 begin perform public.dic_trusted_source_verify(gen_random_uuid(),'{}'::jsonb);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin can forge verified product evidence';end if;
 execute 'reset role';

 perform set_config('request.jwt.claim.sub',owner::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 status:=public.dic_session_status();
 if status->>'admin'<>'true' or status->>'admitted'<>'true' then
  raise exception 'Owner lost administrator admission';
 end if;
 personal:=public.dic_read_personal_state();
 if jsonb_array_length(personal->'shots')<>original_shots or
    jsonb_array_length(personal->'library')<>original_library then
  raise exception 'Synthetic owner library and shots changed';
 end if;
 if (select count(*) from public.shot_notes)<>original_shots then
  raise exception 'Synthetic owner private notes changed or leaked';
 end if;
 denied:=false;
 begin perform public.dic_trusted_source_verify(gen_random_uuid(),'{}'::jsonb);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Owner administrator can forge server-only source verification';end if;
 execute 'reset role';
end $privacy$;
select 'PASS: simulated admitted outsider sees canonical suggestions but no private owner data, admin queue or trusted verification; all synthetic writes rolled back' as result;
rollback;
