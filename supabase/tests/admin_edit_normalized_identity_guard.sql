-- #509 R345. DISCONNECTED dic_ci PostgreSQL 17 only, synthetic and fully rolled back.
BEGIN;
DO $admin_normalized_identity$
DECLARE
  admin_id uuid := '10000000-0000-4000-8000-000000000001';
  coffee_id uuid := gen_random_uuid();
  old_revision bigint;
  got jsonb;
  denied boolean;
  diagnostic text;
  original_id uuid;
  before_shots bigint;
BEGIN
  IF current_database() <> 'dic_ci' THEN RAISE EXCEPTION 'Disposable dic_ci database required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM private.app_admins a WHERE a.owner_id=admin_id) THEN
    RAISE EXCEPTION 'Test harness admin missing';
  END IF;
  SELECT count(*) INTO before_shots FROM public.shots;
  INSERT INTO public.coffees(id,name,roaster,verification_state,origin,release_label)
  VALUES(coffee_id,'Original Meaningful Coffee','Fixture Roaster','verified','Fixture Origin','Fixture Lot')
  RETURNING revision,id INTO old_revision,original_id;
  IF private.dic_coffee_key('!!!') IS NOT NULL
     OR private.dic_canonical_roaster_key('!!!') IS NOT NULL THEN
    RAISE EXCEPTION 'Punctuation-only synthetic identity unexpectedly normalizes';
  END IF;
  PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  EXECUTE 'set local role authenticated';
  denied:=false;
  BEGIN
    PERFORM public.dic_admin_edit_coffee(coffee_id,old_revision,
      jsonb_build_object('name','!!!'),NULL,'approved');
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS diagnostic = MESSAGE_TEXT;
    denied:=(diagnostic='Coffee name/roaster are required (max 200 characters).');
  END;
  IF NOT denied THEN RAISE EXCEPTION 'NULL normalized admin coffee name accepted'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.dic_admin_edit_coffee(coffee_id,old_revision,
      jsonb_build_object('roaster','!!!'),NULL,'approved');
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS diagnostic = MESSAGE_TEXT;
    denied:=(diagnostic='Coffee name/roaster are required (max 200 characters).');
  END;
  IF NOT denied THEN RAISE EXCEPTION 'NULL normalized admin roaster accepted'; END IF;
  got:=public.dic_admin_edit_coffee(coffee_id,old_revision,
    jsonb_build_object('name','Updated Meaningful Coffee'),NULL,'approved');
  IF got->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Ordinary admin canonical rename rejected'; END IF;
  got:=public.dic_admin_edit_coffee(coffee_id,(got->>'revision')::bigint,
    jsonb_build_object('roaster','Updated Fixture Roaster'),NULL,'approved');
  IF got->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Ordinary admin roaster rename rejected'; END IF;
  EXECUTE 'reset role';
  IF original_id IS DISTINCT FROM coffee_id OR
     (SELECT name FROM public.coffees WHERE id=coffee_id) IS DISTINCT FROM 'Updated Meaningful Coffee' OR
     (SELECT roaster FROM public.coffees WHERE id=coffee_id) IS DISTINCT FROM 'Updated Fixture Roaster' OR
     (SELECT count(*) FROM private.admin_content_edits WHERE record_id=coffee_id AND record_kind='approved') <> 2 OR
     (SELECT count(*) FROM public.shots) <> before_shots THEN
    RAISE EXCEPTION 'Valid admin corrections, canonical identity, audit or shot history changed';
  END IF;
END $admin_normalized_identity$;
SELECT 'PASS: punctuation-only name/roaster refused, valid admin edits/audits retained, no personal shot changes; rollback' AS result;
ROLLBACK;
