-- COFFEE-DUPLICATE-FIRST-20261021 (owner Locked), DEVELOPMENT ONLY.
-- Applies AFTER 20261021053500_dic_admin_coffee_review.sql.
-- One new auto approval category; retain all historical event kinds unchanged.
-- No historical Pending rows, shots, or source evidence are rewritten.
alter table private.dic_coffee_audit drop constraint dic_coffee_audit_event_kind_check;
alter table private.dic_coffee_audit add constraint dic_coffee_audit_event_kind_check
check (event_kind in ('admin_approved','official_verified','user_confirmed',
'canonical_reused','needs_review','owner_roast_reclassified',
'admin_reviewed','admin_reviewed_merge','member_auto_approved'));

create or replace function private.dic_find_coffee_matches(p jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 requested_roaster text; requested_name text; requested_release text; requested_origin text;
 search_roaster text; search_name text; search_release text; search_source text;
 registered_name text; registered boolean; candidates jsonb; exact_id uuid; exact_count int;
begin
 if not private.is_member() or auth.uid() is null then
  raise exception using errcode='42501',message='Admitted account required.';
 end if;
 if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>16000
    or coalesce(length(btrim(p->>'roaster')),0) not between 2 and 200
    or coalesce(length(btrim(p->>'name')),0) not between 1 and 200
    or length(coalesce(p->>'release_label',''))>200
    or length(coalesce(p->>'source_url',''))>4000 then
  raise exception using errcode='22023',message='Invalid coffee match request.';
 end if;
 requested_roaster:=btrim(p->>'roaster');requested_name:=btrim(p->>'name');
 requested_release:=nullif(btrim(coalesce(p->>'release_label','')),'');
 requested_origin:=nullif(btrim(coalesce(p->>'origin','')),'');
 search_roaster:=private.dic_canonical_roaster_key(requested_roaster);
 search_name:=private.dic_coffee_key(requested_name);
 search_release:=private.dic_coffee_key(requested_release);
 search_source:=private.dic_source_key(p->>'source_url');
 if search_roaster is null or search_name is null then
  return jsonb_build_object('classification','new_pending','roaster',jsonb_build_object('recognized',false,'canonical_name',requested_roaster),'exact_id',null,'candidates','[]'::jsonb);
 end if;
 select d.canonical_name into registered_name
 from private.dic_roaster_directory d where d.canonical_key=search_roaster;
 registered:=registered_name is not null;

 with candidates_scanned as (
  select c.id,c.name,c.roaster,c.release_label,c.origin,c.process,c.verification_state,
         private.dic_canonical_roaster_key(c.roaster) as brand_key,
         private.dic_coffee_key(c.name) as title_key,
         private.dic_coffee_key(c.release_label) as release_key,
         extensions.similarity(private.dic_canonical_roaster_key(c.roaster),search_roaster) as brand_similarity,
         extensions.similarity(private.dic_coffee_key(c.name),search_name) as title_similarity,
         exists(
           select 1 from public.coffee_sources src
           where src.coffee_id=c.id and src.source_kind='roaster_page'
             and search_source is not null
             and src.checked_at>=now()-interval '120 days'
             and private.dic_source_key(src.source_url)=search_source
         ) as curated_url_match
  from public.coffees c where c.verification_state='verified' and c.merged_into_id is null
 ), assessed as (
   select s.*,
     (s.brand_key=search_roaster) as exact_brand,
     (s.title_key=search_name) as exact_title,
     (requested_origin is null or s.origin is null
       or private.dic_coffee_key(requested_origin)=private.dic_coffee_key(s.origin)) as compatible_origin
   from candidates_scanned s
   where (s.brand_key=search_roaster or s.brand_similarity>=0.70)
     and (s.title_key=search_name or s.title_similarity>=0.43)
 ), ranked as (
  select s.*,
    case
      when s.exact_brand and s.exact_title and s.curated_url_match
        and search_release is not null and s.release_key=search_release
        and s.compatible_origin then 'official_url'
      when s.exact_brand and s.exact_title and search_release is not null
        and s.release_key=search_release and s.compatible_origin
        and (nullif(btrim(coalesce(p->>'process','')),'') is null
          or s.process is null
          or private.dic_coffee_key(p->>'process')=private.dic_coffee_key(s.process))
        then 'exact_release'
      when s.exact_brand and s.exact_title then 'same_name'
      when s.exact_brand then 'similar_name'
      else 'similar_roaster'
    end as match_kind
  from assessed s
 ), prioritized as (
  select r.*, case r.match_kind
    when 'official_url' then 5 when 'exact_release' then 4
    when 'same_name' then 3 when 'similar_name' then 2 else 1 end as rank
  from ranked r
 )
 select
  (select jsonb_agg(jsonb_build_object(
      'id',q.id, 'name',q.name,'roaster',q.roaster,'release_label',q.release_label,
      'origin',q.origin,'match_kind',q.match_kind
    ) order by q.rank desc, q.title_similarity desc, q.name, q.id)
   from (select * from prioritized order by rank desc,title_similarity desc,name,id limit 6) q),
  (select count(*) from prioritized where rank>=4),
  (select id from prioritized where rank>=4 order by rank desc,id limit 1)
 into candidates,exact_count,exact_id;
 if exact_count<>1 then exact_id:=null; end if;
 return jsonb_build_object(
   'classification',case when exact_id is not null then 'exact_verified'
                    when coalesce(jsonb_array_length(candidates),0)>0 then 'needs_confirmation'
                    else 'new_pending' end,
   'roaster',jsonb_build_object('recognized',registered,
                   'canonical_name',coalesce(registered_name,requested_roaster)),
   'exact_id',exact_id,
   'candidates',coalesce(candidates,'[]'::jsonb)
 );
end $$;

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
 if method not in ('admin_approved','official_verified','admin_reviewed','member_auto_approved') then
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
 if method='member_auto_approved' and
    ((select auth.uid()) is null or not private.is_member() or auth.uid() is distinct from s.owner_id) then
  raise exception using errcode='42501',message='Admitted submission owner required for automatic approval.';
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

 -- A later member cannot leapfrog an unresolved older same-identity Pending
 -- submission and manufacture another canonical ID. Keep the older entry
 -- for the ordinary signed-in retry path; never disclose its private owner.
 if method='member_auto_approved' and exists (
  select 1 from public.coffee_submissions prev
  where prev.id<>s.id and prev.canonical_coffee_id is null
    and prev.status in ('pending','conflict')
    and (prev.created_at,prev.id)<(s.created_at,s.id)
    and private.dic_canonical_roaster_key(prev.proposed_data->>'roaster')=brandkey
    and (private.dic_coffee_key(prev.proposed_data->>'name')=namekey
      or extensions.similarity(private.dic_coffee_key(prev.proposed_data->>'name'),namekey)>=0.63)
    and (nullif(btrim(prev.proposed_data->>'release_label'),'') is null
      or declared_release is null
      or private.dic_coffee_key(prev.proposed_data->>'release_label')
        =private.dic_coffee_key(declared_release))
 ) then
  insert into private.dic_coffee_audit(submission_id,actor_id,event_kind,evidence)
  values(sid,auth.uid(),'needs_review',
   jsonb_build_object('reason','older_unresolved_pending_identity','method',method));
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
                   else 'label' end;
 if nullif(s.source_url,'') is not null then
  insert into public.coffee_sources(coffee_id,source_url,source_kind,field_values,evidence_excerpt,checked_at)
   values(cid,s.source_url,source_kind,
     case when jsonb_typeof(evidence->'verified_fields')='object' then evidence->'verified_fields'
          else '{}'::jsonb end,
     left(coalesce(evidence->>'evidence_excerpt',
       case when source_kind='label' then 'Member-supplied source URL; product page not independently verified.' else 'Official roaster product evidence checked.' end),12000),
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

create or replace function private.dic_submit_coffee_auto(mid uuid,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_member(); prior private.mutation_receipts;
 req_hash text; proposal jsonb; source text; lid uuid; sid uuid; match_result jsonb;
 exact uuid; existing uuid; response jsonb; managed_name text;
begin
 if mid is null or jsonb_typeof(p) is distinct from 'object'
 or octet_length(p::text)>32000 or jsonb_typeof(p->'proposed_data') is distinct from 'object'
 or coalesce(length(btrim(p->'proposed_data'->>'name')),0) not between 1 and 200
 or coalesce(length(btrim(p->'proposed_data'->>'roaster')),0) not between 2 and 200 then
  raise exception using errcode='22023',message='Coffee name and roaster are required.';
 end if;
 source:=nullif(btrim(p->>'source_url'),'');
 if source is not null and (length(source)>4000 or source !~ '^https?://') then
  raise exception using errcode='22023',message='Provide a valid product URL.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,9311));
 req_hash:=encode(sha256(convert_to(jsonb_build_object('action','submit_coffee','payload',p)::text,'UTF8')),'hex');
 select * into prior from private.mutation_receipts where owner_id=u and mutation_id=mid;
 if found then
  if prior.request_hash<>req_hash then raise exception using errcode='22023',message='Mutation ID reused for different changes.';end if;
  return prior.response;
 end if;
 proposal:=p->'proposed_data';
 match_result:=private.dic_find_coffee_matches(proposal||jsonb_build_object('source_url',source));
 if match_result->>'classification'='exact_verified' then
  exact:=(match_result->>'exact_id')::uuid;
  select id into existing from public.library_entries where owner_id=u and coffee_id=exact and hidden_at is null order by created_at limit 1;
  if existing is null then
   lid:=coalesce((p->>'library_entry_id')::uuid,gen_random_uuid());
   insert into public.library_entries(id,owner_id,coffee_id) values(lid,u,exact);
  else lid:=existing; end if;
  response:=jsonb_build_object('ok',true,'status','verified','coffee_id',exact,'library_entry_id',lid,'reused',true);
 else
  lid:=coalesce((p->>'library_entry_id')::uuid,gen_random_uuid());
  managed_name:=nullif(match_result->'roaster'->>'canonical_name','');
  if coalesce((match_result->'roaster'->>'recognized')::boolean,false) and managed_name is not null
      and managed_name<>proposal->>'roaster' then
   proposal:=jsonb_set(proposal,'{roaster_as_entered}',to_jsonb(proposal->>'roaster'),true);
   proposal:=jsonb_set(proposal,'{roaster}',to_jsonb(managed_name),true);
  end if;
  insert into public.coffee_submissions(owner_id,proposed_data,source_url,created_at) values(u,proposal,source,clock_timestamp())
   returning id into sid;
  insert into public.library_entries(id,owner_id,submission_id) values(lid,u,sid);
  response:=jsonb_build_object('ok',true,'status','pending','library_entry_id',lid,
    'submission_id',sid,'source_check_recommended',
      (source is not null and coalesce((match_result->'roaster'->>'recognized')::boolean,false)));
  if match_result->>'classification'='needs_confirmation' then
   -- User confirmed_distinct never bypasses server duplicate gates.
   response:=response||jsonb_build_object('possible_duplicate',true,
     'candidates',match_result->'candidates');
  else
   response:=response||private.dic_promote_pending_coffee(sid,'member_auto_approved',
    jsonb_build_object('approval_basis','no_unresolved_duplicate',
      'source_assurance','member_supplied_unverified'),false);
  end if;
 end if;
 insert into private.mutation_receipts(owner_id,mutation_id,request_hash,response)
 values(u,mid,req_hash,response);
 return response;
end $$;
revoke all on function private.dic_submit_coffee_auto(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.dic_submit_coffee_auto(uuid,jsonb) to authenticated;

-- Only the real signed-in owner of the old Pending may retry,
-- e.g. previously saved Wuri; Mango remains Pending until owner acts.
create function private.dic_member_retry_pending_approval(
 p_submission_id uuid,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $dic$
declare actor uuid; s public.coffee_submissions; candidates jsonb;
begin
 actor:=private.require_member();
 if actor is null or p_submission_id is null or p_expected_revision is null then
  raise exception using errcode='42501',message='Signed-in member and exact Pending record required.';
 end if;
 select * into s from public.coffee_submissions where id=p_submission_id for update;
 if not found or s.owner_id is distinct from actor then
  raise exception using errcode='42501',message='Only the submission owner may retry approval.';
 end if;
 if s.revision is distinct from p_expected_revision then
  raise exception using errcode='40001',message='Submission changed; refresh before retry.';
 end if;
 if s.status in ('approved','merged') and s.canonical_coffee_id is not null then
  return jsonb_build_object('ok',true,'status','verified','coffee_id',s.canonical_coffee_id,'already_verified',true);
 end if;
 if s.status not in ('pending','conflict') or s.canonical_coffee_id is not null then
  raise exception using errcode='23514',message='Only an unresolved new coffee may be retried.';
 end if;
 candidates:=private.dic_find_coffee_matches(s.proposed_data||jsonb_build_object('source_url',s.source_url));
 if candidates->>'classification'='needs_confirmation' then
  return jsonb_build_object('ok',false,'code','needs_confirmation','status','pending',
    'candidates',coalesce(candidates->'candidates','[]'::jsonb));
 end if;
 if candidates->>'classification'='exact_verified' then
  return private.dic_link_pending_coffee(s.id,(candidates->>'exact_id')::uuid,'canonical_reused',
   jsonb_build_object('method','member_auto_approved','source_assurance','member_supplied_unverified'));
 end if;
 return private.dic_promote_pending_coffee(s.id,'member_auto_approved',
   jsonb_build_object('approval_basis','member_retry_distinct',
    'source_assurance','member_supplied_unverified'),false);
end $dic$;

create function public.dic_member_retry_pending_approval(
 p_submission_id uuid,p_expected_revision bigint)
returns jsonb language sql security invoker set search_path='' as $dic$
 select private.dic_member_retry_pending_approval(p_submission_id,p_expected_revision);
$dic$;

-- private schema is not a Data API surface; public wrapper checked server-side.
revoke all on function private.dic_member_retry_pending_approval(uuid,bigint) from public,anon,authenticated;
grant execute on function private.dic_member_retry_pending_approval(uuid,bigint) to authenticated;
revoke all on function public.dic_member_retry_pending_approval(uuid,bigint) from public,anon,authenticated;
grant execute on function public.dic_member_retry_pending_approval(uuid,bigint) to authenticated;
