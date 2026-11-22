-- #509 regression: a withdrawn Community projection must not be reclassified by verification changes.
-- Run on an isolated PostgreSQL fixture AFTER applying the forward-only migration.
begin;
do $dic_withdrawn_guard$
declare function_sql text; withdrawn_at integer; verification_at integer;
begin
 select pg_catalog.pg_get_functiondef('private.dic_review_community_shot(uuid)'::pg_catalog.regprocedure) into function_sql;
 if function_sql is null then raise exception 'Missing review function'; end if;
 withdrawn_at:=pg_catalog.position('if c.quality_state=''withdrawn'' then' in function_sql);
 verification_at:=pg_catalog.position('if verification is distinct from ''verified'' then' in function_sql);
 if withdrawn_at=0 or verification_at=0 or withdrawn_at>=verification_at then
  raise exception 'Withdrawn Community projection can be reclassified before withdrawal guard';
 end if;
 if pg_catalog.position('return ''withdrawn'';' in pg_catalog.substr(function_sql,withdrawn_at,verification_at-withdrawn_at))=0 then
  raise exception 'Missing early return for withdrawn projection';
 end if;
end $dic_withdrawn_guard$;
select 'PASS: withdrawn projection guard precedes verification branch' as result;
rollback;
