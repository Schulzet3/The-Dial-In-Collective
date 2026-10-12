-- Hiding personal history must not recluster a shot or change its provenance.
-- Refresh the prior family and clear only unsupported local Current references.
create or replace function private.classify_personal_shot(shotid uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.shots; fid uuid; previous uuid;
begin
 select * into strict s from public.shots where id=shotid;
 previous:=s.personal_family_id;
 if s.hidden_at is not null then
  if previous is not null then perform private.refresh_personal_family(previous); end if;
 else
  if s.is_dialed_in then
   select f.id into fid from public.personal_recipe_families f where f.owner_id=s.owner_id and f.library_entry_id=s.library_entry_id and f.style=s.style and f.evidence_state<>'retired'
    and abs(coalesce((f.statistics->'ratio'->>'center')::numeric,s.ratio)-s.ratio)<=.25
    order by abs(coalesce((f.statistics->'ratio'->>'center')::numeric,s.ratio)-s.ratio),f.created_at,f.id limit 1;
   if fid is null then
    insert into public.personal_recipe_families(owner_id,library_entry_id,style,statistics,estimator_version)
     values(s.owner_id,s.library_entry_id,s.style,jsonb_build_object('count',0,'ratio',jsonb_build_object('center',s.ratio)),'ratio_cluster_v1') returning id into fid;
   end if;
  end if;
  if s.personal_family_id is distinct from fid then update public.shots set personal_family_id=fid where id=shotid; end if;
  if previous is not null then perform private.refresh_personal_family(previous); end if;
  if fid is not null then
   perform private.refresh_personal_family(fid);
   insert into public.recipe_preferences(owner_id,setup_id,setup_version_id,library_entry_id,style,current_family_id)
    values(s.owner_id,s.setup_id,s.setup_version_id,s.library_entry_id,s.style,fid)
    on conflict(owner_id,setup_id,setup_version_id,library_entry_id,style)
    do update set current_family_id=coalesce(public.recipe_preferences.current_family_id,excluded.current_family_id);
  end if;
 end if;
 update public.recipe_preferences p set current_family_id=null where p.owner_id=s.owner_id and p.library_entry_id=s.library_entry_id
  and p.current_family_id is not null and not exists(select 1 from public.shots x where x.owner_id=p.owner_id and x.setup_version_id=p.setup_version_id and x.library_entry_id=p.library_entry_id and x.style=p.style and x.personal_family_id=p.current_family_id and x.is_dialed_in and x.hidden_at is null);
end $$;
revoke all on function private.classify_personal_shot(uuid) from public,anon,authenticated;
