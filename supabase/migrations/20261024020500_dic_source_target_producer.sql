-- Issue 5. Trusted service-only source target includes the proposed producer,
-- allowing explicit official-product fact comparison. No member records changed.
-- STAGED: do not apply without a separate owner publish instruction.
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
  'origin',s.proposed_data->>'origin','process',s.proposed_data->>'process','producer',s.proposed_data->>'producer');
end $$;
revoke all on function public.dic_source_check_target(uuid) from public,anon,authenticated;
grant execute on function public.dic_source_check_target(uuid) to service_role;
