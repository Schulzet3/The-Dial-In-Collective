-- Issue #509 R335: stored canonical-coffee aliases support suggestions AND explicit confirmation.
-- DEVELOPMENT ONLY. Older migrations immutable; live production unchanged until owner Publish.
-- Based on live private.dic_find_coffee_matches MD5 b4b845d29ccb65ac7922109dc89816b6
-- and live private.dic_confirm_coffee_existing MD5 0fcc44bb8a05f46e87694d3474eb7c23.
-- Alias alone may generate only a same-roaster, compatible-origin suggestion;
-- NEVER exact_verified or automatic canonical reuse. Explicit owner confirmation
-- independently checks recorded alias, with all original member, receipt, release,
-- origin, ownership and private-library protections. Existing alias PK index suffices.

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
           select 1 from private.dic_coffee_aliases a
           where a.coffee_id=c.id and a.alias_key=search_name
         ) as recorded_alias_match,
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
     and (s.title_key=search_name or s.title_similarity>=0.43
       or (s.recorded_alias_match and s.brand_key=search_roaster
         and (requested_origin is null or s.origin is null
           or private.dic_coffee_key(requested_origin)=private.dic_coffee_key(s.origin))))
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

CREATE OR REPLACE FUNCTION private.dic_confirm_coffee_existing(mid uuid, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 u uuid:=private.require_member(); prior private.mutation_receipts; s public.coffee_submissions;
 target public.coffees; sid uuid; cid uuid; match_result jsonb; accepted boolean;
 req_hash text; response jsonb; a_name text; b_name text;
begin
 if mid is null or jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>5000 then
  raise exception using errcode='22023',message='Invalid coffee confirmation.';
 end if;
 sid:=(p->>'submission_id')::uuid;cid:=(p->>'coffee_id')::uuid;
 perform pg_advisory_xact_lock(hashtextextended(u::text,9311));
 req_hash:=encode(sha256(convert_to(jsonb_build_object('action','confirm_coffee_existing','payload',p)::text,'UTF8')),'hex');
 select * into prior from private.mutation_receipts where owner_id=u and mutation_id=mid;
 if found then
  if prior.request_hash<>req_hash then raise exception using errcode='22023',message='Mutation ID reused for other confirmation.';end if;
  return prior.response;
 end if;
 select * into s from public.coffee_submissions where id=sid and owner_id=u for update;
 select * into target from public.coffees where id=cid and verification_state='verified' and merged_into_id is null;
 if s.id is null or target.id is null then raise exception using errcode='42501',message='Coffee is not accessible.';end if;
 if private.dic_canonical_roaster_key(s.proposed_data->>'roaster') is distinct from
   private.dic_canonical_roaster_key(target.roaster) then
   raise exception using errcode='23514',message='Different roasters cannot be merged based on a fuzzy name.';
 end if;
 a_name:=private.dic_coffee_key(s.proposed_data->>'name');
 b_name:=private.dic_coffee_key(target.name);
 if a_name is null or b_name is null
    or not (coalesce(a_name=b_name or extensions.similarity(a_name,b_name)>=0.60,false)
      or exists(
        select 1 from private.dic_coffee_aliases a
        where a.coffee_id=target.id and a.alias_key=a_name
      )) then
  raise exception using errcode='23514',message='The names are too different for self-confirmed merging.';
 end if;
 if nullif(btrim(s.proposed_data->>'release_label'),'') is not null
    and nullif(btrim(target.release_label),'') is not null
    and private.dic_coffee_key(s.proposed_data->>'release_label')<>private.dic_coffee_key(target.release_label) then
  raise exception using errcode='23514',message='Different releases require administrator review.';
 end if;
 if nullif(btrim(s.proposed_data->>'origin'),'') is not null
    and nullif(btrim(target.origin),'') is not null
    and private.dic_coffee_key(s.proposed_data->>'origin')<>private.dic_coffee_key(target.origin)
    and position(private.dic_coffee_key(s.proposed_data->>'origin') in private.dic_coffee_key(target.origin))=0
    and position(private.dic_coffee_key(target.origin) in private.dic_coffee_key(s.proposed_data->>'origin'))=0 then
  raise exception using errcode='23514',message='Conflicting origins require administrator review.';
 end if;
 response:=private.dic_link_pending_coffee(sid,cid,'user_confirmed',
  jsonb_build_object('requested_name',s.proposed_data->>'name','canonical_name',target.name));
 insert into private.mutation_receipts(owner_id,mutation_id,request_hash,response)
 values(u,mid,req_hash,response);
 return response;
end $function$;
