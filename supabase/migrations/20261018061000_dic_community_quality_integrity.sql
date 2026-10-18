-- The Dial In Collective: server-owned community quality, without client publication.
-- FORWARD-ONLY DEVELOPMENT MIGRATION. DO NOT APPLY TO HOSTED PRODUCTION
-- without a fresh, separately approved, coordinated release.
-- No production data backfill is performed by this migration.
--
-- Requirements: verified canonical coffee, all-green sensory rating,
-- private contributor identity, durable detached anonymous evidence, and
-- evidence-first review of unusual values (no rigid espresso style ratio/time).
-- Existing personal shots, notes, revisions and private Pending coffees remain intact.

create table private.community_quality_checks (
 community_shot_id uuid primary key references public.community_shots(id) on delete cascade,
 source_revision bigint,
 outcome text not null check(outcome in ('eligible','held','withdrawn')),
 reason text not null check(reason in (
  'valid','unverified_coffee','source_detached','source_mismatch',
  'not_dialed_in','extreme_outlier'
 )),
 confirmed_fingerprint text,
 reviewed_at timestamptz not null default now()
);
alter table private.community_quality_checks enable row level security;
revoke all on table private.community_quality_checks from public,anon,authenticated;
grant all on table private.community_quality_checks to service_role;
create policy no_client_access on private.community_quality_checks
 for all to anon,authenticated using(false) with check(false);
comment on table private.community_quality_checks is
 'Private source revision and review reasons for detached/quality-gated community projections. No client access, and never part of member-facing output.';

-- The confirmation binds to observation content rather than a shot revision:
-- hiding an unchanged personal shot can increment revision but must not revoke
-- a valid anonymous contribution or a previously confirmed unusual recipe.
create function private.dic_community_fingerprint(c public.community_shots)
returns text language sql immutable set search_path='' as $$
 select pg_catalog.md5(pg_catalog.jsonb_build_array(
  c.coffee_id,c.style,c.dose_g,c.yield_g,c.time_s,c.temperature_c,
  c.extraction,c.body,c.clarity,c.sweetness,c.astringency,c.grind_setting,
  c.feed_mode,c.observed_on,c.machine_model,c.grinder_model,c.burr_set,
  c.basket_model,c.basket_dose_g
 )::text);
$$;

