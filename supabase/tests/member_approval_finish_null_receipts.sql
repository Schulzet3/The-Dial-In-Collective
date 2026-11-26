-- #509 synthetic disposable SQL; no live provider writes.
BEGIN;
DO $validation$
DECLARE token uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
 IF current_database()<>'dic_ci' THEN RAISE EXCEPTION 'Disposable dic_ci required'; END IF;
 IF has_function_privilege('anon','public.dic_member_approval_finish(bigint,text,uuid,text)','EXECUTE') OR has_function_privilege('authenticated','public.dic_member_approval_finish(bigint,text,uuid,text)','EXECUTE') THEN
  RAISE EXCEPTION 'Receipt RPC client EXECUTE leak';
 END IF;
 BEGIN
  PERFORM public.dic_member_approval_finish(0,NULL,token,'sent');
  RAISE EXCEPTION 'Null channel wrongly accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 BEGIN
  PERFORM public.dic_member_approval_finish(0,'email',token,NULL);
  RAISE EXCEPTION 'Null outcome wrongly accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 BEGIN
  PERFORM public.dic_member_approval_finish(0,'email',token,'invalid');
  RAISE EXCEPTION 'Invalid outcome wrongly accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 IF public.dic_member_approval_finish(0,'email',token,'sent') IS DISTINCT FROM FALSE THEN
  RAISE EXCEPTION 'Nonmatching valid receipt mutated';
 END IF;
 RAISE NOTICE 'PASS: null/invalid receipts reject, valid unmatched receipt false, grants preserved';
END $validation$;
ROLLBACK;
