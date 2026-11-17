-- Issue #509 R309, DEVELOPMENT ONLY: preserve the shared 15s preview cooldown
-- when the 24-hour daily claim counter rolls over. The live legacy service
-- worker/public universal RPC can otherwise admit a second attempt 3s later.
-- This changes only the branch order; no data backfill or production execution.
-- Existing ADMIN exemption, email admission, 12-per-day window, locked row and
-- SECURITY DEFINER/SET search_path as well as function privileges are preserved.
create or replace function private.dic_shared_preview_claim(account_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 rec private.dic_url_preview_attempts;
 clock timestamptz:=now();
begin
 if account_id is null or not exists(select 1 from auth.users u where u.id=account_id)
 then return jsonb_build_object('allowed',false,'reason','unknown_account');end if;
 -- Database-authoritative admin; require active admission and verified email.
 -- No untrusted client privilege flag or caller-supplied administrative role.
 if exists(
   select 1 from private.app_admins a
   join private.beta_members m on m.owner_id=a.owner_id
   join auth.users u on u.id=a.owner_id
   where a.owner_id=account_id and m.enabled and m.admitted_at is not null
     and u.email_confirmed_at is not null
 ) then return jsonb_build_object('allowed',true,'unlimited',true);end if;
 insert into private.dic_url_preview_attempts(owner_id,window_started_at,last_attempt_at,attempts)
 values(account_id,clock,clock-interval '1 minute',0)
 on conflict(owner_id) do nothing;
 select * into strict rec from private.dic_url_preview_attempts
 where owner_id=account_id for update;
 if rec.last_attempt_at>clock-interval '15 seconds'
 then return jsonb_build_object('allowed',false,'reason','preview_cooldown');end if;
 if rec.window_started_at<clock-interval '24 hours' then
  update private.dic_url_preview_attempts
   set window_started_at=clock,last_attempt_at=clock,attempts=1
   where owner_id=account_id;
  return jsonb_build_object('allowed',true);
 end if;
 if rec.attempts>=12 then return jsonb_build_object('allowed',false,'reason','daily_preview_limit');end if;
 update private.dic_url_preview_attempts
  set attempts=rec.attempts+1,last_attempt_at=clock
  where owner_id=account_id;
 return jsonb_build_object('allowed',true);
end $$;
