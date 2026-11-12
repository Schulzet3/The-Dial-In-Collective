-- Issue #1756: migration contract, permanent existing account, new signup
-- email verified and admin-only admission. Synthetic identities, full rollback.
begin;
do $test$
declare
 admin_id uuid:='10000000-0000-4000-8000-000000000001';
 member_id uuid:=gen_random_uuid(); pending_id uuid:=gen_random_uuid();
 unverified_id uuid:=gen_random_uuid(); decision jsonb; queue jsonb; denied boolean; state jsonb;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci only';end if;
 insert into auth.users(id,aud,role,email,email_confirmed_at)
 values(member_id,'authenticated','authenticated','admitted@ci.example.invalid',now()),
       (pending_id,'authenticated','authenticated','pending@ci.example.invalid',now()),
       (unverified_id,'authenticated','authenticated','unverified@ci.example.invalid',null);
 update private.beta_members set enabled=true,admitted_at=now(),signup_review_state='approved' where owner_id=member_id;
 if (select enabled from private.beta_members where owner_id=member_id) is distinct from true
   or not exists (select 1 from private.app_admins where owner_id=admin_id) then
  raise exception 'Existing admissions or owner protection changed';end if;
 if exists(select 1 from private.beta_members where owner_id in(pending_id,unverified_id)
   and (enabled or admitted_at is not null or signup_review_state<>'pending')) then
  raise exception 'Auth trigger auto-admitted new signup';end if;
 if to_regclass('private.beta_invites') is not null or
    to_regprocedure('public.dic_redeem_invite(text)') is not null or
    to_regprocedure('public.dic_admin_issue_invite(text)') is not null then
  raise exception 'Old invitation tokens or RPCs remain';end if;
 -- #509 R140: even trusted writes cannot enable a pending/unadmitted account.
 -- An invalid synthetic update MUST be rejected by the table constraint.
 denied:=false;
 begin
  update private.beta_members set enabled=true where owner_id=unverified_id;
 exception when check_violation then denied:=true;
 end;
 if not denied then raise exception 'Enabled-without-admission constraint absent';end if;
 perform set_config('request.jwt.claim.sub',unverified_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',unverified_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if private.is_member() or (public.dic_session_status()->>'admitted') is distinct from 'false' then
  raise exception 'Enabled-but-unadmitted synthetic signup passed the member gate';
 end if;
 execute 'reset role';
 -- A confirmed new user has identity but no authorization or admin data.
 perform set_config('request.jwt.claim.sub',pending_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',pending_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 state:=public.dic_session_status();
 if state->>'approvalState'<>'pending' or state->>'admitted'<>'false' then
  raise exception 'Pending user was able to enter before approval';end if;
 denied:=false;
 begin perform public.dic_admin_signup_requests(0,50);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Pending user read Admin signup queue';end if;
 denied:=false;
 begin perform public.dic_admin_review_signup(unverified_id,'approve','pending');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Pending user approved another account';end if;
 execute 'reset role';
 -- Admitted ordinary member cannot approve either.
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.dic_admin_review_signup(pending_id,'approve','pending');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Ordinary member approved pending signup';end if;
 execute 'reset role';
 -- Operator may read only scoped new-account listing.
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 queue:=public.dic_admin_signup_requests(0,50);
 if (queue->>'total')::integer<2 or not exists(
  select 1 from jsonb_array_elements(queue->'items') row where row->>'id'=pending_id::text
   and row->>'email_verified'='true') then
  raise exception 'Admin verified pending signup not listed';end if;
 decision:=public.dic_admin_review_signup(unverified_id,'approve','pending');
 if decision->>'code'<>'verify_email_first' then
  raise exception 'Unverified email was approved';end if;
 decision:=public.dic_admin_review_signup(pending_id,'approve','pending');
 if decision->>'decision'<>'approve' then
  raise exception 'Verified account could not be approved';end if;
 decision:=public.dic_admin_review_signup(pending_id,'reject','pending');
 if decision->>'code'<>'stale_review' then
  raise exception 'Repeated review was not rejected';end if;
 decision:=public.dic_admin_review_signup(unverified_id,'reject','pending');
 if decision->>'decision'<>'reject' then
  raise exception 'Reject did not preserve Auth while withholding admission';end if;
 denied:=false;
 begin perform public.dic_admin_review_signup(admin_id,'reject','pending');
 exception when insufficient_privilege or invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Admin self-account not protected';end if;
 execute 'reset role';
 -- Only the disposable privileged harness can inspect protected private rows.
 if (select enabled from private.beta_members where owner_id=pending_id) is distinct from true then
  raise exception 'Approved signup was not admitted';end if;
 if (select signup_review_state from private.beta_members where owner_id=unverified_id)<>'rejected' then
  raise exception 'Rejected signup was admitted';end if;
 if (select count(*) from auth.users where id in(member_id,pending_id,unverified_id))<>3 then
  raise exception 'Review deleted an Auth identity';end if;
 if (select count(*) from private.dic_signup_review_events ev where ev.member_id in(pending_id,unverified_id))<>2 then
  raise exception 'Signup review audit missing';end if;
 if has_function_privilege('anon','public.dic_admin_signup_requests(integer,integer)','EXECUTE')
    or has_function_privilege('anon','public.dic_admin_review_signup(uuid,text,text)','EXECUTE') then
  raise exception 'Anonymous role can enumerate/review new accounts';end if;
 if exists(select 1 from private.beta_members where owner_id=member_id and not enabled) then
  raise exception 'Existing member was disabled';end if;
end $test$;
select 'PASS: admin-verified signup admission, rejection, admin security, legacy code retirement, existing accounts preserved; rollback' as result;
rollback;
