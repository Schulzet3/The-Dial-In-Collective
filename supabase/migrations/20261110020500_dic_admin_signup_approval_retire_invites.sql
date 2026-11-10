-- Issue #1756: owner replaces invitation-only beta with admin-approved new signups.
-- DEVELOPMENT ONLY: destructive retirement must NEVER be applied to production
-- before a new explicit owner publication command and verified encrypted recovery.
-- Existing admitted / disabled accounts, Auth identities, shots, notes and Community
-- are preserved; only invitation-code records and dedicated code-only logs are purged.
-- Owner Locked supersession: signup admission only. Coffee approval is unchanged.

alter table private.beta_members
 add column if not exists signup_review_state text not null default 'pending'
 check (signup_review_state in ('pending','approved','rejected'));
update private.beta_members set signup_review_state='approved'
 where admitted_at is not null and signup_review_state <> 'approved';

create table if not exists private.dic_signup_review_events (
 id bigint generated always as identity primary key,
 member_id uuid references auth.users(id) on delete set null,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('approve','reject')),
 previous_state text not null,
 reviewed_at timestamptz not null default now()
);
alter table private.dic_signup_review_events enable row level security;
revoke all on private.dic_signup_review_events from public,anon,authenticated;
grant all on private.dic_signup_review_events to service_role;

create or replace function private.session_status()
returns jsonb language sql stable security definer set search_path='' as $fn$
select jsonb_build_object(
 'authenticated',auth.uid() is not null,
 'admitted',private.is_member(),
 'admin',private.is_admin(),
 'emailVerified',exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null),
 'approvalState',coalesce((
   select case when m.admitted_at is not null and m.enabled then 'approved'
     when m.admitted_at is not null then 'revoked'
     else m.signup_review_state end
   from private.beta_members m where m.owner_id=auth.uid()),'pending'),
 'backupConfigured',false,'communityLive',false,'mode','owner-test');
$fn$;
revoke all on function private.session_status() from public,anon,authenticated;

