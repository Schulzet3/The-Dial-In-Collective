-- Run only in a rollback transaction after the matching migration.
-- User/account data and synthetic verified products never persist.
begin;
do $coffee_identity_tests$
declare
 actor uuid; c2025 uuid:=gen_random_uuid();c2026 uuid:=gen_random_uuid();
 proof uuid:=gen_random_uuid(); item text; found jsonb; k text;
 bad boolean;
before_coffees int; before_submissions int; before_shots int;
begin
 select owner_id into strict actor from private.beta_members where enabled;
 select count(*) into before_coffees from public.coffees;
 select count(*) into before_submissions from public.coffee_submissions;
 select count(*) into before_shots from public.shots;
 foreach item in array array['Sweet Bloom','Sweetbloom','Sweet Bloom Coffee','Sweet Bloom Coffee Roasters','Sweet-Bloom'] loop
  k:=private.dic_canonical_roaster_key(item);
  if k<>'sweetbloom' then raise exception 'Roaster alias normalization failed: % => %',item,k; end if;
 end loop;
 if private.dic_canonical_roaster_key('Sweet Blossom Coffee Roasters')='sweetbloom' then
  raise exception 'Two distinct brand names were merged';
 end if;
 if private.dic_coffee_key('Uraga')=private.dic_coffee_key('Wuri') then
  raise exception 'Different products collapsed into one';
 end if;
 if private.dic_source_key('https://www.sweetbloomcoffee.com/products/wuri-2025/?utm_source=test&gclid=123') <>
    private.dic_source_key('https://sweetbloomcoffee.com/products/wuri-2025') then
    raise exception 'Tracking parameters caused a different URL match';
 end if;
 if private.dic_source_key('https://sweetbloomcoffee.com/products/wuri?variant=2026') =
    private.dic_source_key('https://sweetbloomcoffee.com/products/wuri?variant=2025') then
    raise exception 'Meaningful product variants were erroneously merged';
 end if;
 insert into public.coffees(id,name,roaster,release_label,origin,verification_state) values
 (c2025,'Wuri','Sweet Bloom Coffee Roasters','2025 harvest','Gedeb, Ethiopia','verified'),
 (c2026,'Wuri','Sweet Bloom','2026 harvest','Gedeb, Ethiopia','verified');
 insert into public.coffee_sources(coffee_id,source_url,source_kind,checked_at) values
 (c2025,'https://sweetbloomcoffee.com/products/wuri-2025','roaster_page',now()),
 (c2026,'https://sweetbloomcoffee.com/products/wuri-2026','roaster_page',now());
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 foreach item in array array['Sweet Bloom','Sweetbloom','Sweet Bloom Coffee','Sweet Bloom Coffee Roasters','Sweet-Bloom'] loop
  found:=public.dic_find_coffee_matches(jsonb_build_object('name','Wuri','roaster',item,'release_label','2026 harvest'));
  if found->>'classification'<>'exact_verified' or found->>'exact_id'<>c2026::text or (found->'roaster'->>'recognized')<>'true' then
   raise exception 'Unique official release not found: % => %',item,found;
  end if;
 end loop;
 found:=public.dic_find_coffee_matches('{"name":"Wuri","roaster":"Sweet-Bloom"}'::jsonb);
 if found->>'classification'<>'needs_confirmation' or found->>'exact_id' is not null then
  raise exception 'Same coffee without release was auto-linked: %',found;
 end if;
 found:=public.dic_find_coffee_matches('{"name":"Wurri","roaster":"Sweet Bloom Coffee"}'::jsonb);
 if found->>'classification'<>'needs_confirmation' or found->>'exact_id' is not null then
  raise exception 'Coffee typo should only suggest, not auto-link: %',found;
 end if;
 found:=public.dic_find_coffee_matches('{"name":"Wuri","roaster":"Sweet Bloom","release_label":"2027 harvest"}'::jsonb);
 if found->>'classification'='exact_verified' then raise exception 'Different vintage auto-linked';end if;
 found:=public.dic_find_coffee_matches('{"name":"Wuri","roaster":"Sweet Bloom","release_label":"2026 harvest","origin":"Colombia"}'::jsonb);
 if found->>'classification'='exact_verified' then raise exception 'Conflicting origin auto-linked';end if;
 found:=public.dic_find_coffee_matches('{"name":"Wuri","roaster":"Sweet Bloom","release_label":"2025 harvest","source_url":"https://www.sweetbloomcoffee.com/products/wuri-2025/?utm_source=mail"}'::jsonb);
 if found->>'exact_id'<>c2025::text then raise exception 'Curated product URL with tracking not matched: %',found;end if;
 found:=public.dic_find_coffee_matches('{"name":"Wuri","roaster":"Sweet Bloom","release_label":"2026 harvest","source_url":"https://sweetbloomcoffee.com/products/wuri-2025"}'::jsonb);
 if found->>'classification'='exact_verified' then raise exception 'Conflicting product URL auto-linked';end if;
 found:=public.dic_find_coffee_matches('{"name":"Uraga","roaster":"Sweet Bloom"}'::jsonb);
 if found->>'classification'='new_pending' then null;else raise exception 'Different coffee mislabeled: %',found;end if;
 found:=public.dic_find_coffee_matches('{"name":"Wuri","roaster":"Sweet Blossom Coffee Roasters","release_label":"2026 harvest"}'::jsonb);
 if found->>'classification'='exact_verified' then raise exception 'Lookalike roaster matched';end if;
 if found::text like '%'||actor::text||'%' or found::text like '%owner_id%' or found::text like '%notes%' then
  raise exception 'Private account data leaked';
 end if;
 execute 'reset role';
 -- Check no read-operation mutated application data.
 if (select count(*) from public.coffees)<>before_coffees+2
    or (select count(*) from public.coffee_submissions)<>before_submissions
    or (select count(*) from public.shots)<>before_shots then
   raise exception 'Read-only matcher mutated application records';
 end if;
 -- A signed-in but unadmitted account cannot enumerate candidates.
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 execute 'set local role authenticated';
 bad:=false;
 begin
  perform public.dic_find_coffee_matches('{"name":"Wuri","roaster":"Sweet Bloom"}'::jsonb);
 exception when insufficient_privilege then bad:=true;
 end;
 if not bad then raise exception 'Unadmitted account can query candidates';end if;
 execute 'reset role';
 -- Anonymous sessions cannot invoke this RPC at all.
 execute 'set local role anon';
 bad:=false;
 begin
  perform public.dic_find_coffee_matches('{"name":"Wuri","roaster":"Sweet Bloom"}'::jsonb);
 exception when insufficient_privilege then bad:=true;
 end;
 if not bad then raise exception 'Anonymous caller can query candidates';end if;
 execute 'reset role';
end $coffee_identity_tests$;
select 'PASS: five brand aliases, safe coffee release matching, tracked URL invariance, fuzzy confirmation, privacy and no writes' as result;
rollback;
