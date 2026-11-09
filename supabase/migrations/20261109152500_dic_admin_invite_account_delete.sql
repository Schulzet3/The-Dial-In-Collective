-- Owner-approved Issue #1676. STAGED ONLY: no hosted SQL/member/code changes without publication.
-- Hard account deletion is orchestrated by a JWT-gated, service-role-only Edge function.
-- The durable SQL request/phase and independent completion receipt make ambiguous failures retryable.
alter table private.beta_invites add column if not exists deleted_at timestamptz;
create table if not exists private.dic_admin_invite_delete_receipts (
 id bigint generated always as identity primary key,
 invite_id uuid not null references private.beta_invites(id),
 actor_id uuid references auth.users(id) on delete set null,
 deleted_at timestamptz not null default now()
);
alter table private.dic_admin_invite_delete_receipts enable row level security;
revoke all on private.dic_admin_invite_delete_receipts from public,anon,authenticated;
grant all on private.dic_admin_invite_delete_receipts to service_role;

create or replace function private.dic_admin_delete_invite(p_invite_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $fn$
declare actor uuid:=auth.uid(); item private.beta_invites;
begin
 perform private.require_member();
 if actor is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 if p_invite_id is null then raise exception using errcode='22023',message='Invite ID required.'; end if;
 select * into item from private.beta_invites where id=p_invite_id for update;
 if not found then raise exception using errcode='22023',message='Invitation unavailable.'; end if;
 if item.deleted_at is not null then
  return jsonb_build_object('ok',true,'deleted',true,'already_deleted',true);
 end if;
 update private.beta_invites
 set revoked_at=coalesce(revoked_at,now()),deleted_at=now() where id=p_invite_id;
 insert into private.dic_admin_invite_delete_receipts(invite_id,actor_id) values(p_invite_id,actor);
 return jsonb_build_object('ok',true,'deleted',true,'revoked',true);
end $fn$;
revoke all on function private.dic_admin_delete_invite(uuid) from public,anon,authenticated;
grant execute on function private.dic_admin_delete_invite(uuid) to authenticated;
create or replace function public.dic_admin_delete_invite(p_invite_id uuid)
returns jsonb language sql volatile security invoker set search_path='' as $fn$
 select private.dic_admin_delete_invite(p_invite_id);
$fn$;
revoke all on function public.dic_admin_delete_invite(uuid) from public,anon,authenticated;
grant execute on function public.dic_admin_delete_invite(uuid) to authenticated;

-- Hide deleted codes from dashboard, complete pages and filtered totals without
-- deleting prior redemption rows, raw hashes or non-secret audit history.
create or replace function private.dic_admin_access_overview()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin() then
  raise exception using errcode='42501', message='Administrator access required.';
 end if;
 return jsonb_build_object(
  'invites_total',(select count(*) from private.beta_invites where deleted_at is null),
  'invites',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',i.id,'label',i.label,'created_at',i.created_at,
      'expires_at',i.expires_at,'revoked_at',i.revoked_at,
      'uses',i.uses,'max_uses',i.max_uses,
      'status',case
       when i.revoked_at is not null then 'revoked'
       when i.expires_at is not null and i.expires_at<=now() then 'expired'
       when i.max_uses is not null and i.uses>=i.max_uses then 'used'
       else 'active' end
    ) order by i.created_at desc,i.id desc)
    from (select id,label,created_at,expires_at,revoked_at,uses,max_uses
     from private.beta_invites where deleted_at is null order by created_at desc,id desc limit 50) i
   ),'[]'::jsonb),
  'pending_deletions',coalesce((
    select jsonb_agg(jsonb_build_object(
     'id',op.id,'target_id',op.target_id,
     'email',op.expected_impact->>'email',
     'community_mode',op.community_mode,'phase',op.phase,
     'requested_at',op.requested_at
    ) order by op.requested_at desc,op.id desc)
    from private.dic_admin_account_delete_operations op
    where op.actor_id=auth.uid() and op.phase<>'completed'
   ),'[]'::jsonb),
  'members_total',(select count(*) from private.beta_members where admitted_at is not null),
  'members',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',m.owner_id,'email',u.email,'enabled',m.enabled,
      'admin',a.owner_id is not null,'admitted_at',m.admitted_at
    ) order by (a.owner_id is not null) desc,m.admitted_at desc,m.owner_id)
    from (
      select owner_id,enabled,admitted_at from private.beta_members
      where admitted_at is not null order by admitted_at desc,owner_id limit 50
    ) m
    join auth.users u on u.id=m.owner_id
    left join private.app_admins a on a.owner_id=m.owner_id
   ),'[]'::jsonb)
 );
