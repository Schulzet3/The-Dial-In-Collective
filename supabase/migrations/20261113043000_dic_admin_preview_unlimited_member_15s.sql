-- Issue #2386: owner-approved per-account URL preview changes, DEVELOPMENT ONLY.
-- Admins: unlimited per-account previews/retries; other admitted members:
-- 12 charged fresh URL previews per 24h and shared 15-second cooldown.
-- Does not alter public IP abuse limits, TLS/SSRF controls, admission, or source verification.
-- Additive migration; no historical member/shot/coffee/quota row edits.

-- Shared legacy trusted worker and universal URL claim. The trusted worker's
-- service role supplies the account_id; auth.uid() is NOT its member identity.
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
 if rec.window_started_at<clock-interval '24 hours' then
  update private.dic_url_preview_attempts
   set window_started_at=clock,last_attempt_at=clock,attempts=1
   where owner_id=account_id;
  return jsonb_build_object('allowed',true);
 end if;
 if rec.attempts>=12 then return jsonb_build_object('allowed',false,'reason','daily_preview_limit');end if;
 if rec.last_attempt_at>clock-interval '15 seconds'
 then return jsonb_build_object('allowed',false,'reason','preview_cooldown');end if;
 update private.dic_url_preview_attempts
  set attempts=rec.attempts+1,last_attempt_at=clock
  where owner_id=account_id;
 return jsonb_build_object('allowed',true);
end $$;
revoke all on function private.dic_shared_preview_claim(uuid) from public,anon,authenticated;
grant execute on function private.dic_shared_preview_claim(uuid) to service_role;

-- Netlify universal preview: both cached and fresh preview paths must test
-- the admitted signed-in role before reading/writing any per-account quota.
create or replace function public.dic_preview_preflight(p_cached boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 me uuid:=auth.uid();
 rec private.dic_url_preview_attempts;
 clock timestamptz:=now();
 ticket uuid;
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
 -- Admin ticket only acknowledges a read-only preview. No account cap,
 -- waiting, counter row mutation, or serialized ticket lock for admins.
 if private.is_admin() then
  if p_cached then
   return jsonb_build_object('allowed',true,'cached',true,'unlimited',true);
  end if;
  return jsonb_build_object('allowed',true,'ticket',gen_random_uuid(),'unlimited',true);
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
 if rec.last_attempt_at>clock-interval '15 seconds' then
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
end $$;

-- Completion still enforces valid ticket and per-account 12/day for ordinary
-- members. Admin preview is read-only and has no per-account quota to charge.
create or replace function public.dic_preview_complete(p_ticket uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 me uuid:=auth.uid();
 rec private.dic_url_preview_attempts;
begin
 if me is null or auth.role() is distinct from 'authenticated' or not private.is_member() then
  return jsonb_build_object('charged',false,'reason','admitted_member_required');
 end if;
 if p_ticket is null then return jsonb_build_object('charged',false,'reason','invalid_ticket'); end if;
 if private.is_admin()
   and exists(select 1 from auth.users u where u.id=me and u.email_confirmed_at is not null) then
  return jsonb_build_object('charged',true,'unlimited',true);
 end if;
 select * into rec from private.dic_url_preview_attempts where owner_id=me for update;
 if not found or rec.preview_ticket is distinct from p_ticket or
   rec.preview_ticket_at is null or rec.preview_ticket_at<now()-interval '25 seconds' then
  return jsonb_build_object('charged',false,'reason','invalid_ticket');
 end if;
 if rec.attempts>=12 then return jsonb_build_object('charged',false,'reason','daily_preview_limit'); end if;
 update private.dic_url_preview_attempts
 set attempts=rec.attempts+1,preview_ticket=null,preview_ticket_at=null where owner_id=me;
 return jsonb_build_object('charged',true);
end $$;
comment on function private.dic_shared_preview_claim(uuid) is
 'Service-only shared trusted preview account claim. Database-verified admitted email-verified admins unlimited; other accounts 12/24h and 15s cooldown. No source/coffee data writes.';
comment on function public.dic_claim_universal_preview() is
 'JWT-compatible admitted email-verified member preview. Database-verified admins unlimited; other members shared 12/24h and 15s cooldown. No public coffee writes.';
comment on function public.dic_url_preview_claim(uuid) is
 'Service-role trusted-roaster worker wrapper; verified admins unlimited, other members shared 12/24h and 15s cooldown. Retains trusted-source verification.';
comment on function public.dic_preview_preflight(boolean) is
 'Authenticated admitted member cached/fresh preview rate claim; verified admins exempt from per-account quota and cooldown, other members 15s/12-per-day.';
comment on function public.dic_preview_complete(uuid) is
 'Completes read-only preview. Ordinary member ticket is checked and charged at most 12/day; admitted verified administrators exempt.';
