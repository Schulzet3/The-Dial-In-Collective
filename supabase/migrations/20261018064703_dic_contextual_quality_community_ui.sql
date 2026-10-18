-- Community refinement, DIC 2026-10-18. DEVELOPMENT ONLY until an
-- owner-authorized and explicitly verified release. Do not backfill or
-- publish existing Pending contributions from this migration.
-- Research: NIST EDA §1.3.5.17 modified Z-score 3.5 for *potential*
-- outliers (NOT validity verdict); 4x extraction time was ungrounded.
-- Scott Rao and Barista Hustle document legitimate long extraction profiles.
-- Floor values and cohort sizes are conservative DIC heuristics, not
-- scientifically validated espresso ranges. Keep all-green style independence.

create or replace function private.dic_review_community_shot(p_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare
 c public.community_shots;
 l private.contribution_links;
 s public.shots;
 q private.community_quality_checks;
 owner_of_contribution uuid;
 mapped_coffee uuid;
 verification text;
 new_state text;
 reason_code text;
 fp text;
 peer_count integer:=0;
 own_count integer:=0;
 median_ratio numeric;
 median_time numeric;
 own_ratio numeric;
 own_time numeric;
 time_mad numeric;
 ratio_mad numeric;
begin
 select * into c from public.community_shots where id=p_id for update;
 if c.id is null then return 'missing'; end if;
 select * into l from private.contribution_links where community_shot_id=p_id;
 select * into q from private.community_quality_checks where community_shot_id=p_id;
 select verification_state into verification from public.coffees where id=c.coffee_id;

 if verification is distinct from 'verified' then
  new_state:='held'; reason_code:='unverified_coffee';
 elsif c.quality_state='withdrawn' then
  -- A corrected green observation explicitly re-enters pending via project_shot;
  -- background reconciliation must never revive a withdrawn projection.
  return 'withdrawn';
 elsif l.community_shot_id is null or l.shot_id is null then
  -- Previously validated detached contributions survive personal/account
  -- deletion; unvalidated orphan projections must NEVER be auto-approved.
  if c.quality_state='eligible' then return 'eligible'; end if;
  new_state:='held'; reason_code:='source_detached';
 else
  select * into s from public.shots where id=l.shot_id;
  select owner_id into owner_of_contribution from private.contributors where id=l.contributor_id;
  if s.id is not null then
   select coffee_id into mapped_coffee from public.library_entries
    where id=s.library_entry_id and owner_id=s.owner_id;
  end if;
  if s.id is not null and not s.is_dialed_in then
   new_state:='withdrawn'; reason_code:='not_dialed_in';
  elsif s.id is null or owner_of_contribution is distinct from s.owner_id
    or mapped_coffee is distinct from c.coffee_id or s.revision<>l.source_revision
    or c.style is distinct from s.style
    or c.dose_g is distinct from s.dose_g or c.yield_g is distinct from s.yield_g
    or c.time_s is distinct from s.time_s
    or c.temperature_c is distinct from s.temperature_c
    or c.extraction is distinct from s.extraction or c.body is distinct from s.body
    or c.clarity is distinct from s.clarity or c.sweetness is distinct from s.sweetness
    or c.astringency is distinct from s.astringency
    or c.grind_setting is distinct from s.grind_setting
    or c.feed_mode is distinct from s.feed_mode
    or c.observed_on is distinct from (s.pulled_at at time zone 'UTC')::date
    or c.machine_model is distinct from (s.equipment_snapshot->>'machine_model')
    or c.grinder_model is distinct from (s.equipment_snapshot->>'grinder_model')
    or c.burr_set is distinct from (s.equipment_snapshot->>'burr_set')
    or c.basket_model is distinct from (s.equipment_snapshot->>'basket_model')
    or c.basket_dose_g is distinct from (s.equipment_snapshot->>'basket_dose_g')::numeric
   then
    new_state:='held';reason_code:='source_mismatch';
  else
   fp:=private.dic_community_fingerprint(c);
   -- A statistically unusual espresso is NEVER rejected by time or ratio
   -- alone. NIST's |modified Z| >3.5 is an exploratory potential-outlier
   -- flag, NOT a correctness standard and not a shot-style window.
   -- Use sufficiently sized, same-context cohorts. Absolute/relative floors
   -- and zero-MAD scale fallback are product heuristics against nagging
   -- members about tiny differences or identical peer measurements.
   with personal_samples as (
    select x.ratio::double precision as r,x.time_s::double precision as t
    from public.shots x
    where x.owner_id=s.owner_id and x.library_entry_id=s.library_entry_id
      and x.setup_version_id=s.setup_version_id and x.style=s.style
      and x.is_dialed_in and x.hidden_at is null and x.id<>s.id
      and (x.pulled_at,x.id)<(s.pulled_at,s.id)
   ), personal_center as (
     select count(*) as n,
      percentile_cont(0.5) within group(order by t) as mid_t,
      percentile_cont(0.5) within group(order by r) as mid_r
     from personal_samples
   )
   select center.n,center.mid_t,center.mid_r,
     (select percentile_cont(0.5) within group(order by abs(p.t-center.mid_t)) from personal_samples p),
     (select percentile_cont(0.5) within group(order by abs(p.r-center.mid_r)) from personal_samples p)
    into own_count,own_time,own_ratio,time_mad,ratio_mad
    from personal_center center;

   if own_count>=5 then
     peer_count:=own_count;median_time:=own_time;median_ratio:=own_ratio;
   else
     -- Independent contributors prevent prolific users from manufacturing a
     -- majority. Never borrow times from different shot styles/releases.
     with peer as (
       select distinct on(link.contributor_id)
         other.ratio::double precision as r,
         other.time_s::double precision as t
       from public.community_shots other
       join private.contribution_links link on link.community_shot_id=other.id
       join public.coffees verified on verified.id=other.coffee_id
       where other.id<>c.id and other.quality_state='eligible'
         and verified.verification_state='verified'
         and other.coffee_id=c.coffee_id and other.style=c.style
         and link.contributor_id<>l.contributor_id
       order by link.contributor_id,other.updated_at desc,other.id
     ), peer_center as (
       select count(*) as n,
         percentile_cont(0.5) within group(order by t) as mid_t,
         percentile_cont(0.5) within group(order by r) as mid_r
       from peer
     )
     select center.n,center.mid_t,center.mid_r,
       (select percentile_cont(0.5) within group(order by abs(p.t-center.mid_t)) from peer p),
       (select percentile_cont(0.5) within group(order by abs(p.r-center.mid_r)) from peer p)
       into peer_count,median_time,median_ratio,time_mad,ratio_mad
       from peer_center center;
   end if;

   -- Conservative practical floors apply IN ADDITION TO the modified Z
   -- threshold, not instead of it. All flags only invite correction or
   -- explicit owner confirmation, with no hard "62 second" veto.
   if peer_count>=5 and (
       (
        abs(c.time_s-median_time)>greatest(10.0,0.4*median_time)
        and abs(c.time_s-median_time)/greatest(coalesce(time_mad,0)*1.4826,5.0)>3.5
       ) or (
        abs(c.ratio-median_ratio)>greatest(0.5,0.35*median_ratio)
        and abs(c.ratio-median_ratio)/greatest(coalesce(ratio_mad,0)*1.4826,0.25)>3.5
       )
     ) and q.confirmed_fingerprint is distinct from fp then
     new_state:='held';reason_code:='extreme_outlier';
   else
     new_state:='eligible';reason_code:='valid';
   end if;
  end if;
 end if;

 if c.quality_state is distinct from new_state then
  update public.community_shots
     set quality_state=new_state,updated_at=clock_timestamp() where id=c.id;
 end if;
 insert into private.community_quality_checks(
  community_shot_id,source_revision,outcome,reason,reviewed_at
 ) values(c.id,l.source_revision,new_state,reason_code,clock_timestamp())
 on conflict(community_shot_id) do update
  set source_revision=excluded.source_revision,outcome=excluded.outcome,
      reason=excluded.reason,reviewed_at=excluded.reviewed_at
  where (private.community_quality_checks.source_revision,
         private.community_quality_checks.outcome,
         private.community_quality_checks.reason)
        is distinct from
        (excluded.source_revision,excluded.outcome,excluded.reason);
 return new_state;
end $$;


-- Admitted-only, authenticated-owner review inbox. An arbitrary client
-- cannot enumerate another owner's held records or private quality data.
create function public.dic_my_community_outliers()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare member_id uuid; entries jsonb;
begin
 member_id:=private.require_member();
 select coalesce(jsonb_agg(jsonb_build_object(
    'shot_id',recent.id,'revision',recent.revision,
    'coffee_name',recent.coffee_name,'roaster',recent.roaster,
    'style',recent.style,'dose_g',recent.dose_g,
    'yield_g',recent.yield_g,'time_s',recent.time_s
 ) order by recent.pulled_at desc),'[]'::jsonb) into entries
 from (
    select s.id,s.revision,s.pulled_at,s.style,s.dose_g,s.yield_g,
      s.time_s,coffee.name as coffee_name,coffee.roaster
    from public.shots s
    join private.contribution_links link on link.shot_id=s.id
      and link.source_revision=s.revision
    join public.community_shots cs on cs.id=link.community_shot_id
      and cs.quality_state='held'
    join private.community_quality_checks qc on qc.community_shot_id=cs.id
      and qc.reason='extreme_outlier'
    join public.coffees coffee on coffee.id=cs.coffee_id
      and coffee.verification_state='verified'
    where s.owner_id=member_id and s.hidden_at is null
      and s.is_dialed_in
    order by s.pulled_at desc,s.id desc
    limit 10
 ) recent;
 return entries;
end $$;

-- Defense in depth: the preexisting admitted-member RLS constrained ROWS
-- but not sensitive equipment/model COLUMNS on community_shots.
-- The new strictly allowlisted RPC is the only member read path. Retain
-- service_role/postgres and internal function privileges for quality review.
revoke select on table public.community_shots from authenticated;
revoke select on table public.community_shots from anon;

-- Narrow sanitized browse feed. No shot identifiers, contributor handles,
-- personal notes, private links or user-entered equipment/setup names.
-- Read-only authenticated RPC, RLS-independent because membership is checked.
create function public.dic_browse_community_shots(
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

-- Protect definer RPCs from inherited PUBLIC/default EXECUTE, exposing only
-- admitted-member-gated wrappers.
revoke all on function public.dic_my_community_outliers() from public,anon,authenticated;
revoke all on function public.dic_browse_community_shots(integer,integer) from public,anon,authenticated;
grant execute on function public.dic_my_community_outliers() to authenticated;
grant execute on function public.dic_browse_community_shots(integer,integer) to authenticated;

comment on function public.dic_my_community_outliers() is
 'Member-only owner-bound list of outstanding extreme-outlier corrections. Contains no community IDs or notes.';
comment on function public.dic_browse_community_shots(integer,integer) is
 'Member-only paged anonymous eligible Community shots, sanitized observations, count of shots and distinct contributing accounts.';


-- User-facing editing of previously saved coffee facts. A Pending owner
-- record can be updated directly and revision-safely. A Verified canonical
-- record is immutable to members; edits become an auditable fact-correction
-- request for the existing approval queue, never an automatic catalog write.
-- No shot, library identity, or existing source evidence is rewritten here.
create function private.dic_edit_my_coffee(
 p_library_entry uuid,p_expected_revision bigint,p_details jsonb,p_source_url text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
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
      'elevation_m','process','variety','producer','tasting_notes') then
   raise exception using errcode='22023',message='Unsupported coffee detail.';
  end if;
  if jsonb_typeof(p_details->k) not in ('null','string') then
   raise exception using errcode='22023',message='Coffee details must be text.';
  end if;
  value:=nullif(btrim(p_details->>k),'');
  if length(value)>(case when k='tasting_notes' then 2000 else 300 end) then
   raise exception using errcode='22023',message='Coffee detail is too long.';
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
end $$;

revoke all on function private.dic_edit_my_coffee(uuid,bigint,jsonb,text)
 from public,anon,authenticated;
grant execute on function private.dic_edit_my_coffee(uuid,bigint,jsonb,text) to authenticated;

create function public.dic_edit_my_coffee(
 p_library_entry uuid,p_expected_revision bigint,p_details jsonb,p_source_url text default null
) returns jsonb language sql security invoker set search_path='' as $$
 select private.dic_edit_my_coffee(p_library_entry,p_expected_revision,p_details,p_source_url);
$$;
revoke all on function public.dic_edit_my_coffee(uuid,bigint,jsonb,text)
 from public,anon,authenticated;
grant execute on function public.dic_edit_my_coffee(uuid,bigint,jsonb,text) to authenticated;

comment on function public.dic_edit_my_coffee(uuid,bigint,jsonb,text) is
 'Revision-checked member coffee edit; Pending edits are private, verified edits are reviewed correction submissions.';
