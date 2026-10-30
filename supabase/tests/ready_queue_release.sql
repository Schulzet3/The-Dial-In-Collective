-- Release-batch acceptance against network-isolated disposable PostgreSQL only.
begin;
do $verify$
begin
  if current_database()<>'dic_ci' then
    raise exception 'Release CI must use disposable dic_ci only';
  end if;
  if to_regprocedure('public.dic_admin_search_records(text,text,integer,integer)') is null
     or to_regprocedure('public.dic_search_community_shots(text,text,integer,integer)') is null
     or to_regprocedure('public.dic_preview_complete(uuid)') is null
     or to_regprocedure('public.dic_preview_cached_verified(text)') is null then
    raise exception 'Ready-batch search and preview procedures missing';
  end if;
  if to_regprocedure('public.dic_admin_delete_preview(text,uuid)') is null
  or to_regprocedure('public.dic_source_check_target(uuid)') is null
  or to_regprocedure('private.classify_personal_shot(uuid)') is null then
    raise exception 'Combined ready source APIs missing';
  end if;
end $verify$;
select 'PASS: ready-batch search and preview procedures present' as result;
rollback;
-- Release13 combined scope: keep full isolated SQL and signed HTTP regression on the exact source.
