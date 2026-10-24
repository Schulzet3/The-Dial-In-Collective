-- Issue #12, dependency of #10: independently contributor-balanced recommendation evidence.
-- The only input identity is the current admitted member's own library entry.
-- No contributor IDs, names, grinder settings, notes or private shots cross the API.
create or replace function public.dic_community_recommendation_evidence(
 p_library_entry_id uuid,p_style text
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid; target public.coffees; result jsonb;
begin
 me:=private.require_member();
 if p_style is null or p_style not in ('Traditional','Turbo','Ristretto','Lungo','Custom','Fast-Flow')
    then raise exception using errcode='22023',message='Unknown espresso style';end if;
 select c.* into target from public.library_entries le
 join public.coffees c on c.id=le.coffee_id
 where le.id=p_library_entry_id and le.owner_id=me and le.hidden_at is null
   and c.verification_state='verified' and c.merged_into_id is null;
 if not found then
  return jsonb_build_object('style',p_style,'candidates','[]'::jsonb);
 end if;
 with matching as (
  select cs.coffee_id,cl.contributor_id,cs.ratio,cs.time_s,
   floor(cs.ratio/0.25)::integer as ratio_family,
   case when cs.coffee_id=target.id then 3
        when lower(btrim(c.roaster))=lower(btrim(target.roaster))
          and lower(btrim(c.name))=lower(btrim(target.name))
          and nullif(btrim(c.release_label),'') is not null
          and nullif(btrim(target.release_label),'') is not null
          and c.release_label<>target.release_label then 4
        when nullif(btrim(c.roast_level),'')=nullif(btrim(target.roast_level),'')
          and (
            (nullif(btrim(c.origin),'') is not null and lower(btrim(c.origin))=lower(btrim(target.origin)))
            or
            (nullif(btrim(c.process),'') is not null and lower(btrim(c.process))=lower(btrim(target.process)))
          ) then 6
        else 99 end as tier
  from public.community_shots cs
  join public.coffees c on c.id=cs.coffee_id
  join private.contribution_links cl on cl.community_shot_id=cs.id
  where cs.style=p_style and cs.quality_state='eligible' and c.verification_state='verified'
    and c.merged_into_id is null and cs.ratio between 0.5 and 8 and cs.time_s between 1 and 180
 ), owner_centers as (
  select tier,coffee_id,contributor_id,ratio_family,count(*)::integer shot_count,
   percentile_cont(0.5) within group(order by ratio)::numeric as ratio_center,
   percentile_cont(0.5) within group(order by time_s)::numeric as time_center
  from matching where tier in (3,4,6)
  group by tier,coffee_id,contributor_id,ratio_family
 ), ranked as (
  select tier,coffee_id,ratio_family,count(*)::integer contributor_count,
   sum(shot_count)::integer shot_count,
   percentile_cont(0.5) within group(order by ratio_center)::numeric as ratio_center,
   percentile_cont(0.5) within group(order by time_center)::numeric as time_center
  from owner_centers
  group by tier,coffee_id,ratio_family
 )
 select coalesce(jsonb_agg(jsonb_build_object(
   'tier',case tier when 3 then 'exact' when 4 then 'related_release' else 'similar_coffee' end,
   'style',p_style,'ratio',round(ratio_center,3),'time_s',round(time_center,2),
   'shot_count',shot_count,'contributor_count',contributor_count,
   'distinct_family_basis','ratio_bucket_observed',
   'source','eligible_verified_community',
   'calibrated_grind',false
 ) order by tier,contributor_count desc,shot_count desc,ratio_center,coffee_id)
 , '[]'::jsonb) into result
 from (select * from ranked order by tier,contributor_count desc,shot_count desc,ratio_center,coffee_id
 limit 30) x;
 return jsonb_build_object('style',p_style,'candidates',result);
end $$;
revoke all on function public.dic_community_recommendation_evidence(uuid,text)
 from public,anon,authenticated;
grant execute on function public.dic_community_recommendation_evidence(uuid,text)
 to authenticated;
comment on function public.dic_community_recommendation_evidence(uuid,text)
 is 'Admitted-member-only anonymous and contributor-balanced same-style recommendation starting priors. No private contributor or grinder identifiers; do not equate ratio bucket with personally confirmed family.';
