-- Issue #180 STAGED ONLY: release approval is separately required.
-- Only new, approved source-bound coffee information is enriched.
alter table public.coffees add column if not exists is_decaf boolean not null default false;
alter table public.coffees add column if not exists decaffeination_method text;
alter table public.coffees add constraint coffee_decaffeination_method_values_check
 check (decaffeination_method is null or decaffeination_method in
 ('Water Process','Sugar Process','Carbon Dioxide (CO2)'));
alter table public.coffees add constraint coffee_decaffeination_only_when_decaf_check
 check (is_decaf or decaffeination_method is null);
-- The original, first approved submission for a newly minted canonical
-- coffee can carry this field. Never use a member's duplicate match, a
-- later correction or a different member's pending record to overwrite
-- someone else's approved catalog data.
create or replace function private.dic_capture_first_decaf_method()
returns trigger language plpgsql security definer set search_path='' as $dic$
declare decaf boolean; method text; title text;
begin
 if new.status<>'approved' or new.canonical_coffee_id is null
  or old.status='approved' then return new; end if;
 if not exists (select 1 from private.dic_coffee_first_entry first
  where first.coffee_id=new.canonical_coffee_id and first.first_submission_id=new.id)
 then return new; end if;
 select c.name into title from public.coffees c where c.id=new.canonical_coffee_id;
 decaf := (coalesce(new.proposed_data->>'is_decaf','false')='true'
   or title ~* '(^|[^[:alnum:]])decaf(feinated)?([^[:alnum:]]|$)')
   and title !~* '(^|[^[:alnum:]])(half[ -]?caf|semi[ -]?decaf|partially[ -]?decaf)';
 method := nullif(btrim(coalesce(new.proposed_data->>'decaffeination_method','')),'');
 if method not in ('Water Process','Sugar Process','Carbon Dioxide (CO2)') then method:=null; end if;
 update public.coffees c set is_decaf=decaf,
  decaffeination_method=case when decaf then method else null end
 where c.id=new.canonical_coffee_id and c.decaffeination_method is null;
 return new;
end;
$dic$;
drop trigger if exists dic_capture_first_decaf_method on public.coffee_submissions;
create trigger dic_capture_first_decaf_method
after update of status,canonical_coffee_id on public.coffee_submissions
for each row when (new.status='approved' and new.canonical_coffee_id is not null)
execute function private.dic_capture_first_decaf_method();
revoke all on function private.dic_capture_first_decaf_method() from public,anon,authenticated;

