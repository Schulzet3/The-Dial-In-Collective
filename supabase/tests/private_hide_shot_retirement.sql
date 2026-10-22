-- Disposable isolated database only. Synthetic account and rows; always rollback.
begin;
do $test$
declare
 v_owner uuid:=gen_random_uuid(); mid uuid:=gen_random_uuid(); coffee_id uuid;
 setup_result jsonb; coffee_result jsonb; shot_result jsonb; replay jsonb;
 payload jsonb; before_rows jsonb; after_rows jsonb; rejected boolean;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci database required'; end if;
 if position('hide_shot' in pg_get_functiondef('private.mutate(uuid,text,jsonb)'::regprocedure))<>0 then
  raise exception 'Internal hide_shot code remains';
 end if;
 if has_function_privilege('authenticated','private.mutate(uuid,text,jsonb)','execute') or
    has_function_privilege('anon','private.mutate(uuid,text,jsonb)','execute') then
  raise exception 'Private mutation permission widened';
 end if;
 insert into auth.users(id,aud,role,email,email_confirmed_at)
 values(v_owner,'authenticated','authenticated',v_owner::text||'@example.invalid',now());
 update private.beta_members set enabled=true,admitted_at=now() where private.beta_members.owner_id=v_owner;
 perform set_config('request.jwt.claim.sub',v_owner::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_owner,'role','authenticated')::text,true);
 setup_result:=private.mutate(gen_random_uuid(),'create_setup','{"name":"Retirement fixture","basket_dose_g":18,"finest_setting":0,"coarsest_setting":10}');
 if setup_result->>'ok'<>'true' then raise exception 'create_setup failed'; end if;
 perform private.mutate(gen_random_uuid(),'save_preferences',jsonb_build_object('expected_revision',(select revision from public.account_preferences a where a.owner_id=v_owner),'theme','dark'));
 perform private.mutate(gen_random_uuid(),'submit_coffee','{"proposed_data":{"name":"Synthetic pending coffee","roaster":"Synthetic roaster"}}');
 insert into public.coffees(name,roaster,verification_state) values('Synthetic verified coffee','Synthetic roaster','verified') returning id into coffee_id;
 coffee_result:=private.mutate(gen_random_uuid(),'add_verified_coffee',jsonb_build_object('coffee_id',coffee_id));
 payload:=jsonb_build_object('setup_id',setup_result->>'setup_id','setup_version_id',setup_result->>'setup_version_id',
 'basket_version_id',setup_result->>'basket_version_id','calibration_id',setup_result->>'calibration_id',
 'library_entry_id',coffee_result->>'library_entry_id','style','Traditional','dose_g',18,'yield_g',40,'time_s',25,
 'grind_setting',2,'temperature_c',93,'notes','Synthetic retained note',
 'taste',jsonb_build_object('extraction',2,'body',3,'clarity',4,'sweetness',4,'astringency',1));
 shot_result:=private.mutate(mid,'save_shot',payload);
 replay:=private.mutate(mid,'save_shot',payload);
 if replay is distinct from shot_result or shot_result->>'ok'<>'true' then raise exception 'save_shot replay changed'; end if;
 -- Historical hidden semantics remain intact; fixture-only legacy hidden row.
 update public.shots set hidden_at=now() where id=(shot_result->'record'->>'id')::uuid;
 select jsonb_build_object('shots',(select jsonb_agg(to_jsonb(s) order by s.id) from public.shots s),
 'notes',(select jsonb_agg(to_jsonb(n) order by n.shot_id) from public.shot_notes n),
 'community',(select jsonb_agg(to_jsonb(c) order by c.id) from public.community_shots c),
 'receipts',(select jsonb_agg(to_jsonb(r) order by r.owner_id,r.mutation_id) from private.mutation_receipts r)) into before_rows;
 -- Reused save receipt and new IDs must both reject hide before receipt lookup.
 for i in 1..2 loop
  rejected:=false;
  begin
   perform private.mutate(case when i=1 then mid else gen_random_uuid() end,'hide_shot',jsonb_build_object('id',shot_result->'record'->>'id','expected_revision',1));
  exception when sqlstate '22023' then
   if sqlerrm<>'Unsupported mutation action.' then raise; end if;
   rejected:=true;
  end;
  if not rejected then raise exception 'Private hide mutation accepted'; end if;
 end loop;
 rejected:=false;
 begin
  perform public.dic_apply_client_change(null,gen_random_uuid(),'hide_shot','{}');
 exception when sqlstate '22023' then rejected:=true;
 end;
 if not rejected then raise exception 'Public hide mutation accepted'; end if;
 select jsonb_build_object('shots',(select jsonb_agg(to_jsonb(s) order by s.id) from public.shots s),
 'notes',(select jsonb_agg(to_jsonb(n) order by n.shot_id) from public.shot_notes n),
 'community',(select jsonb_agg(to_jsonb(c) order by c.id) from public.community_shots c),
 'receipts',(select jsonb_agg(to_jsonb(r) order by r.owner_id,r.mutation_id) from private.mutation_receipts r)) into after_rows;
 if before_rows is distinct from after_rows then raise exception 'Retirement rejection changed historical data'; end if;
end $test$;
rollback;
