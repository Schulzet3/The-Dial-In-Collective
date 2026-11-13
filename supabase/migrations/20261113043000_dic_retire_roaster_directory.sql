-- #2389 owner directive: retire approved-roaster directory from ALL active
-- source/identity/preview dependencies. STAGE ONLY: separate Publish and
-- verified encrypted backup required for hosted schema changes.
-- Archive, never delete, original four trust records and four alias records.
begin;
create table private.dic_roaster_name_aliases(
 alias_key text primary key check(alias_key~'^[a-z0-9]{3,}$'),
 canonical_key text not null check(canonical_key~'^[a-z0-9]{3,}$'),
 evidence_url text not null check(evidence_url~'^https://'),
 created_at timestamptz not null
);
alter table private.dic_roaster_name_aliases enable row level security;
revoke all on private.dic_roaster_name_aliases from public,anon,authenticated;
grant all on private.dic_roaster_name_aliases to service_role;
create policy no_client_access on private.dic_roaster_name_aliases
 for all to anon,authenticated using(false) with check(false);
insert into private.dic_roaster_name_aliases(alias_key,canonical_key,evidence_url,created_at)
select a.alias_key,d.canonical_key,a.evidence_url,a.created_at
 from private.dic_roaster_aliases a join private.dic_roaster_directory d on d.id=a.roaster_id
on conflict(alias_key) do nothing;

