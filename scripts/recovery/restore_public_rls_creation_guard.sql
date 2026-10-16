-- The Dial In Collective: restore an operator-created RLS safety guard
-- RECONSTRUCTION ONLY. Apply to a NEW ISOLATED recovery Supabase project.
-- Do NOT include in general production migrations or rerun over a live production database.
-- Source of record: read-only 2026-10-16 live pg_get_functiondef() and pg_event_trigger inventory.
-- Product policies are not changed: this reproduces the existing prod guard for newly created public tables.
do $recovery$
begin
 if not exists (
   select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='rls_auto_enable'
 ) then
   execute $fn$
     create function public.rls_auto_enable()
     returns event_trigger
     language plpgsql
     security definer
     set search_path to 'pg_catalog'
     as $function$
     declare cmd record; tbl name;
     begin
       for cmd in
         select * from pg_event_trigger_ddl_commands()
         where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
         and object_type in ('table','partitioned table')
       loop
         if cmd.schema_name is not null and cmd.schema_name in ('public')
            and cmd.schema_name not in ('pg_catalog','information_schema')
            and cmd.schema_name not like 'pg_toast%'
            and cmd.schema_name not like 'pg_temp%' then
           begin
             select c.relname into tbl from pg_catalog.pg_class c where c.oid=cmd.objid;
             execute format('alter table if exists %I.%I enable row level security',cmd.schema_name,tbl);
             raise log 'rls_auto_enable: enabled RLS on %',cmd.object_identity;
           exception when others then
             raise log 'rls_auto_enable: failed to enable RLS on %',cmd.object_identity;
           end;
         else
           raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)',cmd.object_identity,cmd.schema_name;
         end if;
       end loop;
     end;
     $function$;
   $fn$;
 end if;
 if not exists (select 1 from pg_event_trigger where evtname='ensure_rls') then
   execute 'create event trigger ensure_rls on ddl_command_end when tag in (''CREATE TABLE'',''CREATE TABLE AS'',''SELECT INTO'') execute function public.rls_auto_enable()';
 end if;
end
$recovery$;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to service_role;

-- Transactional validation: create and discard a new public table. The RLS event
-- trigger must automatically enable RLS before the probe is removed.
do $probe$
declare enabled boolean;
begin
 if to_regclass('public.__dic_recovery_rls_probe') is not null then
   raise exception 'Unexpected pre-existing RLS probe table';
 end if;
 execute 'create table public.__dic_recovery_rls_probe (id bigint primary key)';
 select c.relrowsecurity into enabled from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname='__dic_recovery_rls_probe';
 if enabled is distinct from true then
   raise exception 'Recovery RLS auto-enable probe failed';
 end if;
 execute 'drop table public.__dic_recovery_rls_probe';
end
$probe$;
