-- Issue #509: reject JSON null elements in selected-recommendation used_controls.
-- Historic migration files and existing shots untouched; no backfill, no provider write.
-- JSON null becomes SQL NULL under jsonb_array_elements_text; NOT IN alone misses it.
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
    where x.control is null or x.control not in ('grind','temperature')) then return new;end if;
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
