-- Issue #15 source-level retirement: the legacy bag schema and owner-scoped
-- shot associations are retained. No production DDL is part of this issue.
-- Run only in disposable, fully migrated isolated SQL CI.
begin;
do $retired_bag_history$
declare
 fk text;
 f text;
begin
 if to_regclass('public.bags') is null then
   raise exception 'Historic bag records were dropped';
 end if;
 if not exists (
  select 1 from information_schema.columns
  where table_schema='public' and table_name='shots'
   and column_name='bag_id' and is_nullable='YES'
 ) then
   raise exception 'Optional historical shot bag link was removed';
 end if;
 select pg_get_constraintdef(oid) into fk
  from pg_constraint
  where conrelid='public.shots'::regclass
   and conname='shots_owner_id_library_entry_id_bag_id_fkey';
 if fk is null
    or position('(owner_id, library_entry_id, bag_id)' in fk)=0
    or position('REFERENCES bags(owner_id, library_entry_id, id)' in fk)=0 then
   raise exception 'Owner/coffee-bound historic bag FK was weakened';
 end if;
 if not (select relrowsecurity from pg_class where oid='public.bags'::regclass) then
   raise exception 'Bag RLS must remain enabled for archived legacy data';
 end if;
 if has_table_privilege('authenticated','public.bags','INSERT')
    or has_table_privilege('authenticated','public.bags','UPDATE')
    or has_table_privilege('authenticated','public.bags','DELETE')
    or has_table_privilege('anon','public.bags','SELECT') then
   raise exception 'Legacy bag data privilege expanded';
 end if;
 if to_regclass('public.shot_notes') is null
   or to_regclass('public.personal_recipe_families') is null
   or to_regclass('public.recipe_preferences') is null then
   raise exception 'Shot notes, preferred recipes or internal families lost';
 end if;
 select pg_get_functiondef('private.mutate(uuid,text,jsonb)'::regprocedure) into f;
 if position('bag_id' in f)=0 or position('save_shot' in f)=0
   or position('private.mutation_receipts' in f)=0 then
   raise exception 'Previously queued bag-linked shots lost mutation or receipt support';
 end if;
 select pg_get_functiondef('private.apply_prototype_import(uuid,jsonb)'::regprocedure) into f;
 if position('public.bags' in f)=0 or position('bagId' in f)=0
    or position('roastDate' in f)=0 or position('frozen' in f)=0 then
   raise exception 'Archived bag metadata or associations lost import support';
 end if;
end
$retired_bag_history$;
rollback;
