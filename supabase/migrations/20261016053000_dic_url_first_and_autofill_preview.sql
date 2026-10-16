-- Staged URL-first evidence ranking; a URL is not the canonical Coffee UUID.
-- Reused links, conflicting titles/releases and ambiguous candidates need review.
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
  from public.coffees c where c.verification_state='verified'
 ), assessed as (
   select s.*,
     (s.brand_key=search_roaster) as exact_brand,
     (s.title_key=search_name) as exact_title,
     (requested_origin is null or s.origin is null
       or private.dic_coffee_key(requested_origin)=private.dic_coffee_key(s.origin)) as compatible_origin
   from candidates_scanned s
   where s.curated_url_match
     or ((s.brand_key=search_roaster or s.brand_similarity>=0.70)
     and (s.title_key=search_name or s.title_similarity>=0.43))
 ), ranked as (
  select s.*,
    case
      when s.exact_brand and s.exact_title and s.curated_url_match
        and ( (search_release is null and s.release_key is null)
          or (search_release is not null and s.release_key=search_release) )
        and s.compatible_origin then 'official_url'
      when s.curated_url_match then 'official_url_review'
      when registered and s.exact_brand and s.exact_title and search_release is not null
        and s.release_key=search_release and search_source is null
        and s.compatible_origin then 'exact_release'
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
declare actual text; found private.dic_roaster_directory;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Trusted preview worker only.';
 end if;
 actual:=lower(btrim(coalesce(host,'')));
 if length(actual)>253 or actual !~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$' then return null; end if;
 select * into found from private.dic_roaster_directory
 where official_domain=actual order by verified_at desc limit 1;
 if not found then return null; end if;
 return jsonb_build_object('canonical_name',found.canonical_name,
  'official_domain',found.official_domain);
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
