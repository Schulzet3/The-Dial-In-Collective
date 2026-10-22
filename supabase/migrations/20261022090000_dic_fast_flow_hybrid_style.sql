-- Owner-approved Fast-Flow style expansion, SOURCE ONLY until release authorization.
-- Seven additive text CHECK updates; no existing row/value is rewritten.
begin;
alter table public.workspace_coffees drop constraint if exists workspace_coffees_selected_style_check;
alter table public.workspace_coffees add constraint workspace_coffees_selected_style_check check(selected_style in ('Traditional','Turbo','Fast-Flow','Ristretto','Lungo','Custom'));
alter table public.recipe_families drop constraint if exists recipe_families_style_check;
alter table public.recipe_families add constraint recipe_families_style_check check(style in ('Traditional','Turbo','Fast-Flow','Ristretto','Lungo','Custom'));
alter table public.personal_recipe_families drop constraint if exists personal_recipe_families_style_check;
alter table public.personal_recipe_families add constraint personal_recipe_families_style_check check(style in ('Traditional','Turbo','Fast-Flow','Ristretto','Lungo','Custom'));
alter table public.recipe_preferences drop constraint if exists recipe_preferences_style_check;
alter table public.recipe_preferences add constraint recipe_preferences_style_check check(style in ('Traditional','Turbo','Fast-Flow','Ristretto','Lungo','Custom'));
alter table public.experiments drop constraint if exists experiments_style_check;
alter table public.experiments add constraint experiments_style_check check(style in ('Traditional','Turbo','Fast-Flow','Ristretto','Lungo','Custom'));
alter table public.shots drop constraint if exists shots_style_check;
alter table public.shots add constraint shots_style_check check(style in ('Traditional','Turbo','Fast-Flow','Ristretto','Lungo','Custom'));
alter table public.community_shots drop constraint if exists community_shots_style_check;
alter table public.community_shots add constraint community_shots_style_check check(style in ('Traditional','Turbo','Fast-Flow','Ristretto','Lungo','Custom'));
-- Preserve every existing statement and permission on hardened SECURITY DEFINER.
-- Abort if unexpected function drift/multiple matching allowlists is found.
do $fastflow$
declare definition text;
 old_styles text := $styles$'Traditional','Turbo','Ristretto','Lungo','Custom'$styles$;
 new_styles text := $styles$'Traditional','Turbo','Fast-Flow','Ristretto','Lungo','Custom'$styles$;
begin
 definition:=pg_get_functiondef('private.mutate_workspace(uuid,text,jsonb)'::regprocedure);
 if position(old_styles in definition)=0 or
    position(old_styles in substring(definition from position(old_styles in definition)+length(old_styles)))>0 then
  raise exception 'Expected exactly one original workspace style allowlist; refusing overwrite.';
 end if;
 execute replace(definition,old_styles,new_styles);
end $fastflow$;
commit;
