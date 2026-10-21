-- All facts below are synthetic, isolated PostgreSQL 17.11 only; ROLLBACK.
begin;
do $duplicate_first$
declare
 u1 uuid:=gen_random_uuid();u2 uuid:=gen_random_uuid();
 req uuid:=gen_random_uuid();cid uuid;second uuid;sid uuid;lid uuid;
 resp jsonb;replayed jsonb;before_shots bigint;before_coffees bigint;
 base_rev bigint;denied boolean;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable fixture only';end if;
 select count(*) into before_shots from public.shots;
 select count(*) into before_coffees from public.coffees;
 insert into auth.users(id,aud,role,email) values
 (u1,'authenticated','authenticated',u1::text||'@example.invalid'),
 (u2,'authenticated','authenticated',u2::text||'@example.invalid');
 insert into private.beta_members(owner_id,enabled,admitted_at)
 values(u1,true,now()),(u2,true,now())
 on conflict(owner_id) do update set enabled=true,admitted_at=now();

 -- Nonadministrator admits a genuinely unique source-URL coffee;
 -- URL is only member-supplied evidence and NOT independently verified.
 perform set_config('request.jwt.claim.sub',u1::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 lid:=gen_random_uuid();
 resp:=public.dic_apply_client_change(u1,req,'submit_coffee',jsonb_build_object(
 'library_entry_id',lid,'source_url','https://example.org/products/caramel-blossom',
 'proposed_data',jsonb_build_object('roaster','Synthetic Test Roaster',
  'name','Caramel Blossom','release_label','2026','origin','Ethiopia','process','Washed')));
 if resp->>'ok'<>'true' or resp->>'status'<>'verified' then
   raise exception 'auto-approved distinct nonadmin FAILED: %',resp;end if;
 cid:=(resp->>'coffee_id')::uuid;
 if not exists (select 1 from public.library_entries where id=lid
  and owner_id=u1 and coffee_id=cid and submission_id is null)
 then raise exception 'Original personal library entry changed or lost'; end if;
 replayed:=public.dic_apply_client_change(u1,req,'submit_coffee',jsonb_build_object(
 'library_entry_id',lid,'source_url','https://example.org/products/caramel-blossom',
 'proposed_data',jsonb_build_object('roaster','Synthetic Test Roaster',
  'name','Caramel Blossom','release_label','2026','origin','Ethiopia','process','Washed')));
 if resp<>replayed then raise exception 'Idempotent same-mutation replay failed'; end if;
 execute 'reset role';
 if not exists(select 1 from private.dic_coffee_audit a
   where a.coffee_id=cid and a.event_kind='member_auto_approved')
 then raise exception 'Member autoapproval audit missing'; end if;
 if not exists(select 1 from public.coffee_sources where coffee_id=cid and source_kind='label')
 or exists(select 1 from public.coffee_sources where coffee_id=cid and source_kind='roaster_page')
 then raise exception 'Unverified member URL falsely claimed trusted official source';end if;


 -- Separate real admitted nonadmin reuse on exact same explicit release.
 perform set_config('request.jwt.claim.sub',u2::text,true);
 execute 'set local role authenticated';
 resp:=public.dic_apply_client_change(u2,gen_random_uuid(),'submit_coffee',
 jsonb_build_object('library_entry_id',gen_random_uuid(),
  'proposed_data',jsonb_build_object('roaster','Synthetic Test Roaster',
  'name','Caramel Blossom','release_label','2026','origin','Ethiopia','process','Washed')));
 if resp->>'status'<>'verified' or (resp->>'coffee_id')::uuid<>cid
  or resp->>'reused'<>'true'
 then raise exception 'Exact same-release canonical auto-reuse failed: %',resp;end if;

 -- Explicitly different harvest is a distinct canonical release even with
 -- same roaster/name, and cannot be silently merged into 2026.
 resp:=public.dic_apply_client_change(u2,gen_random_uuid(),'submit_coffee',
 jsonb_build_object('library_entry_id',gen_random_uuid(),
  'proposed_data',jsonb_build_object('roaster','Synthetic Test Roaster',
  'name','Caramel Blossom','release_label','2027','origin','Ethiopia','process','Washed')));
 if resp->>'ok'<>'true' or resp->>'status'<>'verified' or
    (resp->>'coffee_id')::uuid=cid
 then raise exception 'New explicit harvest not separately auto-approved: %',resp;end if;
 second:=(resp->>'coffee_id')::uuid;

 -- Fuzzy name with missing release is a genuine identity conflict even if
 -- browser claims distinct; must be saved private Pending, not 3rd canonical.
 lid:=gen_random_uuid();
 resp:=public.dic_apply_client_change(u2,gen_random_uuid(),'submit_coffee',
 jsonb_build_object('library_entry_id',lid,'confirmed_distinct',true,
  'proposed_data',jsonb_build_object('roaster','Synthetic Test Roaster',
  'name','Caramel Blossum','origin','Ethiopia')));
 if resp->>'status'<>'pending' or resp->>'possible_duplicate'<>'true'
 then raise exception 'Fuzzy duplicate was not saved Pending: %',resp;end if;
 sid:=(resp->>'submission_id')::uuid;
 if not exists(select 1 from public.library_entries where id=lid
     and submission_id=sid and owner_id=u2 and coffee_id is null)
 then raise exception 'Pending personal coffee was not preserved';end if;

 -- Even if a hostile authenticated member invokes the private helper with
 -- distinct_confirmed=true, it cannot bypass actual existing canonical.
 denied:=false;
 begin
  resp:=private.dic_promote_pending_coffee(sid,'member_auto_approved',
    jsonb_build_object('official_page_confirmed',true,
      'verified_fields',jsonb_build_object('name','Forged Product Data')),true);
  if resp->>'code'='needs_confirmation' then denied:=true;end if;
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then
   raise exception 'Member bypassed duplicate gate via direct confirmed distinct';end if;
 if (select status from public.coffee_submissions where id=sid)<>'pending' then
   raise exception 'Failed member duplicate bypass changed Pending status';end if;

 -- Missing release vs known same-name canonical is ambiguous, not an auto-link.
 resp:=public.dic_apply_client_change(u2,gen_random_uuid(),'submit_coffee',
 jsonb_build_object('library_entry_id',gen_random_uuid(),
  'proposed_data',jsonb_build_object('roaster','Synthetic Test Roaster','name','Caramel Blossom')));
 if resp->>'status'<>'pending' then
   raise exception 'Blank release incorrectly merged/approved against known release: %',resp;end if;
 execute 'reset role';

 -- Member-supplied text, even a forged official_page_confirmed flag
 -- sent through unexpected private-helper access, cannot fabricate trusted
 -- product evidence when autoapproving a genuinely unique canonical entry.
 insert into public.coffee_submissions(owner_id,source_url,proposed_data)
 values(u1,'https://example.org/products/not-really-verified',
 jsonb_build_object('name','Provenance Fixture','roaster','Distinct Fixture Roaster'))
 returning id into sid;
 insert into public.library_entries(id,owner_id,submission_id)
 values(gen_random_uuid(),u1,sid);
 perform set_config('request.jwt.claim.sub',u1::text,true);
 execute 'set local role authenticated';
 resp:=private.dic_promote_pending_coffee(sid,'member_auto_approved',
 jsonb_build_object('official_page_confirmed',true,
  'verified_fields',jsonb_build_object('name','Forged official evidence'),
  'evidence_excerpt','Official verification falsely asserted'),true);
 if resp->>'ok'<>'true' or resp->>'status'<>'verified' then
  raise exception 'Distinct member autoapproval unexpectedly failed';end if;
 execute 'reset role';
 if not exists(select 1 from public.coffee_sources
   where coffee_id=(resp->>'coffee_id')::uuid
     and source_kind='label' and field_values='{}'::jsonb
     and evidence_excerpt not ilike '%falsely asserted%')
 then raise exception 'Member forged trusted coffee source provenance';end if;

 -- Preserve a genuine previously Pending Wuri-style nonadmin record;
 -- subsequent owner-authenticated retry approves it without Admin privileges,
 -- without rewriting its original personal library UUID.
 insert into public.coffee_submissions(owner_id,proposed_data,source_url)
 values(u1,jsonb_build_object('name','Wuri Synthetic Legacy',
  'roaster','Sweet Bloom','origin','Gedeb, Ethiopia','process','Washed'),
  'https://sweetbloomcoffee.com/products/wuri') returning id,revision into sid,base_rev;
 lid:=gen_random_uuid();
 insert into public.library_entries(id,owner_id,submission_id) values(lid,u1,sid);
 perform set_config('request.jwt.claim.sub',u2::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin
  perform public.dic_member_retry_pending_approval(sid,base_rev);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Cross-account retry approved foreign Pending';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',u1::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin
  perform public.dic_member_retry_pending_approval(sid,base_rev+1);
 exception when serialization_failure then denied:=true;
 end;
 if not denied then raise exception 'Stale revision accepted';end if;
 resp:=public.dic_member_retry_pending_approval(sid,base_rev);
 if resp->>'status'<>'verified' then raise exception 'Existing Pending retry did not approve: %',resp;end if;
 if not exists(select 1 from public.library_entries where id=lid and
   owner_id=u1 and coffee_id=(resp->>'coffee_id')::uuid and submission_id is null)
 then raise exception 'Legacy Pending original library UUID lost on approval';end if;
 execute 'reset role';

 -- Existing Mango-style Pending remains Pending unless its owner actively
 -- retries or an authenticated administrator makes a reviewed decision.
 insert into public.coffee_submissions(owner_id,proposed_data,source_url)
 values(u2,jsonb_build_object('name','Mango Tree Blend Synthetic',
  'roaster','Mango Tree'),'https://www.mangotreecoffee.org/shop')
 returning id into sid;
 insert into public.library_entries(id,owner_id,submission_id) values(gen_random_uuid(),u2,sid);
 if (select status from public.coffee_submissions where id=sid)<>'pending' then
  raise exception 'Migration silently bulk approved existing Pending';end if;

 -- Anonymous role can neither browse nor change another owner's Pending.
 perform set_config('request.jwt.claim.sub','',true);
 execute 'set local role anon';
 denied:=false;
 begin perform public.dic_member_retry_pending_approval(sid,1);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Anonymous role reached owner Pending retry';end if;
 execute 'reset role';

 if (select count(*) from public.coffees)<>before_coffees+4 then
  raise exception 'Unexpected verified canonical duplication';end if;
 if (select count(*) from public.shots)<>before_shots then
  raise exception 'Historical personal shots changed';end if;
end $duplicate_first$;
select 'PASS: auto-approved distinct nonadmin, same-release reuse, distinct year, duplicate Pending,
 idempotent replay, member-owned legacy retry, security and history unchanged; rolled back' as result;
rollback;
