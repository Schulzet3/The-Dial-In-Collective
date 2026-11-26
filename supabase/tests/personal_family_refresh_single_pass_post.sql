-- Issue #509 R362: stream after family_statistics_historical_reconcile_pre.sql.
-- Disposable dic_ci PG17 only; the fixture's BEGIN must remain open.
DO $prepare$
DECLARE f issue509_reconcile_fixture;
BEGIN
 SELECT * INTO STRICT f FROM issue509_reconcile_fixture;
 -- The shared historical fixture deliberately corrupts cached statistics.
 -- Restore the canonical center so reclassification stays in the same family.
 PERFORM private.refresh_personal_family(f.family_id);
 IF (SELECT personal_family_id FROM public.shots WHERE id=f.first_shot)
    IS DISTINCT FROM f.family_id THEN
  RAISE EXCEPTION 'Preflight fixture shot missing original family';
 END IF;
END $prepare$;
CREATE TEMP TABLE issue509_refresh_probe(family_id uuid) ON COMMIT DROP;
CREATE FUNCTION private.issue509_test_refresh_probe() RETURNS trigger
 LANGUAGE plpgsql SET search_path TO '' AS $probe$
BEGIN
 INSERT INTO pg_temp.issue509_refresh_probe(family_id) VALUES(NEW.id);
 RETURN NEW;
END $probe$;
CREATE TRIGGER issue509_family_refresh_probe AFTER UPDATE
 ON public.personal_recipe_families FOR EACH ROW
 EXECUTE FUNCTION private.issue509_test_refresh_probe();
DO $verify$
DECLARE f issue509_reconcile_fixture; refreshes integer;
BEGIN
 SELECT * INTO STRICT f FROM issue509_reconcile_fixture;
 PERFORM private.classify_personal_shot(f.first_shot);
 SELECT count(*) INTO refreshes FROM pg_temp.issue509_refresh_probe
  WHERE family_id=f.family_id;
 IF refreshes<>1 THEN
  RAISE EXCEPTION 'Same-family reclassification refreshed % times, expected exactly one',refreshes;
 END IF;
 IF (SELECT personal_family_id FROM public.shots WHERE id=f.first_shot)
    IS DISTINCT FROM f.family_id
    OR (SELECT statistics->>'count' FROM public.personal_recipe_families
        WHERE id=f.family_id) IS DISTINCT FROM '2'
    OR NOT EXISTS(SELECT 1 FROM public.recipe_preferences p
      WHERE p.owner_id=f.owner_id AND p.current_family_id=f.family_id
       AND p.favorite_shot_id=f.first_shot) THEN
  RAISE EXCEPTION 'Original family, evidence or chosen Current/Favorite changed';
 END IF;
END $verify$;
ROLLBACK;
SELECT 'PASS: same-family reclassification refreshes exactly once, family/current/favorite preserved; rollback' AS result;
