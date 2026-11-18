-- Issue #509 R335: rollback-only synthetic PostgreSQL17 dic_ci regression.
BEGIN;
DO $dic_alias_matching$
DECLARE
 member_id uuid := gen_random_uuid();
 canonical_id uuid := gen_random_uuid();
 ok_submission uuid; other_roaster_submission uuid; other_lot_submission uuid; other_origin_submission uuid;
 ok_library uuid := gen_random_uuid();
 other_roaster_library uuid := gen_random_uuid();
 other_lot_library uuid := gen_random_uuid();
 other_origin_library uuid := gen_random_uuid();
 canonical_name text := 'Older Original Coffee Synthetic';
 historical_alias text := 'Later Verified Coffee Synthetic';
 found jsonb; response jsonb; contains_canonical boolean; denied boolean;
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
 ON CONFLICT(owner_id) DO UPDATE SET enabled=EXCLUDED.enabled,admitted_at=EXCLUDED.admitted_at;
 INSERT INTO public.coffees(id,name,roaster,release_label,origin,verification_state,created_at)
 VALUES(canonical_id,canonical_name,'Synthetic Alias Roaster','Lot 2026','Region A','verified',
        now()-interval '10 days');
 INSERT INTO private.dic_coffee_aliases(coffee_id,alias_key,original_name,origin_kind)
 VALUES(canonical_id,private.dic_coffee_key(historical_alias),historical_alias,'user_confirmed');

 PERFORM set_config('request.jwt.claim.sub',member_id::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 EXECUTE 'set local role authenticated';
 found:=public.dic_find_coffee_matches(jsonb_build_object('name',historical_alias,
   'roaster','Synthetic Alias Roaster','release_label','Lot 2026','origin','Region A'));
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(found->'candidates','[]'::jsonb)) AS item(value)
               WHERE item.value->>'id'=canonical_id::text) INTO contains_canonical;
 IF found->>'classification' IS DISTINCT FROM 'needs_confirmation'
    OR found->>'exact_id' IS NOT NULL OR NOT contains_canonical THEN
   RAISE EXCEPTION 'An alias must be suggested but never auto-merged: %',found;
 END IF;
 found:=public.dic_find_coffee_matches(jsonb_build_object('name',canonical_name,
   'roaster','Synthetic Alias Roaster','release_label','Lot 2026','origin','Region A'));
 IF found->>'classification' IS DISTINCT FROM 'exact_verified'
    OR found->>'exact_id' IS DISTINCT FROM canonical_id::text THEN
   RAISE EXCEPTION 'Independent canonical exact-release auto-match regressed: %',found;
 END IF;

 found:=public.dic_find_coffee_matches(jsonb_build_object('name',historical_alias,
   'roaster','Distinct Alias Roaster','release_label','Lot 2026','origin','Region A'));
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(found->'candidates','[]'::jsonb)) AS item(value)
               WHERE item.value->>'id'=canonical_id::text) INTO contains_canonical;
 IF contains_canonical OR found->>'exact_id'=canonical_id::text THEN
   RAISE EXCEPTION 'Cross-roaster alias was suggested: %',found;
 END IF;
 found:=public.dic_find_coffee_matches(jsonb_build_object('name',historical_alias,
   'roaster','Synthetic Alias Roaster','release_label','Lot 2027','origin','Region A'));
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(found->'candidates','[]'::jsonb)) AS item(value)
               WHERE item.value->>'id'=canonical_id::text) INTO contains_canonical;
 IF contains_canonical OR found->>'exact_id'=canonical_id::text THEN
   RAISE EXCEPTION 'Conflicting-lot alias was suggested: %',found;
 END IF;
 found:=public.dic_find_coffee_matches(jsonb_build_object('name',historical_alias,
   'roaster','Synthetic Alias Roaster','release_label','Lot 2026','origin','Other Country'));
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(found->'candidates','[]'::jsonb)) AS item(value)
               WHERE item.value->>'id'=canonical_id::text) INTO contains_canonical;
 IF contains_canonical OR found->>'exact_id'=canonical_id::text THEN
   RAISE EXCEPTION 'Conflicting-origin alias was suggested: %',found;
 END IF;
 EXECUTE 'reset role';

 INSERT INTO public.coffee_submissions(owner_id,proposed_data)
 VALUES(member_id,jsonb_build_object('name',historical_alias,'roaster','Synthetic Alias Roaster',
                                    'release_label','Lot 2026','origin','Region A'))
 RETURNING id INTO ok_submission;
 INSERT INTO public.coffee_submissions(owner_id,proposed_data)
 VALUES(member_id,jsonb_build_object('name',historical_alias,'roaster','Distinct Alias Roaster',
                                    'release_label','Lot 2026','origin','Region A'))
 RETURNING id INTO other_roaster_submission;
 INSERT INTO public.coffee_submissions(owner_id,proposed_data)
 VALUES(member_id,jsonb_build_object('name',historical_alias,'roaster','Synthetic Alias Roaster',
                                    'release_label','Lot 2027','origin','Region A'))
 RETURNING id INTO other_lot_submission;
 INSERT INTO public.coffee_submissions(owner_id,proposed_data)
 VALUES(member_id,jsonb_build_object('name',historical_alias,'roaster','Synthetic Alias Roaster',
                                    'release_label','Lot 2026','origin','Other Country'))
 RETURNING id INTO other_origin_submission;
 INSERT INTO public.library_entries(id,owner_id,submission_id) VALUES
 (ok_library,member_id,ok_submission),
 (other_roaster_library,member_id,other_roaster_submission),
 (other_lot_library,member_id,other_lot_submission),
 (other_origin_library,member_id,other_origin_submission);

 EXECUTE 'set local role authenticated';
 denied:=false;
 BEGIN
   PERFORM public.dic_apply_client_change(member_id,gen_random_uuid(),'confirm_coffee_existing',
      jsonb_build_object('submission_id',other_roaster_submission,'coffee_id',canonical_id));
 EXCEPTION WHEN SQLSTATE '23514' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-roaster alias confirmation was accepted'; END IF;
 denied:=false;
 BEGIN
   PERFORM public.dic_apply_client_change(member_id,gen_random_uuid(),'confirm_coffee_existing',
      jsonb_build_object('submission_id',other_lot_submission,'coffee_id',canonical_id));
 EXCEPTION WHEN SQLSTATE '23514' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Conflicting-lot alias confirmation was accepted'; END IF;
 denied:=false;
 BEGIN
   PERFORM public.dic_apply_client_change(member_id,gen_random_uuid(),'confirm_coffee_existing',
      jsonb_build_object('submission_id',other_origin_submission,'coffee_id',canonical_id));
 EXCEPTION WHEN SQLSTATE '23514' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Conflicting-origin alias confirmation was accepted'; END IF;
 response:=public.dic_apply_client_change(member_id,gen_random_uuid(),'confirm_coffee_existing',
   jsonb_build_object('submission_id',ok_submission,'coffee_id',canonical_id));
 EXECUTE 'reset role';

 IF response->>'ok' IS DISTINCT FROM 'true'
    OR response->>'coffee_id' IS DISTINCT FROM canonical_id::text
    OR response->>'library_entry_id' IS DISTINCT FROM ok_library::text
    OR (SELECT name FROM public.coffees WHERE id=canonical_id) IS DISTINCT FROM canonical_name
    OR (SELECT count(*) FROM private.dic_coffee_aliases WHERE coffee_id=canonical_id) <> 1
    OR NOT EXISTS(SELECT 1 FROM public.library_entries WHERE id=ok_library AND owner_id=member_id
                  AND coffee_id=canonical_id AND submission_id IS NULL)
    OR EXISTS(SELECT 1 FROM public.coffee_submissions WHERE id IN
       (other_roaster_submission,other_lot_submission,other_origin_submission)
       AND (status IS DISTINCT FROM 'pending' OR canonical_coffee_id IS NOT NULL))
    OR EXISTS(SELECT 1 FROM public.library_entries WHERE id IN
       (other_roaster_library,other_lot_library,other_origin_library)
       AND (coffee_id IS NOT NULL OR submission_id IS NULL))
    OR (SELECT count(*) FROM public.shots) IS DISTINCT FROM before_shots
 THEN RAISE EXCEPTION 'Alias confirmation changed unrelated member/catalog/history state: %',response; END IF;
END $dic_alias_matching$;
SELECT 'PASS: alias suggestion only, manual confirmation, independent canonical exact, cross-roaster/lot/origin rejection, histories intact; rollback' AS result;
ROLLBACK;
