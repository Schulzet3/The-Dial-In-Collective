-- Issue #509: synthetic transaction-only trigger validation, no real member records.
BEGIN;
CREATE TEMPORARY TABLE dic_ci_context_controls (recommendation_context jsonb);
CREATE TRIGGER dic_ci_context_controls_guard
 BEFORE INSERT ON dic_ci_context_controls FOR EACH ROW
 EXECUTE FUNCTION private.dic_capture_recommendation_context();
DO $validation$
DECLARE got jsonb;
BEGIN
 IF current_database()<>'dic_ci' THEN RAISE EXCEPTION 'Disposable dic_ci required'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_trigger
   WHERE tgname='dic_capture_recommendation_context'
     AND tgrelid='public.shots'::regclass AND NOT tgisinternal
 ) THEN RAISE EXCEPTION 'Original shot trigger attachment unexpectedly missing'; END IF;
 IF has_function_privilege('anon','private.dic_capture_recommendation_context()','EXECUTE')
   OR has_function_privilege('authenticated','private.dic_capture_recommendation_context()','EXECUTE')
 THEN RAISE EXCEPTION 'Private trigger callable by client SQL roles'; END IF;
 PERFORM set_config('dic.recommendation_context',
   '{"used_controls":[null],"source_label":"invalid-null"}',true);
 INSERT INTO dic_ci_context_controls DEFAULT VALUES RETURNING recommendation_context INTO got;
 IF got IS NOT NULL THEN RAISE EXCEPTION 'JSON null control accepted: %',got; END IF;
 PERFORM set_config('dic.recommendation_context',
   '{"used_controls":["grind",null],"source_label":"invalid-mixed"}',true);
 INSERT INTO dic_ci_context_controls DEFAULT VALUES RETURNING recommendation_context INTO got;
 IF got IS NOT NULL THEN RAISE EXCEPTION 'Mixed JSON null control accepted: %',got; END IF;
 PERFORM set_config('dic.recommendation_context',
   '{"used_controls":["grind","unapproved"],"source_label":"invalid-name"}',true);
 INSERT INTO dic_ci_context_controls DEFAULT VALUES RETURNING recommendation_context INTO got;
 IF got IS NOT NULL THEN RAISE EXCEPTION 'Unknown control accepted: %',got; END IF;
 PERFORM set_config('dic.recommendation_context',
   '{"used_controls":["grind"],"source_label":"valid-one"}',true);
 INSERT INTO dic_ci_context_controls DEFAULT VALUES RETURNING recommendation_context INTO got;
 IF got IS NULL OR got->>'kind'<>'member_selected_starting_reference'
    OR got->>'source_label'<>'valid-one'
    OR got->'used_controls'<>'["grind"]'::jsonb
    OR got->>'source_verified_independently'<>'false'
 THEN RAISE EXCEPTION 'Valid one-control context changed: %',got; END IF;
 PERFORM set_config('dic.recommendation_context',
   '{"used_controls":["grind","temperature"],"source_label":"valid-two"}',true);
 INSERT INTO dic_ci_context_controls DEFAULT VALUES RETURNING recommendation_context INTO got;
 IF got IS NULL OR got->'used_controls'<>'["grind","temperature"]'::jsonb
    OR got->>'source_label'<>'valid-two'
 THEN RAISE EXCEPTION 'Valid two-control context changed: %',got; END IF;
 PERFORM set_config('dic.recommendation_context',
   '{"used_controls":[],"source_label":"empty"}',true);
 INSERT INTO dic_ci_context_controls DEFAULT VALUES RETURNING recommendation_context INTO got;
 IF got IS NOT NULL THEN RAISE EXCEPTION 'Zero controls accepted: %',got; END IF;
 RAISE NOTICE 'PASS: null/mixed/unknown controls rejected; both valid cases retained, scope/trigger/role grants preserved.';
END $validation$;
ROLLBACK;
