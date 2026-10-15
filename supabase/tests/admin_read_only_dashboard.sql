-- Run ONLY after admin RPC migration. ALL synthetic accounts/assignments are rolled back.
-- Works whether the real owner has already been promoted to admin or not.
begin;
do $check$
declare
  member uuid:=gen_random_uuid();
  admin_member uuid;
  got jsonb;
  was_denied boolean;
  real_admin_count integer;
  shots_before integer;
begin
  select count(*) into real_admin_count from private.app_admins;
  select count(*) into shots_before from public.shots;
  select a.owner_id into admin_member
    from private.app_admins a join private.beta_members b on b.owner_id=a.owner_id
    where b.enabled order by b.created_at limit 1;
  if admin_member is null then
    select owner_id into admin_member from private.beta_members where enabled order by created_at limit 1;
    if admin_member is null then raise exception 'No admitted owner available'; end if;
    -- Temporarily promote only inside a rollback-only transaction when needed.
    insert into private.app_admins(owner_id) values(admin_member) on conflict do nothing;
  end if;

  -- A separate admitted user must NEVER inherit the existing owner's admin role.
  insert into auth.users(id,aud,role,email)
   values(member,'authenticated','authenticated',member::text||'@example.invalid');
  insert into private.beta_members(owner_id,enabled,admitted_at)
   values(member,true,now()) on conflict(owner_id) do update set enabled=true,admitted_at=now();

  perform set_config('request.jwt.claim.sub',member::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  was_denied:=false;
  begin
    perform public.dic_admin_dashboard();
  exception when insufficient_privilege then was_denied:=true;
  end;
  if not was_denied then raise exception 'Authenticated non-admin was allowed to read admin dashboard'; end if;
  execute 'reset role';

  -- The real owning administrator (or a transaction-only promoted owner)
  -- may read only the sanitized/bounded high-signal queue.
  perform set_config('request.jwt.claim.sub',admin_member::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_member,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  got:=public.dic_admin_dashboard();
  if coalesce(got->>'review_only','false')<>'true' then raise exception 'Admin overview not marked read-only'; end if;
  if jsonb_typeof(got->'queue')<>'array' then raise exception 'Expected bounded admin queue array'; end if;
  if coalesce((got->>'queue_total')::integer,-1)<0 then raise exception 'Missing queue total'; end if;
  if jsonb_array_length(got->'queue')>50 then raise exception 'Admin overview returned too many records'; end if;
  if got::text like '%'||member::text||'%' or got::text like '%'||admin_member::text||'%' then
    raise exception 'Account UUID leaked in admin overview';
  end if;
  if got::text like '%owner_id%' or got::text like '%notes%' or got::text like '%raw_user%' then
    raise exception 'Private identity or raw user data leaked';
  end if;
  execute 'reset role';
  if (select count(*) from private.app_admins)<>greatest(1,real_admin_count) then
    raise exception 'The admin test unexpectedly altered admin membership';
  end if;
  if (select count(*) from public.shots)<>shots_before then
    raise exception 'The read-only dashboard test altered shot data';
  end if;

  -- Even when the JWT contains a valid admin sub, the anonymous database
  -- role is barred from the public RPC.
  execute 'set local role anon';
  was_denied:=false;
  begin
    perform public.dic_admin_dashboard();
  exception when insufficient_privilege then was_denied:=true;
  end;
  if not was_denied then raise exception 'Anon role reached admin overview'; end if;
  execute 'reset role';
  if has_function_privilege('anon','private.dic_admin_dashboard_read()','EXECUTE') then
    raise exception 'Anonymous role has private admin function privileges';
  end if;
end $check$;
select 'PASS: existing owner admin allowed; separate admitted member and anon denied; sanitized queue; all synthetic data rolled back' as result;
rollback;
