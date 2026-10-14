-- Read-only source-verifier target. Authenticated users cannot introspect
-- other accounts' submissions through this service-role-only endpoint.
create function public.dic_source_check_target(submission_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s public.coffee_submissions; host text; cname text;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Trusted source worker required.';
 end if;
 select * into s from public.coffee_submissions
 where id=submission_id and status in ('pending','conflict');
 if not found then return null; end if;
 select official_domain,canonical_name into host,cname
 from private.dic_roaster_directory
 where canonical_key=private.dic_canonical_roaster_key(s.proposed_data->>'roaster');
 if host is null or s.source_url is null then return null; end if;
 return jsonb_build_object(
  'submission_id',s.id,
  'source_url',s.source_url,
  'official_host',host,
  'roaster',cname,
  'name',s.proposed_data->>'name',
  'release_label',s.proposed_data->>'release_label',
  'origin',s.proposed_data->>'origin',
  'process',s.proposed_data->>'process'
 );
end $$;
revoke all on function public.dic_source_check_target(uuid) from public,anon,authenticated;
grant execute on function public.dic_source_check_target(uuid) to service_role;


-- Protected per-submission budget. No remote fetch is issued unless this
-- atomic claim succeeds. This enforces at most six requests/day/submission
-- and thirty/day per beta account, minimum 15 minutes between retries.
create table private.dic_source_attempts(
 submission_id uuid primary key references public.coffee_submissions(id),
 owner_id uuid not null references auth.users(id),
 started_at timestamptz not null default now(),
 window_started_at timestamptz not null default now(),
 attempts integer not null default 0 check(attempts between 0 and 6)
);
alter table private.dic_source_attempts enable row level security;
revoke all on private.dic_source_attempts from public,anon,authenticated;
grant all on private.dic_source_attempts to service_role;
create function public.dic_source_claim(submission_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $
declare actor uuid; existing private.dic_source_attempts; total_24h integer;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Trusted worker required.';
 end if;
 select owner_id into actor from public.coffee_submissions
 where id=submission_id and status in ('pending','conflict');
 if actor is null then return jsonb_build_object('allowed',false,'reason','not_pending');end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,9470));
 select * into existing from private.dic_source_attempts where submission_id=dic_source_claim.submission_id for update;
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
 on conflict(submission_id) do update set
   started_at=now(),
   window_started_at=case when private.dic_source_attempts.window_started_at<now()-interval '24 hours'
      then now() else private.dic_source_attempts.window_started_at end,
   attempts=case when private.dic_source_attempts.window_started_at<now()-interval '24 hours'
      then 1 else private.dic_source_attempts.attempts+1 end;
 return jsonb_build_object('allowed',true);
end $;
revoke all on function public.dic_source_claim(uuid) from public,anon,authenticated;
grant execute on function public.dic_source_claim(uuid) to service_role;

-- srsltid is a Shopify/Google search click tag, never a coffee variant.
-- Only explicitly well-known tracking keys are ignored; variant remains.
create or replace function private.dic_source_key(value text) returns text
language plpgsql stable set search_path='' as $$
declare raw text; path text; params text; kept text:=''; part text;
begin
 raw:=btrim(coalesce(value,''));
 if raw !~* '^https?://[^/?#[:space:]]+' or length(raw)>4000 then return null;end if;
 raw:=split_part(raw,'#',1);
 raw:=regexp_replace(raw,'^https?://(www\.)?','','i');
 path:=split_part(raw,'?',1);
 if path='' then return null;end if;
 params:=case when strpos(raw,'?')>0 then substring(raw from strpos(raw,'?')+1) else '' end;
 if params<>'' then
  foreach part in array string_to_array(params,'&') loop
   if split_part(lower(part),'=',1)!~'^utm_' and
     lower(split_part(part,'=',1)) not in ('gclid','fbclid','msclkid','srsltid')
       and part<>'' then
    kept:=concat_ws('&',nullif(kept,''),part);
   end if;
  end loop;
 end if;
 return lower(rtrim(path,'/'))||case when kept<>'' then '?'||kept else '' end;
end $$;
-- Original grant posture: client users cannot execute normalization directly.
revoke all on function private.dic_source_key(text) from public,anon,authenticated;
