-- Issue #52 source-only. Preserve existing operator identity/RLS/ACL and all shot data.
-- New fields are read-only IDs solely for correct coffee-grouped admin display.
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
  select count(*) into n from private.beta_invites;
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
