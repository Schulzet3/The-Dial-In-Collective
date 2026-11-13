-- Test ONLY in disposable, offline PostgreSQL 17.11 CI. All synthetic writes ROLLBACK.
begin;
do $test$
declare me uuid:=gen_random_uuid(); admin_account uuid; admin_rows_before int; admin_rows_after int;
   admin_first jsonb; admin_second jsonb; admin_cached jsonb; admin_done1 jsonb; admin_done2 jsonb; admin_invalid jsonb;
  claimed jsonb; completed jsonb; replay jsonb; reuse jsonb; invalid_null jsonb; capped jsonb; cached_at_cap jsonb; previous int; after_count int;
  canonical_id uuid; catalog jsonb; url text:='https://synthetic-roaster.example.com/products/test-unique-release';
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci only';end if;
 select coalesce(attempts,0) into previous from private.dic_url_preview_attempts where owner_id=me;
 previous:=coalesce(previous,0);
 -- Populate a uniquely verified exact public source without any private owner note.
 insert into public.coffees(name,roaster,verification_state)
 values('Synthetic Unique Release','Synthetic Public Roaster','verified') returning id into canonical_id;
 insert into public.coffee_sources(coffee_id,source_url,source_kind,field_values)
 values(canonical_id,url,'roaster_page','{}'::jsonb);
 perform set_config('request.jwt.claim.sub',me::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',me,'role','authenticated')::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 catalog:=public.dic_preview_cached_verified(url);
 claimed:=public.dic_preview_preflight(false);
 invalid_null:=public.dic_preview_preflight(null);
 execute 'reset role';
 if invalid_null->>'reason' is distinct from 'invalid_cached_flag' or invalid_null ? 'ticket' then
  raise exception 'Explicit NULL cached flag must fail without invalidating valid ticket: %',invalid_null;end if;
 if catalog->>'ok'<>'true' or catalog->'fields'->>'name'<>'Synthetic Unique Release' then
  raise exception 'Unique verified exact source lookup failed: %',catalog;end if;
 if claimed->>'allowed'<>'true' or claimed->>'ticket' is null then
  raise exception 'Preflight failed: %',claimed;end if;
 select attempts into after_count from private.dic_url_preview_attempts where owner_id=me;
 if after_count<>previous then raise exception 'Preflight consumed daily quota before completion';end if;
 execute 'set local role authenticated';
 completed:=public.dic_preview_complete((claimed->>'ticket')::uuid);
 replay:=public.dic_preview_complete((claimed->>'ticket')::uuid);
 reuse:=public.dic_preview_preflight(true);
 execute 'reset role';
 select attempts into after_count from private.dic_url_preview_attempts where owner_id=me;
 if completed->>'charged'<>'true' or replay->>'charged'<>'false' or after_count<>previous+1 then
  raise exception 'Single use completion receipt or daily counter broken';end if;
 if reuse->>'reason'<>'preview_cooldown' then
  raise exception 'Cached lookup bypassed 15-second cooldown';end if;
 -- Separate cap boundary: NULL must not mint a ticket at exhausted daily quota.
 update private.dic_url_preview_attempts set attempts=12,last_attempt_at=now()-interval '16 seconds' where owner_id=me;
 execute 'set local role authenticated';
 invalid_null:=public.dic_preview_preflight(null);
 capped:=public.dic_preview_preflight(false);
 cached_at_cap:=public.dic_preview_preflight(true);
 execute 'reset role';
 if invalid_null->>'reason' is distinct from 'invalid_cached_flag' or invalid_null ? 'ticket' then
  raise exception 'NULL preflight incorrectly allowed at shared cap: %',invalid_null;end if;
 if capped->>'reason' is distinct from 'daily_preview_limit' then
  raise exception 'False preflight must respect shared daily cap: %',capped;end if;
 if cached_at_cap->>'allowed' is distinct from 'true' or cached_at_cap->>'cached' is distinct from 'true' then
  raise exception 'Cache mode should preserve no-charge capped lookup: %',cached_at_cap;end if;
  -- Admin can repeat two independent fresh tickets and cached reuse without
  -- serialized quota state; SQL test remains inside a rollback-only transaction.
  select owner_id into strict admin_account from private.app_admins limit 1;
  select count(*) into admin_rows_before from private.dic_url_preview_attempts where owner_id=admin_account;
  perform set_config('request.jwt.claim.sub',admin_account::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_account,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  admin_first:=public.dic_preview_preflight(false);
  admin_second:=public.dic_preview_preflight(false);
  admin_cached:=public.dic_preview_preflight(true);
  admin_invalid:=public.dic_preview_preflight(null);
  admin_done1:=public.dic_preview_complete((admin_first->>'ticket')::uuid);
  admin_done2:=public.dic_preview_complete((admin_second->>'ticket')::uuid);
  completed:=public.dic_preview_complete(null);
  execute 'reset role';
  select count(*) into admin_rows_after from private.dic_url_preview_attempts where owner_id=admin_account;
  if admin_first->>'allowed'<>'true' or admin_second->>'allowed'<>'true'
    or admin_first->>'ticket' is null or admin_second->>'ticket' is null
    or admin_first->>'ticket'=admin_second->>'ticket'
    or admin_cached->>'cached'<>'true' or admin_cached->>'unlimited'<>'true'
    or admin_done1->>'charged'<>'true' or admin_done2->>'charged'<>'true'
    or admin_invalid->>'reason'<>'invalid_cached_flag'
    or completed->>'reason'<>'invalid_ticket'
    or admin_rows_before<>admin_rows_after then
    raise exception 'Admin unlimited preview/cached/fresh ticket bypass failed'; end if;
end $test$;
select 'PASS: member 12/day and 15-second cooldown, single-use member ticket, unlimited cached/fresh Admin previews' as result;
rollback;
