-- Disconnected-only admitted-member Community search surface/privacy acceptance.
begin;
do $test$
declare me uuid:='10000000-0000-4000-8000-000000000001'; original jsonb; filtered jsonb; invalid boolean:=false;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci required';end if;
 perform set_config('request.jwt.claim.sub',me::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',me,'role','authenticated')::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 original:=public.dic_browse_community_shots(20,0);
 filtered:=public.dic_search_community_shots('', 'all',20,0);
 if filtered->>'total' is distinct from original->>'total' then
  raise exception 'Community search default filtered count differs from existing verified-only listing';end if;
 filtered:=public.dic_search_community_shots('never-ever-public-coffee-xxxx','all',20,0);
 if filtered->>'total'<>'0' then raise exception 'Community search matched nonexistent coffee';end if;
 begin
  perform public.dic_search_community_shots(repeat('x',81),'all',20,0);
  raise exception 'Overlong Community search was allowed';
 exception when invalid_parameter_value then null;
 end;
 execute 'reset role';
end $test$;
select 'PASS: Community lookup preserves existing eligible counts and rejects oversized search' as result;
rollback;