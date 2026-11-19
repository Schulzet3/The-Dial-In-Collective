-- Issue #509 R358: keep personal family statistics and Current coherent when
-- an administrator deletes a single shot. Additive migration, not applied live.
-- Preserve exact Admin preview/revision/impact, Auth, audit and Community paths.
CREATE OR REPLACE FUNCTION private.dic_admin_delete_record(p_kind text, p_record_id uuid, p_expected_revision bigint, p_expected_impact jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE actor uuid; actual jsonb; current_revision bigint;
 shot_family_id uuid; shot_owner_id uuid; shot_setup_version_id uuid;
 shot_library_entry_id uuid; shot_style text;
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
  SELECT revision,personal_family_id,owner_id,setup_version_id,library_entry_id,style
   INTO current_revision,shot_family_id,shot_owner_id,shot_setup_version_id,shot_library_entry_id,shot_style
   FROM public.shots WHERE id=p_record_id FOR UPDATE;
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
  -- The DELETE has no family-refresh trigger. Keep existing histories while
  -- recalculating this family's surviving eligible shots and Current state.
  IF shot_family_id IS NOT NULL THEN
   PERFORM private.refresh_personal_family(shot_family_id);
   UPDATE public.recipe_preferences p SET current_family_id=NULL
    WHERE p.owner_id=shot_owner_id AND p.setup_version_id=shot_setup_version_id
      AND p.library_entry_id=shot_library_entry_id AND p.style=shot_style
      AND p.current_family_id=shot_family_id
      AND NOT EXISTS (SELECT 1 FROM public.shots s
       WHERE s.owner_id=p.owner_id AND s.setup_version_id=p.setup_version_id
         AND s.library_entry_id=p.library_entry_id AND s.style=p.style
         AND s.personal_family_id=p.current_family_id AND s.is_dialed_in
         AND s.hidden_at IS NULL);
  END IF;
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