-- Restore the existing server-owned owner/revision/verified-correction RPC
-- verbatim except for additive decaf validation and safe optional keys.
CREATE OR REPLACE FUNCTION private.dic_edit_my_coffee(p_library_entry uuid, p_expected_revision bigint, p_details jsonb, p_source_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 u uuid:=private.require_member();
 lib public.library_entries; sub public.coffee_submissions; canonical public.coffees;
 clean jsonb; k text; value text; name_text text; roaster_text text; url_text text;
 updated_id uuid;
begin
 if p_library_entry is null or p_expected_revision is null or p_expected_revision<1 or
    jsonb_typeof(p_details) is distinct from 'object' or octet_length(p_details::text)>8000 then
   raise exception using errcode='22023',message='Invalid coffee edit request.';
 end if;
 for k in select jsonb_object_keys(p_details) loop
  if k not in ('name','roaster','release_label','origin','roast_level',
      'elevation_m','process','is_decaf','decaffeination_method','variety','producer','tasting_notes') then
   raise exception using errcode='22023',message='Unsupported coffee detail.';
  end if;
  if k='is_decaf' then
   if jsonb_typeof(p_details->k) is distinct from 'boolean' then
    raise exception using errcode='22023',message='Decaf flag must be a boolean.';
   end if;
  else
   if jsonb_typeof(p_details->k) not in ('null','string') then
    raise exception using errcode='22023',message='Coffee details must be text.';
   end if;
   value:=nullif(btrim(p_details->>k),'');
   if length(value)>(case when k='tasting_notes' then 2000 else 300 end) then
    raise exception using errcode='22023',message='Coffee detail is too long.';
   end if;
  end if;
 end loop;
 name_text:=nullif(btrim(p_details->>'name'),'');
 roaster_text:=nullif(btrim(p_details->>'roaster'),'');
 if name_text is null or length(name_text)>200 or roaster_text is null or length(roaster_text)>200 then
  raise exception using errcode='22023',message='Coffee name and roaster are required.';
 end if;
 if nullif(btrim(p_details->>'roast_level'),'') is not null
   and p_details->>'roast_level' not in
      ('Ultra Light','Very Light','Light','Medium-Light','Medium','Medium-Dark','Dark') then
  raise exception using errcode='22023',message='Choose a recognized roast level.';
 end if;
 if p_details ? 'decaffeination_method' and
    nullif(btrim(p_details->>'decaffeination_method'),'') is not null and
    p_details->>'decaffeination_method' not in ('Water Process','Sugar Process','Carbon Dioxide (CO2)') then
   raise exception using errcode='22023',message='Unknown decaffeination method.';
 end if;
 if p_details ? 'is_decaf' and p_details->>'is_decaf'='true' and
    name_text ~* '(^|[^[:alnum:]])(half[ -]?caf|semi[ -]?decaf|partially[ -]?decaf)' then
   raise exception using errcode='22023',message='Half-caf cannot be marked fully decaf.';
 end if;
 url_text:=nullif(btrim(p_source_url),'');
 if url_text is not null and (length(url_text)>4000 or url_text !~ '^https://[^[:space:]/?#]+') then
   raise exception using errcode='22023',message='Source URL must be HTTPS.';
 end if;
 clean:=jsonb_build_object(
  'name',name_text,'roaster',roaster_text,
  'release_label',nullif(btrim(p_details->>'release_label'),''),
  'origin',nullif(btrim(p_details->>'origin'),''),
  'roast_level',nullif(btrim(p_details->>'roast_level'),''),
  'elevation_m',nullif(btrim(p_details->>'elevation_m'),''),
  'process',nullif(btrim(p_details->>'process'),''),
  'variety',nullif(btrim(p_details->>'variety'),''),
  'producer',nullif(btrim(p_details->>'producer'),''),
  'tasting_notes',nullif(btrim(p_details->>'tasting_notes'),'')
 );
 -- New fields are additive. Older clients that omit them preserve previously
 -- submitted details. Explicit False removes a stale decaf method.
 if p_details ? 'is_decaf' or p_details ? 'decaffeination_method' then
  clean:=clean||jsonb_build_object(
   'is_decaf',coalesce((p_details->>'is_decaf')::boolean,
      name_text ~* '(^|[^[:alnum:]])decaf(feinated)?([^[:alnum:]]|$)')
      and name_text !~* '(^|[^[:alnum:]])(half[ -]?caf|semi[ -]?decaf|partially[ -]?decaf)',
   'decaffeination_method',case when
     coalesce((p_details->>'is_decaf')::boolean,
      name_text ~* '(^|[^[:alnum:]])decaf(feinated)?([^[:alnum:]]|$)')
      and name_text !~* '(^|[^[:alnum:]])(half[ -]?caf|semi[ -]?decaf|partially[ -]?decaf)'
     then nullif(btrim(p_details->>'decaffeination_method'),'') else null end
  );
 end if;
 select * into lib from public.library_entries
    where id=p_library_entry and owner_id=u and hidden_at is null for update;
 if lib.id is null then raise exception using errcode='42501',message='Coffee is not in your library.';end if;

 if lib.coffee_id is null then
  select * into sub from public.coffee_submissions
    where id=lib.submission_id and owner_id=u for update;
  if sub.id is null or sub.status<>'pending' then
   raise exception using errcode='23514',message='This submission is no longer editable.';
  end if;
  if sub.revision<>p_expected_revision then
   return jsonb_build_object('ok',false,'code','conflict','revision',sub.revision);
  end if;
  update public.coffee_submissions
  set proposed_data=(sub.proposed_data || clean),source_url=url_text
  where id=sub.id returning id into updated_id;
  return jsonb_build_object('ok',true,'kind','updated_pending','submission_id',updated_id);
 end if;

 select * into canonical from public.coffees
   where id=lib.coffee_id and verification_state='verified' for share;
 if canonical.id is null then
  raise exception using errcode='23514',message='The verified coffee is unavailable.';
 end if;
 -- Reuse a still-pending correction to avoid duplicate queue entries. Editing a
 -- correction never changes the verified source or this member's shot history.
 select * into sub from public.coffee_submissions
 where owner_id=u and canonical_coffee_id=canonical.id and status='pending'
 order by updated_at desc,id desc limit 1 for update;
 if sub.id is not null then
  if p_expected_revision<>sub.revision then
   return jsonb_build_object('ok',false,'code','conflict','revision',sub.revision);
  end if;
  -- Old clients omit both additive keys. Preserve previously submitted
  -- decaf details when updating an existing canonical correction too.
  if not (p_details ? 'is_decaf' or p_details ? 'decaffeination_method') then
   clean:=clean||(select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb)
    from jsonb_each(sub.proposed_data) e
    where e.key in ('is_decaf','decaffeination_method'));
  end if;
  update public.coffee_submissions set proposed_data=clean,source_url=url_text,
   base_coffee_revision=canonical.revision where id=sub.id returning id into updated_id;
 else
  if p_expected_revision<>canonical.revision then
   return jsonb_build_object('ok',false,'code','conflict','revision',canonical.revision);
  end if;
  insert into public.coffee_submissions(
    owner_id,canonical_coffee_id,base_coffee_revision,proposed_data,source_url,status
  ) values(u,canonical.id,canonical.revision,clean,url_text,'pending')
  returning id into updated_id;
 end if;
 return jsonb_build_object('ok',true,'kind','correction_requested','submission_id',updated_id);
