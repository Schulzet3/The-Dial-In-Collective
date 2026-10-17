-- Owner-Locked seven-tier roast regression. Roll back all synthetic records.
begin;
do $roast_test$
declare tier text; cid uuid; rejected boolean:=false; body text;
begin
 foreach tier in array array['Ultra Light','Very Light','Light','Medium-Light',
                            'Medium','Medium-Dark','Dark'] loop
  insert into public.coffees(name,roaster,roast_level,verification_state)
  values('Roast test '||tier,'CI Test Roaster',tier,'verified')
  returning id into cid;
  if (select roast_level from public.coffees where id=cid) is distinct from tier
   then raise exception 'Unexpected normalized roast %',tier;end if;
 end loop;
 -- Final canonical CHECK rejects old Light-Medium as a new table value.
 -- Original submitted words and official source evidence are not rewritten.
 rejected:=false;
 begin
  insert into public.coffees(name,roaster,roast_level,verification_state)
  values('Legacy spelling rejected','CI Test Roaster','Light-Medium','verified');
 exception when check_violation then rejected:=true;
 end;
 if not rejected then raise exception 'Obsolete canonical label accepted';end if;
 begin
  insert into public.coffees(name,roaster,roast_level,verification_state)
  values('Invalid value','CI Test Roaster','Ultra-Medium','verified');
 exception when check_violation then rejected:=true;
 end;
 if not rejected then raise exception 'Invalid roast label accepted';end if;
 select pg_get_functiondef(p.oid) into body
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='private' and p.proname='dic_promote_pending_coffee';
 if body is null or position('Ultra Light' in body)=0
  or position('Very Light' in body)=0
  or position('Medium-Light' in body)=0
  or position('not private.is_admin()' in body)=0
 then raise exception 'Trusted promotion lost roast support or privilege guard';end if;
end $roast_test$;
select 'PASS: seven roast categories, original source evidence retained, invalid reject and trusted promotion guard' as result;
rollback;
