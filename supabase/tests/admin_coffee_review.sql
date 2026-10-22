-- Disconnected PostgreSQL only; all test accounts and records ROLLED BACK.
begin;
do $admin_coffee$
declare
 admin_id uuid:='10000000-0000-4000-8000-000000000001';
 member_id uuid:=gen_random_uuid(); member2 uuid:=gen_random_uuid();
 reviewed_coffee uuid; linked_library uuid; merge_submission uuid;
 pending_id uuid; hold_id uuid; original_library uuid; got jsonb; status text;
 rev bigint; denied boolean; before_shots integer; before_coffees integer;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable database only';end if;
 select count(*) into before_shots from public.shots;
 select count(*) into before_coffees from public.coffees;
 insert into auth.users(id,aud,role,email)
 values(member_id,'authenticated','authenticated',member_id::text||'@example.invalid');
 insert into private.beta_members(owner_id,enabled,admitted_at)
 values(member_id,true,now())
 on conflict(owner_id) do update set enabled=true,admitted_at=now();

 -- A genuine unresolved duplicate can be Pending even under the new
 -- distinct-coffee auto-approval rule. Construct a synthetic old Pending
 -- directly rather than incorrectly expecting an otherwise unique new
 -- member coffee to remain Pending.
 insert into public.coffee_submissions(owner_id,source_url,proposed_data)
 values(member_id,'https://sweetbloomcoffee.com/products/test-admin-manual-only',
 jsonb_build_object('name','Admin Manual 2026 Unique','roaster','Sweet Bloom'))
 returning id into pending_id;
 original_library:=gen_random_uuid();
 insert into public.library_entries(id,owner_id,submission_id)
 values(original_library,member_id,pending_id);
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
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
 got:=public.dic_admin_review_coffee(pending_id,rev,'approve',null,null);
 if got->>'ok'<>'true' or got->>'status'<>'verified' then
  raise exception 'Admin reviewed distinct coffee not approved: %',got;
 end if;
 execute 'reset role';

 if not exists(select 1 from public.library_entries where id=original_library
    and owner_id=member_id and submission_id is null and coffee_id=(got->>'coffee_id')::uuid)
 then raise exception 'Existing member library identity was not preserved';end if;
 reviewed_coffee:=(got->>'coffee_id')::uuid;
 if not exists(select 1 from public.admin_reviews where submission_id=pending_id
     and reviewer_id=admin_id and action='approve' and reason='Administrator approved distinct coffee')
 then raise exception 'Administrator approval audit absent';end if;
 if not exists(select 1 from private.dic_coffee_audit where submission_id=pending_id
     and event_kind='admin_reviewed')
 then raise exception 'Manual approval provenance audit absent';end if;
 if not exists(select 1 from public.coffee_sources where coffee_id=(got->>'coffee_id')::uuid
     and source_kind='label')
 then raise exception 'Manual review falsely claimed independently checked roaster page';end if;
 if (select count(*) from public.shots)<>before_shots then raise exception 'Existing shots changed';end if;
 if (select count(*) from public.coffees)<>before_coffees+1 then raise exception 'Unexpected canonical count';end if;


 -- Review a genuine same-release duplicate submitted by another admitted
 -- member. The stable personal entry ID must be relinked, not deleted.
 insert into auth.users(id,aud,role,email)
 values(member2,'authenticated','authenticated',member2::text||'@example.invalid');
 insert into private.beta_members(owner_id,enabled,admitted_at)
 values(member2,true,now()) on conflict(owner_id)
 do update set enabled=true,admitted_at=now();
 insert into public.coffee_submissions(owner_id,proposed_data)
 values(member2,jsonb_build_object('name','Admin Manual 2026 Unique',
  'roaster','Sweet Bloom')) returning id into merge_submission;
 linked_library:=gen_random_uuid();
 insert into public.library_entries(id,owner_id,submission_id)
 values(linked_library,member2,merge_submission);
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 execute 'set local role authenticated';
 select revision into rev from public.coffee_submissions where id=merge_submission;
 got:=public.dic_admin_coffee_candidates(merge_submission);
 if not (got->'candidates') @> jsonb_build_array(jsonb_build_object(
   'id',reviewed_coffee,'name','Admin Manual 2026 Unique','roaster','Sweet Bloom',
   'release_label',null,'origin',null,'process',null)) then
   raise exception 'Same release was not shown to administrator for merge: %',got;
 end if;
 got:=public.dic_admin_review_coffee(merge_submission,rev,'merge',
  'Same coffee release and roaster, manually checked',reviewed_coffee);
 if got->>'ok'<>'true' or got->>'coffee_id'<>reviewed_coffee::text
    or got->>'reused'<>'true' then
  raise exception 'Authorized reviewed canonical merge failed: %',got;end if;
 execute 'reset role';
 if not exists(select 1 from public.library_entries
   where id=linked_library and owner_id=member2 and coffee_id=reviewed_coffee
      and submission_id is null)
 then raise exception 'Manual duplicate merge changed personal library identity';end if;
 if not exists(select 1 from private.dic_coffee_audit
   where submission_id=merge_submission and event_kind='admin_reviewed_merge')
 then raise exception 'Manual duplicate merge provenance was missing';end if;
 if not exists(select 1 from public.admin_reviews
   where submission_id=merge_submission and reviewer_id=admin_id and action='merge')
 then raise exception 'Manual duplicate merge administrator decision missing';end if;
 if (select count(*) from public.coffees)<>before_coffees+1 then
  raise exception 'Manual duplicate merge created an additional canonical';end if;

 -- An existing unresolved conflict can be held without deleting member data.
 insert into public.coffee_submissions(owner_id,proposed_data)
 values(member_id,jsonb_build_object('name','Potential Conflict 2026','roaster','Unlisted Roaster'))
 returning id into hold_id;
 insert into public.library_entries(id,owner_id,submission_id)
 values(gen_random_uuid(),member_id,hold_id);

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
