-- Synthetic private first-style prompt claim regression. Only dic_ci; all fixture rows ROLLBACK.
begin;
do $first_style$
declare
 owner_a uuid:=gen_random_uuid(); owner_b uuid:=gen_random_uuid(); pending_member uuid:=gen_random_uuid();
 coffee uuid; entry_a uuid; entry_b uuid; entry_shot uuid;
 setup_a uuid:=gen_random_uuid(); version_a uuid:=gen_random_uuid();
 calibration_a uuid:=gen_random_uuid(); basket_a uuid:=gen_random_uuid(); basket_version_a uuid:=gen_random_uuid();
 result jsonb; denied boolean; seen_count bigint;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci database required'; end if;
 if to_regclass('private.dic_first_style_prompt_seen') is null
 or to_regprocedure('public.dic_claim_first_style_prompt(uuid)') is null
 then raise exception 'First-style prompt migration not installed';end if;
 if has_table_privilege('authenticated','private.dic_first_style_prompt_seen','SELECT')
 or has_table_privilege('anon','private.dic_first_style_prompt_seen','SELECT')
 or has_function_privilege('anon','public.dic_claim_first_style_prompt(uuid)','EXECUTE')
 then raise exception 'First-style private table/RPC leaked client privilege';end if;
 if not has_function_privilege('authenticated','public.dic_claim_first_style_prompt(uuid)','EXECUTE')
 then raise exception 'Admitted member public RPC missing grant';end if;
 insert into auth.users(id,aud,role,email) values
  (owner_a,'authenticated','authenticated',owner_a::text||'@example.invalid'),
  (owner_b,'authenticated','authenticated',owner_b::text||'@example.invalid'),
  (pending_member,'authenticated','authenticated',pending_member::text||'@example.invalid');
 update private.beta_members set enabled=true,admitted_at=now()
 where owner_id in(owner_a,owner_b);
 insert into public.coffees(name,roaster,verification_state)
 values('Synthetic First Style','Synthetic Roaster','verified') returning id into coffee;
 insert into public.library_entries(owner_id,coffee_id) values(owner_a,coffee) returning id into entry_a;
 insert into public.library_entries(owner_id,coffee_id) values(owner_b,coffee) returning id into entry_b;
 insert into public.library_entries(owner_id,coffee_id) values(owner_a,coffee) returning id into entry_shot;
 insert into public.setups(id,owner_id,name) values(setup_a,owner_a,'Synthetic prompt setup');
 insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model)
 values(version_a,owner_a,setup_a,'Synthetic machine','Synthetic grinder');
 update public.setups set active_version_id=version_a where id=setup_a;
 insert into public.grinder_calibrations(id,owner_id,setup_id,grinder_model,finest_setting,coarsest_setting)
 values(calibration_a,owner_a,setup_a,'Synthetic grinder',0,10);
 insert into public.baskets(id,owner_id,setup_id,name)
 values(basket_a,owner_a,setup_a,'Synthetic basket');
 insert into public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g)
 values(basket_version_a,owner_a,setup_a,basket_a,18);
 insert into public.shots(owner_id,library_entry_id,setup_id,setup_version_id,
  basket_version_id,calibration_id,style,pulled_at,dose_g,yield_g,time_s,
  grind_setting,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
 values(owner_a,entry_shot,setup_a,version_a,basket_version_a,calibration_a,
  'Traditional',now(),18,36,26,2,3,3,3,3,1,'{}');

 -- Device A: first admitted request succeeds, repeat (another device) is already consumed.
 perform set_config('request.jwt.claim.sub',owner_a::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 result:=public.dic_claim_first_style_prompt(entry_a);
 if result->>'ok'<>'true' or result->>'show'<>'true'
 then raise exception 'Owner first claimed prompt not shown: %',result;end if;
 result:=public.dic_claim_first_style_prompt(entry_a);
 if result->>'show'<>'false' then raise exception 'Same owner claim not idempotent: %',result;end if;
 result:=public.dic_claim_first_style_prompt(entry_shot);
 if result->>'show'<>'false' then raise exception 'Existing shot should prevent prompt: %',result;end if;
 denied:=false;
 begin perform public.dic_claim_first_style_prompt(entry_b);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Foreign library entry prompted or mutated';end if;
 denied:=false;
 begin perform public.dic_claim_first_style_prompt(gen_random_uuid());
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Nonexistent library entry accepted';end if;
 execute 'reset role';

 -- Account B has a separate first use even when the canonical coffee is shared.
 perform set_config('request.jwt.claim.sub',owner_b::text,true);
 execute 'set local role authenticated';
 result:=public.dic_claim_first_style_prompt(entry_b);
 if result->>'show'<>'true' then raise exception 'Other owner prompt was incorrectly consumed: %',result;end if;
 denied:=false;
 begin perform private.dic_claim_first_style_prompt_impl(entry_a);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Private helper bypassed foreign-owner check';end if;
 execute 'reset role';

 -- Account not admitted into the beta cannot claim any prompt.
 perform set_config('request.jwt.claim.sub',pending_member::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.dic_claim_first_style_prompt(entry_a);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unadmitted member passed first-style admission';end if;
 execute 'reset role';

 select count(*) into seen_count from private.dic_first_style_prompt_seen
 where owner_id in(owner_a,owner_b,pending_member);
 if seen_count<>2 then raise exception 'Unexpected first-style receipt count: %',seen_count;end if;
 if exists(select 1 from private.dic_first_style_prompt_seen
  where owner_id=owner_a and library_entry_id=entry_shot)
 then raise exception 'Shot-bearing coffee incorrectly consumed a prompt';end if;
 raise notice 'PASS: first-use, idempotence, existing-shot suppression, account isolation, denied callers, private grant and rollback.';
end $first_style$;
rollback;
