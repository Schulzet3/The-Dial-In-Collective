-- Owner-Locked UX-ADMIN-LOW-FRICTION-REVIEW-20261021.
-- Source-only, NOT APPLIED to hosted DB. Existing role, revision, audit and wrapper grants retained.
create or replace function private.dic_admin_review_coffee(
  p_submission_id uuid,p_expected_revision bigint,p_action text,p_reason text,p_canonical_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $dic$
declare s public.coffee_submissions; target public.coffees; result jsonb; actor uuid; reason_text text;
begin
 actor:=private.require_member();
 if actor is null or not private.is_admin() then
   raise exception using errcode='42501',message='Administrator required.';
 end if;
 reason_text:=nullif(btrim(coalesce(p_reason,'')),'');
 -- An explicit one-click Approve Distinct decision has a generated audit reason.
 if p_action='approve' and reason_text is null then
   reason_text:='Administrator approved distinct coffee';
 end if;
 if reason_text is null or length(reason_text)<8 or length(reason_text)>1000 then
   raise exception using errcode='22023',message='A specific review reason (8–1000 characters) is required.';
 end if;
 if p_action not in ('approve','merge','hold') then
   raise exception using errcode='22023',message='Unsupported review action.';
 end if;
 select * into s from public.coffee_submissions where id=p_submission_id for update;
 if not found or s.status not in ('pending','conflict') then
   raise exception using errcode='23514',message='Submission is no longer pending.';
 end if;
 if s.revision is distinct from p_expected_revision then
   raise exception using errcode='40001',message='Submission changed. Refresh before reviewing.';
 end if;
 if p_action='approve' then
   if p_canonical_id is not null then raise exception using errcode='22023',message='Approve cannot take a merge target.';end if;
   result:=private.dic_promote_pending_coffee(s.id,'admin_reviewed',
     jsonb_build_object('reason',reason_text,'verification_method','manual_administrator'),true);
   if coalesce((result->>'ok')::boolean,false) is not true then
     return result; -- unresolved near-match stays Pending, no false approval audit
   end if;
 elsif p_action='merge' then
   if p_canonical_id is null then raise exception using errcode='22023',message='Choose a verified canonical coffee.';end if;
   select * into target from public.coffees where id=p_canonical_id
     and verification_state='verified' and merged_into_id is null;
   if not found or private.dic_canonical_roaster_key(target.roaster)
     is distinct from private.dic_canonical_roaster_key(s.proposed_data->>'roaster')
     or not (private.dic_coffee_key(target.name)=private.dic_coffee_key(s.proposed_data->>'name')
       or extensions.similarity(private.dic_coffee_key(target.name),
                 private.dic_coffee_key(s.proposed_data->>'name'))>=0.63)
     or (target.release_label is not null and nullif(s.proposed_data->>'release_label','') is not null
       and private.dic_coffee_key(target.release_label) is distinct from private.dic_coffee_key(s.proposed_data->>'release_label'))
     or (target.origin is not null and nullif(s.proposed_data->>'origin','') is not null
       and private.dic_coffee_key(target.origin) is distinct from private.dic_coffee_key(s.proposed_data->>'origin'))
     or (target.process is not null and nullif(s.proposed_data->>'process','') is not null
       and private.dic_coffee_key(target.process) is distinct from private.dic_coffee_key(s.proposed_data->>'process')) then
     raise exception using errcode='23514',message='That canonical coffee is not a safe duplicate match.';
   end if;
   result:=private.dic_link_pending_coffee(s.id,target.id,'admin_reviewed_merge',
      jsonb_build_object('reason',reason_text,'verification_method','manual_administrator'));
 else
   if p_canonical_id is not null then raise exception using errcode='22023',message='Hold cannot take a merge target.';end if;
   update public.coffee_submissions set status='conflict' where id=s.id;
   result:=jsonb_build_object('ok',true,'status','conflict');
 end if;
 insert into public.admin_reviews(submission_id,reviewer_id,action,reason,evidence)
 values(s.id,actor,p_action,reason_text,jsonb_build_object('method','manual_administrator',
   'expected_revision',p_expected_revision,'canonical_id',p_canonical_id));
 return result;
end $dic$;

create or replace function private.dic_admin_edit_record(
 p_record_id uuid,p_expected_revision bigint,p_details jsonb,p_reason text,p_kind text)
returns jsonb language plpgsql security definer set search_path='' as $body$
declare actor uuid; record_owner uuid; snapshot jsonb; after_snapshot jsonb;
 revision_after bigint; oldshot public.shots; oldsub public.coffee_submissions;
 oldcoffee public.coffees; notes_before text; k text; reason_text text;
begin
 actor:=private.require_member();
 if actor is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 reason_text:=btrim(coalesce(p_reason,''));
 if p_record_id is null or p_expected_revision is null or p_kind is null or
   p_kind not in ('shot','submission','approved') or
   length(reason_text) not between 8 and 1000 or
   jsonb_typeof(p_details) is distinct from 'object' or
   octet_length(p_details::text)>30000 then
  raise exception using errcode='22023',message='Invalid correction request.';
 end if;
 if p_kind='shot' then
  if exists(select 1 from jsonb_object_keys(p_details) x where x not in
   ('dose_g','yield_g','time_s','grind_setting','temperature_c',
    'extraction','body','clarity','sweetness','astringency','notes')) then
   raise exception using errcode='22023',message='Forbidden shot correction field.';end if;
  select * into oldshot from public.shots where id=p_record_id for update;
  if not found then raise exception using errcode='22023',message='Shot unavailable.';end if;
  if oldshot.revision<>p_expected_revision then
   raise exception using errcode='40001',message='Shot changed; refresh before editing.';end if;
  record_owner:=oldshot.owner_id;
  select notes into notes_before from public.shot_notes
   where owner_id=oldshot.owner_id and shot_id=oldshot.id for update;
  snapshot:=jsonb_build_object('shot',to_jsonb(oldshot),'notes',notes_before);
  -- Omitted correction fields retain the recorded measurement. Explicit NULL
  -- still clears nullable values, subject to existing shot integrity checks.
  update public.shots set
   dose_g=coalesce(nullif(p_details->>'dose_g','')::numeric,oldshot.dose_g),
   yield_g=coalesce(nullif(p_details->>'yield_g','')::numeric,oldshot.yield_g),
   time_s=coalesce(nullif(p_details->>'time_s','')::numeric,oldshot.time_s),
   grind_setting=case when p_details ? 'grind_setting' then nullif(p_details->>'grind_setting','')::numeric else oldshot.grind_setting end,
   temperature_c=case when p_details ? 'temperature_c' then nullif(p_details->>'temperature_c','')::numeric else oldshot.temperature_c end,
   extraction=coalesce(nullif(p_details->>'extraction','')::smallint,oldshot.extraction),
   body=coalesce(nullif(p_details->>'body','')::smallint,oldshot.body),
   clarity=coalesce(nullif(p_details->>'clarity','')::smallint,oldshot.clarity),
   sweetness=coalesce(nullif(p_details->>'sweetness','')::smallint,oldshot.sweetness),
   astringency=coalesce(nullif(p_details->>'astringency','')::smallint,oldshot.astringency)
  where id=oldshot.id returning revision into revision_after;
  if p_details ? 'notes' then
   if length(coalesce(p_details->>'notes',''))>16000 then
    raise exception using errcode='22023',message='Notes too long.';end if;
   insert into public.shot_notes(owner_id,shot_id,notes)
    values(oldshot.owner_id,oldshot.id,coalesce(p_details->>'notes',''))
   on conflict(owner_id,shot_id) do update set notes=excluded.notes;
  end if;
  -- Match the ordinary correction path: changed observations must update the
  -- member's family statistics and clear unsupported Current references.
  perform private.classify_personal_shot(oldshot.id);
  -- Reclassification may update personal_family_id and bump revision again.
  select revision into revision_after from public.shots where id=oldshot.id;
  after_snapshot:=jsonb_build_object(
   'shot',(select to_jsonb(x) from public.shots x where x.id=oldshot.id),
   'notes',(select x.notes from public.shot_notes x where x.owner_id=oldshot.owner_id and x.shot_id=oldshot.id));
 elsif p_kind='submission' then
  if exists(select 1 from jsonb_object_keys(p_details) x where x not in
   ('name','roaster','release_label','origin','process','roast_level',
    'variety','producer','elevation_m','tasting_notes','summary','espressoNotes','source_url')) then
   raise exception using errcode='22023',message='Forbidden coffee correction field.';end if;
  select * into oldsub from public.coffee_submissions where id=p_record_id for update;
  if not found or oldsub.status not in ('pending','conflict') then
   raise exception using errcode='23514',message='Pending coffee unavailable.';end if;
  if oldsub.revision<>p_expected_revision then
   raise exception using errcode='40001',message='Coffee changed; refresh before editing.';end if;
  if length(btrim(coalesce(p_details->>'name','')))<1 or
     length(btrim(coalesce(p_details->>'roaster','')))<1 then
   raise exception using errcode='22023',message='Name and roaster required.';end if;
  if nullif(p_details->>'source_url','') is not null and
   (p_details->>'source_url') !~ '^https://[^[:space:]]+$' then
   raise exception using errcode='22023',message='HTTPS URL required.';end if;
  record_owner:=oldsub.owner_id;snapshot:=to_jsonb(oldsub);
  update public.coffee_submissions set
   proposed_data=oldsub.proposed_data||(p_details-'source_url'),
   source_url=nullif(btrim(coalesce(p_details->>'source_url',oldsub.source_url)),'')
  where id=oldsub.id returning revision into revision_after;
  after_snapshot:=(select to_jsonb(x) from public.coffee_submissions x where x.id=oldsub.id);
 else
  if exists(select 1 from jsonb_object_keys(p_details) x where x not in
   ('name','roaster','release_label','origin','process','roast_level',
    'variety','producer','elevation_m','tasting_notes','summary','espressoNotes','source_url')) then
   raise exception using errcode='22023',message='Forbidden approved coffee correction field.';end if;
  select * into oldcoffee from public.coffees where id=p_record_id for update;
  if not found or oldcoffee.verification_state<>'verified' or oldcoffee.merged_into_id is not null then
   raise exception using errcode='23514',message='Canonical coffee unavailable.';end if;
  if oldcoffee.revision<>p_expected_revision then
   raise exception using errcode='40001',message='Coffee changed; refresh before editing.';end if;
  -- Approved canonical display identity can be corrected without changing its UUID.
  if (p_details ? 'name' and length(btrim(coalesce(p_details->>'name',''))) not between 1 and 200)
   or (p_details ? 'roaster' and length(btrim(coalesce(p_details->>'roaster',''))) not between 1 and 200)
   or (p_details ? 'release_label' and length(coalesce(p_details->>'release_label',''))>200) then
   raise exception using errcode='22023',message='Coffee name/roaster are required (max 200 characters).';
  end if;
  if (p_details ? 'name' and btrim(p_details->>'name') is distinct from oldcoffee.name)
   or (p_details ? 'roaster' and btrim(p_details->>'roaster') is distinct from oldcoffee.roaster)
   or (p_details ? 'release_label' and nullif(btrim(p_details->>'release_label'),'') is distinct from oldcoffee.release_label) then
   if exists(select 1 from public.coffees other
      where other.id<>oldcoffee.id and other.verification_state='verified'
       and other.merged_into_id is null
       and private.dic_canonical_roaster_key(other.roaster)=private.dic_canonical_roaster_key(
          case when p_details ? 'roaster' then btrim(p_details->>'roaster') else oldcoffee.roaster end)
       and (private.dic_coffee_key(other.name)=private.dic_coffee_key(
           case when p_details ? 'name' then btrim(p_details->>'name') else oldcoffee.name end)
        or extensions.similarity(private.dic_coffee_key(other.name),private.dic_coffee_key(
           case when p_details ? 'name' then btrim(p_details->>'name') else oldcoffee.name end))>=0.63)
       and (private.dic_coffee_key(other.release_label)=private.dic_coffee_key(
          case when p_details ? 'release_label' then nullif(btrim(p_details->>'release_label'),'') else oldcoffee.release_label end)
        or nullif(other.release_label,'') is null or
          nullif(case when p_details ? 'release_label' then p_details->>'release_label' else oldcoffee.release_label end,'') is null)
   ) then
     raise exception using errcode='23514',message='Possible duplicate or conflicting coffee release. Review before changing identity.';
   end if;
  end if;
  select s.owner_id into record_owner from private.dic_coffee_first_entry f
   join public.coffee_submissions s on s.id=f.first_submission_id where f.coffee_id=oldcoffee.id;
  -- Retain exact source metadata alongside the canonical facts. A URL-only
  -- correction must attribute the added evidence to this actor and revision.
  snapshot:=to_jsonb(oldcoffee)||jsonb_build_object('sources',(
   select coalesce(jsonb_agg(to_jsonb(cs) order by cs.checked_at,cs.id),'[]'::jsonb)
   from public.coffee_sources cs where cs.coffee_id=oldcoffee.id));
  -- A descriptive correction is partial: absent keys never erase other facts.
  update public.coffees set
   name=case when p_details ? 'name' then btrim(p_details->>'name') else oldcoffee.name end,
   roaster=case when p_details ? 'roaster' then btrim(p_details->>'roaster') else oldcoffee.roaster end,
   release_label=case when p_details ? 'release_label' then nullif(btrim(p_details->>'release_label'),'') else oldcoffee.release_label end,
   origin=case when p_details ? 'origin' then nullif(p_details->>'origin','') else oldcoffee.origin end,
   process=case when p_details ? 'process' then nullif(p_details->>'process','') else oldcoffee.process end,
   roast_level=case when p_details ? 'roast_level' then nullif(p_details->>'roast_level','') else oldcoffee.roast_level end,
   variety=case when p_details ? 'variety' then nullif(p_details->>'variety','') else oldcoffee.variety end,
   producer=case when p_details ? 'producer' then nullif(p_details->>'producer','') else oldcoffee.producer end,
   elevation_m=case when p_details ? 'elevation_m' then nullif(p_details->>'elevation_m','') else oldcoffee.elevation_m end,
   tasting_notes=case when p_details ? 'tasting_notes' then nullif(p_details->>'tasting_notes','') else oldcoffee.tasting_notes end,
   summary=case when p_details ? 'summary' then nullif(p_details->>'summary','') else oldcoffee.summary end,
   espresso_notes=case when p_details ? 'espressoNotes' then nullif(p_details->>'espressoNotes','') else oldcoffee.espresso_notes end
   where id=oldcoffee.id returning revision into revision_after;
  if nullif(btrim(p_details->>'source_url'),'') is not null then
   if (p_details->>'source_url') !~ '^https://[^[:space:]]+$' then
    raise exception using errcode='22023',message='HTTPS URL required.';end if;
   if not exists(select 1 from public.coffee_sources cs where cs.coffee_id=oldcoffee.id and cs.source_url=p_details->>'source_url') then
    insert into public.coffee_sources(coffee_id,source_url,source_kind,field_values,evidence_excerpt)
    values(oldcoffee.id,p_details->>'source_url','label','{}'::jsonb,'Administrator-supplied URL; not official verification.');
   end if;
  end if;
  after_snapshot:=(select to_jsonb(x) from public.coffees x where x.id=oldcoffee.id)
   ||jsonb_build_object('sources',(
    select coalesce(jsonb_agg(to_jsonb(cs) order by cs.checked_at,cs.id),'[]'::jsonb)
    from public.coffee_sources cs where cs.coffee_id=oldcoffee.id));
 end if;
 insert into private.admin_content_edits(actor_id,subject_owner_id,record_kind,record_id,
  before_revision,reason,before_values,after_values)
 values(actor,record_owner,p_kind,p_record_id,p_expected_revision,reason_text,snapshot,after_snapshot);
 return jsonb_build_object('ok',true,'revision',revision_after,'audited',true);
end $body$;
