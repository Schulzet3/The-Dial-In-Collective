-- Issue #509 Run153. Reject separator-spelled credential keys before any imported
-- personal-backup JSON can be archived in private.import_batches.source_document.
-- Narrow idempotent code change to the live-reviewed validator; historical migrations
-- and already-imported private records are preserved. Production deployment NOT authorized.
DO $dic_import_credential_guard$
DECLARE
  definition text;
  old_expr constant text := 'lower(replace(nodes.k,''_'',''''))';
  new_expr constant text := 'lower(regexp_replace(nodes.k,''[^[:alnum:]]'','',''g''))';
BEGIN
  SELECT pg_get_functiondef('private.apply_prototype_import(uuid,jsonb)'::regprocedure)
  INTO definition;
  IF definition IS NULL OR position(old_expr IN definition)=0
     OR position(new_expr IN definition)>0
     OR length(definition)-length(replace(definition,old_expr,'')) <> length(old_expr) THEN
    RAISE EXCEPTION 'Unexpected import credential validator source; manual review required';
  END IF;
  -- pg_get_functiondef omits its terminating semicolon, required for dynamic execution.
  EXECUTE replace(definition,old_expr,new_expr) || ';';
END
$dic_import_credential_guard$;
