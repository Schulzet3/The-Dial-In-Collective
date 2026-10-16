-- Staged URL-first evidence ranking; a URL is not the canonical Coffee UUID.
-- Reused links, missing release evidence, conflicting titles/processes and ambiguous candidates need review.
-- A URL with unknown release may be the same product, but cannot auto-link.
create or replace function private.dic_find_coffee_matches(p jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 requested_roaster text; requested_name text; requested_release text; requested_origin text; requested_process text;
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
 requested_process:=nullif(btrim(coalesce(p->>'process','')),'');
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
  from public.coffees c where c.verification_state='verified'
 ), assessed as (
   select s.*,
     (s.brand_key=search_roaster) as exact_brand,
     (s.title_key=search_name) as exact_title,
     (requested_origin is null or s.origin is null
       or private.dic_coffee_key(requested_origin)=private.dic_coffee_key(s.origin)) as compatible_origin,
     (requested_process is null or s.process is null or
       private.dic_coffee_key(requested_process)=private.dic_coffee_key(s.process)) as compatible_process
   from candidates_scanned s
   where s.curated_url_match
     or ((s.brand_key=search_roaster or s.brand_similarity>=0.70)
     and (s.title_key=search_name or s.title_similarity>=0.43))
 ), ranked as (
  select s.*,
    case
      when s.exact_brand and s.exact_title and s.curated_url_match
        and search_release is not null and s.release_key=search_release
        and s.compatible_origin and s.compatible_process then 'official_url'
      when s.curated_url_match then 'official_url_review'
      when registered and s.exact_brand and s.exact_title and search_release is not null
        and s.release_key=search_release and search_source is null
        and s.compatible_origin and s.compatible_process then 'exact_release'
      when s.exact_brand and s.exact_title then 'same_name'
      when s.exact_brand then 'similar_name'
      else 'similar_roaster'
    end as match_kind
  from assessed s
 ), prioritized as (
  select r.*, case r.match_kind
    when 'official_url' then 6 when 'official_url_review' then 5
    when 'exact_release' then 4 when 'same_name' then 3
    when 'similar_name' then 2 else 1 end as rank
  from ranked r
 )
 select
  (select jsonb_agg(jsonb_build_object(
      'id',q.id, 'name',q.name,'roaster',q.roaster,'release_label',q.release_label,
      'origin',q.origin,'match_kind',q.match_kind
    ) order by q.rank desc, q.title_similarity desc, q.name, q.id)
   from (select * from prioritized order by rank desc,title_similarity desc,name,id limit 6) q),
  (select count(*) from prioritized where match_kind in ('official_url','exact_release')),
  (select id from prioritized where match_kind in ('official_url','exact_release') order by rank desc,id limit 1)
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

create or replace function public.dic_roaster_preview_target(host text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actual text; roaster_row private.dic_roaster_directory;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Trusted preview worker only.';
 end if;
 actual:=lower(btrim(coalesce(host,'')));
 if length(actual)>253 or actual !~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$' then return null; end if;
 select * into roaster_row from private.dic_roaster_directory
 where official_domain=actual order by verified_at desc limit 1;
 if not found then return null; end if;
 return jsonb_build_object('canonical_name',roaster_row.canonical_name,
  'official_domain',roaster_row.official_domain);
end $$;
revoke all on function public.dic_roaster_preview_target(text) from public,anon,authenticated;
grant execute on function public.dic_roaster_preview_target(text) to service_role;

create table private.dic_url_preview_attempts(
 owner_id uuid primary key references auth.users(id) on delete cascade,
 window_started_at timestamptz not null default now(),
 last_attempt_at timestamptz not null default now(),
 attempts integer not null default 0 check(attempts between 0 and 25)
);
alter table private.dic_url_preview_attempts enable row level security;
revoke all on private.dic_url_preview_attempts from public,anon,authenticated;
grant all on private.dic_url_preview_attempts to service_role;
create policy no_client_access on private.dic_url_preview_attempts
 for all to anon,authenticated using(false) with check(false);

create or replace function public.dic_url_preview_claim(account_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec private.dic_url_preview_attempts; clock timestamptz:=now();
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Trusted preview worker only.';
 end if;
 if account_id is null or not exists(select 1 from auth.users u where u.id=account_id)
 then return jsonb_build_object('allowed',false,'reason','unknown_account');end if;
 insert into private.dic_url_preview_attempts(owner_id,window_started_at,last_attempt_at,attempts)
 values(account_id,clock,clock-interval '1 minute',0)
 on conflict(owner_id) do nothing;
 select * into rec from private.dic_url_preview_attempts where owner_id=account_id for update;
 if rec.window_started_at<clock-interval '24 hours' then
  update private.dic_url_preview_attempts set window_started_at=clock,
   last_attempt_at=clock,attempts=1 where owner_id=account_id;
  return jsonb_build_object('allowed',true);
 end if;
 if rec.attempts>=25 then return jsonb_build_object('allowed',false,'reason','daily_preview_limit'); end if;
 if rec.last_attempt_at>clock-interval '12 seconds'
 then return jsonb_build_object('allowed',false,'reason','preview_cooldown'); end if;
 update private.dic_url_preview_attempts set attempts=rec.attempts+1,last_attempt_at=clock
 where owner_id=account_id;
 return jsonb_build_object('allowed',true);
end $$;
revoke all on function public.dic_url_preview_claim(uuid) from public,anon,authenticated;
grant execute on function public.dic_url_preview_claim(uuid) to service_role;
comment on function public.dic_url_preview_claim(uuid) is
 'Service-only HTTP preview quota: 25/day/user, at least 12 seconds apart; no URLs stored.';

-- Verification must honor the same URL+release identity safety as lookups.
-- This replaces only an unsafe legacy auto-link shortcut; role checks, retries,
-- audits, immutable ownership and all existing admin verification remain intact.
create or replace function private.dic_promote_pending_coffee(sid uuid,method text,evidence jsonb default '{}'::jsonb,distinct_confirmed boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
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
   case when raw->>'roast_level' in ('Light','Light-Medium','Medium','Medium-Dark','Dark') then raw->>'roast_level' else null end,
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
end $$;

