-- The Dial In Collective: remove client execution of an internal event trigger.
-- Keep automatic RLS enforcement enabled; do not drop or disable ensure_rls.
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
 end if;
end $$;
-- Future public API functions must receive explicit grants rather than
-- inheriting public execution rights. Existing application grants are unchanged.
alter default privileges in schema public revoke execute on functions from public,anon,authenticated;
