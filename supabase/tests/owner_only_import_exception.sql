begin;
create temporary table dic_exception_role_test(result jsonb) on commit drop;
do $do$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
  doc jsonb; otherdoc jsonb; p jsonb; r jsonb; notes text[]:=array[]::text[]; refused boolean;
begin
  doc:=$json${"format":"the-dial-in-collective-prototype-backup","exportedAt":"2026-10-06T00:00:00Z","data":{"schemaVersion":1,"mode":"personal","theme":"dark","preferences":"Test preferences","activeSetupId":"s","setups":[{"id":"s","name":"Imported test","activeVersionId":"v","versions":[{"id":"v","createdAt":"2026-10-06T00:00:00Z","machine":"","grinder":"","burrs":"","calibrationId":"g","calibrations":[{"id":"g","min":0,"max":5}],"baskets":[{"id":"b","name":"18 g basket","doseG":18,"archived":false}],"defaultBasketId":"b","tempUnit":"F","advanced":{"temperature":true,"slowFeed":false,"baskets":false},"slowFeed":false}],"workspaces":{"v":{"currentCoffeeId":"c1","coffees":{"c1":{"style":"Turbo","currentFamilies":{"Turbo":"f"}},"c2":{"style":"Traditional","currentFamilies":{}}}}}}],"coffees":[{"id":"c1","name":"Sample One","roaster":"Test roaster","createdAt":"2026-09-01T00:00:00Z","bags":[{"id":"bag1","roastDate":"","frozen":false,"archived":false}]},{"id":"c2","name":"Sample Natural","roaster":"Test roaster two","createdAt":"2026-09-01T00:00:00Z","roastLevel":"Light","roastLevelSource":"estimated","bags":[{"id":"bag2","roastDate":"","frozen":false,"archived":false}]}],"families":[{"id":"f","coffeeId":"c1","style":"Turbo","createdAt":"2026-09-01T00:00:00Z"}],"shots":[{"id":"one","legacyId":"old-one","coffeeId":"c1","setupId":"s","setupVersionId":"v","basketId":"b","calibrationId":"g","bagId":"bag1","familyId":null,"timestamp":"2026-09-01T01:00:00.123Z","style":"Turbo","doseG":18,"yieldG":40,"timeS":16,"grindSetting":null,"tempC":89.4,"feedMode":null,"tasteScales":{"extraction":2,"body":3,"clarity":4,"sweetness":4,"astringency":1},"notes":"Private original note","snapshot":{"basketDoseG":18,"grinderMin":0,"grinderMax":5}},{"id":"two","legacyId":"old-two","coffeeId":"c1","setupId":"s","setupVersionId":"v","basketId":"b","calibrationId":"g","bagId":"bag1","familyId":"f","timestamp":"2026-09-02T01:00:00.456Z","style":"Turbo","doseG":18,"yieldG":36,"timeS":100,"grindSetting":0,"tempC":89.4,"feedMode":null,"tasteScales":{"extraction":3,"body":3,"clarity":5,"sweetness":5,"astringency":1},"notes":"","snapshot":{"basketDoseG":18,"grinderMin":0,"grinderMax":5}},{"id":"three","legacyId":"old-three","coffeeId":"c1","setupId":"s","setupVersionId":"v","basketId":"b","calibrationId":"g","bagId":"bag1","familyId":"f","timestamp":"2026-09-03T01:00:00.789Z","style":"Turbo","doseG":20,"yieldG":40,"timeS":27,"grindSetting":0.2,"tempC":null,"feedMode":null,"tasteScales":{"extraction":3,"body":3,"clarity":5,"sweetness":5,"astringency":1},"notes":"","snapshot":{"basketDoseG":18,"grinderMin":0,"grinderMax":5}}],"experiments":[],"legacyArchive":{"shared":{"aggregate":{"count":99}}},"legacyEnrichment":{"keep":"Original recommendation history"}}}$json$::jsonb;
  if exists(select 1 from private.import_control where saves_enabled or recovery_verified_at is not null or owner_only_exception_owner_id is not null)
     then raise exception 'Expected locked production gate'; end if;
  if exists(select 1 from private.import_batches) then raise exception 'Unexpected committed import'; end if;
  insert into auth.users(id,email,email_confirmed_at) values
   (a,'exception-a-'||a||'@example.invalid',now()),
   (b,'exception-b-'||b||'@example.invalid',now());
  update private.beta_members set enabled=true,admitted_at=now() where owner_id in(a,b);
  -- An expired but otherwise valid owner grant must not admit any import.
  update private.import_control set saves_enabled=true,owner_only_exception_owner_id=a,
    owner_only_exception_approved_at=now()-interval '2 hours',
    owner_only_exception_expires_at=now()-interval '1 hour' where singleton;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  p:=public.dic_preview_import(a,doc);
  if (p->>'canImport')::boolean then raise exception 'Expired owner grant allowed preview';end if;
  r:=public.dic_commit_import(a,doc,p->>'reviewHash',true);
  if r->>'code'<>'recovery_required' then raise exception 'Expired owner grant allowed import';end if;
  notes:=array_append(notes,'Expired exception fails closed even if saves_enabled is true');
  execute 'reset role';
  update private.import_control set saves_enabled=true,owner_only_exception_owner_id=a,
    owner_only_exception_approved_at=now(),
    owner_only_exception_expires_at=now()+interval '1 hour'
  where singleton;
  -- Other admitted members cannot take the single-owner exception.
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  p:=public.dic_preview_import(b,doc);
  if (p->>'canImport')::boolean then raise exception 'Another member can import';end if;
  r:=public.dic_commit_import(b,doc,p->>'reviewHash',true);
  if r->>'code'<>'recovery_required' then raise exception 'Another member bypassed owner exception';end if;
  notes:=array_append(notes,'Another admitted account cannot import');
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  p:=public.dic_preview_import(a,doc);
  if not (p->>'canImport')::boolean or (p->>'shots')::integer<>3 then
    raise exception 'Approved owner cannot preview';end if;
  notes:=array_append(notes,'Only approved owner sees valid import permission');
  refused:=false;begin perform public.dic_commit_import(a,doc,'wrong',true);
    exception when invalid_parameter_value then refused:=true;end;
  if not refused then raise exception 'Unreviewed hash passed';end if;
  refused:=false;begin perform public.dic_commit_import(a,doc,p->>'reviewHash',false);
    exception when invalid_parameter_value then refused:=true;end;
  if not refused then raise exception 'Missing independent recovery acknowledgement passed';end if;
  notes:=array_append(notes,'Exact review hash and recovery acknowledgement remain mandatory');
  r:=public.dic_commit_import(a,doc,p->>'reviewHash',true);
  if not (r->>'imported')::boolean or (r->>'shots')::integer<>3 then
    raise exception 'Owner-only atomic commit failed';end if;
  notes:=array_append(notes,'First approved owner import succeeds atomically');
  r:=public.dic_commit_import(a,doc,p->>'reviewHash',true);
  if not (r->>'alreadyImported')::boolean then raise exception 'Duplicate retry not idempotent';end if;
  notes:=array_append(notes,'Identical retry cannot duplicate rows');
  otherdoc:=jsonb_set(doc,'{data,coffees,0,name}','"Different Test Coffee"'::jsonb);
  r:=public.dic_commit_import(a,otherdoc,'wrong',true);
  if r->>'code'<>'recovery_required' then raise exception 'Second, different import allowed';end if;
  notes:=array_append(notes,'Second different import refused after automatic relock');
  execute 'reset role';
  if exists(select 1 from private.import_control
     where saves_enabled or recovery_verified_at is not null
       or owner_only_exception_owner_id is not null
       or owner_only_exception_expires_at is not null)
     then raise exception 'One-time import did not relock while preserving recovery NULL';end if;
  if (select count(*) from private.import_batches where owner_id=a)<>1
     or (select count(*) from public.shots where owner_id=a)<>3 then
    raise exception 'Nonatomic or duplicate import data';end if;
  notes:=array_append(notes,'Gate atomically relocked, recovery remains unverified, exact import counts');
  insert into dic_exception_role_test values(jsonb_build_object('passed',array_length(notes,1),'checks',notes,'scope','Synthetic users and sample rows, entirely rolled back'));
end $do$;
select result from dic_exception_role_test;
rollback;
