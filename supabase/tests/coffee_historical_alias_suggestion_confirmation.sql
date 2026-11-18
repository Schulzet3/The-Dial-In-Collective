-- Issue #509 R335: rollback-only, synthetic admitted-member historical alias end-to-end regression.
-- Runs ONLY in disposable, network-isolated PostgreSQL 17 database dic_ci.
BEGIN;
DO $dic_alias_endtoend$
DECLARE
  actor uuid := gen_random_uuid();
  canonical_id uuid := gen_random_uuid();
  original_name text := 'Older Original Coffee Synthetic';
  old_alias text := 'Later Verified Coffee Synthetic';
  valid_sid uuid;
  wrong_roaster_sid uuid;
  wrong_lot_sid uuid;
  wrong_origin_sid uuid;
  blocked_sid uuid;
  valid_library uuid := gen_random_uuid();
  bad_roaster_library uuid := gen_random_uuid();
  bad_lot_library uuid := gen_random_uuid();
  bad_origin_library uuid := gen_random_uuid();
  mutation_id uuid := gen_random_uuid();
  payload jsonb;
  found jsonb;
  outcome jsonb;
  replay jsonb;
  before_shots bigint;
  denied boolean;
BEGIN
  IF current_database() <> 'dic_ci' THEN
    RAISE EXCEPTION 'Disposable dic_ci required for issue 509 alias regression';
  END IF;
  SELECT count(*) INTO before_shots FROM public.shots;
  INSERT INTO auth.users(id,aud,role,email)
    VALUES(actor,'authenticated','authenticated',actor::text||'@example.invalid');
  INSERT INTO private.beta_members(owner_id,enabled,admitted_at)
    VALUES(actor,true,now())
    ON CONFLICT(owner_id) DO UPDATE SET enabled=EXCLUDED.enabled,admitted_at=EXCLUDED.admitted_at;
  INSERT INTO public.coffees(id,name,roaster,release_label,origin,verification_state)
    VALUES(canonical_id,original_name,'Synthetic Alias Roaster','2026 synthetic lot',
           'Ethiopia Synthetic','verified');
  INSERT INTO private.dic_coffee_aliases(coffee_id,alias_key,original_name,origin_kind)
    VALUES(canonical_id,private.dic_coffee_key(old_alias),old_alias,'user_confirmed');

  INSERT INTO public.coffee_submissions(owner_id,proposed_data)
    VALUES(actor,jsonb_build_object('name',old_alias,'roaster','Synthetic Alias Roaster',
           'release_label','2026 synthetic lot','origin','Ethiopia Synthetic'))
    RETURNING id INTO valid_sid;
  INSERT INTO public.library_entries(id,owner_id,submission_id)
    VALUES(valid_library,actor,valid_sid);
  INSERT INTO public.coffee_submissions(owner_id,proposed_data)
    VALUES(actor,jsonb_build_object('name',old_alias,'roaster','Completely Different Coffee Brand',
           'release_label','2026 synthetic lot','origin','Ethiopia Synthetic'))
    RETURNING id INTO wrong_roaster_sid;
  INSERT INTO public.library_entries(id,owner_id,submission_id)
    VALUES(bad_roaster_library,actor,wrong_roaster_sid);
  INSERT INTO public.coffee_submissions(owner_id,proposed_data)
    VALUES(actor,jsonb_build_object('name',old_alias,'roaster','Synthetic Alias Roaster',
           'release_label','2027 synthetic lot','origin','Ethiopia Synthetic'))
    RETURNING id INTO wrong_lot_sid;
  INSERT INTO public.library_entries(id,owner_id,submission_id)
    VALUES(bad_lot_library,actor,wrong_lot_sid);
  INSERT INTO public.coffee_submissions(owner_id,proposed_data)
    VALUES(actor,jsonb_build_object('name',old_alias,'roaster','Synthetic Alias Roaster',
           'release_label','2026 synthetic lot','origin','Colombia Synthetic'))
    RETURNING id INTO wrong_origin_sid;
  INSERT INTO public.library_entries(id,owner_id,submission_id)
    VALUES(bad_origin_library,actor,wrong_origin_sid);

  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  EXECUTE 'set local role authenticated';

  found:=public.dic_find_coffee_matches(jsonb_build_object(
    'name',old_alias,'roaster','Synthetic Alias Roaster',
    'release_label','2026 synthetic lot','origin','Ethiopia Synthetic'));
  IF found->>'classification' IS DISTINCT FROM 'needs_confirmation'
    OR found->>'exact_id' IS NOT NULL
    OR NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(found->'candidates') AS q(item)
       WHERE q.item->>'id'=canonical_id::text
         AND q.item->>'match_kind'='similar_name')
  THEN
    RAISE EXCEPTION 'Stored alias must suggest ONLY, not auto-link: %',found;
  END IF;

  found:=public.dic_find_coffee_matches(jsonb_build_object(
    'name',original_name,'roaster','Synthetic Alias Roaster',
    'release_label','2026 synthetic lot','origin','Ethiopia Synthetic'));
  IF found->>'classification' IS DISTINCT FROM 'exact_verified'
    OR found->>'exact_id' IS DISTINCT FROM canonical_id::text THEN
    RAISE EXCEPTION 'Exact canonical-name reuse regressed: %',found;
  END IF;

  found:=public.dic_find_coffee_matches(jsonb_build_object(
    'name',old_alias,'roaster','Completely Different Coffee Brand',
    'release_label','2026 synthetic lot','origin','Ethiopia Synthetic'));
  IF jsonb_array_length(found->'candidates')<>0 OR found->>'exact_id' IS NOT NULL THEN
    RAISE EXCEPTION 'Alias leaked across different roasters: %',found;
  END IF;
  found:=public.dic_find_coffee_matches(jsonb_build_object(
    'name',old_alias,'roaster','Synthetic Alias Roaster',
    'release_label','2027 synthetic lot','origin','Ethiopia Synthetic'));
  IF jsonb_array_length(found->'candidates')<>0 OR found->>'exact_id' IS NOT NULL THEN
    RAISE EXCEPTION 'Alias suggested contradictory harvest/lot: %',found;
  END IF;
  found:=public.dic_find_coffee_matches(jsonb_build_object(
    'name',old_alias,'roaster','Synthetic Alias Roaster',
    'release_label','2026 synthetic lot','origin','Colombia Synthetic'));
  IF jsonb_array_length(found->'candidates')<>0 OR found->>'exact_id' IS NOT NULL THEN
    RAISE EXCEPTION 'Alias suggested contradictory origin: %',found;
  END IF;

  FOREACH blocked_sid IN ARRAY ARRAY[wrong_roaster_sid,wrong_lot_sid,wrong_origin_sid] LOOP
    denied:=false;
    BEGIN
      PERFORM public.dic_apply_client_change(actor,gen_random_uuid(),
        'confirm_coffee_existing',
        jsonb_build_object('submission_id',blocked_sid,'coffee_id',canonical_id));
    EXCEPTION WHEN SQLSTATE '23514' THEN
      denied:=true;
    END;
    IF NOT denied THEN
      RAISE EXCEPTION 'Incompatible alias confirmation was not rejected: %',blocked_sid;
    END IF;
  END LOOP;

  payload:=jsonb_build_object('submission_id',valid_sid,'coffee_id',canonical_id);
  outcome:=public.dic_apply_client_change(actor,mutation_id,'confirm_coffee_existing',payload);
  replay:=public.dic_apply_client_change(actor,mutation_id,'confirm_coffee_existing',payload);
  EXECUTE 'reset role';
  IF outcome->>'ok' IS DISTINCT FROM 'true'
    OR outcome->>'coffee_id' IS DISTINCT FROM canonical_id::text
    OR outcome->>'library_entry_id' IS DISTINCT FROM valid_library::text
    OR replay IS DISTINCT FROM outcome
    OR (SELECT name FROM public.coffees WHERE id=canonical_id) IS DISTINCT FROM original_name
    OR (SELECT coffee_id FROM public.library_entries WHERE id=valid_library) IS DISTINCT FROM canonical_id
    OR (SELECT submission_id FROM public.library_entries WHERE id=valid_library) IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.coffee_submissions
               WHERE id IN(wrong_roaster_sid,wrong_lot_sid,wrong_origin_sid)
               AND status IS DISTINCT FROM 'pending')
    OR EXISTS (SELECT 1 FROM public.library_entries
               WHERE id IN(bad_roaster_library,bad_lot_library,bad_origin_library)
               AND (coffee_id IS NOT NULL OR submission_id IS NULL))
    OR (SELECT count(*) FROM private.dic_coffee_aliases WHERE coffee_id=canonical_id)<>1
    OR (SELECT count(*) FROM public.shots) IS DISTINCT FROM before_shots
  THEN
    RAISE EXCEPTION 'Alias confirmation broke identity, idempotency, Pending or history: %',outcome;
  END IF;
END $dic_alias_endtoend$;
SELECT 'PASS: alias suggestion-only, explicit confirmation, canonical control, cross-roaster/lot/origin denial, receipt replay and private history; rollback' AS result;
ROLLBACK;
