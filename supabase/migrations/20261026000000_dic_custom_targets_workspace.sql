-- Issue #14, source-only Custom targets. No production execution authorized.
begin;
create function private.dic_custom_targets_valid(t jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $v$
declare ratio numeric; low_time numeric; high_time numeric; temp numeric;
begin
 if t is null then return true; end if;
 if jsonb_typeof(t)<>'object' or (select count(*) from jsonb_object_keys(t))<>4
  or not(t ?& array['ratio','time_low_s','time_high_s','temperature_c'])
  or jsonb_typeof(t->'ratio')<>'number'
  or jsonb_typeof(t->'time_low_s')<>'number'
  or jsonb_typeof(t->'time_high_s')<>'number'
  or jsonb_typeof(t->'temperature_c') not in ('number','null') then return false; end if;
 ratio:=(t->>'ratio')::numeric;
 low_time:=(t->>'time_low_s')::numeric;
 high_time:=(t->>'time_high_s')::numeric;
 if ratio not between 0.8 and 4.5 or low_time not between 5 and 60
  or high_time not between 5 and 60 or high_time<=low_time then return false; end if;
 if jsonb_typeof(t->'temperature_c')='number' then
  temp:=(t->>'temperature_c')::numeric;
  if temp not between 85 and 99.9 then return false; end if;
 end if;
 return true;
exception when others then return false;
end $v$;
revoke all on function private.dic_custom_targets_valid(jsonb) from public,anon,authenticated;
alter table public.workspace_coffees add column custom_targets jsonb;
alter table public.workspace_coffees add constraint dic_custom_targets_valid
 check (private.dic_custom_targets_valid(custom_targets));
create function private.dic_save_custom_targets(mid uuid,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $s$
declare u uuid:=private.require_member(); sid uuid; vid uuid; lid uuid;
 expected bigint; prior private.mutation_receipts; wc public.workspace_coffees;
 digest text; answer jsonb;
begin
 if mid is null or jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>32000
 or coalesce(p->>'expected_revision','') !~ '^[0-9]{1,18}$'
 or p->'custom_targets' is null
 or not private.dic_custom_targets_valid(p->'custom_targets') then
  raise exception using errcode='22023',message='Invalid Custom targets or revision.';
 end if;
 sid:=(p->>'setup_id')::uuid;vid:=(p->>'setup_version_id')::uuid;
 lid:=(p->>'library_entry_id')::uuid;
 if sid is null or vid is null or lid is null then
  raise exception using errcode='22023',message='Missing Custom targets context.';
 end if;
 expected:=(p->>'expected_revision')::bigint;
 perform pg_advisory_xact_lock(hashtextextended(u::text,9311));
 digest:=encode(sha256(convert_to(jsonb_build_object('action','save_custom_targets','payload',p)::text,'UTF8')),'hex');
 select * into prior from private.mutation_receipts where owner_id=u and mutation_id=mid;
 if found then
  if prior.request_hash<>digest then raise exception using errcode='22023',message='Mutation ID reused.'; end if;
  return prior.response;
 end if;
 if not exists(select 1 from public.setups where owner_id=u and id=sid and active_version_id=vid and archived_at is null)
 or not exists(select 1 from public.library_entries where owner_id=u and id=lid and hidden_at is null) then
  raise exception using errcode='42501',message='Custom targets context is not accessible.';
 end if;
 select * into wc from public.workspace_coffees
 where owner_id=u and setup_id=sid and setup_version_id=vid and library_entry_id=lid for update;
 if coalesce(wc.revision,0)<>expected then
  return jsonb_build_object('ok',false,'code','conflict','revision',coalesce(wc.revision,0));
 end if;
 insert into public.workspace_coffees(owner_id,setup_id,setup_version_id,library_entry_id,selected_style,custom_targets)
 values(u,sid,vid,lid,'Custom',p->'custom_targets')
 on conflict(owner_id,setup_id,setup_version_id,library_entry_id)
 do update set selected_style='Custom',custom_targets=excluded.custom_targets returning * into wc;
 answer:=jsonb_build_object('ok',true,'record',to_jsonb(wc));
 insert into private.mutation_receipts(owner_id,mutation_id,request_hash,response)
 values(u,mid,digest,answer);
 return answer;
end $s$;
revoke all on function private.dic_save_custom_targets(uuid,jsonb) from public,anon,authenticated;
-- Same protected authenticated gateway pattern as private.mutate_workspace.
-- Internal schema is not a Data API exposed schema; require_member enforces admission.
grant execute on function private.dic_save_custom_targets(uuid,jsonb) to authenticated;
-- Patch the installed protected dispatcher only when its expected route is present exactly once.
do $router$
declare definition text; old_text text:=$old$ if action='rename_setup' then$old$;
begin
 definition:=pg_get_functiondef('public.dic_apply_client_change(uuid,uuid,text,jsonb)'::regprocedure);
 if position(old_text in definition)=0
 or position(old_text in substring(definition from position(old_text in definition)+length(old_text)))>0
 or position('private.dic_save_custom_targets' in definition)>0 then
  raise exception 'Unknown dispatcher version; source reconciliation needed';
 end if;
 execute replace(definition,old_text,$new$ if action='save_custom_targets' then
  return private.dic_save_custom_targets(mutation_id,payload);
 end if;
 if action='rename_setup' then$new$);
end $router$;
commit;