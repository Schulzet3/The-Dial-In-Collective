-- Owner Locked COFFEE-DUPLICATE-FIRST-20261021: transaction rolls back.
begin;
do $coffee_checks$
declare
 owner uuid; member uuid:=gen_random_uuid();
 pending uuid;official_pending uuid;
 mid uuid:=gen_random_uuid();
 original_id uuid;admin_id uuid;canon uuid;
 r jsonb;again jsonb;before_c bigint;before_shots bigint;
 denied boolean;
begin
 select owner_id into strict owner from private.app_admins;
 select count(*) into before_c from public.coffees;
 select count(*) into before_shots from public.shots;
 insert into auth.users(id,aud,role,email) values
  (member,'authenticated','authenticated',member::text||'@example.invalid');
 insert into private.beta_members(owner_id,enabled,admitted_at) values
  (member,true,now()) on conflict(owner_id) do update set enabled=true,admitted_at=now();

 -- Nonadmin truly distinct member coffee is now catalog-approved immediately,
 -- even when URL/official verification was unavailable.
 original_id:=gen_random_uuid();
 perform set_config('request.jwt.claim.sub',member::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 r:=public.dic_apply_client_change(member,mid,'submit_coffee',
  jsonb_build_object('library_entry_id',original_id,
    'proposed_data',jsonb_build_object('name','Hambella Test 2026',
     'roaster','Sweet Bloom Coffee','origin','Guji, Ethiopia')));
 if r->>'status'<>'verified' or r->>'ok'<>'true' then
  raise exception 'Nonadmin distinct coffee not auto-approved: %',r;end if;
 canon:=(r->>'coffee_id')::uuid;
 if not exists(select 1 from public.library_entries
   where id=original_id and coffee_id=canon and owner_id=member)
 then raise exception 'Original nonadmin library entry lost';end if;
 again:=public.dic_apply_client_change(member,mid,'submit_coffee',
  jsonb_build_object('library_entry_id',original_id,
    'proposed_data',jsonb_build_object('name','Hambella Test 2026',
     'roaster','Sweet Bloom Coffee','origin','Guji, Ethiopia')));
 if r<>again then raise exception 'Idempotent repeat created a duplicate';end if;
 execute 'reset role';
 if not exists(select 1 from private.dic_coffee_audit
   where coffee_id=canon and event_kind='member_auto_approved')
 then raise exception 'Honest member approval audit missing';end if;

 -- The later admin's similar spelling is not a confident same-release.
 -- It saves Pending, then admin/user-confirmed merge uses first original
 -- ID/name and records the later spelling as an alias.
 perform set_config('request.jwt.claim.sub',owner::text,true);
 execute 'set local role authenticated';
 r:=public.dic_apply_client_change(owner,gen_random_uuid(),'submit_coffee',
   jsonb_build_object('library_entry_id',gen_random_uuid(),
    'proposed_data',jsonb_build_object('name','Hambela Test 2026',
     'roaster','Sweet-Bloom','origin','Guji, Ethiopia')));
 if r->>'status'<>'pending' then
  raise exception 'Fuzzy later spelling automatically created duplicate: %',r;end if;
 pending:=(r->>'submission_id')::uuid;
 admin_id:=(r->>'library_entry_id')::uuid;
 r:=public.dic_apply_client_change(owner,gen_random_uuid(),'confirm_coffee_existing',
   jsonb_build_object('submission_id',pending,'coffee_id',canon));
 if r->>'status'<>'verified' or r->>'coffee_id'<>canon::text then
  raise exception 'User-confirmed alias merge failed: %',r;end if;
 execute 'reset role';
 if not exists(select 1 from public.library_entries where
    id=admin_id and coffee_id=canon and submission_id is null)
 then raise exception 'Later admin library entry lost in link';end if;
 if (select name from public.coffees where id=canon)<>'Hambella Test 2026' then
  raise exception 'Earliest original primary coffee name changed';end if;
 if not exists(select 1 from private.dic_coffee_aliases where coffee_id=canon
   and alias_key=private.dic_coffee_key('Hambela Test 2026'))
 then raise exception 'Later alternate spelling alias was not retained';end if;

 -- This separate previously Pending official source fixture exists only to
 -- prove service-only source evidence can still promote an untrusted URL
 -- into independently sourced catalog proof. Member autoapproval is separate.
 insert into public.coffee_submissions(owner_id,source_url,proposed_data)
 values(member,'https://sweetbloomcoffee.com/products/unique-source-fixture',
  jsonb_build_object('name','Unique Source Fixture','roaster','Sweet Bloom',
   'origin','Ethiopia','release_label','2026'))
 returning id into official_pending;
 insert into public.library_entries(id,owner_id,submission_id)
 values(gen_random_uuid(),member,official_pending);
 perform set_config('request.jwt.claim.sub',member::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 denied:=false;
 begin
  perform public.dic_trusted_source_verify(official_pending,
  '{"checked_url":"https://sweetbloomcoffee.com/products/unique-source-fixture",
    "product_name":"Unique Source Fixture","title_matches":true,"evidence_kind":"jsonld_product"}'::jsonb);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Member forged official source verifier';end if;
 denied:=false;
 begin perform public.dic_admin_approve_own_coffee(official_pending);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Ordinary member accessed admin-only reviewer';end if;
 execute 'reset role';

 execute 'set local role service_role';
 perform set_config('request.jwt.claim.role','service_role',true);
 r:=public.dic_trusted_source_verify(official_pending,jsonb_build_object(
   'checked_url','https://sweetbloomcoffee.com/products/unique-source-fixture',
   'product_name','Unique Source Fixture','title_matches',true,
   'submission_revision',1,
   'evidence_kind','jsonld_product','verified_fields',
    jsonb_build_object('name','Unique Source Fixture'),
   'evidence_excerpt','Isolated synthetic roaster Product JSON-LD'));
 if r->>'status'<>'verified' or r->>'ok'<>'true' then
  raise exception 'Trusted source separated promotion failed: %',r;end if;
 if not exists(select 1 from public.coffee_sources where
  coffee_id=(r->>'coffee_id')::uuid and source_kind='roaster_page')
 then raise exception 'Trusted official product provenance missing';end if;
 execute 'reset role';

 if (select count(*) from public.coffees)<>before_c+2 then
  raise exception 'Unexpected canonical duplicate/omission';end if;
 if (select count(*) from public.shots)<>before_shots then
  raise exception 'Original shots changed';end if;
end $coffee_checks$;
select 'PASS: nonadmin distinct autoapproval, idempotence, fuzzy alias user merge,
 earliest first entry, service-only source verification and unchanged history; rolled back' as result;
rollback;
