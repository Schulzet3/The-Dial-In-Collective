-- Issue #180 STAGED ONLY: release approval is separately required.
-- Only new, approved source-bound coffee information is enriched.
alter table public.coffees add column if not exists is_decaf boolean not null default false;
alter table public.coffees add column if not exists decaffeination_method text;
alter table public.coffees add constraint coffee_decaffeination_method_values_check
 check (decaffeination_method is null or decaffeination_method in
 ('Water Process','Sugar Process','Carbon Dioxide (CO2)'));
alter table public.coffees add constraint coffee_decaffeination_only_when_decaf_check
 check (is_decaf or decaffeination_method is null);
-- The original, first approved submission for a newly minted canonical
-- coffee can carry this field. Never use a member's duplicate match, a
-- later correction or a different member's pending record to overwrite
-- someone else's approved catalog data.
create or replace function private.dic_capture_first_decaf_method()
returns trigger language plpgsql security definer set search_path='' as $dic$
declare decaf boolean; method text; title text;
begin
 if new.status<>'approved' or new.canonical_coffee_id is null
  or old.status='approved' then return new; end if;
 if not exists (select 1 from private.dic_coffee_first_entry first
  where first.coffee_id=new.canonical_coffee_id and first.first_submission_id=new.id)
 then return new; end if;
 select c.name into title from public.coffees c where c.id=new.canonical_coffee_id;
 decaf := (coalesce(new.proposed_data->>'is_decaf','false')='true'
   or title ~* '(^|[^[:alnum:]])decaf(feinated)?([^[:alnum:]]|$)')
   and title !~* '(^|[^[:alnum:]])(half[ -]?caf|semi[ -]?decaf|partially[ -]?decaf)';
 method := nullif(btrim(coalesce(new.proposed_data->>'decaffeination_method','')),'');
 if method not in ('Water Process','Sugar Process','Carbon Dioxide (CO2)') then method:=null; end if;
 update public.coffees c set is_decaf=decaf,
  decaffeination_method=case when decaf then method else null end
 where c.id=new.canonical_coffee_id and c.decaffeination_method is null;
 return new;
end;
$dic$;
drop trigger if exists dic_capture_first_decaf_method on public.coffee_submissions;
create trigger dic_capture_first_decaf_method
after update of status,canonical_coffee_id on public.coffee_submissions
for each row when (new.status='approved' and new.canonical_coffee_id is not null)
execute function private.dic_capture_first_decaf_method();
revoke all on function private.dic_capture_first_decaf_method() from public,anon,authenticated;

