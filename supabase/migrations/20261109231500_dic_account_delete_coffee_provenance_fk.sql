-- Issue #509: production-reference semantic audit of issue #1676's not-yet-deployed account delete.
-- Development-only follow-up migration. No user is removed by this migration.
-- Deleting an Auth member cascades to their personal coffee_submissions; canonical
-- coffee provenance and review audit rows must survive without a dangling private
-- submission identity. SET NULL happens only if the submission is actually deleted.
ALTER TABLE private.dic_coffee_first_entry
  ALTER COLUMN first_submission_id DROP NOT NULL;
ALTER TABLE private.dic_coffee_first_entry
  DROP CONSTRAINT dic_coffee_first_entry_first_submission_id_fkey;
ALTER TABLE private.dic_coffee_first_entry
  ADD CONSTRAINT dic_coffee_first_entry_first_submission_id_fkey
    FOREIGN KEY (first_submission_id)
    REFERENCES public.coffee_submissions(id) ON DELETE SET NULL;
ALTER TABLE private.dic_coffee_audit
  DROP CONSTRAINT dic_coffee_audit_submission_id_fkey;
ALTER TABLE private.dic_coffee_audit
  ADD CONSTRAINT dic_coffee_audit_submission_id_fkey
    FOREIGN KEY (submission_id)
    REFERENCES public.coffee_submissions(id) ON DELETE SET NULL;
