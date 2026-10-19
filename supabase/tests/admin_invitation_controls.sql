-- Synthetic accounts, reusable and one-use tokens, authorization, existing account
-- permanence. All inserted data is in a transaction rolled back after tests.
begin;
do $test$
declare
 admin_id uuid:='10000000-0000-4000-8000-000000000001';
 member_id uuid:='20000000-0000-4000-8000-000000000001';
 outsider_id uuid:='20000000-0000-4000-8000-000000000002';
 third_id uuid:='20000000-0000-4000-8000-000000000003';
 fourth_id uuid:='20000000-0000-4000-8000-000000000004';
 token text;
 permanent_token text;
 issued jsonb;
 listing jsonb;
 id_single uuid;
 id_reusable uuid;
 denied boolean;
 result jsonb;
begin
 if current_database()<>'dic_ci' then
  raise exception 'Invitation regressions must run in disposable dic_ci only';
 end if;
 insert into auth.users(id,aud,role,email,email_confirmed_at)
 values
  (member_id,'authenticated','authenticated','member-invite@ci.example.invalid',now()),
  (outsider_id,'authenticated','authenticated','outsider-invite@ci.example.invalid',now()),
  (third_id,'authenticated','authenticated','third-invite@ci.example.invalid',now()),
  (fourth_id,'authenticated','authenticated','fourth-invite@ci.example.invalid',now());
 update private.beta_members set enabled=true,admitted_at=now() where owner_id=member_id;
 if (select count(*) from private.beta_members where enabled and admitted_at is not null)<2 then
  raise exception 'Real admittance model not seeded';
 end if;

 -- An admitted ordinary member is forbidden from listing or issuing codes.
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.dic_admin_access_overview();
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Nonadmin read invitation metadata'; end if;
 denied:=false;
 begin perform public.dic_admin_issue_invite('unapproved',null);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Nonadmin generated invite'; end if;
 denied:=false;
 begin perform public.dic_admin_set_member_access(outsider_id,true);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Nonadmin granted access'; end if;
 execute 'reset role';

 -- Owner stays admitted admin, no re-invite required and no expiry column.
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if not private.is_admin() then raise exception 'Admin role not persistent'; end if;
 issued:=public.dic_admin_issue_invite('First tester',1);
 token:=issued->>'invite_code';
 id_single:=(issued->>'id')::uuid;
 if token !~ '^dic-[a-f0-9]{64}$' or (issued->>'max_uses')::int<>1 then
  raise exception 'One-use admin invitation not high-entropy';
 end if;
 issued:=public.dic_admin_issue_invite('Reusable group',null);
 permanent_token:=issued->>'invite_code';
 id_reusable:=(issued->>'id')::uuid;
 if permanent_token !~ '^dic-[a-f0-9]{64}$' or issued->'max_uses'<>'null'::jsonb then
  raise exception 'Never-expiring reusable invitation incorrect';
 end if;
 listing:=public.dic_admin_access_overview();
 if jsonb_array_length(listing->'invites')<2 or jsonb_array_length(listing->'members')<2 then
  raise exception 'Admin overview incomplete';
 end if;
 if listing::text like '%'||token||'%' or listing::text like '%'||permanent_token||'%' then
  raise exception 'Plaintext invitation leaked in overview';
 end if;
 if not exists(select 1 from jsonb_array_elements(listing->'members') x
   where x->>'email'='owner@ci.example.invalid' and x->>'admin'='true') then
  raise exception 'Administrator not marked protected';
 end if;
 denied:=false;
 begin perform public.dic_admin_set_member_access(admin_id,false);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied or not private.is_admin() then
  raise exception 'Owner administrator could be disabled';
 end if;
 execute 'reset role';

 -- Storage contains ONLY hash, no plaintext. Both policies never expire.
 if exists(select 1 from private.beta_invites where id in (id_single,id_reusable)
 and (expires_at is not null or token_hash !~ '^[a-f0-9]{64}$')) then
  raise exception 'Invite stores expiration or invalid token hash';
 end if;
 if (select token_hash from private.beta_invites where id=id_single)
  <>encode(sha256(convert_to(token,'UTF8')),'hex') then
  raise exception 'Admin invite did not store SHA256 of returned token';
 end if;
 if (select count(*) from private.admin_access_events where action='issue_invite')<2 then
  raise exception 'Issued invitation has no secret-free audit receipt';
 end if;

 -- One-use invite admits the first confirmed outsider exactly once.
 perform set_config('request.jwt.claim.sub',outsider_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.dic_redeem_invite(token);
 if result->>'ok'<>'true' or not private.is_member() then raise exception 'Single token admission failed'; end if;
 if (public.dic_redeem_invite(token)->>'ok')<>'true' then
  raise exception 'Already-admitted account prompted to re-invite';
 end if;
 execute 'reset role';
 if (select uses from private.beta_invites where id=id_single)<>1 then
  raise exception 'Token reuse unexpectedly consumed uses';
 end if;
 perform set_config('request.jwt.claim.sub',third_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',third_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if (public.dic_redeem_invite(token)->>'ok')<>'false' then
  raise exception 'Spent one-use token admitted another user';
 end if;
 result:=public.dic_redeem_invite(permanent_token);
 if result->>'ok'<>'true' then raise exception 'Reusable code not redeemable'; end if;
 execute 'reset role';

 -- Reusable code also admits another member until it is revoked.
 perform set_config('request.jwt.claim.sub',fourth_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',fourth_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.dic_redeem_invite(permanent_token);
 if result->>'ok'<>'true' then raise exception 'Reusable code stopped prematurely'; end if;
 execute 'reset role';

 -- After revocation: permanently admitted accounts remain admitted.
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.dic_admin_revoke_invite(id_reusable);
 if result->>'ok'<>'true' then raise exception 'Revoke code failed'; end if;
 if (public.dic_admin_revoke_invite(id_reusable)->>'already_revoked')<>'true' then
  raise exception 'Revoke not idempotent';
 end if;
 result:=public.dic_admin_set_member_access(outsider_id,false);
 if result->>'enabled'<>'false' then raise exception 'Member removal not applied'; end if;
 result:=public.dic_admin_set_member_access(outsider_id,true);
 if result->>'enabled'<>'true' then raise exception 'Member restore failed'; end if;
 if not private.is_admin() then raise exception 'Admin lost permanent access'; end if;
 execute 'reset role';
 if (select uses from private.beta_invites where id=id_reusable)<>2 then
  raise exception 'Existing admitted accounts were unadmitted on code revoke';
 end if;
 if (select count(*) from private.beta_members
  where owner_id in (outsider_id,third_id,fourth_id) and enabled and admitted_at is not null)<>3 then
  raise exception 'Redemption/restore lost lifetime member accounts';
 end if;
 if (select count(*) from private.admin_access_events
  where action in ('revoke_invite','remove_access','restore_access'))<>3 then
  raise exception 'Admin access actions not audited';
 end if;

 -- Nonadmin cannot read even historical revocation states, nor disable another member.
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.dic_admin_revoke_invite(id_single);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Nonadmin revoked another invite'; end if;
 execute 'reset role';

 execute 'set local role anon';
 denied:=false;
 begin perform public.dic_admin_access_overview();
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Anonymous saw admin access list'; end if;
 execute 'reset role';

 if has_function_privilege('anon','public.dic_admin_issue_invite(text,integer)','execute')
 or has_function_privilege('anon','public.dic_admin_access_overview()','execute')
 or has_function_privilege('anon','public.dic_admin_revoke_invite(uuid)','execute')
 or has_function_privilege('anon','public.dic_admin_set_member_access(uuid,boolean)','execute') then
  raise exception 'Anon received privileged admin RPC';
 end if;
end $test$;
select 'PASS: administrator permanent, nonadmin/anon denied, single/reusable never-expiring invites, revoke and nonadmin removal/restore; transaction rolled back' AS result;
rollback;
