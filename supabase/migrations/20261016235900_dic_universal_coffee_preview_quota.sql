-- All user-initiated roaster-page previews share ONE per-account quota.
-- This migration is additive to the original trusted source verification;
-- it DOES NOT allow nonofficial webpages to approve a public coffee.
-- Owner-approved cooldown: >=30 seconds between any URL previews per user.
-- Engineering anti-abuse limit: 60 previews in a rolling 24-hour window.

-- Existing production has this table; the original ceiling was 25/day.
alter table private.dic_url_preview_attempts
 drop constraint if exists dic_url_preview_attempts_attempts_check;
alter table private.dic_url_preview_attempts
 add constraint dic_url_preview_attempts_attempts_check
 check (attempts between 0 and 60);

-- The shared internal function is intentionally inaccessible to clients:
-- the two public wrappers enforce separate service/member caller identities.
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
 if rec.attempts>=60 then return jsonb_build_object('allowed',false,'reason','daily_preview_limit');end if;
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

-- Preserve the original service-role-only official-roaster preview API.
create or replace function public.dic_url_preview_claim(account_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Trusted preview worker only.';
 end if;
 return private.dic_shared_preview_claim(account_id);
end $$;
revoke all on function public.dic_url_preview_claim(uuid) from public,anon,authenticated;
grant execute on function public.dic_url_preview_claim(uuid) to service_role;

-- New generic Netlify URL preview: authenticated member claims ONLY self.
-- Unverified webpage fields never touch the public canonical verification API.
create or replace function public.dic_claim_universal_preview()
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();
begin
 if me is null
  or current_setting('request.jwt.claim.role',true) is distinct from 'authenticated'
  or not private.is_member() then
  return jsonb_build_object('allowed',false,'reason','admitted_member_required');
 end if;
 if not exists(select 1 from auth.users u where u.id=me
  and u.email_confirmed_at is not null) then
  return jsonb_build_object('allowed',false,'reason','verify_email');
 end if;
 return private.dic_shared_preview_claim(me);
end $$;
revoke all on function public.dic_claim_universal_preview() from public,anon,authenticated;
grant execute on function public.dic_claim_universal_preview() to authenticated;
comment on function public.dic_claim_universal_preview() is
 'Admitted email-verified user claims own universal URL preview. Shared 30-second cooldown and 60-per-day quota with official preview; no public coffee writes.';
