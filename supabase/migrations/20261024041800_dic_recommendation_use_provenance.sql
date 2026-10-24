-- Issue #12 / #10: preserve user-applied recommendation source through
-- existing shot history, original IDs, offline outbox and authenticated save.
-- No schema additions, no backfill, and no edits to previously recorded shots.
-- This client-supplied context is for private historical explanation only;
-- NEVER trust it for Community eligibility, origin proof or server identities.
create or replace function private.dic_capture_recommendation_context()
returns trigger language plpgsql security definer set search_path='' as $$
declare raw text; p jsonb; controls jsonb; tier text; label text;
 contributors integer; shots integer;
begin
 raw:=current_setting('dic.recommendation_context',true);
 if raw is null or length(raw)>800 then return new;end if;
 begin p:=raw::jsonb;exception when others then return new;end;
 if jsonb_typeof(p) is distinct from 'object' then return new;end if;
 controls:=p->'used_controls';
 if jsonb_typeof(controls) is distinct from 'array' or
    jsonb_array_length(controls) not between 1 and 2 then return new;end if;
 if exists(select 1 from jsonb_array_elements_text(controls) as x(control)
    where x.control not in ('grind','temperature')) then return new;end if;
 label:=left(coalesce(nullif(btrim(p->>'source_label'),''),'Starting recommendation'),90);
 tier:=case when p->>'community_tier' in ('exact','related_release','similar_coffee')
     then p->>'community_tier' else null end;
 contributors:=case when (p->>'contributor_count') ~ '^[0-9]{1,6}$'
     then least(100000,(p->>'contributor_count')::integer) else null end;
 shots:=case when (p->>'shot_count') ~ '^[0-9]{1,6}$'
     then least(100000,(p->>'shot_count')::integer) else null end;
 if contributors is null or shots is null or contributors<1 or shots<contributors then
  tier:=null;contributors:=null;shots:=null;
 end if;
 new.recommendation_context:=jsonb_build_object(
   'kind','member_selected_starting_reference',
   'source_label',label,'used_controls',controls,
   'community_tier',tier,'contributor_count',contributors,'shot_count',shots,
   'source_verified_independently',false);
 return new;
end $$;
revoke all on function private.dic_capture_recommendation_context()
 from public,anon,authenticated;
drop trigger if exists dic_capture_recommendation_context on public.shots;
create trigger dic_capture_recommendation_context
 before insert on public.shots for each row
 execute function private.dic_capture_recommendation_context();

-- Maintain EVERY previously deployed route and deny case verbatim.
-- SET LOCAL is transaction-scoped; never stores private tokens.
create or replace function public.dic_apply_client_change(
 expected_owner uuid,mutation_id uuid,action text,payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if action='hide_shot' then
  raise exception using errcode='22023',
   message='This action is no longer available. Your existing shot and offline record are unchanged.';
 end if;
 if expected_owner is null or expected_owner is distinct from auth.uid() then
  raise exception using errcode='42501',message='Account changed before this mutation was submitted. Original pending data was retained.';
 end if;
 if action='rename_setup' then
  return private.rename_setup(mutation_id,payload);
 end if;
 if action='submit_coffee' then
  return private.dic_submit_coffee_auto(mutation_id,payload);
 end if;
 if action='confirm_coffee_existing' then
  return private.dic_confirm_coffee_existing(mutation_id,payload);
 end if;
 if action='save_shot' then
  perform set_config('dic.recommendation_context',
    case when payload ? 'recommendation_context' and
      octet_length((payload->'recommendation_context')::text)<=800
     then (payload->'recommendation_context')::text
     else 'null' end,true);
 end if;
 return private.mutate_workspace(mutation_id,action,payload);
end $$;
revoke all on function public.dic_apply_client_change(uuid,uuid,text,jsonb)
 from public,anon,authenticated;
grant execute on function public.dic_apply_client_change(uuid,uuid,text,jsonb)
 to authenticated;
