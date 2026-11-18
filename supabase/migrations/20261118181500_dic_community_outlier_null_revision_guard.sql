-- Issue #509 R341: NULL expected revision must not bypass Community confirmation.
-- Single expression replacement in complete current production body. Source-only.
CREATE OR REPLACE FUNCTION public.dic_confirm_community_outlier(p_shot_id uuid, p_expected_revision bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid; target uuid; s public.shots; c public.community_shots;
        reason_code text; disposition text;
begin
 u:=private.require_member();
 select * into s from public.shots where id=p_shot_id and owner_id=u;
 if s.id is null or s.revision IS DISTINCT FROM p_expected_revision then
  return jsonb_build_object('ok',false,'reason','not_found_or_conflict');
 end if;
 select cs.* into c from public.community_shots cs
  join private.contribution_links l on l.community_shot_id=cs.id
  where l.shot_id=s.id for update of cs;
 if c.id is null or c.quality_state<>'held' then
  return jsonb_build_object('ok',false,'reason','no_outlier_confirmation_pending');
 end if;
 select reason into reason_code from private.community_quality_checks
  where community_shot_id=c.id;
 if reason_code is distinct from 'extreme_outlier' then
  return jsonb_build_object('ok',false,'reason','no_outlier_confirmation_pending');
 end if;
 update private.community_quality_checks
   set confirmed_fingerprint=private.dic_community_fingerprint(c),
       reviewed_at=clock_timestamp()
   where community_shot_id=c.id;
 disposition:=private.dic_review_community_shot(c.id);
 return jsonb_build_object('ok',disposition='eligible','state',disposition);
end $function$;
