-- Issue #509: disposable PostgreSQL17 only; synthetic placeholders, never secrets or hosted data.
BEGIN;
DO $dic_new_credential_keys$
DECLARE
  doc jsonb := '{"format":"the-dial-in-collective-prototype-backup","data":{"schemaVersion":1,"mode":"personal","setups":[],"coffees":[],"shots":[],"families":[]}}'::jsonb;
  field text;
  candidate jsonb;
  observed text;
  restricted text[] := ARRAY['client_secret','private-key','bearer.token','session token','id_token','auth token','webhookSecret','authorization','credentials'];
  reject_msg constant text := 'This backup contains a credential field. Export a credentials-free backup first.';
BEGIN
  FOREACH field IN ARRAY restricted LOOP
    candidate := doc || jsonb_build_object(field,'synthetic-placeholder-not-a-secret');
    BEGIN
      PERFORM private.apply_prototype_import('00000000-0000-4000-8000-000000000001'::uuid,candidate);
      RAISE EXCEPTION 'Synthetic credential key passed import: %',field;
    EXCEPTION WHEN SQLSTATE '22023' THEN
      GET STACKED DIAGNOSTICS observed = MESSAGE_TEXT;
      IF observed <> reject_msg THEN
        RAISE EXCEPTION 'Wrong rejection for synthetic key %: %',field,observed;
      END IF;
    END;
  END LOOP;
  candidate := jsonb_set(doc,'{data,metadata}','{"nested":{"client-secret":"synthetic-placeholder"}}'::jsonb,true);
  BEGIN
    PERFORM private.apply_prototype_import('00000000-0000-4000-8000-000000000001'::uuid,candidate);
    RAISE EXCEPTION 'Nested client secret accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS observed = MESSAGE_TEXT;
    IF observed <> reject_msg THEN
      RAISE EXCEPTION 'Nested key bypassed expected guard: %',observed;
    END IF;
  END;
  candidate := doc || jsonb_build_object('coffee-name','benign synthetic roast metadata');
  BEGIN
    PERFORM private.apply_prototype_import('00000000-0000-4000-8000-000000000001'::uuid,candidate);
    RAISE EXCEPTION 'Invalid synthetic backup unexpectedly accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS observed = MESSAGE_TEXT;
    IF observed <> 'This first importer supports one setup, up to 100 coffees and 2000 shots. Nothing was imported.' THEN
      RAISE EXCEPTION 'Benign metadata incorrectly rejected: %',observed;
    END IF;
  END;
  RAISE NOTICE 'PASS: nine synthetic sensitive keys, nested variant and benign metadata';
END
$dic_new_credential_keys$;
ROLLBACK;
