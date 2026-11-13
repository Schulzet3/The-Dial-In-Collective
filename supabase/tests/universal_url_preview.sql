-- Isolated transaction-only tests. Never run against production.
begin;
do $test$
declare
 owner_account uuid;
 member_account uuid:=gen_random_uuid();
 new_account uuid:=gen_random_uuid();
 got jsonb;
 blocked boolean;
begin
 select owner_id into strict owner_account from private.app_admins limit 1;
 -- Admin must be independently checked against current Auth/admission/role.
 perform set_config('request.jwt.claim.sub',owner_account::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'allowed' is distinct from 'true' or got->>'unlimited' is distinct from 'true'
 then raise exception 'Admin first universal preview denied: %',got; end if;
 got:=public.dic_claim_universal_preview();
 if got->>'allowed' is distinct from 'true' or got->>'unlimited' is distinct from 'true'
 then raise exception 'Admin immediate retry restricted: %',got; end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.role','service_role',true);
 execute 'set local role service_role';
 got:=public.dic_url_preview_claim(owner_account);
 if got->>'allowed' is distinct from 'true' or got->>'unlimited' is distinct from 'true'
 then raise exception 'Trusted worker restricted Admin: %',got;end if;
 execute 'reset role';
 if exists(select 1 from private.dic_url_preview_attempts where owner_id=owner_account)
 then raise exception 'Admin account quota state unexpectedly created';end if;

 -- Nonadmin admitted member: BOTH preview routes share a 15-second cooldown,
 -- 12 fresh claims per 24-hour window and account-specific state.
 insert into auth.users(id,email,email_confirmed_at)
 values(member_account,member_account::text||'@example.invalid',now());
 insert into private.beta_members(owner_id,enabled,admitted_at)
 values(member_account,true,now())
 on conflict(owner_id) do update set enabled=true,admitted_at=excluded.admitted_at;
 perform set_config('request.jwt.claim.sub',member_account::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'allowed' is distinct from 'true' or got ? 'unlimited'
 then raise exception 'First ordinary member claim failed: %',got; end if;
 got:=public.dic_claim_universal_preview();
 if got->>'reason' is distinct from 'preview_cooldown'
 then raise exception 'Member immediate universal retry did not throttle: %',got; end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.role','service_role',true);
 execute 'set local role service_role';
 got:=public.dic_url_preview_claim(member_account);
 if got->>'reason' is distinct from 'preview_cooldown'
 then raise exception 'Trusted worker bypassed member cooldown: %',got;end if;
 execute 'reset role';

 update private.dic_url_preview_attempts
 set last_attempt_at=now()-interval '16 seconds' where owner_id=member_account;
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'allowed' is distinct from 'true' then raise exception 'Member cooldown did not expire: %',got; end if;
 execute 'reset role';
 update private.dic_url_preview_attempts
 set last_attempt_at=now()-interval '16 seconds' where owner_id=member_account;
 perform set_config('request.jwt.claim.role','service_role',true);
 execute 'set local role service_role';
 got:=public.dic_url_preview_claim(member_account);
 if got->>'allowed' is distinct from 'true'
 then raise exception 'Shared trusted worker next claim failed: %',got;end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'reason' is distinct from 'preview_cooldown'
 then raise exception 'Universal path bypassed trusted worker cooldown: %',got;end if;
 execute 'reset role';

 -- 12th shared member claim allowed, 13th denied.
 update private.dic_url_preview_attempts
 set attempts=11,last_attempt_at=now()-interval '16 seconds' where owner_id=member_account;
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'allowed' is distinct from 'true'
 then raise exception 'Member 12th account claim denied: %',got;end if;
 execute 'reset role';
 if (select attempts from private.dic_url_preview_attempts where owner_id=member_account)<>12
 then raise exception 'Member daily counter did not reach 12';end if;
 update private.dic_url_preview_attempts
 set attempts=12,last_attempt_at=now()-interval '16 seconds' where owner_id=member_account;
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'reason' is distinct from 'daily_preview_limit'
 then raise exception 'Member 13th claim not capped: %',got; end if;
 execute 'reset role';

 -- JSON-only JWT claims (PostgREST format) still admit real members.
 update private.dic_url_preview_attempts
 set attempts=0,last_attempt_at=now()-interval '16 seconds' where owner_id=member_account;
 perform set_config('request.jwt.claim.role','',true);
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('role','authenticated','sub',member_account)::text,true);
 execute 'set local role authenticated';
 if auth.role() is distinct from 'authenticated'
   or auth.uid() is distinct from member_account
   or (public.dic_session_status()->>'admitted') is distinct from 'true'
 then raise exception 'JSON-claims-only admitted member context failed'; end if;
 got:=public.dic_claim_universal_preview();
 if got->>'allowed' is distinct from 'true'
 then raise exception 'JSON-only member claim rejected: %',got; end if;
 got:=public.dic_claim_universal_preview();
 if got->>'reason' is distinct from 'preview_cooldown'
 then raise exception 'JSON-only member bypassed 15s cooldown: %',got;end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform set_config('request.jwt.claim.sub',owner_account::text,true);
 perform set_config('request.jwt.claims','',true);

 -- Unadmitted signed-in and anon callers never create any quota record.
 insert into auth.users(id,email,email_confirmed_at)
 values(new_account,new_account::text||'@example.invalid',now());
 if exists(select 1 from private.beta_members where owner_id=new_account and enabled)
 then raise exception 'Synthetic account unexpectedly admitted';end if;
 perform set_config('request.jwt.claim.sub',new_account::text,true);
 execute 'set local role authenticated';
 got:=public.dic_claim_universal_preview();
 if got->>'reason' is distinct from 'admitted_member_required'
 then raise exception 'Unadmitted member bypassed gate: %',got;end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.role','anon',true);
 execute 'set local role anon';
 blocked:=false;
 begin perform public.dic_claim_universal_preview();
 exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous role can invoke restricted preview claim';end if;
 execute 'reset role';
 if (select count(*) from private.dic_url_preview_attempts where owner_id=new_account)<>0
 then raise exception 'Unadmitted account created quota state';end if;
end $test$;
select 'PASS: Admin unlimited trusted/universal, member 15s cross-route and 12/day, JSON JWT admission and anonymous denial' as result;
rollback;
