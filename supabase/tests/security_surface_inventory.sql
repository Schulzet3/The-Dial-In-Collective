-- Complete current application catalog invariants, isolated dic_ci only.
-- Metadata-only; never run test bootstrap or fixtures against production.
begin;
do $audit$
declare bad text;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci required'; end if;
 select string_agg(n.nspname||'.'||c.relname,', ') into bad
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('public','private') and c.relkind='r' and not c.relrowsecurity;
 if bad is not null then raise exception 'Missing RLS: %',bad; end if;
 select string_agg(table_schema||'.'||table_name||':'||grantee||':'||privilege_type,', ') into bad
 from information_schema.role_table_grants where table_schema in ('public','private')
 and grantee in ('anon','authenticated','PUBLIC') and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER');
 if bad is not null then raise exception 'Direct client write grant: %',bad; end if;
 select string_agg(n.nspname||'.'||p.proname,', ') into bad
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','private') and p.prosecdef
 and not exists(select 1 from unnest(p.proconfig) x where x like 'search_path=%');
 if bad is not null then raise exception 'Definer lacks fixed search_path: %',bad; end if;
 select string_agg(p.proname,', ') into bad from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like 'dic_%' and has_function_privilege('anon',p.oid,'execute');
 if bad is not null then raise exception 'Anonymous app RPC access: %',bad; end if;
 if has_function_privilege('anon','private.mutate(uuid,text,jsonb)','execute')
 or has_function_privilege('authenticated','private.mutate(uuid,text,jsonb)','execute') then
  raise exception 'Private mutate bypasses public routing'; end if;
 if has_schema_privilege('anon','public','create') or has_schema_privilege('authenticated','public','create')
 or has_schema_privilege('anon','private','create') or has_schema_privilege('authenticated','private','create') then
  raise exception 'Untrusted role may create schema objects'; end if;
 select string_agg(n.nspname||'.'||p.proname,', ') into bad
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','private') and p.prokind='f'
 and pg_get_functiondef(p.oid) ~ 'raw_user_meta_data|user_metadata';
 if bad is not null then raise exception 'Review user-editable authorization metadata: %',bad; end if;
 raise notice 'PASS: entire application table/function privilege and fixed-path inventory';
end $audit$;
rollback;

-- Release-scoped exact-source SQL rehearsal: keep all existing privilege assertions active.
