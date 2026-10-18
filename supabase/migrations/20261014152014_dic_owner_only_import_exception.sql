-- Explicitly approved 2026-10-14 owner-only import timing exception.
-- DO NOT mark hosted disaster recovery verified. Preserve all existing Locked gates.
DO $pre$
BEGIN
  IF (SELECT count(*) FROM private.import_control) <> 1
      OR EXISTS(SELECT 1 FROM private.import_control WHERE saves_enabled OR recovery_verified_at IS NOT NULL)
      OR EXISTS(SELECT 1 FROM private.import_batches) THEN
    RAISE EXCEPTION 'Owner-import migration requires closed, never-used import gate';
  END IF;
END $pre$;

ALTER TABLE private.import_control
  ADD COLUMN owner_only_exception_owner_id uuid REFERENCES auth.users(id),
  ADD COLUMN owner_only_exception_approved_at timestamptz,
  ADD COLUMN owner_only_exception_expires_at timestamptz;

ALTER TABLE private.import_control DROP CONSTRAINT import_control_check;
ALTER TABLE private.import_control ADD CONSTRAINT import_control_check
  CHECK (NOT saves_enabled OR recovery_verified_at IS NOT NULL
       OR (owner_only_exception_owner_id IS NOT NULL
           AND owner_only_exception_approved_at IS NOT NULL
           AND owner_only_exception_expires_at IS NOT NULL));
ALTER TABLE private.import_control ADD CONSTRAINT import_control_exception_complete_check
  CHECK (
    (owner_only_exception_owner_id IS NULL
      AND owner_only_exception_approved_at IS NULL
      AND owner_only_exception_expires_at IS NULL)
    OR
    (owner_only_exception_owner_id IS NOT NULL
      AND owner_only_exception_approved_at IS NOT NULL
      AND owner_only_exception_expires_at IS NOT NULL
      AND owner_only_exception_expires_at > owner_only_exception_approved_at
      AND owner_only_exception_expires_at <= owner_only_exception_approved_at + interval '24 hours')
  );
COMMENT ON COLUMN private.import_control.owner_only_exception_owner_id IS
 'Explicit owner-only single-import exception; does not establish hosted recovery verification.';
COMMENT ON COLUMN private.import_control.owner_only_exception_expires_at IS
 'Exception expires no later than 24 hours after approval. Commit auto-relocks.';

-- Preserve the existing owner checks, source hash, atomic importer, API signatures
-- and grants by modifying only the live gate predicate and success epilogue.
DO $rewrite$
DECLARE
  definition text;
  old_gate text := $oldgate$ select coalesce(saves_enabled and recovery_verified_at is not null,false) into gate from private.import_control where singleton;$oldgate$;
  new_gate text := $newgate$ select coalesce(saves_enabled and (
      recovery_verified_at is not null OR (
        owner_only_exception_owner_id=u
        and owner_only_exception_approved_at is not null
        and owner_only_exception_expires_at>clock_timestamp()
      )),false) into gate from private.import_control where singleton;$newgate$;
  old_commit text := $oldcommit$  insert into private.import_batches(owner_id,source_hash,source_document,before_state,result) values(u,h,doc,before_state,result);
  return result || jsonb_build_object('reviewHash',h);$oldcommit$;
  new_commit text := $newcommit$  insert into private.import_batches(owner_id,source_hash,source_document,before_state,result) values(u,h,doc,before_state,result);
  -- One successful owner-only exception commit closes the gate atomically.
  -- Full hosted recovery, when actually verified, uses the original normal gate.
  update private.import_control
     set saves_enabled=false,
         owner_only_exception_owner_id=null,
         owner_only_exception_approved_at=null,
         owner_only_exception_expires_at=null
   where singleton and recovery_verified_at is null
     and owner_only_exception_owner_id=u;
  return result || jsonb_build_object('reviewHash',h);$newcommit$;
BEGIN
  SELECT pg_get_functiondef('private.import_operation(uuid,jsonb,boolean,text,boolean)'::regprocedure) INTO definition;
  IF definition IS NULL OR position(old_gate in definition)=0
      OR position(old_commit in definition)=0 THEN
    RAISE EXCEPTION 'Unexpected import function; refuse owner-only exception migration';
  END IF;
  definition:=replace(replace(definition,old_gate,new_gate),old_commit,new_commit);
  EXECUTE definition;
END $rewrite$;

DO $post$
BEGIN
  IF EXISTS(SELECT 1 FROM private.import_control WHERE saves_enabled OR recovery_verified_at IS NOT NULL
            OR owner_only_exception_owner_id IS NOT NULL)
    OR EXISTS(SELECT 1 FROM private.import_batches) THEN
    RAISE EXCEPTION 'Owner-only schema change accidentally activated import; abort';
  END IF;
END $post$;