end $$;
create or replace function private.dic_admin_records(p_kind text,p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $body$
declare n bigint; listing jsonb:='[]'::jsonb;
begin
 perform private.require_member();
 if auth.uid() is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 if p_kind is null or p_kind not in ('pending','conflicts','approved','shots','accounts','invites')
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
 elsif p_kind='invites' then
  -- Operator-only, bounded, historical invitations; never expose token hashes.
  select count(*) into n from private.beta_invites where deleted_at is null;
  select coalesce(jsonb_agg(v.row_data order by v.created_at desc,v.id desc),'[]'::jsonb) into listing
  from (select i.id,i.created_at,jsonb_build_object(
    'id',i.id,'label',i.label,'created_at',i.created_at,
    'expires_at',i.expires_at,'uses',i.uses,'max_uses',i.max_uses,
    'status',case
      when i.revoked_at is not null then 'revoked'
      when i.expires_at is not null and i.expires_at<=now() then 'expired'
      when i.max_uses is not null and i.uses>=i.max_uses then 'used'
      else 'active' end
   ) row_data from private.beta_invites i
   where i.deleted_at is null
   order by i.created_at desc,i.id desc limit p_limit offset p_offset) v;
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
end $body$;
create or replace function private.dic_admin_search_records(p_kind text,p_query text,p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $body$
declare n bigint; listing jsonb:='[]'::jsonb; q text;
begin
 perform private.require_member();
 if auth.uid() is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 if p_kind is null or p_kind not in ('pending','conflicts','approved','shots','accounts','invites')
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
 elsif p_kind='invites' then
  -- Operator-only, bounded, historical invitations; never expose token hashes.
  select count(*) into n from private.beta_invites i where i.deleted_at is null and (q='' or strpos(lower(concat_ws(' ',i.label,i.id::text,case when i.revoked_at is not null then 'revoked' when i.expires_at is not null and i.expires_at<=now() then 'expired' when i.max_uses is not null and i.uses>=i.max_uses then 'used' else 'active' end)),q)>0);
  select coalesce(jsonb_agg(v.row_data order by v.created_at desc,v.id desc),'[]'::jsonb) into listing
  from (select i.id,i.created_at,jsonb_build_object(
    'id',i.id,'label',i.label,'created_at',i.created_at,
    'expires_at',i.expires_at,'uses',i.uses,'max_uses',i.max_uses,
    'status',case
      when i.revoked_at is not null then 'revoked'
      when i.expires_at is not null and i.expires_at<=now() then 'expired'
      when i.max_uses is not null and i.uses>=i.max_uses then 'used'
      else 'active' end
   ) row_data from private.beta_invites i
   where i.deleted_at is null and (q='' or strpos(lower(concat_ws(' ',i.label,i.id::text,case when i.revoked_at is not null then 'revoked' when i.expires_at is not null and i.expires_at<=now() then 'expired' when i.max_uses is not null and i.uses>=i.max_uses then 'used' else 'active' end)),q)>0)
   order by i.created_at desc,i.id desc limit p_limit offset p_offset) v;
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
end $body$;

create table if not exists private.dic_admin_account_delete_operations (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references auth.users(id) on delete set null,
 target_id uuid not null,
 community_mode text not null check (community_mode in ('keep','remove')),
 expected_impact jsonb not null,
 phase text not null default 'requested'
  check (phase in ('requested','prepared','completed')),
 contributor_ids uuid[] not null default '{}'::uuid[],
 community_removed integer not null default 0,
 requested_at timestamptz not null default now(),
 prepared_at timestamptz,
 completed_at timestamptz
);
create unique index if not exists dic_admin_account_delete_one_active
 on private.dic_admin_account_delete_operations(target_id) where phase <> 'completed';
alter table private.dic_admin_account_delete_operations enable row level security;
revoke all on private.dic_admin_account_delete_operations from public,anon,authenticated;
grant all on private.dic_admin_account_delete_operations to service_role;

create or replace function private.dic_admin_account_delete_impact(p_member_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare member_email text;
begin
 select u.email into member_email from auth.users u
 join private.beta_members m on m.owner_id=u.id and m.admitted_at is not null
 where u.id=p_member_id;
 if not found then raise exception using errcode='22023',message='Admitted account unavailable.'; end if;
 return jsonb_build_object(
  'member_id',p_member_id,'email',member_email,
  'enabled',(select enabled from private.beta_members where owner_id=p_member_id),
  'shots',(select count(*) from public.shots where owner_id=p_member_id),
  'notes',(select count(*) from public.shot_notes where owner_id=p_member_id),
  'library_entries',(select count(*) from public.library_entries where owner_id=p_member_id),
  'submissions',(select count(*) from public.coffee_submissions where owner_id=p_member_id),
  'setups',(select count(*) from public.setups where owner_id=p_member_id),
  'community_shots',(select count(*) from private.contribution_links cl
    join private.contributors c on c.id=cl.contributor_id where c.owner_id=p_member_id),
  'eligible_community_shots',(select count(*) from private.contribution_links cl
    join private.contributors c on c.id=cl.contributor_id
    join public.community_shots cs on cs.id=cl.community_shot_id
    where c.owner_id=p_member_id and cs.quality_state='eligible'),
  'contributors',(select count(*) from private.contributors where owner_id=p_member_id)
 );
end $fn$;
revoke all on function private.dic_admin_account_delete_impact(uuid) from public,anon,authenticated;

create or replace function private.dic_admin_account_delete_preview(p_member_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare actor uuid:=auth.uid();
begin
 perform private.require_member();
 if actor is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 if p_member_id is null or p_member_id=actor or
    exists(select 1 from private.app_admins where owner_id=p_member_id) then
  raise exception using errcode='42501',message='Administrator accounts are protected.';
 end if;
 return private.dic_admin_account_delete_impact(p_member_id);
end $fn$;
revoke all on function private.dic_admin_account_delete_preview(uuid) from public,anon,authenticated;
grant execute on function private.dic_admin_account_delete_preview(uuid) to authenticated;
create or replace function public.dic_admin_account_delete_preview(p_member_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $fn$
 select private.dic_admin_account_delete_preview(p_member_id);
$fn$;
revoke all on function public.dic_admin_account_delete_preview(uuid) from public,anon,authenticated;
grant execute on function public.dic_admin_account_delete_preview(uuid) to authenticated;

create or replace function private.dic_admin_account_delete_request(
 p_member_id uuid,p_community_mode text,p_expected_impact jsonb
) returns jsonb language plpgsql volatile security definer set search_path='' as $fn$
declare actor uuid:=auth.uid(); actual jsonb; prior private.dic_admin_account_delete_operations; opid uuid;
begin
 perform private.require_member();
 if actor is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 if p_community_mode not in ('keep','remove') or p_community_mode is null
    or p_expected_impact is null or p_member_id is null then
  raise exception using errcode='22023',message='Invalid account deletion confirmation.';
 end if;
 if p_member_id=actor or exists(select 1 from private.app_admins where owner_id=p_member_id) then
  raise exception using errcode='42501',message='Administrator accounts are protected.';
 end if;
 select * into prior from private.dic_admin_account_delete_operations
 where target_id=p_member_id and phase<>'completed' for update;
 if found then
  if prior.actor_id<>actor or prior.community_mode<>p_community_mode then
   raise exception using errcode='23514',message='Another deletion is already in progress.';
  end if;
  return jsonb_build_object('ok',true,'operation_id',prior.id,'phase',prior.phase,'retry',true);
 end if;
 perform 1 from auth.users where id=p_member_id for update;
 actual:=private.dic_admin_account_delete_preview(p_member_id);
 if actual is distinct from p_expected_impact then
  raise exception using errcode='PT409',message='Account records changed. Review deletion impact again.';
 end if;
 insert into private.dic_admin_account_delete_operations(actor_id,target_id,community_mode,expected_impact)
 values(actor,p_member_id,p_community_mode,actual) returning id into opid;
 return jsonb_build_object('ok',true,'operation_id',opid,'phase','requested');
end $fn$;
revoke all on function private.dic_admin_account_delete_request(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function private.dic_admin_account_delete_request(uuid,text,jsonb) to authenticated;
create or replace function public.dic_admin_account_delete_request(
 p_member_id uuid,p_community_mode text,p_expected_impact jsonb
) returns jsonb language sql volatile security invoker set search_path='' as $fn$
 select private.dic_admin_account_delete_request(p_member_id,p_community_mode,p_expected_impact);
$fn$;
revoke all on function public.dic_admin_account_delete_request(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dic_admin_account_delete_request(uuid,text,jsonb) to authenticated;

-- This and finish are callable ONLY with server-side service_role credentials.
-- The Edge function separately verifies a fresh GoTrue admin identity and
-- current server-side admitted/admin membership before invoking this RPC.
create or replace function private.dic_admin_account_delete_prepare(p_operation_id uuid,p_actor_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $fn$
declare op private.dic_admin_account_delete_operations; ids uuid[]; actual jsonb; storage_blocked boolean:=false;
begin
 select * into op from private.dic_admin_account_delete_operations
 where id=p_operation_id for update;
 if not found or op.actor_id is distinct from p_actor_id then
  raise exception using errcode='42501',message='Deletion operation unavailable.';
 end if;
 if op.phase='completed' then return jsonb_build_object('ok',true,'completed',true); end if;
 if not exists(select 1 from private.app_admins where owner_id=p_actor_id)
    or not exists(select 1 from private.beta_members
       where owner_id=p_actor_id and enabled and admitted_at is not null) then
  raise exception using errcode='42501',message='Administrator no longer admitted.';
 end if;
 if exists(select 1 from private.app_admins where owner_id=op.target_id)
    or op.target_id=p_actor_id then
  raise exception using errcode='42501',message='Administrator accounts are protected.';
 end if;
 if op.phase='requested' then
  if not exists(select 1 from auth.users where id=op.target_id) then
   raise exception using errcode='23514',message='Target account is missing before preparation.';
  end if;
  -- Recheck the same preview under the service-side record lock.
  -- No JWT actor impersonation or unsafe service-role bypass of an admin check.
  actual:=private.dic_admin_account_delete_impact(op.target_id);
  if actual is distinct from op.expected_impact then
   raise exception using errcode='PT409',message='Account changed after confirmation.';
  end if;
  select coalesce(array_agg(c.id order by c.id),'{}'::uuid[]) into ids
  from private.contributors c where c.owner_id=op.target_id;
  -- Supabase Auth deletion refuses users who own Storage objects. Fail before
  -- changing admission when the live provider exposes that table.
  if to_regclass('storage.objects') is not null then
   execute 'select exists(select 1 from storage.objects where owner=$1 or owner_id=$1::text)'
     into storage_blocked using op.target_id;
   if storage_blocked then
    raise exception using errcode='23514',message='Member has Storage-owned objects; review before deletion.';
   end if;
  end if;
  -- Prevent deletion of prior actor audit evidence if a formerly privileged user
  -- was subsequently demoted. Do not silently erase immutable admin audits.
  if exists(select 1 from private.admin_content_edits where actor_id=op.target_id) then
   raise exception using errcode='23514',message='Historical administrative actor audit requires separate review.';
  end if;
  update private.beta_members set enabled=false where owner_id=op.target_id;
  -- Eliminate restrictive user references; retain minimum action/timestamp audit.
  update private.admin_content_edits
     set subject_owner_id=null,before_values='{}'::jsonb,after_values='{}'::jsonb
     where subject_owner_id=op.target_id;
  delete from private.dic_source_attempts where owner_id=op.target_id;
  update private.import_control
     set owner_only_exception_owner_id=null,owner_only_exception_approved_at=null,
         owner_only_exception_expires_at=null
     where owner_only_exception_owner_id=op.target_id;
  update private.dic_admin_account_delete_operations
     set phase='prepared',contributor_ids=ids,prepared_at=now()
     where id=op.id;
  op.phase:='prepared';op.contributor_ids:=ids;
 end if;
 return jsonb_build_object('ok',true,'target_id',op.target_id,'mode',op.community_mode,'phase',op.phase);
end $fn$;
revoke all on function private.dic_admin_account_delete_prepare(uuid,uuid) from public,anon,authenticated;
grant execute on function private.dic_admin_account_delete_prepare(uuid,uuid) to service_role;
create or replace function public.dic_admin_account_delete_prepare(p_operation_id uuid,p_actor_id uuid)
returns jsonb language sql volatile security invoker set search_path='' as $fn$
 select private.dic_admin_account_delete_prepare(p_operation_id,p_actor_id);
$fn$;
revoke all on function public.dic_admin_account_delete_prepare(uuid,uuid) from public,anon,authenticated;
grant execute on function public.dic_admin_account_delete_prepare(uuid,uuid) to service_role;

create or replace function private.dic_admin_account_delete_finish(p_operation_id uuid,p_actor_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $fn$
declare op private.dic_admin_account_delete_operations; removed integer:=0; community_ids uuid[]:='{}'::uuid[];
begin
 select * into op from private.dic_admin_account_delete_operations where id=p_operation_id for update;
 if not found or op.actor_id is distinct from p_actor_id then
  raise exception using errcode='42501',message='Deletion operation unavailable.';
 end if;
 if op.phase='completed' then
  return jsonb_build_object('ok',true,'completed',true,'community_removed',op.community_removed,'retry',true);
 end if;
 if op.phase<>'prepared' then raise exception using errcode='23514',message='Deletion was not prepared.'; end if;
 -- Never trust an edge-reported success alone. The DB verifies Auth is gone.
 if exists(select 1 from auth.users where id=op.target_id) then
  raise exception using errcode='23514',message='Auth account still exists.';
 end if;
 if op.community_mode='remove' then
  -- Capture IDs BEFORE removing their private association; only this member's
  -- immutable contributor IDs may be selected, including detached old shots.
  select coalesce(array_agg(cl.community_shot_id order by cl.community_shot_id),'{}'::uuid[])
    into community_ids from private.contribution_links cl
    where cl.contributor_id=any(op.contributor_ids);
  -- Keep private review audit records but remove public references to purged shots.
  update public.admin_reviews set community_shot_id=null
    where community_shot_id=any(community_ids);
  delete from private.contribution_links where community_shot_id=any(community_ids)
    and contributor_id=any(op.contributor_ids);
  delete from public.community_shots where id=any(community_ids);
  get diagnostics removed=row_count;
  -- Contributor tokens for removed data have no future weighting role.
  delete from private.contributors c where c.id=any(op.contributor_ids)
    and c.owner_id is null and not exists(
      select 1 from private.contribution_links cl where cl.contributor_id=c.id);
 end if;
 update private.dic_admin_account_delete_operations
  set phase='completed',community_removed=removed,completed_at=now() where id=op.id;
 return jsonb_build_object('ok',true,'completed',true,'community_removed',removed);
end $fn$;
revoke all on function private.dic_admin_account_delete_finish(uuid,uuid) from public,anon,authenticated;
grant execute on function private.dic_admin_account_delete_finish(uuid,uuid) to service_role;
create or replace function public.dic_admin_account_delete_finish(p_operation_id uuid,p_actor_id uuid)
returns jsonb language sql volatile security invoker set search_path='' as $fn$
 select private.dic_admin_account_delete_finish(p_operation_id,p_actor_id);
$fn$;
revoke all on function public.dic_admin_account_delete_finish(uuid,uuid) from public,anon,authenticated;
grant execute on function public.dic_admin_account_delete_finish(uuid,uuid) to service_role;
