-- Audit fix, source only until separately approved for hosted application.
-- Modern PostgREST supplies request.jwt.claims rather than separate claim GUCs.
-- Explicit JSON role takes precedence; actual SQL EXECUTE grants remain required.
-- Recheck admission at every privileged source-worker boundary. Never rewrite
-- historical submissions, source evidence, member records, or earlier migrations.

create or replace function public.dic_source_check_target(submission_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s public.coffee_submissions; host text; cname text;
begin
 if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',
             nullif(current_setting('request.jwt.claim.role',true),'')) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Trusted source worker required.';
 end if;
 select * into s from public.coffee_submissions
 where id=submission_id and status in ('pending','conflict');
 if not found then return null; end if;
 if not exists(select 1 from private.beta_members where owner_id=s.owner_id and enabled) then
  return null;
 end if;
 select official_domain,canonical_name into host,cname
 from private.dic_roaster_directory
 where canonical_key=private.dic_canonical_roaster_key(s.proposed_data->>'roaster');
 if host is null or s.source_url is null then return null; end if;
 return jsonb_build_object('submission_id',s.id,'submission_revision',s.revision,'source_url',s.source_url,
  'official_host',host,'roaster',cname,'name',s.proposed_data->>'name',
  'release_label',s.proposed_data->>'release_label',
  'origin',s.proposed_data->>'origin','process',s.proposed_data->>'process');
end $$;
revoke all on function public.dic_source_check_target(uuid) from public,anon,authenticated;
grant execute on function public.dic_source_check_target(uuid) to service_role;

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
  and existing.window_started_at>now()-interval '24 hours'
  and (existing.attempts>=6 or existing.started_at>now()-interval '15 minutes') then
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

-- Keep the approved duplicate-first promotion body intact. Guard both exact
-- replacements so unexpected predecessor drift stops the migration atomically.
do $worker_guard$
declare
 definition text; old_role text:=$old$current_setting('request.jwt.claim.role',true)$old$;
 official_role_anchor text:=$role$if method='official_verified'
   and current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then$role$;
 official_role_guard text:=$guard$if method='official_verified'
   and (current_setting('role',true) is distinct from 'service_role'
     or coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',
             nullif(current_setting('request.jwt.claim.role',true),'')) is distinct from 'service_role') then$guard$;
 anchor text:=$anchor$if not found then raise exception using errcode='22023',message='Coffee submission unavailable.';end if;$anchor$;
 pending_anchor text:=$pending$if s.status not in ('pending','conflict') then$pending$;
 revision_guard text:=$revision$if method='official_verified' and evidence->>'submission_revision' is distinct from s.revision::text then
  raise exception using errcode='40001',message='Submission changed before source verification; refresh and retry.';
 end if;
 $revision$;
 admission text:=$admission$
 if method='official_verified' then
  perform 1 from private.beta_members where owner_id=s.owner_id and enabled for share;
  if not found then
   raise exception using errcode='42501',message='Admitted submission owner required for official verification.';
  end if;
 end if;$admission$;
begin
 definition:=pg_get_functiondef('private.dic_promote_pending_coffee(uuid,text,jsonb,boolean)'::regprocedure);
 if (length(definition)-length(replace(definition,old_role,''))) / length(old_role) <> 1
 or (length(definition)-length(replace(definition,anchor,''))) / length(anchor) <> 1
 or strpos(definition,official_role_anchor)=0
 or (length(definition)-length(replace(definition,pending_anchor,''))) / length(pending_anchor) <> 1 then
  raise exception 'Unexpected coffee promotion predecessor; review before applying worker auth fix';
 end if;
 -- This private helper is also granted to authenticated for member/admin modes.
 -- Its official-worker mode must require the actual SET ROLE as well as JWT.
 definition:=replace(definition,official_role_anchor,official_role_guard);
 definition:=replace(definition,anchor,anchor||admission);
 -- The row is already locked; evidence belongs to the exact target revision.
 -- Safe resolved-request replay returns before this new Pending-only check.
 definition:=replace(definition,pending_anchor,revision_guard||pending_anchor);
 execute definition;
end $worker_guard$;

create or replace function public.dic_trusted_source_verify(submission_id uuid,evidence jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',
             nullif(current_setting('request.jwt.claim.role',true),'')) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Trusted verifier only.';
 end if;
 return private.dic_promote_pending_coffee(submission_id,'official_verified',evidence,false);
end $$;
revoke all on function public.dic_trusted_source_verify(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.dic_trusted_source_verify(uuid,jsonb) to service_role;
