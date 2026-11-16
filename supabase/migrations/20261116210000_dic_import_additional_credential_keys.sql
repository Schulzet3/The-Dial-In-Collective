-- Issue #509: fail-closed additional credential-key spellings before private backup archiving.
-- Additive development-only definition update. Never modify already imported source,
-- historical migrations, production data, or provider settings. Separate Publish required.
DO $dic_credential_guard_509$
DECLARE
  definition text;
  old_expr constant text := $old$lower(regexp_replace(nodes.k,'[^[:alnum:]]','','g')) in ('apikey','password','accesstoken','refreshtoken','servicerolekey','secretkey')$old$;
  new_expr constant text := $new$lower(regexp_replace(nodes.k,'[^[:alnum:]]','','g')) in ('apikey','password','accesstoken','refreshtoken','servicerolekey','secretkey','clientsecret','privatekey','bearertoken','sessiontoken','idtoken','authtoken','webhooksecret','authorization','credentials')$new$;
BEGIN
  SELECT pg_get_functiondef('private.apply_prototype_import(uuid,jsonb)'::regprocedure)
  INTO definition;
  IF definition IS NULL THEN
    RAISE EXCEPTION 'Import validator function missing; review before migration';
  END IF;
  IF position(new_expr IN definition)>0 AND position(old_expr IN definition)=0 THEN
    RETURN;
  END IF;
  IF position(old_expr IN definition)=0 OR position(new_expr IN definition)>0
     OR length(definition)-length(replace(definition,old_expr,'')) <> length(old_expr) THEN
    RAISE EXCEPTION 'Unexpected import validator source; manual review required';
  END IF;
  EXECUTE replace(definition,old_expr,new_expr) || ';';
END
$dic_credential_guard_509$;
