-- Issue #509 R340: disposable dic_ci PG17 transaction-only SQL regression.
BEGIN;
CREATE TEMPORARY TABLE dic_ci_unique_recommendation (recommendation_context jsonb);
CREATE TRIGGER dic_ci_unique_recommendation_before
 BEFORE INSERT ON dic_ci_unique_recommendation FOR EACH ROW
 EXECUTE FUNCTION private.dic_capture_recommendation_context();
DO $validation$
DECLARE got jsonb;
BEGIN
 IF current_database()<>'dic_ci' THEN RAISE EXCEPTION 'Disposable dic_ci required'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='dic_capture_recommendation_context'
   AND tgrelid='public.shots'::regclass AND NOT tgisinternal)
 THEN RAISE EXCEPTION 'Original shot provenance trigger missing'; END IF;
 IF has_function_privilege('anon','private.dic_capture_recommendation_context()','EXECUTE')
    OR has_function_privilege('authenticated','private.dic_capture_recommendation_context()','EXECUTE')
 THEN RAISE EXCEPTION 'Client SQL role gained private trigger EXECUTE'; END IF;
 PERFORM set_config('dic.recommendation_context',
  '{"used_controls":["grind","grind"],"source_label":"repeat-grind"}',true);
 INSERT INTO dic_ci_unique_recommendation DEFAULT VALUES RETURNING recommendation_context INTO got;
 IF got IS NOT NULL THEN RAISE EXCEPTION 'Repeated grind misreported as distinct controls: %',got; END IF;
 PERFORM set_config('dic.recommendation_context',
  '{"used_controls":["temperature","temperature"],"source_label":"repeat-temperature"}',true);
 INSERT INTO dic_ci_unique_recommendation DEFAULT VALUES RETURNING recommendation_context INTO got;
 IF got IS NOT NULL THEN RAISE EXCEPTION 'Repeated temperature misreported as distinct controls: %',got; END IF;
 PERFORM set_config('dic.recommendation_context',
  '{"used_controls":[null,"grind"],"source_label":"null-control"}',true);
 INSERT INTO dic_ci_unique_recommendation DEFAULT VALUES RETURNING recommendation_context INTO got;
 IF got IS NOT NULL THEN RAISE EXCEPTION 'Previous NULL guard regressed: %',got; END IF;
 PERFORM set_config('dic.recommendation_context',
  '{"used_controls":["grind","unknown"],"source_label":"unknown-control"}',true);
 INSERT INTO dic_ci_unique_recommendation DEFAULT VALUES RETURNING recommendation_context INTO got;
 IF got IS NOT NULL THEN RAISE EXCEPTION 'Previous unknown-control guard regressed: %',got; END IF;
 PERFORM set_config('dic.recommendation_context',
  '{"used_controls":["grind"],"source_label":"valid-single"}',true);
 INSERT INTO dic_ci_unique_recommendation DEFAULT VALUES RETURNING recommendation_context INTO got;
 IF got IS NULL OR got->'used_controls'<>'["grind"]'::jsonb
  OR got->>'source_label'<>'valid-single' OR got->>'kind'<>'member_selected_starting_reference'
  OR got->>'source_verified_independently'<>'false'
 THEN RAISE EXCEPTION 'Valid single-control provenance changed: %',got; END IF;
 PERFORM set_config('dic.recommendation_context',
  '{"used_controls":["grind","temperature"],"source_label":"valid-pair","community_tier":"exact","contributor_count":2,"shot_count":4}',true);
 INSERT INTO dic_ci_unique_recommendation DEFAULT VALUES RETURNING recommendation_context INTO got;
 IF got IS NULL OR got->'used_controls'<>'["grind","temperature"]'::jsonb
   OR got->>'community_tier'<>'exact' OR got->>'contributor_count'<>'2'
   OR got->>'shot_count'<>'4' OR got->>'source_label'<>'valid-pair'
 THEN RAISE EXCEPTION 'Valid two-control provenance/context changed: %',got; END IF;
 RAISE NOTICE 'PASS: duplicate grind/temperature rejected; prior null and unknown guards, valid provenance, shot trigger and role grants preserved; rollback';
END $validation$;
ROLLBACK;
