-- #509 synthetic-only, isolated PostgreSQL 17.11 dic_ci; no production access or persistent data.
BEGIN;
DO $canonical_name_response$
DECLARE
  m1 uuid := gen_random_uuid();
  m2 uuid := gen_random_uuid();
  canon uuid;
  sid uuid;
  lid uuid := gen_random_uuid();
  resp jsonb;
  before_shots bigint;
  original_name text := 'Older Original Coffee Synthetic';
  provisional_name text := 'Later Verified Coffee Synthetic';
BEGIN
  IF current_database() <> 'dic_ci' THEN RAISE EXCEPTION 'Disposable dic_ci database required'; END IF;
  SELECT count(*) INTO before_shots FROM public.shots;
  INSERT INTO auth.users(id,aud,role,email) VALUES
    (m1,'authenticated','authenticated',m1::text||'@example.invalid'),
    (m2,'authenticated','authenticated',m2::text||'@example.invalid');
  INSERT INTO public.coffees(name,roaster,verification_state,created_at)
    VALUES (provisional_name,'Synthetic Canonical Roaster','verified',now()-interval '1 day')
    RETURNING id INTO canon;
  INSERT INTO public.coffee_submissions(owner_id,proposed_data,created_at)
    VALUES (m1,jsonb_build_object('name',original_name,'roaster','Synthetic Canonical Roaster'),
            now()-interval '4 days')
    RETURNING id INTO sid;
  INSERT INTO public.library_entries(id,owner_id,submission_id) VALUES(lid,m1,sid);
  -- Older original Pending predates the verified canonical; its name must become canonical.
  resp := private.dic_link_pending_coffee(sid,canon,'admin_reviewed_merge','{}'::jsonb);
  IF resp->>'ok' IS DISTINCT FROM 'true'
     OR resp->>'canonical_name' IS DISTINCT FROM original_name
     OR resp->>'coffee_id' IS DISTINCT FROM canon::text
     OR resp->>'library_entry_id' IS DISTINCT FROM lid::text
     OR (SELECT name FROM public.coffees WHERE id=canon) IS DISTINCT FROM original_name
     OR NOT EXISTS (SELECT 1 FROM private.dic_coffee_first_entry
         WHERE coffee_id=canon AND first_submission_id=sid AND primary_name=original_name)
     OR NOT EXISTS (SELECT 1 FROM private.dic_coffee_aliases
         WHERE coffee_id=canon AND alias_key=private.dic_coffee_key(provisional_name))
     OR NOT EXISTS (SELECT 1 FROM public.library_entries
         WHERE id=lid AND owner_id=m1 AND coffee_id=canon AND submission_id IS NULL)
  THEN RAISE EXCEPTION 'Older Pending canonical rename/response/alias/library contract failed: %',resp; END IF;
  -- Later Pending reuse must neither rename the original nor return a stale alias.
  INSERT INTO public.coffee_submissions(owner_id,proposed_data,created_at)
    VALUES (m2,jsonb_build_object('name','Later Alternate Synthetic','roaster','Synthetic Canonical Roaster'),
            now())
    RETURNING id INTO sid;
  INSERT INTO public.library_entries(owner_id,submission_id) VALUES(m2,sid);
  resp := private.dic_link_pending_coffee(sid,canon,'admin_reviewed_merge','{}'::jsonb);
  IF resp->>'canonical_name' IS DISTINCT FROM original_name
     OR (SELECT name FROM public.coffees WHERE id=canon) IS DISTINCT FROM original_name
     OR (SELECT count(*) FROM public.shots) IS DISTINCT FROM before_shots
  THEN RAISE EXCEPTION 'Later Pending reuse changed name/history or response: %',resp; END IF;
END $canonical_name_response$;
SELECT 'PASS: older Pending canonical_name response, preserved aliases and library IDs, later reuse, no shot changes; rollback' AS result;
ROLLBACK;