end $function$;


-- Owner-approved correction path, preserving the present audited admin function.
CREATE OR REPLACE FUNCTION private.dic_admin_edit_record(p_record_id uuid, p_expected_revision bigint, p_details jsonb, p_reason text, p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid; record_owner uuid; snapshot jsonb; after_snapshot jsonb;
 revision_after bigint; oldshot public.shots; oldsub public.coffee_submissions;
 oldcoffee public.coffees; notes_before text; k text; reason_text text;
begin
 actor:=private.require_member();
 if actor is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 -- Default to neutral machine audit provenance when administrator saves without reason.
 reason_text:=coalesce(nullif(btrim(coalesce(p_reason,'')),''),'Administrator saved record changes');
 if p_record_id is null or p_expected_revision is null or p_kind is null or
   p_kind not in ('shot','submission','approved') or
   length(reason_text) not between 8 and 1000 or
   jsonb_typeof(p_details) is distinct from 'object' or
   octet_length(p_details::text)>30000 then
  raise exception using errcode='22023',message='Invalid correction request.';
 end if;
 -- Keep the original record ownership and audit boundary. New decaf data
 -- must be strictly typed and cannot be confused with post-harvest Process.
 if p_kind in ('submission','approved') then
  if p_details ? 'is_decaf' and jsonb_typeof(p_details->'is_decaf') is distinct from 'boolean' then
   raise exception using errcode='22023',message='Decaf flag must be boolean.';
  end if;
  if p_details ? 'decaffeination_method' and
    nullif(btrim(p_details->>'decaffeination_method'),'') is not null and
    p_details->>'decaffeination_method' not in ('Water Process','Sugar Process','Carbon Dioxide (CO2)') then
   raise exception using errcode='22023',message='Unknown decaffeination method.';
  end if;
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
    'variety','producer','elevation_m','tasting_notes','summary','espressoNotes','source_url',
    'is_decaf','decaffeination_method')) then
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
    'variety','producer','elevation_m','tasting_notes','summary','espressoNotes','source_url',
    'is_decaf','decaffeination_method')) then
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
   is_decaf=case when p_details ? 'is_decaf' then (p_details->>'is_decaf')::boolean else oldcoffee.is_decaf end,
   decaffeination_method=case
      when p_details ? 'is_decaf' and p_details->>'is_decaf'='false' then null
      when p_details ? 'decaffeination_method' then nullif(btrim(p_details->>'decaffeination_method'),'')
      else oldcoffee.decaffeination_method end,
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
end $function$;