-- Restore the existing server-owned owner/revision/verified-correction RPC
-- verbatim except for additive decaf validation and safe optional keys.
CREATE OR REPLACE FUNCTION private.dic_edit_my_coffee(p_library_entry uuid, p_expected_revision bigint, p_details jsonb, p_source_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 u uuid:=private.require_member();
 lib public.library_entries; sub public.coffee_submissions; canonical public.coffees;
 clean jsonb; k text; value text; name_text text; roaster_text text; url_text text;
 updated_id uuid;
begin
 if p_library_entry is null or p_expected_revision is null or p_expected_revision<1 or
    jsonb_typeof(p_details) is distinct from 'object' or octet_length(p_details::text)>8000 then
   raise exception using errcode='22023',message='Invalid coffee edit request.';
 end if;
 for k in select jsonb_object_keys(p_details) loop
  if k not in ('name','roaster','release_label','origin','roast_level',
      'elevation_m','process','is_decaf','decaffeination_method','variety','producer','tasting_notes') then
   raise exception using errcode='22023',message='Unsupported coffee detail.';
  end if;
  if k='is_decaf' then
   if jsonb_typeof(p_details->k) is distinct from 'boolean' then
    raise exception using errcode='22023',message='Decaf flag must be a boolean.';
   end if;
  else
   if jsonb_typeof(p_details->k) not in ('null','string') then
    raise exception using errcode='22023',message='Coffee details must be text.';
   end if;
   value:=nullif(btrim(p_details->>k),'');
   if length(value)>(case when k='tasting_notes' then 2000 else 300 end) then
    raise exception using errcode='22023',message='Coffee detail is too long.';
   end if;
  end if;
 end loop;
 name_text:=nullif(btrim(p_details->>'name'),'');
 roaster_text:=nullif(btrim(p_details->>'roaster'),'');
 if name_text is null or length(name_text)>200 or roaster_text is null or length(roaster_text)>200 then
  raise exception using errcode='22023',message='Coffee name and roaster are required.';
 end if;
 if nullif(btrim(p_details->>'roast_level'),'') is not null
   and p_details->>'roast_level' not in
      ('Ultra Light','Very Light','Light','Medium-Light','Medium','Medium-Dark','Dark') then
  raise exception using errcode='22023',message='Choose a recognized roast level.';
 end if;
 if p_details ? 'decaffeination_method' and
    nullif(btrim(p_details->>'decaffeination_method'),'') is not null and
    p_details->>'decaffeination_method' not in ('Water Process','Sugar Process','Carbon Dioxide (CO2)') then
   raise exception using errcode='22023',message='Unknown decaffeination method.';
 end if;
 if p_details ? 'is_decaf' and p_details->>'is_decaf'='true' and
    name_text ~* '(^|[^[:alnum:]])(half[ -]?caf|semi[ -]?decaf|partially[ -]?decaf)' then
   raise exception using errcode='22023',message='Half-caf cannot be marked fully decaf.';
 end if;
 url_text:=nullif(btrim(p_source_url),'');
 if url_text is not null and (length(url_text)>4000 or url_text !~ '^https://[^[:space:]/?#]+') then
   raise exception using errcode='22023',message='Source URL must be HTTPS.';
 end if;
 clean:=jsonb_build_object(
  'name',name_text,'roaster',roaster_text,
  'release_label',nullif(btrim(p_details->>'release_label'),''),
  'origin',nullif(btrim(p_details->>'origin'),''),
  'roast_level',nullif(btrim(p_details->>'roast_level'),''),
  'elevation_m',nullif(btrim(p_details->>'elevation_m'),''),
  'process',nullif(btrim(p_details->>'process'),''),
  'variety',nullif(btrim(p_details->>'variety'),''),
  'producer',nullif(btrim(p_details->>'producer'),''),
  'tasting_notes',nullif(btrim(p_details->>'tasting_notes'),'')
 );
 -- New fields are additive. Older clients that omit them preserve previously
 -- submitted details. Explicit False removes a stale decaf method.
 if p_details ? 'is_decaf' or p_details ? 'decaffeination_method' then
  clean:=clean||jsonb_build_object(
   'is_decaf',coalesce((p_details->>'is_decaf')::boolean,
      name_text ~* '(^|[^[:alnum:]])decaf(feinated)?([^[:alnum:]]|$)')
      and name_text !~* '(^|[^[:alnum:]])(half[ -]?caf|semi[ -]?decaf|partially[ -]?decaf)',
   'decaffeination_method',case when
     coalesce((p_details->>'is_decaf')::boolean,
      name_text ~* '(^|[^[:alnum:]])decaf(feinated)?([^[:alnum:]]|$)')
      and name_text !~* '(^|[^[:alnum:]])(half[ -]?caf|semi[ -]?decaf|partially[ -]?decaf)'
     then nullif(btrim(p_details->>'decaffeination_method'),'') else null end
  );
 end if;
 select * into lib from public.library_entries
    where id=p_library_entry and owner_id=u and hidden_at is null for update;
 if lib.id is null then raise exception using errcode='42501',message='Coffee is not in your library.';end if;

 if lib.coffee_id is null then
  select * into sub from public.coffee_submissions
    where id=lib.submission_id and owner_id=u for update;
  if sub.id is null or sub.status<>'pending' then
   raise exception using errcode='23514',message='This submission is no longer editable.';
  end if;
  if sub.revision<>p_expected_revision then
   return jsonb_build_object('ok',false,'code','conflict','revision',sub.revision);
  end if;
  update public.coffee_submissions
  set proposed_data=(sub.proposed_data || clean),source_url=url_text
  where id=sub.id returning id into updated_id;
  return jsonb_build_object('ok',true,'kind','updated_pending','submission_id',updated_id);
 end if;

 select * into canonical from public.coffees
   where id=lib.coffee_id and verification_state='verified' for share;
 if canonical.id is null then
  raise exception using errcode='23514',message='The verified coffee is unavailable.';
 end if;
 -- Reuse a still-pending correction to avoid duplicate queue entries. Editing a
 -- correction never changes the verified source or this member's shot history.
 select * into sub from public.coffee_submissions
 where owner_id=u and canonical_coffee_id=canonical.id and status='pending'
 order by updated_at desc,id desc limit 1 for update;
 if sub.id is not null then
  if p_expected_revision<>sub.revision then
   return jsonb_build_object('ok',false,'code','conflict','revision',sub.revision);
  end if;
  update public.coffee_submissions set proposed_data=clean,source_url=url_text,
   base_coffee_revision=canonical.revision where id=sub.id returning id into updated_id;
 else
  if p_expected_revision<>canonical.revision then
   return jsonb_build_object('ok',false,'code','conflict','revision',canonical.revision);
  end if;
  insert into public.coffee_submissions(
    owner_id,canonical_coffee_id,base_coffee_revision,proposed_data,source_url,status
  ) values(u,canonical.id,canonical.revision,clean,url_text,'pending')
  returning id into updated_id;
 end if;
 return jsonb_build_object('ok',true,'kind','correction_requested','submission_id',updated_id);
end $function$

