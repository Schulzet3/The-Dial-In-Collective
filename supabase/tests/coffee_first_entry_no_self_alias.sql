-- Issue #509 R333: rollback-only first-entry/alias semantics in disposable PG17 dic_ci.
BEGIN;
DO $dic_first_entry_alias$
DECLARE
  first_owner uuid := gen_random_uuid();
  later_owner uuid := gen_random_uuid();
  canonical_id uuid := gen_random_uuid();
  early_submission uuid;
  later_submission uuid;
  first_library uuid := gen_random_uuid();
  second_library uuid := gen_random_uuid();
  response jsonb;
  before_shots bigint;
  earliest_name text := 'Older Original Coffee Synthetic';
  provisional_name text := 'Later Verified Coffee Synthetic';
  later_name text := 'Third Alternate Coffee Synthetic';
BEGIN
  IF current_database() <> 'dic_ci' THEN
    RAISE EXCEPTION 'Disposable dic_ci database required';
  END IF;
  SELECT count(*) INTO before_shots FROM public.shots;
  INSERT INTO auth.users(id,aud,role,email) VALUES
    (first_owner,'authenticated','authenticated',first_owner::text||'@example.invalid'),
    (later_owner,'authenticated','authenticated',later_owner::text||'@example.invalid');
  INSERT INTO public.coffees(id,name,roaster,verification_state,created_at)
    VALUES(canonical_id,provisional_name,'Synthetic Alias Roaster','verified',now()-interval '1 day');
  INSERT INTO public.coffee_submissions(owner_id,proposed_data,created_at)
    VALUES(first_owner,jsonb_build_object('name',earliest_name,'roaster','Synthetic Alias Roaster'),
           now()-interval '4 days')
    RETURNING id INTO early_submission;
  INSERT INTO public.library_entries(id,owner_id,submission_id)
    VALUES(first_library,first_owner,early_submission);
  response := private.dic_link_pending_coffee(early_submission,canonical_id,'admin_reviewed_merge','{}'::jsonb);
  IF response->>'ok' IS DISTINCT FROM 'true'
    OR response->>'canonical_name' IS DISTINCT FROM earliest_name
    OR (SELECT name FROM public.coffees WHERE id=canonical_id) IS DISTINCT FROM earliest_name
    OR NOT EXISTS (SELECT 1 FROM private.dic_coffee_first_entry WHERE coffee_id=canonical_id
                   AND first_submission_id=early_submission AND primary_name=earliest_name)
    OR NOT EXISTS (SELECT 1 FROM private.dic_coffee_aliases WHERE coffee_id=canonical_id
                   AND alias_key=private.dic_coffee_key(provisional_name))
    OR EXISTS (SELECT 1 FROM private.dic_coffee_aliases WHERE coffee_id=canonical_id
               AND alias_key=private.dic_coffee_key(earliest_name))
    OR NOT EXISTS (SELECT 1 FROM public.library_entries WHERE id=first_library
                   AND owner_id=first_owner AND coffee_id=canonical_id AND submission_id IS NULL)
  THEN
    RAISE EXCEPTION 'Earliest name/old alias/self-alias/first library invariant failed: %',response;
  END IF;
  INSERT INTO public.coffee_submissions(owner_id,proposed_data,created_at)
    VALUES(later_owner,jsonb_build_object('name',later_name,'roaster','Synthetic Alias Roaster'),now())
    RETURNING id INTO later_submission;
  INSERT INTO public.library_entries(id,owner_id,submission_id)
    VALUES(second_library,later_owner,later_submission);
  response := private.dic_link_pending_coffee(later_submission,canonical_id,'admin_reviewed_merge','{}'::jsonb);
  IF response->>'ok' IS DISTINCT FROM 'true'
     OR response->>'canonical_name' IS DISTINCT FROM earliest_name
     OR (SELECT name FROM public.coffees WHERE id=canonical_id) IS DISTINCT FROM earliest_name
     OR (SELECT count(*) FROM private.dic_coffee_aliases WHERE coffee_id=canonical_id) <> 2
     OR NOT EXISTS (SELECT 1 FROM private.dic_coffee_aliases WHERE coffee_id=canonical_id
                    AND alias_key=private.dic_coffee_key(later_name))
     OR EXISTS (SELECT 1 FROM private.dic_coffee_aliases WHERE coffee_id=canonical_id
                AND alias_key=private.dic_coffee_key(earliest_name))
     OR NOT EXISTS (SELECT 1 FROM public.library_entries WHERE id=second_library
                    AND owner_id=later_owner AND coffee_id=canonical_id AND submission_id IS NULL)
     OR (SELECT count(*) FROM public.shots) IS DISTINCT FROM before_shots
  THEN
    RAISE EXCEPTION 'Later noncanonical alias/library/history invariant failed: %',response;
  END IF;
END $dic_first_entry_alias$;
SELECT 'PASS: first original canonical, old and later noncanonical aliases retained, no self alias, IDs/shots unchanged; rollback' AS result;
ROLLBACK;
