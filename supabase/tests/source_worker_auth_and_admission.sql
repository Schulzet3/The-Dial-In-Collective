-- Fully synthetic source-worker security regression; disconnected dic_ci only.
begin;
do $source_worker$
declare
 member_id uuid:=gen_random_uuid(); revoked_id uuid:=gen_random_uuid();
 pending_id uuid; legacy_id uuid; revoked_pending uuid; stale_id uuid; r jsonb; evidence jsonb;
 denied boolean; before_coffees bigint; before_attempts bigint; before_shots bigint;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci database required';end if;
 select count(*) into before_coffees from public.coffees;
 select count(*) into before_shots from public.shots;
 insert into auth.users(id,aud,role,email) values
 (member_id,'authenticated','authenticated',member_id::text||'@example.invalid'),
 (revoked_id,'authenticated','authenticated',revoked_id::text||'@example.invalid');
 insert into private.beta_members(owner_id,enabled,admitted_at)
 values(member_id,true,now()),(revoked_id,true,now())
 on conflict(owner_id) do update set enabled=true,admitted_at=now();
 insert into public.coffee_submissions(owner_id,source_url,proposed_data)
 values(member_id,'https://sweetbloomcoffee.com/products/json-worker-fixture',
  '{"name":"JSON Worker Fixture","roaster":"Sweet Bloom","release_label":"2026","producer":"Wuri Washing Station"}')
 returning id into pending_id;
 insert into public.library_entries(owner_id,submission_id) values(member_id,pending_id);
 insert into public.coffee_submissions(owner_id,source_url,proposed_data)
 values(member_id,'https://sweetbloomcoffee.com/products/legacy-worker-fixture',
  '{"name":"Legacy Worker Fixture","roaster":"Sweet Bloom","release_label":"2027"}')
 returning id into legacy_id;
 insert into public.library_entries(owner_id,submission_id) values(member_id,legacy_id);
 insert into public.coffee_submissions(owner_id,source_url,proposed_data)
 values(revoked_id,'https://sweetbloomcoffee.com/products/revoked-worker-fixture',
  '{"name":"Revoked Worker Fixture","roaster":"Sweet Bloom","release_label":"2028"}')
 returning id into revoked_pending;
 insert into public.library_entries(owner_id,submission_id) values(revoked_id,revoked_pending);

 evidence:=jsonb_build_object('checked_url','https://sweetbloomcoffee.com/products/json-worker-fixture',
  'product_name','JSON Worker Fixture','title_matches',true,'evidence_kind','jsonld_product',
  'submission_revision',1,'release_label','2026','verified_fields',jsonb_build_object('name','JSON Worker Fixture'),
  'evidence_excerpt','Synthetic official Product evidence');

 -- Setting forged claim GUCs cannot bypass the real SQL role's EXECUTE grants.
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 perform set_config('request.jwt.claim.role','service_role',true);
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.dic_source_check_target(pending_id);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Authenticated member forged source target access';end if;
 denied:=false;
 begin perform public.dic_source_claim(pending_id);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Authenticated member forged source budget access';end if;
 denied:=false;
 begin perform public.dic_trusted_source_verify(pending_id,evidence);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Authenticated member forged source verification';end if;
 denied:=false;
 begin perform private.dic_promote_pending_coffee(pending_id,'official_verified',evidence,false);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Authenticated member forged private official-worker mode';end if;
 execute 'reset role';
 execute 'set local role anon';
 denied:=false;
 begin perform public.dic_trusted_source_verify(pending_id,evidence);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous caller forged source verification';end if;
 execute 'reset role';

 -- JSON-only service JWT must work; no legacy claim or member subject required.
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claim.role','',true);
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 execute 'set local role service_role';
 r:=public.dic_source_check_target(pending_id);
 if r->>'submission_id' is distinct from pending_id::text then raise exception 'JSON service target failed';end if;
  if r->>'producer' is distinct from 'Wuri Washing Station' then raise exception 'Verifier omitted producer';end if;
 r:=public.dic_source_claim(pending_id);
 if r->>'allowed' is distinct from 'true' then raise exception 'JSON service claim failed';end if;
 r:=public.dic_source_claim(pending_id);
 if r->>'reason' is distinct from 'retry_later' then raise exception 'Source retry budget bypassed';end if;
 r:=public.dic_trusted_source_verify(pending_id,evidence);
 if r->>'ok' is distinct from 'true' or r->>'status' is distinct from 'verified' then
  raise exception 'JSON service promotion failed: %',r;end if;
 if not exists(select 1 from public.coffee_sources where coffee_id=(r->>'coffee_id')::uuid
  and source_kind='roaster_page') then raise exception 'Trusted provenance missing';end if;
 r:=public.dic_trusted_source_verify(pending_id,evidence);
 if r->>'already_verified' is distinct from 'true' then raise exception 'Verification replay not idempotent';end if;

 -- JSON's explicit nonservice role wins over a stale legacy service value.
 perform set_config('request.jwt.claim.role','service_role',true);
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 denied:=false;
 begin perform public.dic_source_check_target(legacy_id);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Stale legacy role overrode current JSON role';end if;
 perform set_config('request.jwt.claims','',true);
 r:=public.dic_source_check_target(legacy_id);
 if r->>'submission_id' is distinct from legacy_id::text then raise exception 'Legacy service target failed';end if;
 r:=public.dic_source_claim(legacy_id);
 if r->>'allowed' is distinct from 'true' then raise exception 'Legacy service claim failed';end if;
 -- Exact24h expiry must reset6 to1, never increment to7 and fail the constraint.
 update private.dic_source_attempts set attempts=6,window_started_at=now()-interval '24 hours',
  started_at=now()-interval '15 minutes' where submission_id=legacy_id;
 r:=public.dic_source_claim(legacy_id);
 if r->>'allowed' is distinct from 'true'
 or (select attempts from private.dic_source_attempts where submission_id=legacy_id)<>1 then
  raise exception 'Exact24h source-budget boundary failed';end if;
 r:=public.dic_trusted_source_verify(legacy_id,jsonb_build_object(
  'checked_url','https://sweetbloomcoffee.com/products/legacy-worker-fixture',
  'product_name','Legacy Worker Fixture','title_matches',true,
  'evidence_kind','jsonld_product','release_label','2027','submission_revision',1,
  'verified_fields',jsonb_build_object('name','Legacy Worker Fixture')));
 if r->>'ok' is distinct from 'true' or r->>'status' is distinct from 'verified' then
  raise exception 'Legacy service promotion failed: %',r;end if;

 -- User may correct the same-URL Pending while a bounded source fetch runs.
 execute 'reset role';
 insert into public.coffee_submissions(owner_id,source_url,proposed_data)
 values(member_id,'https://sweetbloomcoffee.com/products/stale-worker-fixture',
  '{"name":"Stale Worker Fixture","roaster":"Sweet Bloom"}') returning id into stale_id;
 insert into public.library_entries(owner_id,submission_id) values(member_id,stale_id);
 execute 'set local role service_role';
 r:=public.dic_source_check_target(stale_id);
 if r->>'submission_revision' is distinct from '1' then raise exception 'Target revision not returned';end if;
 execute 'reset role';
 update public.coffee_submissions set proposed_data=proposed_data||'{"name":"Edited During Fetch"}'
 where id=stale_id;
 execute 'set local role service_role';
 denied:=false;
 begin perform public.dic_trusted_source_verify(stale_id,jsonb_build_object(
  'checked_url','https://sweetbloomcoffee.com/products/stale-worker-fixture',
  'product_name','Stale Worker Fixture','title_matches',true,'evidence_kind','jsonld_product',
  'submission_revision',1));
 exception when serialization_failure then denied:=true;end;
 if not denied then raise exception 'Stale same-URL evidence approved changed submission';end if;
 if (select status from public.coffee_submissions where id=stale_id)<>'pending' then
  raise exception 'Rejected stale evidence changed the submission';end if;

 -- Revocation after target/claim but before external evidence returns must deny
 -- promotion. A service credential alone does not restore the member's admission.
 perform set_config('request.jwt.claim.role','',true);
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 r:=public.dic_source_claim(revoked_pending);
 if r->>'allowed' is distinct from 'true' then raise exception 'Initial admitted claim failed';end if;
 execute 'reset role';
 update private.beta_members set enabled=false where owner_id=revoked_id;
 select count(*) into before_attempts from private.dic_source_attempts;
 execute 'set local role service_role';
 if public.dic_source_check_target(revoked_pending) is not null then
  raise exception 'Removed member source metadata still exposed';end if;
 r:=public.dic_source_claim(revoked_pending);
 if r->>'allowed' is distinct from 'false' or r->>'reason' is distinct from 'not_admitted' then
  raise exception 'Removed member consumed source budget';end if;
 denied:=false;
 begin perform public.dic_trusted_source_verify(revoked_pending,jsonb_build_object(
  'checked_url','https://sweetbloomcoffee.com/products/revoked-worker-fixture',
  'product_name','Revoked Worker Fixture','title_matches',true,'evidence_kind','jsonld_product'));
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Removed member source was promoted';end if;
 execute 'reset role';
 if (select status from public.coffee_submissions where id=revoked_pending)<>'pending'
 or (select attempts from private.dic_source_attempts where submission_id=revoked_pending)<>1
 or (select count(*) from private.dic_source_attempts)<>before_attempts then
  raise exception 'Revocation denial changed submission or source budget';end if;
 if (select count(*) from public.coffees)<>before_coffees+2
 or (select count(*) from public.shots)<>before_shots then
  raise exception 'Worker regression altered unrelated history';end if;
end $source_worker$;
select 'PASS: JSON/legacy service roles, true role permissions, replay, retry budget and admission revocation; all synthetic writes rolled back' as result;
rollback;
