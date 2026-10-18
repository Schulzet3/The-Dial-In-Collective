-- Owner-approved starting quota (COFFEE-URL-DAILY-20261016-02).
-- Exactly one shared per-member limit across both trusted and universal URL
-- preview routes; do not weaken the existing 30-second cooldown or member checks.
-- Current budget-window semantics are 24h from the first allowed claim, not
-- a strict trailing-event sliding window. No new preview data is collected.
--
-- This additive migration does NOT publish a frontend, verify pending coffees,
-- alter provider settings or modify shot/history/community records.

-- Replace the older 60-maximum table guard. If a member used >12 previews
-- during the still-active window, retain their exhausted state as 12 rather
-- than resetting to 0 or granting extra previews. Keep window timestamps.
alter table private.dic_url_preview_attempts
 drop constraint if exists dic_url_preview_attempts_attempts_check;
update private.dic_url_preview_attempts
 set attempts=12 where attempts>12;
alter table private.dic_url_preview_attempts
 add constraint dic_url_preview_attempts_attempts_check
 check (attempts between 0 and 12);

-- This function is still intentionally private. Both public wrappers use it,
-- so switching between trusted/unknown roasters cannot double the allowance.
create or replace function private.dic_shared_preview_claim(account_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 rec private.dic_url_preview_attempts;
 clock timestamptz:=now();
begin
 if account_id is null or not exists(select 1 from auth.users u where u.id=account_id)
 then return jsonb_build_object('allowed',false,'reason','unknown_account');end if;
 insert into private.dic_url_preview_attempts(owner_id,window_started_at,last_attempt_at,attempts)
 values(account_id,clock,clock-interval '1 minute',0)
 on conflict(owner_id) do nothing;
 select * into strict rec from private.dic_url_preview_attempts
 where owner_id=account_id for update;
 if rec.window_started_at<clock-interval '24 hours' then
  update private.dic_url_preview_attempts
   set window_started_at=clock,last_attempt_at=clock,attempts=1
   where owner_id=account_id;
  return jsonb_build_object('allowed',true);
 end if;
 if rec.attempts>=12 then return jsonb_build_object('allowed',false,'reason','daily_preview_limit');end if;
 if rec.last_attempt_at>clock-interval '30 seconds'
 then return jsonb_build_object('allowed',false,'reason','preview_cooldown');end if;
 update private.dic_url_preview_attempts
  set attempts=rec.attempts+1,last_attempt_at=clock
  where owner_id=account_id;
 return jsonb_build_object('allowed',true);
end $$;
revoke all on function private.dic_shared_preview_claim(uuid)
 from public,anon,authenticated;
grant execute on function private.dic_shared_preview_claim(uuid) to service_role;

-- Existing member and JWT checks in public.dic_claim_universal_preview()
-- remain unchanged; the service-role trusted wrapper also remains unchanged.
comment on function public.dic_claim_universal_preview() is
 'JWT-compatible admitted email-verified member. Shared 30-second URL preview cooldown and 12 claims per 24-hour budget window across all roasters. No public coffee writes.';
comment on function public.dic_url_preview_claim(uuid) is
 'Service-role trusted preview wrapper. Same account-wide 30-second cooldown and 12-claims-per-24-hour budget as the universal preview. No URLs stored.';
