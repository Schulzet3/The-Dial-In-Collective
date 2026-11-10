-- Issue #509: explicit NULL p_cached is invalid; never mint an unchargeable
-- preview ticket when quota is exhausted. Preserve false/true/default semantics.
-- Additive development source ONLY; no provider changes, no historic edits.
CREATE OR REPLACE FUNCTION public.dic_preview_preflight(p_cached boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=auth.uid(); rec private.dic_url_preview_attempts; clock timestamptz:=now(); ticket uuid;
begin
 if me is null or auth.role() is distinct from 'authenticated' or not private.is_member() then
  return jsonb_build_object('allowed',false,'reason','admitted_member_required');
 end if;
 if not exists(select 1 from auth.users u where u.id=me and u.email_confirmed_at is not null) then
  return jsonb_build_object('allowed',false,'reason','verify_email');
 end if;
 if p_cached is null then
  return jsonb_build_object('allowed',false,'reason','invalid_cached_flag');
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
end $function$;
