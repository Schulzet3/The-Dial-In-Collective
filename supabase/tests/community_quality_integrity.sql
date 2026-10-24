-- Network-isolated PostgreSQL 17.11 integration test (dic_ci ONLY).
-- Synthetic users, shots and coffees. All writes roll back. NEVER run on hosted.
begin;
do $test$
declare
 c1 uuid:=gen_random_uuid();c2 uuid:=gen_random_uuid();cp uuid:=gen_random_uuid();c3 uuid:=gen_random_uuid();
 us uuid[]:='{}'; sh uuid[]:='{}'; cs uuid[]:='{}'; setups uuid[]:='{}';
 u uuid; setup uuid; version uuid; basket uuid; basket_version uuid; calib uuid;
 library uuid; sid uuid; target uuid; pending_library uuid; pending_shot uuid;
 submission uuid; pending_projection uuid; same_user_shot uuid; c2_shot uuid;
 old_cid uuid; old_revision bigint; outcome text; result jsonb;
 i integer; quality_count integer; pre_revision bigint;
 status text; reason_value text; totals jsonb; denied boolean;
 before_timestamp timestamptz;
begin
 if current_database()<>'dic_ci' then raise exception 'Only isolated dic_ci may execute community test'; end if;

 -- Same roaster product URL may represent distinct verified releases.
 insert into public.coffees(id,name,roaster,release_label,origin,process,producer,verification_state)
 values(c1,'CI Exact Release 2026','Fixture Roaster','2026 Harvest','Ethiopia','Washed','Farm One','verified'),
       (c2,'CI Exact Release 2026','Fixture Roaster','2027 Harvest','Ethiopia','Natural','Farm Two','verified'),
       (cp,'CI Formerly Pending','Fixture Roaster','2028',null,null,null,'pending'),
       (c3,'CI Personal Outlier','Fixture Roaster','2029',null,null,null,'verified');
 insert into public.coffee_sources(coffee_id,source_url,source_kind) values
 (c1,'https://roaster.example.invalid/products/reusable','roaster_page'),
 (c2,'https://roaster.example.invalid/products/reusable','roaster_page');

 -- Five INDEPENDENT contributors establish a robust baseline. One member
 -- alone cannot manufacture five reference observations.
 for i in 1..6 loop
  u:=gen_random_uuid();setup:=gen_random_uuid();version:=gen_random_uuid();
  basket:=gen_random_uuid();basket_version:=gen_random_uuid();calib:=gen_random_uuid();
  library:=gen_random_uuid();sid:=gen_random_uuid();
  us:=array_append(us,u);setups:=array_append(setups,setup);sh:=array_append(sh,sid);
  insert into auth.users(id,aud,role,email) values
    (u,'authenticated','authenticated',u::text||'@fixture.invalid');
  update private.beta_members set enabled=true,admitted_at=now() where owner_id=u;
  insert into public.setups(id,owner_id,name) values(setup,u,'Personal setup');
  insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model,burr_set)
     values(version,u,setup,'Fixture Machine','Fixture Grinder','Fixture Burr');
  insert into public.grinder_calibrations(
    id,owner_id,setup_id,grinder_model,burr_set,finest_setting,coarsest_setting
  ) values(calib,u,setup,'Fixture Grinder','Fixture Burr',0,5);
  insert into public.baskets(id,owner_id,setup_id,name) values(basket,u,setup,'18 g');
  insert into public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g,model)
    values(basket_version,u,setup,basket,18,'Fixture Basket');
  insert into public.library_entries(id,owner_id,coffee_id) values(library,u,c1);
  insert into public.shots(
   id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,
   calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,
   extraction,body,clarity,sweetness,astringency,equipment_snapshot
  ) values(sid,u,library,setup,version,basket_version,calib,
    'Turbo',now(),18,42,case when i=6 then 145 else 25 end,1.1,
    3,3,5,5,1,'{}');
  insert into public.shot_notes(owner_id,shot_id,notes)
    values(u,sid,'PRIVATE: '||u::text||'@fixture.invalid');
  select community_shot_id into strict target from private.contribution_links
    where shot_id=sid;
  cs:=array_append(cs,target);
  select quality_state into status from public.community_shots where id=target;
  if i<6 and status<>'eligible' then
   raise exception 'Normal verified green shot not eligible % %',i,status;
  end if;
  if i=6 and status<>'held' then
   raise exception 'Extreme time not held for correction/confirmation: %',status;
  end if;
 end loop;
 select q.reason into reason_value from private.community_quality_checks q where community_shot_id=cs[6];
 if reason_value<>'extreme_outlier' then raise exception 'Held reason lost: %',reason_value;end if;
 if (select count(*) from public.community_shots where coffee_id=c1 and quality_state='eligible')<>5 then
  raise exception 'Eligibility not limited to five vetted baseline samples';end if;

 -- Sanitized member Community browse lists eligible source measurements only.
 -- Counts distinguish successful shots from independent contributors.
 perform set_config('request.jwt.claim.sub',us[5]::text,true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('sub',us[5],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.dic_browse_community_shots(20,0);
 if (result->>'total')::integer<>5 or jsonb_array_length(result->'shots')<>5
    or (result->'shots'->0->>'contributor_count')::integer<>5
    or (result->'shots'->0->>'shot_count')::integer<>5 then
  raise exception 'Sanitized browse counts incorrect: %',result;
 end if;
 if result::text like '%@fixture.invalid%' or result::text like '%PRIVATE:%'
    or result::text like '%contributor_id%' or result::text like '%owner_id%'
    or result::text like '%shot_id%' or result::text like '%machine_model%' then
  raise exception 'PII or internal IDs leaked through browse feed';
 end if;
 if public.dic_my_community_outliers()<>'[]'::jsonb then
  raise exception 'Non-owner can see another member''s held shot';end if;
 execute 'reset role';

 -- A direct authenticated client can neither rewrite quality nor read
 -- the private contributor/quality tables.
 if has_function_privilege('authenticated','private.dic_review_community_shot(uuid)','EXECUTE')
  or has_function_privilege('anon','private.dic_review_pending_community(integer)','EXECUTE')
  or has_table_privilege('authenticated','private.community_quality_checks','SELECT')
  or has_table_privilege('authenticated','public.community_shots','SELECT')
  or has_column_privilege('authenticated','public.community_shots','machine_model','SELECT')
 then raise exception 'Quality controls exposed to client roles';end if;

 perform set_config('request.jwt.claim.sub',us[5]::text,true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('sub',us[5],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin
  update public.community_shots set quality_state='eligible' where id=cs[6];
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Member directly promoted held contribution';end if;
 result:=public.dic_confirm_community_outlier(sh[6],1);
 if result->>'ok'<>'false' then
  raise exception 'Another member confirmed someone else''s outlier';end if;

 -- No notes, email or account link in the member-facing aggregate.
 totals:=public.dic_community_evidence_counts(c1,'Turbo');
 if totals->>'shot_count'<>'5' or totals->>'contributor_count'<>'5' then
  raise exception 'Initial safe counts differ: %',totals;end if;
 begin
  perform count(*) from private.contribution_links;
  raise exception 'Private contributor links readable by member';
 exception when insufficient_privilege then null;
 end;
 execute 'reset role';

 -- Member review inbox contains only their own held shot and version.
 perform set_config('request.jwt.claim.sub',us[6]::text,true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('sub',us[6],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.dic_my_community_outliers();
 if jsonb_array_length(result)<>1 or result->0->>'shot_id'<>sh[6]::text
    or (result->0->>'revision')::bigint<>1
    or result::text like '%@fixture.invalid%' then
  raise exception 'Owner review inbox wrong: %',result;
 end if;
 execute 'reset role';

 -- Owner confirmation is both identity-bound and source-revision-bound.
 perform set_config('request.jwt.claim.sub',us[6]::text,true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('sub',us[6],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.dic_confirm_community_outlier(sh[6],100);
 if result->>'ok'<>'false' then raise exception 'Stale revision confirmation worked';end if;
 result:=public.dic_confirm_community_outlier(sh[6],1);
 if result->>'ok'<>'true' or result->>'state'<>'eligible' then
  raise exception 'Genuine member could not confirm plausible outlier: %',result;end if;
 result:=public.dic_confirm_community_outlier(sh[6],1);
 if result->>'ok'<>'false' then raise exception 'Confirmation not idempotently closed';end if;
 execute 'reset role';

 perform set_config('request.jwt.claim.sub',us[6]::text,true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('sub',us[6],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if public.dic_my_community_outliers()<>'[]'::jsonb then
  raise exception 'Confirmed owner still sees unresolved prompt';end if;
 execute 'reset role';

 -- Personal Hide must NOT withdraw an already eligible anonymous contribution.
 old_cid:=cs[6];
 update public.shots set hidden_at=clock_timestamp() where id=sh[6];
 if (select quality_state from public.community_shots where id=old_cid)<>'eligible' then
  raise exception 'Personal Hide unexpectedly revoked a valid contribution';end if;

 -- A material correction must invalidate previous confirmation and reuse
 -- the exact immutable contribution ID (no duplicates or stale promotion).
 update public.shots set time_s=155 where id=sh[6];
 if (select quality_state from public.community_shots where id=old_cid)<>'held' then
  raise exception 'Outlier confirmation incorrectly survived corrected measurement';end if;
 update public.shots set time_s=25 where id=sh[6];
 if (select quality_state from public.community_shots where id=old_cid)<>'eligible'
 or (select count(*) from private.contribution_links where shot_id=sh[6])<>1 then
  raise exception 'Ordinary corrected time did not re-qualify same projection';end if;
 update public.shots set clarity=4 where id=sh[6];
 if (select quality_state from public.community_shots where id=old_cid)<>'withdrawn' then
  raise exception 'Non-green correction remained public';end if;
 update public.shots set clarity=5 where id=sh[6];
 if (select quality_state from public.community_shots where id=old_cid)<>'eligible' then
  raise exception 'Restored green observation did not re-qualify';end if;

 -- Reconciliation is stable without duplicate review rows or timestamp churn.
 select reviewed_at into before_timestamp from private.community_quality_checks
  where community_shot_id=cs[1];
 perform private.dic_review_community_shot(cs[1]);
 perform private.dic_review_community_shot(cs[1]);
 if (select count(*) from private.community_quality_checks
      where community_shot_id=cs[1])<>1
    or (select reviewed_at from private.community_quality_checks
        where community_shot_id=cs[1]) is distinct from before_timestamp then
  raise exception 'Idempotent review duplicated or rewrote unchanged checkpoint';end if;

 -- Multiple shots by one owner increase sample count but not contributors.
 select library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id
 into library,setup,version,basket_version,calib from public.shots where id=sh[1];
 same_user_shot:=gen_random_uuid();
 insert into public.shots(
  id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,
  calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,
  extraction,body,clarity,sweetness,astringency,equipment_snapshot
 ) values(same_user_shot,us[1],library,setup,version,basket_version,calib,
  'Turbo',now(),18,43,26,1.2,3,3,5,5,1,'{}');
 totals:=public.dic_community_evidence_counts(c1,'Turbo');
 if totals->>'shot_count'<>'7' or totals->>'contributor_count'<>'6' then
  raise exception 'Distinct contributor balancing count was incorrect: %',totals;end if;

 -- Five preceding own coffee/style/setup shots establish stable context.
 -- A sixth 62-second shot is held for confirmation, not automatically rejected.
 insert into public.library_entries(owner_id,coffee_id)
   values(us[1],c3) returning id into library;
 for i in 1..6 loop
  sid:=gen_random_uuid();
  insert into public.shots(
   id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,
   calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,
   extraction,body,clarity,sweetness,astringency,equipment_snapshot
  ) values(sid,us[1],library,setup,version,basket_version,calib,
    'Turbo',now()+i*interval '1 minute',18,42,
    case when i=6 then 62 else 25 end,1.1,3,3,5,5,1,'{}');
  if i=6 then
   select community_shot_id into target from private.contribution_links
     where shot_id=sid;
   if (select quality_state from public.community_shots where id=target)<>'held'
   or (select reason from private.community_quality_checks
       where community_shot_id=target)<>'extreme_outlier' then
    raise exception 'Five prior green shots were ignored for the 62-second outlier review';
   end if;
   perform set_config('request.jwt.claim.sub',us[1]::text,true);
   perform set_config('request.jwt.claims',
    jsonb_build_object('sub',us[1],'role','authenticated')::text,true);
   execute 'set local role authenticated';
   result:=public.dic_confirm_community_outlier(sid,1);
   if result->>'ok'<>'true' then
    raise exception 'Owner could not affirm their plausible unconventional espresso: %',result;
   end if;
   execute 'reset role';
  end if;
 end loop;
 totals:=public.dic_community_evidence_counts(c3,'Turbo');
 if totals->>'shot_count'<>'6' or totals->>'contributor_count'<>'1' then
  raise exception 'Personal-priority review or count wrong: %',totals;
 end if;

 -- Different verified RELEASE cannot leak into other release's count,
 -- despite the identical source URL.
 insert into public.library_entries(owner_id,coffee_id)
  values(us[1],c2) returning id into library;
 c2_shot:=gen_random_uuid();
 insert into public.shots(
  id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,
  calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,
  extraction,body,clarity,sweetness,astringency,equipment_snapshot
 ) values(c2_shot,us[1],library,setup,version,basket_version,calib,
  'Turbo',now(),18,42,25,1.1,3,3,5,5,1,'{}');
 if (public.dic_community_evidence_counts(c1,'Turbo')->>'shot_count')<>'7'
    or (public.dic_community_evidence_counts(c2,'Turbo')->>'shot_count')<>'1' then
  raise exception 'Two coffee releases were incorrectly combined';end if;

 -- Both verified canonical releases have the SAME public name and roaster.
 -- No private member or source IDs can escape through this member-only DTO.
 perform set_config('request.jwt.claim.sub',us[5]::text,true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('sub',us[5],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.dic_browse_community_shots(40,0);
 if (select count(distinct j.value->>'release_key')
       from jsonb_array_elements(result->'shots') as j(value)
       where j.value->>'coffee_name'='CI Exact Release 2026')<>2 then
  raise exception 'Member browse combined different exact canonical releases';end if;
 if not exists(select 1 from jsonb_array_elements(result->'shots') as j(value)
       where j.value->>'release_key'=encode(sha256(convert_to(c1::text,'UTF8')),'hex')
         and j.value->>'release_label'='2026 Harvest'
         and j.value->>'release_origin'='Ethiopia'
         and j.value->>'release_process'='Washed'
         and j.value->>'release_producer'='Farm One'
         and j.value->>'shot_count'='7'
         and j.value->>'contributor_count'='6') then
  raise exception 'First release public facts or per-release count mismatch';end if;
 if not exists(select 1 from jsonb_array_elements(result->'shots') as j(value)
       where j.value->>'release_key'=encode(sha256(convert_to(c2::text,'UTF8')),'hex')
         and j.value->>'release_label'='2027 Harvest'
         and j.value->>'release_process'='Natural'
         and j.value->>'release_producer'='Farm Two'
         and j.value->>'shot_count'='1'
         and j.value->>'contributor_count'='1') then
  raise exception 'Second release facts/count corrupted or merged';end if;
 if exists(select 1 from jsonb_array_elements(result->'shots') as j(value)
       where j.value ?| array['coffee_id','shot_id','owner_id','contributor_id',
        'email','notes','source_url','machine_model','grinder_model',
        'basket_model','setup_name','group_id','release_date'])
  or result::text like '%@fixture.invalid%' or result::text like '%PRIVATE:%' then
  raise exception 'Release grouping projection disclosed private identifiers or invented dates';end if;
 execute 'reset role';
 -- Paged responses still agree on count, and ID stays stable across pages.
 perform set_config('request.jwt.claim.sub',us[5]::text,true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('sub',us[5],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if (public.dic_browse_community_shots(2,0)->>'total')::integer
    is distinct from (public.dic_browse_community_shots(2,2)->>'total')::integer then
  raise exception 'Paging total mutated after adding release context';end if;
 execute 'reset role';


 -- A green shot logged under Pending remains private until its coffee is
 -- approved AND linked. No false automatic save or shot revision mutation.
 insert into public.coffee_submissions(owner_id,proposed_data)
 values(us[1],'{"name":"CI Formerly Pending","roaster":"Fixture Roaster"}'::jsonb)
 returning id into submission;
 insert into public.library_entries(owner_id,submission_id)
 values(us[1],submission) returning id into pending_library;
 -- A member can edit own Pending coffee details without creating a second
 -- library entry or exposing the Pending coffee to Community.
 perform set_config('request.jwt.claim.sub',us[1]::text,true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('sub',us[1],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.dic_edit_my_coffee(pending_library,1,
  '{"name":"CI Formerly Pending","roaster":"Fixture Roaster","producer":"Edited Farm"}'::jsonb,
  'https://roaster.example.invalid/real-coffee');
 if result->>'kind'<>'updated_pending' then
  raise exception 'Own Pending details not updated: %',result;end if;
 result:=public.dic_edit_my_coffee(pending_library,1,
  '{"name":"Oops","roaster":"Fixture Roaster"}'::jsonb,null);
 if result->>'code'<>'conflict' then
  raise exception 'Stale Pending revision was accepted';end if;
 execute 'reset role';
 if (select proposed_data->>'producer' from public.coffee_submissions where id=submission)<>'Edited Farm'
 or (select count(*) from public.library_entries where owner_id=us[1] and submission_id=submission)<>1 then
  raise exception 'Edited Pending details or identity mismatch';end if;
 perform set_config('request.jwt.claim.sub',us[2]::text,true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('sub',us[2],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.dic_edit_my_coffee(pending_library,2,
  '{"name":"Hijack","roaster":"Fixture Roaster"}'::jsonb,null);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Different owner could edit Pending coffee';end if;
 execute 'reset role';

 pending_shot:=gen_random_uuid();
 insert into public.shots(
  id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,
  calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,
  extraction,body,clarity,sweetness,astringency,equipment_snapshot
 ) values(pending_shot,us[1],pending_library,setup,version,basket_version,calib,
  'Traditional',now(),18,38,28,1.1,3,3,5,5,1,'{}');
 if exists(select 1 from private.contribution_links where shot_id=pending_shot) then
  raise exception 'Pending coffee contributed publicly';end if;
 select revision into pre_revision from public.shots where id=pending_shot;
 update public.library_entries set coffee_id=cp,submission_id=null
 where id=pending_library;
 if exists(select 1 from private.contribution_links where shot_id=pending_shot) then
  raise exception 'Pending canonical catalog state published contribution';end if;
 update public.coffees set verification_state='verified' where id=cp;
 select community_shot_id into pending_projection from private.contribution_links
  where shot_id=pending_shot;
 if pending_projection is null or
    (select quality_state from public.community_shots where id=pending_projection)<>'eligible' then
  raise exception 'Verified Pending-coffee history not safely backfilled';end if;
 if (select revision from public.shots where id=pending_shot)<>pre_revision then
  raise exception 'Backfill modified original personal history revision';end if;
 update public.coffees set verification_state='rejected' where id=cp;
 if (select quality_state from public.community_shots where id=pending_projection)<>'held' then
  raise exception 'Unverified release still exposed community row';end if;
 update public.coffees set verification_state='verified' where id=cp;
 if (select quality_state from public.community_shots where id=pending_projection)<>'eligible' then
  raise exception 'Restored verified source did not revalidate';end if;

 -- Existing Verified facts never change through member Edit Coffee.
 -- The server stores a revision-safe proposal for administrator source review.
 select library_entry_id into library from public.shots where id=sh[1];
 select revision into pre_revision from public.coffees where id=c1;
 perform set_config('request.jwt.claim.sub',us[1]::text,true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('sub',us[1],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.dic_edit_my_coffee(library,pre_revision,
  '{"name":"Proposed Different Name","roaster":"Fixture Roaster","producer":"Review Farm"}'::jsonb,
  'https://roaster.example.invalid/correction');
 if result->>'kind'<>'correction_requested' then
  raise exception 'Verified correction request was not recorded: %',result;end if;
 result:=public.dic_edit_my_coffee(library,pre_revision+100,
  '{"name":"Another Name","roaster":"Fixture Roaster"}'::jsonb,null);
 if result->>'code'<>'conflict' then
  raise exception 'Stale verified correction should conflict: %',result;end if;
 execute 'reset role';
 if (select name from public.coffees where id=c1)<>'CI Exact Release 2026'
 or (select count(*) from public.coffee_submissions
    where owner_id=us[1] and canonical_coffee_id=c1 and public.coffee_submissions.status='pending'
      and proposed_data->>'producer'='Review Farm')<>1 then
  raise exception 'Member changed shared canonical facts or lost correction';end if;
 if (select count(*) from private.contribution_links where shot_id=sh[1])<>1 then
  raise exception 'Coffee correction changed historical shot association';end if;

 -- Detached contributions retain anonymous evidence, never the deleted
 -- owner's identity or private shot notes.
 delete from auth.users where id=us[6];
 if not exists(select 1 from public.community_shots
    where id=old_cid and quality_state='eligible')
   or not exists(select 1 from private.contribution_links
    where community_shot_id=old_cid and shot_id is null)
   or exists(select 1 from private.contributors
    where id=(select contributor_id from private.contribution_links
      where community_shot_id=old_cid) and owner_id is not null)
 then raise exception 'Detached shared evidence/privacy retention failed';end if;
 -- The detached owner no longer has a valid session; read counts as a
 -- different admitted member to verify anonymous durability.
 perform set_config('request.jwt.claim.sub',us[1]::text,true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('sub',us[1],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 totals:=public.dic_community_evidence_counts(c1,'Turbo');
 execute 'reset role';
 if totals->>'shot_count'<>'7' or totals->>'contributor_count'<>'6' then
  raise exception 'Unique detached contributor was lost: %',totals;end if;
 if exists(select 1 from information_schema.columns
   where table_schema='public' and table_name='community_shots'
    and column_name in ('owner_id','shot_id','email','notes','contributor_id')) then
  raise exception 'Personal identifier in public projection table';end if;

 -- Old Pending rows are reviewable in small bounded maintenance batches.
 update public.community_shots set quality_state='pending_quality' where id=cs[1];
 result:=private.dic_review_pending_community(100);
 if (result->>'eligible')::integer<1 or
    (select quality_state from public.community_shots where id=cs[1])<>'eligible' then
  raise exception 'Bounded maintenance failed: %',result;end if;
 denied:=false;
 begin perform private.dic_review_pending_community(0);
 exception when invalid_parameter_value then denied:=true;
 end;
 if not denied then raise exception 'Unbounded worker limit accepted';end if;

 perform set_config('request.jwt.claim.sub','',true);
 execute 'set local role anon';
 denied:=false;
 begin
  perform public.dic_browse_community_shots(20,0);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Anonymous browsing was allowed';end if;
 execute 'reset role';

 -- Tested member sees only verified, contributor-balanced, same-style
 -- anonymous starting evidence for their own canonical coffee identity.
 perform set_config('request.jwt.claim.sub',us[1]::text,true);
 perform set_config('request.jwt.claims',
   jsonb_build_object('sub',us[1],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.dic_community_recommendation_evidence(
  (select id from public.library_entries where owner_id=us[1] and coffee_id=c1 limit 1),'Turbo');
 execute 'reset role';
 if (result->>'style') is distinct from 'Turbo' or
    jsonb_array_length(result->'candidates')<1 or
    result->'candidates'->0->>'tier' is distinct from 'exact' then
  raise exception 'Exact verified community prior missing: %',result;end if;
 if result::text like '%contributor_id%' or result::text like '%owner_id%' or
    result::text like '%grind_setting%' or result::text like '%notes%' then
  raise exception 'Private contributor metadata leaked';end if;

 -- Revoke admission immediately suppresses both community reads and stats.
 perform set_config('request.jwt.claim.sub',us[1]::text,true);
 perform set_config('request.jwt.claims',
  jsonb_build_object('sub',us[1],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if (public.dic_browse_community_shots(20,0)->>'total')::integer=0 then
  raise exception 'Sanitized eligible rows unavailable to admitted member';end if;
 execute 'reset role';
 update private.beta_members set enabled=false where owner_id=us[1];
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.dic_community_evidence_counts(c1,'Turbo');
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Revoked member retained Community aggregate access';end if;
 denied:=false;
 begin perform public.dic_browse_community_shots(20,0);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Revoked member retained Community browsing';end if;
 execute 'reset role';

 raise notice 'PASS community: verified-only, five peers, outlier confirmation, identity, correction, hidden/deleted durability, Pending approval, contributor counts, RLS, idempotence';
end $test$;
select 'PASS: isolated community quality integration; no hosted writes' as result;
rollback;
