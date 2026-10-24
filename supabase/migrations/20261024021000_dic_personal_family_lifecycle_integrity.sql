-- Issue #10: correction-safe personal recipe family lifecycle.
-- Source-only migration. Apply only as part of a separately authorized release.
-- No new UI, no rewriting of history, no changes to the 0.25 ratio heuristic.
create or replace function private.refresh_personal_family(fid uuid)
returns void language plpgsql security definer set search_path='' as $dic$
declare
 n integer; rlo numeric; rhi numeric; rc numeric;
 tlo numeric; thi numeric; tc numeric; data jsonb;
 same_ratio_variation boolean;
begin
 select count(*) into n from public.shots where personal_family_id=fid and is_dialed_in and hidden_at is null;
 if n=0 then
  update public.personal_recipe_families
   set statistics='{"count":0}'::jsonb,evidence_state='retired' where id=fid;
  return;
 end if;
 select
  case when n>=12 then percentile_cont(.1) within group(order by ratio) else min(ratio) end,
  case when n>=12 then percentile_cont(.9) within group(order by ratio) else max(ratio) end,
  case when n>=12 then percentile_cont(.1) within group(order by time_s) else min(time_s) end,
  case when n>=12 then percentile_cont(.9) within group(order by time_s) else max(time_s) end
 into rlo,rhi,tlo,thi
 from public.shots where personal_family_id=fid and is_dialed_in and hidden_at is null;
 select avg(ratio) filter(where n<12 or ratio between rlo and rhi),
        avg(time_s) filter(where n<12 or time_s between tlo and thi)
 into rc,tc
 from public.shots where personal_family_id=fid and is_dialed_in and hidden_at is null;
 select count(distinct ratio)=1 and
   (count(distinct time_s)>1 or count(distinct coalesce(temperature_c,-999))>1)
 into same_ratio_variation
 from public.shots where personal_family_id=fid and is_dialed_in and hidden_at is null;
 data:=jsonb_build_object(
  'count',n,
  'ratio',jsonb_build_object('low',rlo,'high',rhi,'center',rc),
  'time',jsonb_build_object('low',tlo,'high',thi,'center',tc),
  'rangeMethod',case when n>=12 then 'p10_p90' else 'observed' end,
  'evidenceScope','ratio_only',
  'sameRatioNonRatioVariation',coalesce(same_ratio_variation,false),
  'nonRatioSignificance',case when same_ratio_variation then 'unproven' else 'not_indicated' end
 );
 update public.personal_recipe_families
  set statistics=data,evidence_state=case when n>=2 then 'personally_confirmed' else 'candidate' end
  where id=fid;
end $dic$;

create or replace function private.classify_personal_shot(shotid uuid)
returns void language plpgsql security definer set search_path='' as $dic$
declare s public.shots; fid uuid; previous uuid;
begin
 select * into strict s from public.shots where id=shotid;
 previous:=s.personal_family_id;
 -- Only an eligible green, visible shot can remain an explicit saved favorite.
 -- The stored shot ID is never redirected to another shot.
 if s.hidden_at is not null or not s.is_dialed_in then
  update public.recipe_preferences p set favorite_shot_id=null
   where p.owner_id=s.owner_id and p.favorite_shot_id=s.id;
 end if;
 if s.hidden_at is not null then
  if previous is not null then perform private.refresh_personal_family(previous); end if;
 else
  if s.is_dialed_in then
   select f.id into fid from public.personal_recipe_families f
    where f.owner_id=s.owner_id and f.library_entry_id=s.library_entry_id
     and f.style=s.style and f.evidence_state<>'retired'
     and abs(coalesce((f.statistics->'ratio'->>'center')::numeric,s.ratio)-s.ratio)<=.25
    order by abs(coalesce((f.statistics->'ratio'->>'center')::numeric,s.ratio)-s.ratio),f.created_at,f.id
    limit 1;
   if fid is null then
    insert into public.personal_recipe_families(owner_id,library_entry_id,style,statistics,estimator_version)
     values(s.owner_id,s.library_entry_id,s.style,
       jsonb_build_object('count',0,'ratio',jsonb_build_object('center',s.ratio)),
       'ratio_cluster_v1') returning id into fid;
   end if;
  end if;
  if s.personal_family_id is distinct from fid then
   update public.shots set personal_family_id=fid where id=shotid;
  end if;
  if previous is not null then perform private.refresh_personal_family(previous); end if;
  if fid is not null then
   perform private.refresh_personal_family(fid);
   insert into public.recipe_preferences(owner_id,setup_id,setup_version_id,library_entry_id,style,current_family_id)
    values(s.owner_id,s.setup_id,s.setup_version_id,s.library_entry_id,s.style,fid)
    on conflict(owner_id,setup_id,setup_version_id,library_entry_id,style)
    do update set current_family_id=coalesce(public.recipe_preferences.current_family_id,excluded.current_family_id);
   -- A manually selected example that is corrected into another eligible
   -- family remains the same deliberately selected example, not an auto choice.
   update public.recipe_preferences p set current_family_id=fid
    where p.owner_id=s.owner_id and p.favorite_shot_id=s.id
     and p.setup_version_id=s.setup_version_id
     and p.library_entry_id=s.library_entry_id and p.style=s.style
     and p.current_family_id is distinct from fid;
  end if;
 end if;
 -- Retire unsupported Current only after family refresh.
 update public.recipe_preferences p set current_family_id=null
  where p.owner_id=s.owner_id and p.library_entry_id=s.library_entry_id
   and p.current_family_id is not null and not exists(
    select 1 from public.shots x
     where x.owner_id=p.owner_id and x.setup_version_id=p.setup_version_id
      and x.library_entry_id=p.library_entry_id and x.style=p.style
      and x.personal_family_id=p.current_family_id and x.is_dialed_in
      and x.hidden_at is null);
end $dic$;
revoke all on function private.classify_personal_shot(uuid),private.refresh_personal_family(uuid)
 from public,anon,authenticated;
comment on function private.classify_personal_shot(uuid) is
 'Owner-scoped green/visible ratio-family assignment. Preserves an explicit favorite through corrections, clears invalid favorites; original shots and notes stay intact.';
comment on function private.refresh_personal_family(uuid) is
 'Candidate after one success, personally_confirmed after repeated success, retired after no visible green success; nonratio variation is unproven, not a new family threshold.';
