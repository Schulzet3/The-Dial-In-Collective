-- Issue #47: ADMINISTRATOR-ONLY, SOURCE-ONLY DRAFT.
-- This file must NOT be applied to hosted Supabase without a separate
-- explicit owner approval for a production database migration.
-- Ordinary members' RLS and anonymous Community DTOs stay unchanged.
create table private.admin_content_edits(
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 subject_owner_id uuid references auth.users(id),
 record_kind text not null check(record_kind in ('shot','submission','approved')),
 record_id uuid not null,
 before_revision bigint not null,
 reason text not null check(length(reason) between 8 and 1000),
 before_values jsonb not null,
 after_values jsonb not null,
 created_at timestamptz not null default now()
);
alter table private.admin_content_edits enable row level security;
revoke all on private.admin_content_edits from public,anon,authenticated;
grant all on private.admin_content_edits to service_role;
create policy no_direct_user_content_edits on private.admin_content_edits
for all to anon,authenticated using(false) with check(false);

create function private.dic_admin_records(p_kind text,p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $body$
declare n bigint; listing jsonb:='[]'::jsonb;
begin
 perform private.require_member();
 if auth.uid() is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 if p_kind not in ('pending','conflicts','approved','shots','accounts')
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
end $body$;

create function public.dic_admin_records(p_kind text,p_offset integer default 0,p_limit integer default 50)
returns jsonb language sql stable security invoker set search_path='' as $body$
 select private.dic_admin_records(p_kind,p_offset,p_limit);
$body$;

create function private.dic_admin_edit_record(
 p_record_id uuid,p_expected_revision bigint,p_details jsonb,p_reason text,p_kind text)
returns jsonb language plpgsql security definer set search_path='' as $body$
declare actor uuid; record_owner uuid; snapshot jsonb; after_snapshot jsonb;
 revision_after bigint; oldshot public.shots; oldsub public.coffee_submissions;
 oldcoffee public.coffees; notes_before text; k text; reason_text text;
begin
 actor:=private.require_member();
 if actor is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 reason_text:=btrim(coalesce(p_reason,''));
 if p_record_id is null or p_expected_revision is null or
   p_kind not in ('shot','submission','approved') or
   length(reason_text) not between 8 and 1000 or
   jsonb_typeof(p_details) is distinct from 'object' or
   octet_length(p_details::text)>30000 then
  raise exception using errcode='22023',message='Invalid correction request.';
 end if;
 if p_kind='shot' then
  if exists(select 1 from jsonb_object_keys(p_details) x where x not in
   ('dose_g','yield_g','time_s','grind_setting','temperature_c',
    'extraction','body','clarity','sweetness','astringency','notes')) then
   raise exception using errcode='22023',message='Forbidden shot correction field.';end if;
  select * into oldshot from public.shots where id=p_record_id for update;
  if not found then raise exception using errcode='22023',message='Shot unavailable.';end if;
  if oldshot.revision<>p_expected_revision then
   raise exception using errcode='40001',message='Shot changed; refresh before editing.';end if;
  record_owner:=oldshot.owner_id;
  select notes into notes_before from public.shot_notes
   where owner_id=oldshot.owner_id and shot_id=oldshot.id for update;
  snapshot:=jsonb_build_object('shot',to_jsonb(oldshot),'notes',notes_before);
  update public.shots set
   dose_g=coalesce(nullif(p_details->>'dose_g','')::numeric,oldshot.dose_g),
   yield_g=coalesce(nullif(p_details->>'yield_g','')::numeric,oldshot.yield_g),
   time_s=coalesce(nullif(p_details->>'time_s','')::numeric,oldshot.time_s),
   grind_setting=nullif(p_details->>'grind_setting','')::numeric,
   temperature_c=nullif(p_details->>'temperature_c','')::numeric,
   extraction=coalesce(nullif(p_details->>'extraction','')::smallint,oldshot.extraction),
   body=coalesce(nullif(p_details->>'body','')::smallint,oldshot.body),
   clarity=coalesce(nullif(p_details->>'clarity','')::smallint,oldshot.clarity),
   sweetness=coalesce(nullif(p_details->>'sweetness','')::smallint,oldshot.sweetness),
   astringency=coalesce(nullif(p_details->>'astringency','')::smallint,oldshot.astringency)
  where id=oldshot.id returning revision into revision_after;
  if p_details ? 'notes' then
   if length(coalesce(p_details->>'notes',''))>8000 then
    raise exception using errcode='22023',message='Notes too long.';end if;
   insert into public.shot_notes(owner_id,shot_id,notes)
    values(oldshot.owner_id,oldshot.id,coalesce(p_details->>'notes',''))
   on conflict(owner_id,shot_id) do update set notes=excluded.notes;
  end if;
  after_snapshot:=jsonb_build_object(
   'shot',(select to_jsonb(x) from public.shots x where x.id=oldshot.id),
   'notes',(select x.notes from public.shot_notes x where x.owner_id=oldshot.owner_id and x.shot_id=oldshot.id));
 elsif p_kind='submission' then
  if exists(select 1 from jsonb_object_keys(p_details) x where x not in
   ('name','roaster','release_label','origin','process','roast_level',
    'variety','producer','elevation_m','tasting_notes','summary','espressoNotes','source_url')) then
   raise exception using errcode='22023',message='Forbidden coffee correction field.';end if;
  select * into oldsub from public.coffee_submissions where id=p_record_id for update;
  if not found or oldsub.status not in ('pending','conflict') then
   raise exception using errcode='23514',message='Pending coffee unavailable.';end if;
  if oldsub.revision<>p_expected_revision then
   raise exception using errcode='40001',message='Coffee changed; refresh before editing.';end if;
  if length(btrim(coalesce(p_details->>'name','')))<1 or
     length(btrim(coalesce(p_details->>'roaster','')))<1 then
   raise exception using errcode='22023',message='Name and roaster required.';end if;
  if nullif(p_details->>'source_url','') is not null and
   (p_details->>'source_url') !~ '^https://[^[:space:]]+$' then
   raise exception using errcode='22023',message='HTTPS URL required.';end if;
  record_owner:=oldsub.owner_id;snapshot:=to_jsonb(oldsub);
  update public.coffee_submissions set
   proposed_data=oldsub.proposed_data||(p_details-'source_url'),
   source_url=nullif(btrim(coalesce(p_details->>'source_url',oldsub.source_url)),'')
  where id=oldsub.id returning revision into revision_after;
  after_snapshot:=(select to_jsonb(x) from public.coffee_submissions x where x.id=oldsub.id);
 else
  if exists(select 1 from jsonb_object_keys(p_details) x where x not in
   ('name','roaster','release_label','origin','process','roast_level',
    'variety','producer','elevation_m','tasting_notes','summary','espressoNotes','source_url')) then
   raise exception using errcode='22023',message='Forbidden approved coffee correction field.';end if;
  select * into oldcoffee from public.coffees where id=p_record_id for update;
  if not found or oldcoffee.verification_state<>'verified' or oldcoffee.merged_into_id is not null then
   raise exception using errcode='23514',message='Canonical coffee unavailable.';end if;
  if oldcoffee.revision<>p_expected_revision then
   raise exception using errcode='40001',message='Coffee changed; refresh before editing.';end if;
  if coalesce(p_details->>'name',oldcoffee.name) is distinct from oldcoffee.name or
   coalesce(p_details->>'roaster',oldcoffee.roaster) is distinct from oldcoffee.roaster or
   coalesce(p_details->>'release_label',coalesce(oldcoffee.release_label,'')) is distinct from coalesce(oldcoffee.release_label,'') then
   raise exception using errcode='23514',message='Approved canonical identity cannot be rewritten here.';end if;
  select s.owner_id into record_owner from private.dic_coffee_first_entry f
   join public.coffee_submissions s on s.id=f.first_submission_id where f.coffee_id=oldcoffee.id;
  snapshot:=to_jsonb(oldcoffee);
  update public.coffees set
   origin=nullif(p_details->>'origin',''),process=nullif(p_details->>'process',''),
   roast_level=nullif(p_details->>'roast_level',''),variety=nullif(p_details->>'variety',''),
   producer=nullif(p_details->>'producer',''),elevation_m=nullif(p_details->>'elevation_m',''),
   tasting_notes=nullif(p_details->>'tasting_notes',''),summary=nullif(p_details->>'summary',''),
   espresso_notes=nullif(p_details->>'espressoNotes','')
   where id=oldcoffee.id returning revision into revision_after;
  if nullif(btrim(p_details->>'source_url'),'') is not null then
   if (p_details->>'source_url') !~ '^https://[^[:space:]]+$' then
    raise exception using errcode='22023',message='HTTPS URL required.';end if;
   if not exists(select 1 from public.coffee_sources cs where cs.coffee_id=oldcoffee.id and cs.source_url=p_details->>'source_url') then
    insert into public.coffee_sources(coffee_id,source_url,source_kind,field_values,evidence_excerpt)
    values(oldcoffee.id,p_details->>'source_url','label','{}'::jsonb,'Administrator-supplied URL; not official verification.');
   end if;
  end if;
  after_snapshot:=(select to_jsonb(x) from public.coffees x where x.id=oldcoffee.id);
 end if;
 insert into private.admin_content_edits(actor_id,subject_owner_id,record_kind,record_id,
  before_revision,reason,before_values,after_values)
 values(actor,record_owner,p_kind,p_record_id,p_expected_revision,reason_text,snapshot,after_snapshot);
 return jsonb_build_object('ok',true,'revision',revision_after,'audited',true);
end $body$;

create function public.dic_admin_edit_shot(
 p_record_id uuid,p_expected_revision bigint,p_details jsonb,p_reason text,p_kind text)
returns jsonb language sql security invoker set search_path='' as $body$
 select private.dic_admin_edit_record(p_record_id,p_expected_revision,p_details,p_reason,p_kind);
$body$;
create function public.dic_admin_edit_coffee(
 p_record_id uuid,p_expected_revision bigint,p_details jsonb,p_reason text,p_kind text)
returns jsonb language sql security invoker set search_path='' as $body$
 select private.dic_admin_edit_record(p_record_id,p_expected_revision,p_details,p_reason,p_kind);
$body$;
revoke all on function private.dic_admin_records(text,integer,integer) from public,anon,authenticated;
revoke all on function private.dic_admin_edit_record(uuid,bigint,jsonb,text,text) from public,anon,authenticated;
grant execute on function private.dic_admin_records(text,integer,integer) to authenticated;
grant execute on function private.dic_admin_edit_record(uuid,bigint,jsonb,text,text) to authenticated;
revoke all on function public.dic_admin_records(text,integer,integer) from public,anon,authenticated;
revoke all on function public.dic_admin_edit_shot(uuid,bigint,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.dic_admin_edit_coffee(uuid,bigint,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.dic_admin_records(text,integer,integer) to authenticated;
grant execute on function public.dic_admin_edit_shot(uuid,bigint,jsonb,text,text) to authenticated;
grant execute on function public.dic_admin_edit_coffee(uuid,bigint,jsonb,text,text) to authenticated;
