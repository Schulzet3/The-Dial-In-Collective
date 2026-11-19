-- Issue #509 R367. Synthetic completed-operation response only; no Auth deletion.
-- Run solely in the disposable, disconnected dic_ci PostgreSQL 17 container.
BEGIN;
DO $test$
DECLARE
 admin uuid:='10000000-0000-4000-8000-000000000001';
 operation uuid; observed jsonb;
BEGIN
 IF current_database()<>'dic_ci' THEN
  RAISE EXCEPTION 'Disposable dic_ci database required';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM private.app_admins WHERE owner_id=admin) THEN
  RAISE EXCEPTION 'Synthetic fixture Admin missing';
 END IF;
 INSERT INTO private.dic_admin_account_delete_operations
  (actor_id,target_id,community_mode,expected_impact,phase,community_removed,completed_at)
 VALUES(admin,gen_random_uuid(),'remove','{}'::jsonb,'completed',2,now())
 RETURNING id INTO operation;
 EXECUTE 'SET LOCAL ROLE service_role';
 observed:=public.dic_admin_account_delete_prepare(operation,admin);
 EXECUTE 'RESET ROLE';
 IF (observed->>'ok') IS DISTINCT FROM 'true' OR
    (observed->>'completed') IS DISTINCT FROM 'true' OR
    (observed->>'community_removed')::integer IS DISTINCT FROM 2 THEN
  RAISE EXCEPTION 'Completed Remove Community retry lost stored removal count';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM private.dic_admin_account_delete_operations
  WHERE id=operation AND phase='completed' AND community_removed=2) THEN
  RAISE EXCEPTION 'Idempotent retry changed completed deletion receipt';
 END IF;
END $test$;
SELECT 'PASS: completed Admin deletion retry reports recorded Community removals without mutation' AS result;
ROLLBACK;
