-- Entire synthetic second-account test is rolled back. No user data leaves the database.
begin;
do $privacy$
declare
  owner uuid; visitor uuid:=gen_random_uuid();
  status jsonb; personal jsonb; matched jsonb; denied boolean;
  original_shots int; original_library int; verified_coffees int;
begin
 select owner_id into strict owner from private.app_admins;
 select count(*) into original_shots from public.shots where owner_id=owner;
 select count(*) into original_library from public.library_entries where owner_id=owner;
 select count(*) into verified_coffees from public.coffees where verification_state='verified';
 if original_shots<14 or original_library<4 or verified_coffees<4 then
  raise exception 'Owner historical baseline unexpectedly reduced';
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
    (select count(*) from public.coffee_submissions)<>0 then
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
  raise exception 'Owner original library and shots changed';
 end if;
 denied:=false;
 begin perform public.dic_trusted_source_verify(gen_random_uuid(),'{}'::jsonb);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Owner administrator can forge server-only source verification';end if;
 execute 'reset role';
end $privacy$;
select 'PASS: simulated admitted outsider sees canonical suggestions but no private owner data, admin queue or trusted verification; all synthetic writes rolled back' as result;
rollback;
