-- Disconnected PostgreSQL only; all test accounts and records ROLLED BACK.
begin;
do $admin_coffee$
declare
 admin_id uuid:='10000000-0000-4000-8000-000000000001';
 member_id uuid:=gen_random_uuid();
 pending_id uuid; hold_id uuid; original_library uuid; got jsonb; status text;
 rev bigint; denied boolean; before_shots integer; before_coffees integer;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable database only';end if;
 select count(*) into before_shots from public.shots;
 select count(*) into before_coffees from public.coffees;
 insert into auth.users(id,aud,role,email)
 values(member_id,'authenticated','authenticated',member_id::text||'@example.invalid');
 insert into private.beta_members(owner_id,enabled,admitted_at)
 values(member_id,true,now());

 -- Ordinary member: save genuine Pending, no automatic verification from URL alone.
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 got:=public.dic_apply_client_change(member_id,gen_random_uuid(),'submit_coffee',
 jsonb_build_object('library_entry_id',gen_random_uuid(),
 'source_url','https://sweetbloomcoffee.com/products/test-admin-manual-only',
 'proposed_data',jsonb_build_object('name','Admin Manual 2026 Unique','roaster','Sweet Bloom')));
 if got->>'status'<>'pending' then raise exception 'URL alone incorrectly verified %',got;end if;
 pending_id:=(got->>'submission_id')::uuid;
 original_library:=(got->>'library_entry_id')::uuid;
 denied:=false;
 begin
  perform public.dic_admin_review_coffee(pending_id,1,'approve','Ordinary user must be denied',null);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Member approved own Pending through admin RPC';end if;
 denied:=false;
 begin
  perform public.dic_admin_coffee_candidates(pending_id);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Member could read administrator candidates';end if;
 execute 'reset role';

 -- Registered administrator may reject stale version and then review intentionally.
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select revision into rev from public.coffee_submissions where id=pending_id;
 denied:=false;
 begin
  perform public.dic_admin_review_coffee(pending_id,rev+1,'approve','Stale admin attempt blocked',null);
 exception when serialization_failure then denied:=true;
 end;
 if not denied then raise exception 'Stale admin revision was accepted';end if;
 got:=public.dic_admin_coffee_candidates(pending_id);
 if jsonb_typeof(got->'candidates')<>'array' then raise exception 'Candidates missing';end if;
 got:=public.dic_admin_review_coffee(pending_id,rev,'approve','Administrator checked original source label',null);
 if got->>'ok'<>'true' or got->>'status'<>'verified' then
  raise exception 'Admin reviewed distinct coffee not approved: %',got;
 end if;
 execute 'reset role';

 if not exists(select 1 from public.library_entries where id=original_library
    and owner_id=member_id and submission_id is null and coffee_id=(got->>'coffee_id')::uuid)
 then raise exception 'Existing member library identity was not preserved';end if;
 if not exists(select 1 from public.admin_reviews where submission_id=pending_id
     and reviewer_id=admin_id and action='approve')
 then raise exception 'Administrator approval audit absent';end if;
 if not exists(select 1 from private.dic_coffee_audit where submission_id=pending_id
     and event_kind='admin_reviewed')
 then raise exception 'Manual approval provenance audit absent';end if;
 if not exists(select 1 from public.coffee_sources where coffee_id=(got->>'coffee_id')::uuid
     and source_kind='label')
 then raise exception 'Manual review falsely claimed independently checked roaster page';end if;
 if (select count(*) from public.shots)<>before_shots then raise exception 'Existing shots changed';end if;
 if (select count(*) from public.coffees)<>before_coffees+1 then raise exception 'Unexpected canonical count';end if;

 -- Another Pending record can be held without deleting member data.
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 got:=public.dic_apply_client_change(member_id,gen_random_uuid(),'submit_coffee',
 jsonb_build_object('library_entry_id',gen_random_uuid(),
 'proposed_data',jsonb_build_object('name','Needs Evidence 2026 Unique','roaster','Unlisted Roaster')));
 if got->>'status'<>'pending' then raise exception 'Expected second Pending';end if;
 hold_id:=(got->>'submission_id')::uuid;
 execute 'reset role';

 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select revision into rev from public.coffee_submissions where id=hold_id;
 got:=public.dic_admin_review_coffee(hold_id,rev,'hold','Need exact official product release source',null);
 if got->>'status'<>'conflict' then raise exception 'Hold did not mark conflict';end if;
 execute 'reset role';
 if not exists(select 1 from public.library_entries where owner_id=member_id and submission_id=hold_id)
 then raise exception 'Hold orphaned Pending member coffee';end if;
 if not exists(select 1 from public.admin_reviews where submission_id=hold_id and action='hold')
 then raise exception 'Hold audit missing';end if;

 -- Anon can never call review endpoints even when JWT carries a prior admin identity.
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 execute 'set local role anon';
 denied:=false;
 begin perform public.dic_admin_review_coffee(hold_id,rev,'approve','Anonymous denied always',null);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Anon reached admin review RPC';end if;
 execute 'reset role';
 if has_function_privilege('anon','public.dic_admin_review_coffee(uuid,bigint,text,text,uuid)','EXECUTE') then
   raise exception 'Anon granted admin review execute';end if;
end $admin_coffee$;
select 'PASS: admin-only review, stale revision refusal, evidence labeling, safe hold, original library, anon/member denial; rolled back' result;
rollback;
