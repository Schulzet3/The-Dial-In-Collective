-- Issue #509: disconnected disposable dic_ci only, no private member records.
BEGIN;
DO $validate$
DECLARE msg text;
BEGIN
 IF current_database()<>'dic_ci' THEN RAISE EXCEPTION 'Disposable dic_ci required'; END IF;
 IF has_function_privilege('anon','private.dic_promote_pending_coffee(uuid,text,jsonb,boolean)','EXECUTE')
   OR NOT has_function_privilege('authenticated','private.dic_promote_pending_coffee(uuid,text,jsonb,boolean)','EXECUTE')
 THEN RAISE EXCEPTION 'Promotion grants changed'; END IF;
 BEGIN
  PERFORM private.dic_promote_pending_coffee(NULL::uuid,NULL::text,'{}'::jsonb,false);
  RAISE EXCEPTION 'NULL method accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
  IF msg <> 'Unsupported verification method.' THEN RAISE EXCEPTION 'Wrong NULL method result: %',msg; END IF;
 END;
 BEGIN
  PERFORM private.dic_promote_pending_coffee(NULL::uuid,'admin_reviewed','{}'::jsonb,NULL::boolean);
  RAISE EXCEPTION 'NULL confirmation accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
  IF msg <> 'Confirmation flag must be true or false.' THEN RAISE EXCEPTION 'Wrong NULL confirmation result: %',msg; END IF;
 END;
 BEGIN
  PERFORM private.dic_promote_pending_coffee(NULL::uuid,'unsupported','{}'::jsonb,false);
  RAISE EXCEPTION 'Invalid method accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
  IF msg <> 'Unsupported verification method.' THEN RAISE EXCEPTION 'Wrong invalid-method result: %',msg; END IF;
 END;
 BEGIN
  PERFORM private.dic_promote_pending_coffee(NULL::uuid,'admin_reviewed','{}'::jsonb,false);
  RAISE EXCEPTION 'Existing valid-method state validation bypassed';
 EXCEPTION WHEN SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
  IF msg <> 'Coffee submission unavailable.' THEN RAISE EXCEPTION 'Wrong missing-submission guard: %',msg; END IF;
 END;
 RAISE NOTICE 'PASS: null method/confirmation rejected; nonnull method missing-submission state guard retained';
END $validate$;
ROLLBACK;
