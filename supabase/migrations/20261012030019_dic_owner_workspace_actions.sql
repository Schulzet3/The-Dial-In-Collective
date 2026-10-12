-- Owner testing UI operations. No new product requirements; no real accounts seeded.
create function private.mutate_workspace(mid uuid, action text, p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_member(); h text; prior private.mutation_receipts; result jsonb; pref public.account_preferences;
 sp public.setup_preferences; wc public.workspace_coffees; rp public.recipe_preferences; sh public.shots;
 sid uuid; vid uuid; lid uuid; expected bigint; chosen_style text;
begin
 if action is null or action not in ('select_setup','set_style','save_setup_settings','make_current') then return private.mutate(mid,action,p); end if;
 if mid is null or jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>32000 then raise exception using errcode='22023',message='Invalid mutation payload.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,9311));
 h:=encode(sha256(convert_to(jsonb_build_object('action',action,'payload',p)::text,'UTF8')),'hex');
 select * into prior from private.mutation_receipts where owner_id=u and mutation_id=mid;
 if found then
  if prior.request_hash<>h then raise exception using errcode='22023',message='Mutation ID reused for different changes.'; end if;
  return prior.response;
 end if;
 if action='select_setup' then
  sid:=(p->>'setup_id')::uuid; expected:=private.required_revision(p);
  select * into strict pref from public.account_preferences where owner_id=u for update;
  if pref.revision<>expected then return jsonb_build_object('ok',false,'code','conflict','revision',pref.revision); end if;
  if not exists(select 1 from public.setups where owner_id=u and id=sid and archived_at is null) then raise exception using errcode='42501',message='Setup is not accessible.'; end if;
  update public.account_preferences set active_setup_id=sid where owner_id=u returning * into pref;
  result:=jsonb_build_object('ok',true,'record',to_jsonb(pref));
 elsif action='set_style' then
  sid:=(p->>'setup_id')::uuid;vid:=(p->>'setup_version_id')::uuid;lid:=(p->>'library_entry_id')::uuid;chosen_style:=p->>'style';
  if chosen_style is null or chosen_style not in ('Traditional','Turbo','Ristretto','Lungo','Custom') then raise exception using errcode='22023',message='Choose a shot style.'; end if;
  if not exists(select 1 from public.setups where owner_id=u and id=sid and active_version_id=vid) or not exists(select 1 from public.library_entries where owner_id=u and id=lid) then raise exception using errcode='42501',message='Workspace or coffee is not accessible.'; end if;
  if coalesce(p->>'expected_revision','') !~ '^[0-9]+$' then raise exception using errcode='22023',message='Expected revision is required.'; end if;
  select * into wc from public.workspace_coffees where owner_id=u and setup_id=sid and setup_version_id=vid and library_entry_id=lid for update;
  if coalesce(wc.revision,0)<>(p->>'expected_revision')::bigint then return jsonb_build_object('ok',false,'code','conflict','revision',coalesce(wc.revision,0)); end if;
  insert into public.workspace_coffees(owner_id,setup_id,setup_version_id,library_entry_id,selected_style) values(u,sid,vid,lid,chosen_style)
   on conflict(owner_id,setup_id,setup_version_id,library_entry_id) do update set selected_style=excluded.selected_style returning * into wc;
  -- Viewing/changing style does not alter recency or Current Coffee.
  result:=jsonb_build_object('ok',true,'record',to_jsonb(wc));
 elsif action='save_setup_settings' then
  sid:=(p->>'setup_id')::uuid;vid:=(p->>'setup_version_id')::uuid;expected:=private.required_revision(p);
  select * into sp from public.setup_preferences where owner_id=u and setup_id=sid and setup_version_id=vid for update;
  if not found then raise exception using errcode='42501',message='Setup settings not accessible.'; end if;
  if sp.revision<>expected then return jsonb_build_object('ok',false,'code','conflict','revision',sp.revision); end if;
  if jsonb_typeof(p->'track_temperature') is distinct from 'boolean' or jsonb_typeof(p->'track_slow_feed') is distinct from 'boolean' or p->>'temperature_unit' not in ('C','F') or p->>'temperature_unit' is null then raise exception using errcode='22023',message='Provide valid advanced settings.'; end if;
  update public.setup_preferences set track_temperature=(p->>'track_temperature')::boolean,
   slow_feed=case when track_slow_feed is distinct from (p->>'track_slow_feed')::boolean then false else slow_feed end,
   track_slow_feed=(p->>'track_slow_feed')::boolean,temperature_unit=p->>'temperature_unit'
   where owner_id=u and setup_id=sid and setup_version_id=vid returning * into sp;
  result:=jsonb_build_object('ok',true,'record',to_jsonb(sp));
 elsif action='make_current' then
  select * into sh from public.shots where owner_id=u and id=(p->>'shot_id')::uuid;
  if not found or not sh.is_dialed_in or sh.hidden_at is not null or sh.personal_family_id is null then raise exception using errcode='22023',message='Choose your own visible all-green shot.'; end if;
  if not exists(select 1 from public.setups where owner_id=u and id=sh.setup_id and active_version_id=sh.setup_version_id) then raise exception using errcode='22023',message='This is a reference from another equipment version.'; end if;
  select * into rp from public.recipe_preferences where owner_id=u and setup_version_id=sh.setup_version_id and library_entry_id=sh.library_entry_id and style=sh.style for update;
  if coalesce(p->>'expected_revision','') !~ '^[0-9]+$' then raise exception using errcode='22023',message='Expected recipe revision is required.'; end if;
  if coalesce(rp.revision,0)<>(p->>'expected_revision')::bigint then return jsonb_build_object('ok',false,'code','conflict','revision',coalesce(rp.revision,0)); end if;
  insert into public.recipe_preferences(owner_id,setup_id,setup_version_id,library_entry_id,style,current_family_id,favorite_shot_id)
   values(u,sh.setup_id,sh.setup_version_id,sh.library_entry_id,sh.style,sh.personal_family_id,sh.id)
   on conflict(owner_id,setup_id,setup_version_id,library_entry_id,style) do update set current_family_id=excluded.current_family_id,favorite_shot_id=excluded.favorite_shot_id returning * into rp;
  update public.experiments set state='promoted',ended_at=now() where owner_id=u and setup_version_id=sh.setup_version_id and library_entry_id=sh.library_entry_id and style=sh.style and state='active';
  result:=jsonb_build_object('ok',true,'record',to_jsonb(rp));
 end if;
 insert into private.mutation_receipts(owner_id,mutation_id,request_hash,response) values(u,mid,h,result);
 return result;
end $$;
revoke all on function private.mutate_workspace(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function private.mutate_workspace(uuid,text,jsonb) to authenticated;
create or replace function public.dic_mutate(mutation_id uuid,action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.mutate_workspace(mutation_id,action,payload); $$;
-- Route client writes through optimistic/idempotent APIs, not older bypass grants.
revoke execute on function private.mutate(uuid,text,jsonb) from authenticated;
revoke update(theme,tasting_preferences) on public.account_preferences from authenticated;
revoke insert(id,owner_id,proposed_data,source_url,canonical_coffee_id,base_coffee_revision) on public.coffee_submissions from authenticated;
