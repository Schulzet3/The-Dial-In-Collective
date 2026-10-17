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
 perform set_config('request.jwt.claim.role','service_role',true);
 execute 'set local role service_role';
 got:=public.dic_url_preview_claim(owner_account);
 if got->>'reason' is distinct from 'preview_cooldown'
 then raise exception 'Official preview bypassed generic preview cooldown: %',got;end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.role','authenticated',true);execute 'set local role authenticated';
 execute 'reset role';

 update private.dic_url_preview_attempts
 set last_attempt_at=now()-interval '31 seconds' where owner_id=owner_account;
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'allowed' is distinct from 'true' then raise exception 'Cooldown did not reset: %',got; end if;
 execute 'reset role';
 update private.dic_url_preview_attempts set last_attempt_at=now()-interval '31 seconds'
 where owner_id=owner_account;
 perform set_config('request.jwt.claim.role','service_role',true);
 execute 'set local role service_role';
 got:=public.dic_url_preview_claim(owner_account);
 if got->>'allowed' is distinct from 'true'
 then raise exception 'Shared official preview claim failed: %',got;end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.role','authenticated',true);execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'reason' is distinct from 'preview_cooldown'
 then raise exception 'Generic preview bypassed official preview cooldown: %',got;end if;
 execute 'reset role';

 -- The 12th shared claim succeeds, then every route denies claim 13.
 update private.dic_url_preview_attempts
 set attempts=11,last_attempt_at=now()-interval '31 seconds' where owner_id=owner_account;
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'allowed' is distinct from 'true'
 then raise exception '12th account preview claim failed: %',got;end if;
 execute 'reset role';
 if (select attempts from private.dic_url_preview_attempts where owner_id=owner_account)<>12
 then raise exception 'Boundary claim did not set exactly 12';end if;

 update private.dic_url_preview_attempts
 set attempts=12,last_attempt_at=now()-interval '31 seconds' where owner_id=owner_account;
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'reason' is distinct from 'daily_preview_limit' then raise exception 'Daily cap not enforced: %',got; end if;
 execute 'reset role';

 -- PostgREST may set only the JSON claims GUC, not individual legacy role
 -- or subject settings. Real admitted accounts must not be rejected as 503.
 update private.dic_url_preview_attempts set attempts=0,
  last_attempt_at=now()-interval '31 seconds' where owner_id=owner_account;
 perform set_config('request.jwt.claim.role','',true);
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('role','authenticated','sub',owner_account)::text,true);
 execute 'set local role authenticated';
 if auth.role() is distinct from 'authenticated'
  or auth.uid() is distinct from owner_account
  or (public.dic_session_status()->>'admitted') is distinct from 'true'
 then raise exception 'JSON-claims-only real member context failed'; end if;
 got:=public.dic_claim_universal_preview();
 if got->>'allowed' is distinct from 'true'
 then raise exception 'JSON-only JWT role rejected real member: %',got; end if;
 got:=public.dic_claim_universal_preview();
 if got->>'reason' is distinct from 'preview_cooldown'
 then raise exception 'JSON-only JWT claim could bypass 30-sec throttle';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform set_config('request.jwt.claim.sub',owner_account::text,true);
 perform set_config('request.jwt.claims','',true);

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

 if (select count(*) from private.dic_url_preview_attempts where owner_id=new_account)<>0
 then raise exception 'Rejected account created quota state';end if;
end $test$;
select 'PASS: JSON-only JWT admitted-member authorization, cross-route 30-second cooldown, admission and daily cap' as result;
rollback;