CREATE OR REPLACE FUNCTION private.dic_canonical_roaster_key(value text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 with input as (select private.dic_roaster_key(value) as key)
 select coalesce(
   (select a.canonical_key from private.dic_roaster_name_aliases a
      join input i on i.key=a.alias_key limit 1),
   (select key from input)
 );
$function$
;
-- Only previously verified *coffee/product* page evidence may authorize
-- high-trust global promotion. No fixed domain/roaster eligibility list.
create or replace function private.dic_verified_roaster_page_proof(roaster_name text)
returns jsonb language plpgsql stable security definer set search_path='' as $proof$
declare host_count integer; official_host text; canonical_name text;
begin
 with official_pages as (
  select distinct c.roaster as source_roaster,
   lower(regexp_replace(split_part(s.source_url,'/',3),'^www\.','','i')) as source_host
  from public.coffees c join public.coffee_sources s on s.coffee_id=c.id
  where c.verification_state='verified' and c.merged_into_id is null
   and s.source_kind='roaster_page' and s.checked_at>=now()-interval '120 days'
   and s.source_url ~* '^https://(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(/|$)'
   and private.dic_canonical_roaster_key(c.roaster)=private.dic_canonical_roaster_key(roaster_name)
 )
 select count(distinct source_host),min(source_host),min(source_roaster)
 into host_count,official_host,canonical_name from official_pages;
 if host_count<>1 or official_host is null then return null; end if;
 return jsonb_build_object('official_domain',official_host,'canonical_name',canonical_name);
end $proof$;
revoke all on function private.dic_verified_roaster_page_proof(text) from public,anon,authenticated;
grant execute on function private.dic_verified_roaster_page_proof(text) to service_role;

CREATE OR REPLACE FUNCTION private.dic_find_coffee_matches(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 select c.roaster into registered_name
 from public.coffees c where c.verification_state='verified' and c.merged_into_id is null
   and private.dic_canonical_roaster_key(c.roaster)=search_roaster
 order by c.created_at,c.id limit 1;
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
     -- Explicitly different nonempty harvest/lot labels are different
     -- releases, not fuzzy duplicates. Missing labels remain ambiguous.
     and (search_release is null or s.release_key is null
       or s.release_key=search_release)
 ), ranked as (
  select s.*,
    case
      when s.exact_brand and s.exact_title and s.curated_url_match
        and search_release is not null and s.release_key=search_release
        and s.compatible_origin
        and (nullif(btrim(coalesce(p->>'process','')),'') is null
          or s.process is null
          or private.dic_coffee_key(p->>'process')=private.dic_coffee_key(s.process))
        then 'official_url'
      when s.exact_brand and s.exact_title and search_release is not null
        and s.release_key=search_release and s.compatible_origin
        and (nullif(btrim(coalesce(p->>'process','')),'') is null
          or s.process is null
          or private.dic_coffee_key(p->>'process')=private.dic_coffee_key(s.process))
        -- Official source URLs take priority; an exact-release label with
        -- a different existing verified product URL is not sufficient.
        and (search_source is null or s.curated_url_match or
          not exists(select 1 from public.coffee_sources src
           where src.coffee_id=s.id and src.source_kind='roaster_page'))
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
end $function$
;
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
   and (current_setting('role',true) is distinct from 'service_role'
     or coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',
             nullif(current_setting('request.jwt.claim.role',true),'')) is distinct from 'service_role') then
  raise exception using errcode='42501',message='Only the trusted source verifier may approve external evidence.';
 end if;
 if jsonb_typeof(evidence) is distinct from 'object' or octet_length(evidence::text)>10000 then
  raise exception using errcode='22023',message='Invalid evidence payload.';
 end if;
 select * into s from public.coffee_submissions where id=sid for update;
 if not found then raise exception using errcode='22023',message='Coffee submission unavailable.';end if;
 if method='official_verified' then
  perform 1 from private.beta_members where owner_id=s.owner_id and enabled for share;
  if not found then
   raise exception using errcode='42501',message='Admitted submission owner required for official verification.';
  end if;
 end if;
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
 if method='official_verified' and evidence->>'submission_revision' is distinct from s.revision::text then
  raise exception using errcode='40001',message='Submission changed before source verification; refresh and retry.';
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
 select proof->>'canonical_name',proof->>'official_domain'
 into known_name,official_host
 from (select private.dic_verified_roaster_page_proof(raw->>'roaster') as proof) p;
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
 if existing_count>0 and (method in ('official_verified','member_auto_approved') or not distinct_confirmed) then
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
     case when method='official_verified' and jsonb_typeof(evidence->'verified_fields')='object' then evidence->'verified_fields'
          else '{}'::jsonb end,
     left(case when method='official_verified' then
       coalesce(evidence->>'evidence_excerpt','Official roaster product evidence checked.')
     else 'Member-supplied source URL; product page not independently verified.' end,12000),
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
;
CREATE OR REPLACE FUNCTION public.dic_source_check_target(submission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.coffee_submissions; host text; cname text;
begin
 if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',
             nullif(current_setting('request.jwt.claim.role',true),'')) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Trusted source worker required.';
 end if;
 select * into s from public.coffee_submissions
 where id=submission_id and status in ('pending','conflict');
 if not found then return null; end if;
 if not exists(select 1 from private.beta_members where owner_id=s.owner_id and enabled) then
  return null;
 end if;
 select proof->>'official_domain',proof->>'canonical_name'
 into host,cname
 from (select private.dic_verified_roaster_page_proof(s.proposed_data->>'roaster') as proof) p;
 if host is null or s.source_url is null then return null; end if;
 return jsonb_build_object('submission_id',s.id,'submission_revision',s.revision,'source_url',s.source_url,
  'official_host',host,'roaster',cname,'name',s.proposed_data->>'name',
  'release_label',s.proposed_data->>'release_label',
  'origin',s.proposed_data->>'origin','process',s.proposed_data->>'process','producer',s.proposed_data->>'producer');
end $function$
;

-- The old Edge endpoint is NOT invoked by current Add Coffee.
drop function if exists public.dic_roaster_preview_target(text);
-- Preserve inaccessible historical records, but remove old relation names.
alter table private.dic_roaster_aliases rename to dic_roaster_alias_provenance_archive;
alter table private.dic_roaster_directory rename to dic_roaster_identity_provenance_archive;
comment on table private.dic_roaster_identity_provenance_archive is 'Historical evidence only. NOT queried to grant URL access or global Verified coffee status.';
comment on table private.dic_roaster_alias_provenance_archive is 'Preserved historical alias records. The new protected alias map supplies identity normalization.';
commit;