-- Never accept a direct caller-supplied quality verdict.
-- The row and its owner/contributor linkage are always rechecked under a
-- lock. Only deterministic, source-bound evidence can be made eligible.
create function private.dic_review_community_shot(p_id uuid)
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
   -- First compare the same member's earlier, visible green observations
   -- on this exact coffee and equipment version, as required by §24.2.
   -- Three personal precedents form a conservative contextual comparison;
   -- if absent, fall back to five DIFFERENT community contributors.
   select count(*)::integer,
     percentile_cont(0.5) within group(order by x.ratio),
     percentile_cont(0.5) within group(order by x.time_s)
     into own_count,own_ratio,own_time
   from public.shots x
   where x.owner_id=s.owner_id and x.library_entry_id=s.library_entry_id
     and x.setup_version_id=s.setup_version_id and x.style=s.style
     and x.is_dialed_in and x.hidden_at is null and x.id<>s.id
     and (x.pulled_at,x.id)<(s.pulled_at,s.id);

   if own_count>=3 then
     peer_count:=own_count;median_ratio:=own_ratio;median_time:=own_time;
   else
     -- Exact coffee/style peers, one latest eligible observation per DIFFERENT
     -- contributor. A prolific member cannot manufacture a reference majority.
     -- With <5 independent peers, robust comparison is not justified.
     with peer as (
    select distinct on(link.contributor_id)
     other.ratio,other.time_s
    from public.community_shots other
    join private.contribution_links link on link.community_shot_id=other.id
    join public.coffees verified on verified.id=other.coffee_id
    where other.id<>c.id and other.quality_state='eligible'
      and verified.verification_state='verified'
      and other.coffee_id=c.coffee_id and other.style=c.style
      and link.contributor_id<>l.contributor_id
    order by link.contributor_id,other.updated_at desc,other.id
   )
   select count(*)::integer,
     percentile_cont(0.5) within group(order by ratio),
     percentile_cont(0.5) within group(order by time_s)
    into peer_count,median_ratio,median_time from peer;
   end if;

   if ((own_count>=3) or (peer_count>=5)) and (
       c.ratio>median_ratio*3 or c.ratio<median_ratio/3
       or c.time_s>median_time*4 or c.time_s<median_time/4
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
comment on function private.dic_review_community_shot(uuid) is
 'Private server-only quality review. Verified canonical release, original revision/content, green taste, anonymous link, peer outliers and durable detach required.';

-- Invoked only when the existing private projector has FINISHED linking and
-- bumping its version; never make a decision on its intermediate Pending row.
create function private.dic_recheck_after_link() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform private.dic_review_community_shot(new.community_shot_id);
 return new;
end $$;
create trigger dic_recheck_after_link
 after insert or update of shot_id,source_revision on private.contribution_links
 for each row execute function private.dic_recheck_after_link();

-- Shared backfill for verified coffee approval and canonical-library linkage.
-- It never updates personal shot records merely to rebuild community evidence.
create function private.dic_backfill_library_contributions(
 p_owner uuid,p_entry uuid,p_canonical uuid
) returns void language plpgsql security definer set search_path='' as $$
declare s public.shots; existing uuid; new_contribution uuid; contributor uuid;
        verified text;
begin
 select verification_state into verified from public.coffees where id=p_canonical;
 for s in select * from public.shots where owner_id=p_owner
          and library_entry_id=p_entry order by pulled_at,id
 loop
  select community_shot_id into existing
  from private.contribution_links where shot_id=s.id;
  if existing is not null then
   if p_canonical is null or verified is distinct from 'verified' then
    update public.community_shots set quality_state='held',updated_at=clock_timestamp()
      where id=existing and quality_state<>'withdrawn';
   elsif s.is_dialed_in then
    update public.community_shots set
      coffee_id=p_canonical,family_id=null,quality_state='pending_quality',
      updated_at=clock_timestamp() where id=existing and quality_state<>'withdrawn';
    perform private.dic_review_community_shot(existing);
   end if;
  elsif s.is_dialed_in and verified='verified' then
   select id into contributor from private.contributors where owner_id=s.owner_id;
   if contributor is null then
    raise exception using errcode='23514', message='Missing private community contributor.';
   end if;
   insert into public.community_shots(
    coffee_id,style,dose_g,yield_g,time_s,temperature_c,
    extraction,body,clarity,sweetness,astringency,
    machine_model,grinder_model,burr_set,basket_model,basket_dose_g,
    grind_setting,feed_mode,observed_on
   ) values(
    p_canonical,s.style,s.dose_g,s.yield_g,s.time_s,s.temperature_c,
    s.extraction,s.body,s.clarity,s.sweetness,s.astringency,
    s.equipment_snapshot->>'machine_model',
    s.equipment_snapshot->>'grinder_model',s.equipment_snapshot->>'burr_set',
    s.equipment_snapshot->>'basket_model',
    (s.equipment_snapshot->>'basket_dose_g')::numeric,
    s.grind_setting,s.feed_mode,(s.pulled_at at time zone 'UTC')::date
   ) returning id into new_contribution;
   insert into private.contribution_links(
     community_shot_id,shot_id,contributor_id,source_revision
   ) values(new_contribution,s.id,contributor,s.revision);
  end if;
 end loop;
end $$;

-- Canonical identity state changes immediately withdraw public visibility.
-- A verified transition then reevaluates every linked projection. Different
-- releases are NEVER silently coalesced or reassigned by a roaster URL.
create function private.dic_on_community_coffee_verification() returns trigger
language plpgsql security definer set search_path='' as $$
declare target uuid; lib record;
begin
 if row(new.verification_state,new.merged_into_id)
    is not distinct from row(old.verification_state,old.merged_into_id)
 then return new;end if;
 update public.community_shots
   set quality_state=case when new.verification_state='verified'
                       then 'pending_quality' else 'held' end,
       updated_at=clock_timestamp()
   where coffee_id=new.id and quality_state<>'withdrawn';
 if new.verification_state='verified' then
  for lib in select owner_id,id from public.library_entries where coffee_id=new.id loop
   perform private.dic_backfill_library_contributions(lib.owner_id,lib.id,new.id);
  end loop;
  for target in select id from public.community_shots
                 where coffee_id=new.id and quality_state='pending_quality'
  loop perform private.dic_review_community_shot(target); end loop;
 end if;
 return new;
end $$;
create trigger dic_on_community_coffee_verification
 after update of verification_state,merged_into_id on public.coffees
 for each row execute function private.dic_on_community_coffee_verification();

-- Approval may assign coffee_id to a previously Pending library entry long
-- AFTER shots were logged. Do not mutate original shots to re-fire project_shot.
-- Create missing projections against the *new canonical coffee identity*.
create function private.dic_on_library_coffee_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.coffee_id is distinct from new.coffee_id then
  perform private.dic_backfill_library_contributions(
    new.owner_id,new.id,new.coffee_id);
 end if;
 return new;
end $$;
create trigger dic_on_library_coffee_change
 after update of coffee_id on public.library_entries
 for each row execute function private.dic_on_library_coffee_change();

-- Client API: only the actual admitted shot owner can confirm a flagged,
-- plausible unusual recipe. Wrong owner, wrong revision, unpublished Pending,
-- and generic/non-outlier held states cannot be overridden. No admin required.
create function public.dic_confirm_community_outlier(
 p_shot_id uuid,p_expected_revision bigint
) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; target uuid; s public.shots; c public.community_shots;
        reason_code text; disposition text;
begin
 u:=private.require_member();
 select * into s from public.shots where id=p_shot_id and owner_id=u;
 if s.id is null or s.revision<>p_expected_revision then
  return jsonb_build_object('ok',false,'reason','not_found_or_conflict');
 end if;
 select cs.* into c from public.community_shots cs
  join private.contribution_links l on l.community_shot_id=cs.id
  where l.shot_id=s.id for update of cs;
 if c.id is null or c.quality_state<>'held' then
  return jsonb_build_object('ok',false,'reason','no_outlier_confirmation_pending');
 end if;
 select reason into reason_code from private.community_quality_checks
  where community_shot_id=c.id;
 if reason_code is distinct from 'extreme_outlier' then
  return jsonb_build_object('ok',false,'reason','no_outlier_confirmation_pending');
 end if;
 update private.community_quality_checks
   set confirmed_fingerprint=private.dic_community_fingerprint(c),
       reviewed_at=clock_timestamp()
   where community_shot_id=c.id;
 disposition:=private.dic_review_community_shot(c.id);
 return jsonb_build_object('ok',disposition='eligible','state',disposition);
end $$;

-- Community-facing evidence metadata: count shots and unique contributors
-- separately. Return NO account, linked shot ID, email, notes or group identity.
create function public.dic_community_evidence_counts(p_coffee_id uuid,p_style text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare n bigint; people bigint;
begin
 perform private.require_member();
 select count(*),count(distinct l.contributor_id) into n,people
 from public.community_shots c
 join private.contribution_links l on l.community_shot_id=c.id
 join public.coffees verified on verified.id=c.coffee_id
 where c.coffee_id=p_coffee_id and c.style=p_style and c.quality_state='eligible'
  and verified.verification_state='verified';
 return jsonb_build_object('shot_count',n,'contributor_count',people);
end $$;

-- Server-side maintenance for any older, still-pending projection. No
-- automatic migration-time backfill; explicit release operations decide
-- when to reconcile existing records. Bounded to avoid long transactions.
create function private.dic_review_pending_community(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; reviewed integer:=0; eligible_count integer:=0;
        held_count integer:=0; result text;
begin
 if p_limit is null or p_limit not between 1 and 500 then
  raise exception using errcode='22023',message='Community review limit must be 1–500.';
 end if;
 for target in select id from public.community_shots
                where quality_state='pending_quality'
                order by updated_at,id limit p_limit
 loop
  result:=private.dic_review_community_shot(target);
  reviewed:=reviewed+1;
  if result='eligible' then eligible_count:=eligible_count+1;end if;
  if result='held' then held_count:=held_count+1;end if;
 end loop;
 return jsonb_build_object('reviewed',reviewed,'eligible',eligible_count,'held',held_count);
end $$;

-- Explicit private function permissions, and no browser writes to projection.
-- All private-schema funcs use fixed empty search_path and definer privileges
-- only where needed; exposed wrappers validate auth.uid() through membership.
revoke all on function private.dic_community_fingerprint(public.community_shots)
 from public,anon,authenticated;
revoke all on function private.dic_review_community_shot(uuid)
 from public,anon,authenticated;
revoke all on function private.dic_recheck_after_link()
 from public,anon,authenticated;
revoke all on function private.dic_on_community_coffee_verification()
 from public,anon,authenticated;
revoke all on function private.dic_backfill_library_contributions(uuid,uuid,uuid)
 from public,anon,authenticated;
revoke all on function private.dic_on_library_coffee_change()
 from public,anon,authenticated;
revoke all on function private.dic_review_pending_community(integer)
 from public,anon,authenticated;
grant execute on function private.dic_review_pending_community(integer) to service_role;
revoke all on function public.dic_confirm_community_outlier(uuid,bigint)
 from public,anon,authenticated;
revoke all on function public.dic_community_evidence_counts(uuid,text)
 from public,anon,authenticated;
grant execute on function public.dic_confirm_community_outlier(uuid,bigint) to authenticated;
grant execute on function public.dic_community_evidence_counts(uuid,text) to authenticated;

comment on function public.dic_confirm_community_outlier(uuid,bigint) is
 'Owner-validated outlier confirmation, current-source-fingerprint bound; does not publish unrelated held or Pending data.';
comment on function public.dic_community_evidence_counts(uuid,text) is
 'Admitted-members-only anonymous eligible shot and independent contributor counts. No private identity projection.';
