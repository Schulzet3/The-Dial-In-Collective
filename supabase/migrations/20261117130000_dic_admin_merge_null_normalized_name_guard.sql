-- #509 R310: nonempty display names can normalize to NULL (emoji/punctuation-only).
-- Prevent three-valued NULL name comparisons from bypassing Admin merge identity checks.
-- Original provider SQL MD5 cb5c264aceb9699a498177f3f6861783; existing grants and historical migrations preserved.
-- Development-only: do not apply to live Supabase without separate owner Publish.
CREATE OR REPLACE FUNCTION private.dic_admin_review_coffee(p_submission_id uuid, p_expected_revision bigint, p_action text, p_reason text, p_canonical_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.coffee_submissions; target public.coffees; result jsonb; actor uuid; reason_text text;
begin
 actor:=private.require_member();
 if actor is null or not private.is_admin() then
   raise exception using errcode='42501',message='Administrator required.';
 end if;
 reason_text:=nullif(btrim(coalesce(p_reason,'')),'');
 -- The administrator's explicit review action is sufficient. Record truthful,
 -- neutral machine-authored audit provenance without fabricating a human reason.
 if reason_text is null and p_action='approve' then
   reason_text:='Administrator approved distinct coffee';
 elsif reason_text is null and p_action='merge' then
   reason_text:='Administrator resolved duplicate coffee';
 elsif reason_text is null and p_action='hold' then
   reason_text:='Administrator held coffee for review';
 end if;
 if reason_text is null or length(reason_text)<8 or length(reason_text)>1000 then
   raise exception using errcode='22023',message='A specific review reason (8–1000 characters) is required.';
 end if;
 if p_action not in ('approve','merge','hold') then
   raise exception using errcode='22023',message='Unsupported review action.';
 end if;
 select * into s from public.coffee_submissions where id=p_submission_id for update;
 if not found or s.status not in ('pending','conflict') then
   raise exception using errcode='23514',message='Submission is no longer pending.';
 end if;
 if s.revision is distinct from p_expected_revision then
   raise exception using errcode='40001',message='Submission changed. Refresh before reviewing.';
 end if;
 if p_action='approve' then
   if p_canonical_id is not null then raise exception using errcode='22023',message='Approve cannot take a merge target.';end if;
   result:=private.dic_promote_pending_coffee(s.id,'admin_reviewed',
     jsonb_build_object('reason',reason_text,'verification_method','manual_administrator'),true);
   if coalesce((result->>'ok')::boolean,false) is not true then
     return result; -- unresolved near-match stays Pending, no false approval audit
   end if;
 elsif p_action='merge' then
   if p_canonical_id is null then raise exception using errcode='22023',message='Choose a verified canonical coffee.';end if;
   select * into target from public.coffees where id=p_canonical_id
     and verification_state='verified' and merged_into_id is null;
   if not found or private.dic_canonical_roaster_key(target.roaster)
     is distinct from private.dic_canonical_roaster_key(s.proposed_data->>'roaster')
     or private.dic_coffee_key(s.proposed_data->>'name') is null
     or not coalesce((private.dic_coffee_key(target.name)=private.dic_coffee_key(s.proposed_data->>'name')
       or extensions.similarity(private.dic_coffee_key(target.name),
                 private.dic_coffee_key(s.proposed_data->>'name'))>=0.63),false)
     or (target.release_label is not null and nullif(s.proposed_data->>'release_label','') is not null
       and private.dic_coffee_key(target.release_label) is distinct from private.dic_coffee_key(s.proposed_data->>'release_label'))
     or (target.origin is not null and nullif(s.proposed_data->>'origin','') is not null
       and private.dic_coffee_key(target.origin) is distinct from private.dic_coffee_key(s.proposed_data->>'origin'))
     or (target.process is not null and nullif(s.proposed_data->>'process','') is not null
       and private.dic_coffee_key(target.process) is distinct from private.dic_coffee_key(s.proposed_data->>'process')) then
     raise exception using errcode='23514',message='That canonical coffee is not a safe duplicate match.';
   end if;
   result:=private.dic_link_pending_coffee(s.id,target.id,'admin_reviewed_merge',
      jsonb_build_object('reason',reason_text,'verification_method','manual_administrator'));
 else
   if p_canonical_id is not null then raise exception using errcode='22023',message='Hold cannot take a merge target.';end if;
   update public.coffee_submissions set status='conflict' where id=s.id;
   result:=jsonb_build_object('ok',true,'status','conflict');
 end if;
 insert into public.admin_reviews(submission_id,reviewer_id,action,reason,evidence)
 values(s.id,actor,p_action,reason_text,jsonb_build_object('method','manual_administrator',
   'expected_revision',p_expected_revision,'canonical_id',p_canonical_id));
 return result;
end $function$;
