-- Issue #509: admission invariant is both enabled AND explicitly admitted.
-- Development source only. Never apply this migration to production without
-- separate source-bound owner release approval and verified recovery.
-- The former gate read only enabled, which could authorize an inconsistent
-- enabled-but-never-admitted row even though the Locked admission state is NULL.
-- Existing admitted and disabled member rows retain their current behavior.
CREATE OR REPLACE FUNCTION private.is_member()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM private.beta_members m
    WHERE m.owner_id=(SELECT auth.uid())
      AND m.enabled
      AND m.admitted_at IS NOT NULL
  );
$function$;
-- CREATE OR REPLACE preserves the function's existing ACL and OID.