create or replace function private.dic_admin_signup_requests(p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare total bigint; listing jsonb;
begin
 perform private.require_member();
 if auth.uid() is null or not private.is_admin() then
  raise exception using errcode='42501', message='Administrator required.';
 end if;
 if p_offset is null or p_offset<0 or p_offset>1000000
    or p_limit is null or p_limit<1 or p_limit>50 then
  raise exception using errcode='22023',message='Invalid paging.';
 end if;
 select count(*) into total from private.beta_members m
 where m.admitted_at is null and m.signup_review_state='pending';
 select coalesce(jsonb_agg(v.record order by v.created_at,v.id),'[]'::jsonb) into listing
 from (select m.owner_id as id,u.created_at,
   jsonb_build_object(
    'id',m.owner_id,'email',left(coalesce(u.email,''),254),
    'created_at',u.created_at,'email_verified',u.email_confirmed_at is not null,
    'review_state',m.signup_review_state
   ) as record
   from private.beta_members m join auth.users u on u.id=m.owner_id
   where m.admitted_at is null and m.signup_review_state='pending'
   order by u.created_at,m.owner_id limit p_limit offset p_offset) v;
 return jsonb_build_object('total',total,'offset',p_offset,'items',coalesce(listing,'[]'::jsonb));
end $fn$;
revoke all on function private.dic_admin_signup_requests(integer,integer) from public,anon,authenticated;
grant execute on function private.dic_admin_signup_requests(integer,integer) to authenticated;
create or replace function public.dic_admin_signup_requests(p_offset integer default 0,p_limit integer default 50)
returns jsonb language sql stable security invoker set search_path='' as $fn$
 select private.dic_admin_signup_requests(p_offset,p_limit);
$fn$;
revoke all on function public.dic_admin_signup_requests(integer,integer) from public,anon,authenticated;
grant execute on function public.dic_admin_signup_requests(integer,integer) to authenticated;

create or replace function private.dic_admin_review_signup(p_member_id uuid,p_action text,p_expected_state text default 'pending')
returns jsonb language plpgsql volatile security definer set search_path='' as $fn$
declare actor uuid:=auth.uid(); member private.beta_members; verified boolean;
begin
 perform private.require_member();
 if actor is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 if p_member_id is null or p_member_id=actor or p_action not in ('approve','reject')
  or p_expected_state<>'pending' then
  raise exception using errcode='22023',message='Invalid signup review.';
 end if;
 if exists(select 1 from private.app_admins where owner_id=p_member_id) then
  raise exception using errcode='42501',message='Administrator protected.';
 end if;
 select * into member from private.beta_members where owner_id=p_member_id for update;
 if not found or member.admitted_at is not null or member.enabled then
  raise exception using errcode='22023',message='Account not pending review.';
 end if;
 if member.signup_review_state <> p_expected_state then
  return jsonb_build_object('ok',false,'code','stale_review');
 end if;
 select u.email_confirmed_at is not null into verified
 from auth.users u where u.id=p_member_id;
 if p_action='approve' and verified is distinct from true then
  return jsonb_build_object('ok',false,'code','verify_email_first');
 end if;
 update private.beta_members set
   signup_review_state=case when p_action='approve' then 'approved' else 'rejected' end,
   enabled=(p_action='approve'),
   admitted_at=case when p_action='approve' then now() else null end
 where owner_id=p_member_id;
 insert into private.dic_signup_review_events(member_id,actor_id,action,previous_state)
 values(p_member_id,actor,p_action,member.signup_review_state);
 return jsonb_build_object('ok',true,'decision',p_action,'member_id',p_member_id);
end $fn$;
revoke all on function private.dic_admin_review_signup(uuid,text,text) from public,anon,authenticated;
grant execute on function private.dic_admin_review_signup(uuid,text,text) to authenticated;
create or replace function public.dic_admin_review_signup(p_member_id uuid,p_action text,p_expected_state text default 'pending')
returns jsonb language sql volatile security invoker set search_path='' as $fn$
 select private.dic_admin_review_signup(p_member_id,p_action,p_expected_state);
$fn$;
revoke all on function public.dic_admin_review_signup(uuid,text,text) from public,anon,authenticated;
grant execute on function public.dic_admin_review_signup(uuid,text,text) to authenticated;

-- Preserve the admitted Account and unfinished account-deletion Admin sections,
-- replacing the former invitation-code overview without silently hiding work.
create or replace function private.dic_admin_access_overview()
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
begin
 perform private.require_member();
 if auth.uid() is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator access required.';
 end if;
 return jsonb_build_object(
  'members_total',(select count(*) from private.beta_members where admitted_at is not null),
  'members',coalesce((
   select jsonb_agg(jsonb_build_object(
    'id',m.owner_id,'email',u.email,'enabled',m.enabled,
    'admin',a.owner_id is not null,'admitted_at',m.admitted_at
   ) order by (a.owner_id is not null) desc,m.admitted_at desc,m.owner_id)
   from (select owner_id,enabled,admitted_at from private.beta_members
     where admitted_at is not null order by admitted_at desc,owner_id limit 50) m
   join auth.users u on u.id=m.owner_id
   left join private.app_admins a on a.owner_id=m.owner_id
  ),'[]'::jsonb),
  'pending_deletions',coalesce((
   select jsonb_agg(jsonb_build_object(
    'id',op.id,'target_id',op.target_id,
    'email',op.expected_impact->>'email',
    'community_mode',op.community_mode,'phase',op.phase,'requested_at',op.requested_at
   ) order by op.requested_at desc,op.id desc)
   from private.dic_admin_account_delete_operations op
   where op.actor_id=auth.uid() and op.phase<>'completed'
  ),'[]'::jsonb)
 );
end $fn$;

CREATE OR REPLACE FUNCTION private.dic_admin_dashboard_read()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null or not private.is_admin() then
    raise exception using errcode='42501', message='Administrator access required.';
  end if;
  return jsonb_build_object(
    'review_only', true,
    'generated_at', now(),
    'counts', jsonb_build_object(
      'pending_coffees', (select count(*) from public.coffee_submissions where status='pending'),
      'conflicts', (select count(*) from public.coffee_submissions where status='conflict'),
      'pending_canonical', (select count(*) from public.coffees where verification_state='pending'),
      'verified_coffees', (select count(*) from public.coffees where verification_state='verified'),
      'active_accounts', (select count(*) from private.beta_members where enabled),
      'pending_accounts', (select count(*) from private.beta_members m where m.admitted_at is null and m.signup_review_state='pending'),
      'pending_verified_accounts', (select count(*) from private.beta_members m join auth.users u on u.id=m.owner_id where m.admitted_at is null and m.signup_review_state='pending' and u.email_confirmed_at is not null),
      'unfinished_account_deletions', (select count(*) from private.dic_admin_account_delete_operations where phase<>'completed'),
      'shot_records', (select count(*) from public.shots where hidden_at is null)
    ),
    'queue_total', (select count(*) from public.coffee_submissions where status in ('pending','conflict')),
    'queue', coalesce((
      select jsonb_agg(item.data order by item.created_at, item.id)
      from (
        select id, created_at,
          jsonb_build_object(
            'id', id,
            'created_at', created_at,
            'status', status,
            'revision', revision,
            'canonical_coffee_id', canonical_coffee_id,
            'base_coffee_revision', base_coffee_revision,
            'source_url', source_url,
            'name', left(coalesce(proposed_data->>'name',''),200),
            'roaster', left(coalesce(proposed_data->>'roaster',''),200),
            'release_label', left(coalesce(proposed_data->>'release_label',''),200),
            'origin', left(coalesce(proposed_data->>'origin',''),300),
            'process', left(coalesce(proposed_data->>'process',''),300),
            'roast_level', left(coalesce(proposed_data->>'roast_level',''),100)
          ) as data
        from public.coffee_submissions
        where status in ('pending','conflict')
        order by created_at, id
        limit 50
      ) item
    ),'[]'::jsonb),
    'backups', jsonb_build_object(
      'status', 'external_not_connected',
      'explanation', 'Backup results are verified in GitHub/Drive; this SQL endpoint does not assert backup freshness.'
    )
  );
end $function$;
CREATE OR REPLACE FUNCTION private.dic_admin_records(p_kind text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n bigint; listing jsonb:='[]'::jsonb;
begin
 perform private.require_member();
 if auth.uid() is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 if p_kind is null or p_kind not in ('pending','conflicts','approved','shots','accounts')
   or p_offset is null or p_offset<0 or p_offset>1000000
   or p_limit is null or p_limit<1 or p_limit>50 then
  raise exception using errcode='22023',message='Invalid listing parameters.';
 end if;
 if p_kind in ('pending','conflicts') then
  select count(*) into n from public.coffee_submissions s
   where s.status=case when p_kind='pending' then 'pending' else 'conflict' end;
  select coalesce(jsonb_agg(v.row_data order by v.created_at,v.id),'[]'::jsonb) into listing
  from (select s.id,s.created_at,jsonb_build_object(
   'id',s.id,'revision',s.revision,'status',s.status,'created_at',s.created_at,
   'creator_id',s.owner_id,'creator_email',u.email,'name',s.proposed_data->>'name',
   'roaster',s.proposed_data->>'roaster','release_label',s.proposed_data->>'release_label',
   'origin',s.proposed_data->>'origin','process',s.proposed_data->>'process',
   'roast_level',s.proposed_data->>'roast_level','variety',s.proposed_data->>'variety',
   'producer',s.proposed_data->>'producer','elevation_m',s.proposed_data->>'elevation_m',
   'tasting_notes',s.proposed_data->>'tasting_notes','summary',s.proposed_data->>'summary',
   'espressoNotes',s.proposed_data->>'espressoNotes','source_url',s.source_url
  ) row_data from public.coffee_submissions s
  left join auth.users u on u.id=s.owner_id
  where s.status=case when p_kind='pending' then 'pending' else 'conflict' end
  order by s.created_at,s.id limit p_limit offset p_offset) v;
 elsif p_kind='approved' then
  select count(*) into n from public.coffees where verification_state='verified' and merged_into_id is null;
  select coalesce(jsonb_agg(v.row_data order by v.created_at,v.id),'[]'::jsonb) into listing
  from (select c.id,c.created_at,jsonb_build_object(
   'id',c.id,'revision',c.revision,'created_at',c.created_at,
   'creator_id',s.owner_id,'creator_email',u.email,
   'name',c.name,'roaster',c.roaster,'release_label',c.release_label,
   'origin',c.origin,'process',c.process,'roast_level',c.roast_level,
   'variety',c.variety,'producer',c.producer,'elevation_m',c.elevation_m,
   'tasting_notes',c.tasting_notes,'summary',c.summary,'espressoNotes',c.espresso_notes,
   'source_url',(select x.source_url from public.coffee_sources x
    where x.coffee_id=c.id order by x.checked_at desc,x.id desc limit 1)
  ) row_data from public.coffees c
  left join private.dic_coffee_first_entry f on f.coffee_id=c.id
  left join public.coffee_submissions s on s.id=f.first_submission_id
  left join auth.users u on u.id=s.owner_id
  where c.verification_state='verified' and c.merged_into_id is null
  order by c.created_at,c.id limit p_limit offset p_offset) v;
 elsif p_kind='shots' then
  select count(*) into n from public.shots;
  select coalesce(jsonb_agg(v.row_data order by v.pulled_at desc,v.id desc),'[]'::jsonb) into listing
  from (select s.id,s.pulled_at,jsonb_build_object(
   'id',s.id,'revision',s.revision,'created_at',s.created_at,'pulled_at',s.pulled_at,
   'creator_id',s.owner_id,'creator_email',u.email,'hidden',s.hidden_at is not null,
   'coffee_name',coalesce(c.name,p.proposed_data->>'name','Coffee unavailable'),
   'library_entry_id',l.id,'coffee_id',l.coffee_id,'submission_id',l.submission_id,
   'coffee_roaster',coalesce(c.roaster,p.proposed_data->>'roaster',''),
   'style',s.style,'dose_g',s.dose_g,'yield_g',s.yield_g,'time_s',s.time_s,
   'grind_setting',s.grind_setting,'temperature_c',s.temperature_c,
   'extraction',s.extraction,'body',s.body,'clarity',s.clarity,
   'sweetness',s.sweetness,'astringency',s.astringency,'notes',notes.notes,
   'is_dialed_in',s.is_dialed_in
  ) row_data from public.shots s
  left join public.library_entries l on l.id=s.library_entry_id and l.owner_id=s.owner_id
  left join public.coffees c on c.id=l.coffee_id
  left join public.coffee_submissions p on p.id=l.submission_id
  left join public.shot_notes notes on notes.owner_id=s.owner_id and notes.shot_id=s.id
  left join auth.users u on u.id=s.owner_id
  order by s.pulled_at desc,s.id desc limit p_limit offset p_offset) v;
 else
  select count(*) into n from private.beta_members where admitted_at is not null;
  select coalesce(jsonb_agg(v.row_data order by v.admitted_at desc,v.id),'[]'::jsonb) into listing
  from (select m.owner_id id,m.admitted_at,jsonb_build_object(
   'id',m.owner_id,'email',u.email,'created_at',m.created_at,'admitted_at',m.admitted_at,
   'creator_id',m.owner_id,'creator_email',u.email,'enabled',m.enabled,
   'admin',a.owner_id is not null
  ) row_data from private.beta_members m
  left join auth.users u on u.id=m.owner_id
  left join private.app_admins a on a.owner_id=m.owner_id
  where m.admitted_at is not null
  order by m.admitted_at desc,m.owner_id limit p_limit offset p_offset) v;
 end if;
 return jsonb_build_object('kind',p_kind,'total',n,'offset',p_offset,
   'items',coalesce(listing,'[]'::jsonb));
end $function$;
CREATE OR REPLACE FUNCTION private.dic_admin_search_records(p_kind text, p_query text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n bigint; listing jsonb:='[]'::jsonb; q text;
begin
 perform private.require_member();
 if auth.uid() is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 if p_kind is null or p_kind not in ('pending','conflicts','approved','shots','accounts')
   or p_offset is null or p_offset<0 or p_offset>1000000
   or p_limit is null or p_limit<1 or p_limit>50 then
  raise exception using errcode='22023',message='Invalid listing parameters.';
 end if;
 if p_query is null or length(p_query)>80 then
  raise exception using errcode='22023',message='Invalid search query.';
 end if;
 q:=lower(btrim(p_query));
 if p_kind in ('pending','conflicts') then
  select count(*) into n from public.coffee_submissions s
   left join auth.users u on u.id=s.owner_id
   where s.status=case when p_kind='pending' then 'pending' else 'conflict' end and (q='' or strpos(lower(concat_ws(' ',s.proposed_data->>'name',s.proposed_data->>'roaster',s.proposed_data->>'release_label',s.proposed_data->>'origin',s.proposed_data->>'process',s.proposed_data->>'tasting_notes',s.source_url,u.email)),q)>0);
  select coalesce(jsonb_agg(v.row_data order by v.created_at,v.id),'[]'::jsonb) into listing
  from (select s.id,s.created_at,jsonb_build_object(
   'id',s.id,'revision',s.revision,'status',s.status,'created_at',s.created_at,
   'creator_id',s.owner_id,'creator_email',u.email,'name',s.proposed_data->>'name',
   'roaster',s.proposed_data->>'roaster','release_label',s.proposed_data->>'release_label',
   'origin',s.proposed_data->>'origin','process',s.proposed_data->>'process',
   'roast_level',s.proposed_data->>'roast_level','variety',s.proposed_data->>'variety',
   'producer',s.proposed_data->>'producer','elevation_m',s.proposed_data->>'elevation_m',
   'tasting_notes',s.proposed_data->>'tasting_notes','summary',s.proposed_data->>'summary',
   'espressoNotes',s.proposed_data->>'espressoNotes','source_url',s.source_url
  ) row_data from public.coffee_submissions s
  left join auth.users u on u.id=s.owner_id
  where s.status=case when p_kind='pending' then 'pending' else 'conflict' end and (q='' or strpos(lower(concat_ws(' ',s.proposed_data->>'name',s.proposed_data->>'roaster',s.proposed_data->>'release_label',s.proposed_data->>'origin',s.proposed_data->>'process',s.proposed_data->>'tasting_notes',s.source_url,u.email)),q)>0)
  order by s.created_at,s.id limit p_limit offset p_offset) v;
 elsif p_kind='approved' then
  select count(*) into n from public.coffees c
  left join private.dic_coffee_first_entry f on f.coffee_id=c.id
  left join public.coffee_submissions s on s.id=f.first_submission_id
  left join auth.users u on u.id=s.owner_id
  where c.verification_state='verified' and c.merged_into_id is null and (q='' or strpos(lower(concat_ws(' ',c.name,c.roaster,c.release_label,c.origin,c.process,c.producer,c.variety,c.tasting_notes,u.email)),q)>0);
  select coalesce(jsonb_agg(v.row_data order by v.created_at,v.id),'[]'::jsonb) into listing
  from (select c.id,c.created_at,jsonb_build_object(
   'id',c.id,'revision',c.revision,'created_at',c.created_at,
   'creator_id',s.owner_id,'creator_email',u.email,
   'name',c.name,'roaster',c.roaster,'release_label',c.release_label,
   'origin',c.origin,'process',c.process,'roast_level',c.roast_level,
   'variety',c.variety,'producer',c.producer,'elevation_m',c.elevation_m,
   'tasting_notes',c.tasting_notes,'summary',c.summary,'espressoNotes',c.espresso_notes,
   'source_url',(select x.source_url from public.coffee_sources x
    where x.coffee_id=c.id order by x.checked_at desc,x.id desc limit 1)
  ) row_data from public.coffees c
  left join private.dic_coffee_first_entry f on f.coffee_id=c.id
  left join public.coffee_submissions s on s.id=f.first_submission_id
  left join auth.users u on u.id=s.owner_id
  where c.verification_state='verified' and c.merged_into_id is null and (q='' or strpos(lower(concat_ws(' ',c.name,c.roaster,c.release_label,c.origin,c.process,c.producer,c.variety,c.tasting_notes,u.email)),q)>0)
  order by c.created_at,c.id limit p_limit offset p_offset) v;
 elsif p_kind='shots' then
  select count(*) into n from public.shots s
  left join public.library_entries l on l.id=s.library_entry_id and l.owner_id=s.owner_id
  left join public.coffees c on c.id=l.coffee_id
  left join public.coffee_submissions p on p.id=l.submission_id
  left join public.shot_notes notes on notes.owner_id=s.owner_id and notes.shot_id=s.id
  left join auth.users u on u.id=s.owner_id
  where (q='' or strpos(lower(concat_ws(' ',coalesce(c.name,p.proposed_data->>'name',''),coalesce(c.roaster,p.proposed_data->>'roaster',''),s.style,notes.notes,u.email)),q)>0);
  select coalesce(jsonb_agg(v.row_data order by v.pulled_at desc,v.id desc),'[]'::jsonb) into listing
  from (select s.id,s.pulled_at,jsonb_build_object(
   'id',s.id,'revision',s.revision,'created_at',s.created_at,'pulled_at',s.pulled_at,
   'creator_id',s.owner_id,'creator_email',u.email,'hidden',s.hidden_at is not null,
   'coffee_name',coalesce(c.name,p.proposed_data->>'name','Coffee unavailable'),
   'library_entry_id',l.id,'coffee_id',l.coffee_id,'submission_id',l.submission_id,
   'coffee_roaster',coalesce(c.roaster,p.proposed_data->>'roaster',''),
   'style',s.style,'dose_g',s.dose_g,'yield_g',s.yield_g,'time_s',s.time_s,
   'grind_setting',s.grind_setting,'temperature_c',s.temperature_c,
   'extraction',s.extraction,'body',s.body,'clarity',s.clarity,
   'sweetness',s.sweetness,'astringency',s.astringency,'notes',notes.notes,
   'is_dialed_in',s.is_dialed_in
  ) row_data from public.shots s
  left join public.library_entries l on l.id=s.library_entry_id and l.owner_id=s.owner_id
  left join public.coffees c on c.id=l.coffee_id
  left join public.coffee_submissions p on p.id=l.submission_id
  left join public.shot_notes notes on notes.owner_id=s.owner_id and notes.shot_id=s.id
  left join auth.users u on u.id=s.owner_id
  where (q='' or strpos(lower(concat_ws(' ',coalesce(c.name,p.proposed_data->>'name',''),coalesce(c.roaster,p.proposed_data->>'roaster',''),s.style,notes.notes,u.email)),q)>0)
  order by s.pulled_at desc,s.id desc limit p_limit offset p_offset) v;
 else
  select count(*) into n from private.beta_members m
  left join auth.users u on u.id=m.owner_id
  where m.admitted_at is not null and (q='' or strpos(lower(concat_ws(' ',u.email,m.owner_id::text,case when m.enabled then 'active' else 'removed' end)),q)>0);
  select coalesce(jsonb_agg(v.row_data order by v.admitted_at desc,v.id),'[]'::jsonb) into listing
  from (select m.owner_id id,m.admitted_at,jsonb_build_object(
   'id',m.owner_id,'email',u.email,'created_at',m.created_at,'admitted_at',m.admitted_at,
   'creator_id',m.owner_id,'creator_email',u.email,'enabled',m.enabled,
   'admin',a.owner_id is not null
  ) row_data from private.beta_members m
  left join auth.users u on u.id=m.owner_id
  left join private.app_admins a on a.owner_id=m.owner_id
  where m.admitted_at is not null and (q='' or strpos(lower(concat_ws(' ',u.email,m.owner_id::text,case when m.enabled then 'active' else 'removed' end)),q)>0)
  order by m.admitted_at desc,m.owner_id limit p_limit offset p_offset) v;
 end if;
 return jsonb_build_object('kind',p_kind,'total',n,'offset',p_offset,
   'items',coalesce(listing,'[]'::jsonb));
end $function$;

-- Permanently disable old issuance, redemption, revocation and individual-code deletion.
-- Preserve prior migration source history; no CASCADE and no live account deletion.
drop function if exists public.dic_redeem_invite(text);
drop function if exists private.redeem_beta_invite(text);
drop function if exists public.dic_admin_issue_invite(text);
drop function if exists private.dic_admin_issue_invite(text);
drop function if exists public.dic_admin_revoke_invite(uuid);
drop function if exists private.dic_admin_revoke_invite(uuid);
drop function if exists public.dic_admin_delete_invite(uuid);
drop function if exists private.dic_admin_delete_invite(uuid);

drop table if exists private.dic_admin_invite_delete_receipts;
drop table if exists private.invite_redemptions;
drop table if exists private.invite_attempts;
delete from private.admin_access_events where invite_id is not null
 or action in ('issue_invite','revoke_invite');
alter table private.admin_access_events drop column if exists invite_id;
drop table if exists private.beta_invites;

-- Abort the transaction if any obsolete invitation API persists.
do $safety$ begin
 if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and p.proname in
  ('dic_redeem_invite','redeem_beta_invite','dic_admin_issue_invite','dic_admin_revoke_invite','dic_admin_delete_invite')) then
  raise exception 'Invitation API was not fully retired.';
 end if;
 if to_regclass('private.beta_invites') is not null then
  raise exception 'Invitation tokens were not erased.';
 end if;
end $safety$;
