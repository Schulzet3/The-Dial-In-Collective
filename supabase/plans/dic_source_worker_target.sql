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
