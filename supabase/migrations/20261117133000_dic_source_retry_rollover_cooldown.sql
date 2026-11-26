-- Issue #509 R311: preserve the existing 15-minute trusted source worker
-- retry cooldown independently of the 24-hour request budget reset.
-- Development-source only; no production SQL execution authorized.
-- Preserve privileges, admission gates, session role validation and history.
create or replace function public.dic_source_claim(submission_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $claim$
declare actor uuid; existing private.dic_source_attempts; total_24h integer;
begin
 if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',
             nullif(current_setting('request.jwt.claim.role',true),'')) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Trusted worker required.';
 end if;
 select owner_id into actor from public.coffee_submissions
 where id=submission_id and status in ('pending','conflict');
 if actor is null then return jsonb_build_object('allowed',false,'reason','not_pending');end if;
 -- Share lock keeps admission stable for this atomic budget claim.
 perform 1 from private.beta_members where owner_id=actor and enabled for share;
 if not found then return jsonb_build_object('allowed',false,'reason','not_admitted');end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,9470));
 select attempts.* into existing from private.dic_source_attempts as attempts
 where attempts.submission_id=dic_source_claim.submission_id for update;
 select coalesce(sum(attempts),0) into total_24h from private.dic_source_attempts
 where owner_id=actor and window_started_at>now()-interval '24 hours';
 if total_24h>=30 then return jsonb_build_object('allowed',false,'reason','account_budget');end if;
 if existing.submission_id is not null
  and (existing.started_at>now()-interval '15 minutes'
    or (existing.window_started_at>now()-interval '24 hours' and existing.attempts>=6)) then
  return jsonb_build_object('allowed',false,'reason','retry_later');
 end if;
 insert into private.dic_source_attempts(submission_id,owner_id,started_at,window_started_at,attempts)
 values(dic_source_claim.submission_id,actor,now(),now(),1)
 on conflict on constraint dic_source_attempts_pkey do update set
  started_at=now(),
  window_started_at=case when private.dic_source_attempts.window_started_at<=now()-interval '24 hours'
   then now() else private.dic_source_attempts.window_started_at end,
  attempts=case when private.dic_source_attempts.window_started_at<=now()-interval '24 hours'
   then 1 else private.dic_source_attempts.attempts+1 end;
 return jsonb_build_object('allowed',true);
end $claim$;
revoke all on function public.dic_source_claim(uuid) from public,anon,authenticated;
grant execute on function public.dic_source_claim(uuid) to service_role;
