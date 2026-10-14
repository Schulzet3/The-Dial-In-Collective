-- Entire verification regression suite runs inside a rolled-back transaction.
begin;
do $coffee_checks$
declare
  owner uuid; member uuid:=gen_random_uuid(); pending uuid; official_pending uuid;
  admin_mid uuid:=gen_random_uuid(); normal_mid uuid:=gen_random_uuid(); official_mid uuid:=gen_random_uuid();
  result jsonb; admin_result jsonb; pending_lid uuid; admin_coffee uuid;
  ordinary_count bigint; current_shots bigint; role_denied boolean;
begin
 select owner_id into strict owner from private.app_admins;
 select count(*) into current_shots from public.shots;
 select count(*) into ordinary_count from public.coffees;
 insert into auth.users(id,aud,role,email) values(member,'authenticated','authenticated',member::text||'@example.invalid');
 insert into private.beta_members(owner_id,enabled,admitted_at) values(member,true,now())
 on conflict(owner_id) do update set enabled=true,admitted_at=now();

 -- Earlier ordinary Pending entry gets the primary spelling when linked later.
 perform set_config('request.jwt.claim.sub',member::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.dic_apply_client_change(member,normal_mid,'submit_coffee',
 jsonb_build_object('library_entry_id',gen_random_uuid(),
   'proposed_data',jsonb_build_object('name','Hambella Test 2026','roaster','Sweet Bloom Coffee',
    'origin','Guji, Ethiopia')));
 if result->>'status'<>'pending' or result->>'ok'<>'true' then
  raise exception 'An ordinary coffee was incorrectly auto-approved: %',result;
 end if;
 pending:=(result->>'submission_id')::uuid;pending_lid:=(result->>'library_entry_id')::uuid;
 if not exists(select 1 from public.library_entries where id=pending_lid and submission_id=pending and coffee_id is null) then
  raise exception 'Ordinary Pending entry was not saved atomically';
 end if;
 if (select count(*) from public.coffees)<>ordinary_count then
  raise exception 'A Pending coffee was made canonical without verification';
 end if;
 result:=public.dic_apply_client_change(member,normal_mid,'submit_coffee',
 jsonb_build_object('library_entry_id',(select id from public.library_entries where submission_id=pending),
   'proposed_data',jsonb_build_object('name','Hambella Test 2026','roaster','Sweet Bloom Coffee',
    'origin','Guji, Ethiopia')));
 if (result->>'submission_id')::uuid<>pending then raise exception 'Idempotent submit returned another ID'; end if;

 perform set_config('request.jwt.claim.sub',owner::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 admin_result:=public.dic_apply_client_change(owner,admin_mid,'submit_coffee',
 jsonb_build_object('library_entry_id',gen_random_uuid(),
   'proposed_data',jsonb_build_object('name','Hambela Test 2026','roaster','Sweet-Bloom',
     'origin','Guji, Ethiopia')));
 if admin_result->>'status'<>'verified' or admin_result->>'ok'<>'true' then
  raise exception 'Owning admin coffee was not instantly verified: %',admin_result;
 end if;
 admin_coffee:=(admin_result->>'coffee_id')::uuid;
 if (select name from public.coffees where id=admin_coffee)<>'Hambela Test 2026' then
  raise exception 'Admin original coffee name was silently changed';
 end if;
 execute 'reset role';
 if not exists(select 1 from private.dic_coffee_audit where coffee_id=admin_coffee and event_kind='admin_approved') then
  raise exception 'Admin approval provenance was not recorded';
 end if;
 execute 'set local role authenticated';

 perform set_config('request.jwt.claim.sub',member::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
 result:=public.dic_apply_client_change(member,gen_random_uuid(),'confirm_coffee_existing',
   jsonb_build_object('submission_id',pending,'coffee_id',admin_coffee));
 if result->>'ok'<>'true' or result->>'coffee_id'<>admin_coffee::text then
  raise exception 'User confirmation failed: %',result;
 end if;
 if not exists(select 1 from public.library_entries where id=pending_lid and coffee_id=admin_coffee and submission_id is null)
    or not exists(select 1 from public.coffee_submissions where id=pending and status='merged') then
  raise exception 'User confirmation rewrote or abandoned the original library ID';
 end if;
 execute 'reset role';
 if (select name from public.coffees where id=admin_coffee)<>'Hambella Test 2026' then
  raise exception 'The earliest original spelling was not retained globally';
 end if;
 if not exists(select 1 from private.dic_coffee_aliases where coffee_id=admin_coffee
   and alias_key=private.dic_coffee_key('Hambela Test 2026')) then
  raise exception 'The later canonical spelling was not retained as an alias';
 end if;
 execute 'set local role authenticated';
 role_denied:=false;
 begin
  perform public.dic_admin_approve_own_coffee(pending);
 exception when insufficient_privilege then role_denied:=true;
 end;
 if not role_denied then raise exception 'Ordinary member was permitted to grant admin approval';end if;

 -- Another ordinary release remains Pending until official evidence arrives.
 result:=public.dic_apply_client_change(member,official_mid,'submit_coffee',
 jsonb_build_object('library_entry_id',gen_random_uuid(),'source_url','https://sweetbloomcoffee.com/products/test-unique-2026',
   'proposed_data',jsonb_build_object('name','Unique Source Test 2026','roaster','Sweet Bloom',
    'origin','Ethiopia','release_label','2026')));
 if result->>'status'<>'pending' then raise exception 'Source URL alone was treated as evidence';end if;
 official_pending:=(result->>'submission_id')::uuid;
 role_denied:=false;
 begin
  perform public.dic_trusted_source_verify(official_pending,
    '{"checked_url":"https://sweetbloomcoffee.com/products/test-unique-2026","product_name":"Unique Source Test 2026","title_matches":true,"evidence_kind":"jsonld_product"}'::jsonb);
 exception when insufficient_privilege then role_denied:=true;
 end;
 if not role_denied then raise exception 'Ordinary member called privileged source verifier';end if;
 execute 'set local role service_role';
 perform set_config('request.jwt.claim.role','service_role',true);
 result:=public.dic_trusted_source_verify(official_pending,jsonb_build_object(
   'checked_url','https://sweetbloomcoffee.com/products/test-unique-2026',
   'product_name','Unique Source Test 2026',
   'title_matches',true,'evidence_kind','jsonld_product',
   'verified_fields',jsonb_build_object('name','Unique Source Test 2026'),
   'evidence_excerpt','Synthetic product evidence in rollback-only test'));
 if result->>'ok'<>'true' or result->>'status'<>'verified' then
  raise exception 'Trusted official source failed to auto-approve: %',result;
 end if;
 if not exists(select 1 from public.coffee_sources where coffee_id=(result->>'coffee_id')::uuid and source_kind='roaster_page') then
  raise exception 'Official product source not attached to canonical coffee';
 end if;
 execute 'reset role';
 if (select count(*) from public.shots)<>current_shots then raise exception 'Coffee operations changed existing shots';end if;
 if (select count(*) from public.coffees)<>ordinary_count+2 then
  raise exception 'Unexpected canonical count after admin and source approval';
 end if;
end $coffee_checks$;
select 'PASS: admin immediate approval, ordinary Pending, atomic user merge, first-entered name, idempotency, source-only promotion and safety' result;
rollback;