-- Issue #509 R361: complete historical derived family metrics reconciliation.
-- Forward-only ADDITIVE migration after the immutable count-only R360 migration.
-- Live Supabase is READ-ONLY in audit; this SQL runs only on future owner Publish.
-- Stale ratio bounds and evidence metadata can exist even when counts match.
-- Reuse the approved estimator for each existing family; no shots, owner IDs,
-- family IDs, notes, preferences, Current, or favorites are deleted/redirected.
DO $reconcile_all$
DECLARE family_id uuid;
BEGIN
  FOR family_id IN
    SELECT f.id FROM public.personal_recipe_families AS f ORDER BY f.id
  LOOP
    PERFORM private.refresh_personal_family(family_id);
  END LOOP;
END $reconcile_all$;
