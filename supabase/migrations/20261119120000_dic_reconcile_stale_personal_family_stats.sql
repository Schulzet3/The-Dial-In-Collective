-- Issue #509 R360: reconcile pre-existing derived personal-family statistics.
-- One-time future publication migration; NEVER run against live Supabase in audit.
-- No member shots/notes, family identities, preferences or history are removed.
-- Update ONLY families whose stored evidence count differs from eligible shots.
-- Use the existing approved estimator, preserving its exact algorithm.
DO $reconcile$
DECLARE stale_family record;
BEGIN
 FOR stale_family IN
   SELECT f.id
   FROM public.personal_recipe_families AS f
   LEFT JOIN public.shots AS s
     ON s.personal_family_id=f.id
    AND s.is_dialed_in AND s.hidden_at IS NULL
   GROUP BY f.id, f.statistics
   HAVING f.statistics->>'count' IS DISTINCT FROM count(s.id)::text
   ORDER BY f.id
 LOOP
   PERFORM private.refresh_personal_family(stale_family.id);
 END LOOP;
END $reconcile$;
