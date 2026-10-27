-- Issue13: execute only on an isolated disposable PostgreSQL schema
-- after all checked-in migrations, never directly on production.
do $retired_experiments_acceptance$
declare
  ddl text;
begin
  if to_regclass('public.experiments') is not null then
    raise exception 'Retired Experiment table remains present';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='shots' and column_name='experiment_id'
  ) then
    raise exception 'Retired shot Experiment foreign-key column remains present';
  end if;
  if to_regclass('public.personal_recipe_families') is null or
     to_regclass('public.recipe_preferences') is null or
     to_regclass('public.shot_notes') is null or
     to_regclass('public.community_shots') is null then
    raise exception 'Required preferred recipe, family, private note or Community table was removed';
  end if;
  select pg_get_functiondef('private.read_personal_state()'::regprocedure) into ddl;
  if strpos(ddl,'public.experiments')>0 or
     strpos(ddl,'''shots''')=0 or strpos(ddl,'''recipePreferences''')=0 then
    raise exception 'Owner read state lost core shot/recipe arrays or still reads Experiments';
  end if;
  select pg_get_functiondef('private.mutate_workspace(uuid,text,jsonb)'::regprocedure) into ddl;
  if strpos(ddl,'public.experiments')>0 or strpos(ddl,'''make_current''')=0 or
     strpos(ddl,'private.mutation_receipts')=0 then
    raise exception 'Make Current mutation lost idempotency/preference or still touches Experiments';
  end if;
  select pg_get_functiondef('private.apply_prototype_import(uuid,jsonb)'::regprocedure) into ddl;
  if strpos(ddl,'Retired Experiment records cannot be imported')=0 or
     strpos(ddl,'''experimentId''')=0 or strpos(ddl,'''shots''')=0 then
    raise exception 'Archived backup records are no longer fail-closed';
  end if;
  if exists (
    select 1 from pg_constraint
    where conrelid='public.shots'::regclass
    and conname ilike '%experiment%'
  ) then
    raise exception 'Obsolete Experiment link constraint remains';
  end if;
end
$retired_experiments_acceptance$;
