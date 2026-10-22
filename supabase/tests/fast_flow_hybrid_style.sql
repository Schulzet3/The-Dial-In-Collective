-- Run only against isolated test DB after all migration files; no live mutations.
begin;
do $ft$
declare tab text; definition text; proc text;
begin
 foreach tab in array array['workspace_coffees','recipe_families','personal_recipe_families','recipe_preferences','experiments','shots','community_shots'] loop
  select pg_get_constraintdef(c.oid) into definition from pg_constraint c
   join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='public' and t.relname=tab and
   c.conname=tab||case when tab='workspace_coffees' then '_selected_style_check' else '_style_check' end;
  if definition is null or position('Fast-Flow' in definition)=0 then raise exception 'Missing style constraint: %',tab; end if;
 end loop;
 proc:=pg_get_functiondef('private.mutate_workspace(uuid,text,jsonb)'::regprocedure);
 if position($q$'Traditional','Turbo','Fast-Flow','Ristretto','Lungo','Custom'$q$ in proc)=0 then
  raise exception 'Workspace mutation style allowlist missing Fast-Flow';
 end if;
end $ft$;
rollback;
