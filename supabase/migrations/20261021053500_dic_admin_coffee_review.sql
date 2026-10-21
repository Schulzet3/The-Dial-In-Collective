-- STAGED ONLY. Do not apply to production absent separate release + SQL authorization.
-- Owner-Locked: external-source verification is service-owned; manual administrator
-- decisions retain label provenance, audit rows, version checks and historical IDs.
-- This helper is copied from the independently read back live definition and only
-- admits the server-guarded admin_reviewed method. Existing methods stay unchanged.

-- Retain all six historical audit categories, add distinct manually reviewed
-- non-owner canonical approval and duplicate-reconciliation event provenance.
alter table private.dic_coffee_audit
  drop constraint dic_coffee_audit_event_kind_check;
alter table private.dic_coffee_audit
  add constraint dic_coffee_audit_event_kind_check
  check (event_kind in ('admin_approved','official_verified','user_confirmed',
    'canonical_reused','needs_review','owner_roast_reclassified',
    'admin_reviewed','admin_reviewed_merge'));
CREATE OR REPLACE FUNCTION private.dic_promote_pending_coffee(sid uuid, method text, evidence jsonb DEFAULT '{}'::jsonb, distinct_confirmed boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 s public.coffee_submissions; new_c public.coffees; cid uuid; locked_key text;
 raw jsonb; roaster_text text; known_name text; brandkey text; official_host text; host text;
 product_name text; source_title text; namekey text; existed uuid; same_url uuid;
 existing_count integer; same_url_count integer; declared_release text; official_release text; conflicting boolean;
 info jsonb; source_kind text;
begin
 if method not in ('admin_approved','official_verified','admin_reviewed') then
  raise exception using errcode='22023',message='Unsupported verification method.';
 end if;
 if method='official_verified'
   and current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Only the trusted source verifier may approve external evidence.';
 end if;
 if jsonb_typeof(evidence) is distinct from 'object' or octet_length(evidence::text)>10000 then
  raise exception using errcode='22023',message='Invalid evidence payload.';
 end if;
 select * into s from public.coffee_submissions where id=sid for update;
 if not found then raise exception using errcode='22023',message='Coffee submission unavailable.';end if;
 if method='admin_reviewed' and
    ((select auth.uid()) is null or not private.is_admin()) then
  raise exception using errcode='42501',message='Only an administrator may review a member coffee.';
 end if;
 if method='admin_approved' and
    (not private.is_admin() or auth.uid() is distinct from s.owner_id) then
  raise exception using errcode='42501',message='Only the owning administrator can automatically approve their submissions.';
 end if;
 if s.status in ('approved','merged') and s.canonical_coffee_id is not null then
  return jsonb_build_object('ok',true,'coffee_id',s.canonical_coffee_id,'status','verified','already_verified',true);
 end if;
 if s.status not in ('pending','conflict') then
  raise exception using errcode='23514',message='Submission cannot be verified from this state.';
 end if;
 raw:=s.proposed_data;
 brandkey:=private.dic_canonical_roaster_key(raw->>'roaster');
 namekey:=private.dic_coffee_key(raw->>'name');
 if namekey is null or brandkey is null then
  raise exception using errcode='22023',message='Coffee and roaster names must be provided.';
 end if;
 select canonical_name,official_domain into known_name,official_host from private.dic_roaster_directory where canonical_key=brandkey;
 roaster_text:=coalesce(known_name,btrim(raw->>'roaster'));
 declared_release:=nullif(btrim(raw->>'release_label'),'');
 if method='official_verified' then
  if official_host is null or nullif(s.source_url,'') is null or
    evidence->>'evidence_kind' not in ('jsonld_product','official_product_page') then
   raise exception using errcode='23514',message='Verified roaster product evidence is required.';
  end if;
  if s.source_url !~ '^https://' then
   raise exception using errcode='23514',message='The official product URL must use HTTPS.';
  end if;
  host:=lower(split_part(split_part(regexp_replace(s.source_url,'^https://',''),'/',1),'?',1));
  if host not in (official_host,'www.'||official_host) then
   raise exception using errcode='23514',message='Source URL does not belong to the verified roaster.';
  end if;
  if private.dic_source_key(s.source_url) is distinct from private.dic_source_key(evidence->>'checked_url') then
   raise exception using errcode='23514',message='Source evidence does not match the submitted product URL.';
  end if;
  product_name:=nullif(btrim(evidence->>'product_name'),'');
  if product_name is null or coalesce(length(product_name),0)>250 then
   raise exception using errcode='23514',message='No trustworthy product title was extracted.';
  end if;
  -- Worker must prove recognizable whole-name identity, not substring Wuri/Wurist.
  if coalesce((evidence->>'title_matches')::boolean,false) is not true then
   raise exception using errcode='23514',message='Product title did not independently match the entered coffee name.';
  end if;
  official_release:=nullif(btrim(evidence->>'release_label'),'');
  if declared_release is not null and official_release is not null
     and private.dic_coffee_key(declared_release) is distinct from private.dic_coffee_key(official_release) then
   raise exception using errcode='23514',message='Release labels conflict.';
  end if;
  if coalesce((evidence->>'contradictory_facts')::boolean,false) then
   raise exception using errcode='23514',message='Source fact conflict requires human review.';
  end if;
 end if;
 -- Protect against two users simultaneously submitting the same product.
 locked_key:=brandkey||':'||namekey;
 perform pg_advisory_xact_lock(hashtextextended(locked_key,9460));
 select count(*),min(c.id::text)::uuid into same_url_count,same_url from public.coffees c
 where c.verification_state='verified' and c.merged_into_id is null
  and private.dic_canonical_roaster_key(c.roaster)=brandkey
  and private.dic_coffee_key(c.name)=namekey
  -- Recycled product URLs cannot silently collapse separate unknown harvests.
  and declared_release is not null
  and private.dic_coffee_key(c.release_label)=private.dic_coffee_key(declared_release)
  and (nullif(btrim(raw->>'origin'),'') is null or c.origin is null
       or private.dic_coffee_key(c.origin)=private.dic_coffee_key(raw->>'origin'))
  and (nullif(btrim(raw->>'process'),'') is null or c.process is null
       or private.dic_coffee_key(c.process)=private.dic_coffee_key(raw->>'process'))
  and s.source_url is not null
  and exists(select 1 from public.coffee_sources src where src.coffee_id=c.id
    and src.source_kind='roaster_page'
    and private.dic_source_key(src.source_url)=private.dic_source_key(s.source_url))
;
 if same_url_count=1 and same_url is not null then
  return private.dic_link_pending_coffee(sid,same_url,'canonical_reused',
   jsonb_build_object('method',method,'source',coalesce(evidence->>'checked_url',s.source_url)));
 end if;
 select count(*) into existing_count from public.coffees c
 where c.verification_state='verified' and c.merged_into_id is null
   and private.dic_canonical_roaster_key(c.roaster)=brandkey
   and (
     private.dic_coffee_key(c.name)=namekey
     or extensions.similarity(private.dic_coffee_key(c.name),namekey)>=0.63
   )
   and (private.dic_coffee_key(c.release_label) is null
     or private.dic_coffee_key(declared_release) is null
     or private.dic_coffee_key(c.release_label)=private.dic_coffee_key(declared_release));
 if existing_count>0 and (method='official_verified' or not distinct_confirmed) then
  insert into private.dic_coffee_audit(submission_id,actor_id,event_kind,evidence)
    values(sid,auth.uid(),'needs_review',
      jsonb_build_object('reason','potential_existing_release','method',method));
  return jsonb_build_object('ok',false,'code','needs_confirmation','status','pending');
 end if;
 insert into public.coffees(name,roaster,release_label,origin,elevation_m,roast_level,process,variety,
                            producer,tasting_notes,summary,espresso_notes,roaster_recipe,
                            verification_state,created_at)
 values(btrim(raw->>'name'),roaster_text,declared_release,nullif(btrim(raw->>'origin'),''),
   nullif(btrim(raw->>'elevation_m'),''),
   case when raw->>'roast_level'='Light-Medium' then 'Medium-Light'
    when raw->>'roast_level' in ('Ultra Light','Very Light','Light','Medium-Light','Medium','Medium-Dark','Dark') then raw->>'roast_level'
    else null end,
   nullif(btrim(raw->>'process'),''),nullif(btrim(raw->>'variety'),''),nullif(btrim(raw->>'producer'),''),
   nullif(btrim(raw->>'tasting_notes'),''),nullif(btrim(raw->>'summary'),''),nullif(btrim(raw->>'espressoNotes'),''),
   case when jsonb_typeof(raw->'roaster_recipe')='object' then raw->'roaster_recipe' else null end,
   'verified',s.created_at)
 returning * into new_c;
 cid:=new_c.id;
 insert into private.dic_coffee_first_entry(coffee_id,first_seen_at,first_submission_id,primary_name)
 values(cid,s.created_at,s.id,new_c.name);
 -- No source-kind claim is made from the user's URL alone.
 source_kind:=case when method='official_verified' then 'roaster_page'
                   when evidence->>'official_page_confirmed'='true' then 'roaster_page'
                   else 'label' end;
 if nullif(s.source_url,'') is not null then
  insert into public.coffee_sources(coffee_id,source_url,source_kind,field_values,evidence_excerpt,checked_at)
   values(cid,s.source_url,source_kind,
     case when jsonb_typeof(evidence->'verified_fields')='object' then evidence->'verified_fields'
          else '{}'::jsonb end,
     left(coalesce(evidence->>'evidence_excerpt',
       case when source_kind='label' then 'Source URL supplied by administrator; product page not independently verified.' else 'Official roaster product evidence checked.' end),12000),
     now());
 end if;
 update public.coffee_submissions set status='approved',canonical_coffee_id=cid where id=sid;
 update public.library_entries set coffee_id=cid,submission_id=null
 where owner_id=s.owner_id and submission_id=sid;
 if not found then raise exception using errcode='23514',message='Original personal library entry was not preserved.';end if;
 insert into private.dic_coffee_audit(coffee_id,submission_id,actor_id,event_kind,evidence)
 values(cid,sid,auth.uid(),method,coalesce(evidence,'{}'::jsonb));
 return jsonb_build_object('ok',true,'status','verified','coffee_id',cid,'canonical_name',new_c.name,
    'reused',false);
end $function$;


create or replace function private.dic_admin_coffee_candidates(p_submission_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $dic$
declare s public.coffee_submissions;
begin
 perform private.require_member();
 if (select auth.uid()) is null or not private.is_admin() then
   raise exception using errcode='42501',message='Administrator required.';
 end if;
 select * into s from public.coffee_submissions where id=p_submission_id and status in ('pending','conflict');
 if not found then raise exception using errcode='22023',message='Pending submission unavailable.'; end if;
 return jsonb_build_object('candidates',coalesce((
   select jsonb_agg(row_data order by cname, cid)
   from (
     select c.id as cid,c.name as cname,
       jsonb_build_object('id',c.id,'name',c.name,'roaster',c.roaster,
         'release_label',c.release_label,'origin',c.origin,'process',c.process) as row_data
     from public.coffees c
     where c.verification_state='verified' and c.merged_into_id is null
       and private.dic_canonical_roaster_key(c.roaster)=private.dic_canonical_roaster_key(s.proposed_data->>'roaster')
       and (private.dic_coffee_key(c.name)=private.dic_coffee_key(s.proposed_data->>'name')
          or extensions.similarity(private.dic_coffee_key(c.name),
                 private.dic_coffee_key(s.proposed_data->>'name'))>=0.63)
       and (c.release_label is null or nullif(s.proposed_data->>'release_label','') is null
         or private.dic_coffee_key(c.release_label)=private.dic_coffee_key(s.proposed_data->>'release_label'))
       and (c.origin is null or nullif(s.proposed_data->>'origin','') is null
         or private.dic_coffee_key(c.origin)=private.dic_coffee_key(s.proposed_data->>'origin'))
       and (c.process is null or nullif(s.proposed_data->>'process','') is null
         or private.dic_coffee_key(c.process)=private.dic_coffee_key(s.proposed_data->>'process'))
     order by c.name,c.id limit 25
   ) candidates
 ),'[]'::jsonb));
end $dic$;

create or replace function public.dic_admin_coffee_candidates(p_submission_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $dic$
 select private.dic_admin_coffee_candidates(p_submission_id);
$dic$;

create or replace function private.dic_admin_review_coffee(
  p_submission_id uuid,p_expected_revision bigint,p_action text,p_reason text,p_canonical_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $dic$
declare s public.coffee_submissions; target public.coffees; result jsonb; actor uuid; reason_text text;
begin
 actor:=private.require_member();
 if actor is null or not private.is_admin() then
   raise exception using errcode='42501',message='Administrator required.';
 end if;
 reason_text:=nullif(btrim(coalesce(p_reason,'')),'');
 if reason_text is null or length(reason_text)<8 or length(reason_text)>1000 then
   raise exception using errcode='22023',message='A specific review reason (8–1000 characters) is required.';
 end if;
 if p_action not in ('approve','merge','hold') then
   raise exception using errcode='22023',message='Unsupported review action.';
 end if;
 select * into s from public.coffee_submissions where id=p_submission_id for update;
 if not found or s.status not in ('pending','conflict') then
   raise exception using errcode='23514',message='Submission is no longer pending.';
 end if;
 if s.revision is distinct from p_expected_revision then
   raise exception using errcode='40001',message='Submission changed. Refresh before reviewing.';
 end if;
 if p_action='approve' then
   if p_canonical_id is not null then raise exception using errcode='22023',message='Approve cannot take a merge target.';end if;
   result:=private.dic_promote_pending_coffee(s.id,'admin_reviewed',
     jsonb_build_object('reason',reason_text,'verification_method','manual_administrator'),true);
   if coalesce((result->>'ok')::boolean,false) is not true then
     return result; -- unresolved near-match stays Pending, no false approval audit
   end if;
 elsif p_action='merge' then
   if p_canonical_id is null then raise exception using errcode='22023',message='Choose a verified canonical coffee.';end if;
   select * into target from public.coffees where id=p_canonical_id
     and verification_state='verified' and merged_into_id is null;
   if not found or private.dic_canonical_roaster_key(target.roaster)
     is distinct from private.dic_canonical_roaster_key(s.proposed_data->>'roaster')
     or not (private.dic_coffee_key(target.name)=private.dic_coffee_key(s.proposed_data->>'name')
       or extensions.similarity(private.dic_coffee_key(target.name),
                 private.dic_coffee_key(s.proposed_data->>'name'))>=0.63)
     or (target.release_label is not null and nullif(s.proposed_data->>'release_label','') is not null
       and private.dic_coffee_key(target.release_label) is distinct from private.dic_coffee_key(s.proposed_data->>'release_label'))
     or (target.origin is not null and nullif(s.proposed_data->>'origin','') is not null
       and private.dic_coffee_key(target.origin) is distinct from private.dic_coffee_key(s.proposed_data->>'origin'))
     or (target.process is not null and nullif(s.proposed_data->>'process','') is not null
       and private.dic_coffee_key(target.process) is distinct from private.dic_coffee_key(s.proposed_data->>'process')) then
     raise exception using errcode='23514',message='That canonical coffee is not a safe duplicate match.';
   end if;
   result:=private.dic_link_pending_coffee(s.id,target.id,'admin_reviewed_merge',
      jsonb_build_object('reason',reason_text,'verification_method','manual_administrator'));
 else
   if p_canonical_id is not null then raise exception using errcode='22023',message='Hold cannot take a merge target.';end if;
   update public.coffee_submissions set status='conflict' where id=s.id;
   result:=jsonb_build_object('ok',true,'status','conflict');
 end if;
 insert into public.admin_reviews(submission_id,reviewer_id,action,reason,evidence)
 values(s.id,actor,p_action,reason_text,jsonb_build_object('method','manual_administrator',
   'expected_revision',p_expected_revision,'canonical_id',p_canonical_id));
 return result;
end $dic$;

create or replace function public.dic_admin_review_coffee(
  p_submission_id uuid,p_expected_revision bigint,p_action text,p_reason text,p_canonical_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $dic$
 select private.dic_admin_review_coffee(p_submission_id,p_expected_revision,p_action,p_reason,p_canonical_id);
$dic$;

-- Explicit privileges: private implementations are not Data API endpoints.
revoke all on function private.dic_admin_coffee_candidates(uuid) from public,anon,authenticated;
revoke all on function private.dic_admin_review_coffee(uuid,bigint,text,text,uuid) from public,anon,authenticated;
-- Public SQL-invoker wrappers need authenticated role EXECUTE on their
-- private definer implementations; both check live membership and admin status.
-- Private schema is not exposed by PostgREST, and anon remains denied.
grant execute on function private.dic_admin_coffee_candidates(uuid) to authenticated;
grant execute on function private.dic_admin_review_coffee(uuid,bigint,text,text,uuid) to authenticated;
revoke all on function public.dic_admin_coffee_candidates(uuid) from public,anon,authenticated;
revoke all on function public.dic_admin_review_coffee(uuid,bigint,text,text,uuid) from public,anon,authenticated;
grant execute on function public.dic_admin_coffee_candidates(uuid) to authenticated;
grant execute on function public.dic_admin_review_coffee(uuid,bigint,text,text,uuid) to authenticated;

-- Existing dashboard read RPC intentionally remains review_only=true as its DTO
-- remains read-only. Review mutations go only through the distinct audited RPC.
