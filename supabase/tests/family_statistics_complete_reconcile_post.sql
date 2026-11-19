-- #509 R361: rollback-only PG17 test of literal complete derived repair.
DO $assert$
DECLARE f issue509_reconcile_fixture; stats jsonb; state text;
       other_stats jsonb; other_state text;
BEGIN
 SELECT * INTO STRICT f FROM issue509_reconcile_fixture;
 SELECT statistics,evidence_state INTO STRICT stats,state
  FROM public.personal_recipe_families WHERE id=f.family_id;
 SELECT statistics,evidence_state INTO STRICT other_stats,other_state
  FROM public.personal_recipe_families WHERE id=f.other_family_id;
 IF stats->>'count' IS DISTINCT FROM '2'
    OR (stats->'ratio'->>'center')::numeric IS DISTINCT FROM 2
    OR (stats->'time'->>'center')::numeric IS DISTINCT FROM 23
    OR (stats->'ratio'->>'high')::numeric IS DISTINCT FROM 2
    OR stats->>'evidenceScope' IS DISTINCT FROM 'ratio_only'
    OR state IS DISTINCT FROM 'personally_confirmed'
 THEN RAISE EXCEPTION 'Complete reconciliation failed count-stale family'; END IF;
 IF other_stats->>'count' IS DISTINCT FROM '1'
    OR (other_stats->'ratio'->>'center')::numeric IS DISTINCT FROM 3
    OR (other_stats->'ratio'->>'high')::numeric IS DISTINCT FROM 3
    OR (other_stats->'time'->>'center')::numeric IS DISTINCT FROM 30
    OR other_stats->>'evidenceScope' IS DISTINCT FROM 'ratio_only'
    OR other_state IS DISTINCT FROM 'candidate'
 THEN RAISE EXCEPTION 'Count-correct stale ratio range was not recalculated'; END IF;
 IF (SELECT count(*) FROM public.shots WHERE owner_id=f.owner_id)<>3
    OR NOT EXISTS(SELECT 1 FROM public.shots WHERE id=f.first_shot AND personal_family_id=f.family_id)
    OR NOT EXISTS(SELECT 1 FROM public.shots WHERE id=f.second_shot AND personal_family_id=f.family_id)
    OR NOT EXISTS(SELECT 1 FROM public.shots WHERE id=f.third_shot AND personal_family_id=f.other_family_id)
 THEN RAISE EXCEPTION 'Historical shot records changed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.recipe_preferences
   WHERE owner_id=f.owner_id AND current_family_id=f.family_id AND favorite_shot_id=f.first_shot)
 THEN RAISE EXCEPTION 'Current or favorite changed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.shot_notes
   WHERE owner_id=f.owner_id AND shot_id=f.first_shot
     AND notes='Synthetic note must be preserved')
 THEN RAISE EXCEPTION 'Note lost'; END IF;
END $assert$;
ROLLBACK;
SELECT 'PASS: R361 exact-source full derived stats, count-correct stale range, IDs/favorites/notes intact; rollback' AS result;
