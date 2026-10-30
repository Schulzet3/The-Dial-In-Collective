-- Issue #96 / PR #287: PostgREST 12.x retries 40001 serialization_failure.
-- A stale optimistic-edit revision is a DETERMINISTIC business conflict, not a
-- transient serialization failure. Translate only the exact original messages
-- to HTTP 409/PT409 at the two existing invoker public entry points.
-- This preserves private function logic, owner/admin checks, all grants,
-- original audit/shot/note/history behavior and genuine 40001 retry semantics.
-- No production application by development alone; scheduled-release SQL only.

CREATE OR REPLACE FUNCTION public.dic_admin_edit_shot(
 p_record_id uuid, p_expected_revision bigint, p_details jsonb,
 p_reason text, p_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $fn$
BEGIN
 RETURN private.dic_admin_edit_record(p_record_id,p_expected_revision,p_details,p_reason,p_kind);
EXCEPTION WHEN serialization_failure THEN
 IF SQLERRM IN ('Shot changed; refresh before editing.','Coffee changed; refresh before editing.') THEN
  RAISE SQLSTATE 'PT409' USING MESSAGE = SQLERRM;
 END IF;
 RAISE;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.dic_admin_edit_coffee(
 p_record_id uuid, p_expected_revision bigint, p_details jsonb,
 p_reason text, p_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $fn$
BEGIN
 RETURN private.dic_admin_edit_record(p_record_id,p_expected_revision,p_details,p_reason,p_kind);
EXCEPTION WHEN serialization_failure THEN
 IF SQLERRM IN ('Shot changed; refresh before editing.','Coffee changed; refresh before editing.') THEN
  RAISE SQLSTATE 'PT409' USING MESSAGE = SQLERRM;
 END IF;
 RAISE;
END;
$fn$;
