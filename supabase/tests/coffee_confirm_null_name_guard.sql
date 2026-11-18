-- Issue #509 R332. Isolated PostgreSQL 17.11 dic_ci ONLY; synthetic users and records; rollback.
BEGIN;
DO $confirm_name_null_guard$
DECLARE
  member_id uuid := gen_random_uuid();
  canonical_id uuid := gen_random_uuid();
  invalid_submission_id uuid;
  valid_submission_id uuid;
  original_library uuid := gen_random_uuid();
  valid_library uuid := gen_random_uuid();
  response jsonb;
  rejected boolean := false;
  reject_message text;
  before_shots bigint;
BEGIN
  IF current_database() <> 'dic_ci' THEN
    RAISE EXCEPTION 'Disposable dic_ci database required';
  END IF;
  SELECT count(*) INTO before_shots FROM public.shots;
  INSERT INTO auth.users(id,aud,role,email)
  VALUES(member_id,'authenticated','authenticated',member_id::text||'@example.invalid');
  INSERT INTO private.beta_members(owner_id,enabled,admitted_at)
  VALUES(member_id,true,now())
  ON CONFLICT (owner_id) DO UPDATE SET enabled=EXCLUDED.enabled,admitted_at=EXCLUDED.admitted_at;
  INSERT INTO public.coffees(id,name,roaster,release_label,origin,verification_state)
  VALUES(canonical_id,'Known Lot Synthetic','Synthetic Guard Roaster',
         '2026 synthetic lot','Region Fixture','verified');
  INSERT INTO public.coffee_submissions(owner_id,proposed_data)
  VALUES(member_id,jsonb_build_object('name','!!!','roaster','Synthetic Guard Roaster',
      'release_label','2026 synthetic lot','origin','Region Fixture'))
  RETURNING id INTO invalid_submission_id;
  INSERT INTO public.library_entries(id,owner_id,submission_id)
  VALUES(original_library,member_id,invalid_submission_id);
  INSERT INTO public.coffee_submissions(owner_id,proposed_data)
  VALUES(member_id,jsonb_build_object('name','Known Lot Synthetic','roaster','Synthetic Guard Roaster',
      'release_label','2026 synthetic lot','origin','Region Fixture'))
  RETURNING id INTO valid_submission_id;
  INSERT INTO public.library_entries(id,owner_id,submission_id)
  VALUES(valid_library,member_id,valid_submission_id);
  IF private.dic_coffee_key('!!!') IS NOT NULL THEN
    RAISE EXCEPTION 'Synthetic punctuation-only title unexpectedly normalized';
  END IF;
  PERFORM set_config('request.jwt.claim.sub',member_id::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  EXECUTE 'set local role authenticated';
  BEGIN
    response := public.dic_apply_client_change(
      member_id,gen_random_uuid(),'confirm_coffee_existing',
      jsonb_build_object('submission_id',invalid_submission_id,'coffee_id',canonical_id));
  EXCEPTION WHEN SQLSTATE '23514' THEN
    GET STACKED DIAGNOSTICS reject_message = MESSAGE_TEXT;
    rejected := (reject_message = 'The names are too different for self-confirmed merging.');
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'NULL-normalized title bypassed self-confirmation identity guard: %',response;
  END IF;
  response := public.dic_apply_client_change(
    member_id,gen_random_uuid(),'confirm_coffee_existing',
    jsonb_build_object('submission_id',valid_submission_id,'coffee_id',canonical_id));
  EXECUTE 'reset role';
  IF response->>'ok' IS DISTINCT FROM 'true'
     OR response->>'coffee_id' IS DISTINCT FROM canonical_id::text
     OR response->>'library_entry_id' IS DISTINCT FROM valid_library::text
     OR (SELECT status FROM public.coffee_submissions WHERE id=invalid_submission_id) IS DISTINCT FROM 'pending'
     OR (SELECT submission_id FROM public.library_entries WHERE id=original_library) IS DISTINCT FROM invalid_submission_id
     OR (SELECT coffee_id FROM public.library_entries WHERE id=original_library) IS NOT NULL
     OR (SELECT coffee_id FROM public.library_entries WHERE id=valid_library) IS DISTINCT FROM canonical_id
     OR (SELECT count(*) FROM public.shots) IS DISTINCT FROM before_shots
  THEN
    RAISE EXCEPTION 'Guard broke valid confirmation or changed rejected/private member state: %',response;
  END IF;
END $confirm_name_null_guard$;
SELECT 'PASS: NULL-normalized rejected, valid same-name confirmation preserved; no personal/history edits; rollback' AS result;
ROLLBACK;
