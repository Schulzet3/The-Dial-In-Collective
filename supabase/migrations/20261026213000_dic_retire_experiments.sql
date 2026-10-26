-- Owner-Locked UX-RETIRE-EXPERIMENTS-20261026, Issue #13.
-- SOURCE ONLY: DO NOT apply to hosted Supabase without the owner's separate
-- publish instruction and a fresh verified pre-destructive encrypted backup.
-- Retire unused Experiment schema, not historical shots, notes, private families,
-- community contributions, favorite selections or mutation receipts.
-- Atomic transaction; all replacement anchors fail closed before any DDL is committed.
do $retire_experiments$
declare
  ddl text;
  needle text;
  replacement text;
begin
  -- This staged migration MUST NOT silently discard a late-arriving member
  -- experiment or shot. Serializing the tables prevents inserts after preflight.
  lock table public.shots in access exclusive mode;
  lock table public.experiments in access exclusive mode;
  if exists (select 1 from public.experiments) or
     exists (select 1 from public.shots where experiment_id is not null) then
    raise exception using errcode='23514',
      message='Experiment records or shot links exist. Abort retirement and preserve them; obtain reviewed recovery before any destructive change.';
  end if;

  -- Keep security-definer ownership, grants, authentication, read isolation,
  -- revision and receipt semantics exactly as installed. Only remove dead
  -- Experiment references; never recreate these functions with weaker guards.
  select pg_get_functiondef('private.read_personal_state()'::regprocedure) into ddl;
  needle := $old$,
  'experiments',coalesce((select jsonb_agg(to_jsonb(x)) from public.experiments x where owner_id=u),'[]'::jsonb)$old$;
  if ddl is null or strpos(ddl,needle)=0 then
    raise exception 'Expected owner-scoped Experiment read mapping changed; abort migration.';
  end if;
  ddl := replace(ddl,needle,'');
  execute ddl;

  select pg_get_functiondef('private.mutate_workspace(uuid,text,jsonb)'::regprocedure) into ddl;
  needle := $old$  update public.experiments set state='promoted',ended_at=now() where owner_id=u and setup_version_id=sh.setup_version_id and library_entry_id=sh.library_entry_id and style=sh.style and state='active';$old$;
  if ddl is null or strpos(ddl,needle)=0 then
    raise exception 'Expected Make Current Experiment side effect changed; abort migration.';
  end if;
  ddl := replace(ddl,needle,'');
  execute ddl;

  -- New prototype backups omit the retired collection; historic empty
  -- arrays remain compatible. Any nonempty archive or linked shot refuses
  -- import without losing its source or silently rewriting member identity.
  select pg_get_functiondef('private.apply_prototype_import(uuid,jsonb)'::regprocedure) into ddl;
  needle := $old$foreach k in array array['setups','coffees','shots','families','experiments'] loop$old$;
  if ddl is null or strpos(ddl,needle)=0 then
    raise exception 'Expected prototype import list changed; abort migration.';
  end if;
  ddl := replace(ddl,needle,$new$foreach k in array array['setups','coffees','shots','families'] loop$new$);
  needle := $old$if jsonb_array_length(d->'experiments')<>0 then raise exception using errcode='22023',message='Experiment migration is not enabled yet. Keep this backup; no records were imported.'; end if;$old$;
  if strpos(ddl,needle)=0 then
    raise exception 'Expected legacy Experiment import guard changed; abort migration.';
  end if;
  replacement := $new$if d ? 'experiments' then
  if jsonb_typeof(d->'experiments') is distinct from 'array' then
   raise exception using errcode='22023',message='Retired Experiment archive is malformed. Keep the original backup; nothing was imported.';
  end if;
  if jsonb_array_length(d->'experiments')<>0 then
   raise exception using errcode='22023',message='Retired Experiment records cannot be imported without loss. Keep the original backup; nothing was imported.';
  end if;
 end if;
 if exists (
  select 1 from jsonb_array_elements(d->'shots') x
  where (x ? 'experimentId' and x->'experimentId' <> 'null'::jsonb)
     or (x ? 'experiment_id' and x->'experiment_id' <> 'null'::jsonb)
 ) then
  raise exception using errcode='22023',message='Retired Experiment shot links require archival recovery. Keep the original backup; nothing was imported.';
 end if;$new$;
  ddl := replace(ddl,needle,replacement);
  execute ddl;

  -- Explicit RESTRICT, never CASCADE. Dropping this unused column removes
  -- its composite FK and dedicated index without touching personal families.
  alter table public.shots drop column experiment_id;
  drop table public.experiments restrict;
end
$retire_experiments$;
