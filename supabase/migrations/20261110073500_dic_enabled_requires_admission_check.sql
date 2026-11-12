-- Issue #509 R140: enforce the owner-Locked admission invariant at the data boundary.
-- Prevent an enabled-but-unadmitted account from reaching trusted service-role
-- source workflows even when a function checks enabled directly.
-- This is additive, fail-closed and contains NO data update or deletion.
-- Apply only through a separately owner-approved, source-verified release.
DO $issue509$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid='private.beta_members'::regclass
    AND conname='beta_members_enabled_requires_admission'
 ) THEN
  ALTER TABLE private.beta_members
   ADD CONSTRAINT beta_members_enabled_requires_admission
   CHECK (NOT enabled OR admitted_at IS NOT NULL);
 END IF;
END $issue509$;
