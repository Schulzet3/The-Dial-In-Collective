-- Issue #509 Run152: explicit NULL delete kind must fail closed, never fall through
-- to canonical-coffee deletion or bypass the approved-coffee impact blocker.
-- Development source only. Preserve both function owners, SECURITY DEFINER,
-- existing grants, public wrappers, revision checks and historical migrations.
CREATE OR REPLACE FUNCTION private.dic_admin_delete_preview(p_kind text, p_record_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE rev bigint; lib_count bigint:=0; shot_count bigint:=0;
 notes_count bigint:=0; community_count bigint:=0; submissions_count bigint:=0;
 source_count bigint:=0; linked_count bigint:=0; merged_count bigint:=0;
BEGIN
 PERFORM private.require_member();
 IF auth.uid() IS NULL OR NOT private.is_admin() THEN
  RAISE EXCEPTION USING errcode='42501',message='Administrator required.';
 END IF;
 IF p_record_id IS NULL OR p_kind IS NULL OR p_kind NOT IN ('shot','submission','approved') THEN
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
END $function$;


CREATE OR REPLACE FUNCTION private.dic_admin_delete_record(p_kind text, p_record_id uuid, p_expected_revision bigint, p_expected_impact jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE actor uuid; actual jsonb; current_revision bigint;
BEGIN
 actor:=private.require_member();
 IF actor IS NULL OR NOT private.is_admin() THEN
  RAISE EXCEPTION USING errcode='42501',message='Administrator required.';
 END IF;
 IF p_record_id IS NULL OR p_expected_revision IS NULL OR
    p_kind IS NULL OR p_kind NOT IN ('shot','submission','approved') OR p_expected_impact IS NULL THEN
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
END $function$;

