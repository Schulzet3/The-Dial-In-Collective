-- Read-only universal coffee-page preview quota for an admitted member.
-- Independent of legacy official-preview quota to allow transparent fallback
-- without an immediate cooldown collision.
-- No service-role key leaves Supabase and no host allowlist is relaxed for
-- the separate trusted-source verifier. This function does NOT fetch URLs.
create table private.dic_universal_preview_attempts (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 window_started_at timestamptz not null default now(),
 last_attempt_at timestamptz not null default now(),
 attempts integer not null default 0 check(attempts between 0 and 60)
);
alter table private.dic_universal_preview_attempts enable row level security;
revoke all on private.dic_universal_preview_attempts from public,anon,authenticated;
grant all on private.dic_universal_preview_attempts to service_role;
create policy no_client_access on private.dic_universal_preview_attempts
 for all to anon,authenticated using(false) with check(false);

create or replace function public.dic_claim_universal_preview()
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 me uuid:=auth.uid();
 rec private.dic_universal_preview_attempts;
 clock timestamptz:=now();
begin
 if me is null or current_setting('request.jwt.claim.role',true) is distinct from 'authenticated'
    or not private.is_member() then
  return jsonb_build_object('allowed',false,'reason','admitted_member_required');
 end if;
 if not exists(select 1 from auth.users u where u.id=me and u.email_confirmed_at is not null) then
  return jsonb_build_object('allowed',false,'reason','verify_email');
 end if;
 -- Conservative anti-bot budget: 60 claims/account/day; >=3 seconds apart.
 -- Kept distinct from the legacy official-preview quota to avoid double spend
 -- when retrying a page whose official metadata parsing is too strict.
 insert into private.dic_universal_preview_attempts(owner_id,window_started_at,last_attempt_at,attempts)
 values(me,clock,clock-interval '1 minute',0)
 on conflict(owner_id) do nothing;
 select * into strict rec from private.dic_universal_preview_attempts where owner_id=me for update;
 if rec.window_started_at<clock-interval '24 hours' then
  update private.dic_universal_preview_attempts set window_started_at=clock,last_attempt_at=clock,
   attempts=1 where owner_id=me;
  return jsonb_build_object('allowed',true);
 end if;
 if rec.attempts>=60 then return jsonb_build_object('allowed',false,'reason','daily_preview_limit');end if;
 if rec.last_attempt_at>clock-interval '3 seconds' then
  return jsonb_build_object('allowed',false,'reason','preview_cooldown');
 end if;
 update private.dic_universal_preview_attempts set attempts=rec.attempts+1,last_attempt_at=clock
 where owner_id=me;
 return jsonb_build_object('allowed',true);
end $$;

revoke all on function public.dic_claim_universal_preview() from public,anon,authenticated;
grant execute on function public.dic_claim_universal_preview() to authenticated;
comment on function public.dic_claim_universal_preview() is
 'Owner-only authenticated universal public-page preview rate claim, zero page data writes; 60 per day and 3 second cooldown, independent curated source quota.';
