-- DIC Community canonical-release grouping, approved FOR SOURCE PREPARATION ONLY.
-- Generated with the official Supabase CLI migration new command in isolated
-- GitHub Actions run 39171647492; no hosted schema change has occurred.
-- Apply to hosted Supabase only after separate explicit owner approval,
-- with read-only baseline snapshot, safety checks and postflight verification.
--
-- This additive replacement of the EXISTING admitted-member-gated read-only
-- function provides a stable opaque SHA-256 release key derived from the
-- canonical verified coffee UUID and six already-verifiable catalog facts.
-- It does NOT disclose the raw coffee/member/contributor/shot UUID,
-- source URLs, personal notes, equipment or user-specific data.
-- A recorded shot date is not a coffee release date. No release_date is added.
-- Keeps the same quality=eligible/verification=verified filters,
-- per-exact-release+style evidence counts and bounded pagination.
-- revoke/grant intentionally matches the preexisting authenticated-only
-- access: membership remains checked by private.require_member() on every call.
create or replace function public.dic_browse_community_shots(
 p_limit integer default 20,p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare entries jsonb; total_count integer; member_id uuid;
begin
 member_id:=private.require_member();
 if p_limit is null or p_limit not between 1 and 40 or
    p_offset is null or p_offset not between 0 and 2000 then
   raise exception using errcode='22023',
    message='Community page size or offset is invalid.';
 end if;
 select count(*)::integer into total_count
 from public.community_shots cs
 join public.coffees coffee on coffee.id=cs.coffee_id
 where cs.quality_state='eligible' and coffee.verification_state='verified';

 select coalesce(jsonb_agg(jsonb_build_object(
   'coffee_name',page.coffee_name,'roaster',page.roaster,
   'release_key',page.release_key,'release_label',page.release_label,
   'release_origin',page.release_origin,'release_process',page.release_process,
   'release_producer',page.release_producer,'release_variety',page.release_variety,
   'release_roast_level',page.release_roast_level,
   'style',page.style,'observed_on',page.observed_on,
   'dose_g',page.dose_g,'yield_g',page.yield_g,
   'ratio',page.ratio,'time_s',page.time_s,
   'extraction',page.extraction,'body',page.body,
   'clarity',page.clarity,'sweetness',page.sweetness,
   'astringency',page.astringency,
   'shot_count',page.shot_count,
   'contributor_count',page.contributor_count
 ) order by page.observed_on desc,page.sort_id desc),'[]'::jsonb)
 into entries from (
  select cs.id as sort_id,cs.observed_on,cs.style,cs.dose_g,
    cs.yield_g,cs.ratio,cs.time_s,cs.extraction,cs.body,
    cs.clarity,cs.sweetness,cs.astringency,
    coffee.name as coffee_name,coffee.roaster,
    encode(sha256(convert_to(coffee.id::text,'UTF8')),'hex') as release_key,
    nullif(btrim(coffee.release_label),'') as release_label,
    nullif(btrim(coffee.origin),'') as release_origin,
    nullif(btrim(coffee.process),'') as release_process,
    nullif(btrim(coffee.producer),'') as release_producer,
    nullif(btrim(coffee.variety),'') as release_variety,
    nullif(btrim(coffee.roast_level),'') as release_roast_level,
    (select count(*)::integer from public.community_shots sibling
      join public.coffees canon on canon.id=sibling.coffee_id
      where sibling.coffee_id=cs.coffee_id and sibling.style=cs.style
        and sibling.quality_state='eligible'
        and canon.verification_state='verified') as shot_count,
    (select count(distinct link.contributor_id)::integer
      from public.community_shots sibling
      join private.contribution_links link on link.community_shot_id=sibling.id
      where sibling.coffee_id=cs.coffee_id and sibling.style=cs.style
        and sibling.quality_state='eligible') as contributor_count
  from public.community_shots cs
  join public.coffees coffee on coffee.id=cs.coffee_id
  where cs.quality_state='eligible' and coffee.verification_state='verified'
  order by cs.observed_on desc,cs.id desc
  limit p_limit offset p_offset
 ) page;
 return jsonb_build_object('shots',entries,'total',total_count,
    'offset',p_offset,'page_size',p_limit);
end $$;
-- The historical function is intentionally SECURITY DEFINER; require_member()
-- runs before the query. Explicitly deny PUBLIC/anon and allow authenticated.
revoke all on function public.dic_browse_community_shots(integer,integer)
 from public,anon,authenticated;
grant execute on function public.dic_browse_community_shots(integer,integer)
 to authenticated;
comment on function public.dic_browse_community_shots(integer,integer) is
 'Admitted-member-only quality-eligible Community observations, stable opaque verified-release group key, trusted public release facts and exact release/style evidence counts; no private identifiers or notes.';
