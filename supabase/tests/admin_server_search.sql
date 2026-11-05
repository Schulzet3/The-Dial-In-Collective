-- Disconnected-only role and filtered-count search acceptance. Synthetic data only.
begin;
do $test$
declare me uuid:='10000000-0000-4000-8000-000000000001'; found jsonb; empty_page jsonb; denied boolean:=false;
 expired_id uuid; active_results jsonb;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci required';end if;
 -- Synthetic LEGACY expiry only. Production issues never-expiring one-use tokens.
 insert into private.beta_invites(token_hash,label,issued_by,expires_at,max_uses,uses)
 values(encode(sha256(convert_to('issue509-expired-search-fixture','UTF8')),'hex'),
        'Historical invite fixture',me,now()-interval '1 day',1,0)
 returning id into expired_id;
 perform set_config('request.jwt.claim.sub',me::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',me,'role','authenticated')::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 found:=public.dic_admin_search_records('accounts','owner@ci.example.invalid',0,50);
 empty_page:=public.dic_admin_search_records('accounts','absent-987654321',0,50);
 if found->>'total'<>'1' or jsonb_array_length(found->'items')<>1 then
  raise exception 'Admin exact email search count or page mismatch: %',found;end if;
 if empty_page->>'total'<>'0' or jsonb_array_length(empty_page->'items')<>0 then
  raise exception 'Admin filtered empty results wrong';end if;
 -- The filter must use exactly the same status precedence as the listing.
 found:=public.dic_admin_search_records('invites','expired',0,50);
 if not exists(select 1 from jsonb_array_elements(found->'items') item
   where (item->>'id')::uuid=expired_id and item->>'status'='expired') then
  raise exception 'Issue509: expired legacy invite was not searchable by displayed status';end if;
 active_results:=public.dic_admin_search_records('invites','active',0,50);
 if exists(select 1 from jsonb_array_elements(active_results->'items') item
   where (item->>'id')::uuid=expired_id) then
  raise exception 'Issue509: expired legacy invite incorrectly matches active status';end if;
 begin
  perform public.dic_admin_search_records('accounts',repeat('x',81),0,50);
  raise exception 'Overlong Admin search was allowed';
 exception when invalid_parameter_value then null;
 end;
 execute 'reset role';
end $test$;
select 'PASS: admitted Admin search has exact filtered totals and bounded queries' as result;
rollback;