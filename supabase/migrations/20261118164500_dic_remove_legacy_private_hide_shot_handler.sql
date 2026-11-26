-- #509 R339: retire only the obsolete INTERNAL Hide Shot action handler.
-- The externally reachable public.dic_apply_client_change already rejects
-- hide_shot BEFORE any replay. Keep all other actions, existing receipts,
-- shot/history data, ownership checks and historic migrations unchanged.
-- Current read-only provider private.mutate source MD5: d1050c2ee3b2896c6fbd8b90bdba9052
-- The function name, argument types, SECURITY DEFINER and grants stay intact.
CREATE OR REPLACE FUNCTION private.mutate(mid uuid, action text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 u uuid:=private.require_member(); h text; prior private.mutation_receipts; response jsonb;
 sid uuid; vid uuid; bid uuid; bvid uuid; gid uuid; lid uuid; cid uuid; submission uuid; shotid uuid;
 rowshot public.shots; oldshot public.shots; prefs public.account_preferences; w public.workspace_state;
 expected bigint; affected integer; t jsonb; oldrev bigint;
begin
 if mid is null or jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>32000 then raise exception using errcode='22023',message='Invalid mutation payload.'; end if;
 if action is null or action not in ('create_setup','save_preferences','submit_coffee','add_verified_coffee','save_shot') then raise exception using errcode='22023',message='Unsupported mutation action.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,9311));
 h:=encode(sha256(convert_to(jsonb_build_object('action',action,'payload',p)::text,'UTF8')),'hex');
 select * into prior from private.mutation_receipts where owner_id=u and mutation_id=mid;
 if found then
  if prior.request_hash<>h then raise exception using errcode='22023',message='A mutation ID cannot be reused for different changes.'; end if;
  return prior.response;
 end if;
 if action='create_setup' then
  sid:=coalesce((p->>'id')::uuid,gen_random_uuid()); vid:=gen_random_uuid();bid:=gen_random_uuid();bvid:=gen_random_uuid();gid:=gen_random_uuid();
  if coalesce(length(btrim(p->>'name')),0) not between 1 and 100 or
   jsonb_typeof(p->'basket_dose_g') is distinct from 'number' or jsonb_typeof(p->'finest_setting') is distinct from 'number' or jsonb_typeof(p->'coarsest_setting') is distinct from 'number' then
   raise exception using errcode='22023',message='Setup name, Basket Dose and espresso range are required.';
  end if;
  insert into public.setups(id,owner_id,name) values(sid,u,btrim(p->>'name'));
  insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model,burr_set)
   values(vid,u,sid,nullif(btrim(p->>'machine_model'),''),nullif(btrim(p->>'grinder_model'),''),nullif(btrim(p->>'burr_set'),''));
  insert into public.grinder_calibrations(id,owner_id,setup_id,grinder_model,burr_set,finest_setting,coarsest_setting)
   values(gid,u,sid,nullif(btrim(p->>'grinder_model'),''),nullif(btrim(p->>'burr_set'),''),(p->>'finest_setting')::numeric,(p->>'coarsest_setting')::numeric);
  insert into public.baskets(id,owner_id,setup_id,name) values(bid,u,sid,coalesce(nullif(btrim(p->>'basket_name'),''),(p->>'basket_dose_g')||' g basket'));
  insert into public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g,model) values(bvid,u,sid,bid,(p->>'basket_dose_g')::numeric,nullif(btrim(p->>'basket_model'),''));
  insert into public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id,temperature_unit)
   values(u,sid,vid,gid,bvid,coalesce(p->>'temperature_unit','F'));
  update public.setups set active_version_id=vid where id=sid and owner_id=u;
  insert into public.workspace_state(owner_id,setup_id,setup_version_id) values(u,sid,vid);
  update public.account_preferences set active_setup_id=sid where owner_id=u;
  response:=jsonb_build_object('ok',true,'setup_id',sid,'setup_version_id',vid,'basket_version_id',bvid,'calibration_id',gid);
 elsif action='save_preferences' then
  expected:=private.required_revision(p); select * into strict prefs from public.account_preferences where owner_id=u for update;
  if prefs.revision<>expected then return jsonb_build_object('ok',false,'code','conflict','revision',prefs.revision); end if;
  update public.account_preferences set theme=coalesce(p->>'theme',theme),tasting_preferences=coalesce(p->>'tasting_preferences',tasting_preferences)
   where owner_id=u returning * into prefs;
  response:=jsonb_build_object('ok',true,'record',to_jsonb(prefs));
 elsif action in ('submit_coffee','add_verified_coffee') then
  lid:=coalesce((p->>'library_entry_id')::uuid,gen_random_uuid());
  if action='submit_coffee' then
   if jsonb_typeof(p->'proposed_data') is distinct from 'object' or coalesce(length(btrim(p->'proposed_data'->>'name')),0) not between 1 and 200 or coalesce(length(btrim(p->'proposed_data'->>'roaster')),0) not between 1 and 200 then raise exception using errcode='22023',message='Coffee name and roaster are required.'; end if;
   submission:=gen_random_uuid();
   insert into public.coffee_submissions(id,owner_id,proposed_data,source_url) values(submission,u,p->'proposed_data',nullif(p->>'source_url',''));
   insert into public.library_entries(id,owner_id,submission_id) values(lid,u,submission);
  else
   cid:=(p->>'coffee_id')::uuid;
   if not exists(select 1 from public.coffees where id=cid and verification_state='verified') then raise exception using errcode='22023',message='Choose a verified coffee.'; end if;
   select id into lid from public.library_entries where owner_id=u and coffee_id=cid;
   if lid is null then
    lid:=coalesce((p->>'library_entry_id')::uuid,gen_random_uuid());
    insert into public.library_entries(id,owner_id,coffee_id) values(lid,u,cid);
   else
    update public.library_entries set hidden_at=null where id=lid and owner_id=u;
   end if;
  end if;
  -- Adding a coffee never changes the pin or recency.
  response:=jsonb_build_object('ok',true,'library_entry_id',lid,'submission_id',submission);
 elsif action='save_shot' then
  shotid:=coalesce((p->>'id')::uuid,gen_random_uuid());
  select * into oldshot from public.shots where owner_id=u and id=shotid for update;
  if found then
   expected:=private.required_revision(p);
   if oldshot.revision<>expected then return jsonb_build_object('ok',false,'code','conflict','revision',oldshot.revision); end if;
   -- Updates cannot change the original hardware, coffee, style or timestamp here.
   if (p ? 'library_entry_id' and (p->>'library_entry_id')::uuid<>oldshot.library_entry_id) or
      (p ? 'setup_version_id' and (p->>'setup_version_id')::uuid<>oldshot.setup_version_id) or
      (p ? 'style' and p->>'style'<>oldshot.style) then raise exception using errcode='23514',message='Use the original shot context when editing.'; end if;
  elsif coalesce((p->>'expected_revision')::bigint,0)<>0 then
   return jsonb_build_object('ok',false,'code','conflict','revision',0);
  end if;
  foreach h in array array['dose_g','yield_g','time_s','grind_setting'] loop
   if jsonb_typeof(p->h) is distinct from 'number' then raise exception using errcode='22023',message='Dose, yield, time and grind setting are required numeric observations.'; end if;
  end loop;
  t:=p->'taste';
  foreach h in array array['extraction','body','clarity','sweetness','astringency'] loop
   if jsonb_typeof(t->h) is distinct from 'number' or (t->>h)::numeric<>trunc((t->>h)::numeric) or (t->>h)::numeric not between 1 and 5 then raise exception using errcode='22023',message='Rate all five taste scales from 1 to 5.'; end if;
  end loop;
  if oldshot.id is null then
   sid:=(p->>'setup_id')::uuid;vid:=(p->>'setup_version_id')::uuid;lid:=(p->>'library_entry_id')::uuid;
   if not exists(select 1 from public.setups where owner_id=u and id=sid and active_version_id=vid and archived_at is null) then raise exception using errcode='23514',message='Select the active version of your equipment setup.'; end if;
   if not exists(select 1 from public.library_entries where owner_id=u and id=lid and hidden_at is null) then raise exception using errcode='23514',message='Select a coffee from your library.'; end if;
   insert into public.shots(id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,calibration_id,bag_id,style,pulled_at,
    dose_g,yield_g,time_s,grind_setting,temperature_c,feed_mode,extraction,body,clarity,sweetness,astringency,equipment_snapshot)
   values(shotid,u,lid,sid,vid,(p->>'basket_version_id')::uuid,(p->>'calibration_id')::uuid,(p->>'bag_id')::uuid,p->>'style',coalesce((p->>'pulled_at')::timestamptz,now()),
    (p->>'dose_g')::numeric,(p->>'yield_g')::numeric,(p->>'time_s')::numeric,(p->>'grind_setting')::numeric,(p->>'temperature_c')::numeric,coalesce(p->>'feed_mode','unknown'),
    (t->>'extraction')::smallint,(t->>'body')::smallint,(t->>'clarity')::smallint,(t->>'sweetness')::smallint,(t->>'astringency')::smallint,'{}') returning * into rowshot;
   -- Shot success, not style/time conformity, is computed by the generated column.
   insert into public.workspace_coffees(owner_id,setup_id,setup_version_id,library_entry_id,selected_style,basket_version_id,last_logged_at)
    values(u,sid,vid,lid,rowshot.style,rowshot.basket_version_id,now()) on conflict(owner_id,setup_id,setup_version_id,library_entry_id)
    do update set selected_style=excluded.selected_style,basket_version_id=excluded.basket_version_id,last_logged_at=excluded.last_logged_at;
   update public.workspace_state set current_library_entry_id=lid where owner_id=u and setup_id=sid and setup_version_id=vid;
  else
   update public.shots set dose_g=(p->>'dose_g')::numeric,yield_g=(p->>'yield_g')::numeric,time_s=(p->>'time_s')::numeric,grind_setting=(p->>'grind_setting')::numeric,
    temperature_c=(p->>'temperature_c')::numeric,extraction=(t->>'extraction')::smallint,body=(t->>'body')::smallint,clarity=(t->>'clarity')::smallint,sweetness=(t->>'sweetness')::smallint,astringency=(t->>'astringency')::smallint
    where owner_id=u and id=shotid returning * into rowshot;
  end if;
  perform private.classify_personal_shot(shotid);
  select * into rowshot from public.shots where id=shotid and owner_id=u;
  if p ? 'notes' then insert into public.shot_notes(owner_id,shot_id,notes) values(u,shotid,coalesce(p->>'notes','')) on conflict(owner_id,shot_id) do update set notes=excluded.notes; end if;
  response:=jsonb_build_object('ok',true,'record',to_jsonb(rowshot));
 end if;
 -- Recompute the original hash: h is also used as a loop field name above.
 h:=encode(sha256(convert_to(jsonb_build_object('action',action,'payload',p)::text,'UTF8')),'hex');
 insert into private.mutation_receipts(owner_id,mutation_id,request_hash,response) values(u,mid,h,response);
 return response;
end $function$;
