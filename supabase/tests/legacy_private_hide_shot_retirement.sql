-- #509 R339: isolated, synthetic, rollback-only internal Hide Shot retirement.
BEGIN;
DO $dic_legacy_hide$
DECLARE
  test_owner uuid := gen_random_uuid();
  test_shot uuid := gen_random_uuid();
  old_receipts bigint; new_receipts bigint;
  old_shots bigint; new_shots bigint;
  failure_message text;
BEGIN
  IF current_database() <> 'dic_ci' THEN
    RAISE EXCEPTION 'Disposable dic_ci database required';
  END IF;
  IF position('hide_shot' IN pg_get_functiondef('private.mutate(uuid,text,jsonb)'::regprocedure)) <> 0 THEN
    RAISE EXCEPTION 'Legacy private Hide Shot handler remains in current source';
  END IF;
  IF position('save_shot' IN pg_get_functiondef('private.mutate(uuid,text,jsonb)'::regprocedure)) = 0
     OR position('submit_coffee' IN pg_get_functiondef('private.mutate(uuid,text,jsonb)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'Required unrelated mutation actions disappeared';
  END IF;
  INSERT INTO auth.users(id,aud,role,email)
    VALUES(test_owner,'authenticated','authenticated',test_owner::text||'@example.invalid');
  INSERT INTO private.beta_members(owner_id,enabled,admitted_at)
    VALUES(test_owner,true,now())
    ON CONFLICT(owner_id) DO UPDATE SET enabled=excluded.enabled,admitted_at=excluded.admitted_at;
  SELECT count(*) INTO old_receipts FROM private.mutation_receipts WHERE owner_id=test_owner;
  SELECT count(*) INTO old_shots FROM public.shots WHERE owner_id=test_owner;
  PERFORM set_config('request.jwt.claim.sub',test_owner::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  EXECUTE 'set local role authenticated';
  BEGIN
    PERFORM private.mutate_workspace(gen_random_uuid(),'hide_shot',
      jsonb_build_object('id',test_shot,'expected_revision',0));
    RAISE EXCEPTION 'Internal legacy Hide Shot unexpectedly accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS failure_message = MESSAGE_TEXT;
    IF failure_message IS DISTINCT FROM 'Unsupported mutation action.' THEN
      RAISE EXCEPTION 'Unexpected internal retired-action error: %',failure_message;
    END IF;
  END;
  BEGIN
    PERFORM public.dic_apply_client_change(test_owner,gen_random_uuid(),'hide_shot',
      jsonb_build_object('id',test_shot,'expected_revision',0));
    RAISE EXCEPTION 'Public Hide Shot guard unexpectedly accepted request';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS failure_message = MESSAGE_TEXT;
    IF failure_message IS DISTINCT FROM 'This action is no longer available. Your existing shot and offline record are unchanged.' THEN
      RAISE EXCEPTION 'Public guard behavior drifted: %',failure_message;
    END IF;
  END;
  EXECUTE 'reset role';
  SELECT count(*) INTO new_receipts FROM private.mutation_receipts WHERE owner_id=test_owner;
  SELECT count(*) INTO new_shots FROM public.shots WHERE owner_id=test_owner;
  IF new_receipts<>old_receipts OR new_shots<>old_shots THEN
    RAISE EXCEPTION 'Retired actions changed mutation receipts or shots';
  END IF;
  RAISE NOTICE 'PASS: obsolete private Hide Shot path rejected; public guard intact, other core actions retained, no member state mutated; rollback';
END
$dic_legacy_hide$;
ROLLBACK;
