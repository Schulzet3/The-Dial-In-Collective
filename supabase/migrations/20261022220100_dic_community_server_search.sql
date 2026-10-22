-- Issue #80 — admitted-member-only server-side Community search. Forward-only; never overwrite old browse function.
-- Text is a bounded literal substring (no LIKE wildcard semantics), page sorted by observed_on,id.
create or replace function public.dic_search_community_shots(
 p_query text default '',p_style text default 'all',p_limit integer default 20,p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare entries jsonb; total_count integer; member_id uuid; q text;
begin
 member_id:=private.require_member();
 if p_limit is null or p_limit not between 1 and 40 or
    p_offset is null or p_offset not between 0 and 2000 then
   raise exception using errcode='22023',
    message='Community page size or offset is invalid.';
 end if;
 if p_query is null or length(p_query)>80 or p_style is null or length(p_style)>40 then
  raise exception using errcode='22023',message='Community search parameters are invalid.';
 end if;
 q:=lower(btrim(p_query));
 select count(*)::integer into total_count
 from public.community_shots cs
 join public.coffees coffee on coffee.id=cs.coffee_id
 where cs.quality_state='eligible' and coffee.verification_state='verified'
  and (p_style='all' or cs.style=p_style)
  and (q='' or strpos(lower(concat_ws(' ',coffee.name,coffee.roaster,coffee.release_label,coffee.origin,coffee.process,coffee.producer,coffee.variety,coffee.roast_level)),q)>0);

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
  and (p_style='all' or cs.style=p_style)
  and (q='' or strpos(lower(concat_ws(' ',coffee.name,coffee.roaster,coffee.release_label,coffee.origin,coffee.process,coffee.producer,coffee.variety,coffee.roast_level)),q)>0)
  order by cs.observed_on desc,cs.id desc
  limit p_limit offset p_offset
 ) page;
 return jsonb_build_object('shots',entries,'total',total_count,
    'offset',p_offset,'page_size',p_limit);
end $$;
revoke all on function public.dic_search_community_shots(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.dic_search_community_shots(text,text,integer,integer) to authenticated;
comment on function public.dic_search_community_shots(text,text,integer,integer) is 'Admitted-member-only verified eligible Community rows; searchable across public coffee and release facts with stable paging and no private identifiers.';
