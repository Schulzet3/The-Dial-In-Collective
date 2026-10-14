-- Conservative coffee identity: brand aliases help FIND candidates; only
-- source-backed, unique, verified COFFEE/RELEASE evidence may auto-link.
-- No user submissions, shots, library rows or coffee verification states touched.
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create function private.dic_roaster_key(value text) returns text
language sql stable set search_path='' as $$
 select nullif(regexp_replace(
  regexp_replace(lower(extensions.unaccent(coalesce(value,''))), '[^a-z0-9]', '', 'g'),
  '(coffeeroasters|coffeeroaster|coffeeroastery|coffeecompany|coffeeco|roasters|roaster|roastery|coffee)$',
  ''
 ), '');
$$;
create function private.dic_coffee_key(value text) returns text
language sql stable set search_path='' as $$
 select nullif(regexp_replace(lower(extensions.unaccent(coalesce(value,''))), '[^a-z0-9]', '', 'g'),'');
$$;

-- Registry entries are curated and source-backed, not user-self-certified.
-- A roaster identity never implies that ALL products by that roaster are verified.
create table private.dic_roaster_directory (
 id uuid primary key default gen_random_uuid(),
 canonical_name text not null check (length(btrim(canonical_name)) between 2 and 200),
 canonical_key text not null unique check (canonical_key ~ '^[a-z0-9]{3,}$'),
 official_domain text not null check (official_domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
 evidence_url text not null check (evidence_url ~ '^https://'),
 verified_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create table private.dic_roaster_aliases (
 alias_key text primary key check(alias_key ~ '^[a-z0-9]{3,}$'),
 roaster_id uuid not null references private.dic_roaster_directory(id) on delete cascade,
 evidence_url text not null check(evidence_url ~ '^https://'),
 created_at timestamptz not null default now()
);
alter table private.dic_roaster_directory enable row level security;
alter table private.dic_roaster_aliases enable row level security;
revoke all on private.dic_roaster_directory, private.dic_roaster_aliases from public, anon, authenticated;
grant all on private.dic_roaster_directory, private.dic_roaster_aliases to service_role;
create policy no_client_access on private.dic_roaster_directory for all to anon,authenticated using(false) with check(false);
create policy no_client_access on private.dic_roaster_aliases for all to anon,authenticated using(false) with check(false);

-- Official roaster identity documented on https://sweetbloomcoffee.com/
-- and /pages/locations. This seed verifies the BRAND, not any coffee release.
insert into private.dic_roaster_directory(canonical_name,canonical_key,official_domain,evidence_url)
values ('Sweet Bloom','sweetbloom','sweetbloomcoffee.com','https://sweetbloomcoffee.com/pages/locations')
on conflict(canonical_key) do nothing;

create function private.dic_canonical_roaster_key(value text) returns text
language sql stable security definer set search_path='' as $$
 with input as (select private.dic_roaster_key(value) as key)
 select coalesce(
   (select d.canonical_key from private.dic_roaster_directory d join input i on i.key=d.canonical_key limit 1),
   (select d.canonical_key from private.dic_roaster_aliases a
      join private.dic_roaster_directory d on d.id=a.roaster_id
      join input i on i.key=a.alias_key limit 1),
   (select key from input)
 );
$$;

-- No external HTTP request, DNS or URL content inspection here. Remove only
-- explicitly irrelevant tracking parameters; preserve every product variant key.
create function private.dic_source_key(value text) returns text
language plpgsql stable set search_path='' as $$
declare raw text; path text; params text; fragment text; kept text:=''; part text;
begin
 raw:=btrim(coalesce(value,''));
 if raw !~* '^https?://[^/?#[:space:]]+' or length(raw)>4000 then return null; end if;
 raw:=split_part(raw,'#',1);
 raw:=regexp_replace(raw,'^https?://(www\.)?','','i');
 path:=split_part(raw,'?',1);
 if path='' then return null; end if;
 params:=case when strpos(raw,'?')>0 then substring(raw from strpos(raw,'?')+1) else '' end;
 if params<>'' then
  foreach part in array string_to_array(params,'&') loop
   if split_part(lower(part),'=',1)!~'^utm_' and lower(split_part(part,'=',1)) not in ('gclid','fbclid','msclkid') and part<>'' then
    kept:=concat_ws('&',nullif(kept,''),part);
   end if;
  end loop;
 end if;
 return lower(rtrim(path,'/'))||case when kept<>'' then '?'||kept else '' end;
end $$;

create function private.dic_find_coffee_matches(p jsonb) returns jsonb
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

 with similar as (
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
   from similar s
   where (s.brand_key=search_roaster or s.brand_similarity>=0.70)
     and (s.title_key=search_name or s.title_similarity>=0.43)
 ), ranked as (
  select s.*,
    case
      when s.exact_brand and s.exact_title and s.curated_url_match
        and (search_release is null or (s.release_key is not null and s.release_key=search_release))
        and s.compatible_origin then 'official_url'
      when s.exact_brand and s.exact_title and search_release is not null
        and s.release_key=search_release and search_source is null
        and s.compatible_origin then 'exact_release'
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
revoke all on function private.dic_roaster_key(text),private.dic_coffee_key(text),private.dic_source_key(text),
 private.dic_canonical_roaster_key(text),private.dic_find_coffee_matches(jsonb) from public,anon,authenticated;
grant execute on function private.dic_find_coffee_matches(jsonb) to authenticated;
create function public.dic_find_coffee_matches(payload jsonb) returns jsonb
language sql stable security invoker set search_path='' as $$
 select private.dic_find_coffee_matches(payload);
$$;
revoke all on function public.dic_find_coffee_matches(jsonb) from public,anon,authenticated;
grant execute on function public.dic_find_coffee_matches(jsonb) to authenticated;
comment on function public.dic_find_coffee_matches(jsonb) is
 'Private-beta coffee identity candidate lookup only; does not auto-verify unknown coffee releases or mutate submissions.';
