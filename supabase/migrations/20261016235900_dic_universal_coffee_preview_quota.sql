-- Read-only universal coffee-page preview quota for an admitted member.
-- No service-role key leaves Supabase and no host allowlist is relaxed for
-- the separate trusted-source verifier. This function does NOT fetch URLs.
create or replace function public.dic_claim_universal_preview()
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 me uuid:=auth.uid();
 rec private.dic_url_preview_attempts;
 clock timestamptz:=now();
begin
 if me is null or current_setting('request.jwt.claim.role',true) is distinct from 'authenticated'
    or not private.is_member() then
  return jsonb_build_object('allowed',false,'reason','admitted_member_required');
 end if;
 if not exists(select 1 from auth.users u where u.id=me and u.email_confirmed_at is not null) then
  return jsonb_build_object('allowed',false,'reason','verify_email');
 end if;
 -- Shared quota with official-roaster preview: max 25 claims/account/day,
 -- and >=12 seconds between attempts, with a row-level concurrent lock.
 insert into private.dic_url_preview_attempts(owner_id,window_started_at,last_attempt_at,attempts)
 values(me,clock,clock-interval '1 minute',0)
 on conflict(owner_id) do nothing;
 select * into strict rec from private.dic_url_preview_attempts where owner_id=me for update;
 if rec.window_started_at<clock-interval '24 hours' then
  update private.dic_url_preview_attempts set window_started_at=clock,last_attempt_at=clock,
   attempts=1 where owner_id=me;
  return jsonb_build_object('allowed',true);
 end if;
 if rec.attempts>=25 then return jsonb_build_object('allowed',false,'reason','daily_preview_limit');end if;
 if rec.last_attempt_at>clock-interval '12 seconds' then
  return jsonb_build_object('allowed',false,'reason','preview_cooldown');
 end if;
 update private.dic_url_preview_attempts set attempts=rec.attempts+1,last_attempt_at=clock
 where owner_id=me;
 return jsonb_build_object('allowed',true);
end $$;

revoke all on function public.dic_claim_universal_preview() from public,anon,authenticated;
grant execute on function public.dic_claim_universal_preview() to authenticated;
comment on function public.dic_claim_universal_preview() is
 'Owner-only authenticated universal public-page preview rate claim, zero page data writes; shared quota with curated preview.';
