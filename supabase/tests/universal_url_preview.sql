-- Isolated transaction-only tests. Never run against production.
begin;
do $test$
declare
 owner_account uuid;
 new_account uuid:=gen_random_uuid();
 got jsonb;
 blocked boolean;
begin
 select owner_id into strict owner_account from private.app_admins limit 1;
 perform set_config('request.jwt.claim.sub',owner_account::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'allowed' is distinct from 'true' then raise exception 'Owner preview claim failed: %',got; end if;
 got:=public.dic_claim_universal_preview();
 if got->>'reason' is distinct from 'preview_cooldown' then raise exception 'Immediate repeat not limited: %',got; end if;
 execute 'reset role';

 update private.dic_universal_preview_attempts
 set last_attempt_at=now()-interval '4 seconds' where owner_id=owner_account;
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'allowed' is distinct from 'true' then raise exception 'Cooldown did not reset: %',got; end if;
 execute 'reset role';

 update private.dic_universal_preview_attempts
 set attempts=60,last_attempt_at=now()-interval '5 seconds' where owner_id=owner_account;
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'reason' is distinct from 'daily_preview_limit' then raise exception 'Daily cap not enforced: %',got; end if;
 execute 'reset role';

 insert into auth.users(id,email,email_confirmed_at) values
 (new_account,new_account::text||'@example.invalid',now());
 if exists(select 1 from private.beta_members where owner_id=new_account and enabled)
 then raise exception 'Synthetic account unexpectedly admitted';end if;
 perform set_config('request.jwt.claim.sub',new_account::text,true);
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'reason' is distinct from 'admitted_member_required'
 then raise exception 'Unadmitted account bypassed membership: %',got;end if;
 execute 'reset role';

 perform set_config('request.jwt.claim.role','anon',true);
 execute 'set local role anon';
 blocked:=false;
 begin perform public.dic_claim_universal_preview();
 exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous role can invoke authenticated-only preview claim';end if;
 execute 'reset role';

 if (select count(*) from private.dic_universal_preview_attempts where owner_id=new_account)<>0
 then raise exception 'Rejected account created quota state';end if;
end $test$;
select 'PASS: independent universal preview quota, role admission, cooldown and daily cap' as result;
rollback;
