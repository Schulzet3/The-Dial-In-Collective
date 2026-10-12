-- The Dial In Collective: authenticated status and revocable invite redemption.
-- No real members or administrators are provisioned by this migration.
create table private.invite_attempts (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null default now(), attempts integer not null default 0
);
create table private.invite_redemptions (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 invite_id uuid not null references private.beta_invites(id), redeemed_at timestamptz not null default now()
);
create index invite_redemptions_invite_idx on private.invite_redemptions(invite_id);
alter table private.invite_attempts enable row level security;
alter table private.invite_redemptions enable row level security;
revoke all on private.invite_attempts,private.invite_redemptions from public,anon,authenticated;
grant all on private.invite_attempts,private.invite_redemptions to service_role;
create policy no_client_access on private.invite_attempts for all to anon,authenticated using(false) with check(false);
create policy no_client_access on private.invite_redemptions for all to anon,authenticated using(false) with check(false);
create function private.session_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('authenticated',auth.uid() is not null,'admitted',private.is_member(),'admin',private.is_admin(),
 'emailVerified',exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null),
 'backupConfigured',false,'communityLive',false,'mode','owner-test');
$$;
create function private.redeem_beta_invite(token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); inv private.beta_invites; m private.beta_members; attempts_now integer;
begin
 if uid is null then raise exception using errcode='42501',message='Sign in first.'; end if;
 if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then return jsonb_build_object('ok',false,'code','verify_email'); end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,1729));
 select * into m from private.beta_members where owner_id=uid;
 if m.enabled then return jsonb_build_object('ok',true); end if;
 if m.admitted_at is not null then return jsonb_build_object('ok',false,'code','access_revoked'); end if;
 insert into private.invite_attempts(owner_id,attempts) values(uid,1) on conflict(owner_id) do update set
 attempts=case when private.invite_attempts.window_start<now()-interval '1 hour' then 1 else private.invite_attempts.attempts+1 end,
 window_start=case when private.invite_attempts.window_start<now()-interval '1 hour' then now() else private.invite_attempts.window_start end
 returning attempts into attempts_now;
 if attempts_now>10 then return jsonb_build_object('ok',false,'code','rate_limited'); end if;
 if token is null or length(token) not between 32 and 200 then return jsonb_build_object('ok',false,'code','invalid_invite'); end if;
 select * into inv from private.beta_invites where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') for update;
 if not found or inv.revoked_at is not null or (inv.expires_at is not null and inv.expires_at<=now()) or (inv.max_uses is not null and inv.uses>=inv.max_uses) then return jsonb_build_object('ok',false,'code','invalid_invite'); end if;
 update private.beta_invites set uses=uses+1 where id=inv.id;
 update private.beta_members set enabled=true,admitted_at=now() where owner_id=uid;
 insert into private.invite_redemptions(owner_id,invite_id) values(uid,inv.id);
 return jsonb_build_object('ok',true);
end $$;
revoke all on function private.session_status(),private.redeem_beta_invite(text) from public,anon,authenticated;
grant execute on function private.session_status(),private.redeem_beta_invite(text) to authenticated;
create function public.dic_session_status() returns jsonb language sql security invoker set search_path='' as $$ select private.session_status(); $$;
create function public.dic_redeem_invite(token text) returns jsonb language sql security invoker set search_path='' as $$ select private.redeem_beta_invite(token); $$;
revoke all on function public.dic_session_status(),public.dic_redeem_invite(text) from public,anon,authenticated;
grant execute on function public.dic_session_status(),public.dic_redeem_invite(text) to authenticated;
