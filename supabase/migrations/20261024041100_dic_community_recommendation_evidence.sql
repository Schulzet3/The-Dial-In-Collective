-- Issue #12: contributor-balanced Community priors supported by real owner
-- family provenance where available. This migration is unpublished; replace
-- its source before first production application, not an already-applied SQL
-- history entry. No member record, shot, projection or family ID is changed.
-- A confirmed *personal* family is distinct evidence, but matching ratio
-- regions across different people are still estimates, not verified shared
-- identities. Preserve detached anonymous contributions as observed evidence.
create or replace function public.dic_community_recommendation_evidence(
 p_library_entry_id uuid,p_style text
) returns jsonb language plpgsql stable security definer set search_path='' as $dic$
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
   -- Only a server-maintained, eligible repeated-success *personal* family
   -- qualifies. Do not infer a family from shot values or trust client labels.
   case when pf.evidence_state='personally_confirmed'
       and s.is_dialed_in and s.personal_family_id=pf.id
       and s.style=cs.style and s.library_entry_id=pf.library_entry_id
       then pf.id else null end as confirmed_personal_family_id,
   floor(cs.ratio/0.25)::integer as observed_bucket,
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
  join private.contributors contributor on contributor.id=cl.contributor_id
  left join public.shots s on s.id=cl.shot_id and s.owner_id=contributor.owner_id
      and s.style=cs.style and s.personal_family_id is not null
  left join public.personal_recipe_families pf on pf.id=s.personal_family_id
      and pf.owner_id=s.owner_id and pf.library_entry_id=s.library_entry_id
      and pf.style=s.style
  where cs.style=p_style and cs.quality_state='eligible' and c.verification_state='verified'
    and c.merged_into_id is null and cs.ratio between 0.5 and 8 and cs.time_s between 1 and 180
    -- A user's own Community projection must never reinforce their personal
    -- evidence as if it came from another independent contributor.
    and contributor.owner_id is distinct from me
 ), member_groups as (
  select tier,coffee_id,contributor_id,ratio,time_s,
    confirmed_personal_family_id is not null as confirmed,
    case when confirmed_personal_family_id is not null
      then 'family:'||confirmed_personal_family_id::text
      else 'observation:'||observed_bucket::text end as member_group
  from matching where tier in (3,4,6)
 ), member_centers as (
  -- Preserve a real person's repeatedly successful family even if its shots
  -- straddle two arbitrary 0.25 bucket edges.
  select tier,coffee_id,contributor_id,member_group,
    bool_or(confirmed) as personally_confirmed,
    count(*)::integer as shot_count,
    percentile_cont(0.5) within group(order by ratio)::numeric as ratio_center,
    percentile_cont(0.5) within group(order by time_s)::numeric as time_center
  from member_groups
  group by tier,coffee_id,contributor_id,member_group
 ), member_buckets as (
  -- One observation per independent person per estimated Community ratio
  -- region; multiple shots or personal families from one member cannot
  -- multiply that person's influence.
  select tier,coffee_id,contributor_id,
    floor(ratio_center/0.25)::integer as ratio_group,
    sum(shot_count)::integer as shot_count,
    count(*) filter(where personally_confirmed)::integer as confirmed_family_count,
    percentile_cont(0.5) within group(order by ratio_center)::numeric as ratio_center,
    percentile_cont(0.5) within group(order by time_center)::numeric as time_center
  from member_centers
  group by tier,coffee_id,contributor_id,floor(ratio_center/0.25)::integer
 ), ranked as (
  select tier,coffee_id,ratio_group,
    count(*)::integer as contributor_count,
    sum(shot_count)::integer as shot_count,
    sum(confirmed_family_count)::integer as confirmed_personal_family_count,
    count(*) filter(where confirmed_family_count>0)::integer as confirmed_family_contributors,
    percentile_cont(0.5) within group(order by ratio_center)::numeric as ratio_center,
    percentile_cont(0.5) within group(order by time_center)::numeric as time_center
  from member_buckets
  group by tier,coffee_id,ratio_group
 )
 select coalesce(jsonb_agg(jsonb_build_object(
   'tier',case tier when 3 then 'exact' when 4 then 'related_release' else 'similar_coffee' end,
   'style',p_style,'ratio',round(ratio_center,3),'time_s',round(time_center,2),
   'shot_count',shot_count,'contributor_count',contributor_count,
   'confirmed_personal_family_count',confirmed_personal_family_count,
   'confirmed_family_contributors',confirmed_family_contributors,
   'distinct_family_basis',case when confirmed_personal_family_count>0
      then 'confirmed_personal_families_in_observed_ratio_group'
      else 'ratio_bucket_observed' end,
   'community_group_identity_verified',false,
   'source','eligible_verified_community','calibrated_grind',false
 ) order by tier,contributor_count desc,shot_count desc,ratio_center,coffee_id)
 , '[]'::jsonb) into result
 from (select * from ranked order by tier,contributor_count desc,shot_count desc,ratio_center,coffee_id
 limit 30) x;
 return jsonb_build_object('style',p_style,'candidates',result);
end $dic$;
revoke all on function public.dic_community_recommendation_evidence(uuid,text)
 from public,anon,authenticated;
grant execute on function public.dic_community_recommendation_evidence(uuid,text)
 to authenticated;
comment on function public.dic_community_recommendation_evidence(uuid,text)
 is 'Member-only independently contributor-balanced Community starting priors. Server-confirmed personal family contributions remain distinct; cross-member ratio group identity is estimated. No contributor IDs, grinder settings, or notes.';
