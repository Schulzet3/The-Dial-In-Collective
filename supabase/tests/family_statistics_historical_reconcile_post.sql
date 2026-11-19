-- Assert the ACTUAL migration restored only derived statistics, not history.
DO $assert$
DECLARE f issue509_reconcile_fixture; stats jsonb; state text;
BEGIN
 SELECT * INTO STRICT f FROM issue509_reconcile_fixture;
 SELECT statistics,evidence_state INTO stats,state
  FROM public.personal_recipe_families WHERE id=f.family_id;
 IF stats->>'count' IS DISTINCT FROM '2'
    OR (stats->'ratio'->>'center')::numeric IS DISTINCT FROM 2
    OR (stats->'time'->>'center')::numeric IS DISTINCT FROM 23
    OR state IS DISTINCT FROM 'personally_confirmed'
 THEN RAISE EXCEPTION 'Historical family stats did not recalculate'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.personal_recipe_families
   WHERE id=f.other_family_id AND statistics=f.other_statistics AND evidence_state=f.other_state
 ) THEN RAISE EXCEPTION 'Correct unrelated family was changed'; END IF;
 IF (SELECT count(*) FROM public.shots WHERE owner_id=f.owner_id)<>3
    OR NOT EXISTS(SELECT 1 FROM public.shots WHERE id=f.first_shot AND personal_family_id=f.family_id)
    OR NOT EXISTS(SELECT 1 FROM public.shots WHERE id=f.second_shot AND personal_family_id=f.family_id)
    OR NOT EXISTS(SELECT 1 FROM public.shots WHERE id=f.third_shot AND personal_family_id=f.other_family_id)
 THEN RAISE EXCEPTION 'Historical shots or original IDs were changed'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.recipe_preferences
   WHERE owner_id=f.owner_id AND current_family_id=f.family_id AND favorite_shot_id=f.first_shot
 ) THEN RAISE EXCEPTION 'Current/favorite changed during statistics repair'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.shot_notes
   WHERE owner_id=f.owner_id AND shot_id=f.first_shot
     AND notes='Synthetic note must be preserved'
 ) THEN RAISE EXCEPTION 'Private historical note lost'; END IF;
END $assert$;
ROLLBACK;
SELECT 'PASS: actual R360 one-time migration restores stale derived counts/centers, preserves valid family, favorite, shots and notes; rollback' AS result;
