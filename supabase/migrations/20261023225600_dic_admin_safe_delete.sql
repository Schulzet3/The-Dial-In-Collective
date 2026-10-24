-- Owner-approved Issue 100. No production application from this source commit.
-- Two-phase server-authoritative impact -> one explicit confirmation -> atomic deletion.
CREATE TABLE IF NOT EXISTS private.dic_admin_delete_receipts (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid NOT NULL,
 record_kind text NOT NULL,
 record_id uuid NOT NULL,
 impact jsonb NOT NULL,
 deleted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.dic_admin_delete_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.dic_admin_delete_receipts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE private.dic_admin_delete_receipts_id_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.dic_admin_delete_preview(p_kind text, p_record_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE rev bigint; lib_count bigint:=0; shot_count bigint:=0;
 notes_count bigint:=0; community_count bigint:=0; submissions_count bigint:=0;
 source_count bigint:=0; linked_count bigint:=0; merged_count bigint:=0;
BEGIN
 PERFORM private.require_member();
 IF auth.uid() IS NULL OR NOT private.is_admin() THEN
  RAISE EXCEPTION USING errcode='42501',message='Administrator required.';
 END IF;
 IF p_record_id IS NULL OR p_kind NOT IN ('shot','submission','approved') THEN
  RAISE EXCEPTION USING errcode='22023',message='Unsupported delete target.';
 END IF;
 IF p_kind='shot' THEN
  SELECT revision INTO rev FROM public.shots WHERE id=p_record_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='22023',message='Shot unavailable.'; END IF;
  shot_count:=1;
  SELECT count(*) INTO notes_count FROM public.shot_notes WHERE shot_id=p_record_id;
  SELECT count(*) INTO linked_count FROM private.contribution_links WHERE shot_id=p_record_id;
 ELSIF p_kind='submission' THEN
  SELECT revision INTO rev FROM public.coffee_submissions WHERE id=p_record_id AND status IN ('pending','conflict');
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='22023',message='Pending submission unavailable.'; END IF;
  submissions_count:=1;
  SELECT count(*) INTO lib_count FROM public.library_entries WHERE submission_id=p_record_id;
  SELECT count(*) INTO shot_count FROM public.shots s JOIN public.library_entries l ON l.id=s.library_entry_id
    WHERE l.submission_id=p_record_id;
  SELECT count(*) INTO notes_count FROM public.shot_notes n JOIN public.shots s ON s.id=n.shot_id
   JOIN public.library_entries l ON l.id=s.library_entry_id WHERE l.submission_id=p_record_id;
  SELECT count(*) INTO linked_count FROM private.dic_coffee_first_entry WHERE first_submission_id=p_record_id;
 ELSE
  SELECT revision INTO rev FROM public.coffees WHERE id=p_record_id AND merged_into_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='22023',message='Canonical coffee unavailable.'; END IF;
  SELECT count(*) INTO submissions_count FROM public.coffee_submissions WHERE canonical_coffee_id=p_record_id;
  SELECT count(*) INTO lib_count FROM public.library_entries l
   WHERE l.coffee_id=p_record_id OR l.submission_id IN
    (SELECT id FROM public.coffee_submissions WHERE canonical_coffee_id=p_record_id);
  SELECT count(*) INTO shot_count FROM public.shots s JOIN public.library_entries l ON s.library_entry_id=l.id
   WHERE l.coffee_id=p_record_id OR l.submission_id IN
    (SELECT id FROM public.coffee_submissions WHERE canonical_coffee_id=p_record_id);
  SELECT count(*) INTO notes_count FROM public.shot_notes n JOIN public.shots s ON s.id=n.shot_id
   JOIN public.library_entries l ON s.library_entry_id=l.id
   WHERE l.coffee_id=p_record_id OR l.submission_id IN
    (SELECT id FROM public.coffee_submissions WHERE canonical_coffee_id=p_record_id);
  SELECT count(*) INTO community_count FROM public.community_shots WHERE coffee_id=p_record_id;
  SELECT count(*) INTO source_count FROM public.coffee_sources WHERE coffee_id=p_record_id;
  SELECT count(*) INTO merged_count FROM public.coffees WHERE merged_into_id=p_record_id;
  SELECT count(*) INTO linked_count FROM private.dic_coffee_first_entry f WHERE f.coffee_id<>p_record_id
   AND f.first_submission_id IN (SELECT id FROM public.coffee_submissions WHERE canonical_coffee_id=p_record_id);
 END IF;
 RETURN jsonb_build_object('kind',p_kind,'record_id',p_record_id,'revision',rev,
  'library_entries',lib_count,'shots',shot_count,'shot_notes',notes_count,
  'community_shots',community_count,'linked_submissions',submissions_count,
  'source_records',source_count,'other_references',linked_count,'merged_coffees',merged_count,
  'blocked',CASE WHEN p_kind='approved' THEN community_count>0 OR merged_count>0 OR linked_count>0
                 WHEN p_kind='submission' THEN linked_count>0 ELSE false END);
END $fn$;

CREATE OR REPLACE FUNCTION public.dic_admin_delete_preview(p_kind text,p_record_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO '' AS $fn$
 SELECT private.dic_admin_delete_preview(p_kind,p_record_id);
$fn$;
REVOKE ALL ON FUNCTION public.dic_admin_delete_preview(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dic_admin_delete_preview(text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.dic_admin_delete_record(p_kind text,p_record_id uuid,p_expected_revision bigint,p_expected_impact jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE actor uuid; actual jsonb; current_revision bigint;
BEGIN
 actor:=private.require_member();
 IF actor IS NULL OR NOT private.is_admin() THEN
  RAISE EXCEPTION USING errcode='42501',message='Administrator required.';
 END IF;
 IF p_record_id IS NULL OR p_expected_revision IS NULL OR
    p_kind NOT IN ('shot','submission','approved') OR p_expected_impact IS NULL THEN
  RAISE EXCEPTION USING errcode='22023',message='Invalid delete confirmation.';
 END IF;
 IF p_kind='shot' THEN
  SELECT revision INTO current_revision FROM public.shots WHERE id=p_record_id FOR UPDATE;
 ELSIF p_kind='submission' THEN
  SELECT revision INTO current_revision FROM public.coffee_submissions
   WHERE id=p_record_id AND status IN ('pending','conflict') FOR UPDATE;
 ELSE
  SELECT revision INTO current_revision FROM public.coffees
   WHERE id=p_record_id AND merged_into_id IS NULL FOR UPDATE;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='40001',message='Record changed or unavailable. Refresh.'; END IF;
 IF current_revision<>p_expected_revision THEN
  RAISE EXCEPTION USING errcode='40001',message='Record revision changed. Refresh before deleting.';
 END IF;
 actual:=private.dic_admin_delete_preview(p_kind,p_record_id);
 IF actual IS DISTINCT FROM p_expected_impact THEN
  RAISE EXCEPTION USING errcode='40001',message='Associated records changed. Review impact again.';
 END IF;
 IF (actual->>'blocked')::boolean THEN
  RAISE EXCEPTION USING errcode='23514',message='Deletion blocked to preserve Community contributions or other canonical references.';
 END IF;
 IF p_kind='shot' THEN
  UPDATE public.recipe_preferences SET favorite_shot_id=NULL,revision=revision+1,updated_at=now()
   WHERE favorite_shot_id=p_record_id;
  DELETE FROM public.shots WHERE id=p_record_id;
 ELSIF p_kind='submission' THEN
  UPDATE public.workspace_state SET current_library_entry_id=NULL,revision=revision+1,updated_at=now()
   WHERE current_library_entry_id IN (SELECT id FROM public.library_entries WHERE submission_id=p_record_id);
  DELETE FROM public.library_entries WHERE submission_id=p_record_id;
  UPDATE private.dic_coffee_audit SET submission_id=NULL WHERE submission_id=p_record_id;
  DELETE FROM private.dic_source_attempts WHERE submission_id=p_record_id;
  DELETE FROM public.coffee_submissions WHERE id=p_record_id AND status IN ('pending','conflict');
 ELSE
  UPDATE public.workspace_state SET current_library_entry_id=NULL,revision=revision+1,updated_at=now()
   WHERE current_library_entry_id IN (SELECT id FROM public.library_entries l
    WHERE l.coffee_id=p_record_id OR l.submission_id IN
     (SELECT id FROM public.coffee_submissions WHERE canonical_coffee_id=p_record_id));
  DELETE FROM public.library_entries l WHERE l.coffee_id=p_record_id OR l.submission_id IN
   (SELECT id FROM public.coffee_submissions WHERE canonical_coffee_id=p_record_id);
  UPDATE private.dic_coffee_audit SET coffee_id=NULL,submission_id=NULL
   WHERE coffee_id=p_record_id OR submission_id IN
    (SELECT id FROM public.coffee_submissions WHERE canonical_coffee_id=p_record_id);
  DELETE FROM private.dic_source_attempts WHERE submission_id IN
   (SELECT id FROM public.coffee_submissions WHERE canonical_coffee_id=p_record_id);
  DELETE FROM private.dic_coffee_first_entry WHERE coffee_id=p_record_id;
  DELETE FROM public.coffee_submissions WHERE canonical_coffee_id=p_record_id;
  DELETE FROM public.coffee_sources WHERE coffee_id=p_record_id;
  DELETE FROM private.dic_coffee_aliases WHERE coffee_id=p_record_id;
  DELETE FROM public.recipe_families WHERE coffee_id=p_record_id;
  DELETE FROM public.coffees WHERE id=p_record_id;
 END IF;
 INSERT INTO private.dic_admin_delete_receipts(actor_id,record_kind,record_id,impact)
  VALUES(actor,p_kind,p_record_id,actual);
 RETURN jsonb_build_object('ok',true,'deleted_kind',p_kind,'impact',actual);
END $fn$;

CREATE OR REPLACE FUNCTION public.dic_admin_delete_record(p_kind text,p_record_id uuid,p_expected_revision bigint,p_expected_impact jsonb)
RETURNS jsonb LANGUAGE sql SET search_path TO '' AS $fn$
 SELECT private.dic_admin_delete_record(p_kind,p_record_id,p_expected_revision,p_expected_impact);
$fn$;
REVOKE ALL ON FUNCTION public.dic_admin_delete_record(text,uuid,bigint,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dic_admin_delete_record(text,uuid,bigint,jsonb) TO authenticated;

-- Issue 100: unlike the merge-safe RPC, Admin comparison must include possible
-- matches WITH conflicting origin/process/release facts, without declaring them safe to merge.
CREATE OR REPLACE FUNCTION private.dic_admin_review_candidates(p_submission_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE s public.coffee_submissions;
BEGIN
 PERFORM private.require_member();
 IF auth.uid() IS NULL OR NOT private.is_admin() THEN
  RAISE EXCEPTION USING errcode='42501',message='Administrator required.';
 END IF;
 SELECT * INTO s FROM public.coffee_submissions
  WHERE id=p_submission_id AND status IN ('pending','conflict');
 IF NOT FOUND THEN
  RAISE EXCEPTION USING errcode='22023',message='Pending submission unavailable.';
 END IF;
 RETURN jsonb_build_object('candidates',coalesce((
  SELECT jsonb_agg(candidate ORDER BY similarity_score DESC,coffee_name,coffee_id)
  FROM (
   SELECT c.id AS coffee_id,c.name AS coffee_name,
    CASE WHEN private.dic_coffee_key(c.name)=private.dic_coffee_key(s.proposed_data->>'name')
         THEN 1::numeric ELSE extensions.similarity(private.dic_coffee_key(c.name),
             private.dic_coffee_key(s.proposed_data->>'name'))::numeric END AS similarity_score,
    jsonb_build_object(
      'id',c.id,'name',c.name,'roaster',c.roaster,'origin',c.origin,
      'process',c.process,'release_label',c.release_label,'producer',c.producer,
      'variety',c.variety,'roast_level',c.roast_level,'elevation_m',c.elevation_m,
      'tasting_notes',c.tasting_notes,'summary',c.summary,
      'espressoNotes',c.espresso_notes,'source_url',
         (SELECT source_url FROM public.coffee_sources cs
          WHERE cs.coffee_id=c.id AND cs.source_url IS NOT NULL ORDER BY cs.checked_at DESC LIMIT 1),
      'match_reason',CASE WHEN private.dic_coffee_key(c.name)=private.dic_coffee_key(s.proposed_data->>'name')
         THEN 'Same roaster and coffee name' ELSE 'Same roaster and similar coffee name' END
    ) AS candidate
   FROM public.coffees c
   WHERE c.verification_state='verified' AND c.merged_into_id IS NULL
    AND private.dic_canonical_roaster_key(c.roaster)=private.dic_canonical_roaster_key(s.proposed_data->>'roaster')
    AND (private.dic_coffee_key(c.name)=private.dic_coffee_key(s.proposed_data->>'name')
     OR extensions.similarity(private.dic_coffee_key(c.name),private.dic_coffee_key(s.proposed_data->>'name'))>=0.63)
   ORDER BY similarity_score DESC,c.name,c.id LIMIT 10
  ) candidates
 ),'[]'::jsonb));
END $fn$;

CREATE OR REPLACE FUNCTION public.dic_admin_review_candidates(p_submission_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO '' AS $fn$
 SELECT private.dic_admin_review_candidates(p_submission_id);
$fn$;
REVOKE ALL ON FUNCTION private.dic_admin_review_candidates(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.dic_admin_review_candidates(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dic_admin_review_candidates(uuid) TO authenticated;
