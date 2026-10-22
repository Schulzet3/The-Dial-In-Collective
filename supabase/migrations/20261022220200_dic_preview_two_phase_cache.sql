-- Issue #80: preview quota is charged only when a completed extraction has a
-- non-transient outcome; repeat verified / warm public previews skip daily quota.
-- Does not alter shared trusted-source quota claim or release-safety functions.
-- All functions are admitted, email-verified member-only. Source-only migration.
alter table private.dic_url_preview_attempts
 add column if not exists preview_ticket uuid,
 add column if not exists preview_ticket_at timestamptz;

create or replace function public.dic_preview_preflight(p_cached boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare me uuid:=auth.uid(); rec private.dic_url_preview_attempts; clock timestamptz:=now(); ticket uuid;
begin
 if me is null or auth.role() is distinct from 'authenticated' or not private.is_member() then
  return jsonb_build_object('allowed',false,'reason','admitted_member_required');
 end if;
 if not exists(select 1 from auth.users u where u.id=me and u.email_confirmed_at is not null) then
  return jsonb_build_object('allowed',false,'reason','verify_email');
 end if;
 insert into private.dic_url_preview_attempts(owner_id,window_started_at,last_attempt_at,attempts)
 values(me,clock,clock-interval '1 minute',0) on conflict(owner_id) do nothing;
 select * into strict rec from private.dic_url_preview_attempts where owner_id=me for update;
 if rec.window_started_at<clock-interval '24 hours' then
  update private.dic_url_preview_attempts
    set window_started_at=clock,attempts=0,preview_ticket=null,preview_ticket_at=null
    where owner_id=me;
  rec.attempts:=0;
 end if;
 -- A cached public result consumes cooldown but never a daily retrieval claim.
 if not p_cached and rec.attempts>=12 then
  return jsonb_build_object('allowed',false,'reason','daily_preview_limit');
 end if;
 if rec.last_attempt_at>clock-interval '30 seconds' then
  return jsonb_build_object('allowed',false,'reason','preview_cooldown');
 end if;
 if p_cached then
  update private.dic_url_preview_attempts
    set last_attempt_at=clock,preview_ticket=null,preview_ticket_at=null where owner_id=me;
  return jsonb_build_object('allowed',true,'cached',true);
 end if;
 ticket:=gen_random_uuid();
 update private.dic_url_preview_attempts
  set last_attempt_at=clock,preview_ticket=ticket,preview_ticket_at=clock where owner_id=me;
 return jsonb_build_object('allowed',true,'ticket',ticket);
end $fn$;

create or replace function public.dic_preview_complete(p_ticket uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare me uuid:=auth.uid(); rec private.dic_url_preview_attempts;
begin
 if me is null or auth.role() is distinct from 'authenticated' or not private.is_member() then
  return jsonb_build_object('charged',false,'reason','admitted_member_required');
 end if;
 if p_ticket is null then return jsonb_build_object('charged',false,'reason','invalid_ticket'); end if;
 select * into rec from private.dic_url_preview_attempts where owner_id=me for update;
 if not found or rec.preview_ticket is distinct from p_ticket or
   rec.preview_ticket_at is null or rec.preview_ticket_at<now()-interval '25 seconds' then
  return jsonb_build_object('charged',false,'reason','invalid_ticket');
 end if;
 if rec.attempts>=12 then return jsonb_build_object('charged',false,'reason','daily_preview_limit'); end if;
 update private.dic_url_preview_attempts
 set attempts=rec.attempts+1,preview_ticket=null,preview_ticket_at=null where owner_id=me;
 return jsonb_build_object('charged',true);
end $fn$;

-- Exact source URL only, unambiguous already verified active canonical identity.
-- Existing sources retain their history; no writes or guessed release matching.
create or replace function public.dic_preview_cached_verified(p_source_url text)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare me uuid:=auth.uid(); ids uuid[]; coffee public.coffees;
begin
 if me is null or auth.role() is distinct from 'authenticated' or not private.is_member() then
  raise exception using errcode='42501',message='Admitted member required.';
 end if;
 if not exists(select 1 from auth.users u where u.id=me and u.email_confirmed_at is not null) then
  raise exception using errcode='42501',message='Email confirmation required.';
 end if;
 if p_source_url is null or length(p_source_url)>900 or
   p_source_url not like 'https://%' then return null; end if;
 select array_agg(distinct c.id) into ids
 from public.coffee_sources s join public.coffees c on c.id=s.coffee_id
 where s.source_url=p_source_url and s.source_kind='roaster_page'
   and c.verification_state='verified' and c.merged_into_id is null;
 if coalesce(array_length(ids,1),0)<>1 then return null; end if;
 select * into strict coffee from public.coffees where id=ids[1];
 return jsonb_build_object(
  'ok',true,'source','verified_catalog','cached',true,'source_url',p_source_url,
  'fields',jsonb_strip_nulls(jsonb_build_object(
   'name',coffee.name,'roaster',coffee.roaster,'release_label',coffee.release_label,
   'origin',coffee.origin,'process',coffee.process,'roast_level',coffee.roast_level,
   'variety',coffee.variety,'producer',coffee.producer,
   'elevation_m',coffee.elevation_m,'tasting_notes',coffee.tasting_notes,
   'summary',coffee.summary,'espresso_notes',coffee.espresso_notes)));
end $fn$;

revoke all on function public.dic_preview_preflight(boolean) from public,anon,authenticated;
grant execute on function public.dic_preview_preflight(boolean) to authenticated;
revoke all on function public.dic_preview_complete(uuid) from public,anon,authenticated;
grant execute on function public.dic_preview_complete(uuid) to authenticated;
revoke all on function public.dic_preview_cached_verified(text) from public,anon,authenticated;
grant execute on function public.dic_preview_cached_verified(text) to authenticated;
