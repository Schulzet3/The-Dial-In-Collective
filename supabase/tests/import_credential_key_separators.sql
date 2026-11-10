-- #509 Run153: after *all* source migrations in isolated dic_ci only.
-- Historical native_import.sql intentionally remains bound to 20261012183845
-- before later migration changes; these regressions require the final schema.
BEGIN;
DO $dic_import_keys$
DECLARE
  doc jsonb := '{"format":"the-dial-in-collective-prototype-backup","data":{"schemaVersion":1,"mode":"personal","setups":[],"coffees":[],"shots":[],"families":[]}}'::jsonb;
  candidate jsonb;
  field text;
  observed_message text;
  normalized_cases text[] := ARRAY['api-key','api key','access-token','refresh.token','secret.key','api_key','password'];
  required_rejection constant text := 'This backup contains a credential field. Export a credentials-free backup first.';
BEGIN
  FOREACH field IN ARRAY normalized_cases LOOP
    candidate := doc || jsonb_build_object(field,'synthetic-placeholder-not-a-secret');
    BEGIN
      PERFORM private.apply_prototype_import('00000000-0000-4000-8000-000000000001'::uuid,candidate);
      RAISE EXCEPTION 'Importer accepted synthetic credential key: %', field;
    EXCEPTION WHEN SQLSTATE '22023' THEN
      GET STACKED DIAGNOSTICS observed_message = MESSAGE_TEXT;
      IF observed_message <> required_rejection THEN
        RAISE EXCEPTION 'Incorrect rejection for synthetic credential key %: %',field,observed_message;
      END IF;
    END;
  END LOOP;
  candidate := jsonb_set(doc,'{data,legacyEnrichment}','{"metadata":{"access token":"synthetic-placeholder"}}'::jsonb,true);
  BEGIN
    PERFORM private.apply_prototype_import('00000000-0000-4000-8000-000000000001'::uuid,candidate);
    RAISE EXCEPTION 'Nested synthetic access token field accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS observed_message = MESSAGE_TEXT;
    IF observed_message <> required_rejection THEN
      RAISE EXCEPTION 'Nested synthetic credential field was not rejected by credential guard: %',observed_message;
    END IF;
  END;
  candidate := doc || jsonb_build_object('coffee-name','benign coffee metadata');
  BEGIN
    PERFORM private.apply_prototype_import('00000000-0000-4000-8000-000000000001'::uuid,candidate);
    RAISE EXCEPTION 'Incomplete synthetic backup unexpectedly importable';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS observed_message = MESSAGE_TEXT;
    IF observed_message <> 'This first importer supports one setup, up to 100 coffees and 2000 shots. Nothing was imported.' THEN
      RAISE EXCEPTION 'Benign hyphenated metadata rejected for unexpected reason: %',observed_message;
    END IF;
  END;
  RAISE NOTICE 'PASS: 7 credential spellings + nested access token; benign metadata allowed past credential guard';
END
$dic_import_keys$;
ROLLBACK;
