-- ROAST-TAXONOMY-20261016-01: nonbreaking first phase before a new frontend release.
-- Extend the catalog CHECK to seven owner-approved Title Case categories.
-- Retain old Light-Medium TEMPORARILY for the existing Yirgacheffe row while
-- the published five-tier app remains active. No existing coffee rows change.
-- Historic closed imports retain their original evidence. Only the trusted
-- pending-coffee promotion function accepts and canonicalizes the new labels.
-- Separate controlled actions must publish the seven-tier app BEFORE updating
-- existing coffee values; do not deploy this migration as a release by itself.

alter table public.coffees
 drop constraint if exists coffees_roast_level_check;
alter table public.coffees
 add constraint coffees_roast_level_check
 check (roast_level in ('Ultra Light','Very Light','Light','Medium-Light',
                       'Medium','Medium-Dark','Dark','Light-Medium'));

-- Preserve every privilege, isolation check and release/identity validation
-- from the live function; change only the single roast whitelist expression.
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
 if method not in ('admin_approved','official_verified') then
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
end $function$
