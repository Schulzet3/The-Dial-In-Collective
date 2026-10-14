-- Run ONLY after the admin read-only migration. All writes are rolled back.
-- Never grant a persistent admin role or seed false production records.
begin;
do $check$
declare
 member uuid;
 got jsonb;
 was_denied boolean;
 real_admin_count integer;
begin
  select owner_id into member
  from private.beta_members where enabled
  order by created_at limit 1;
  if member is null then raise exception 'No admitted test owner available'; end if;
  select count(*) into real_admin_count from private.app_admins;

  -- Plain authenticated members cannot call the admin endpoint.
  perform set_config('request.jwt.claim.sub',member::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  was_denied:=false;
  begin
    perform public.dic_admin_dashboard();
  exception when insufficient_privilege then was_denied:=true;
  end;
  if not was_denied then raise exception 'Non-admin was allowed to access admin overview'; end if;
  execute 'reset role';

  -- Temporary admin assignment only inside the doomed transaction.
  insert into private.app_admins(owner_id) values(member) on conflict do nothing;
  execute 'set local role authenticated';
  got:=public.dic_admin_dashboard();
  if coalesce(got->>'review_only','false')<>'true' then raise exception 'Admin was not returned a read-only view'; end if;
  if coalesce((got->'queue_total')::text::integer,-1)<0 then raise exception 'Missing queue total'; end if;
  if jsonb_typeof(got->'queue')<>'array' then raise exception 'Admin queue not an array'; end if;
  if got::text like '%'||member::text||'%' then raise exception 'Account UUID leaked in admin response'; end if;
  if got::text like '%owner_id%' or got::text like '%notes%' or got::text like '%raw_user%' then
    raise exception 'Private identity, note or raw auth field leaked';
  end if;
  if jsonb_array_length(got->'queue')>50 then raise exception 'Admin query was not bounded'; end if;
  if (select count(*) from private.app_admins)<>greatest(1,real_admin_count) then raise exception 'Unexpected admin mutation'; end if;
  execute 'reset role';

  -- Anon role cannot execute the public RPC, even if a JWT sub is present.
  execute 'set local role anon';
  was_denied:=false;
  begin
    perform public.dic_admin_dashboard();
  exception when insufficient_privilege then was_denied:=true;
  end;
  if not was_denied then raise exception 'Anonymous caller reached admin endpoint'; end if;
  execute 'reset role';
  -- Ensure direct access to private function is not granted.
  if has_function_privilege('anon','private.dic_admin_dashboard_read()','EXECUTE') then
    raise exception 'Anon can execute private dashboard function';
  end if;
end $check$;
select 'PASS: admin summary denied to non-admin and anon; temporary admin gets sanitized bounded read-only view' as result;
rollback;
