-- Issue #1756: isolated admin search without legacy invitation tokens.
begin;
do $test$
declare me uuid:='10000000-0000-4000-8000-000000000001'; found jsonb; empty_page jsonb; denied boolean:=false;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci required';end if;
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
 begin perform public.dic_admin_search_records('invites','expired',0,50);
 exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Retired invitation search is still callable';end if;
 begin
  perform public.dic_admin_search_records('accounts',repeat('x',81),0,50);
  raise exception 'Overlong Admin search was allowed';
 exception when invalid_parameter_value then null;
 end;
 execute 'reset role';
end $test$;
select 'PASS: admin exact search, no invitation category, bounded filters; rollback' as result;
rollback;
